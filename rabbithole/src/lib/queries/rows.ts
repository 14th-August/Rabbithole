/**
 * Narrowing a view row to its hand-written type.
 *
 * Postgres reports no `NOT NULL` information for views, so `supabase gen types`
 * marks every view column nullable and every `jsonb_build_object` as bare `Json`
 * — pessimistic lies. The official fix is `MergeDeep` from `type-fest`, a new
 * dependency and so an architectural decision; until then the cast lives here
 * once rather than as `!` scattered across every screen that reads a view.
 *
 * Returns: the same rows, typed as `T`. These assert rather than check, so the
 * obligation sits on the migration — if a view starts selecting a genuinely
 * nullable column into a non-null field, it surfaces as `undefined` in a
 * component. Keep `src/types` and `..._views.sql` honest with each other.
 */

/**
 * Narrows one view row to `T`.
 *
 * Returns `null` unchanged — absence is an answer, and the caller already
 * handles it.
 *
 * @param row A single row from a view query, or `null` when not found.
 */
export function viewRow<T>(row: unknown): T;
// `T` is unused in this signature and still load-bearing: a call that supplies
// an explicit type argument can only select an overload of matching arity, so
// dropping it sends `viewRow<MyProfile>(null)` to the signature above and types
// a null row as `MyProfile`.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function viewRow<T>(row: null): null;
export function viewRow<T>(row: unknown | null): T | null;
export function viewRow<T>(row: unknown | null): T | null {
  if (row === null || row === undefined) return null;
  return row as T;
}

/**
 * Narrows a page of view rows to `T[]`.
 *
 * Returns `[]` for a null result, matching every list query in this folder: a
 * list is empty, never absent.
 */
export function viewRows<T>(rows: unknown[] | null): T[] {
  if (rows === null) return [];
  return rows as T[];
}
