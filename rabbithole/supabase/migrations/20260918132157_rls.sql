-- Row-level security and column grants: the entire authorization layer.
--
-- Owns: who may read and write every row and every column in public.
-- Does not own: authentication (the auth_viu_gate migration) or row validity
--   (the triggers migration).
--
-- There is no custom API layer in v1 — the client speaks to PostgREST directly,
-- so these policies ARE the access control. A gap here is not a bug in a
-- controller somewhere; it is the door being open.
--
-- Three conventions, applied without exception:
--
--   `(select auth.uid())` rather than bare auth.uid() — the subselect lets
--   Postgres evaluate it once as an initPlan instead of re-running it per row.
--
--   `to authenticated` on every policy — the policy is then not evaluated at
--   all for anonymous requests, which is cheaper than filtering rows.
--
--   Every write policy that creates content also checks the account is active.
--   That is what makes `account_status = 'suspended'` actually suspend someone
--   rather than merely label them.

alter table public.profiles           enable row level security;
alter table public.follows            enable row level security;
alter table public.blocks             enable row level security;
alter table public.user_devices       enable row level security;
alter table public.categories         enable row level security;
alter table public.tags               enable row level security;
alter table public.meetup_spots       enable row level security;
alter table public.listings           enable row level security;
alter table public.listing_categories enable row level security;
alter table public.listing_tags       enable row level security;
alter table public.listing_images     enable row level security;
alter table public.saved_listings     enable row level security;
alter table public.orders             enable row level security;
alter table public.reviews            enable row level security;
alter table public.conversations      enable row level security;
alter table public.messages           enable row level security;

-- ---------------------------------------------------------------------------
-- Authorization helpers
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER, and that is the entire point. A policy that checked
-- `blocks` with a plain subquery would read it under the caller's own RLS —
-- and the blocked user cannot see the block row, so the check would silently
-- pass for exactly the person it exists to stop.
create or replace function public.is_blocked_between(p_one uuid, p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks b
     where (b.blocker_id = p_one   and b.blocked_id = p_other)
        or (b.blocker_id = p_other and b.blocked_id = p_one)
  );
$$;

-- Suspension and banning have to bite somewhere. This is that somewhere: it is
-- called from every policy that lets a user create something other people see.
create or replace function public.is_account_active(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
     where p.id = p_user and p.status = 'active'
  );
$$;

grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function public.is_account_active(uuid)        to authenticated;
revoke execute on function public.is_blocked_between(uuid, uuid) from anon, public;
revoke execute on function public.is_account_active(uuid)        from anon, public;

-- ---------------------------------------------------------------------------
-- profiles — column grants, because RLS is row-level
-- ---------------------------------------------------------------------------

-- RLS decides which ROWS are visible. It has nothing to say about columns, and
-- `profiles` holds columns in three different tiers on one row: public trust
-- signals, owner-only preferences, and server-written counters. Column grants
-- are the only mechanism that separates them, so they are not optional
-- hardening — they are the privacy model.
--
-- Readable by every signed-in user: identity and trust signals. This is why
-- there is no email and no real-name column on this table.
--
-- NOT readable: last_active_at (gated behind show_last_active, resolved in the
-- public_profiles view) and the notify_* preferences (nobody else's business).
-- Owners read those through my_profile. See the views migration.
--
-- NOT writable: every counter. completed_sales, rating_sum, rating_count,
-- response_rate, median_response_minutes, status and viu_verified_at are
-- maintained by triggers and functions. Without this revoke, a seller can PATCH
-- their own rating to 5.0 with one curl, and the entire trust system is
-- decorative.
revoke all on public.profiles from anon, authenticated;

grant select (
  id, username, bio, campus, avatar_path,
  show_last_active, allow_follows,
  completed_sales, response_rate, median_response_minutes,
  rating_sum, rating_count, rating_avg,
  status, viu_verified_at, created_at, updated_at
) on public.profiles to authenticated;

grant update (
  username, bio, campus, avatar_path,
  last_active_at, show_last_active, allow_follows,
  notify_messages, notify_orders, notify_new_listings, notify_listing_expiry
) on public.profiles to authenticated;

create policy "profiles readable by signed-in users"
  on public.profiles for select to authenticated
  using (true);

create policy "a user updates only their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No INSERT policy: handle_new_user() is the only writer, and it is
-- SECURITY DEFINER. No DELETE policy: rows cascade from auth.users, and
-- delete_my_account() anonymises rather than deletes.

-- ---------------------------------------------------------------------------
-- follows
-- ---------------------------------------------------------------------------

-- A user sees who THEY follow, never who follows them. Follower lists are the
-- raw material for harassment on a small campus, and the product does not need
-- one — a follower count is on the deferred list and is a counter, not a list.
create policy "a user reads only their own follows"
  on public.follows for select to authenticated
  using ((select auth.uid()) = follower_id);

create policy "a user follows as themselves"
  on public.follows for insert to authenticated
  with check (
    (select auth.uid()) = follower_id
    and public.is_account_active((select auth.uid()))
  );

-- Toggling notify on an existing follow.
create policy "a user edits only their own follows"
  on public.follows for update to authenticated
  using ((select auth.uid()) = follower_id)
  with check ((select auth.uid()) = follower_id);

create policy "a user unfollows only for themselves"
  on public.follows for delete to authenticated
  using ((select auth.uid()) = follower_id);

-- ---------------------------------------------------------------------------
-- blocks
-- ---------------------------------------------------------------------------

-- Visible to the blocker and nobody else. A blocked user who can detect the
-- block will make a second account; one who cannot just sees an unresponsive
-- person. The SELECT policy here is why is_blocked_between() has to be
-- SECURITY DEFINER.
create policy "a user reads only the blocks they created"
  on public.blocks for select to authenticated
  using ((select auth.uid()) = blocker_id);

create policy "a user blocks as themselves"
  on public.blocks for insert to authenticated
  with check ((select auth.uid()) = blocker_id);

create policy "a user unblocks only their own blocks"
  on public.blocks for delete to authenticated
  using ((select auth.uid()) = blocker_id);

-- ---------------------------------------------------------------------------
-- user_devices
-- ---------------------------------------------------------------------------

-- No policies at all, and the grants are revoked. RLS with zero policies is
-- deny-all, which is the correct posture for a table of push tokens: a
-- readable one is a way to notify every user in the app from a leaked anon
-- key. Clients register through public.register_device().
revoke all on public.user_devices from anon, authenticated;

-- ---------------------------------------------------------------------------
-- categories, tags, meetup_spots
-- ---------------------------------------------------------------------------

-- Read-only to clients. Seeded and administered, not user-generated.
create policy "categories readable by signed-in users"
  on public.categories for select to authenticated
  using (true);

create policy "meetup spots readable by signed-in users"
  on public.meetup_spots for select to authenticated
  using (true);

-- Tags are the exception: users mint them while posting. Insert only — nobody
-- renames or deletes a shared tag, because it is attached to other people's
-- listings. The name CHECK on the table is what keeps them tidy.
create policy "tags readable by signed-in users"
  on public.tags for select to authenticated
  using (true);

create policy "a signed-in user may mint a tag"
  on public.tags for insert to authenticated
  with check (public.is_account_active((select auth.uid())));

-- ---------------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------------

-- draft and removed are owner-only; everything else is visible to signed-in
-- users, expired included — an expired listing still needs to render for
-- anyone holding its link, and its owner needs to find it to renew. The feed
-- filters to active on top of this, but that is a product decision; this is
-- the security boundary.
create policy "live listings are visible; drafts and removals are not"
  on public.listings for select to authenticated
  using (
    status in ('active', 'reserved', 'sold', 'expired')
    or (select auth.uid()) = seller_id
  );

create policy "a seller creates their own listings"
  on public.listings for insert to authenticated
  with check (
    (select auth.uid()) = seller_id
    and public.is_account_active((select auth.uid()))
  );

create policy "a seller edits their own listings"
  on public.listings for update to authenticated
  using ((select auth.uid()) = seller_id)
  with check ((select auth.uid()) = seller_id);

create policy "a seller deletes their own listings"
  on public.listings for delete to authenticated
  using ((select auth.uid()) = seller_id);

-- ---------------------------------------------------------------------------
-- listing_categories, listing_tags, listing_images
-- ---------------------------------------------------------------------------

-- All three follow the parent listing. Each subquery is itself filtered by the
-- listings SELECT policy above, so a draft's images and tags become owner-only
-- for free — no duplicated status logic to drift out of sync.

create policy "secondary categories follow their listing's visibility"
  on public.listing_categories for select to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));

create policy "a seller manages their own listing's categories"
  on public.listing_categories for all to authenticated
  using (exists (
    select 1 from public.listings l
     where l.id = listing_id and l.seller_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.listings l
     where l.id = listing_id and l.seller_id = (select auth.uid())
  ));

create policy "tags follow their listing's visibility"
  on public.listing_tags for select to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));

create policy "a seller manages their own listing's tags"
  on public.listing_tags for all to authenticated
  using (exists (
    select 1 from public.listings l
     where l.id = listing_id and l.seller_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.listings l
     where l.id = listing_id and l.seller_id = (select auth.uid())
  ));

create policy "images follow their listing's visibility"
  on public.listing_images for select to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));

create policy "a seller manages their own listing's images"
  on public.listing_images for all to authenticated
  using (exists (
    select 1 from public.listings l
     where l.id = listing_id and l.seller_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.listings l
     where l.id = listing_id and l.seller_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- saved_listings
-- ---------------------------------------------------------------------------

-- Entirely private to the saver. Nobody can see what anyone else has saved.
create policy "a user manages only their own saves"
  on public.saved_listings for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------

-- Readable by the two parties. NOT writable by anyone: every transition runs
-- through request_order / accept_order / decline_order / confirm_meetup /
-- confirm_handoff / cancel_order, each of which is one transaction that also
-- moves the listing's status and auto-declines the losing requests.
--
-- A client UPDATE here would let a buyer set status = 'completed' on their own
-- and mint a review, which is the whole trust system in one PATCH.
revoke insert, update, delete on public.orders from anon, authenticated;
revoke all on public.orders from anon;

create policy "the two parties read their orders"
  on public.orders for select to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id));

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------

-- Public, because a review nobody can read is not a trust signal.
create policy "reviews readable by signed-in users"
  on public.reviews for select to authenticated
  using (true);

-- The reviewer identity is checked here; that the order is completed and that
-- both named parties are its parties is checked by
-- enforce_review_eligibility(), because it needs to read the order row.
create policy "a party to a completed order writes one review"
  on public.reviews for insert to authenticated
  with check (
    (select auth.uid()) = reviewer_id
    and public.is_account_active((select auth.uid()))
  );

-- No UPDATE or DELETE policy: a review is a record of a completed trade, not a
-- draft. Revisiting this is a product decision, not an oversight.

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------

create policy "participants read their conversations"
  on public.conversations for select to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id));

-- A buyer may open a thread on someone else's live listing, and on nobody's
-- draft. The seller_id on the new row must match the listing's actual seller,
-- or a buyer could invent a thread naming an uninvolved third party.
create policy "a buyer opens a thread on a live listing"
  on public.conversations for insert to authenticated
  with check (
    (select auth.uid()) = buyer_id
    and public.is_account_active((select auth.uid()))
    and not public.is_blocked_between((select auth.uid()), seller_id)
    and exists (
      select 1 from public.listings l
       where l.id = conversations.listing_id
         and l.seller_id = conversations.seller_id
         and l.seller_id <> (select auth.uid())
         and l.status in ('active', 'reserved')
    )
  );

-- No UPDATE policy: closed_at is set by apply_block() and by the order
-- functions, both SECURITY DEFINER. A participant must not be able to reopen a
-- thread that a block closed.

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------

-- The conversations policy does the participant check, so it is not repeated
-- here: a conversation the caller is not in simply does not exist to them.
create policy "participants read their messages"
  on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversations c where c.id = conversation_id
  ));

-- Blocks and closed threads are enforced by enforce_message_allowed(), which
-- is SECURITY DEFINER and can therefore see a block the sender cannot.
create policy "a participant sends as themselves"
  on public.messages for insert to authenticated
  with check (
    (select auth.uid()) = sender_id
    and public.is_account_active((select auth.uid()))
    and exists (
      select 1 from public.conversations c where c.id = conversation_id
    )
  );

-- No UPDATE policy on purpose: read_at is written by
-- mark_conversation_read(), which checks membership itself. Adding one here
-- would let a sender rewrite the recipient's read state.

-- ---------------------------------------------------------------------------
-- private.reports
-- ---------------------------------------------------------------------------

-- No RLS, no policies, and no grants — the `private` schema is not in
-- PostgREST's exposed list, so the table is unreachable with any key the app
-- holds. Reports arrive through public.submit_report(). Moderators read this
-- table through the Supabase dashboard or an Edge Function using the service
-- role, which is the honest v1 answer to "who reads the queue".
revoke all on all tables in schema private from anon, authenticated;
