/**
 * Create-form checks that run before a listing is worth sending.
 *
 * Decides whether a draft is complete and within limits. Every limit mirrors a
 * CHECK constraint in `..._enums_and_tables.sql`, which is what actually
 * enforces them — this exists so a 200-character title costs a keystroke instead
 * of a round trip. Sign-up's equivalent is `verification/validation.ts`, kept
 * apart because a listing draft has nothing to do with authentication.
 *
 * Returns: `validateListing` returns the first {@link ListingProblem}, or `null`
 * when the draft is ready to send.
 */

import { parsePriceToCents } from "@/lib/utils";
import type { Campus, ListingCondition } from "@/types";

/**
 * A listing as the Create form holds it, before anything is parsed.
 *
 * `price` is raw field text rather than a number, because "is this even a price"
 * is one of the questions {@link validateListing} answers. The selections are
 * nullable because "not chosen yet" is a real state, distinct from any value.
 */
export interface ListingDraft {
  title: string;
  price: string;
  categoryId: string | null;
  condition: ListingCondition | null;

  /**
   * Required, unlike the pickup note beside it.
   *
   * It was optional while campus was a prefix on `pickup_hint`. It is now its
   * own NOT NULL column and Browse filters on it, so a listing without one is
   * unpostable rather than merely hard to find.
   */
  campus: Campus | null;

  pickupHint: string;
  description: string;
}

/** Which input a {@link ListingProblem} belongs to, so the screen can mark it. */
export type ListingFieldName =
  | "title"
  | "price"
  | "category"
  | "condition"
  | "campus"
  | "pickupHint"
  | "description";

/** One thing wrong with a draft, named and explained. */
export interface ListingProblem {
  field: ListingFieldName;
  /** A sentence to show the user, not a code. */
  message: string;
}

/**
 * Checks a draft against the same limits the database enforces.
 *
 * Returns only the FIRST problem, in the order the fields appear on screen, so
 * the user is told about the topmost thing to fix rather than an arbitrary one.
 * `null` means ready to send.
 *
 * Photos are deliberately not checked: `design-rules.md` says Create should
 * encourage photos without blocking on them. A photoless listing is degraded,
 * not invalid.
 */
export function validateListing(draft: ListingDraft): ListingProblem | null {
  if (draft.title.trim() === "") {
    return { field: "title", message: "Give your listing a title." };
  }

  if (draft.title.trim().length > TITLE_MAX) {
    return { field: "title", message: `Titles are limited to ${TITLE_MAX} characters.` };
  }

  // `0` is a price, so this cannot test falsiness — only `null` means the field
  // was empty or unreadable.
  if (parsePriceToCents(draft.price) === null) {
    return { field: "price", message: "Enter a price. Put 0 if you're giving it away." };
  }

  if (draft.categoryId === null) {
    return { field: "category", message: "Pick a category so people can find it." };
  }

  if (draft.condition === null) {
    return { field: "condition", message: "Say what condition it's in." };
  }

  if (draft.campus === null) {
    return { field: "campus", message: "Pick the campus you'll hand this over at." };
  }

  if (draft.pickupHint.length > PICKUP_HINT_MAX) {
    return {
      field: "pickupHint",
      message: `Pickup details are limited to ${PICKUP_HINT_MAX} characters.`,
    };
  }

  if (draft.description.length > DESCRIPTION_MAX) {
    return {
      field: "description",
      message: `Descriptions are limited to ${DESCRIPTION_MAX} characters.`,
    };
  }

  return null;
}

/** Mirrors `char_length(title) between 1 and 200`. */
const TITLE_MAX = 200;

/** Mirrors `char_length(pickup_hint) <= 200`. */
const PICKUP_HINT_MAX = 200;

/** Mirrors `char_length(description) <= 4000`. */
const DESCRIPTION_MAX = 4000;
