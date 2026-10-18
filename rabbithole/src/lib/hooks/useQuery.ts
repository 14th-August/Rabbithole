/**
 * Reads data when a screen mounts, and again when asked.
 *
 * Holds the fetch-on-mount lifecycle: loading, error, the resolved value, and
 * discarding a response that arrived after the caller stopped caring. No cache,
 * no dedup, no refetch-on-focus — every mount is a fresh request, and this hook
 * is the one seam a query library would replace. Sibling to `useAsync`, which
 * runs on a tap and has no `data`; a read's result is the screen, so it lives here.
 *
 * Returns: a {@link QueryState} — `data`, `isLoading`, `error`, `refetch`.
 * Render on the triple, not on `data` alone.
 */

import { useEffect, useState } from "react";

import type { AsyncResult } from "./useAsync";

/** What {@link useQuery} hands back to a screen. */
export interface QueryState<T> {
  /**
   * The resolved value, or `null` before the first response and after a failure.
   *
   * `null` is ambiguous — "not yet" and "it failed" look the same — which is why
   * `isLoading` and `error` sit beside it. Check `isLoading`, then `error`, then
   * `data`.
   */
  data: T | null;

  /**
   * True until the first response lands, and again during a `refetch`.
   *
   * Drives the skeleton. `design-rules.md` wants a skeleton shaped like the real
   * layout, not a centred spinner over a blank screen.
   */
  isLoading: boolean;

  /** A sentence to show the user, or `null` when nothing has gone wrong. */
  error: string | null;

  /** Run the query again — pull-to-refresh, or the retry every error state needs. */
  refetch: () => void;
}

/**
 * Fetches on mount, and whenever `deps` change.
 *
 * Returns a {@link QueryState} for the query.
 *
 * @param query Any function returning an {@link AsyncResult}. Bind the client
 *   and arguments at the call site:
 *   `useQuery(() => getFeed(supabase, { page }), [page])`.
 * @param deps Re-run when these change, exactly like `useEffect`. A query
 *   closing over a filter or an id must list it, or the screen shows the
 *   previous answer forever.
 *
 * @example
 * ```tsx
 * const categories = useQuery(() => getCategories(supabase), []);
 *
 * if (categories.isLoading) return <CategoryBarSkeleton />;
 * if (categories.error) return <ErrorState message={categories.error} onRetry={categories.refetch} />;
 * ```
 */
export function useQuery<T>(
  query: () => Promise<AsyncResult<T>>,
  deps: readonly unknown[],
): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // A counter, not a boolean: two refetches in a row must both fire, and a
  // boolean toggled twice lands back where it started.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // The screen can be left, or its deps change, before the request lands.
    // Applying a slow response for a previous filter is a wrong screen, which
    // is worse than a warning because it looks fine.
    let active = true;

    setIsLoading(true);
    setError(null);

    query().then((result) => {
      if (!active) return;

      setIsLoading(false);

      if (result.error !== null) {
        setError(result.error);
        setData(null);
        return;
      }

      setData(result.data);
    });

    return () => {
      active = false;
    };
    // `query` is deliberately absent: it is a fresh closure every render, so
    // including it would refetch forever. The caller's `deps` are the contract —
    // the same trade `useEffect` itself makes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  function refetch() {
    setAttempt((n) => n + 1);
  }

  // No useCallback: `reactCompiler` is enabled and hand-memoising defeats it.
  return { data, isLoading, error, refetch };
}
