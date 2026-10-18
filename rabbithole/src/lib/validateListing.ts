/**
 * Create-form checks that run before a listing is worth sending.
 *
 * Owns: deciding whether a draft listing is complete and within limits.
 * Does not own: enforcing any of it. Every limit here mirrors a CHECK constraint
 *   in `supabase/migrations/20260918132138_enums_and_tables.sql`, which is the
 *   thing that actually enforces them. This layer exists so a 200-character
 *   title costs a keystroke instead of a round trip.
 *
 * Sign-up's equivalent lives in `src/lib/verification/validation.ts`. The two
 * were one file and are deliberately apart: nothing about a listing draft has
 * anything to do with authentication, and only this half needs a formatter.
 */

import { parsePriceToCents } from "@/lib/utils";
import type { Campus, ListingCondition } from "@/types";

/**
 * A listing as the Create form holds it, before anything is parsed.
 *
 * `price` is the raw text of the field rather than a number, because "is this
 * even a price" is one of the questions {@link validateListing} answers. The
 * two selections are nullable because "not chosen yet" is a real state the form
 * starts in, and is distinct from any valid value.
 */
export interface ListingDraft {
  title: string;
  price: string;
  categoryId: string | null;
  condition: ListingCondition | null;

  /**
   * Required, unlike the pickup note beside it.
   *
   * It was optional while campus was only a prefix on `pickup_hint`. It is now
   * its own NOT NULL column and the Browse feed filters on it, so a listing
   * without one would not be invisible to *some* people — it would be
   * unpostable.
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
 * The first thing wrong with a draft, or `null` when it is ready to send.
 *
 * Every limit below mirrors a CHECK constraint in
 * `supabase/migrations/20260918132138_enums_and_tables.sql` — title 1–200,
 * description ≤4000, `pickup_hint` ≤200, `price_cents >= 0`. They are duplicated
 * here on purpose: the database is the thing that actually enforces them, and
 * this exists so a 200-character title costs a keystroke rather than a round
 * trip. If a constraint changes there, it has to change here too.
 *
 * Returns only the **first** problem, in the order the fields appear on screen,
 * so the message the user is shown is about the topmost thing they need to fix
 * rather than an arbitrary one.
 *
 * Photos are deliberately not checked. `design-rules.md` is explicit that the
 * Create flow "should encourage photos without blocking on them" — a listing
 * with no photo is degraded, not invalid, and plenty of cheap items never get
 * one.
 */
export function validateListing(draft: ListingDraft): ListingProblem | null {
  if (draft.title.trim() === "") {
    return { field: "title", message: "Give your listing a title." };
  }

  if (draft.title.trim().length > TITLE_MAX) {
    return { field: "title", message: `Titles are limited to ${TITLE_MAX} characters.` };
  }

  // `0` is a price, so this cannot test for falsiness — only `null` means the
  // field was empty or unreadable.
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
