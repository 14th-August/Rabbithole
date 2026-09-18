/**
 * Messaging types — buyer-to-seller conversations about a listing.
 *
 * Owns: conversation and message shapes, plus the composed row the inbox renders.
 * Does not own: realtime transport or unread bookkeeping. Those are data-layer
 *   concerns for `src/lib/`, not model concerns.
 *
 * Design note: a conversation is always *about a listing*. There is no general
 * direct-messaging surface, which keeps moderation tractable and makes
 * `(listing_id, buyer_id)` a natural uniqueness key — "message seller" can be
 * tapped repeatedly without spawning duplicate threads.
 */

import type { ListingImage } from "./listing";
import type { ProfilePreview } from "./profile";

export interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  /** Denormalised from the listing so inbox queries need not join to find the other party. */
  seller_id: string;
  /** Maintained by trigger on message insert. The inbox sorts on this. */
  last_message_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  /** `null` until the recipient opens the thread. Only meaningful to the non-sender. */
  read_at: string | null;
}

/**
 * One row of the Messages inbox.
 *
 * `counterparty` rather than `buyer`/`seller` because the inbox is rendered from
 * the viewer's perspective — the same conversation shows Maya to Devon and Devon
 * to Maya. Resolving that at the query layer keeps every message screen free of
 * `viewerId === conversation.buyer_id ? ... : ...` branching.
 */
export interface ConversationSummary extends Conversation {
  counterparty: ProfilePreview;

  /** Enough of the listing to show a thumbnail and title in the row. */
  listing: {
    id: string;
    title: string;
    price_cents: number;
    primary_image: ListingImage | null;
  };

  /** `null` for a thread created but never written to. */
  last_message: Pick<Message, "body" | "created_at" | "sender_id"> | null;

  /** Messages from the counterparty with `read_at === null`. Per-viewer. */
  unread_count: number;
}
