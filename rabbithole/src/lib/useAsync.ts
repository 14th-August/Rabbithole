/**
 * Runs one async action and tracks whether it is in flight.
 *
 * Owns: the `isPending` / `error` bookkeeping that every submit button needs.
 * Does not own: what the action does, or what happens on success. Callers decide
 *   both — this only reports how the attempt went.
 *
 * Without this, every screen retypes the same six lines: set pending, clear the
 * old error, await, read the error, unset pending. Six lines is not much, but
 * repeated across screens they drift, and the one that forgets to clear the old
 * error shows a stale message after a successful retry.
 */

import { useState } from "react";

/**
 * The shape every action passed to {@link useAsync} must return.
 *
 * Deliberately mirrors what `supabase-js` gives back — `{ data, error }`, never a
 * thrown exception — so wrapping a Supabase call is a matter of translating the
 * error, not restructuring the result. `error` is a **sentence to show a person**,
 * not a code: turning a raw API string into readable English is the wrapper's job,
 * done before it ever reaches a screen.
 *
 * Exactly one side is ever set. `error === null` means it worked.
 */
export interface AsyncResult<T> {
  data: T | null;
  error: string | null;
}

/** What {@link useAsync} hands back to a screen. */
export interface AsyncState<Args extends unknown[], T> {
  /**
   * Run the action. Resolves to the data on success, or `null` on failure —
   * so a caller can branch on the return value without re-reading `error`:
   *
   * ```ts
   * const session = await submit.run({ email, password });
   * if (session) router.replace("/");
   * ```
   */
  run: (...args: Args) => Promise<T | null>;

  /** True while the action is running. Drives the button's spinner. */
  isPending: boolean;

  /** A sentence to show the user, or `null` when nothing has gone wrong. */
  error: string | null;

  /** Dismiss the current error — used when the user edits the form to retry. */
  clearError: () => void;
}

/**
 * Wrap an async action in loading and error state.
 *
 * @param action Any function returning an {@link AsyncResult}. The auth actions
 *   in `src/lib/auth.ts` are the first users; query modules will be the next.
 *
 * @example
 * ```ts
 * const submit = useAsync(signInWithEmail);
 *
 * <Button loading={submit.isPending} onPress={() => submit.run(form)} />
 * {submit.error ? <FormError message={submit.error} /> : null}
 * ```
 */
export function useAsync<Args extends unknown[], T>(
  action: (...args: Args) => Promise<AsyncResult<T>>,
): AsyncState<Args, T> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(...args: Args): Promise<T | null> {
    setIsPending(true);
    // Clear the previous error up front. Leaving it on screen during a retry
    // makes a successful second attempt look like it also failed.
    setError(null);

    const result = await action(...args);

    setIsPending(false);

    if (result.error !== null) {
      setError(result.error);
      return null;
    }

    return result.data;
  }

  function clearError() {
    setError(null);
  }

  // No useCallback: `reactCompiler` is enabled in app.json and hand-memoising
  // here would defeat it. See .claude/rules/technical-defaults.md.
  return { run, isPending, error, clearError };
}
