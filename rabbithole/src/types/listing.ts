/**
 * Listing types — the thing being sold, and the shapes the UI reads it in.
 *
 * Listing rows, categories, images, and the two composed view models:
 * `ListingSummary` for the feed, `ListingDetail` for the detail screen. Orders
 * and anything money-related arrive in v2 as their own module so v1 stays
 * legible — see ARCHITECTURE.md.
 *
 * Returns: types only. No behaviour lives in `src/types`.
 */

import type { Campus, ProfilePreview } from "./profile";

/**
 * Seller-declared physical condition.
 *
 * A closed union rather than free text so the filter UI, the badge colours and
 * the CHECK constraint all agree. Adding a member produces type errors
 * everywhere it must be handled, which is the point.
 */
export type ListingCondition = "new" | "like_new" | "good" | "fair" | "poor";

/**
 * Lifecycle of a listing.
 *
 * `reserved` has an automatic writer: accepting an order sets it, cancelling or
 * expiring puts the listing back to `active`. v2's prepay flow reuses the same
 * value, which keeps the Stripe migration additive.
 *
 * `expired` comes from the scheduled sweep 30 days after posting, and is the one
 * terminal-looking state that is not terminal — `renew_listing()` brings it
 * back, and it stays visible to anyone holding the link so its owner can renew.
 */
export type ListingStatus =
  | "draft"
  | "active"
  | "reserved"
  | "sold"
  | "removed"
  | "expired";

/**
 * How a seller will take payment. Off-platform in v1 — the app never touches
 * money, it only records what the two people agreed to use.
 */
export type PaymentMethod = "cash" | "etransfer";

/**
 * An administered, safe, public place to hand an item over.
 *
 * Curated rather than free text because the whole safety value is in the place
 * being somewhere other people are. Retired spots keep `is_active: false` rather
 * than being deleted, because past orders still point at them.
 */
export interface MeetupSpot {
  id: string;
  campus: Campus;
  name: string;
  description: string | null;
  is_active: boolean;
}

/** A node in the category tree. `parent_category_id === null` marks a top level. */
export interface Category {
  id: string;
  parent_category_id: string | null;
  /** URL-safe, stable. Safe to hardcode in code; `name` is not. */
  slug: string;
  name: string;

  /**
   * Display order within a level, ascending.
   *
   * The Discover category bar is primary navigation, not a filter — leaving the
   * order to the planner puts Course Supplies wherever it likes, and
   * alphabetical would be an accident rather than a decision.
   */
  position: number;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  /** Storage object path, not a URL. */
  storage_path: string;
  /** 0-based display order, 0-7. Position 0 is the cover image; the cap is 8. */
  position: number;

  /**
   * Pixel dimensions, known before upload, so a card can reserve the right box
   * instead of reflowing the grid when the image lands — user photos run from
   * dorm snapshots to product shots, so the ratio is never predictable.
   * `null` for rows uploaded before dimensions were captured.
   */
  width: number | null;
  height: number | null;
}

/**
 * A row of `listings` — the write shape a create/edit form produces and the
 * table stores. Screens generally read one of the composed types below.
 */
export interface Listing {
  id: string;
  seller_id: string;

  /** The primary category, and the one the Discover drill-down filters on. */
  category_id: string;

  /** Optional, and must be an active spot on the same `campus`. */
  default_meetup_spot_id: string | null;

  title: string;
  description: string;

  /**
   * Integer cents, CAD. Never a float — 0.1 + 0.2 problems in a price field are
   * indefensible, and v2 hands this straight to Stripe, which also takes integer
   * cents. `0` legitimately means free, not unpriced.
   */
  price_cents: number;

  condition: ListingCondition;
  status: ListingStatus;

  /**
   * Free text like "Bldg 300 lobby". Distinct from `default_meetup_spot_id`: the
   * spot is where a handoff gets booked, the hint is what the seller adds on top.
   */
  pickup_hint: string | null;

  /**
   * Required. The feed is browsed by campus, so a listing without one would be
   * invisible rather than universal.
   */
  campus: Campus;

  /** Whether the seller invites offers. v1 negotiates in chat; there is no offers table. */
  is_negotiable: boolean;

  /** At least one is always true, enforced by a CHECK — otherwise nobody can buy it. */
  accepts_cash: boolean;
  accepts_etransfer: boolean;

  created_at: string;

  /**
   * The feed's sort key, and the reason it is not `created_at`. Renewing moves
   * this to now, lifting the listing without claiming it was posted today;
   * `created_at` stays the honest posted date.
   */
  bumped_at: string;

  /**
   * 30 days from posting or last renewal. Expiry is what keeps a campus
   * marketplace from filling with items that sold over the summer.
   */
  expires_at: string;

  /**
   * Last edit, maintained by trigger. Distinct from `created_at` because edits
   * are real: "posted 3d ago" on a listing whose price changed an hour ago is a
   * lie the buyer acts on.
   */
  updated_at: string;

  /** Set when `status` becomes `sold`; `null` otherwise. */
  sold_at: string | null;
}

/**
 * A row of `saved_listings` — one user's bookmark of one listing.
 *
 * Keyed by the pair, so saving is idempotent: a second tap is an upsert rather
 * than a duplicate. Screens read `is_saved` off the composed view models below;
 * this exists for the write path.
 */
export interface SavedListing {
  user_id: string;
  listing_id: string;
  created_at: string;
}

/**
 * What a feed card needs, and nothing more.
 *
 * A forward declaration of a Postgres view. Every field beyond the base row is a
 * join or aggregate the feed query pays for, so this type doubles as the cost
 * sheet for Discover: if it grows, the feed gets more expensive, on purpose.
 */
export interface ListingSummary extends Omit<Listing, "default_meetup_spot_id"> {
  seller: ProfilePreview;

  /**
   * The resolved spot, not its id — which is why `default_meetup_spot_id` is
   * omitted above. Pickup feasibility is a first-class signal: a buyer needs to
   * know a couch is on another campus before messaging, and an id cannot say so.
   *
   * `null` for the many listings with no spot set.
   */
  meetup_spot: Pick<MeetupSpot, "id" | "name"> | null;

  /** The `position: 0` image, or `null` for listings with no photos at all. */
  primary_image: ListingImage | null;
  /** Total image count, so the card can show "1/4" without fetching the rest. */
  image_count: number;
  /** Whether the VIEWING user has saved this. Per-viewer, so not globally cacheable. */
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
