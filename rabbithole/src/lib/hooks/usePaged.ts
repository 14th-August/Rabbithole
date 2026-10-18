/**
 * Accumulates a paged list as a screen scrolls it.
 *
 * Holds the page cursor, the accumulated items, whether more exist, and the
 * guard that keeps a stale page out of a list it no longer belongs to. The query
 * decides how a page is fetched. For the screens one response cannot hold —
 * Browse, Saved, the message inbox; use `useQuery` for the rest.
 *
 * Returns: a {@link PagedState} — `items`, `isLoading`, `isLoadingMore`,
 * `error`, `hasMore`, `loadMore`, `refresh`.
 *
 * Two known trade-offs, both deliberate. `hasMore` is inferred from a short
 * page, so a final page of exactly `pageSize` costs one wasted request — cheaper
 * than a `count` on every page. And `bumped_at desc` is not stable while people
 * post, so an item can repeat or be skipped; invisible at one campus, and this
 * hook is where keyset pagination would land when it stops being invisible.
 */

import { useEffect, useState } from "react";

import type { AsyncResult } from "./useAsync";

/** What {@link usePaged} hands back to a screen. */
export interface PagedState<T> {
  /** Every item loaded so far, in order. Empty before the first page lands. */
  items: T[];

  /** True until the FIRST page lands, and during a `refresh`. Drives the skeleton. */
  isLoading: boolean;

  /** True while a further page is in flight. Drives the footer spinner. */
  isLoadingMore: boolean;

  /** A sentence to show the user, or `null` when nothing has gone wrong. */
  error: string | null;

  /** False once a short page has come back. The list can stop asking. */
  hasMore: boolean;

  /**
   * Load the next page. Safe to call from `onEndReached`, which fires more than
   * once per scroll — calls are ignored while a page is in flight or the list is
   * exhausted.
   */
  loadMore: () => void;

  /** Throw away every page and start again at zero. Pull-to-refresh, and retry. */
  refresh: () => void;
}

/**
 * Accumulates pages from a 0-indexed paged query.
 *
 * Returns a {@link PagedState} for the list.
 *
 * @param fetchPage Called with a 0-based page number. Bind the client and
 *   filters at the call site.
 * @param deps Reset to page zero when these change. Every filter the query
 *   closes over must be listed, or changing a filter appends its results to the
 *   previous filter's list.
 * @param pageSize Must match what the query returns per page. Pass
 *   `FEED_PAGE_SIZE` rather than a literal so the two cannot drift.
 *
 * @example
 * ```tsx
 * const feed = usePaged((page) => getFeed(supabase, { page }), [], FEED_PAGE_SIZE);
 *
 * <FlatList
 *   data={feed.items}
 *   onEndReached={feed.loadMore}
 *   onEndReachedThreshold={0.5}
 *   refreshing={feed.isLoading}
 *   onRefresh={feed.refresh}
 * />
 * ```
 */
export function usePaged<T>(
  fetchPage: (page: number) => Promise<AsyncResult<T[]>>,
  deps: readonly unknown[],
  pageSize: number,
): PagedState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // A counter, not a boolean, so two refreshes in a row both fire.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Captured here rather than read from `page` in the response, where it may
    // already have moved. Page zero replaces the list; later pages append.
    const isFirstPage = page === 0;

    // A response from the previous filter landing in the new list looks like
    // data corruption, so a stale page must never be appended.
    let active = true;

    if (isFirstPage) setIsLoading(true);
    else setIsLoadingMore(true);

    setError(null);

    fetchPage(page).then((result) => {
      if (!active) return;

      setIsLoading(false);
      setIsLoadingMore(false);

      if (result.error !== null) {
        setError(result.error);
        // Loaded pages stay on screen — a failure on page three should not
        // blank the two that worked. The error renders in the footer.
        return;
      }

      const rows = result.data ?? [];
      setItems((previous) => (isFirstPage ? rows : [...previous, ...rows]));
      setHasMore(rows.length === pageSize);
    });

    return () => {
      active = false;
    };
    // `fetchPage` is deliberately absent — a fresh closure every render would
    // refetch forever. The caller's `deps` are the contract. See useQuery.ts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, page, attempt]);

  // Separate from the fetching effect so it cannot race it: this sets page back
  // to 0, and that change is what re-runs the fetch.
  useEffect(() => {
    setItems([]);
    setHasMore(true);
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  function loadMore() {
    // Not defensive: onEndReached fires repeatedly while a long list settles, so
    // without this guard one scroll requests the same page four times.
    if (isLoading || isLoadingMore || !hasMore || error !== null) return;
    setPage((n) => n + 1);
  }

  function refresh() {
    setItems([]);
    setHasMore(true);
    if (page === 0) setAttempt((n) => n + 1);
    else setPage(0);
  }

  // No useCallback: `reactCompiler` is enabled and hand-memoising defeats it.
  return { items, isLoading, isLoadingMore, error, hasMore, loadMore, refresh };
}
