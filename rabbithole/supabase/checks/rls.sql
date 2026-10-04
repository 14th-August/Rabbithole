-- Negative authorization checks: proof that the policies DENY.
--
-- Owns: evidence that RLS, column grants and the order state machine refuse
--   what they are supposed to refuse.
-- Does not own: that the happy path works. Any screen demonstrates that. A
--   policy that never denies has not been tested, and that is the whole point
--   of this file — workflow.md's definition of done and roadmap.md's
--   verification step 3 both ask for exactly these.
--
-- Not in supabase/tests/ on purpose: `supabase test db` runs that directory
-- through pg_prove and expects pgTAP, and this is a plain psql script. Moving
-- it there without converting it would make that command fail.
--
-- HOW TO RUN, from the app directory, against a freshly seeded local database:
--
--   npx supabase db reset
--   docker cp supabase/checks/rls.sql supabase_db_rabbithole:/tmp/rls.sql
--   docker exec supabase_db_rabbithole psql -U postgres -d postgres -f /tmp/rls.sql
--
-- HOW TO READ IT: every section states its expected result in the heading.
-- Sections that expect an ERROR print theirs at the end of the run, because
-- psql reports errors on stderr — count them: there should be exactly TEN,
-- from sections 3, 6, 7, 10, 11, 12, 14, 16, 19 and 20.
--
-- Fewer than ten is a policy that stopped denying, which is the failure this
-- file exists to catch. More than ten is a policy denying something it should
-- allow — check sections 13, 15, 17, 18 and 21, which expect success.
--
-- Every section runs in its own transaction and rolls back, so the script is
-- idempotent and leaves the seed untouched.
--
-- Users, from the seed:
--   maya  …0001 tidal_heron   devon …0002 kelp_quay   priya …0003 rowan_isle
--   sam   …0004 misty_alder   alex  …0005 north_cove
-- devon has blocked priya. alex owns the only draft.

\set ON_ERROR_STOP off

\set as_maya  'select set_config(''request.jwt.claims'', ''{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}'', true)'
\set as_priya 'select set_config(''request.jwt.claims'', ''{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}'', true)'
\set as_alex  'select set_config(''request.jwt.claims'', ''{"sub":"00000000-0000-4000-8000-000000000005","role":"authenticated"}'', true)'

-- ---------------------------------------------------------------------------
-- Listings: drafts are owner-only
-- ---------------------------------------------------------------------------

\echo ''
\echo '1. maya CANNOT see alex''s draft              expect drafts=0 total=12'
begin;
set local role authenticated;
:as_maya;
select count(*) filter (where status = 'draft') as drafts, count(*) as total from public.listings;
rollback;

\echo '2. alex CAN see his own draft                 expect drafts=1 total=13'
begin;
set local role authenticated;
:as_alex;
select count(*) filter (where status = 'draft') as drafts, count(*) as total from public.listings;
rollback;

-- ---------------------------------------------------------------------------
-- Messaging and privacy
-- ---------------------------------------------------------------------------

\echo '3. priya CANNOT write into a thread she is not in          expect ERROR'
begin;
set local role authenticated;
:as_priya;
insert into public.messages (conversation_id, sender_id, body)
values ('40000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'let me in');
rollback;

\echo '4. priya CANNOT see anyone else''s saves                     expect 0'
begin;
set local role authenticated;
:as_priya;
select count(*) as visible_saves from public.saved_listings;
rollback;

-- The blocked party must not be able to detect the block. Someone who can
-- tell will make a second account; someone who cannot just sees an
-- unresponsive person. This is why is_blocked_between() is SECURITY DEFINER.
\echo '5. priya CANNOT see the block devon placed on her           expect 0'
begin;
set local role authenticated;
:as_priya;
select count(*) as visible_blocks from public.blocks;
rollback;

-- ---------------------------------------------------------------------------
-- profiles: column grants, not row policies
-- ---------------------------------------------------------------------------

-- RLS is row-level and says nothing about columns. These two prove the column
-- grants in the RLS migration are doing the work instead.
\echo '6. select * on profiles is denied                          expect ERROR'
begin;
set local role authenticated;
:as_alex;
select * from public.profiles limit 1;
rollback;

\echo '7. alex CANNOT raise his own rating                        expect ERROR'
begin;
set local role authenticated;
:as_alex;
update public.profiles set rating_sum = 999 where id = '00000000-0000-4000-8000-000000000005';
rollback;

\echo '8. my_profile returns only the caller         expect 1 row, north_cove'
begin;
set local role authenticated;
:as_alex;
select count(*) as rows, min(username) as who from public.my_profile;
rollback;

\echo '9. public_profiles honours show_last_active   expect rowan_isle hidden=t, rest f'
begin;
set local role authenticated;
:as_alex;
select username, (last_active_at is null) as hidden from public.public_profiles order by username;
rollback;

-- ---------------------------------------------------------------------------
-- Orders: writable only through the state machine
-- ---------------------------------------------------------------------------

\echo '10. nobody can INSERT an order directly                    expect ERROR'
begin;
set local role authenticated;
:as_priya;
insert into public.orders (listing_id, buyer_id, seller_id, amount_cents, payment_method)
values ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003',
        '00000000-0000-4000-8000-000000000001', 1, 'cash');
rollback;

-- The error message must be identical to the sold/reserved one, or a buyer can
-- probe whether a particular seller blocked them.
\echo '11. priya CANNOT request from devon, who blocked her       expect ERROR'
begin;
set local role authenticated;
:as_priya;
select public.request_order('20000000-0000-4000-8000-000000000002', 'cash');
rollback;

\echo '12. e-Transfer on a cash-only listing is refused           expect ERROR'
begin;
set local role authenticated;
:as_alex;
select public.request_order('20000000-0000-4000-8000-000000000005', 'etransfer');
rollback;

\echo '13. ...but cash on that same listing works                  expect ok=t'
begin;
set local role authenticated;
:as_alex;
select public.request_order('20000000-0000-4000-8000-000000000005', 'cash') is not null as ok;
rollback;

\echo '14. priya CANNOT read reports, not even her own            expect ERROR'
begin;
set local role authenticated;
:as_priya;
select count(*) from private.reports;
rollback;

-- ---------------------------------------------------------------------------
-- The full order flow
-- ---------------------------------------------------------------------------

-- Listing 1 already carries a declined request from priya, so accepting hers
-- also proves the auto-decline does not touch orders that are already closed.
\echo ''
\echo '15. FULL FLOW: request -> accept -> both confirm -> sold'
begin;
set local role authenticated;

:as_priya;
select public.request_order('20000000-0000-4000-8000-000000000001', 'cash') as oid \gset
\echo '    a. requested                                       expect active'
select status from public.listings where id = '20000000-0000-4000-8000-000000000001';

:as_maya;
select public.accept_order(:'oid', '50000000-0000-4000-8000-000000000001', now() + interval '1 day');
\echo '    b. accepted                   expect reserved, 1 accepted + 1 declined'
select status from public.listings where id = '20000000-0000-4000-8000-000000000001';
select status, count(*) from public.orders
 where listing_id = '20000000-0000-4000-8000-000000000001' group by status order by status;

:as_priya;
select public.confirm_handoff(:'oid');
\echo '    c. ONE side only                        expect accepted, NOT completed'
select status from public.orders where id = :'oid';

:as_maya;
select public.confirm_handoff(:'oid');
\echo '    d. both sides      expect completed, sold+sold_at, completed_sales 11->12'
select status, (completed_at is not null) as has_completed_at from public.orders where id = :'oid';
select status, (sold_at is not null) as has_sold_at from public.listings
 where id = '20000000-0000-4000-8000-000000000001';
select username, completed_sales from public.profiles
 where id = '00000000-0000-4000-8000-000000000001';
rollback;

\echo ''
\echo '16. a review needs a COMPLETED order                       expect ERROR'
begin;
set local role authenticated;
:as_priya;
insert into public.reviews (order_id, reviewer_id, reviewee_id, rating)
values ('70000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003',
        '00000000-0000-4000-8000-000000000004', 5);
rollback;

-- ---------------------------------------------------------------------------
-- The read paths the app actually uses
-- ---------------------------------------------------------------------------

\echo ''
\echo '17. the feed view        expect rows=13 saved=3 photoless=3 no_spot=4'
begin;
set local role authenticated;
:as_alex;
select count(*) as rows,
       count(*) filter (where is_saved)            as saved,
       count(*) filter (where primary_image is null) as photoless,
       count(*) filter (where meetup_spot is null)   as no_spot
  from public.listing_summaries;
rollback;

\echo '18. weighted full-text search              expect the Stewart calculus'
begin;
set local role authenticated;
:as_alex;
select title from public.listings
 where search_vector @@ websearch_to_tsquery('english', 'calculus manual');
rollback;

-- ---------------------------------------------------------------------------
-- The block oracle
-- ---------------------------------------------------------------------------

-- Regression guards for a real bug: Postgres grants EXECUTE on new functions
-- to PUBLIC, and PostgREST publishes any non-trigger function as an RPC. That
-- turned the SECURITY DEFINER helper `is_blocked_between` into an endpoint any
-- signed-in user could ask "did X block Y", defeating the blocks SELECT policy
-- outright. See 20261004090000_function_grants.sql.

\echo ''
\echo '19. the block helper is NOT callable as an RPC                expect ERROR'
begin;
set local role authenticated;
:as_priya;
select public.is_blocked_between(
  '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002');
rollback;

\echo '20. a blocked buyer cannot open a thread                      expect ERROR'
begin;
set local role authenticated;
:as_priya;
insert into public.conversations (listing_id, buyer_id, seller_id)
values ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003',
        '00000000-0000-4000-8000-000000000002');
rollback;

\echo '21. ...but an unblocked buyer can                              expect 1 row'
begin;
set local role authenticated;
:as_priya;
insert into public.conversations (listing_id, buyer_id, seller_id)
values ('20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003',
        '00000000-0000-4000-8000-000000000001')
returning (id is not null) as created;
rollback;

\echo ''
\echo 'Done. Expect exactly TEN errors above: 3, 6, 7, 10, 11, 12, 14, 16, 19, 20.'
