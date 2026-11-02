/*
 * Date: 2026-10-30
 * Display formatters: price, rating, relative time, condition and campus.
 * Used by the Discover feed cards and its campus filter.
*/

import type { Campus, ListingCondition } from "@/types";

/*
* Def: formatPrice
* Desc: Renders an integer-cent price. Zero means free, not unpriced, so it
* reads "Free" and never "$0.00". Cents appear only when non-zero, since most
* campus prices are whole dollars. Never abbreviated -- a feed column holding
* "$0" and "$4,750" is harder to scan with "4.7k" in it.
* Return: the formatted string.
*/
export function formatPrice(priceCents: number): string {
  if (priceCents === 0) return "Free";

  const dollars = priceCents / 100;
  const hasCents = priceCents % 100 !== 0;

  return dollars.toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  });
}

/** What formatRating returns, so callers can style the two cases apart. */
export interface FormattedRating {
  /** "New seller", or "4.8" -- the numeral alone, so a star can sit beside it. */
  label: string;
  /** "(12 reviews)", or null when there are none to count. */
  detail: string | null;
  /** false for a seller with no reviews, so the UI can omit the star. */
  hasReviews: boolean;
}

/*
* Def: formatRating
* Desc: Renders a seller's reputation. A null average means no reviews yet, not
* a rating of zero -- "0.0 star" is an accusation, "New seller" is a fact. The
* count always travels with the average, because "5.0" from one review is true
* and misleading at once.
* Return: a FormattedRating.
*/
export function formatRating(
  ratingAvg: number | null,
  ratingCount: number,
): FormattedRating {
  if (ratingAvg === null || ratingCount === 0) {
    return { label: "New seller", detail: null, hasReviews: false };
  }

  return {
    label: ratingAvg.toFixed(1),
    detail: `(${ratingCount} ${ratingCount === 1 ? "review" : "reviews"})`,
    hasReviews: true,
  };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/*
* Def: formatRelativeTime
* Desc: Renders an ISO 8601 timestamp as a short age -- "just now", "18m",
* "3h", "6d" -- then an absolute date past a week, where the relative form stops
* meaning anything. Timestamps are stored as strings, never Date, so parsing
* happens here at render. Clock skew can make a fresh row look future-dated;
* "just now" is a better answer than a negative duration.
* Return: the formatted string.
*/
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const elapsed = now.getTime() - new Date(iso).getTime();

  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
  if (elapsed < WEEK) return `${Math.floor(elapsed / DAY)}d`;

  return new Date(iso).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

/** Labels for ListingCondition. Keyed by the union, so a new member is a build error. */
const CONDITION_LABELS: Record<ListingCondition, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

/*
* Def: formatCondition
* Desc: Renders a condition value as a label. Deliberately plain: "like new"
* means something different for a jacket than a bike, and the data cannot
* support a category-specific promise, so the label states the seller's claim
* and adds nothing. No fallback -- the Record is keyed by the closed union.
* Return: the label.
*/
export function formatCondition(condition: ListingCondition): string {
  return CONDITION_LABELS[condition];
}

/** Labels for Campus. The enum member is parksville_qualicum; only the label is narrowed. */
const CAMPUS_LABELS: Record<Campus, string> = {
  nanaimo: "Nanaimo",
  cowichan: "Cowichan",
  powell_river: "Powell River",
  parksville_qualicum: "Parksville",
};

/*
* Def: formatCampus
* Desc: Renders a campus value as a label. One source for the Discover filter
* sheet and the card's campus line, so the two cannot disagree about what
* parksville_qualicum is called.
* Return: the label.
*/
export function formatCampus(campus: Campus): string {
  return CAMPUS_LABELS[campus];
}
