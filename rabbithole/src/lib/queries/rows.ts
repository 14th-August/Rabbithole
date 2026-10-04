/**
 * Narrowing a view row to its hand-written type.
 *
 * Owns: the one cast every view-backed query needs, and the explanation of why
 *   it is unavoidable.
 * Does not own: anything about tables. A query against a real table needs none
 *   of this — see `categories.ts`, which returns `Category[]` with no cast at
 *   all. That contrast is the point.
 *
 * WHY THIS EXISTS
 *
 * Postgres exposes no `NOT NULL` information for views. A view column selected
 * straight from a non-null table column is still reported as nullable, and a
 * `jsonb_build_object(...)` comes back as bare `Json`. So
 * `supabase gen types typescript` emits this for `listing_summaries`:
 *
 * ```ts
 * { title: string | null; price_cents: number | null; seller: Json | null; … }
 * ```
 *
 * even though `title` and `price_cents` are `not null` on `listings` and the
 * view's join guarantees a seller. Every field is a lie in the pessimistic
 * direction.
 *
 * The official fix is `MergeDeep` from `type-fest`, which is a new dependency
 * and not one to add quietly — `technical-defaults.md` lists dependency choices
 * as architectural decisions. Until that is decided, the cast lives **here,
 * once**, rather than as `!` scattered across every screen that reads a view.
 *
 * WHAT THIS COSTS, AND WHY IT IS STILL RIGHT
 *
 * These functions assert rather than check. They are only sound because the
 * view's SQL guarantees what the type claims, so the obligation is on the
 * migration: if a view starts selecting a genuinely nullable column into a
 * field the hand-written type declares non-null, nothing here will catch it —
 * it surfaces as `undefined` in a component. Keep `src/types` and
 * `supabase/migrations/..._views.sql` honest with each other, and these stay
 * safe.
 */

/**
 * Narrow one view row to `T`.
 *
 * @param row A single row from a view query, or `null` when the row was not
 *   found. Null passes straight through, because absence is an answer and the
 *   caller is already handling it.
 */
export function viewRow<T>(row: unknown): T;
export function viewRow<T>(row: null): null;
export function viewRow<T>(row: unknown | null): T | null;
export function viewRow<T>(row: unknown | null): T | null {
  if (row === null || row === undefined) return null;
  return row as T;
}

/**
 * Narrow a page of view rows to `T[]`.
 *
 * Returns `[]` for a null result, matching the convention every list query in
 * this folder already follows: a list is empty, never absent.
 */
export function viewRows<T>(rows: unknown[] | null): T[] {
  if (rows === null) return [];
  return rows as T[];
}
