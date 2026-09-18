/**
 * Profile types — a Rabbithole user.
 *
 * Owns: the shape of a user's public identity and their trust signals.
 * Does not own: authentication, sessions, or anything about the *current* user.
 *   Session state belongs to a future `useCurrentUser()` hook, not to this file.
 *
 * `Profile` mirrors the `profiles` table one-to-one, which is why it is snake_case.
 * See `src/types/README.md` for the naming rule.
 */

/**
 * A row of `profiles`. Keyed by `auth.users.id` — there is no separate user id.
 *
 * Note that email is absent on purpose: it lives in `auth.users`, is never public,
 * and exposing it would turn the marketplace into a scraped mailing list.
 */
export interface Profile {
  id: string;
  display_name: string;

  /** Storage object path, not a URL. Resolve through Supabase Storage at render time. */
  avatar_path: string | null;

  /**
   * When the account's `@viu.ca` address was last confirmed, or `null` if never.
   * Nullable rather than a boolean because VIU addresses expire at graduation and
   * we may need to re-verify — a timestamp can answer "how stale is this?", a
   * boolean cannot. See ARCHITECTURE.md → Open questions.
   */
  viu_verified_at: string | null;

  /**
   * Denormalised average of `reviews.rating`, maintained by a trigger.
   * `null` means no reviews yet — which is NOT the same as a rating of 0, and the
   * UI must render it differently ("New seller", not "0 stars").
   */
  rating_avg: number | null;
  rating_count: number;

  created_at: string;
}

/**
 * The slice of a profile needed to render a seller anywhere they appear next to a
 * listing — feed cards, listing detail, conversation rows.
 *
 * Derived with `Pick` on purpose: it is a standing, compiler-checked statement of
 * how much profile data the feed actually costs us to join. Widening this type is
 * a deliberate decision about query cost, and `Pick` makes that decision visible
 * instead of letting fields drift in one screen at a time.
 */
export type ProfilePreview = Pick<
  Profile,
  "id" | "display_name" | "avatar_path" | "rating_avg" | "rating_count"
>;
