/**
 * Whether an account still owes its owner a welcome.
 *
 * Owns: the one-shot flag that makes the welcome screen appear after a new
 *   account's first confirmation, and never again.
 * Does not own: what the welcome looks like or how long it stays. That is
 *   `src/components/WelcomeOverlay.tsx`.
 *
 * Keyed by user id rather than a bare boolean. Phones get shared, and a flag
 * with no owner would greet whoever happened to sign in next by the new
 * account's name — which is both wrong and slightly alarming.
 *
 * Deliberately one-shot: reading it clears it. Confirming an account is the only
 * thing that sets it, and confirmation happens exactly once per account, so
 * there is no second occasion this should fire on.
 */

// Installs a `localStorage` global backed by on-device SQLite. Imported here for
// the same reason `sessionAge.ts` does it: `auth.ts` reaches this module while
// importing the client as a *type only*, which TypeScript erases, so nothing
// else would have pulled the install in at runtime.
import "expo-sqlite/localStorage/install";

/** Namespaced so it cannot collide with the keys `supabase-js` writes. */
const PENDING_KEY = "rabbithole.pendingWelcome";

/**
 * Record that this account has just been created and not yet greeted.
 *
 * Call after confirmation succeeds — that is the moment a new account first
 * holds a session. Never after an ordinary sign-in, which is the whole point of
 * the flag.
 */
export function markWelcomePending(userId: string): void {
  try {
    localStorage.setItem(PENDING_KEY, userId);
  } catch (error) {
    // Failing to write costs a welcome screen, nothing more. Silent is wrong,
    // but so is anything louder — this is decoration, not state the app needs.
    console.warn("Could not flag the welcome screen:", error);
  }
}

/**
 * Ask whether to greet this user, and forget the answer in the same breath.
 *
 * @returns `true` at most once per account, and only for the account that was
 *   just confirmed. Every other call — a returning user, a different user on the
 *   same device, a second render — is `false`.
 */
export function consumeWelcome(userId: string): boolean {
  try {
    const pending = localStorage.getItem(PENDING_KEY);
    if (pending !== userId) return false;

    localStorage.removeItem(PENDING_KEY);
    return true;
  } catch (error) {
    console.warn("Could not read the welcome flag:", error);
    return false;
  }
}
