/**
 * Listing types — the thing being sold, and the shapes the UI reads it in.
 *
 * Owns: listing rows, categories, images, and the two composed view models
 *   (`ListingSummary` for the feed, `ListingDetail` for the detail screen).
 * Does not own: orders, payments, or anything money-related. Those arrive in v2
 *   as their own module so v1 stays legible — see ARCHITECTURE.md.
 */

import type { ProfilePreview } from "./profile";

/**
 * Seller-declared physical condition.
 *
 * A closed union rather than free text so the filter UI, the badge colours, and
 * the future CHECK constraint all agree. Adding a member here will produce type
 * errors everywhere it must be handled, which is the point.
 */
export type ListingCondition = "new" | "like_new" | "good" | "fair" | "poor";

/**
 * Lifecycle of a listing.
 *
 * `reserved` exists in v1 even though nothing sets it automatically yet — a seller
 * flips it by hand while holding an item for someone. v2's prepay flow reuses the
 * same value, which is what keeps the Stripe migration additive.
 */
export type ListingStatus = "draft" | "active" | "reserved" | "sold" | "removed";

/** A node in the category tree. `parent_id === null` marks a top-level category. */
export interface Category {
  id: string;
  parent_id: string | null;
  /** URL-safe, stable. Safe to hardcode in code; `name` is not. */
  slug: string;
  name: string;

  /**
   * Display order within a level, ascending.
   *
   * Exists because the Discover category bar is primary navigation, not a
   * filter — leaving it to the planner's row order puts Course Supplies
   * wherever it likes, and alphabetical would be an accident rather than a
   * decision.
   */
  position: number;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  /** Storage object path, not a URL. */
  storage_path: string;
  /** 0-based display order. Position 0 is the cover image. */
  position: number;
}

/**
 * A row of `listings`. This is the write shape — what a create/edit form produces
 * and what the table stores. Screens generally read one of the composed types below.
 */
export interface Listing {
  id: string;
  seller_id: string;
  category_id: string;
  title: string;
  description: string;

  /**
   * Integer cents, CAD. Never a float — 0.1 + 0.2 problems in a price field are
   * indefensible, and v2 hands this value straight to Stripe, which also takes
   * integer cents. `0` is a legitimate value meaning "free", not "unpriced".
   */
  price_cents: number;

  condition: ListingCondition;
  status: ListingStatus;

  /** Free text like "Bldg 300 lobby". Optional — some sellers only say so in chat. */
  pickup_hint: string | null;

  created_at: string;

  /**
   * Last edit, maintained by trigger.
   *
   * Distinct from `created_at` because edits are real: rendering "posted 3d ago"
   * on a listing whose price changed an hour ago is a lie the buyer acts on.
   */
  updated_at: string;

  /** Set when `status` becomes `sold`; `null` otherwise. */
  sold_at: string | null;
}

/**
 * A row of `saved_listings` — one user's bookmark of one listing.
 *
 * Keyed by the pair, so saving is idempotent: tapping the bookmark twice is an
 * upsert rather than a duplicate. Screens read `is_saved` off the composed view
 * models below rather than this row; it exists for the write path.
 */
export interface SavedListing {
  user_id: string;
  listing_id: string;
  created_at: string;
}

/**
 * What a feed card needs, and nothing more.
 *
 * This type is a forward declaration of a Postgres view. Every field beyond the
 * base row is a join or an aggregate the feed query will have to pay for, so the
 * type doubles as the cost sheet for the Discover screen: if this grows, the feed
 * query gets more expensive, visibly and on purpose.
 */
export interface ListingSummary extends Listing {
  seller: ProfilePreview;
  /** The `position: 0` image, or `null` for listings with no photos at all. */
  primary_image: ListingImage | null;
  /** Total image count, so the card can show a "1/4" badge without fetching the rest. */
  image_count: number;
  /** Whether the *viewing* user has saved this. Per-viewer, so it cannot be cached globally. */
  is_saved: boolean;
}

/** Everything the listing detail screen renders. */
export interface ListingDetail extends Listing {
  seller: ProfilePreview;
  category: Category;
  /** Ordered by `position` ascending. Empty array for a listing with no photos. */
  images: ListingImage[];
  is_saved: boolean;
}
