-- Indexes for the queries the five tabs actually run.
--
-- Owns: read performance for the Discover feed, the Saved tab, the inbox, and
--   seller profiles.
-- Does not own: the queries themselves. If a query here has no caller in
--   src/lib/queries, the index is speculative and should be deleted.

-- Discover: live listings, newest first. The single most-run query in the app.
create index listings_feed_idx on public.listings (status, created_at desc);

-- Profile tab: a seller's own listings, drafts included.
create index listings_seller_idx on public.listings (seller_id, created_at desc);

-- Category drill-down. Partial, because browsing a category only ever wants
-- live rows and a partial index is smaller and stays hotter in cache.
create index listings_category_idx on public.listings (category_id)
  where status = 'active';

-- Cover-image lookup and the ordered gallery on the detail screen.
create index listing_images_order_idx on public.listing_images (listing_id, position);

-- Saved tab, most recently saved first.
create index saved_listings_user_idx on public.saved_listings (user_id, created_at desc);

-- The inbox is one list, but the same user is a buyer in some threads and a
-- seller in others — so both sides need their own index.
create index conversations_buyer_idx  on public.conversations (buyer_id, last_message_at desc);
create index conversations_seller_idx on public.conversations (seller_id, last_message_at desc);

-- Thread view, oldest first.
create index messages_thread_idx on public.messages (conversation_id, created_at);

-- Unread counting: messages in a thread that this viewer did not send and has
-- not read. Partial on read_at is null, since read messages are the majority
-- and never match.
create index messages_unread_idx on public.messages (conversation_id, sender_id)
  where read_at is null;

-- A seller's received reviews, for the profile screen.
create index reviews_reviewee_idx on public.reviews (reviewee_id);

-- Search is a first-class affordance per design-rules.md, not a filter.
-- Expression index rather than a stored tsvector column: it keeps the row shape
-- identical to src/types, which matters because `supabase gen types` would
-- otherwise emit a tsvector field no hand-written type declares.
create index listings_search_idx on public.listings
  using gin (to_tsvector('english', title || ' ' || description));
