/**
 * Profile types — a Rabbithole user.
 *
 * Owns: the shape of a user's pseudonymous identity and their trust signals.
 * Does not own: authentication, sessions, or anything about the *current* user.
 *   Session state belongs to a future `useCurrentUser()` hook, not to this file.
 *
 * These mirror two Postgres VIEWS, not the `profiles` table, and that is the
 * important change. `profiles` carries three tiers of data on one row — public
 * trust signals, owner-only preferences, and server-written counters — and RLS
 * is row-level, so it cannot separate them. Column grants do that instead,
 * which means `select *` on the table is denied outright. The two views below
 * are the only readable shapes, so they are the only ones with types.
 *
 * See `src/types/README.md` for the snake_case naming rule.
 */

/**
 * VIU's teaching locations.
 *
 * Lives here rather than in `listing.ts` because it is a property of a person
 * first — `listing.ts` already imports from this file, so the dependency runs
 * the way it already ran.
 *
 * UNVERIFIED against VIU's real campus list; see the enum in
 * `20260918132138_enums_and_tables.sql`.
 */
export type Campus = "nanaimo" | "cowichan" | "powell_river" | "parksville_qualicum";

/**
 * Account standing.
 *
 * `deleted` is an anonymised tombstone rather than a removed row — orders and
 * reviews outlive the account, so the profile has to survive to be joined
 * against. The UI should mark `suspended`, `banned` and `deleted` counterparties
 * rather than rendering them as ordinary people.
 */
export type AccountStatus = "active" | "suspended" | "banned" | "deleted";

/**
 * A row of `public_profiles` — a user as *other* students see them.
 *
 * There is no email and no real name here, and there is none on the underlying
 * table either. VIU addresses are `PreferredName.LastName@my.viu.ca`, so an
 * email column on a table every signed-in user can read would publish the whole
 * campus directory. `username` is randomly generated at signup for the same
 * reason.
 */
export interface PublicProfile {
  id: string;
  username: string;

  bio: string | null;
  campus: Campus | null;

  /** Storage object path, not a URL. Resolve through Supabase Storage at render time. */
  avatar_path: string | null;

  /**
   * `null` for two different reasons — never active, or active but hidden. The
   * view resolves `show_last_active` on the way out, so a caller cannot tell
   * which, and must not try: "last seen" simply does not render.
   */
  last_active_at: string | null;

  /** `false` means the Follow button renders as unavailable, not as an error on tap. */
  allow_follows: boolean;

  /** Completed orders as the seller. Server-written; clients cannot raise it. */
  completed_sales: number;

  /**
   * 0–1, not a percentage, so nobody has to remember the scale.
   * `null` means too few conversations to say — which is NOT 0%, the same
   * distinction `rating_avg` makes, for the same reason.
   */
  response_rate: number | null;
  median_response_minutes: number | null;

  /**
   * Generated in Postgres from `rating_sum / rating_count`.
   * `null` means no reviews yet — NOT a rating of 0, and the UI must render it
   * differently ("New seller", not "0.0 stars").
   */
  rating_avg: number | null;

  /**
   * Always rendered beside `rating_avg`. "5.0 ★" from one review is technically
   * true and materially misleading.
   */
  rating_count: number;

  status: AccountStatus;

  /**
   * When the account's `@my.viu.ca` address was last confirmed, or `null` if never.
   * A timestamp rather than a boolean because VIU addresses expire at graduation,
   * and "how stale is this verification" is a question a boolean cannot answer.
   */
  viu_verified_at: string | null;

  created_at: string;
}

/**
 * A row of `my_profile` — the signed-in user's own profile.
 *
 * Extends {@link PublicProfile} with the fields the column grants withhold from
 * everyone else. These are not secrets; they are simply nobody else's business,
 * and row-level security has no way to express that.
 *
 * Only ever returns the caller's own row — the view's WHERE clause on
 * `auth.uid()` is the authorization, not a filter the client supplies.
 */
export interface MyProfile extends PublicProfile {
  /** Whether `last_active_at` is exposed to others. Editable in Settings. */
  show_last_active: boolean;

  /**
   * Push notification preferences. Per-account, unlike follow alerts, which are
   * per-follow (`follows.notify`) because following twelve sellers and wanting
   * alerts from two is the normal case.
   */
  notify_messages: boolean;
  notify_orders: boolean;
  notify_new_listings: boolean;
  notify_listing_expiry: boolean;

  updated_at: string;
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
  PublicProfile,
  "id" | "username" | "avatar_path" | "rating_avg" | "rating_count"
>;
