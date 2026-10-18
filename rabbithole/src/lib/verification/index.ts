/**
 * Authentication barrel.
 *
 * Owns: re-exporting everything a screen needs to sign someone up, sign them in,
 *   confirm their code, and read who is currently signed in.
 * Does not own: routing. Nothing in this folder navigates — a screen reads the
 *   outcome and decides where to go, because the same `signIn` is called from
 *   two places that go different ways afterwards.
 *
 * Import from `@/lib/verification` rather than reaching into individual files:
 *
 *   import { signIn, useSession, isCampusEmail } from "@/lib/verification";
 *
 * The folder holds four concerns that only make sense together: the Supabase
 * auth calls (`auth.ts`), the current session and its profile (`session.tsx`),
 * the five-day staleness policy (`sessionAge.ts`), the post-signup greeting flag
 * (`welcome.ts`), and the client-side form checks (`validation.ts`).
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
 * Only the policy constant is public.
 *
 * `markSignedIn`, `clearSignInStamp` and `isSessionStale` are deliberately not
 * re-exported: the stamp is written by `signIn` and read by `SessionProvider`,
 * both inside this folder. A screen calling them directly would be writing auth
 * policy from the UI layer.
 */
export { MAX_SESSION_AGE_DAYS } from "./sessionAge";

export { consumeWelcome, markWelcomePending } from "./welcome";

/**
 * The form checks, re-exported so a sign-up screen imports its validators from
 * the same place it imports `signUp`.
 */
export { isCampusEmail, isValidEmail, validateUsername } from "./validation";
