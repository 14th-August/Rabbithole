/**
 * Form checks that run before a request is worth making.
 *
 * Owns: deciding whether what someone typed is worth sending.
 * Does not own: enforcing any of it. Every rule here is also enforced server
 *   side — the campus domain by the `before_user_created` auth hook, the
 *   password by GoTrue. This layer exists so a typo costs a round trip instead
 *   of a wait, and it is a keyboard convenience, never a gate.
 *
 * `docs/backend/auth-flow.md` names this "Layer 1 — the client regex" and is
 * blunt about the limit: anyone can curl the Auth REST endpoint and skip the app
 * entirely. Nothing here may be the only thing standing between a bad value and
 * the database.
 */

import { parsePriceToCents } from "@/lib/format";
import type { Campus, ListingCondition } from "@/types";

/**
 * Whether a string is shaped like an email address.
 *
 * Deliberately permissive: something, an `@`, something, a dot, something. The
 * full RFC 5322 grammar is famously not expressible as a readable regex, and
 * every attempt to approximate it rejects addresses that genuinely work —
 * plus-tags, apostrophes, new TLDs. Being strict here fails real students to
 * catch hypothetical ones.
 *
 * What it does catch is the mistake that actually happens: no `@` at all,
 * nothing before it, nothing after it, or a domain with no dot.
 */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * The domain Rabbithole accepts.
 *
 * Note the dot: `my.viu.ca` is a **subdomain**. `@viu.ca` is the employee
 * domain and is deliberately excluded — this is a student marketplace. The same
 * distinction is made in the auth hook migration, and getting it wrong does not
 * fail loudly; it produces an app no real student can register for.
 */
const CAMPUS_EMAIL = /@my\.viu\.ca$/i;

/**
 * Whether an address belongs to a student.
 *
 * Only worth calling once {@link isValidEmail} passes — on its own it would
 * accept `@my.viu.ca` with nothing in front of it.
 */
export function isCampusEmail(value: string): boolean {
  return CAMPUS_EMAIL.test(value.trim());
}

// ---------------------------------------------------------------------------
// Usernames
// ---------------------------------------------------------------------------

/**
 * Letters, digits and underscores, 3–20 characters.
 *
 * Identical to the CHECK on `profiles.username` and to the pattern inside
 * `is_username_available()`. Three copies is two too many, but the alternatives
 * are a round trip for every keystroke or a regex shipped from the server, and
 * a drift between them fails loudly: the database refuses the insert.
 */
const USERNAME = /^[A-Za-z0-9_]{3,20}$/;

/**
 * Why a username is unacceptable, or `null` if its *shape* is fine.
 *
 * Shape only. Whether it is already taken is a question for
 * `isUsernameAvailable` in `src/lib/auth.ts`, because only the database can
 * answer it — and this function stays synchronous so it can run on every
 * keystroke without a network call.
 *
 * Returns a sentence rather than a boolean: "3 to 20 characters" and "letters,
 * numbers and underscores" are different problems, and a single "invalid
 * username" makes the user guess which one they have.
 */
export function validateUsername(value: string): string | null {
  const username = value.trim();

  if (username === "") return "Pick a username.";
  if (username.length < 3) return "Usernames are at least 3 characters.";
  if (username.length > 20) return "Usernames are at most 20 characters.";

  if (!USERNAME.test(username)) {
    return "Letters, numbers and underscores only.";
  }

  return null;
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

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
