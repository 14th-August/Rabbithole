/**
 * Reading and writing listings.
 *
 * Every query touching `listings`, `listing_images`, `listing_summaries` and
 * `saved_listings`. Formatting is not done here — a price stays integer cents
 * until `formatPrice`, a `storage_path` stays a path until `publicUrl`.
 * Authorization is not done here either: RLS filters rows before they reach this
 * file, so the filters below narrow results, they never secure them.
 *
 * Returns: `AsyncResult` throughout — a list query gives `[]` for no rows, a
 * detail query gives `null` for a listing that does not exist or is not visible.
 */

import type { Db } from "@/lib/supabase";
import type { AsyncResult } from "@/lib/hooks";
import type {
  Category,
  Listing,
  ListingDetail,
  ListingImage,
  ListingStatus,
  ListingSummary,
  ProfilePreview,
  TablesInsert,
} from "@/types";

import { fail, ok, requireRows, requireWrite, toMessage } from "./errors";
import { viewRows } from "./rows";

/** How many feed rows a page holds. */
export const FEED_PAGE_SIZE = 20;

/**
 * Statuses the Discover feed shows.
 *
 * `reserved` is included on purpose — a held item is still worth seeing, and
 * hiding it makes the marketplace look emptier than it is. `draft` and `removed`
 * are owner-only at the policy level, so they could not appear here anyway.
 */
const FEED_STATUSES: ListingStatus[] = ["active", "reserved"];

/**
 * The Discover feed: live listings, newest first.
 *
 * Reads the `listing_summaries` view rather than composing embeds client-side.
 * `viewRows` narrows the view's all-nullable types — see `rows.ts`.
 *
 * Returns one page of summaries.
 *
 * @param page 0-based. Offset paging is fine at one campus; keyset is correct at
 *   scale but the crossover is a long way off.
 */
export async function getFeed(
  db: Db,
  { page = 0 }: { page?: number } = {},
): Promise<AsyncResult<ListingSummary[]>> {
  const from = page * FEED_PAGE_SIZE;

  const { data, error } = await db
    .from("listing_summaries")
    .select("*")
    .in("status", FEED_STATUSES)
    // bumped_at, not created_at. Renewing lifts a listing without rewriting its
    // age, and `listings_feed_idx` is built on this column — ordering on
    // created_at would silently stop using the index.
    .order("bumped_at", { ascending: false })
    .range(from, from + FEED_PAGE_SIZE - 1);

  if (error) return fail(toMessage(error));
  return ok(viewRows<ListingSummary>(data));
}

/**
 * One listing, with its seller, category and ordered photos.
 *
 * Composed with embeds rather than a view because the detail screen is the only
 * caller, so its shape may change with the screen.
 *
 * Returns `null` data with no error when the listing does not exist or is not
 * visible to this user — absence is an answer, not a failure.
 */
export async function getListing(
  db: Db,
  id: string,
): Promise<AsyncResult<ListingDetail | null>> {
  const { data, error } = await db
    .from("listings")
    .select(
      // The seller embed reads `public_profiles`, not `profiles`. The table
      // denies most columns to clients via column grants, not RLS, so embedding
      // it would fail at runtime even though the string type-checks.
      `*,
       seller:public_profiles!listings_seller_id_fkey (
         id, username, avatar_path, rating_avg, rating_count
       ),
       category:categories!listings_category_id_fkey (
         id, parent_category_id, slug, name, position
       ),
       images:listing_images (id, listing_id, storage_path, position, width, height)`,
    )
    .eq("id", id)
    // Foreign keys are named explicitly because `conversations` has two FKs to
    // `profiles` and PostgREST cannot guess which a bare embed meant.
    .order("position", { referencedTable: "listing_images", ascending: true })
    // maybeSingle, not single: a missing listing is a legitimate answer, and
    // .single() would turn an empty state into an error state.
    .maybeSingle();

  if (error) return fail(toMessage(error));
  if (data === null) return ok(null);

  const row = data as typeof data & {
    seller: ProfilePreview;
    category: Category;
    images: ListingImage[];
  };

  return ok({
    ...(row as unknown as Listing),
    seller: row.seller,
    category: row.category,
    images: row.images ?? [],
    // The detail embed carries no per-viewer save flag; the screen reads it from
    // the feed row it navigated from, or calls isSaved() below.
    is_saved: false,
  });
}

/**
 * Whether the signed-in user has saved this listing.
 *
 * Returns `true` when a save row exists.
 */
export async function isSaved(db: Db, listingId: string): Promise<AsyncResult<boolean>> {
  const { data, error } = await db
    .from("saved_listings")
    .select("listing_id")
    .eq("listing_id", listingId)
    .maybeSingle();

  if (error) return fail(toMessage(error));
  return ok(data !== null);
}

/**
 * Every listing the signed-in user has saved, most recent first.
 *
 * Needs no join and no user id: `is_saved` is computed per viewer inside the
 * view, which already knows who is asking.
 *
 * Returns the saved summaries.
 */
export async function getSavedListings(db: Db): Promise<AsyncResult<ListingSummary[]>> {
  const { data, error } = await db
    .from("listing_summaries")
    .select("*")
    .eq("is_saved", true)
    .order("created_at", { ascending: false });

  if (error) return fail(toMessage(error));
  return ok(viewRows<ListingSummary>(data));
}

/**
 * The signed-in user's own listings, drafts included, newest first.
 *
 * The `seller_id` filter narrows, it does not secure — the policy already hides
 * other people's drafts; this excludes their live listings too.
 *
 * Returns the user's summaries.
 */
export async function getMyListings(
  db: Db,
  sellerId: string,
): Promise<AsyncResult<ListingSummary[]>> {
  const { data, error } = await db
    .from("listing_summaries")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) return fail(toMessage(error));
  return ok(viewRows<ListingSummary>(data));
}

/**
 * Creates a listing.
 *
 * `.select()` is required, not optional: `insert()` returns no rows by default in
 * supabase-js v2, so without it there is no way to learn the generated id.
 *
 * Returns the new row. Checking `error` is sufficient here — an INSERT blocked by
 * WITH CHECK does raise 42501; updates and deletes are the silent ones.
 */
export async function createListing(
  db: Db,
  input: TablesInsert<"listings">,
): Promise<AsyncResult<Listing>> {
  const { data, error } = await db.from("listings").insert(input).select().single();

  if (error) return fail(toMessage(error));
  return ok(data as unknown as Listing);
}

/**
 * Moves a listing to a new status — the seller marking something reserved or sold.
 *
 * Shows the rule every write here follows: chain `.select()` and treat zero rows
 * as failure. An RLS `USING` clause makes a row you do not own invisible rather
 * than forbidden, so this would otherwise report success having changed nothing.
 *
 * Returns the updated row, or a failure if the listing is not the caller's.
 */
export async function setListingStatus(
  db: Db,
  listingId: string,
  status: ListingStatus,
): Promise<AsyncResult<Listing>> {
  const { data, error } = await db
    .from("listings")
    .update({ status })
    .eq("id", listingId)
    .select();

  if (error) return fail(toMessage(error));
  return requireRows(
    data as unknown as Listing[],
    "That listing is no longer yours to change.",
  );
}

/**
 * Saves a listing.
 *
 * `upsert` rather than insert so a double tap is harmless. The composite primary
 * key `(user_id, listing_id)` is what makes that work — a second save resolves at
 * the database in one round trip instead of a read-then-branch with a race in it.
 *
 * Returns `ok(null)` on success.
 */
export async function saveListing(
  db: Db,
  userId: string,
  listingId: string,
): Promise<AsyncResult<null>> {
  const { error } = await db
    .from("saved_listings")
    .upsert({ user_id: userId, listing_id: listingId }, { onConflict: "user_id,listing_id" });

  if (error) return fail(toMessage(error));
  return ok(null);
}

/**
 * Unsaves a listing.
 *
 * The clearest case of the silent-failure trap: `saved_listings` is protected by
 * a `USING` clause, so deleting someone else's save returns
 * `{ data: [], error: null }` and would report success without the row check.
 *
 * Returns `ok(null)` only when a row was actually deleted.
 */
export async function unsaveListing(
  db: Db,
  listingId: string,
): Promise<AsyncResult<null>> {
  const { data, error } = await db
    .from("saved_listings")
    .delete()
    .eq("listing_id", listingId)
    .select();

  if (error) return fail(toMessage(error));
  return requireWrite(data, "That listing wasn't saved.");
}
