/*
 * Date: 2026-10-28
 * Barrel file for verification functions.
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

export { SessionProvider, useSession } from "./AuthProvider";

/**
 * Only the policy constant is public. `markSignedIn`, `clearSignInStamp` and
 * `isSessionStale` stay internal — the stamp is written by `signIn` and read by
 * `SessionProvider`, both inside this folder. A screen calling them directly
 * would be writing auth policy from the UI layer.
 */
export { MAX_SESSION_AGE_DAYS } from "./sessionAge";

export { consumeWelcome, markWelcomePending } from "./welcome";

export { isCampusEmail, isValidEmail, validateUsername } from "./validation";
