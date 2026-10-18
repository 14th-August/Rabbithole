/**
 * Form checks for the sign-up and sign-in screens.
 *
 * Three checks live here: email shape, campus domain, and username rules. All
 * are synchronous so they can run on every keystroke without a network call.
 * Supabase enforces the same rules server-side, so these only save a wasted
 * round trip — they are a convenience, never the gate.
 *
 * Returns: `isValidEmail` and `isCampusEmail` return booleans.
 * `validateUsername` returns an error sentence, or `null` when the shape is ok.
 */

/**
 * Whether a string is shaped like an email: text, `@`, text, dot, text.
 *
 * Permissive on purpose. Stricter regexes reject addresses that really work —
 * plus-tags, apostrophes, new TLDs — and fail real students to catch
 * hypothetical ones.
 *
 * Returns `true` if the shape is plausible.
 */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Students only: `my.viu.ca` is the student subdomain, `@viu.ca` is staff. */
const CAMPUS_EMAIL = /@my\.viu\.ca$/i;

/**
 * Whether an address belongs to a VIU student.
 *
 * Only worth calling once {@link isValidEmail} passes — on its own it accepts
 * `@my.viu.ca` with nothing in front of it.
 *
 * Returns `true` for a student address.
 */
export function isCampusEmail(value: string): boolean {
  return CAMPUS_EMAIL.test(value.trim());
}

/** Mirrors the CHECK on `profiles.username` and `is_username_available()`. */
const USERNAME = /^[A-Za-z0-9_]{3,20}$/;

/**
 * Checks the shape of a username, not whether it is taken — that needs the
 * database, via `isUsernameAvailable` in `auth.ts`.
 *
 * Returns a sentence naming the specific problem, or `null` if the shape is
 * fine. A sentence rather than a boolean so the user is not left guessing which
 * rule they broke.
 */
export function validateUsername(value: string): string | null {
  const username = value.trim();

  if (username === "") return "Pick a username.";
  if (username.length < 3) return "Usernames are at least 3 characters.";
  if (username.length > 20) return "Usernames are at most 20 characters.";

  if (!USERNAME.test(username)) {
    return "Letters, numbers and underscores only.";
  }

  return null;
}
