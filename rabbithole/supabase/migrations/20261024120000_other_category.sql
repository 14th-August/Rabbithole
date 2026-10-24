-- A seventh top-level category: Other.
--
-- Owns: one row of reference data.
-- Does not own: anything about how the Create screen renders it.
--
-- Why a migration and not a client-side option. `listings.category_id` is NOT
-- NULL and references `categories`, so an "Other" that exists only in the
-- picker has no id to insert — the row would be refused by the foreign key.
-- And `categories` is read-only to clients (a SELECT policy and no write
-- policies), so nothing in the app can create it either. Reference data the
-- app cannot function without belongs here, which is the same reasoning
-- 20261003090100_reference_data.sql gives for the other six.
--
-- Position 70, after Clothing at 60 and in the same gaps of 10, so Other sorts
-- last in both the Create picker and the Discover bar. That is deliberate: a
-- catch-all offered first is a catch-all everything lands in.
--
-- No children. The two-level tree exists for Textbooks, and subdividing a
-- category that means "none of the above" would be a contradiction.

insert into public.categories (id, parent_category_id, slug, name, position) values
  ('10000000-0000-4000-8000-000000000007', null, 'other', 'Other', 70)
on conflict (id) do nothing;
