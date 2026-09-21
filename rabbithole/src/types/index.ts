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
  SavedListing,
} from "./listing";

/**
 * Generated from the live schema by `supabase gen types typescript --local`.
 *
 * Exported for the data layer, which needs `Database` to type the client. The
 * hand-written row types above remain the ones screens import: they carry the
 * TSDoc explaining what a null *means*, which generation cannot produce.
 *
 * Regenerate after every migration and diff the two. A difference is either a
 * schema mistake or a UI assumption that was never true.
 */
export type {
  Database,
  Json,
  // The generated helper generics. Re-exported so a query module can say
  // `TablesInsert<"listings">` without reaching past this barrel, which the
  // import rule forbids.
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "./database";

export type { Profile, ProfilePreview } from "./profile";

export type { Conversation, ConversationSummary, Message } from "./messaging";

export type { Review } from "./review";
