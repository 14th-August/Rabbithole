/**
 * The one-shot flag that decides whether to greet a brand-new account.
 *
 * Confirmation sets the flag; reading it clears it, so the welcome fires at most
 * once per account. Keyed by user id, not a bare boolean — phones get shared,
 * and an unowned flag would greet the next person to sign in by someone else's
 * name. What the welcome looks like is `src/components/WelcomeOverlay.tsx`.
 *
 * Returns: `markWelcomePending` returns nothing. `consumeWelcome` returns `true`
 * at most once, for the account that was just confirmed.
 */

// Installs a `localStorage` global backed by on-device SQLite. Needed here
// because `auth.ts` imports the client as a type only, which TypeScript erases,
// so nothing else pulls the install in at runtime.
import "expo-sqlite/localStorage/install";

/** Namespaced so it cannot collide with the keys `supabase-js` writes. */
const PENDING_KEY = "rabbithole.pendingWelcome";

/**
 * Flags an account as created but not yet greeted.
 *
 * Call after confirmation succeeds, never after an ordinary sign-in — that
 * distinction is the whole point of the flag.
 *
 * Returns nothing. A failed write costs a welcome screen and nothing else.
 */
export function markWelcomePending(userId: string): void {
  try {
    localStorage.setItem(PENDING_KEY, userId);
  } catch (error) {
    console.warn("Could not flag the welcome screen:", error);
  }
}

/**
 * Asks whether to greet this user and forgets the answer in the same breath.
 *
 * Returns `true` only for the account just confirmed, and only the first time.
 * A returning user, a different user on the same device, or a second render all
 * return `false`.
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
