/**
 * Async state hooks.
 *
 * One hook, `useAsync`, plus the `AsyncResult` contract the query layer speaks.
 * It takes a function and calls it; what that function does is
 * `src/lib/queries` or `src/lib/verification`.
 *
 * Returns: re-exports only. Import from `@/lib/hooks`, not the file inside it.
 */

export { useAsync } from "./useAsync";
export type { AsyncResult, AsyncState } from "./useAsync";
