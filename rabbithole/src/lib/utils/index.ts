/**
 * Pure helpers — no database, no React, no native modules.
 *
 * The rules in here are the ones that are easy to break in a component and hard
 * to spot in review: what counts as a valid listing, and what `"0"` means in a
 * price field. Anything that touches Supabase belongs in `queries/`.
 *
 * Returns: re-exports only. Import from `@/lib/utils`, not the files inside it.
 */

export {
  validateListing,
  parsePriceToCents,
  clampPriceInput,
  normalizeTag,
  type ListingDraft,
  type ListingFieldName,
  type ListingProblem,
} from "./valid_posts";
