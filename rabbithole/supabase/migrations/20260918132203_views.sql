-- The three read shapes: a profile as others see it, a profile as its owner
-- sees it, and the feed card.
--
-- Owns: the composed rows the app renders.
-- Does not own: filtering or ordering. Callers do that; these are shapes, not
--   queries.
--
-- Two of these views are SECURITY DEFINER and one is SECURITY INVOKER, and the
-- difference is deliberate in all three cases. Getting it backwards in either
-- direction is the most dangerous mistake available in this schema, so each
-- one says why.

-- ---------------------------------------------------------------------------
-- public_profiles — a profile as another student sees it
-- ---------------------------------------------------------------------------

-- DEFINER on purpose (no `security_invoker`, which is the Postgres default).
-- The RLS migration revokes column-level SELECT on last_active_at from
-- authenticated, so a client cannot read it from the table at all. This view
-- is the only path to it, and it applies the show_last_active rule on the way
-- through. An invoker view here would simply fail to read the column and
-- return NULL for everyone, which would look like the feature working.
--
-- Bypassing RLS is harmless here: the profiles SELECT policy is `using (true)`
-- for authenticated users already. It is the COLUMN grant this view exists to
-- step around, under a condition.
create view public.public_profiles as
select
  p.id,
  p.username,
  p.bio,
  p.campus,
  p.avatar_path,

  -- The whole reason this view exists.
  case when p.show_last_active then p.last_active_at end as last_active_at,

  p.allow_follows,

  -- Trust signals, in the order design-rules.md says to show them.
  p.completed_sales,
  p.response_rate,
  p.median_response_minutes,

  -- NULL means no reviews yet. Renders "New seller", never "0.0 stars".
  p.rating_avg,
  p.rating_count,

  -- Exposed so the UI can mark a suspended or deleted counterparty rather than
  -- rendering a dead profile that looks ordinary.
  p.status,
  p.viu_verified_at,
  p.created_at
from public.profiles p;

comment on view public.public_profiles is
  'Every profile as other students see it. SECURITY DEFINER on purpose: it is the only path to last_active_at, which column grants deny directly, and it applies show_last_active here.';

revoke all on public.public_profiles from anon, public;
grant select on public.public_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- my_profile — a profile as its owner sees it
-- ---------------------------------------------------------------------------

-- Also DEFINER, and safe because the WHERE clause is the authorization: it can
-- only ever return the caller's own row. auth.uid() reads the request's JWT,
-- so it resolves per caller even inside a definer view.
--
-- This is how the Settings screen reads the notify_* preferences and
-- last_active_at, none of which are granted on the table — they are nobody
-- else's business, and RLS is row-level and so cannot express that.
create view public.my_profile as
select
  p.id,
  p.username,
  p.bio,
  p.campus,
  p.avatar_path,
  p.last_active_at,
  p.show_last_active,
  p.allow_follows,
  p.notify_messages,
  p.notify_orders,
  p.notify_new_listings,
  p.notify_listing_expiry,
  p.completed_sales,
  p.response_rate,
  p.median_response_minutes,
  p.rating_avg,
  p.rating_count,
  p.status,
  p.viu_verified_at,
  p.created_at,
  p.updated_at
from public.profiles p
where p.id = (select auth.uid());

comment on view public.my_profile is
  'The caller''s own profile, including the preferences column grants withhold from everyone else. SECURITY DEFINER; the WHERE clause on auth.uid() is the authorization.';

revoke all on public.my_profile from anon, public;
grant select on public.my_profile to authenticated;

-- ---------------------------------------------------------------------------
-- listing_summaries — the Browse feed's shape
-- ---------------------------------------------------------------------------

-- src/types/README.md calls ListingSummary "a forward declaration of a
-- Postgres view". This is that view, and the client-side toListingSummary() in
-- src/mocks disappears rather than being rewritten when the feed switches over.
--
-- Note what is NOT here: search_vector, description, tags, secondary
-- categories. Every column on this view is a cost paid on every scroll.
create view public.listing_summaries
with (security_invoker = on)
as
select
  l.id,
  l.seller_id,
  l.category_id,
  l.title,
  l.description,
  l.price_cents,
  l.condition,
  l.status,
  l.campus,
  l.pickup_hint,
  l.is_negotiable,
  l.accepts_cash,
  l.accepts_etransfer,
  l.bumped_at,
  l.expires_at,
  l.created_at,
  l.updated_at,
  l.sold_at,

  -- Exactly ProfilePreview — the Pick<> in src/types/profile.ts is a standing
  -- statement of how much profile data the feed costs us to join. Widening it
  -- here is a query-cost decision and should be made in both places at once.
  --
  -- design-rules.md: trust display scales with price, so rating and count are
  -- on the card, not only on detail.
  jsonb_build_object(
    'id',           p.id,
    'username',     p.username,
    'avatar_path',  p.avatar_path,
    'rating_avg',   p.rating_avg,
    'rating_count', p.rating_count
  ) as seller,

  -- Pickup feasibility is a first-class signal per design-rules.md — a buyer
  -- needs to know a couch is in Powell River BEFORE messaging, not after.
  case when s.id is not null then
    jsonb_build_object('id', s.id, 'name', s.name)
  end as meetup_spot,

  -- NULL when there is no position-0 row, which is exactly what
  -- `ListingImage | null` means. Photoless listings are a real, common case.
  -- width and height let the card reserve the right box before the image
  -- loads, instead of reflowing the grid when it arrives.
  (
    select jsonb_build_object(
      'id',           i.id,
      'listing_id',   i.listing_id,
      'storage_path', i.storage_path,
      'position',     i.position,
      'width',        i.width,
      'height',       i.height
    )
      from public.listing_images i
     where i.listing_id = l.id
       and i.position = 0
  ) as primary_image,

  -- So a card can show "1/4" without fetching the rest.
  (
    select count(*)::integer
      from public.listing_images i
     where i.listing_id = l.id
  ) as image_count,

  -- Per-viewer, so this column cannot be cached globally.
  exists (
    select 1
      from public.saved_listings sl
     where sl.listing_id = l.id
       and sl.user_id = (select auth.uid())
  ) as is_saved

from public.listings l
join public.profiles p on p.id = l.seller_id
left join public.meetup_spots s on s.id = l.default_meetup_spot_id;

-- security_invoker = on is the single most dangerous line in this schema to get
-- wrong. Without it the view runs as its owner, bypasses the listings SELECT
-- policy entirely, and publishes every draft in the database.
comment on view public.listing_summaries is
  'Feed shape for ListingSummary. security_invoker = on is load-bearing: it keeps the listings RLS policy in force and resolves is_saved per viewer.';

revoke all on public.listing_summaries from anon, public;
grant select on public.listing_summaries to authenticated;
