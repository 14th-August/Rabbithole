/*
 * Date: 2026-10-30
 * Barrel for the pure helpers: listing validation, and the display formatters.
 * Used by screens and components; import from "@/lib/utils", not the files in it.
*/

// parsePriceToCents is the inverse of formatPrice but lives next door, because
// it is a validation rule and has the CHECK constraints around it for company.
export {
  formatPrice,
  formatRating,
  formatRelativeTime,
  formatCondition,
  formatCampus,
  type FormattedRating,
} from "./format";

export {
  validateListing,
  parsePriceToCents,
  clampPriceInput,
  normalizeTag,
  type ListingDraft,
  type ListingFieldName,
  type ListingProblem,
} from "./valid_posts";
