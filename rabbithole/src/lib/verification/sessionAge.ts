/**
 * How recently the user last proved who they are.
 *
 * Owns: the timestamp of the last manual sign-in, and the rule that decides when
 *   it has gone stale.
 * Does not own: the session itself. `supabase-js` persists and silently refreshes
 *   that — this module records only when a password was last typed, which is a
 *   different claim and the one this app's policy is written against.
 *
 * Why a separate stamp is needed at all: a Supabase refresh token is long-lived
 * and renews itself on use, so "holds a valid session" stays true indefinitely
 * for anyone who opens the app regularly. Requiring a fresh sign-in every five
 * days is a product decision that no token expiry encodes, so it needs its own
 * record.
 */

// Installs a `localStorage` global backed by on-device SQLite. Imported here as
// well as in `supabase.ts` because `auth.ts` reaches this module while importing
// the client as a *type only*, which TypeScript erases — so nothing would have
// pulled the install in at runtime. ES module side effects run once, so the
// duplicate import costs nothing.
import "expo-sqlite/localStorage/install";

/** Namespaced so it cannot collide with the keys `supabase-js` writes. */
const STAMP_KEY = "rabbithole.lastSignInAt";

/**
 * How long a manual sign-in stays valid, in days.
 *
 * Five days is a product decision rather than a security ceiling: long enough
 * that a student using the app across a normal week is never interrupted, short
 * enough that a borrowed or lost phone stops being a way in.
 */
export const MAX_SESSION_AGE_DAYS = 5;

const MAX_SESSION_AGE_MS = MAX_SESSION_AGE_DAYS * 24 * 60 * 60 * 1000;

/**
 * Record that the user just signed in manually.
 *
 * Call this after a flow where the user actually proved ownership of the
 * account — a password sign-in, or a confirmation code — and never after a token
 * refresh, which proves only that the device still holds the session it already
 * had.
 *
 * @param at Injectable for tests. Defaults to now.
 */
export function markSignedIn(at: Date = new Date()): void {
  try {
    localStorage.setItem(STAMP_KEY, at.toISOString());
  } catch (error) {
    // Failing to write is safe in the strict direction: a missing stamp reads as
    // stale, so the worst outcome is one extra sign-in rather than a session
    // that quietly outlives the policy.
    console.warn("Could not record the sign-in time:", error);
  }
}

/** Forget the stamp, so the next sign-in starts its own clock. */
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
 * A missing, unparseable, or future-dated stamp all count as **stale**. That
 * covers a session created before this policy existed, a failed write, and a
 * device clock that moved backwards — none of which should resolve to "assume
 * fresh", because the cost of guessing wrong that way is an account that never
 * asks again.
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
