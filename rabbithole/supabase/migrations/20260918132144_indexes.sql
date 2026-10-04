-- Indexes for the queries the sixteen screens actually run.
--
-- Owns: read performance for Browse, Search, the Saved tab, the inbox, the
--   Orders screen, and public profiles. Plus two partial UNIQUE indexes that
--   are load-bearing correctness, not performance — they are marked.
-- Does not own: the queries themselves. If an index here has no caller in
--   src/lib/queries, it is speculative and should be deleted.

-- ---------------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------------

-- Browse: live listings on one campus, freshest first. The single most-run
-- query in the app, and the reason bumped_at exists as a separate column from
-- created_at — renewing a listing has to move it without lying about its age.
create index listings_feed_idx
  on public.listings (campus, status, bumped_at desc);

-- My Profile: a seller's own listings, drafts and expired ones included.
create index listings_seller_idx
  on public.listings (seller_id, created_at desc);

-- Category drill-down. Partial, because browsing a category only ever wants
-- live rows and a partial index is smaller and stays hotter in cache.
create index listings_category_idx
  on public.listings (category_id, bumped_at desc)
  where status = 'active';

-- Search is a first-class affordance per design-rules.md, not a filter. GIN
-- over the stored generated column, so the vector is not recomputed per query.
create index listings_search_idx
  on public.listings using gin (search_vector);

-- Two scheduled jobs read this: the expiry sweep, and the reminder sent before
-- a listing expires. Partial, because expired and sold rows never match again.
create index listings_expiry_idx
  on public.listings (expires_at)
  where status = 'active';

-- ---------------------------------------------------------------------------
-- listing_categories, listing_tags
-- ---------------------------------------------------------------------------

-- The primary keys already cover (listing_id, ...). These are the reverse
-- direction: "every listing in this secondary category", "every listing with
-- this tag" — which is what a tag chip on the detail screen links to.
create index listing_categories_category_idx on public.listing_categories (category_id);
create index listing_tags_tag_idx            on public.listing_tags (tag_id);

-- ---------------------------------------------------------------------------
-- listing_images
-- ---------------------------------------------------------------------------

-- Cover-image lookup and the ordered gallery on the detail screen. The UNIQUE
-- constraint on (listing_id, position) already indexes this pair, but it is
-- deferrable and therefore cannot be used for lookups in the same way.
create index listing_images_order_idx on public.listing_images (listing_id, position);

-- ---------------------------------------------------------------------------
-- saved_listings, follows, blocks
-- ---------------------------------------------------------------------------

-- Saved tab, most recently saved first.
create index saved_listings_user_idx on public.saved_listings (user_id, created_at desc);

-- The reverse of the primary key: "who follows this seller", which is the
-- query the new-listing notification fan-out runs.
create index follows_followed_idx on public.follows (followed_id) where notify;

-- The reverse of the primary key. Every block check asks both directions —
-- "did I block them" is the PK, "did they block me" is this.
create index blocks_blocked_idx on public.blocks (blocked_id);

-- ---------------------------------------------------------------------------
-- conversations, messages
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------

-- CORRECTNESS, not performance. At most one live deal per listing: the moment
-- a seller accepts, no second order on that listing can reach accepted. This
-- index is what makes "other pending requests are auto-declined" safe under
-- two sellers tapping Accept at the same moment — without it, the race is won
-- by whoever commits last and the item is sold twice.
create unique index orders_one_live_per_listing_idx
  on public.orders (listing_id)
  where status in ('accepted', 'completed');

-- CORRECTNESS, not performance. One outstanding request per buyer per listing.
-- Not specified in the requirements doc, but without it "Request to buy" is a
-- button a buyer can press forty times and forty notifications arrive.
create unique index orders_one_open_request_per_buyer_idx
  on public.orders (listing_id, buyer_id)
  where status = 'requested';

-- The Orders screen, both tabs.
create index orders_buyer_idx  on public.orders (buyer_id, created_at desc);
create index orders_seller_idx on public.orders (seller_id, created_at desc);

-- The scheduled sweep that expires accepted orders nobody confirmed. Partial
-- and tiny — only live deals are ever candidates.
create index orders_stale_idx
  on public.orders (accepted_at)
  where status = 'accepted';

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------

-- A user's received reviews, newest first, for the profile screen.
create index reviews_reviewee_idx on public.reviews (reviewee_id, created_at desc);

-- ---------------------------------------------------------------------------
-- meetup_spots, user_devices, reports
-- ---------------------------------------------------------------------------

-- The picker on Post Listing and on Accept Order: active spots for one campus.
create index meetup_spots_campus_idx on public.meetup_spots (campus) where is_active;

-- Fan-out: every device belonging to the user being notified.
create index user_devices_user_idx on public.user_devices (user_id);

-- The moderation queue, oldest open report first. Lives in `private`, so this
-- index serves Edge Functions and the dashboard, never the app.
create index reports_queue_idx on private.reports (status, created_at);
