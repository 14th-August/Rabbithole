/**
 * Creating, confirming, and ending a session.
 *
 * Every `supabase.auth` call the app makes lives here, along with the one
 * translator that turns an `AuthError` into a readable sentence. These functions
 * report an outcome and never navigate; `session.tsx` observes who is signed in.
 * It sits beside `session.tsx` because that watches auth state and this changes it.
 *
 * Returns: every function returns an `AsyncResult` — `ok(value)` or
 * `fail(message)`, where the message is already fit to show a user.
 */

import type { AuthError, Session } from "@supabase/supabase-js";

import type { Db } from "@/lib/supabase";
import type { AsyncResult } from "@/lib/hooks";

// Both translators: the availability check is an RPC and fails with a
// PostgrestError, not an AuthError. Different shapes, different codes.
import { fail, ok, toMessage } from "../queries/errors";
import { clearSignInStamp, markSignedIn } from "./sessionAge";
import { markWelcomePending } from "./welcome";

/**
 * How long the resend button stays disabled, in seconds.
 *
 * Mirrors the hosted project's `max_frequency` of one minute. It belongs here
 * rather than in the verify screen because it is a property of the auth server —
 * when that setting changes, this is the module you grep. Local dev sets `1s`,
 * so the cooldown is merely generous there.
 */
export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * What a sign-in attempt concluded.
 *
 * An unconfirmed user is not a failure — they are one step from done, so that is
 * a successful result with a different kind, not an error. As an error string the
 * sign-in screen would have to match on English prose to know what to do.
 */
export type SignInOutcome =
  | { kind: "signed-in"; session: Session }
  | { kind: "needs-verification"; email: string };

/** GoTrue codes we can say something specific about. Unlisted ones fall through. */
const MESSAGES: Record<string, string> = {
  invalid_credentials: "That email or password doesn't match.",
  email_not_confirmed: "Confirm your email address before signing in.",
  otp_expired: "That code has expired. Request a new one.",
  over_email_send_rate_limit: "Too many emails just went out. Wait a minute and try again.",
  over_request_rate_limit: "Too many attempts. Give it a moment and try again.",
  weak_password: "That password is too short. Pick a longer one.",
  validation_failed: "Check those details and try again.",
  signup_disabled: "New accounts are closed right now.",
  user_banned: "This account has been suspended.",
};

/**
 * Turns an `AuthError` into a sentence.
 *
 * Returns reviewed user-facing copy where we have it, a generic line otherwise.
 * The three checks run in this order on purpose, and each guards a real failure.
 */
function toAuthMessage(error: AuthError): string {
  // A 403 is the VIU gate, whose message was written and reviewed as user copy —
  // the only explanation a student gets for why their Gmail was refused.
  if (error.status === 403 && error.message) return error.message;

  // A request that never reached the server carries no code, so it would read as
  // "Something went wrong" and send people hunting for a password typo. This is
  // what a stopped local Supabase or a stale LAN address in .env looks like.
  // Matched on the class name because `isAuthRetryableFetchError` lives in
  // `@supabase/auth-js`, a transitive package we must not import.
  if (error.name === "AuthRetryableFetchError" || error.status === 0) {
    return "Can't reach the server. Check your connection, then try again.";
  }

  const known = error.code ? MESSAGES[error.code] : undefined;
  if (known !== undefined) return known;

  // An unmapped code means nobody has thought about this failure yet.
  console.warn(`Unmapped auth error ${error.code ?? error.status}: ${error.message}`);
  return "Something went wrong. Please try again.";
}

/**
 * Whether a username is well formed and unclaimed.
 *
 * Calls `is_username_available`, granted to `anon` because signup has no session
 * yet. Case-insensitive server-side (`profiles.username` is `citext`), so
 * `Kelp_Quay` and `kelp_quay` are the same name.
 *
 * Returns `ok(false)` for both a taken and a malformed name, which is why
 * `validateUsername` runs first. A network failure returns the failure rather
 * than guessing — "could not check" as "available" pushes the user into a signup
 * that then fails on the trigger.
 */
export async function isUsernameAvailable(
  db: Db,
  username: string,
): Promise<AsyncResult<boolean>> {
  const { data, error } = await db.rpc("is_username_available", {
    p_username: username.trim(),
  });

  if (error) return fail(toMessage(error));
  return ok(data === true);
}

/**
 * Creates an account and sends a 6-digit confirmation code.
 *
 * `username` rides in `options.data` and lands in `raw_user_meta_data`, where
 * `handle_new_user()` reads it. Omit it and the trigger generates a random one.
 * No real name is collected on purpose: a VIU address is
 * `PreferredName.LastName@my.viu.ca` and `profiles` is readable by every
 * signed-in user, so storing a name would publish the campus directory.
 *
 * Returns only the email, never the user. Supabase returns an obfuscated user
 * with empty `identities` for an already-registered address so signup cannot
 * enumerate accounts — so the caller cannot tell "code sent" from "already
 * registered", and the verify screen needs a visible "Sign in" exit.
 */
export async function signUp(
  db: Db,
  input: { username: string; email: string; password: string },
): Promise<AsyncResult<{ email: string }>> {
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim();

  const { error } = await db.auth.signUp({
    email,
    password: input.password,
    options: { data: { username } },
  });

  if (error === null) return ok({ email });

  // The trigger raises on a taken username and GoTrue flattens it to an opaque
  // 500. Ask again: if the name went in the half-second since the form checked,
  // say so, because "something went wrong" sends the user to retry the same form.
  const recheck = await isUsernameAvailable(db, username);
  if (recheck.data === false) {
    return fail(`${username} was just taken. Try another username.`);
  }

  return fail(toAuthMessage(error));
}

/**
 * Signs in with a password.
 *
 * Returns a {@link SignInOutcome}. An unconfirmed account comes back as
 * `needs-verification`, not an error — send the user to `/verify` and call
 * {@link resendSignUpCode}, since the signup code has probably expired.
 *
 * This does not resend on its own: a "Sign in" tap quietly sending mail is a
 * surprise, and it would burn a rate-limit slot the caller may want for the
 * user's own tap.
 */
export async function signIn(
  db: Db,
  input: { email: string; password: string },
): Promise<AsyncResult<SignInOutcome>> {
  const email = input.email.trim().toLowerCase();

  const { data, error } = await db.auth.signInWithPassword({
    email,
    password: input.password,
  });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return ok({ kind: "needs-verification", email });
    }
    return fail(toAuthMessage(error));
  }

  // A null session here would mean the supabase-js contract changed under us.
  if (data.session === null) {
    return fail("Signed in, but no session came back. Please try again.");
  }

  // A password was just typed, so the five-day clock restarts.
  markSignedIn();

  return ok({ kind: "signed-in", session: data.session });
}

/**
 * Exchanges a 6-digit code for a session.
 *
 * The `type` is `"email"`, not `"signup"` — `"signup"` is deprecated, and most
 * tutorials still show it. The wrong one reports "Token has expired or is
 * invalid" on a code that is neither, which is miserable to debug. Note the
 * asymmetry with {@link resendSignUpCode}, which does take `"signup"`.
 *
 * Returns the new session.
 */
export async function confirmSignUp(
  db: Db,
  input: { email: string; token: string },
): Promise<AsyncResult<Session>> {
  const { data, error } = await db.auth.verifyOtp({
    email: input.email.trim().toLowerCase(),
    token: input.token,
    type: "email",
  });

  if (error) return fail(toAuthMessage(error));
  if (data.session === null) {
    return fail("That code was accepted but no session came back. Please try again.");
  }

  // A correct code proves ownership exactly as a password does.
  markSignedIn();

  // The only moment an account is provably new: confirmation happens once, and
  // this is the first session it ever holds. Flagging on sign-in would greet
  // returning users.
  markWelcomePending(data.session.user.id);

  return ok(data.session);
}

/**
 * Sends a fresh confirmation code to an unconfirmed account.
 *
 * The `type` is `"signup"` here — `resend()` takes a narrower union than
 * `verifyOtp()` and has no `"email"` member. That asymmetry is real and is why
 * both calls carry a comment. Distinct from `signInWithOtp`, which would start a
 * new passwordless sign-in instead of re-delivering the pending confirmation.
 *
 * Returns `ok(null)`. Callers must respect {@link RESEND_COOLDOWN_SECONDS}.
 */
export async function resendSignUpCode(
  db: Db,
  input: { email: string },
): Promise<AsyncResult<null>> {
  const { error } = await db.auth.resend({
    type: "signup",
    email: input.email.trim().toLowerCase(),
  });

  if (error) return fail(toAuthMessage(error));
  return ok(null);
}

/**
 * Ends the session.
 *
 * Returns `AsyncResult<null>` rather than `Promise<void>` so it can be handed to
 * `useAsync` unchanged.
 *
 * Do not navigate afterwards. Clearing the session fires `onAuthStateChange`,
 * which updates `SessionProvider`, which flips the root-layout guard and swaps
 * route groups. Navigating manually races that swap.
 */
export async function signOut(db: Db): Promise<AsyncResult<null>> {
  const { error } = await db.auth.signOut();

  if (error) return fail(toAuthMessage(error));

  // Drop the stamp with the session, so the next sign-in starts a fresh clock
  // rather than inheriting the previous user's.
  clearSignInStamp();

  return ok(null);
}
