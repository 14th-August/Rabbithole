/**
 * Display formatters for domain values.
 *
 * Owns: turning stored values into the strings the design rules mandate.
 * Does not own: the values themselves. `src/types` is types only and may hold
 *   no behaviour, which is why these live here rather than beside the types
 *   they format.
 *
 * Several of these encode rules from `.claude/rules/design-rules.md` that are
 * easy to get wrong in a component and impossible to spot in review once they
 * are scattered. Formatting in one place is what makes "Free, never $0.00"
 * enforceable rather than aspirational.
 */

/**
 * Render an integer-cent price.
 *
 * `0` is a legitimate price meaning free, not unpriced, so it renders as
 * "Free" — never "$0.00". Cents are shown only when non-zero, because most
 * campus prices are whole dollars and a column of ".00" is noise.
 *
 * Thousands separators are always applied and the result is never abbreviated.
 * A feed can hold "$0" and "$4,750" in the same column, and "4.7k" makes a
 * price harder to scan, not easier.
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

/** What {@link formatRating} returns, so callers can style the two cases differently. */
export interface FormattedRating {
  /** "New seller", or "4.8" — the numeral alone, so a star icon can sit beside it. */
  label: string;
  /** "(12 reviews)", or `null` when there are none to count. */
  detail: string | null;
  /** `false` for a seller with no reviews, so the UI can omit the star entirely. */
  hasReviews: boolean;
}

/**
 * Render a seller's reputation.
 *
 * `rating_avg === null` means no reviews yet, which is **not** a rating of
 * zero — "0.0 ★" is an accusation, "New seller" is a fact.
 *
 * The count always travels with the average. "5.0 ★" from a single review is
 * technically true and materially misleading, and showing the count is the
 * cheapest correction available.
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

/**
 * Render an ISO 8601 timestamp as a short relative age — "just now", "18m",
 * "3h", "6d", then an absolute date past a week.
 *
 * Timestamps are stored and passed as strings, never `Date`, so parsing happens
 * here at render rather than at the model boundary. Past a week the relative
 * form stops being useful ("43d" means nothing), so it switches to a date.
 *
 * @param iso An ISO 8601 timestamp, as every `*_at` field carries.
 * @param now Injectable for tests; defaults to the current time.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const elapsed = now.getTime() - new Date(iso).getTime();

  // Clock skew between device and server can make a fresh row look future-dated.
  // "just now" is a better answer than a negative duration.
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
  if (elapsed < WEEK) return `${Math.floor(elapsed / DAY)}d`;

  return new Date(iso).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

/** Human-readable labels for {@link ListingCondition}. */
const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

/**
 * Render a condition value as a label.
 *
 * Deliberately plain. "Like new" means something different for a jacket than
 * for a bike, and the data cannot support a category-specific promise — so the
 * label states the seller's claim and adds nothing to it.
 */
export function formatCondition(condition: string): string {
  return CONDITION_LABELS[condition] ?? condition;
}
