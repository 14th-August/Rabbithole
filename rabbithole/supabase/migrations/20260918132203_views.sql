-- listing_summaries — the Discover feed's shape, as a view.
--
-- Owns: the composed row the feed renders.
-- Does not own: filtering or ordering. Callers do that; this is the shape, not
--   the query.
--
-- src/types/README.md calls ListingSummary "a forward declaration of a Postgres
-- view". This is that view, and the client-side toListingSummary() in
-- src/mocks disappears rather than being rewritten when the feed switches over.

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
  l.pickup_hint,
  l.created_at,
  l.updated_at,
  l.sold_at,

  -- Exactly ProfilePreview — the Pick<> in src/types/profile.ts is a standing
  -- statement of how much profile data the feed costs us to join. Widening it
  -- here is a query-cost decision and should be made in both places at once.
  jsonb_build_object(
    'id',           p.id,
    'display_name', p.display_name,
    'avatar_path',  p.avatar_path,
    'rating_avg',   p.rating_avg,
    'rating_count', p.rating_count
  ) as seller,

  -- NULL when there is no position-0 row, which is exactly what
  -- `ListingImage | null` means. Photoless listings are a real, common case.
  (
    select jsonb_build_object(
      'id',           i.id,
      'listing_id',   i.listing_id,
      'storage_path', i.storage_path,
      'position',     i.position
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
      from public.saved_listings s
     where s.listing_id = l.id
       and s.user_id = (select auth.uid())
  ) as is_saved

from public.listings l
join public.profiles p on p.id = l.seller_id;

-- security_invoker = on is the single most dangerous line in this schema to get
-- wrong. Without it the view runs as its owner, bypasses the listings SELECT
-- policy entirely, and publishes every draft in the database.
comment on view public.listing_summaries is
  'Feed shape for ListingSummary. security_invoker = on is load-bearing: it keeps the listings RLS policy in force and resolves is_saved per viewer.';

revoke all on public.listing_summaries from anon, public;
grant select on public.listing_summaries to authenticated;
