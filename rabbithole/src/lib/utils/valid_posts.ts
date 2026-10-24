/**
 * Create-form checks that run before a listing is worth sending.
 *
 * Decides whether a draft is complete and within limits, and reads a typed
 * price back into integer cents. Every limit mirrors a CHECK constraint in
 * `..._enums_and_tables.sql`, which is what actually enforces it — this exists
 * so a 201-character title costs a keystroke instead of a round trip.
 *
 * Returns: `validateListing` returns the first {@link ListingProblem}, or `null`
 * when the draft is ready. `parsePriceToCents` returns cents, or `null`.
 */

import type { Campus, ListingCondition } from "@/types";

/**
 * A listing as the Create form holds it, before anything is parsed.
 *
 * `price` is raw field text rather than a number, because "is this even a price"
 * is one of the questions {@link validateListing} answers. The selections are
 * nullable because "not chosen yet" is a real state, distinct from any value.
 */
export interface ListingDraft {
  /**
   * How many photos are attached. A count, not the photos: this module is pure
   * and has no business holding a picker asset.
   */
  photoCount: number;

  title: string;
  condition: ListingCondition | null;

  /** Raw text as typed — `"12.50"`, `"$12.50"`, `"0"`. */
  price: string;

  /** At least one must be true, or nobody can buy the item. */
  acceptsCash: boolean;
  acceptsEtransfer: boolean;

  description: string;

  /**
   * Required, unlike the meetup spot beside it. The feed is browsed by campus,
   * so a listing without one would be invisible rather than universal.
   */
  campus: Campus | null;

  /**
   * Free text describing where to meet — "Bldg 300 lobby, by the benches".
   *
   * Optional, and distinct from the campus above it: the campus is what the
   * feed filters on, this is whatever the seller wants to add on top. Maps to
   * `listings.pickup_hint`, which is nullable.
   */
  pickupHint: string;

  categoryId: string | null;
}

/** Which input a {@link ListingProblem} belongs to, so the screen can mark it. */
export type ListingFieldName =
  | "photos"
  | "title"
  | "condition"
  | "price"
  | "payment"
  | "description"
  | "campus"
  | "pickupHint"
  | "category";

/** One thing wrong with a draft, named and explained. */
export interface ListingProblem {
  field: ListingFieldName;
  /** A sentence to show the user, not a code. */
  message: string;
}

/** Mirrors `char_length(title) between 1 and 200`. */
const TITLE_MAX = 200;

/** Mirrors `char_length(description) <= 4000`. */
const DESCRIPTION_MAX = 4000;

/** Mirrors `char_length(pickup_hint) <= 200`. */
const PICKUP_HINT_MAX = 200;

/**
 * Mirrors the `listings_price_within_cap` CHECK: $100,000 in integer cents.
 *
 * A ceiling for typos rather than for expensive items — nothing on a student
 * marketplace costs this much, and an unbounded field produced an $8.8 million
 * listing on the first afternoon of real use. Moving it means moving the
 * constraint in the same change; this number is not the guard.
 */
const PRICE_MAX_CENTS = 10_000_000;

/**
 * Mirrors the CHECK on `tags.name` exactly.
 *
 * Lowercase is not a style choice. `tags.name` is `citext`, so comparison is
 * case-insensitive — but the CHECK uses `~`, which has no citext overload and
 * therefore matches case-SENSITIVELY against this pattern. "BIOL121" compares
 * equal to an existing "biol121" and is still refused on insert.
 */
const TAG = /^[a-z0-9][a-z0-9-]{0,29}$/;

/**
 * Checks a draft against the same limits the database enforces.
 *
 * Returns only the FIRST problem, in the order the fields appear on screen, so
 * the user is told about the topmost thing to fix rather than an arbitrary one.
 * `null` means ready to send.
 *
 * Photos ARE required here, and the schema disagrees: `listing_images` has no
 * minimum and `listing_summaries.primary_image` is nullable, because a listing
 * can legitimately lose its photos later. That is a storage question. Whether a
 * seller may post without one is a product question, and the answer is no — a
 * photoless card is the one nobody taps.
 */
export function validateListing(draft: ListingDraft): ListingProblem | null {
  // First, because the photo well is the first thing on the form.
  if (draft.photoCount === 0) {
    return { field: "photos", message: "Add at least one photo of your item." };
  }

  if (draft.title.trim() === "") {
    return { field: "title", message: "Give your listing a title." };
  }

  if (draft.title.trim().length > TITLE_MAX) {
    return { field: "title", message: `Titles are limited to ${TITLE_MAX} characters.` };
  }

  if (draft.condition === null) {
    return { field: "condition", message: "Say what condition it's in." };
  }

  // `0` is a price, so this cannot test falsiness — only `null` means the field
  // was empty or unreadable.
  const priceCents = parsePriceToCents(draft.price);

  if (priceCents === null) {
    return { field: "price", message: "Enter a price. Put 0 if you're giving it away." };
  }

  if (priceCents > PRICE_MAX_CENTS) {
    return { field: "price", message: "Listings are capped at $100,000." };
  }

  // Mirrors `listings_accepts_a_payment_method`. Without a payment method the
  // row is refused outright, and the CHECK violation reads as a generic
  // "some of those details aren't valid" by the time it reaches the user.
  if (!draft.acceptsCash && !draft.acceptsEtransfer) {
    return { field: "payment", message: "Pick at least one way to get paid." };
  }

  if (draft.description.length > DESCRIPTION_MAX) {
    return {
      field: "description",
      message: `Descriptions are limited to ${DESCRIPTION_MAX} characters.`,
    };
  }

  if (draft.campus === null) {
    return { field: "campus", message: "Pick the campus you'll hand this over at." };
  }

  if (draft.pickupHint.length > PICKUP_HINT_MAX) {
    return {
      field: "pickupHint",
      message: `Meetup details are limited to ${PICKUP_HINT_MAX} characters.`,
    };
  }

  if (draft.categoryId === null) {
    return { field: "category", message: "Pick a category so people can find it." };
  }

  return null;
}

/**
 * Reads a typed price back into integer cents.
 *
 * Forgiving about input — a leading `$`, separators and spaces are stripped,
 * because people paste prices. Strict after that: digits, optionally one or two
 * decimals.
 *
 * Returns cents, or `null` when the text is not a price. `"0"` parses to `0`, a
 * real price meaning free — callers must not read a falsy result as "no price
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

/**
 * Cleans a typed tag into something the database will accept.
 *
 * Forgiving first: trims, lowercases, and turns runs of whitespace into single
 * hyphens, because "BIOL 121" is what someone types and `biol-121` is what the
 * column takes. Strict after that — anything the CHECK would refuse comes back
 * as `null` rather than being mangled into a different tag than was meant.
 *
 * Returns the normalised tag, or `null` when the text cannot become one.
 */
export function normalizeTag(value: string): string | null {
  const tag = value.trim().toLowerCase().replace(/\s+/g, "-");
  return TAG.test(tag) ? tag : null;
}

/**
 * Clamps what a price field accepts, as it is typed.
 *
 * Drops anything that is not a digit or a dot, keeps only the first dot, and
 * cuts the fractional part at two places — so "3000.888888" can never be typed
 * in the first place. {@link parsePriceToCents} would refuse that string at
 * submit, which is the correct guard and the wrong moment: by then the user has
 * typed six digits nobody told them were a problem.
 *
 * A trailing dot survives on purpose. "12." is a half-typed "12.50", not a
 * mistake, and stripping it would fight the keyboard mid-entry.
 *
 * Returns the text the field should now hold.
 */
export function clampPriceInput(value: string): string {
  const digitsAndDots = value.replace(/[^0-9.]/g, "");
  const [whole = "", ...rest] = digitsAndDots.split(".");

  // No dot typed yet: nothing else to decide.
  if (rest.length === 0) return whole;

  // Extra dots are joined rather than dropped, so pasting "1.2.3" gives 1.23 —
  // the digits the user meant, in the order they gave them.
  return whole + "." + rest.join("").slice(0, 2);
}
