-- Local development seed, transcribed from src/mocks.
--
-- Owns: a dataset that exercises the awkward cases the UI already handles.
-- Does not own: production data. This runs on `supabase db reset` only.
--
-- src/mocks/README.md: "Fixtures exist to be awkward. Tidy data hides the
-- layout work." The same applies here — this seed deliberately carries a free
-- item, a photoless listing, a null pickup hint, a three-line title, a draft, a
-- reserved item, a sold item, a seller with no reviews and no avatar, and an
-- empty conversation thread. If a query breaks on one of these, the query is
-- wrong, not the seed.
--
-- Every account's password is 'rabbithole' — local only, never a real project.

-- ---------------------------------------------------------------------------
-- Auth users
-- ---------------------------------------------------------------------------

-- Inserting into auth.users fires handle_new_user(), which creates the matching
-- public.profiles row. Emails must be @my.viu.ca or the trigger raises — which
-- is itself a useful check that layer 3 of the gate is live.
--
-- Emails follow VIU's real format: PreferredName.LastName@my.viu.ca.
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
   '{"provider":"email","providers":["email"]}', '{"display_name":"Maya Chen"}', false),

  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000002',
   'authenticated', 'authenticated', 'devon.okafor@my.viu.ca',
   extensions.crypt('rabbithole', extensions.gen_salt('bf')),
   now() - interval '215 days', now() - interval '215 days', now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Devon Okafor"}', false),

  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000003',
   'authenticated', 'authenticated', 'priya.raman@my.viu.ca',
   extensions.crypt('rabbithole', extensions.gen_salt('bf')),
   now() - interval '4 days', now() - interval '4 days', now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Priya Raman"}', false),

  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000004',
   'authenticated', 'authenticated', 'sam.whitmore@my.viu.ca',
   extensions.crypt('rabbithole', extensions.gen_salt('bf')),
   now() - interval '62 days', now() - interval '62 days', now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Sam Whitmore"}', false),

  -- The stand-in signed-in user (mockCurrentUser).
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000005',
   'authenticated', 'authenticated', 'alex.reid@my.viu.ca',
   extensions.crypt('rabbithole', extensions.gen_salt('bf')),
   now() - interval '305 days', now() - interval '305 days', now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Alex Reid"}', false);

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

-- The rows already exist courtesy of handle_new_user(); this fills in the trust
-- signals the trigger cannot know.
--
-- rating_avg / rating_count are set directly rather than derived from seeded
-- reviews, because src/mocks has no review fixtures. Seeding reviews here would
-- fire refresh_profile_rating() and overwrite these values.
update public.profiles set
  avatar_path     = 'avatars/00000000-0000-4000-8000-000000000001/avatar.jpg',
  viu_verified_at = now() - interval '420 days',
  rating_avg      = 4.8,
  rating_count    = 12
where id = '00000000-0000-4000-8000-000000000001';

update public.profiles set
  avatar_path     = 'avatars/00000000-0000-4000-8000-000000000002/avatar.jpg',
  viu_verified_at = now() - interval '210 days',
  rating_avg      = 4.5,
  rating_count    = 3
where id = '00000000-0000-4000-8000-000000000002';

-- New seller: no reviews at all, and no avatar. Two fallbacks in one row.
-- rating_avg NULL must render "New seller", never "0.0 stars".
update public.profiles set
  avatar_path     = null,
  viu_verified_at = now() - interval '4 days',
  rating_avg      = null,
  rating_count    = 0
where id = '00000000-0000-4000-8000-000000000003';

-- A perfect score from a single review — technically true, materially
-- misleading. The card must surface the count alongside it.
update public.profiles set
  avatar_path     = 'avatars/00000000-0000-4000-8000-000000000004/avatar.jpg',
  viu_verified_at = now() - interval '60 days',
  rating_avg      = 5.0,
  rating_count    = 1
where id = '00000000-0000-4000-8000-000000000004';

update public.profiles set
  avatar_path     = 'avatars/00000000-0000-4000-8000-000000000005/avatar.jpg',
  viu_verified_at = now() - interval '300 days',
  rating_avg      = 4.9,
  rating_count    = 7
where id = '00000000-0000-4000-8000-000000000005';

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------

insert into public.categories (id, parent_id, slug, name, position) values
  ('10000000-0000-4000-8000-000000000001', null, 'textbooks',   'Textbooks',       0),
  ('10000000-0000-4000-8000-000000000002', null, 'electronics', 'Electronics',     1),
  ('10000000-0000-4000-8000-000000000003', null, 'furniture',   'Furniture',       2),
  ('10000000-0000-4000-8000-000000000004', null, 'transport',   'Transport',       3),
  ('10000000-0000-4000-8000-000000000005', null, 'supplies',    'Course Supplies', 4);

-- Textbook subjects. Only Textbooks needs subdivision, which is why the tree is
-- two levels and not a uniform depth.
insert into public.categories (id, parent_id, slug, name, position) values
  ('10000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', 'biology',     'Biology',     0),
  ('10000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', 'mathematics', 'Mathematics', 1),
  ('10000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001', 'chemistry',   'Chemistry',   2),
  ('10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000001', 'nursing',     'Nursing',     3),
  ('10000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000001', 'psychology',  'Psychology',  4);

-- ---------------------------------------------------------------------------
-- Listings
-- ---------------------------------------------------------------------------

insert into public.listings
  (id, seller_id, category_id, title, description, price_cents, condition, status, pickup_hint, created_at, sold_at)
values
  ('20000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000011',
   'Campbell Biology, 12th Edition',
   'Used for BIOL 121/122. Binding is solid, no loose pages. Some highlighting in the first four chapters, nothing after that. Access code is expired — buy it for the text, not the online component.',
   6500, 'good', 'active', 'Nanaimo campus — Bldg 356 (Library) main entrance',
   now() - interval '3 days', null),

  ('20000000-0000-4000-8000-000000000002',
   '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000012',
   'Calculus: Early Transcendentals (Stewart, 9e)',
   'Barely opened — I dropped MATH 121 three weeks in. No writing anywhere. Comes with the solutions manual.',
   8000, 'like_new', 'active', 'Bldg 300 lobby, weekday afternoons',
   now() - interval '1 day', null),

  ('20000000-0000-4000-8000-000000000003',
   '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002',
   'TI-84 Plus CE graphing calculator',
   'Works perfectly, batteries included. Small scuff on the back case. Charging cable included.',
   7000, 'good', 'active', 'Nanaimo campus — Bldg 356 (Library) main entrance',
   now() - interval '6 days', null),

  -- Reserved: the seller is holding it. Card shows a badge and suppresses the
  -- primary action.
  ('20000000-0000-4000-8000-000000000004',
   '00000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000003',
   'Mini fridge, 1.7 cu ft',
   'Lived under my desk in residence for two years. Cools fine, the door seal is a bit tired. Heavy — bring a friend or a car.',
   4500, 'fair', 'reserved', 'VIU Residence — Bldg 400 parking lot',
   now() - interval '9 days', null),

  -- price_cents 0 is a real, valid price. Must render "Free", never "$0.00".
  ('20000000-0000-4000-8000-000000000005',
   '00000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003',
   'Desk lamp — free to a good home',
   'Works. Bulb included. I just don''t have room for it.',
   0, 'good', 'active', 'Bldg 305, any evening',
   now() - interval '2 days', null),

  -- Long title + long description + many images. If a card survives this one it
  -- survives most things. ~151 characters, which is why title allows 200.
  ('20000000-0000-4000-8000-000000000006',
   '00000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000014',
   'Nursing 2nd Year Bundle — Med-Surg, Pharmacology, Health Assessment and Clinical Skills textbooks, all required editions for the 2026/27 VIU BSN program',
   E'Selling the complete second-year set together because splitting it isn''t worth the hassle. Every book is the edition on the current syllabus, so nothing here is about to be replaced.\n\nMed-Surg and Pharmacology are in the best shape — light highlighting, no bent covers. Health Assessment has a coffee ring on the back cover and some dog-eared pages in the cardiac chapters. Clinical Skills has my notes pencilled in the margins throughout; some people find that useful and some hate it, so factor that in.\n\nBought new for just over $700. Firm on the price for the full set, but I''ll listen to reasonable offers if you''re taking all four today. I can meet most weekday afternoons on the Nanaimo campus.',
   22000, 'good', 'active', 'Nanaimo campus — Bldg 320 courtyard',
   now() - interval '5 days', null),

  -- Sold, with sold_at set. Should not appear in the feed.
  ('20000000-0000-4000-8000-000000000007',
   '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000013',
   'Organic Chemistry (Klein, 4th Edition)',
   'Standard CHEM 231 text. Good condition, a few sticky tabs left in.',
   5500, 'good', 'sold', 'Bldg 300 lobby',
   now() - interval '21 days', now() - interval '14 days'),

  -- No images AND no pickup hint. Two independent null paths in one card.
  ('20000000-0000-4000-8000-000000000008',
   '00000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000015',
   'PSYC 111 full lecture notes (printed)',
   'Complete set from last semester, hole-punched and organised by week. Got an A- if that means anything.',
   1000, 'good', 'active', null,
   now() - interval '8 days', null),

  -- High price — stresses the price field's width next to a long-ish title.
  ('20000000-0000-4000-8000-000000000009',
   '00000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004',
   'Kona Rove commuter bike, 54cm',
   'Solid campus-to-downtown bike. New chain and cassette this spring. Frame has the usual chips. Rides great, I''m just leaving the island.',
   45000, 'fair', 'active', 'Nanaimo campus — bike racks by Bldg 250',
   now() - interval '4 days', null),

  -- The current user's unfinished listing. Visible only to them.
  ('20000000-0000-4000-8000-000000000010',
   '00000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005',
   'Chem lab kit', '',
   3000, 'good', 'draft', null,
   now() - interval '20 hours', null),

  -- The current user's own live listing — makes Alex a SELLER in at least one
  -- conversation, which is what exercises counterparty resolution.
  ('20000000-0000-4000-8000-000000000011',
   '00000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005',
   'Lab coat + safety goggles, size M',
   'Required for CHEM 140. Washed, no burns or stains.',
   2000, 'like_new', 'active', 'Bldg 370, before or after lab',
   now() - interval '7 days', null),

  -- Freshest item in the set — exercises "just now" formatting.
  ('20000000-0000-4000-8000-000000000012',
   '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003',
   'Monitor riser, solid oak',
   'Bought it last month, doesn''t fit my new desk. Basically new.',
   2500, 'like_new', 'active', 'Bldg 356, most mornings',
   now() - interval '18 minutes', null);

-- ---------------------------------------------------------------------------
-- Listing images
-- ---------------------------------------------------------------------------

-- Paths start with the OWNER's uuid so the storage.foldername policy works.
-- Note this differs from src/mocks, which predates the storage design.
--
-- Listings 8 and 10 deliberately have none.
insert into public.listing_images (listing_id, storage_path, position)
select
  l.id,
  format('%s/%s/%s.jpg', l.seller_id, l.id, gs.position),
  gs.position
from public.listings l
join (values
  ('20000000-0000-4000-8000-000000000001'::uuid, 3),
  ('20000000-0000-4000-8000-000000000002'::uuid, 2),
  ('20000000-0000-4000-8000-000000000003'::uuid, 1),
  ('20000000-0000-4000-8000-000000000004'::uuid, 2),
  ('20000000-0000-4000-8000-000000000005'::uuid, 1),
  ('20000000-0000-4000-8000-000000000006'::uuid, 4),
  ('20000000-0000-4000-8000-000000000007'::uuid, 1),
  ('20000000-0000-4000-8000-000000000009'::uuid, 3),
  ('20000000-0000-4000-8000-000000000011'::uuid, 2),
  ('20000000-0000-4000-8000-000000000012'::uuid, 1)
) as counts(listing_id, n) on counts.listing_id = l.id
cross join lateral generate_series(0, counts.n - 1) as gs(position);

-- ---------------------------------------------------------------------------
-- Saved listings
-- ---------------------------------------------------------------------------

-- What the Saved tab shows for Alex.
insert into public.saved_listings (user_id, listing_id) values
  ('00000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000003'),
  ('00000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000006');

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
