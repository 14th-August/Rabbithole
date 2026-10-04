/**
 * Creating, confirming, and ending a session.
 *
 * Owns: every `supabase.auth` call the app makes, and the translation of an
 *   `AuthError` into a sentence a person can read.
 * Does not own: who is currently signed in — `session.tsx` observes that. Nor
 *   routing: these functions report an outcome, screens decide where to go.
 *
 * This lives beside `session.tsx` rather than in `queries/` because those two are
 * one subject: `session.tsx` watches auth state, this changes it. `queries/` is
 * the *table* layer — its `toMessage` takes a `PostgrestError` and its
 * `requireRows` guards silent RLS blocks, neither of which means anything here.
 */

import type { AuthError, Session } from "@supabase/supabase-js";

import type { Db } from "@/lib/supabase";
import type { AsyncResult } from "@/lib/useAsync";

// `toMessage` as well as the local `toAuthMessage`: the availability check is
// an RPC and fails with a PostgrestError, not an AuthError. They are different
// error shapes with different codes, so they get different translators.
import { fail, ok, toMessage } from "./queries/errors";
import { clearSignInStamp, markSignedIn } from "./sessionAge";
import { markWelcomePending } from "./welcome";

/**
 * How long the resend button stays disabled, in seconds.
 *
 * This mirrors the hosted project's `max_frequency` of one minute. It lives here
 * rather than in the verify screen because it is a property of the auth server,
 * not of the screen — when the project moves off the free tier and that setting
 * changes, this is the module you grep.
 *
 * Local development sets `max_frequency = "1s"`, so the cooldown is simply
 * generous there rather than wrong.
 */
export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * What a sign-in attempt concluded.
 *
 * Not every non-session is a failure. With email confirmation on, signing in as
 * an unconfirmed user is not an error — it is a user one step from done, and the
 * right response is to send them to the verify screen rather than to show red
 * text under the password field.
 *
 * Encoding that as a *successful result with a different kind* keeps the decision
 * here. If it were an error string, the sign-in screen would have to match on
 * English prose to know what to do about it.
 */
export type SignInOutcome =
  | { kind: "signed-in"; session: Session }
  | { kind: "needs-verification"; email: string };

/**
 * GoTrue error codes we can say something specific about.
 *
 * Anything unlisted falls through to a generic sentence — see {@link toAuthMessage}.
 */
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
 * Turn an `AuthError` into a sentence.
 *
 * The 403 check runs **before** the code lookup, and that order is deliberate.
 * A 403 here is the VIU gate — the `before_user_created_viu_gate` function in
 * `supabase/migrations/…_auth_viu_gate.sql` — whose message was written as
 * user-facing copy and reviewed as copy:
 *
 *   "Rabbithole is for VIU students. Please sign up with your @my.viu.ca address."
 *
 * Replacing that with a generic sentence would throw away the only explanation a
 * student gets for why their Gmail address was refused.
 */
function toAuthMessage(error: AuthError): string {
  if (error.status === 403 && error.message) return error.message;

  // A request that never reached the server carries no GoTrue code to look up,
  // so without this it falls through to "Something went wrong" — which sends
  // people hunting for a typo in their password when the real problem is that
  // the device cannot see the API at all. That is not a hypothetical: it is the
  // first thing that happens when the local Supabase is not running, or when the
  // LAN address in .env has gone stale.
  //
  // Matched on the class name rather than `isAuthRetryableFetchError`, which
  // lives in `@supabase/auth-js` — a transitive package, not a declared
  // dependency, so importing it would break the rule about undeclared deps.
  if (error.name === "AuthRetryableFetchError" || error.status === 0) {
    return "Can't reach the server. Check your connection, then try again.";
  }

  const known = error.code ? MESSAGES[error.code] : undefined;
  if (known !== undefined) return known;

  // An unmapped code means nobody has thought about this failure yet. Saying so
  // in the console is more honest than inventing copy for it.
  console.warn(`Unmapped auth error ${error.code ?? error.status}: ${error.message}`);
  return "Something went wrong. Please try again.";
}

/**
 * Whether a username is well formed and unclaimed.
 *
 * Calls `is_username_available`, which is granted to `anon` precisely because
 * signup has no session yet. The comparison is case-insensitive server-side —
 * `profiles.username` is `citext` — so `Kelp_Quay` and `kelp_quay` are the
 * same name and this will say so.
 *
 * A `false` from a malformed username is indistinguishable from a `false` from
 * a taken one, which is why {@link validateUsername} runs first: it names the
 * shape problem, and this answers only the question it alone can answer.
 *
 * On a network failure this returns the failure rather than guessing. Treating
 * "could not check" as "available" would push the user into a signup that then
 * fails on the trigger.
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
 * Create an account and send a 6-digit confirmation code.
 *
 * `username` rides in `options.data`, which lands in `raw_user_meta_data`,
 * where `handle_new_user()` reads it. Omit it and the trigger generates a
 * random one instead — both paths are supported, and the random one is the
 * default rather than a fallback for errors.
 *
 * No real name is collected, and that is a privacy decision rather than a
 * simplification. A VIU address is `PreferredName.LastName@my.viu.ca`, and
 * `profiles` is readable by every signed-in user, so any real name on it —
 * typed or derived from the email — publishes the campus directory.
 *
 * Metadata is client-controlled, so the trigger re-validates the username
 * rather than trusting it, and the UNIQUE index catches the race between the
 * availability check and the insert. When that race is lost, GoTrue reports a
 * generic 500, so this function re-checks availability to turn it back into a
 * sentence the user can act on.
 *
 * @returns Only the email, never the user. Supabase deliberately returns an
 *   obfuscated user with an empty `identities` array when an address is already
 *   registered, so that signup cannot be used to enumerate accounts. The caller
 *   therefore **cannot** distinguish "new account, code sent" from "already
 *   registered, no code sent" — which is why the verify screen must carry a
 *   visible "Already have an account? Sign in" exit.
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

  // The trigger raises on a taken username, and GoTrue flattens that into an
  // opaque 500. Ask the question again: if the name went in the half-second
  // between the form's check and the insert, say so, because "something went
  // wrong" would send the user to retry the identical form.
  const recheck = await isUsernameAvailable(db, username);
  if (recheck.data === false) {
    return fail(`${username} was just taken. Try another username.`);
  }

  return fail(toAuthMessage(error));
}

/**
 * Sign in with a password.
 *
 * @returns A {@link SignInOutcome}. An unconfirmed account comes back as
 *   `needs-verification` rather than an error — the caller should send the user
 *   to `/verify` and call {@link resendSignUpCode}, since whatever code was
 *   issued at signup has probably expired by now.
 *
 *   Note this function does **not** resend on its own. "Sign in" quietly sending
 *   an email is a surprise, and it would burn a rate-limit slot the caller may
 *   want for the user's own tap.
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

  // signInWithPassword resolves with a session or an error; a null session here
  // would mean the contract changed underneath us.
  if (data.session === null) {
    return fail("Signed in, but no session came back. Please try again.");
  }

  // A password was just typed, so the five-day clock restarts here. See
  // `sessionAge.ts` for why that is tracked separately from the token.
  markSignedIn();

  return ok({ kind: "signed-in", session: data.session });
}

/**
 * Exchange a 6-digit code for a session.
 *
 * The `type` is **`"email"`**, not `"signup"`. Both appear in `EmailOtpType`, but
 * `"signup"` is deprecated — `"email"` was added to remove the old ambiguity
 * between a signup code and a magic-link code. Most tutorials still show
 * `"signup"`. Using the wrong one produces "Token has expired or is invalid" on a
 * code that is neither, which is a genuinely miserable thing to debug.
 *
 * Note the asymmetry with {@link resendSignUpCode}, which *does* take `"signup"`.
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

  // Entering a correct code proves ownership exactly as a password does, and it
  // returns a session, so it starts the five-day clock too.
  markSignedIn();

  // The only moment in the app where an account is provably new: confirmation
  // happens exactly once, and it is the first session that account ever holds.
  // Flagging anywhere else — sign-in, say — would greet returning users.
  markWelcomePending(data.session.user.id);

  return ok(data.session);
}

/**
 * Send a fresh confirmation code to an account that has not confirmed yet.
 *
 * The `type` is **`"signup"`** here — `resend()` takes a narrower union than
 * `verifyOtp()` and has no `"email"` member. That asymmetry is real, undocumented
 * in any one place, and the reason both calls carry a comment.
 *
 * Distinct from `signInWithOtp`, which would start a *new* passwordless sign-in
 * rather than re-delivering the pending signup confirmation.
 *
 * Callers must respect {@link RESEND_COOLDOWN_SECONDS}; tapping sooner returns
 * `over_email_send_rate_limit`, which {@link toAuthMessage} renders as a readable
 * sentence rather than a 429.
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
 * End the session.
 *
 * Returns `AsyncResult<null>` rather than `Promise<void>` so it can be handed to
 * `useAsync` unchanged — a void function would need a wrapper at the call site.
 *
 * The caller does **not** navigate afterwards. Clearing the session fires
 * `onAuthStateChange`, which updates `SessionProvider`, which flips the guard in
 * the root layout and swaps route groups. Navigating manually races that swap.
 */
export async function signOut(db: Db): Promise<AsyncResult<null>> {
  const { error } = await db.auth.signOut();

  if (error) return fail(toAuthMessage(error));

  // Drop the stamp alongside the session, so the next sign-in starts a fresh
  // clock rather than inheriting the previous user's.
  clearSignInStamp();

  return ok(null);
}
