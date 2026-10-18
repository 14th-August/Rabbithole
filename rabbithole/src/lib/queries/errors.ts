/**
 * Turning database failures into sentences a person can read.
 *
 * Maps Postgres and PostgREST codes to user-facing copy, wraps results as
 * `AsyncResult`, and guards writes that RLS blocks silently. A raw string here
 * would be `duplicate key value violates unique constraint "saved_listings_pkey"`
 * — useless to a student and a schema leak. Screens decide what to do with the
 * sentence; this only produces it.
 *
 * Returns: `toMessage` returns a sentence. `ok`/`fail` wrap an `AsyncResult`.
 * `requireRows` and `requireWrite` return a failure when nothing was written.
 */

import type { PostgrestError } from "@supabase/supabase-js";

import type { AsyncResult } from "@/lib/hooks";

/** Codes we can say something specific about. Unlisted ones fall through. */
const MESSAGES: Record<string, string> = {
  // insufficient_privilege. An RLS policy refused the write — INSERT, or UPDATE
  // failing a WITH CHECK. See requireRows for the case that does not error.
  "42501": "You don't have permission to do that.",

  // unique_violation. A duplicate save, a second review on one order, a username
  // someone just claimed, or a second request on a listing.
  "23505": "That's already there.",

  // foreign_key_violation. The row it pointed at is gone.
  "23503": "That item no longer exists.",

  // check_violation. A price below zero, a title over 200 chars, a rating
  // outside 1-5.
  "23514": "Some of those details aren't valid. Check the form and try again.",

  // PostgREST: .single() matched zero rows or more than one.
  PGRST116: "We couldn't find that.",

  // PostgREST: the JWT is expired or malformed.
  PGRST301: "Your session has expired. Please sign in again.",
};

/**
 * Converts a PostgREST error into a sentence.
 *
 * Returns mapped copy where we have it, else a generic line — guessing at copy
 * for an unmapped code is worse than admitting we have not handled it. The
 * original always reaches the console so it stays debuggable.
 *
 * @param error The error `supabase-js` returned. It never throws, so this is
 *   read off the result rather than caught.
 */
export function toMessage(error: PostgrestError): string {
  const known = MESSAGES[error.code];
  if (known !== undefined) return known;

  console.warn(`Unmapped database error ${error.code}: ${error.message}`);
  return "Something went wrong. Please try again.";
}

/** Wraps a failure. Returns `{ data: null, error: message }`. */
export function fail<T>(message: string): AsyncResult<T> {
  return { data: null, error: message };
}

/** Wraps a success. Returns `{ data, error: null }`. */
export function ok<T>(data: T): AsyncResult<T> {
  return { data, error: null };
}

/**
 * Guards a write that RLS can block silently — the most important function here,
 * because the failure it catches produces no error at all.
 *
 * RLS does not deny a row you may not touch, it makes the row invisible. So an
 * UPDATE or DELETE filtered out by a `USING` clause matches zero rows and
 * succeeds: `error === null` does not mean the write happened. Only `WITH CHECK`
 * violations raise `42501`. Every update and delete therefore chains `.select()`
 * and passes the rows here.
 *
 * Returns the first row written, or a failure when nothing was.
 *
 * @param rows What `.select()` returned from the write.
 * @param message What to tell the user when nothing was written.
 */
export function requireRows<T>(rows: T[] | null, message: string): AsyncResult<T> {
  if (rows === null || rows.length === 0) return fail(message);
  return ok(rows[0]!);
}

/**
 * {@link requireRows} for a write whose row the caller does not want — unsaving
 * a listing, leaving a conversation, deleting a photo.
 *
 * Exists because `requireRows` resolves to `AsyncResult<T>` and these call sites
 * want `AsyncResult<null>`, so without it each hand-rolls the length check.
 *
 * Returns `ok(null)` on a real write, or a failure when nothing was written.
 *
 * @param rows What `.select()` returned from the write.
 * @param message What to tell the user when nothing was written.
 */
export function requireWrite(rows: unknown[] | null, message: string): AsyncResult<null> {
  if (rows === null || rows.length === 0) return fail(message);
  return ok(null);
}
