-- Local development seed, transcribed from src/mocks.
--
-- Owns: a dataset that exercises the awkward cases the UI already handles.
-- Does not own: production data. This runs on `supabase db reset` only.
--
-- src/mocks/README.md: "Fixtures exist to be awkward. Tidy data hides the
-- layout work." The same applies here — this seed deliberately carries a free
-- item, a photoless listing, a null pickup hint, a three-line title, a draft, a
-- reserved item with a live order, a sold item with a completed order, a
-- seller with no reviews and no avatar, a listing on a distant campus, a
-- listing about to expire, and an empty conversation thread. If a query breaks
-- on one of these, the query is wrong, not the seed.
--
-- Every account's password is 'rabbithole' — local only, never a real project.

-- ---------------------------------------------------------------------------
-- Auth users
-- ---------------------------------------------------------------------------

-- Inserting into auth.users fires handle_new_user(), which creates the matching
-- public.profiles row with a RANDOM username. Emails must be @my.viu.ca or the
-- trigger raises — which is itself a useful check that layer 3 of the gate is
-- live.
--
-- Emails follow VIU's real format: PreferredName.LastName@my.viu.ca. Note that
-- raw_user_meta_data is empty: the old schema took a display_name from it, and
-- a pseudonymous marketplace has nowhere to put one. The real name stays in
-- auth.users and never reaches a table other students can read.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000001',
   'authenticated', 'authenticated', 'maya.chen@my.viu.ca',
   extensions.crypt('rabbithole', extensions.gen_salt('bf')),
   now() - interval '430 days', now() - interval '430 days', now(),
   '{"provider":"email","providers":["email"]}', '{}', false),

  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000002',
   'authenticated', 'authenticated', 'devon.okafor@my.viu.ca',
   extensions.crypt('rabbithole', extensions.gen_salt('bf')),
   now() - interval '215 days', now() - interval '215 days', now(),
   '{"provider":"email","providers":["email"]}', '{}', false),

  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000003',
   'authenticated', 'authenticated', 'priya.raman@my.viu.ca',
   extensions.crypt('rabbithole', extensions.gen_salt('bf')),
   now() - interval '4 days', now() - interval '4 days', now(),
   '{"provider":"email","providers":["email"]}', '{}', false),

  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000004',
   'authenticated', 'authenticated', 'sam.whitmore@my.viu.ca',
   extensions.crypt('rabbithole', extensions.gen_salt('bf')),
   now() - interval '62 days', now() - interval '62 days', now(),
   '{"provider":"email","providers":["email"]}', '{}', false),

  -- The stand-in signed-in user (mockCurrentUser).
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000005',
   'authenticated', 'authenticated', 'alex.reid@my.viu.ca',
   extensions.crypt('rabbithole', extensions.gen_salt('bf')),
   now() - interval '305 days', now() - interval '305 days', now(),
   '{"provider":"email","providers":["email"]}', '{}', false);

-- GoTrue cannot read a row where these are NULL.
--
-- Every one of them is `varchar NULL` with no default in the auth schema, so an
-- INSERT that omits them stores NULL — but GoTrue scans them into plain Go
-- strings, and a NULL fails that scan. The failure surfaces at SIGN-IN, not at
-- insert time, as HTTP 500 `unexpected_failure` / "Database error querying
-- schema". It looks like a server fault rather than a seed fault, which is what
-- makes it expensive to find.
--
-- The tell, if this ever regresses: a seeded account 500s while an account made
-- through the app's own signup returns a normal 400, because GoTrue writes empty
-- strings rather than NULLs.
update auth.users
set confirmation_token         = coalesce(confirmation_token, ''),
    recovery_token             = coalesce(recovery_token, ''),
    email_change               = coalesce(email_change, ''),
    email_change_token_new     = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    phone_change               = coalesce(phone_change, ''),
    phone_change_token         = coalesce(phone_change_token, ''),
    reauthentication_token     = coalesce(reauthentication_token, '');

-- Password sign-in needs a matching identity row.
insert into auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', u.id::text,
  now(), u.created_at, now()
from auth.users u;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

-- The rows already exist courtesy of handle_new_user(); this replaces the
-- random username with a stable one and fills in what the trigger cannot know.
--
-- Usernames are deliberately NOT the person's name. That is the production
-- rule, and a seed that broke it would teach the wrong shape to every query
-- written against it.
--
-- Ratings are NOT set here. rating_avg is a generated column over rating_sum
-- and rating_count, and the reviews seeded further down fire
-- refresh_profile_rating(), which recomputes both from the reviews table. The
-- historical totals are applied after that, at the end of this file.
update public.profiles set
  username         = 'tidal_heron',
  bio              = 'Fourth-year bio. Mostly selling textbooks I am done with.',
  campus           = 'nanaimo',
  avatar_path      = 'avatars/00000000-0000-4000-8000-000000000001/avatar.jpg',
  last_active_at   = now() - interval '2 hours',
  viu_verified_at  = now() - interval '420 days',
  completed_sales  = 11
where id = '00000000-0000-4000-8000-000000000001';

update public.profiles set
  username         = 'kelp_quay',
  bio              = null,
  campus           = 'nanaimo',
  avatar_path      = 'avatars/00000000-0000-4000-8000-000000000002/avatar.jpg',
  last_active_at   = now() - interval '1 day',
  viu_verified_at  = now() - interval '210 days',
  completed_sales  = 4
where id = '00000000-0000-4000-8000-000000000002';

-- New seller: no reviews at all, no avatar, no bio, and last-active hidden.
-- Four fallbacks in one row. rating_avg stays NULL and must render
-- "New seller", never "0.0 stars".
update public.profiles set
  username         = 'rowan_isle',
  bio              = null,
  campus           = 'cowichan',
  avatar_path      = null,
  last_active_at   = now() - interval '20 minutes',
  show_last_active = false,
  viu_verified_at  = now() - interval '4 days',
  completed_sales  = 0
where id = '00000000-0000-4000-8000-000000000003';

-- Follows are turned off on this profile — the Follow button must render as
-- unavailable rather than failing on tap.
update public.profiles set
  username         = 'misty_alder',
  bio              = 'Leaving the island in April. Everything must go.',
  campus           = 'nanaimo',
  avatar_path      = 'avatars/00000000-0000-4000-8000-000000000004/avatar.jpg',
  last_active_at   = now() - interval '6 days',
  allow_follows    = false,
  viu_verified_at  = now() - interval '60 days',
  completed_sales  = 1
where id = '00000000-0000-4000-8000-000000000004';

update public.profiles set
  username         = 'north_cove',
  bio              = 'Chem major. Fast replies, cash preferred.',
  campus           = 'nanaimo',
  avatar_path      = 'avatars/00000000-0000-4000-8000-000000000005/avatar.jpg',
  last_active_at   = now() - interval '5 minutes',
  viu_verified_at  = now() - interval '300 days',
  completed_sales  = 6
where id = '00000000-0000-4000-8000-000000000005';

-- ---------------------------------------------------------------------------
-- Campuses and meetup spots
-- ---------------------------------------------------------------------------

-- The seven ACTIVE spots are reference data and ship in the migration
-- 20261003090100_reference_data.sql, because a hosted database needs them and
-- never runs this file. Parksville–Qualicum has exactly one spot and no
-- listings at all — the "quiet campus" case the empty state has to handle
-- without reading as an error.
--
-- Only the retired spot belongs here: it is a fixture, not reference data. It
-- exists so one completed order points at a place that no longer appears in
-- any picker, which is the case that proves spots are deactivated rather than
-- deleted.
insert into public.meetup_spots (id, campus, name, description, is_active) values
  ('50000000-0000-4000-8000-000000000008', 'nanaimo', 'Bldg 250 side entrance',
   'Closed for renovation.', false);

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------

-- The eleven categories are reference data and ship in the migration
-- 20261003090100_reference_data.sql — clients can only ever read this table,
-- so a database without them has a Post Listing screen that cannot submit.
--
-- Nothing is inserted here. The fixtures below reference those rows by the
-- same ids the migration assigns. `clothing` deliberately ends up with no
-- listings at all: a browsed category with nothing in it must read as quiet,
-- not broken.

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------

insert into public.tags (id, name) values
  ('60000000-0000-4000-8000-000000000001', 'biol121'),
  ('60000000-0000-4000-8000-000000000002', 'math121'),
  ('60000000-0000-4000-8000-000000000003', 'chem231'),
  ('60000000-0000-4000-8000-000000000004', 'nursing-bsn'),
  ('60000000-0000-4000-8000-000000000005', 'residence');

-- ---------------------------------------------------------------------------
-- Listings
-- ---------------------------------------------------------------------------

-- bumped_at is set to created_at rather than defaulting to now(), or every
-- listing would share one bump time and the feed's sort order would be
-- meaningless on a fresh reset.
insert into public.listings
  (id, seller_id, category_id, default_meetup_spot_id, title, description,
   price_cents, condition, status, pickup_hint, campus,
   is_negotiable, accepts_cash, accepts_etransfer,
   bumped_at, expires_at, created_at, sold_at)
values
  ('20000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000011',
   '50000000-0000-4000-8000-000000000001',
   'Campbell Biology, 12th Edition',
   'Used for BIOL 121/122. Binding is solid, no loose pages. Some highlighting in the first four chapters, nothing after that. Access code is expired — buy it for the text, not the online component.',
   6500, 'good', 'active', 'Nanaimo campus — Bldg 356 (Library) main entrance', 'nanaimo',
   false, true, true,
   now() - interval '3 days', now() + interval '27 days', now() - interval '3 days', null),

  ('20000000-0000-4000-8000-000000000002',
   '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000012',
   '50000000-0000-4000-8000-000000000003',
   'Calculus: Early Transcendentals (Stewart, 9e)',
   'Barely opened — I dropped MATH 121 three weeks in. No writing anywhere. Comes with the solutions manual.',
   8000, 'like_new', 'active', 'Bldg 300 lobby, weekday afternoons', 'nanaimo',
   false, true, false,
   now() - interval '1 day', now() + interval '29 days', now() - interval '1 day', null),

  -- Expires in two days. Exercises the expiry reminder and the "renew" affordance.
  ('20000000-0000-4000-8000-000000000003',
   '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002',
   '50000000-0000-4000-8000-000000000001',
   'TI-84 Plus CE graphing calculator',
   'Works perfectly, batteries included. Small scuff on the back case. Charging cable included.',
   7000, 'good', 'active', 'Nanaimo campus — Bldg 356 (Library) main entrance', 'nanaimo',
   false, true, true,
   now() - interval '6 days', now() + interval '2 days', now() - interval '6 days', null),

  -- Reserved, because an accepted order is holding it. Card shows a badge and
  -- suppresses the primary action. No meetup spot: it is too heavy to carry to
  -- one, which is the pickup-feasibility case.
  ('20000000-0000-4000-8000-000000000004',
   '00000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000003',
   null,
   'Mini fridge, 1.7 cu ft',
   'Lived under my desk in residence for two years. Cools fine, the door seal is a bit tired. Heavy — bring a friend or a car.',
   4500, 'fair', 'reserved', 'VIU Residence — Bldg 400 parking lot', 'nanaimo',
   true, true, false,
   now() - interval '9 days', now() + interval '21 days', now() - interval '9 days', null),

  -- price_cents 0 is a real, valid price. Must render "Free", never "$0.00".
  ('20000000-0000-4000-8000-000000000005',
   '00000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003',
   null,
   'Desk lamp — free to a good home',
   'Works. Bulb included. I just don''t have room for it.',
   0, 'good', 'active', 'Bldg 305, any evening', 'cowichan',
   false, true, false,
   now() - interval '2 days', now() + interval '28 days', now() - interval '2 days', null),

  -- Long title + long description + many images + negotiable. If a card
  -- survives this one it survives most things. ~151 characters, which is why
  -- title allows 200.
  ('20000000-0000-4000-8000-000000000006',
   '00000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000014',
   '50000000-0000-4000-8000-000000000005',
   'Nursing 2nd Year Bundle — Med-Surg, Pharmacology, Health Assessment and Clinical Skills textbooks, all required editions for the 2026/27 VIU BSN program',
   E'Selling the complete second-year set together because splitting it isn''t worth the hassle. Every book is the edition on the current syllabus, so nothing here is about to be replaced.\n\nMed-Surg and Pharmacology are in the best shape — light highlighting, no bent covers. Health Assessment has a coffee ring on the back cover and some dog-eared pages in the cardiac chapters. Clinical Skills has my notes pencilled in the margins throughout; some people find that useful and some hate it, so factor that in.\n\nBought new for just over $700. Firm on the price for the full set, but I''ll listen to reasonable offers if you''re taking all four today. I can meet most weekday afternoons on the Cowichan campus.',
   22000, 'good', 'active', 'Cowichan campus — main lobby', 'cowichan',
   true, true, true,
   now() - interval '5 days', now() + interval '25 days', now() - interval '5 days', null),

  -- Sold, with sold_at set and a completed order behind it. Should not appear
  -- in the feed, and IS the thing that makes two reviews legal further down.
  ('20000000-0000-4000-8000-000000000007',
   '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000013',
   '50000000-0000-4000-8000-000000000003',
   'Organic Chemistry (Klein, 4th Edition)',
   'Standard CHEM 231 text. Good condition, a few sticky tabs left in.',
   5500, 'good', 'sold', 'Bldg 300 lobby', 'nanaimo',
   false, true, false,
   now() - interval '21 days', now() + interval '9 days', now() - interval '21 days',
   now() - interval '14 days'),

  -- No images, no pickup hint, no meetup spot, and on a campus the current
  -- user is not at. Four independent null-or-distant paths in one card.
  ('20000000-0000-4000-8000-000000000008',
   '00000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000015',
   null,
   'PSYC 111 full lecture notes (printed)',
   'Complete set from last semester, hole-punched and organised by week. Got an A- if that means anything.',
   1000, 'good', 'active', null, 'cowichan',
   false, true, false,
   now() - interval '8 days', now() + interval '22 days', now() - interval '8 days', null),

  -- Highest price in the set — stresses the price field's width next to a
  -- long-ish title, and carries an open purchase request.
  ('20000000-0000-4000-8000-000000000009',
   '00000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004',
   '50000000-0000-4000-8000-000000000004',
   'Kona Rove commuter bike, 54cm',
   'Solid campus-to-downtown bike. New chain and cassette this spring. Frame has the usual chips. Rides great, I''m just leaving the island.',
   45000, 'fair', 'active', 'Nanaimo campus — bike racks by Bldg 250', 'nanaimo',
   true, true, true,
   now() - interval '4 days', now() + interval '26 days', now() - interval '4 days', null),

  -- The current user's unfinished listing. Visible only to them.
  ('20000000-0000-4000-8000-000000000010',
   '00000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005',
   null,
   'Chem lab kit', '',
   3000, 'good', 'draft', null, 'nanaimo',
   false, true, false,
   now() - interval '20 hours', now() + interval '30 days', now() - interval '20 hours', null),

  -- The current user's own live listing — makes Alex a SELLER in at least one
  -- conversation, which is what exercises counterparty resolution.
  ('20000000-0000-4000-8000-000000000011',
   '00000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005',
   '50000000-0000-4000-8000-000000000002',
   'Lab coat + safety goggles, size M',
   'Required for CHEM 140. Washed, no burns or stains.',
   2000, 'like_new', 'active', 'Bldg 370, before or after lab', 'nanaimo',
   false, true, true,
   now() - interval '7 days', now() + interval '23 days', now() - interval '7 days', null),

  -- Freshest item in the set — exercises "just now" formatting — and the only
  -- listing on the Powell River campus, which is a ferry away from everyone
  -- else in this seed.
  ('20000000-0000-4000-8000-000000000012',
   '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003',
   '50000000-0000-4000-8000-000000000006',
   'Monitor riser, solid oak',
   'Bought it last month, doesn''t fit my new desk. Basically new.',
   2500, 'like_new', 'active', 'Bldg 356, most mornings', 'powell_river',
   false, true, false,
   now() - interval '18 minutes', now() + interval '30 days', now() - interval '18 minutes', null),

  -- Expired and never renewed. Its owner must still be able to find it; the
  -- feed must not show it.
  ('20000000-0000-4000-8000-000000000013',
   '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002',
   '50000000-0000-4000-8000-000000000003',
   'Logitech wireless mouse',
   'Spare mouse, works fine. Receiver included.',
   1500, 'good', 'expired', null, 'nanaimo',
   false, true, false,
   now() - interval '45 days', now() - interval '15 days', now() - interval '45 days', null);

-- Secondary categories. Capped at three per listing by trigger, and never the
-- primary one.
insert into public.listing_categories (listing_id, category_id) values
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000005'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000006');

insert into public.listing_tags (listing_id, tag_id) values
  ('20000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000005'),
  ('20000000-0000-4000-8000-000000000006', '60000000-0000-4000-8000-000000000004'),
  ('20000000-0000-4000-8000-000000000007', '60000000-0000-4000-8000-000000000003');

-- ---------------------------------------------------------------------------
-- Listing images
-- ---------------------------------------------------------------------------

-- Paths start with the OWNER's uuid so the storage.foldername policy works.
-- Note this differs from src/mocks, which predates the storage design.
--
-- Dimensions vary on purpose: a 4:3 landscape, a tall portrait, and a square.
-- A grid that only looks right on one of those is not finished.
--
-- Listings 8, 10 and 13 deliberately have none.
insert into public.listing_images (listing_id, storage_path, position, width, height)
select
  l.id,
  format('%s/%s/%s.jpg', l.seller_id, l.id, gs.position),
  gs.position,
  (array[1600, 1200, 1500])[1 + (gs.position % 3)],
  (array[1200, 1600, 1500])[1 + (gs.position % 3)]
from public.listings l
join (values
  ('20000000-0000-4000-8000-000000000001'::uuid, 3),
  ('20000000-0000-4000-8000-000000000002'::uuid, 2),
  ('20000000-0000-4000-8000-000000000003'::uuid, 1),
  ('20000000-0000-4000-8000-000000000004'::uuid, 2),
  ('20000000-0000-4000-8000-000000000005'::uuid, 1),
  -- The only listing at the eight-image cap.
  ('20000000-0000-4000-8000-000000000006'::uuid, 8),
  ('20000000-0000-4000-8000-000000000007'::uuid, 1),
  ('20000000-0000-4000-8000-000000000009'::uuid, 3),
  ('20000000-0000-4000-8000-000000000011'::uuid, 2),
  ('20000000-0000-4000-8000-000000000012'::uuid, 1)
) as counts(listing_id, n) on counts.listing_id = l.id
cross join lateral generate_series(0, counts.n - 1) as gs(position);

-- ---------------------------------------------------------------------------
-- Saved listings and follows
-- ---------------------------------------------------------------------------

-- What the Saved tab shows for Alex.
insert into public.saved_listings (user_id, listing_id) values
  ('00000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000003'),
  ('00000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000006');

-- Alex follows two sellers, and wants alerts from only one of them. Nobody
-- follows misty_alder, because that profile has allow_follows = false and the
-- trigger would reject the row — which is itself worth knowing works.
insert into public.follows (follower_id, followed_id, notify) values
  ('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', true),
  ('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000002', false),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', true);

-- One block, between two users who share no conversation and no follow, so it
-- exercises the policy without rewriting anything else in the seed. devon
-- cannot be messaged or followed by priya, and priya cannot tell.
insert into public.blocks (blocker_id, blocked_id) values
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003');

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

-- Inserted directly rather than through request_order() and friends, because
-- those functions read auth.uid() and the seed has no session. The rows below
-- are exactly what that sequence of calls would have produced — if a
-- constraint here rejects one, the function would have produced an illegal
-- order too, which is the useful part.
insert into public.orders
  (id, listing_id, buyer_id, seller_id, meetup_spot_id, amount_cents, payment_method,
   status, meetup_at, meetup_confirmed_at, buyer_confirmed_at, seller_confirmed_at,
   created_at, accepted_at, completed_at, cancelled_at)
values
  -- Completed. The only thing in this seed that makes a review legal.
  ('70000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000007',
   '00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000002',
   -- A spot that has since been retired. An order outlives the place it
   -- happened at, which is why meetup_spots rows are deactivated, not deleted.
   '50000000-0000-4000-8000-000000000008', 5500, 'cash',
   'completed',
   now() - interval '14 days', now() - interval '15 days',
   now() - interval '14 days', now() - interval '14 days',
   now() - interval '18 days', now() - interval '16 days',
   now() - interval '14 days', null),

  -- Accepted and holding listing 4 at `reserved`. Meetup proposed, not yet
  -- confirmed by the buyer — the state the Orders screen has to render most
  -- carefully, because it is waiting on the person looking at it.
  ('70000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000004',
   '00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000004',
   '50000000-0000-4000-8000-000000000004', 4500, 'cash',
   'accepted',
   now() + interval '2 days', null, null, null,
   now() - interval '2 days', now() - interval '1 day', null, null),

  -- Open request on the most expensive item, paying by e-Transfer. The seller
  -- has not answered yet.
  ('70000000-0000-4000-8000-000000000003',
   '20000000-0000-4000-8000-000000000009',
   '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004',
   null, 45000, 'etransfer',
   'requested',
   null, null, null, null,
   now() - interval '6 hours', null, null, null),

  -- Declined, so the buyer's Orders screen has a dead row in it. Nothing in
  -- the UI should treat this as an error state.
  ('70000000-0000-4000-8000-000000000004',
   '20000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001',
   null, 6500, 'cash',
   'declined',
   null, null, null, null,
   now() - interval '10 days', null, null, now() - interval '9 days');

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------

-- Both sides of the one completed order. The buyer writes a full review; the
-- seller leaves stars only, which is legal and must render without an empty
-- quotation block.
--
-- These fire refresh_profile_rating(), which recomputes rating_sum and
-- rating_count from this table — so the historical totals below must come
-- after them, not before.
insert into public.reviews (order_id, reviewer_id, reviewee_id, rating, body, created_at) values
  ('70000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000002',
   5, 'Met right on time, book was exactly as described.', now() - interval '13 days'),
  ('70000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000005',
   5, null, now() - interval '13 days');

-- ---------------------------------------------------------------------------
-- Historical trust totals
-- ---------------------------------------------------------------------------

-- src/mocks has no review fixtures beyond the pair above, but the UI needs
-- sellers with a history to render against. These totals stand in for reviews
-- that predate the seed, and they include the two rows inserted above.
--
-- The numbers are chosen so rating_avg — a generated column, round(sum/count,1)
-- — lands exactly on the value the mocks declare. 4.5 from three reviews is
-- arithmetically impossible, which is why devon has four.
--
-- This UPDATE must stay AFTER the review inserts. Run it before them and
-- refresh_profile_rating() overwrites every number here.
update public.profiles set rating_sum = 58, rating_count = 12  -- 4.8
  where id = '00000000-0000-4000-8000-000000000001';
update public.profiles set rating_sum = 18, rating_count = 4   -- 4.5
  where id = '00000000-0000-4000-8000-000000000002';
-- rowan_isle keeps 0 / 0, so rating_avg stays NULL: "New seller".
update public.profiles set rating_sum = 5,  rating_count = 1   -- 5.0 from one review
  where id = '00000000-0000-4000-8000-000000000004';
update public.profiles set rating_sum = 34, rating_count = 7   -- 4.9
  where id = '00000000-0000-4000-8000-000000000005';

-- ---------------------------------------------------------------------------
-- Conversations and messages
-- ---------------------------------------------------------------------------

insert into public.conversations (id, listing_id, buyer_id, seller_id, created_at, last_message_at) values
  -- Alex buying from Maya. Ends on an unread message from Maya.
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001',
   now() - interval '2 days', now() - interval '3 hours'),

  -- Alex buying from Devon. Fully read; last message is Alex's own.
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002',
   '00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000002',
   now() - interval '20 hours', now() - interval '18 hours'),

  -- Created but never written to — last_message is null in the inbox row.
  ('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000004',
   '00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000004',
   now() - interval '5 hours', now() - interval '5 hours'),

  -- Alex is the SELLER here. Exercises counterparty resolution.
  ('40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000011',
   '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000005',
   now() - interval '1 day', now() - interval '2 hours');

-- read_at is set explicitly rather than left to mark_conversation_read(), so
-- the unread badge has something to count on a fresh reset.
--
-- Inserting these also fires refresh_response_metrics(), so the seeded sellers
-- end up with real response_rate and median_response_minutes rather than
-- hand-written ones. Three outcomes, on purpose:
--
--   tidal_heron / kelp_quay — asked and answered: 1.000, with a real median.
--   north_cove              — asked twice in one thread and never answered:
--                             0.000 with a NULL median. The profile has to
--                             render a rate with no time beside it.
--   misty_alder             — a thread with no buyer message in it, so nothing
--                             is answerable and both stay NULL. "No data" and
--                             "never replies" are different facts.
insert into public.messages (conversation_id, sender_id, body, created_at, read_at) values
  ('40000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000005',
   'Hi! Is the Campbell still available?', now() - interval '2 days', now() - interval '2 days'),
  ('40000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
   'It is. I''m on campus most afternoons this week.', now() - interval '47 hours', now() - interval '46 hours'),
  ('40000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000005',
   'Thursday around 2 work? I can meet at the library.', now() - interval '5 hours', now() - interval '4 hours'),
  ('40000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
   'Thursday at 2 is perfect. See you by the main entrance.', now() - interval '3 hours', null),

  ('40000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000005',
   'Does the solutions manual come with it?', now() - interval '20 hours', now() - interval '19 hours'),
  ('40000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002',
   'Yep, both together for the listed price.', now() - interval '18 hours', now() - interval '18 hours'),

  ('40000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000003',
   'Is the lab coat still available? I need one for CHEM 140.', now() - interval '1 day', now() - interval '23 hours'),
  ('40000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000003',
   'Also — are the goggles the anti-fog kind?', now() - interval '4 hours', null),
  ('40000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000003',
   'No rush, just planning my week.', now() - interval '2 hours', null);

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------

-- One open report in the queue, so an Edge Function or a dashboard query has
-- something to return. It lives in `private`, so no client — not even the
-- reporter — can read this row back.
insert into private.reports (reporter_id, reported_listing_id, reason, details) values
  ('00000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000008',
   'academic_dishonesty',
   'Full lecture notes for a course that is currently running. Worth a look against the academic integrity policy.');
