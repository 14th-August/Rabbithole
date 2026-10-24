/* 
* Overview: File contains validation for email addresses and 
* uses regex and tokens to determine what are valud emails.
*/

/*
* Def: function returns a boolean value for true
* if any of the regex patterns match the email address.
* In layman's terms the function checks if the text resembles 
* an email address by characters and returns true.
* returns {@link true} if valid, {@link false} otherwise.
*/

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

//variable for regex pattern for campus email address of students.
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

/*

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
