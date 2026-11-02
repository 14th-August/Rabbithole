/*
 * Date: 2026-10-30
 * Index for the cross-campus Discover feed.
 * Used by getListingFeed in src/lib/queries/listings.ts when no campus is given.
*/

-- Discover now defaults to every campus, which drops the campus predicate and
-- so cannot use listings_feed_idx -- its leading column is campus. Measured
-- before this existed: the planner took listings_expiry_idx and then sorted.
-- Partial on status, matching listings_category_idx: the feed only wants live
-- rows. listings_feed_idx stays; it still serves the campus-scoped path.
create index listings_recent_idx
  on public.listings (bumped_at desc)
  where status = 'active';
