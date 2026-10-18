/**
 * Display formatters.
 *
 * Pure functions that turn stored values into the strings a screen shows —
 * input in, string out. Nothing here touches Supabase and nothing holds state.
 * `format.ts` encodes three rules from `design-rules.md` that are easy to break
 * in a component and hard to spot in review, so format here, not there.
 *
 * Returns: re-exports only. Import from `@/lib/utils`.
 */

export {
  formatCondition,
  formatPrice,
  formatRating,
  formatRelativeTime,
  parsePriceToCents,
} from "./format";
export type { FormattedRating } from "./format";
