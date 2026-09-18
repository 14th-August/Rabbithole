/**
 * Domain types barrel.
 *
 * Import from `@/types` rather than reaching into individual files, so the
 * internal file split stays free to change:
 *
 *   import type { ListingSummary, ProfilePreview } from "@/types";
 *
 * These types are hand-written *ahead of* the database, not generated from it.
 * When the schema lands, `supabase gen types typescript` will emit the row types
 * and this module becomes the place where generated rows are re-exported and the
 * composed view models (`ListingSummary`, `ConversationSummary`) continue to live.
 * See `src/types/README.md`.
 */

export type {
  Category,
  Listing,
  ListingCondition,
  ListingDetail,
  ListingImage,
  ListingStatus,
  ListingSummary,
} from "./listing";

export type { Profile, ProfilePreview } from "./profile";

export type { Conversation, ConversationSummary, Message } from "./messaging";

export type { Review } from "./review";
