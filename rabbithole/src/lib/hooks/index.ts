/**
 * Async state hooks.
 *
 * Three hooks that hold a request's lifecycle, plus the `AsyncResult` contract
 * they all speak. Each takes a function and calls it; what that function does is
 * `src/lib/queries` or `src/lib/verification`. Pick `useAsync` for something the
 * user triggers, `useQuery` for something fetched on mount, `usePaged` for a
 * feed that grows.
 *
 * Returns: re-exports only. Import from `@/lib/hooks`, not the files inside it.
 */

export { useAsync } from "./useAsync";
export type { AsyncResult, AsyncState } from "./useAsync";

export { useQuery } from "./useQuery";
export type { QueryState } from "./useQuery";

export { usePaged } from "./usePaged";
export type { PagedState } from "./usePaged";
