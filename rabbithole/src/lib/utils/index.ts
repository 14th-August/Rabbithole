/**
 * Display formatters barrel.
 *
 * Owns: re-exporting the pure functions that turn stored values into the strings
 *   a screen shows.
 * Does not own: fetching or validating anything. Nothing here touches Supabase,
 *   and nothing here has state — every function is input in, string out.
 *
 * Import from `@/lib/utils` rather than reaching into individual files:
 *
 *   import { formatPrice, formatRelativeTime } from "@/lib/utils";
 *
 * `format.ts` is not cosmetic — it encodes three rules from `design-rules.md`
 * that are easy to break in a component and hard to spot in review. Format here,
 * not in the component, so there is one place to fix.
 */

export {
  formatCondition,
  formatPrice,
  formatRating,
  formatRelativeTime,
  parsePriceToCents,
} from "./format";
export type { FormattedRating } from "./format";
