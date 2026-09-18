/**
 * Fixture barrel.
 *
 *   import { mockFeedListings, mockCurrentUser } from "@/mocks";
 *
 * Everything here is development data. Nothing in `src/mocks` may be imported by
 * a component that ships — screens should read data through a hook or a data
 * module, and those are what swap from fixture to Supabase. Keeping the import
 * surface in one file makes "who still depends on mocks?" a single grep.
 */

export { mockCategories, mockCategoriesById, mockTopLevelCategories } from "./categories";

export { mockCurrentUser, mockProfiles, mockProfilesById, toProfilePreview } from "./profiles";

export {
  mockEmptyListings,
  mockFeedListings,
  mockListings,
  mockListingsById,
  mockMyListings,
  mockSavedListings,
  toListingSummary,
} from "./listings";

export {
  mockConversations,
  mockConversationSummaries,
  mockMessagesByConversation,
  mockUnreadCount,
  toConversationSummary,
} from "./conversations";

export { daysAgo, hoursAgo, minutesAgo } from "./time";
