/**
 * Reads data when a screen mounts, and again when asked.
 *
 * Owns: the fetch-on-mount lifecycle — loading, error, the resolved value, and
 *   discarding a response that arrived after the caller stopped caring.
 * Does not own: caching, deduplication, or refetch-on-focus. There is no cache
 *   here at all: every mount is a fresh request. When that starts to hurt, this
 *   hook is the one seam a query library would replace.
 *
 * Sibling to {@link useAsync}, not a replacement for it. The two answer
 * different questions and the split is deliberate:
 *
 * | | `useAsync` | `useQuery` |
 * | --- | --- | --- |
 * | Runs | when you call `run()` | on mount, and on `refetch()` |
 * | For | submits, taps, writes | reads a screen needs to render |
 * | Gives you | `run`, `isPending`, `error` | `data`, `isLoading`, `error`, `refetch` |
 *
 * `useAsync` has no `data` on purpose — a form submit's result goes to the
 * router, not into the screen. A read's result *is* the screen, so it lives
 * here.
 *
 * WHY THIS EXISTS
 *
 * Both `create.tsx` and `session.tsx` already hand-rolled the same block, down
 * to the same `let active = true` flag and the same comment about a stale
 * response overwriting a newer one. That is two copies before a single list
 * screen has been built; Browse, Saved, Messages, Orders and two profile
 * screens would make eight. The guard is the part worth centralising, because
 * forgetting it produces a warning in development and a wrong screen in
 * production.
 */

import { useEffect, useState } from "react";

import type { AsyncResult } from "@/lib/useAsync";

/** What {@link useQuery} hands back to a screen. */
export interface QueryState<T> {
  /**
   * The resolved value, or `null` before the first response lands and after a
   * failure.
   *
   * `null` is genuinely ambiguous here — "not yet" and "it failed" look the
   * same — which is why `isLoading` and `error` exist beside it. Render on the
   * triple, not on `data` alone: `isLoading` first, then `error`, then `data`.
   */
  data: T | null;

  /**
   * True until the first response lands, and again during a `refetch`.
   *
   * Drives the skeleton. `design-rules.md` wants a skeleton shaped like the
   * real layout, not a centred spinner over a blank screen.
   */
  isLoading: boolean;

  /** A sentence to show the user, or `null` when nothing has gone wrong. */
  error: string | null;

  /**
   * Run the query again — pull-to-refresh, or a retry button on the error
   * state, which `design-rules.md` requires every error state to offer.
   */
  refetch: () => void;
}

/**
 * Fetch on mount, and whenever `deps` change.
 *
 * @param query Any function returning an {@link AsyncResult}. Bind the client
 *   and the arguments at the call site:
 *   `useQuery(() => getFeed(supabase, { page }), [page])`.
 *
 * @param deps Re-run when these change, exactly like `useEffect`. A query
 *   closing over a filter or an id **must** list it, or the screen will show
 *   the previous answer forever.
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

  // Bumped by refetch() to re-run the effect. A counter rather than a boolean
  // because two refetches in a row must both fire, and a boolean toggled twice
  // lands back where it started.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // The screen can be left, or its deps can change, before the request lands.
    // Setting state on a gone component is a warning at best; applying a slow
    // response for a previous user or a previous filter is a wrong screen,
    // which is worse because it looks fine.
    let active = true;

    setIsLoading(true);
    // Clear the previous error up front, so a successful retry does not render
    // beneath a stale message.
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
    // including it would re-fetch on every render forever. The caller's `deps`
    // are the contract instead — the same trade `useEffect` itself makes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  function refetch() {
    setAttempt((n) => n + 1);
  }

  // No useCallback: `reactCompiler` is enabled in app.json and hand-memoising
  // here would defeat it. See .claude/rules/technical-defaults.md.
  return { data, isLoading, error, refetch };
}
