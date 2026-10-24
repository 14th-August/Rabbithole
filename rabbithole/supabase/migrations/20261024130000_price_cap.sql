-- An upper bound on what a listing may ask for.
--
-- Owns: the ceiling on `listings.price_cents`.
-- Does not own: the form's copy about it, which mirrors this in
--   src/lib/utils/valid_posts.ts and is a courtesy, not the guard.
--
-- $100,000, as 10,000,000 integer cents. The number is arbitrary in the way a
-- ceiling has to be: nothing on a student marketplace costs this much, and the
-- values it exists to catch are not expensive items but typos and jokes — a
-- price field with no upper bound produced an $8.8 million listing on the first
-- afternoon of real use.
--
-- NOT VALID, deliberately. The constraint is enforced on every INSERT and
-- UPDATE from now on, but Postgres does not scan the existing table to prove
-- old rows comply. That matters because a development database already holds
-- rows above the cap, and the alternative is a migration that either fails on
-- them or silently rewrites somebody's price — and quietly changing stored
-- money is worse than carrying an unvalidated constraint.
--
-- To finish the job once the data is clean:
--
--   delete from public.listings where price_cents > 10000000;
--   alter table public.listings validate constraint listings_price_within_cap;
--
-- Raising the cap later is one `drop constraint` and one `add constraint`, and
-- the client limit in valid_posts.ts has to move in the same change.

alter table public.listings
  drop constraint if exists listings_price_within_cap;

alter table public.listings
  add constraint listings_price_within_cap
  check (price_cents <= 10000000)
  not valid;

comment on constraint listings_price_within_cap on public.listings is
  '$100,000 in integer cents. Catches typos, not expensive items. NOT VALID: new writes are checked, pre-existing rows were never scanned.';
