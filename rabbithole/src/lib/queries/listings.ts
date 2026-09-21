/**
 * Reading and writing listings.
 *
 * Owns: every query that touches `listings`, `listing_images`, `listing_summaries`
 *   and `saved_listings`.
 * Does not own: formatting. A price stays integer cents until `formatPrice`
 *   renders it, and a `storage_path` stays a path until `publicUrl` resolves it.
 *
 * Authorization is **not** handled here. RLS filters every row before it reaches
 * this file, so a `.eq("seller_id", …)` added for *security* is false comfort —
 * the policy already ran. Filters below exist only to narrow a result.
 */

import type { Db } from "@/lib/supabase";
import type { AsyncResult } from "@/lib/useAsync";
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

import { fail, ok, requireRows, toMessage } from "./errors";

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
 * Narrow a `listing_summaries` row to {@link ListingSummary}.
 *
 * Postgres exposes no `NOT NULL` information for views, so every generated column
 * comes back `| null` and the composed objects as bare `Json` — even though the
 * view selects them from non-null table columns and they are never actually null.
 *
 * The official fix is `MergeDeep` from `type-fest`, which is a new dependency and
 * not one to add quietly. Until that is decided, the cast lives **here, once**,
 * rather than as `!` scattered across every screen that reads a listing.
 */
function toSummary(row: Record<string, unknown>): ListingSummary {
  return row as unknown as ListingSummary;
}

/**
 * The Discover feed: live listings, newest first.
 *
 * Reads the `listing_summaries` view rather than composing embeds client-side,
 * because `src/types/README.md` describes `ListingSummary` as "a forward
 * declaration of a Postgres view" — this is that view.
 *
 * @param page 0-based. Offset paging is fine at one campus; keyset pagination is
 *   correct at scale but the crossover is a long way off.
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
    .order("created_at", { ascending: false })
    .range(from, from + FEED_PAGE_SIZE - 1);

  if (error) return fail(toMessage(error));
  return ok((data ?? []).map(toSummary));
}

/**
 * One listing, with its seller, category and ordered photos.
 *
 * Composed with embeds rather than a view because the detail screen is the only
 * caller and its shape is allowed to change with the screen.
 *
 * @returns `null` data with no error when the listing does not exist or is not
 *   visible to this user — absence is an answer, not a failure.
 */
export async function getListing(
  db: Db,
  id: string,
): Promise<AsyncResult<ListingDetail | null>> {
  const { data, error } = await db
    .from("listings")
    .select(
      `*,
       seller:profiles!listings_seller_id_fkey (
         id, display_name, avatar_path, rating_avg, rating_count
       ),
       category:categories!listings_category_id_fkey (
         id, parent_id, slug, name, position
       ),
       images:listing_images (id, listing_id, storage_path, position)`,
    )
    .eq("id", id)
    // The foreign keys are named explicitly because `conversations` has two FKs
    // to `profiles`; PostgREST cannot guess which one a bare embed meant, and the
    // habit is worth keeping consistent.
    .order("position", { referencedTable: "listing_images", ascending: true })
    // maybeSingle, not single: a missing listing is a legitimate answer. Reaching
    // for .single() here would turn an empty state into an error state.
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
    // The detail embed does not carry the per-viewer save flag; the screen reads
    // it from the feed row it navigated from, or calls isSaved() below.
    is_saved: false,
  });
}

/** Whether the signed-in user has saved this listing. */
export async function isSaved(db: Db, listingId: string): Promise<AsyncResult<boolean>> {
  const { data, error } = await db
    .from("saved_listings")
    .select("listing_id")
    .eq("listing_id", listingId)
    .maybeSingle();

  if (error) return fail(toMessage(error));
  return ok(data !== null);
}

/** Every listing the signed-in user has saved, most recent first. */
export async function getSavedListings(db: Db): Promise<AsyncResult<ListingSummary[]>> {
  const { data, error } = await db
    .from("listing_summaries")
    .select("*")
    // is_saved is computed per viewer inside the view, so this needs no join and
    // no user id — the view already knows who is asking.
    .eq("is_saved", true)
    .order("created_at", { ascending: false });

  if (error) return fail(toMessage(error));
  return ok((data ?? []).map(toSummary));
}

/** The signed-in user's own listings, drafts included, newest first. */
export async function getMyListings(
  db: Db,
  sellerId: string,
): Promise<AsyncResult<ListingSummary[]>> {
  const { data, error } = await db
    .from("listing_summaries")
    .select("*")
    // Narrowing, not security. The policy already hides other people's drafts;
    // this excludes other people's *live* listings, which is a product decision.
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) return fail(toMessage(error));
  return ok((data ?? []).map(toSummary));
}

/**
 * Create a listing.
 *
 * `.select()` is required, not optional: `insert()` returns no rows by default in
 * supabase-js v2, so without it there is no way to learn the generated id.
 */
export async function createListing(
  db: Db,
  input: TablesInsert<"listings">,
): Promise<AsyncResult<Listing>> {
  const { data, error } = await db.from("listings").insert(input).select().single();

  // An INSERT blocked by WITH CHECK *does* raise 42501, so checking error is
  // sufficient here. Updates and deletes are the ones that fail silently.
  if (error) return fail(toMessage(error));
  return ok(data as unknown as Listing);
}

/**
 * Move a listing to a new status — the seller marking something reserved or sold.
 *
 * Demonstrates the rule every write in this folder follows: chain `.select()` and
 * treat zero rows as a failure. An RLS `USING` clause makes a row you do not own
 * *invisible* rather than forbidden, so this update would otherwise report success
 * having changed nothing.
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
 * Save a listing.
 *
 * Uses `upsert` rather than insert so tapping the bookmark twice is harmless. The
 * composite primary key `(user_id, listing_id)` is what makes that work — a second
 * save resolves at the database in one round trip instead of a read-then-branch
 * with a race in the middle.
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
 * Unsave a listing.
 *
 * The clearest example of the silent-failure trap: `saved_listings` is protected
 * by a `USING` clause, so deleting somebody else's save returns
 * `{ data: [], error: null }`. Without the row check this would report success.
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
  if (data === null || data.length === 0) return fail("That listing wasn't saved.");
  return ok(null);
}
