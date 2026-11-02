/*
 * Date: 2026-11-02
 * usePaged: accumulates a paged list as a screen scrolls it, plus the PageOf
 * shape a paged query must return.
 * Used by the Discover feed in src/app/(tabs)/index.tsx.
*/

import { useEffect, useState } from "react";

import type { AsyncResult } from "./useAsync";

/*
* Def: One page of a paged query.
* Desc: The rows, and whether another page follows. `hasMore` is stated by the
* query rather than guessed at here, because the query is the only thing that
* can know cheaply -- getListingFeed fetches one row past the page to find out.
* Return: n/a, a type.
*/
export interface PageOf<T> {
  items: T[];
  hasMore: boolean;
}

/*
* Def: What usePaged hands back to a screen.
* Desc: The accumulated items, three separate loading flags so a first load, a
* pull-to-refresh and a further page can render differently, the error, and the
* two actions.
* Return: n/a, a type.
*/
export interface PagedState<T> {
  /** Every item loaded so far, in order. Empty before the first page lands. */
  items: T[];

  /** True until the FIRST page lands, and after a filter change. Drives the skeleton. */
  isLoading: boolean;

  /** True while a refresh of page zero is in flight. The items stay mounted. */
  isRefreshing: boolean;

  /** True while a further page is in flight. Drives the footer. */
  isLoadingMore: boolean;

  /** A sentence to show the user, or null when nothing has gone wrong. */
  error: string | null;

  /** False once the query says so. The list can stop asking. */
  hasMore: boolean;

  /** Load the next page. Safe to call from onEndReached, which fires repeatedly. */
  loadMore: () => void;

  /** Re-query from page zero, keeping the loaded items on screen. Retry, and pull-to-refresh. */
  refresh: () => void;
}

/*
* Def: Accumulates pages from a 0-indexed paged query.
* Desc: Holds the page cursor, the items so far, and the guard that keeps a
* stale page out of a list it no longer belongs to. The query decides how a page
* is fetched and whether more exist. Bind the client and filters at the call
* site, and list every filter in `deps` or changing one appends its results to
* the previous filter's list.
* Return: a PagedState for the list.
*
* One known trade-off: `bumped_at desc` is not a stable sort while people post,
* so an item can repeat or be skipped across pages. This hook is where keyset
* pagination lands when that stops being invisible.
*/
/*
* Def: sameDeps
* Desc: Shallow element-wise compare, the same check useEffect makes on its own
* dependency array. Object.is rather than === so NaN compares equal to itself.
* Return: true when nothing changed.
*/
function sameDeps(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
}

export function usePaged<T>(
  fetchPage: (page: number) => Promise<AsyncResult<PageOf<T>>>,
  deps: readonly unknown[],
): PagedState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // A counter, not a boolean, so two refreshes in a row both fire.
  const [attempt, setAttempt] = useState(0);

  // Last render's deps, so the reset below can tell when they actually changed.
  const [prevDeps, setPrevDeps] = useState(deps);

  useEffect(() => {
    // Captured here rather than read from `page` in the response, where it may
    // already have moved. Page zero replaces the list; later pages append.
    const isFirstPage = page === 0;

    // A response from the previous filter landing in the new list looks like
    // data corruption, so a stale page must never be appended.
    let active = true;

    // Flagging before the request is the whole point of a loading flag, and
    // there is no query library here to own it -- see technical-defaults.md,
    // where a data layer is listed as not yet chosen.
    //
    // `isRefreshing` is already true when a pull started this run: refresh()
    // sets it in the same batch as `attempt`, so the render this effect belongs
    // to already sees it. It is read without being a dependency on purpose --
    // it says why this fetch is happening, it does not trigger one.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isFirstPage) setIsLoadingMore(true);
    else if (!isRefreshing) setIsLoading(true);

    setError(null);

    fetchPage(page).then((result) => {
      if (!active) return;

      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);

      if (result.error !== null) {
        setError(result.error);
        // Loaded pages stay on screen -- a failure on page three should not
        // blank the two that worked. The error renders in the footer.
        return;
      }

      // AsyncResult does not correlate `data` with `error`, so the compiler
      // still sees a nullable here. Neither fallback is reachable via `ok()`.
      const rows = result.data?.items ?? [];
      setItems((previous) => (isFirstPage ? rows : [...previous, ...rows]));
      setHasMore(result.data?.hasMore ?? false);
    });

    return () => {
      active = false;
    };
    // `fetchPage` is deliberately absent -- a fresh closure every render would
    // refetch forever. The caller's `deps` are the contract.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, page, attempt]);

  // Reset to page zero when the filters change, during render rather than in an
  // effect. An effect would let the fetch above run once with the stale page
  // first, spending a request whose response its own cleanup then discards.
  // Setting state during render is React's documented way to adjust state when
  // an input changes; it re-runs this render before anything is committed.
  if (!sameDeps(prevDeps, deps)) {
    setPrevDeps(deps);
    setItems([]);
    setHasMore(true);
    setPage(0);
  }

  function loadMore() {
    // Not defensive: onEndReached fires repeatedly while a long list settles, so
    // without this guard one scroll requests the same page four times.
    if (isLoading || isRefreshing || isLoadingMore || !hasMore || error !== null) return;
    setPage((n) => n + 1);
  }

  function refresh() {
    // A pull landing while the first page is still in flight would fetch page
    // zero twice and append the second copy.
    if (isLoading || isRefreshing) return;

    setHasMore(true);
    setIsRefreshing(true);

    // The items are deliberately NOT cleared. The list hosting the
    // RefreshControl has to stay mounted for the whole gesture, and clearing
    // them here flashes the empty state; the effect above replaces them when
    // page zero lands.
    if (page === 0) setAttempt((n) => n + 1);
    else setPage(0);
  }

  // No useCallback: reactCompiler is enabled and hand-memoising defeats it.
  return {
    items,
    isLoading,
    isRefreshing,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}
