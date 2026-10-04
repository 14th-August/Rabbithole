-- Administered reference data: the category tree and the meetup spots.
--
-- Owns: the rows the app cannot function without in ANY environment.
-- Does not own: fixtures. People, listings, conversations and orders are
--   development data and live in supabase/seed.sql, which never runs against
--   a hosted project.
--
-- Why a migration and not the seed. Both tables are read-only to clients —
-- the RLS migration gives them a SELECT policy and nothing else — so no user
-- action can ever create a category or a meetup spot. That makes them part of
-- the schema's meaning rather than sample data: a database without them has a
-- Post Listing screen with an empty category picker, which is a broken app,
-- not an empty one.
--
-- The practical trigger for moving them: `db reset --linked` must be run with
-- --no-seed, because seed.sql creates accounts with a known password. With
-- the categories still in the seed, a correctly-seeded hosted project and a
-- correctly-reset one were mutually exclusive.
--
-- Every insert is idempotent on the primary key, so re-running this migration
-- against a database that already has the rows is a no-op rather than a
-- duplicate-key failure.

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------

-- Positions in gaps of 10, so a category can be slotted between two others
-- without renumbering the row beside it.
insert into public.categories (id, parent_category_id, slug, name, position) values
  ('10000000-0000-4000-8000-000000000001', null, 'textbooks',   'Textbooks',       10),
  ('10000000-0000-4000-8000-000000000002', null, 'electronics', 'Electronics',     20),
  ('10000000-0000-4000-8000-000000000003', null, 'furniture',   'Furniture',       30),
  ('10000000-0000-4000-8000-000000000004', null, 'transport',   'Transport',       40),
  ('10000000-0000-4000-8000-000000000005', null, 'supplies',    'Course Supplies', 50),
  ('10000000-0000-4000-8000-000000000006', null, 'clothing',    'Clothing',        60)
on conflict (id) do nothing;

-- Textbook subjects. Only Textbooks needs subdivision, which is why the tree
-- is two levels and not a uniform depth. Inserted second because
-- enforce_category_depth() reads the parent row.
insert into public.categories (id, parent_category_id, slug, name, position) values
  ('10000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', 'biology',     'Biology',     10),
  ('10000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', 'mathematics', 'Mathematics', 20),
  ('10000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001', 'chemistry',   'Chemistry',   30),
  ('10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000001', 'nursing',     'Nursing',     40),
  ('10000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000001', 'psychology',  'Psychology',  50)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Meetup spots
-- ---------------------------------------------------------------------------

-- Safe, public, findable places, one list per campus. Curated rather than free
-- text because the entire safety value is in the place being somewhere other
-- people are — "my place" typed into a text box is the outcome this table
-- exists to prevent.
--
-- UNVERIFIED against VIU's real buildings, like the campus enum itself. These
-- are plausible placeholders; confirm them before anyone meets a stranger
-- somewhere this app named.
insert into public.meetup_spots (id, campus, name, description, is_active) values
  ('50000000-0000-4000-8000-000000000001', 'nanaimo', 'Library (Bldg 305) main entrance',
   'Busy all day during term. Covered, and there are benches.', true),
  ('50000000-0000-4000-8000-000000000002', 'nanaimo', 'Students'' Union Building lobby',
   'Staffed desk nearby. Open 8am to 8pm weekdays.', true),
  ('50000000-0000-4000-8000-000000000003', 'nanaimo', 'Bldg 300 lobby',
   null, true),
  ('50000000-0000-4000-8000-000000000004', 'nanaimo', 'Upper campus bus loop',
   'Good for anything you cannot carry far.', true),
  ('50000000-0000-4000-8000-000000000005', 'cowichan', 'Cowichan campus main lobby',
   null, true),
  ('50000000-0000-4000-8000-000000000006', 'powell_river', 'Powell River campus front desk',
   null, true),
  ('50000000-0000-4000-8000-000000000007', 'parksville_qualicum', 'Parksville–Qualicum centre lobby',
   null, true)
on conflict (id) do nothing;
