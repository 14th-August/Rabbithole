/**
 * Display formatters for domain values.
 *
 * Turns stored values into the strings `design-rules.md` mandates, plus the one
 * inverse that reads a typed price back into cents. They live here rather than
 * beside their types because `src/types` is types only and may hold no
 * behaviour. Formatting in one place is what makes "Free, never $0.00"
 * enforceable rather than aspirational.
 *
 * Returns: strings, except `parsePriceToCents` (cents or `null`) and
 * `formatRating` (a {@link FormattedRating}).
 */

/**
 * Renders an integer-cent price.
 *
 * `0` means free, not unpriced, so it renders as "Free" — never "$0.00". Cents
 * show only when non-zero, since most campus prices are whole dollars.
 *
 * Returns a separated, never-abbreviated string: a feed holds "$0" and "$4,750"
 * in one column, and "4.7k" makes a price harder to scan.
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

/**
 * Reads a typed price back into integer cents.
 *
 * The inverse of {@link formatPrice} and deliberately its neighbour: the two
 * must agree on what "12.50" means. Forgiving about input — a leading `$`,
 * separators and spaces are stripped, because people paste prices. Strict after
 * that: digits, optionally one or two decimals.
 *
 * Returns cents, or `null` when the text is not a price. `"0"` parses to `0`,
 * a real price meaning free — callers must not read a falsy result as "no price
 * given". Only `null` means that.
 */
export function parsePriceToCents(value: string): number | null {
  const cleaned = value.trim().replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  // Split rather than multiply. `19.99 * 100` is 1998.9999999999998 in binary
  // floating point; assembling cents from the digits does not depend on
  // rounding happening to be right.
  const [whole, fraction = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** What {@link formatRating} returns, so callers can style the two cases apart. */
export interface FormattedRating {
  /** "New seller", or "4.8" — the numeral alone, so a star can sit beside it. */
  label: string;
  /** "(12 reviews)", or `null` when there are none to count. */
  detail: string | null;
  /** `false` for a seller with no reviews, so the UI can omit the star. */
  hasReviews: boolean;
}

/**
 * Renders a seller's reputation.
 *
 * `rating_avg === null` means no reviews yet, not a rating of zero — "0.0 star"
 * is an accusation, "New seller" is a fact. The count always travels with the
 * average, because "5.0" from one review is true and misleading.
 *
 * Returns a {@link FormattedRating}.
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
 * Renders an ISO 8601 timestamp as a short relative age.
 *
 * Timestamps are stored and passed as strings, never `Date`, so parsing happens
 * here at render rather than at the model boundary.
 *
 * Returns "just now", "18m", "3h", "6d" — then an absolute date past a week,
 * where the relative form stops meaning anything.
 *
 * @param iso An ISO 8601 timestamp, as every `*_at` field carries.
 * @param now Injectable for tests; defaults to the current time.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const elapsed = now.getTime() - new Date(iso).getTime();

  // Clock skew can make a fresh row look future-dated. "just now" is a better
  // answer than a negative duration.
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
 * Renders a condition value as a label.
 *
 * Deliberately plain: "like new" means something different for a jacket than a
 * bike, and the data cannot support a category-specific promise, so the label
 * states the seller's claim and adds nothing.
 *
 * Returns the label, or the raw value if unmapped.
 */
export function formatCondition(condition: string): string {
  return CONDITION_LABELS[condition] ?? condition;
}
