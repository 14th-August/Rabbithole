/*
 * Date: 2026-10-30
 * Barrel for the async state hooks: useAsync, usePaged, and their types.
 * Used by screens and components; import from "@/lib/hooks", not the files in it.
*/

export { useAsync } from "./useAsync";
export type { AsyncResult, AsyncState } from "./useAsync";
export { usePaged } from "./usePaged";
export type { PageOf, PagedState } from "./usePaged";
