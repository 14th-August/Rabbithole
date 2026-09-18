/**
 * Listing fixtures — the main dataset the UI is built against.
 *
 * Owns: a set of listings chosen to break naive layouts, plus the derived
 *   collections each screen consumes.
 * Does not own: filtering, sorting, or search. Those are data-layer behaviour;
 *   the slices below are pre-baked shortcuts, not a query engine.
 *
 * Fixtures are authored as `ListingDetail` (full fidelity) and the feed's
 * `ListingSummary` rows are DERIVED from them. The feed and the detail screen
 * therefore cannot disagree about a price or a cover image — a class of "looks
 * right in the list, wrong on the page" bug that hand-writing both shapes invites.
 *
 * ## What each fixture is here to prove
 *
 * | Fixture | Edge case it covers |
 * | --- | --- |
 * | Nursing bundle | A title long enough to wrap three lines, and a long description |
 * | Desk lamp | `price_cents: 0` — must read "Free", not "$0.00" |
 * | PSYC 111 notes | No images at all, and `pickup_hint: null` |
 * | Mini fridge | `status: "reserved"` — badge, and not tappable to buy |
 * | Organic Chemistry | `status: "sold"` with `sold_at` set |
 * | Lab kit (draft) | `status: "draft"` — visible only to its owner |
 * | Road bike | A four-figure-ish price that stresses the price field's width |
 * | Study lamp riser | Posted minutes ago — the freshest relative timestamp |
 * | Anything by Priya | A seller with `rating_avg: null` and no avatar |
 */

import type { ListingDetail, ListingImage, ListingSummary } from "@/types";

import { mockCategoriesById } from "./categories";
import { mockCurrentUser, mockProfilesById, toProfilePreview } from "./profiles";
import { daysAgo, hoursAgo, minutesAgo } from "./time";

/**
 * Build ordered image rows for a listing.
 *
 * NOTE: these are Storage object *paths*, not URLs, exactly as the real column
 * will be — and Supabase Storage does not exist yet, so nothing resolves. Until
 * it does, image components should render the `colors.surfaceSunken` placeholder.
 * Resolving a path to a URL will be a `src/lib/` helper, not a change here.
 */
function mockImages(listingId: string, count: number): ListingImage[] {
  const suffix = listingId.slice(-4);

  return Array.from({ length: count }, (_, position) => ({
    id: `30000000-0000-4000-8000-${suffix}0000000${position}`,
    listing_id: listingId,
    storage_path: `listings/${listingId}/${position}.jpg`,
    position,
  }));
}

const CATEGORY = {
  biology: "10000000-0000-4000-8000-000000000011",
  mathematics: "10000000-0000-4000-8000-000000000012",
  chemistry: "10000000-0000-4000-8000-000000000013",
  nursing: "10000000-0000-4000-8000-000000000014",
  psychology: "10000000-0000-4000-8000-000000000015",
  electronics: "10000000-0000-4000-8000-000000000002",
  furniture: "10000000-0000-4000-8000-000000000003",
  transport: "10000000-0000-4000-8000-000000000004",
  supplies: "10000000-0000-4000-8000-000000000005",
} as const;

const SELLER = {
  maya: "00000000-0000-4000-8000-000000000001",
  devon: "00000000-0000-4000-8000-000000000002",
  priya: "00000000-0000-4000-8000-000000000003",
  sam: "00000000-0000-4000-8000-000000000004",
  alex: "00000000-0000-4000-8000-000000000005",
} as const;

interface ListingSeed
  extends Omit<ListingDetail, "seller" | "category" | "images"> {
  image_count: number;
}

const seeds: ListingSeed[] = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    seller_id: SELLER.maya,
    category_id: CATEGORY.biology,
    title: "Campbell Biology, 12th Edition",
    description:
      "Used for BIOL 121/122. Binding is solid, no loose pages. Some highlighting in the first four chapters, nothing after that. Access code is expired — buy it for the text, not the online component.",
    price_cents: 6500,
    condition: "good",
    status: "active",
    pickup_hint: "Nanaimo campus — Bldg 356 (Library) main entrance",
    created_at: daysAgo(3),
    sold_at: null,
    is_saved: true,
    image_count: 3,
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    seller_id: SELLER.devon,
    category_id: CATEGORY.mathematics,
    title: "Calculus: Early Transcendentals (Stewart, 9e)",
    description:
      "Barely opened — I dropped MATH 121 three weeks in. No writing anywhere. Comes with the solutions manual.",
    price_cents: 8000,
    condition: "like_new",
    status: "active",
    pickup_hint: "Bldg 300 lobby, weekday afternoons",
    created_at: daysAgo(1),
    sold_at: null,
    is_saved: false,
    image_count: 2,
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    seller_id: SELLER.maya,
    category_id: CATEGORY.electronics,
    title: "TI-84 Plus CE graphing calculator",
    description:
      "Works perfectly, batteries included. Small scuff on the back case. Charging cable included.",
    price_cents: 7000,
    condition: "good",
    status: "active",
    pickup_hint: "Nanaimo campus — Bldg 356 (Library) main entrance",
    created_at: daysAgo(6),
    sold_at: null,
    is_saved: true,
    image_count: 1,
  },
  {
    // Reserved: seller is holding it. In v1 this is set by hand; in v2 prepay
    // sets it automatically. The card must show a badge and suppress "Message".
    id: "20000000-0000-4000-8000-000000000004",
    seller_id: SELLER.sam,
    category_id: CATEGORY.furniture,
    title: "Mini fridge, 1.7 cu ft",
    description:
      "Lived under my desk in residence for two years. Cools fine, the door seal is a bit tired. Heavy — bring a friend or a car.",
    price_cents: 4500,
    condition: "fair",
    status: "reserved",
    pickup_hint: "VIU Residence — Bldg 400 parking lot",
    created_at: daysAgo(9),
    sold_at: null,
    is_saved: false,
    image_count: 2,
  },
  {
    // Free. `price_cents: 0` is a real, valid price and must not render "$0.00".
    id: "20000000-0000-4000-8000-000000000005",
    seller_id: SELLER.priya,
    category_id: CATEGORY.furniture,
    title: "Desk lamp — free to a good home",
    description: "Works. Bulb included. I just don't have room for it.",
    price_cents: 0,
    condition: "good",
    status: "active",
    pickup_hint: "Bldg 305, any evening",
    created_at: daysAgo(2),
    sold_at: null,
    is_saved: false,
    image_count: 1,
  },
  {
    // Long title + long description + many images. If the card survives this one
    // it survives most things.
    id: "20000000-0000-4000-8000-000000000006",
    seller_id: SELLER.priya,
    category_id: CATEGORY.nursing,
    title:
      "Nursing 2nd Year Bundle — Med-Surg, Pharmacology, Health Assessment and Clinical Skills textbooks, all required editions for the 2026/27 VIU BSN program",
    description:
      "Selling the complete second-year set together because splitting it isn't worth the hassle. Every book is the edition on the current syllabus, so nothing here is about to be replaced.\n\nMed-Surg and Pharmacology are in the best shape — light highlighting, no bent covers. Health Assessment has a coffee ring on the back cover and some dog-eared pages in the cardiac chapters. Clinical Skills has my notes pencilled in the margins throughout; some people find that useful and some hate it, so factor that in.\n\nBought new for just over $700. Firm on the price for the full set, but I'll listen to reasonable offers if you're taking all four today. I can meet most weekday afternoons on the Nanaimo campus.",
    price_cents: 22000,
    condition: "good",
    status: "active",
    pickup_hint: "Nanaimo campus — Bldg 320 courtyard",
    created_at: daysAgo(5),
    sold_at: null,
    is_saved: true,
    image_count: 4,
  },
  {
    // Sold, with sold_at set. Should not appear in the feed.
    id: "20000000-0000-4000-8000-000000000007",
    seller_id: SELLER.devon,
    category_id: CATEGORY.chemistry,
    title: "Organic Chemistry (Klein, 4th Edition)",
    description: "Standard CHEM 231 text. Good condition, a few sticky tabs left in.",
    price_cents: 5500,
    condition: "good",
    status: "sold",
    pickup_hint: "Bldg 300 lobby",
    created_at: daysAgo(21),
    sold_at: daysAgo(14),
    is_saved: false,
    image_count: 1,
  },
  {
    // No images AND no pickup hint. Two independent null paths in one card.
    id: "20000000-0000-4000-8000-000000000008",
    seller_id: SELLER.priya,
    category_id: CATEGORY.psychology,
    title: "PSYC 111 full lecture notes (printed)",
    description:
      "Complete set from last semester, hole-punched and organised by week. Got an A- if that means anything.",
    price_cents: 1000,
    condition: "good",
    status: "active",
    pickup_hint: null,
    created_at: daysAgo(8),
    sold_at: null,
    is_saved: false,
    image_count: 0,
  },
  {
    // High price — stresses the price field's width next to a long-ish title.
    id: "20000000-0000-4000-8000-000000000009",
    seller_id: SELLER.sam,
    category_id: CATEGORY.transport,
    title: "Kona Rove commuter bike, 54cm",
    description:
      "Solid campus-to-downtown bike. New chain and cassette this spring. Frame has the usual chips. Rides great, I'm just leaving the island.",
    price_cents: 45000,
    condition: "fair",
    status: "active",
    pickup_hint: "Nanaimo campus — bike racks by Bldg 250",
    created_at: daysAgo(4),
    sold_at: null,
    is_saved: false,
    image_count: 3,
  },
  {
    // The current user's unfinished listing. Visible only to them, only on Profile.
    id: "20000000-0000-4000-8000-000000000010",
    seller_id: SELLER.alex,
    category_id: CATEGORY.supplies,
    title: "Chem lab kit",
    description: "",
    price_cents: 3000,
    condition: "good",
    status: "draft",
    pickup_hint: null,
    created_at: hoursAgo(20),
    sold_at: null,
    is_saved: false,
    image_count: 0,
  },
  {
    // The current user's own live listing — needed so Alex appears as a SELLER in
    // at least one conversation, which is what exercises counterparty resolution.
    id: "20000000-0000-4000-8000-000000000011",
    seller_id: SELLER.alex,
    category_id: CATEGORY.supplies,
    title: "Lab coat + safety goggles, size M",
    description: "Required for CHEM 140. Washed, no burns or stains.",
    price_cents: 2000,
    condition: "like_new",
    status: "active",
    pickup_hint: "Bldg 370, before or after lab",
    created_at: daysAgo(7),
    sold_at: null,
    is_saved: false,
    image_count: 2,
  },
  {
    // Freshest item in the set — exercises "just now" / minutes-ago formatting.
    id: "20000000-0000-4000-8000-000000000012",
    seller_id: SELLER.maya,
    category_id: CATEGORY.furniture,
    title: "Monitor riser, solid oak",
    description: "Bought it last month, doesn't fit my new desk. Basically new.",
    price_cents: 2500,
    condition: "like_new",
    status: "active",
    pickup_hint: "Bldg 356, most mornings",
    created_at: minutesAgo(18),
    sold_at: null,
    is_saved: false,
    image_count: 1,
  },
];

function toListingDetail(seed: ListingSeed): ListingDetail {
  const { image_count, ...listing } = seed;

  return {
    ...listing,
    seller: toProfilePreview(mockProfilesById[seed.seller_id]!),
    category: mockCategoriesById[seed.category_id]!,
    images: mockImages(seed.id, image_count),
  };
}

/** Every listing, at full detail fidelity, regardless of status. */
export const mockListings: ListingDetail[] = seeds.map(toListingDetail);

export const mockListingsById: Record<string, ListingDetail> = Object.fromEntries(
  mockListings.map((listing) => [listing.id, listing]),
);

/**
 * Narrow a detail record to the feed shape.
 *
 * This is the client-side stand-in for a Postgres view. When the real query
 * exists, this function disappears and `ListingSummary` rows arrive pre-shaped.
 */
export function toListingSummary(listing: ListingDetail): ListingSummary {
  const { images, category: _category, ...rest } = listing;

  return {
    ...rest,
    primary_image: images.find((image) => image.position === 0) ?? null,
    image_count: images.length,
  };
}

/**
 * What Discover shows: live listings, newest first.
 *
 * `reserved` is included on purpose — a held item is still worth seeing, and
 * hiding it makes the feed look emptier than the marketplace actually is. Drafts,
 * sold, and removed listings are excluded.
 */
export const mockFeedListings: ListingSummary[] = mockListings
  .filter((listing) => listing.status === "active" || listing.status === "reserved")
  .map(toListingSummary)
  .sort((a, b) => b.created_at.localeCompare(a.created_at));

/** What the Saved tab shows. Includes a sold item only if one were saved — none is. */
export const mockSavedListings: ListingSummary[] = mockFeedListings.filter(
  (listing) => listing.is_saved,
);

/** The current user's own listings, drafts included, newest first. */
export const mockMyListings: ListingSummary[] = mockListings
  .filter((listing) => listing.seller_id === mockCurrentUser.id)
  .map(toListingSummary)
  .sort((a, b) => b.created_at.localeCompare(a.created_at));

/** An intentionally empty slice, for building empty states without deleting data. */
export const mockEmptyListings: ListingSummary[] = [];
