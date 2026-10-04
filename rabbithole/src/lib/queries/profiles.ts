/**
 * Reading and writing a person.
 *
 * Owns: queries against the two profile VIEWS, and the narrow update a user is
 *   allowed to make to their own row.
 * Does not own: authentication or session state. Signing in is `auth.ts`;
 *   holding the current session is `session.tsx`, which reads its profile
 *   through {@link getMyProfile} rather than touching the database itself.
 *
 * WHY THERE IS NO `Profile` ROW TYPE, AND NO QUERY AGAINST `profiles`
 *
 * One `profiles` row carries three different tiers of data: public trust
 * signals, owner-only preferences, and server-written counters. RLS is
 * row-level and cannot separate them, so the separation is done with COLUMN
 * GRANTS instead — and the consequence reaches all the way out here:
 *
 *   select * from profiles   ->   permission denied
 *
 * That is not a bug to work around. It is the privacy model, and it is why
 * every function below reads a view. `public_profiles` resolves the
 * `show_last_active` rule on the way out; `my_profile` is filtered to the
 * caller by its own WHERE clause.
 *
 * The counters are absent from the update path for the same reason:
 * `rating_sum`, `completed_sales` and `status` carry no UPDATE grant at all,
 * so a seller cannot raise their own rating with a crafted request. The
 * database refuses it; this module simply never asks.
 */

import type { Db } from "@/lib/supabase";
import type { AsyncResult } from "@/lib/useAsync";
import type { Campus, MyProfile, PublicProfile } from "@/types";

import { fail, ok, requireWrite, toMessage } from "./errors";
import { viewRow, viewRows } from "./rows";

/**
 * The columns a user may change about themselves.
 *
 * Mirrors the UPDATE grant in the RLS migration exactly. Keeping it a hand
 * written list rather than a `Partial<MyProfile>` is the point: the generated
 * type would happily offer `rating_avg`, the request would be refused, and the
 * mistake would surface as a runtime error instead of a red squiggle.
 */
export interface ProfileEdit {
  username: string;
  bio: string | null;
  campus: Campus | null;
  avatar_path: string | null;
  show_last_active: boolean;
  allow_follows: boolean;
  notify_messages: boolean;
  notify_orders: boolean;
  notify_new_listings: boolean;
  notify_listing_expiry: boolean;
}

/**
 * The signed-in user's own profile, preferences included.
 *
 * @returns `null` data with no error when the row does not exist yet. That is a
 *   real window, not a failure: `auth.users` is written first and the
 *   `handle_new_user` trigger creates the profile immediately after, so a
 *   request landing between the two finds nothing. Treating it as an error
 *   would make a successful signup look broken.
 */
export async function getMyProfile(db: Db): Promise<AsyncResult<MyProfile | null>> {
  // No `.eq("id", …)`. The view's own WHERE clause on auth.uid() is the
  // authorization and it cannot return another user's row; a filter here would
  // narrow nothing and imply the security lives in the client.
  const { data, error } = await db.from("my_profile").select("*").maybeSingle();

  if (error) return fail(toMessage(error));
  return ok(viewRow<MyProfile>(data));
}

/**
 * Someone else's profile, as the rest of campus sees it.
 *
 * `last_active_at` comes back `null` for two different reasons — never active,
 * or active but hidden — and the view does not say which. Callers must not try
 * to tell them apart: "last seen" simply does not render.
 *
 * @returns `null` data with no error for an id nobody holds. Absence is an
 *   answer; the screen shows its empty state rather than an error.
 */
export async function getPublicProfile(
  db: Db,
  userId: string,
): Promise<AsyncResult<PublicProfile | null>> {
  const { data, error } = await db
    .from("public_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) return fail(toMessage(error));
  return ok(viewRow<PublicProfile>(data));
}

/**
 * The same, found by the handle people actually see.
 *
 * A separate query rather than a client-side filter of a fetched list, for the
 * same reason `getTopLevelCategories` is: a distinct product surface gets a
 * distinct server query.
 *
 * The match is case-insensitive without asking, because `profiles.username` is
 * `citext` — so a link to `/profile/Kelp_Quay` finds `kelp_quay`.
 */
export async function getProfileByUsername(
  db: Db,
  username: string,
): Promise<AsyncResult<PublicProfile | null>> {
  const { data, error } = await db
    .from("public_profiles")
    .select("*")
    .eq("username", username.trim())
    .maybeSingle();

  if (error) return fail(toMessage(error));
  return ok(viewRow<PublicProfile>(data));
}

/**
 * Several public profiles at once.
 *
 * For a list of reviewers or followed sellers, where fetching one profile per
 * row would be a request per row. Not used by the feed — `listing_summaries`
 * already embeds its seller, which is what makes the feed one query.
 */
export async function getPublicProfiles(
  db: Db,
  userIds: string[],
): Promise<AsyncResult<PublicProfile[]>> {
  // An empty `in()` is a valid query that returns nothing, but it is still a
  // round trip. The caller almost always has the empty case on screen already.
  if (userIds.length === 0) return ok([]);

  const { data, error } = await db
    .from("public_profiles")
    .select("*")
    .in("id", userIds);

  if (error) return fail(toMessage(error));
  return ok(viewRows<PublicProfile>(data));
}

/**
 * Change part of your own profile.
 *
 * @param userId The caller's own id. This is **narrowing, not security** — the
 *   update policy already restricts the statement to the caller's row, so this
 *   changes nothing about who can be edited. It is here because an `UPDATE`
 *   with no `WHERE` clause is a thing nobody should write, even when a policy
 *   makes it safe.
 *
 * @param patch Any subset of {@link ProfileEdit}.
 *
 * @returns The refreshed profile. The update itself cannot return it: `profiles`
 *   denies `select *`, so the write selects a single granted column purely to
 *   prove it happened, and the fresh row is read back from `my_profile`.
 */
export async function updateMyProfile(
  db: Db,
  userId: string,
  patch: Partial<ProfileEdit>,
): Promise<AsyncResult<MyProfile | null>> {
  // `.select("id")`, not `.select()`. The column grants permit reading `id`;
  // a bare `.select()` expands to every column and is refused outright.
  const { data, error } = await db
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("id");

  if (error) {
    // 23505 on this table is one thing and one thing only, and the generic
    // "That's already there." does not tell a user which field to fix.
    if (error.code === "23505" && patch.username !== undefined) {
      return fail(`${patch.username} is already taken. Try another username.`);
    }
    return fail(toMessage(error));
  }

  // An UPDATE filtered out by a USING clause matches zero rows and reports no
  // error, so the row count is the only evidence the write landed.
  const wrote = requireWrite(data, "That profile is no longer yours to change.");
  if (wrote.error !== null) return fail(wrote.error);

  return getMyProfile(db);
}

/**
 * Record that the user is around.
 *
 * Called on app foreground, not per screen. `last_active_at` is the one column
 * a client may write but never read back: the grants allow UPDATE and deny
 * SELECT, so the value only ever leaves the database through
 * `public_profiles`, and only when `show_last_active` is true.
 *
 * Deliberately returns `AsyncResult<null>` and is safe to ignore. A presence
 * ping that fails is not worth a message on screen, and not worth a retry.
 */
export async function touchLastActive(
  db: Db,
  userId: string,
): Promise<AsyncResult<null>> {
  const { error } = await db
    .from("profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", userId);

  // No requireWrite here, and that is the exception that proves the rule: there
  // is nothing to guard. A zero-row update means the session outlived the
  // account, which the next real request will surface properly.
  if (error) return fail(toMessage(error));
  return ok(null);
}
