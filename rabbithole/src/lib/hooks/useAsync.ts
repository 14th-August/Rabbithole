/**
 * Runs one async action and tracks whether it is in flight.
 *
 * Holds the `isPending` / `error` bookkeeping every submit button needs, plus
 * the `AsyncResult` contract the whole query layer speaks. Callers decide what
 * the action does and what happens on success; this only reports how it went.
 * Without it each screen retypes the same six lines and they drift.
 *
 * Returns: an {@link AsyncState} — `run`, `isPending`, `error`, `clearError`.
 * `run` resolves to the data on success, `null` on failure.
 */

import { useState } from "react";

/**
 * The shape every action passed to {@link useAsync} must return.
 *
 * Mirrors what `supabase-js` gives back — `{ data, error }`, never a thrown
 * exception — so wrapping a Supabase call means translating the error, not
 * restructuring the result. `error` is a sentence to show a person, not a code.
 * Exactly one side is ever set; `error === null` means it worked.
 */
export interface AsyncResult<T> {
  data: T | null;
  error: string | null;
}

/** What {@link useAsync} hands back to a screen. */
export interface AsyncState<Args extends unknown[], T> {
  /**
   * Run the action. Resolves to the data on success, `null` on failure, so a
   * caller can branch on the return value without re-reading `error`:
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
 * Wraps an async action in loading and error state.
 *
 * Returns an {@link AsyncState} bound to `action`.
 *
 * @param action Any function returning an {@link AsyncResult}.
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
    // Clear the old error up front, or a successful retry renders beneath a
    // stale message and looks like it failed too.
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

  // No useCallback: `reactCompiler` is enabled and hand-memoising defeats it.
  return { run, isPending, error, clearError };
}
