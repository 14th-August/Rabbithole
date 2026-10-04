/**
 * Accumulates a paged list as a screen scrolls it.
 *
 * Owns: the page cursor, the accumulated items, whether more exist, and keeping
 *   a stale page from landing in a list it no longer belongs to.
 * Does not own: how a page is fetched. The query decides that, and already does
 *   — `getFeed` takes `{ page }` and returns at most `FEED_PAGE_SIZE` rows.
 *
 * Sibling to {@link useQuery}, which is the right hook for a read that fits in
 * one response. This one is for the three screens that will not: Browse, Saved
 * and the message inbox.
 *
 * HOW EXHAUSTION IS DECIDED
 *
 * A short page means the end. That is the contract `listings.ts` already set —
 * it exposes `FEED_PAGE_SIZE` and no `count`, with the note that "offset paging
 * is fine at one campus; keyset pagination is correct at scale but the
 * crossover is a long way off".
 *
 * So `hasMore` is inferred, not reported, and it has one knowable flaw: a final
 * page that happens to be exactly `pageSize` long leaves `hasMore` true, and
 * the next request returns empty. The cost is one wasted request at the bottom
 * of a list; the alternative is a `count` on every page, which Postgres pays
 * for by counting the whole filtered set each time. The wasted request is
 * cheaper, and it resolves itself.
 *
 * OFFSET PAGING AND A MOVING FEED
 *
 * `bumped_at desc` is not stable while people are posting: a listing renewed
 * between page 0 and page 1 shifts every row down, so an item can appear twice
 * or be skipped. At one campus with twelve listings this is invisible. It is
 * the first thing keyset pagination fixes when it stops being invisible, and
 * this hook is where that change would land.
 */

import { useEffect, useState } from "react";

import type { AsyncResult } from "@/lib/useAsync";

/** What {@link usePaged} hands back to a screen. */
export interface PagedState<T> {
  /** Every item loaded so far, in order. Empty before the first page lands. */
  items: T[];

  /** True until the FIRST page lands, and during a `refresh`. Drives the skeleton. */
  isLoading: boolean;

  /** True while a further page is in flight. Drives the footer spinner, not the skeleton. */
  isLoadingMore: boolean;

  /** A sentence to show the user, or `null` when nothing has gone wrong. */
  error: string | null;

  /** False once a short page has come back. The list can stop asking. */
  hasMore: boolean;

  /**
   * Load the next page. Safe to call from `onEndReached`, which React Native
   * fires more than once per scroll — calls are ignored while a page is already
   * in flight, or once the list is exhausted.
   */
  loadMore: () => void;

  /** Throw away every page and start again at zero. Pull-to-refresh, and retry. */
  refresh: () => void;
}

/**
 * Accumulate pages from a 0-indexed paged query.
 *
 * @param fetchPage Called with a 0-based page number. Bind the client and any
 *   filters at the call site: `usePaged((page) => getFeed(supabase, { page, campus }), [campus])`.
 *
 * @param deps Reset to page zero when these change. Every filter the query
 *   closes over **must** be listed, or changing a filter will append its
 *   results to the previous filter's list.
 *
 * @param pageSize Must match what the query actually returns per page. Pass
 *   `FEED_PAGE_SIZE` rather than a literal, so the two cannot drift.
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

  // Bumped by refresh() to re-run page zero. A counter, not a boolean, so two
  // refreshes in a row both fire.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Page zero replaces the list; later pages append. Tracked here rather than
    // read from `page` inside the response, because by then it may have moved.
    const isFirstPage = page === 0;

    // A stale page must never be appended: the deps may have changed, or the
    // user may have pulled to refresh, and a response from the previous filter
    // landing in the new list is a bug that looks like data corruption.
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
        // The already-loaded pages stay on screen. A failure fetching page
        // three should not blank out the two that worked — the error renders
        // in the list footer beside a retry.
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
    // re-fetch forever. The caller's `deps` are the contract. See useQuery.ts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, page, attempt]);

  // Changing a filter must start over, not append to the previous filter's
  // results. Separate from the fetching effect so it cannot race it: this sets
  // page back to 0, and that change is what re-runs the fetch.
  useEffect(() => {
    setItems([]);
    setHasMore(true);
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  function loadMore() {
    // onEndReached fires repeatedly while a long list settles, so this guard is
    // not defensive — without it one scroll requests the same page four times.
    if (isLoading || isLoadingMore || !hasMore || error !== null) return;
    setPage((n) => n + 1);
  }

  function refresh() {
    setItems([]);
    setHasMore(true);
    if (page === 0) setAttempt((n) => n + 1);
    else setPage(0);
  }

  // No useCallback: `reactCompiler` is enabled in app.json and hand-memoising
  // here would defeat it. See .claude/rules/technical-defaults.md.
  return { items, isLoading, isLoadingMore, error, hasMore, loadMore, refresh };
}
