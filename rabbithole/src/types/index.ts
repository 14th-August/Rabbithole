/**
 * Domain types.
 *
 * The hand-written row types here are written ahead of the database, not
 * generated from it, and they carry the TSDoc explaining what a null means —
 * which generation cannot produce. `./database` holds the generated schema
 * beside them. Regenerate after every migration and diff the two: a difference
 * is either a schema mistake or a UI assumption that was never true.
 *
 * Returns: re-exports only. Import from `@/types`, not the files inside it, so
 * the internal split stays free to change.
 */

export type {
  Category,
  Listing,
  ListingCondition,
  ListingDetail,
  ListingImage,
  ListingStatus,
  ListingSummary,
  MeetupSpot,
  PaymentMethod,
  SavedListing,
} from "./listing";

/**
 * Generated from the live schema by `supabase gen types typescript --local`.
 *
 * Exported because the data layer needs `Database` to type the client. The
 * helper generics come with it so a query module can write
 * `TablesInsert<"listings">` without reaching past this barrel.
 */
export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "./database";

export type {
  AccountStatus,
  Campus,
  MyProfile,
  ProfilePreview,
  PublicProfile,
} from "./profile";

export type { Conversation, ConversationSummary, Message } from "./messaging";

export type { Review } from "./review";
