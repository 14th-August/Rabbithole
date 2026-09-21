/**
 * Turning database failures into sentences a person can read.
 *
 * Owns: the mapping from Postgres and PostgREST error codes to user-facing copy,
 *   and the guard for writes that fail without erroring.
 * Does not own: deciding what to do about a failure. Query modules return the
 *   sentence; screens decide whether to show it inline, in a banner, or retry.
 *
 * `design-rules.md` says an error state must "say what failed and offer a retry.
 * Never a raw error string." A raw string here would be `duplicate key value
 * violates unique constraint "saved_listings_pkey"`, which tells a student
 * nothing and leaks the schema. This module is where that stops.
 */

import type { PostgrestError } from "@supabase/supabase-js";

import type { AsyncResult } from "@/lib/useAsync";

/**
 * Postgres and PostgREST codes we can say something specific about.
 *
 * Anything not listed falls through to a generic sentence rather than exposing
 * the driver's own wording — see {@link toMessage}.
 */
const MESSAGES: Record<string, string> = {
  // Postgres: insufficient_privilege. An RLS policy refused the write. Note this
  // only fires for INSERT and for UPDATE failing a WITH CHECK — see requireRows.
  "42501": "You don't have permission to do that.",

  // unique_violation. Usually a duplicate save or a second review on one listing.
  "23505": "That's already there.",

  // foreign_key_violation. The row it pointed at is gone.
  "23503": "That item no longer exists.",

  // check_violation. A CHECK constraint rejected the values — a price below zero,
  // a title over 200 characters, a rating outside 1–5.
  "23514": "Some of those details aren't valid. Check the form and try again.",

  // PostgREST: .single() matched zero rows or more than one.
  PGRST116: "We couldn't find that.",

  // PostgREST: the JWT is expired or malformed.
  PGRST301: "Your session has expired. Please sign in again.",
};

/**
 * Convert a PostgREST error into a sentence.
 *
 * @param error The error `supabase-js` returned. It never throws, so this is
 *   always something you read off the result rather than catch.
 */
export function toMessage(error: PostgrestError): string {
  const known = MESSAGES[error.code];
  if (known !== undefined) return known;

  // Deliberately generic. An unmapped code means we have not thought about this
  // failure yet, and guessing at copy is worse than admitting that — but the
  // original still goes to the console so it is debuggable.
  console.warn(`Unmapped database error ${error.code}: ${error.message}`);
  return "Something went wrong. Please try again.";
}

/** Wrap a failure as an {@link AsyncResult}. */
export function fail<T>(message: string): AsyncResult<T> {
  return { data: null, error: message };
}

/** Wrap a success as an {@link AsyncResult}. */
export function ok<T>(data: T): AsyncResult<T> {
  return { data, error: null };
}

/**
 * Guard a write that RLS can block **silently**.
 *
 * This is the single most important function in this folder, because the failure
 * it catches produces no error at all.
 *
 * RLS does not deny a row you may not touch — it makes the row *invisible*. So an
 * `UPDATE` or `DELETE` filtered out by a `USING` clause matches zero rows and
 * succeeds. `error === null` does not mean the write happened:
 *
 * | Operation | Blocked by | Result |
 * | --- | --- | --- |
 * | INSERT | `WITH CHECK` | error `42501` |
 * | UPDATE | `WITH CHECK` | error `42501` |
 * | UPDATE / DELETE | `USING` | **`{ data: [], error: null }`** |
 *
 * Every update and delete therefore chains `.select()` and passes the rows here.
 * A write that silently does nothing while the UI reports success is worse than
 * one that fails loudly.
 *
 * @param rows What `.select()` returned from the write.
 * @param message What to tell the user when nothing was written.
 */
export function requireRows<T>(rows: T[] | null, message: string): AsyncResult<T> {
  if (rows === null || rows.length === 0) return fail(message);
  return ok(rows[0]!);
}
