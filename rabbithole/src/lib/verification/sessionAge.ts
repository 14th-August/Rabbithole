/*
 * Date: 2026-10-28
 * Session age tracking for the mobile app.
 * The app's policy is that a manual sign-in (password or confirmation code)
 * expires after five days of inactivity. This module tracks the last sign-in
 * time and checks whether it is still valid.
*/
import "expo-sqlite/localStorage/install";

const STAMP_KEY = "rabbithole.lastSignInAt";
export const MAX_SESSION_AGE_DAYS = 5;

const MAX_SESSION_AGE_MS = MAX_SESSION_AGE_DAYS * 24 * 60 * 60 * 1000;

export function markSignedIn(at: Date = new Date()): void {
  try {
    localStorage.setItem(STAMP_KEY, at.toISOString());
  } catch (error) {
    console.warn("Could not record the sign-in time:", error);
  }
}

/**
 * Forgets the stamp so the next sign-in starts its own clock.
 * Returns nothing.
 */
export function clearSignInStamp(): void {
  try {
    localStorage.removeItem(STAMP_KEY);
  } catch (error) {
    console.warn("Could not clear the sign-in time:", error);
  }
}


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
