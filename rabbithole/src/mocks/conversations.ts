/**
 * Conversation and message fixtures.
 *
 * Owns: threads between the current user and other students, and the derived
 *   inbox rows.
 * Does not own: realtime delivery, read receipts, or send logic.
 *
 * As with listings, the summary rows are DERIVED from the message log rather than
 * hand-written, so `last_message` and `unread_count` cannot drift out of sync with
 * the thread they describe.
 *
 * ## What each thread is here to prove
 *
 * | Thread | Edge case it covers |
 * | --- | --- |
 * | Campbell Biology | Unread messages — the inbox badge and bold row state |
 * | Calculus | Fully read, and the last message is the viewer's own |
 * | Mini fridge | A thread with NO messages — `last_message: null` |
 * | Lab coat | The viewer is the SELLER, not the buyer — counterparty flips |
 */

import type { Conversation, ConversationSummary, Message } from "@/types";

import { mockListingsById } from "./listings";
import { mockCurrentUser, mockProfilesById, toProfilePreview } from "./profiles";
import { daysAgo, hoursAgo, minutesAgo } from "./time";

const CONVERSATION = {
  biology: "40000000-0000-4000-8000-000000000001",
  calculus: "40000000-0000-4000-8000-000000000002",
  fridge: "40000000-0000-4000-8000-000000000003",
  labCoat: "40000000-0000-4000-8000-000000000004",
} as const;

const SELLER = {
  maya: "00000000-0000-4000-8000-000000000001",
  devon: "00000000-0000-4000-8000-000000000002",
  priya: "00000000-0000-4000-8000-000000000003",
  sam: "00000000-0000-4000-8000-000000000004",
  alex: "00000000-0000-4000-8000-000000000005",
} as const;

export const mockConversations: Conversation[] = [
  {
    id: CONVERSATION.biology,
    listing_id: "20000000-0000-4000-8000-000000000001",
    buyer_id: SELLER.alex,
    seller_id: SELLER.maya,
    last_message_at: minutesAgo(35),
    created_at: hoursAgo(26),
  },
  {
    id: CONVERSATION.calculus,
    listing_id: "20000000-0000-4000-8000-000000000002",
    buyer_id: SELLER.alex,
    seller_id: SELLER.devon,
    last_message_at: hoursAgo(9),
    created_at: hoursAgo(11),
  },
  {
    // Opened but never written to. Real users do this constantly — they tap
    // "Message seller", see the listing header, and close the app.
    id: CONVERSATION.fridge,
    listing_id: "20000000-0000-4000-8000-000000000004",
    buyer_id: SELLER.alex,
    seller_id: SELLER.sam,
    last_message_at: daysAgo(2),
    created_at: daysAgo(2),
  },
  {
    // Here the current user is the SELLER.
    id: CONVERSATION.labCoat,
    listing_id: "20000000-0000-4000-8000-000000000011",
    buyer_id: SELLER.priya,
    seller_id: SELLER.alex,
    last_message_at: hoursAgo(3),
    created_at: hoursAgo(5),
  },
];

/** Message log per conversation, oldest first. */
export const mockMessagesByConversation: Record<string, Message[]> = {
  [CONVERSATION.biology]: [
    {
      id: "50000000-0000-4000-8000-000000000001",
      conversation_id: CONVERSATION.biology,
      sender_id: SELLER.alex,
      body: "Hey! Is the Campbell still available?",
      created_at: hoursAgo(26),
      read_at: hoursAgo(25),
    },
    {
      id: "50000000-0000-4000-8000-000000000002",
      conversation_id: CONVERSATION.biology,
      sender_id: SELLER.maya,
      body: "It is! I'm on campus most days this week.",
      created_at: hoursAgo(25),
      read_at: hoursAgo(24),
    },
    {
      id: "50000000-0000-4000-8000-000000000003",
      conversation_id: CONVERSATION.biology,
      sender_id: SELLER.alex,
      body: "Perfect. Would Thursday around 2 work? I have a class in 356 right before.",
      created_at: hoursAgo(24),
      read_at: hoursAgo(23),
    },
    {
      // Unread — drives the inbox badge.
      id: "50000000-0000-4000-8000-000000000004",
      conversation_id: CONVERSATION.biology,
      sender_id: SELLER.maya,
      body: "Thursday at 2 is good. I'll be by the library entrance.",
      created_at: minutesAgo(35),
      read_at: null,
    },
  ],

  [CONVERSATION.calculus]: [
    {
      id: "50000000-0000-4000-8000-000000000005",
      conversation_id: CONVERSATION.calculus,
      sender_id: SELLER.devon,
      body: "Saw you saved this — still interested? Happy to do $70 if you can grab it this week.",
      created_at: hoursAgo(11),
      read_at: hoursAgo(10),
    },
    {
      // Last message is the viewer's own: the row must not show as unread.
      id: "50000000-0000-4000-8000-000000000006",
      conversation_id: CONVERSATION.calculus,
      sender_id: SELLER.alex,
      body: "Tempting. Let me check my schedule and get back to you tonight.",
      created_at: hoursAgo(9),
      read_at: hoursAgo(8),
    },
  ],

  // Deliberately empty.
  [CONVERSATION.fridge]: [],

  [CONVERSATION.labCoat]: [
    {
      id: "50000000-0000-4000-8000-000000000007",
      conversation_id: CONVERSATION.labCoat,
      sender_id: SELLER.priya,
      body: "Hi! Is the lab coat still available, and is it the VIU-branded one?",
      created_at: hoursAgo(5),
      read_at: hoursAgo(4),
    },
    {
      id: "50000000-0000-4000-8000-000000000008",
      conversation_id: CONVERSATION.labCoat,
      sender_id: SELLER.priya,
      body: "Sorry — also, do the goggles have the side shields?",
      created_at: hoursAgo(4),
      read_at: null,
    },
    {
      id: "50000000-0000-4000-8000-000000000009",
      conversation_id: CONVERSATION.labCoat,
      sender_id: SELLER.priya,
      body: "No rush, just keen before the lab starts next week!",
      created_at: hoursAgo(3),
      read_at: null,
    },
  ],
};

/**
 * Resolve the other participant, from the viewer's perspective.
 *
 * The same conversation row shows Maya to Alex and Alex to Maya. Doing this once
 * here keeps every message screen free of `viewerId === buyer_id ? ... : ...`.
 */
function counterpartyIdOf(conversation: Conversation, viewerId: string): string {
  return conversation.buyer_id === viewerId
    ? conversation.seller_id
    : conversation.buyer_id;
}

/** Compose the inbox row for one conversation, from the viewer's perspective. */
export function toConversationSummary(
  conversation: Conversation,
  viewerId: string,
): ConversationSummary {
  const messages = mockMessagesByConversation[conversation.id] ?? [];
  const listing = mockListingsById[conversation.listing_id]!;
  const last = messages.at(-1) ?? null;

  return {
    ...conversation,
    counterparty: toProfilePreview(
      mockProfilesById[counterpartyIdOf(conversation, viewerId)]!,
    ),
    listing: {
      id: listing.id,
      title: listing.title,
      price_cents: listing.price_cents,
      primary_image: listing.images.find((image) => image.position === 0) ?? null,
    },
    last_message: last
      ? { body: last.body, created_at: last.created_at, sender_id: last.sender_id }
      : null,
    // Only messages FROM the counterparty count. Your own unread message is not
    // a thing, and counting it is the classic off-by-one in an inbox badge.
    unread_count: messages.filter(
      (message) => message.sender_id !== viewerId && message.read_at === null,
    ).length,
  };
}

/** The Messages inbox for the current user, most recent thread first. */
export const mockConversationSummaries: ConversationSummary[] = mockConversations
  .map((conversation) => toConversationSummary(conversation, mockCurrentUser.id))
  .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));

/** Total unread across all threads — the tab bar badge. */
export const mockUnreadCount: number = mockConversationSummaries.reduce(
  (total, conversation) => total + conversation.unread_count,
  0,
);
