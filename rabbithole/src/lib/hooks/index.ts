/**
 * Async state hooks barrel.
 *
 * Owns: re-exporting the three hooks that hold a request's lifecycle, and the
 *   `AsyncResult` contract they all speak.
 * Does not own: making requests. Every hook here takes a function and calls it;
 *   what that function does is `src/lib/queries/` or `src/lib/verification/`.
 *
 * Import from `@/lib/hooks` rather than reaching into individual files:
 *
 *   import { useQuery } from "@/lib/hooks";
 *   import type { AsyncResult } from "@/lib/hooks";
 *
 * Which hook: `useAsync` for something the user triggers (submit, sign in),
 * `useQuery` for something fetched on mount, `usePaged` for a feed that grows.
 */

/**
 * `AsyncResult` is the shape every query and auth function returns.
 *
 * It lives beside `useAsync` because that hook defines the contract, but it is
 * imported far more widely than the hook itself — the whole query layer returns
 * it. Always `import type`, so it costs nothing at runtime.
 */
export { useAsync } from "./useAsync";
export type { AsyncResult, AsyncState } from "./useAsync";

export { useQuery } from "./useQuery";
export type { QueryState } from "./useQuery";

export { usePaged } from "./usePaged";
export type { PagedState } from "./usePaged";
