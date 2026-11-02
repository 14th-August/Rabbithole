/**
 * Reading and writing listings.
 *
 * The Browse feed reads one page of `listing_summaries`; Create writes a row,
 * its photos and its live status. Posting is four statements rather than one
 * because storage is not transactional — see {@link createListing}, where the
 * `draft` status is what makes a half-finished publish recoverable.
 *
 * Returns: `AsyncResult` throughout. An empty feed is `[]` with no error;
 * nothing to sell is not a fault.
 */

import type { Db } from "@/lib/supabase";
import type { AsyncResult } from "@/lib/hooks";
import type { Campus, Listing, ListingSummary, TablesInsert } from "@/types";

import { fail, ok, requireRows, toMessage } from "./errors";
import { viewRows } from "./rows";
import { uploadListingImage, type ImageAsset } from "./storage";
import { attachTags } from "./tags";

/**
 * The columns of `listings` that {@link Listing} declares.
 *
 * Named rather than `*` for one reason: `search_vector` is a generated tsvector
 * that no hand-written type carries, and it is the largest column on the row.
 * Selecting it would ship a few KB of index data back on every write.
 */
const LISTING_COLUMNS =
  "id, seller_id, category_id, default_meetup_spot_id, title, description, " +
  "price_cents, condition, status, pickup_hint, campus, is_negotiable, " +
  "accepts_cash, accepts_etransfer, created_at, bumped_at, expires_at, " +
  "updated_at, sold_at";

/**
 * Listings per page: two columns of ten.
 *
 * Also the number the feed fetches ahead of itself — see {@link getListingFeed},
 * which asks for one more row than this to learn whether a next page exists.
 */
export const FEED_PAGE_SIZE = 20;

/**
 * One page of the Browse feed.
 *
 * Satisfies `PageOf<ListingSummary>` structurally, which is what lets `usePaged`
 * consume it with no wrapper and no import either way.
 */
export interface ListingFeedPage {
  /** Up to {@link FEED_PAGE_SIZE} rows, freshest first. */
  items: ListingSummary[];

  /**
   * Whether a further page exists.
   *
   * Derived from an extra row rather than a `count`, so asking costs nothing —
   * see {@link getListingFeed}.
   */
  hasMore: boolean;
}

/** Everything {@link getListingFeed} takes beyond the client. */
export interface ListingFeedOptions {
  /**
   * The campus to browse, or omitted for every campus at once.
   *
   * Given, it is the leading column of `listings_feed_idx`. Omitted is the
   * Discover default, and the reason `listings_recent_idx` exists: handing an
   * item over in person is still the proposition, but whether a textbook is
   * worth a ferry is the student's call to make, not the feed's.
   */
  campus?: Campus;

  /** 0-based. Page 0 is the first {@link FEED_PAGE_SIZE} listings. */
  page?: number;

  /**
   * A seller whose own listings to leave out. Discover passes the signed-in
   * viewer, so that you never browse your own stock.
   *
   * A product rule, not a security boundary. RLS is the authorization layer;
   * a `seller_id` filter written here is false comfort as one.
   */
  excludeSellerId?: string;
}

/**
 * One page of live listings, freshest first, across every campus or one of them.
 *
 * `status` is filtered here rather than left to RLS, and that is load-bearing:
 * the listings SELECT policy admits `active`, `reserved`, `sold` and `expired`
 * alike, because a buyer holding a link to a sold item should still see it.
 * A feed that inherited that policy would show sold stock to everyone.
 *
 * Sorted on `bumped_at`, never `created_at` — renewing a listing lifts it
 * without backdating it, and `listings_feed_idx` is ordered for exactly this.
 *
 * Returns the page, or `[]` with no error when nothing matches.
 *
 * @param options Which campus if any, which page, and whose listings to hide.
 */
export async function getListingFeed(
  db: Db,
  options: ListingFeedOptions,
): Promise<AsyncResult<ListingFeedPage>> {
  const page = options.page ?? 0;
  const from = page * FEED_PAGE_SIZE;

  // One past the page, not a `count`. `.range` is inclusive at both ends, so
  // this asks for FEED_PAGE_SIZE + 1 rows: if the extra one comes back there is
  // another page. An exact count would mean a second scan of the whole campus
  // on every scroll, to render a number nothing displays.
  const filtered = db.from("listing_summaries").select("*").eq("status", "active");

  // Narrowing to one campus is the indexed path: listings_feed_idx leads on
  // campus. Unscoped, the planner takes listings_recent_idx, which exists for
  // that. Predicate ORDER is irrelevant -- Postgres reorders conjuncts freely;
  // dropping campus is what changes the plan.
  const scoped =
    options.campus === undefined ? filtered : filtered.eq("campus", options.campus);

  // Your own listings are yours to manage on Uploads, not to browse past on
  // Discover. Unindexed, and deliberately so: a filter on an already ordered
  // scan, not a second sort.
  const visible =
    options.excludeSellerId === undefined
      ? scoped
      : scoped.neq("seller_id", options.excludeSellerId);

  // Applied after the filters because .order/.range return a transform builder,
  // which has no .eq to append to.
  const { data, error } = await visible
    .order("bumped_at", { ascending: false })
    .range(from, from + FEED_PAGE_SIZE);

  if (error) return fail(toMessage(error));

  const rows = viewRows<ListingSummary>(data);
  const hasMore = rows.length > FEED_PAGE_SIZE;

  // The probe row is never rendered. Handing it to the caller would put 21
  // cards on a 20-card page and then show it again at the top of the next one.
  return ok({
    items: hasMore ? rows.slice(0, FEED_PAGE_SIZE) : rows,
    hasMore,
  });
}

/**
 * How many photos one listing may carry.
 *
 * A product rule, not a schema one — `listing_images.position` is
 * `CHECK (position between 0 and 7)`, so raising this needs no migration. The
 * Create screen reads it for the picker's `selectionLimit`, and
 * {@link createListing} enforces it again, so the two cannot drift.
 */
export const MAX_LISTING_PHOTOS = 4;

/**
 * Posts a listing: the row, its photos, and the status that makes it visible.
 *
 * Four statements rather than one, because storage is not transactional and an
 * RPC could not make it so. The order is what makes a partial failure
 * survivable: the row is inserted as a `draft`, which the listings SELECT
 * policy hides from everyone but its owner, and only the final UPDATE publishes
 * it. A failure at any point before that leaves a draft rather than a live
 * listing with missing photos — which is the case `draft` was kept in
 * `listing_status` for, against the requirements doc, on purpose.
 *
 * The draft is deliberately NOT deleted on failure. Deleting it would orphan
 * the objects already in the bucket and throw away what the user typed.
 *
 * Returns the published listing, or a failure naming what went wrong and saying
 * the draft was kept.
 *
 * @param input Everything but `status`, which this function owns.
 * @param photos In display order. The first becomes the cover (`position: 0`).
 *   Anything past {@link MAX_LISTING_PHOTOS} is ignored.
 * @param tags Normalised, de-duplicated tag names. `[]` costs no round trip.
 */
export async function createListing(
  db: Db,
  input: TablesInsert<"listings">,
  photos: ImageAsset[],
  tags: readonly string[] = [],
): Promise<AsyncResult<Listing>> {
  // `status` is forced, not merged from the caller. A caller passing 'active'
  // would publish the row before a single photo had moved.
  const { data: created, error: insertError } = await db
    .from("listings")
    .insert({ ...input, status: "draft" })
    .select("id")
    .single();

  // An INSERT refused by WITH CHECK does raise 42501, so checking `error` is
  // enough here. Updates and deletes are the silent ones.
  if (insertError) return fail(toMessage(insertError));

  const listingId = created.id;
  const uploaded: UploadedRow[] = [];

  // Sequential, not Promise.all: a phone on campus wifi uploading four photos
  // at once is how you get four timeouts instead of one failure. Stopping at
  // the first also keeps positions contiguous — a gap would leave a listing
  // whose cover is position 1, and `listing_summaries` only reads position 0.
  for (const [position, asset] of photos.slice(0, MAX_LISTING_PHOTOS).entries()) {
    const result = await uploadListingImage(
      db,
      input.seller_id,
      listingId,
      position,
      asset,
    );

    if (result.data === null) {
      // Record the ones that did land, so the draft is coherent and the objects
      // already in the bucket are referenced rather than orphaned.
      await attachImages(db, listingId, uploaded);
      return fail(`${result.error} Your listing was saved as a draft.`);
    }

    uploaded.push(result.data);
  }

  const attached = await attachImages(db, listingId, uploaded);
  if (attached.error !== null) {
    return fail(`${attached.error} Your listing was saved as a draft.`);
  }

  // Before the publish, not after. Tags are metadata and losing them is minor,
  // but a listing that goes live and then half-tags itself is a state nothing
  // reports — failing here keeps the draft, which the user can retry whole.
  const tagged = await attachTags(db, listingId, tags);
  if (tagged.error !== null) {
    return fail(`${tagged.error} Your listing was saved as a draft.`);
  }

  // The publish. `.select()` is not decoration: an UPDATE filtered out by a
  // USING clause matches zero rows and reports NO error, so the row count is
  // the only evidence the listing actually went live.
  const { data, error } = await db
    .from("listings")
    .update({ status: "active" })
    .eq("id", listingId)
    .select(LISTING_COLUMNS);

  if (error) return fail(toMessage(error));

  return requireRows(
    data as unknown as Listing[],
    "Your listing was saved as a draft, but couldn't be published.",
  );
}

/** One uploaded photo, as {@link attachImages} needs it. */
type UploadedRow = { storage_path: string; position: number; width: number; height: number };

/**
 * Writes the `listing_images` rows for photos that reached the bucket.
 *
 * Separate from the upload loop because it is called twice — once on the happy
 * path and once when an upload fails partway — and a listing with no photos is
 * a real case that must not cost a round trip.
 *
 * Returns `ok(null)`, including for an empty list.
 */
async function attachImages(
  db: Db,
  listingId: string,
  images: UploadedRow[],
): Promise<AsyncResult<null>> {
  if (images.length === 0) return ok(null);

  const { error } = await db
    .from("listing_images")
    .insert(images.map((image) => ({ ...image, listing_id: listingId })));

  if (error) return fail(toMessage(error));
  return ok(null);
}
