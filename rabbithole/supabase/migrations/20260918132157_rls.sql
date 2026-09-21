-- Row-level security: the entire authorization layer.
--
-- Owns: who may read and write every row in public.
-- Does not own: authentication. That is the auth_viu_gate migration.
--
-- There is no custom API layer in v1 — the client speaks to PostgREST directly,
-- so these policies ARE the access control. A gap here is not a bug in a
-- controller somewhere; it is the door being open.
--
-- Two conventions, applied without exception:
--
--   `(select auth.uid())` rather than bare auth.uid() — the subselect lets
--   Postgres evaluate it once as an initPlan instead of re-running it per row.
--
--   `to authenticated` on every policy — the policy is then not evaluated at
--   all for anonymous requests, which is cheaper than filtering rows.

alter table public.profiles       enable row level security;
alter table public.categories     enable row level security;
alter table public.listings       enable row level security;
alter table public.listing_images enable row level security;
alter table public.saved_listings enable row level security;
alter table public.conversations  enable row level security;
alter table public.messages       enable row level security;
alter table public.reviews        enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- Readable by every signed-in user because each feed card joins a seller
-- preview. This is why email is not a column on this table.
create policy "profiles readable by signed-in users"
  on public.profiles for select to authenticated
  using (true);

create policy "a user updates only their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No INSERT policy: handle_new_user() is the only writer, and it is
-- SECURITY DEFINER. No DELETE policy: rows cascade from auth.users.

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

-- Read-only to clients. Seeded and administered, not user-generated.
create policy "categories readable by signed-in users"
  on public.categories for select to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------------

-- draft and removed are owner-only; everything else is public to signed-in
-- users. The feed filters to active/reserved on top of this, but that is a
-- product decision — this is the security boundary.
create policy "live listings are visible; drafts are not"
  on public.listings for select to authenticated
  using (
    status in ('active', 'reserved', 'sold')
    or (select auth.uid()) = seller_id
  );

create policy "a seller creates their own listings"
  on public.listings for insert to authenticated
  with check ((select auth.uid()) = seller_id);

create policy "a seller edits their own listings"
  on public.listings for update to authenticated
  using ((select auth.uid()) = seller_id)
  with check ((select auth.uid()) = seller_id);

create policy "a seller deletes their own listings"
  on public.listings for delete to authenticated
  using ((select auth.uid()) = seller_id);

-- ---------------------------------------------------------------------------
-- listing_images
-- ---------------------------------------------------------------------------

-- Visibility follows the parent listing. The subquery is itself filtered by the
-- listings SELECT policy above, so a draft's images become owner-only for free
-- — no duplicated status logic to drift out of sync.
create policy "images follow their listing's visibility"
  on public.listing_images for select to authenticated
  using (exists (
    select 1 from public.listings l where l.id = listing_id
  ));

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
    and exists (
      select 1 from public.listings l
       where l.id = conversations.listing_id
         and l.seller_id = conversations.seller_id
         and l.seller_id <> (select auth.uid())
         and l.status in ('active', 'reserved')
    )
  );

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

create policy "a participant sends as themselves"
  on public.messages for insert to authenticated
  with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from public.conversations c where c.id = conversation_id
    )
  );

-- No UPDATE policy on purpose: read_at is written by
-- mark_conversation_read(), which checks membership itself. Adding one here
-- would let a sender rewrite the recipient's read state.

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------

create policy "reviews readable by signed-in users"
  on public.reviews for select to authenticated
  using (true);

-- The condition worth re-reading. Without "held a conversation on a sold
-- listing", reviews become free-form reputation anyone can write about anyone,
-- which is the cheapest possible way to make a trust system worthless.
create policy "a participant reviews a sold listing"
  on public.reviews for insert to authenticated
  with check (
    (select auth.uid()) = reviewer_id
    and exists (
      select 1 from public.listings l
       where l.id = reviews.listing_id
         and l.status = 'sold'
    )
    and exists (
      select 1 from public.conversations c
       where c.listing_id = reviews.listing_id
         and (select auth.uid()) in (c.buyer_id, c.seller_id)
         and reviews.reviewee_id in (c.buyer_id, c.seller_id)
    )
  );

-- No UPDATE or DELETE policy: a review is a record of a completed trade, not a
-- draft. Revisiting this is a product decision, not an oversight.
