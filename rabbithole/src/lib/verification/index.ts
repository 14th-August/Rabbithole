/**
 * Everything a screen needs to sign someone up, in, or out.
 *
 * Five files that only make sense together: the Supabase auth calls (`auth.ts`),
 * the current session and profile (`session.tsx`), the five-day staleness policy
 * (`sessionAge.ts`), the post-signup greeting flag (`welcome.ts`), and the form
 * checks (`validation.ts`). Nothing here navigates — a screen reads the outcome
 * and decides where to go, since `signIn` is called from two places that differ.
 *
 * Returns: re-exports only. Import from `@/lib/verification`, not the files
 * inside it, so the internal split stays free to change.
 */

export {
  confirmSignUp,
  isUsernameAvailable,
  resendSignUpCode,
  RESEND_COOLDOWN_SECONDS,
  signIn,
  signOut,
  signUp,
} from "./auth";
export type { SignInOutcome } from "./auth";

export { SessionProvider, useSession } from "./session";

/**
 * Only the policy constant is public. `markSignedIn`, `clearSignInStamp` and
 * `isSessionStale` stay internal — the stamp is written by `signIn` and read by
 * `SessionProvider`, both inside this folder. A screen calling them directly
 * would be writing auth policy from the UI layer.
 */
export { MAX_SESSION_AGE_DAYS } from "./sessionAge";

export { consumeWelcome, markWelcomePending } from "./welcome";

export { isCampusEmail, isValidEmail, validateUsername } from "./validation";
