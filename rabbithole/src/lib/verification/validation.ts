/*
 * Date: 2026-10-28
 * Exportable functions to check for valid email addresses
 * Used in Sign In and Sign Up Pages for Functionality.
*/

/*
* Def: isValidEmail
* Desc: Contains possible regex for emails and tests character sets
* Will return False if emails dont contain @ symbols and runs .test
* which strips text input of whitespace and checks for valid email address.
* Return: boolean indicating if the email is valid
*/
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/* Variable for regex pattern for campus email address of students.
*  Ensures that the my.viu.ca patern is consistent and not using a gmail or other email address. */
const CAMPUS_EMAIL = /@my\.viu\.ca$/i;

/**
 *  Def: Whether an address belongs to a VIU student.
 *  Desc: Checks for email variable is my.viu.ca regex pattern. 
 *  Only worth calling once isValidEmail passes true on its own it accepts
 * `@my.viu.ca` with nothing in front of it.
 *  Returns: true for a student address.
 */
export function isCampusEmail(value: string): boolean {
  return CAMPUS_EMAIL.test(value.trim());
}

/** Mirrors the CHECK on `profiles.username` and `is_username_available()`.
 * Checks are made in Supabase DB but we ensure client side checks here
 * to avoid unnecessary round trips. */
const USERNAME = /^[A-Za-z0-9_]{3,30}$/;

/*
* Def: Check for length of a username. Takes passed value and trims it 
* to remove whitespace. Then checks for lengths of username, max 30 characters
* and minimum 3.
* Returns: string message if username is invalid, null if valid.
*/
export function validateUsername(value: string): string | null {
  const username = value.trim();

  if (username === "") return "Pick a username.";
  if (username.length < 3) return "Usernames are at least 3 characters.";
  if (username.length > 30) return "Usernames are at most 30 characters.";

  // Test is just a regex test to see if the username is valid. 
  // If not, return a string message.
  if (!USERNAME.test(username)) {
    return "Letters, numbers and underscores only.";
  }

  //default pass for checks
  return null;
}
