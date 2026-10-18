/**
 * Reading and writing a person.
 *
 * Every read goes through a VIEW, never `profiles` itself: one row carries public
 * trust signals, owner-only preferences and server-written counters, and RLS is
 * row-level so the split is done with COLUMN GRANTS — `select * from profiles`
 * is denied. `public_profiles` resolves the `show_last_active` rule on the way
 * out; `my_profile` filters to the caller. Counters have no UPDATE grant at all.
 *
 * Returns: `AsyncResult` throughout. A single-profile read gives `null` data with
 * no error when the row does not exist — absence is an answer, not a failure.
 */

import type { Db } from "@/lib/supabase";
import type { AsyncResult } from "@/lib/hooks";
import type { Campus, MyProfile, PublicProfile } from "@/types";

import { fail, ok, requireWrite, toMessage } from "./errors";
import { viewRow, viewRows } from "./rows";

/**
 * The columns a user may change about themselves.
 *
 * Mirrors the UPDATE grant exactly. Hand-written rather than
 * `Partial<MyProfile>` on purpose: the generated type would offer `rating_avg`,
 * the request would be refused, and the mistake would surface at runtime instead
 * of as a red squiggle.
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
 * No `.eq("id", …)`: the view's WHERE on `auth.uid()` is the authorization and
 * cannot return another user's row, so a filter would imply security lives here.
 *
 * Returns `null` data with no error when the row does not exist yet — a real
 * window, since `auth.users` is written before the `handle_new_user` trigger
 * creates the profile. Treating it as an error makes a good signup look broken.
 */
export async function getMyProfile(db: Db): Promise<AsyncResult<MyProfile | null>> {
  const { data, error } = await db.from("my_profile").select("*").maybeSingle();

  if (error) return fail(toMessage(error));
  return ok(viewRow<MyProfile>(data));
}

/**
 * Someone else's profile, as the rest of campus sees it.
 *
 * `last_active_at` is `null` for two reasons — never active, or active but
 * hidden — and the view does not say which. Callers must not try to tell them
 * apart: "last seen" simply does not render.
 *
 * Returns `null` data with no error for an id nobody holds.
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
 * The same profile, found by the handle people actually see.
 *
 * Case-insensitive without asking, because `profiles.username` is `citext` — so
 * a link to `/profile/Kelp_Quay` finds `kelp_quay`.
 *
 * Returns `null` data with no error for an unknown username.
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
 * Several public profiles at once — for a list of reviewers or followed sellers,
 * where one fetch per row would be a request per row.
 *
 * Not used by the feed: `listing_summaries` already embeds its seller, which is
 * what makes the feed a single query.
 *
 * Returns the matching profiles, or `[]` with no round trip for an empty input.
 */
export async function getPublicProfiles(
  db: Db,
  userIds: string[],
): Promise<AsyncResult<PublicProfile[]>> {
  if (userIds.length === 0) return ok([]);

  const { data, error } = await db
    .from("public_profiles")
    .select("*")
    .in("id", userIds);

  if (error) return fail(toMessage(error));
  return ok(viewRows<PublicProfile>(data));
}

/**
 * Changes part of your own profile.
 *
 * Returns the refreshed profile. The update cannot return it — `profiles` denies
 * `select *`, so the write selects one granted column to prove it happened and
 * the fresh row is read back from `my_profile`.
 *
 * @param userId The caller's own id. Narrowing, not security: the policy already
 *   restricts the statement to their row. It is here because an UPDATE with no
 *   WHERE is a thing nobody should write, even when a policy makes it safe.
 * @param patch Any subset of {@link ProfileEdit}.
 */
export async function updateMyProfile(
  db: Db,
  userId: string,
  patch: Partial<ProfileEdit>,
): Promise<AsyncResult<MyProfile | null>> {
  // `.select("id")`, not `.select()`. The grants permit reading `id`; a bare
  // `.select()` expands to every column and is refused outright.
  const { data, error } = await db
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("id");

  if (error) {
    // 23505 on this table means one thing, and the generic "That's already
    // there." does not tell the user which field to fix.
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
 * Records that the user is around. Called on app foreground, not per screen.
 *
 * `last_active_at` is the one column a client may write but never read back: the
 * grants allow UPDATE and deny SELECT, so the value only leaves through
 * `public_profiles`, and only when `show_last_active` is true.
 *
 * Returns `AsyncResult<null>` and is safe to ignore — a failed presence ping is
 * not worth a message or a retry. No `requireWrite` here, the exception that
 * proves the rule: a zero-row update means the session outlived the account,
 * which the next real request surfaces properly.
 */
export async function touchLastActive(
  db: Db,
  userId: string,
): Promise<AsyncResult<null>> {
  const { error } = await db
    .from("profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return fail(toMessage(error));
  return ok(null);
}
