/**
 * When the user last typed a password, and whether that was too long ago.
 *
 * A Supabase refresh token renews itself on use, so "holds a valid session"
 * stays true forever for anyone who opens the app regularly. Requiring a fresh
 * sign-in every five days is a product rule no token expiry encodes, so it needs
 * its own stamp. This records manual sign-ins only — never token refreshes.
 *
 * Returns: `markSignedIn` and `clearSignInStamp` return nothing.
 * `isSessionStale` returns `true` when a fresh sign-in is due.
 */

// Installs a `localStorage` global backed by on-device SQLite. Needed here as
// well as in `supabase.ts` because `auth.ts` imports the client as a type only,
// which TypeScript erases. ES module side effects run once, so this is free.
import "expo-sqlite/localStorage/install";

/** Namespaced so it cannot collide with the keys `supabase-js` writes. */
const STAMP_KEY = "rabbithole.lastSignInAt";

/**
 * How long a manual sign-in stays valid, in days.
 *
 * Five days is a product decision, not a security ceiling: long enough that a
 * normal week never interrupts a student, short enough that a lost phone stops
 * being a way in.
 */
export const MAX_SESSION_AGE_DAYS = 5;

const MAX_SESSION_AGE_MS = MAX_SESSION_AGE_DAYS * 24 * 60 * 60 * 1000;

/**
 * Records that the user just proved ownership of the account.
 *
 * Call after a password sign-in or a confirmation code, never after a token
 * refresh — a refresh proves only that the device still holds what it had.
 *
 * Returns nothing. A failed write reads as stale later, which errs safely: one
 * extra sign-in rather than a session outliving the policy.
 *
 * @param at Injectable for tests. Defaults to now.
 */
export function markSignedIn(at: Date = new Date()): void {
  try {
    localStorage.setItem(STAMP_KEY, at.toISOString());
  } catch (error) {
    console.warn("Could not record the sign-in time:", error);
  }
}

/**
 * Forgets the stamp so the next sign-in starts its own clock.
 *
 * Returns nothing.
 */
export function clearSignInStamp(): void {
  try {
    localStorage.removeItem(STAMP_KEY);
  } catch (error) {
    console.warn("Could not clear the sign-in time:", error);
  }
}

/**
 * Whether the last manual sign-in is too old to keep trusting.
 *
 * A missing, unparseable, or future-dated stamp all count as stale — that covers
 * a pre-policy session, a failed write, and a clock that moved backwards. None
 * may resolve to "assume fresh", or an account could stop asking forever.
 *
 * Returns `true` when a fresh sign-in is due.
 *
 * @param now Injectable for tests. Defaults to now.
 */
export function isSessionStale(now: Date = new Date()): boolean {
  let raw: string | null = null;

  try {
    raw = localStorage.getItem(STAMP_KEY);
  } catch (error) {
    console.warn("Could not read the sign-in time:", error);
    return true;
  }

  if (raw === null) return true;

  const signedInAt = Date.parse(raw);
  if (Number.isNaN(signedInAt)) return true;

  const age = now.getTime() - signedInAt;
  if (age < 0) return true;

  return age > MAX_SESSION_AGE_MS;
}
