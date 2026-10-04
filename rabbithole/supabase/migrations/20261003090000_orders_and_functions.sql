-- The order state machine, and the other writes clients are not allowed to
-- make directly.
--
-- Owns: every transition of public.orders, the listing status changes that
--   follow from them, listing renewal and expiry, report filing, device
--   registration, and account deletion.
-- Does not own: who may read an order (RLS) or whether a row is well formed
--   (triggers). This migration owns what happens, in what order, atomically.
--
-- Why functions and not policies: accepting an order changes four things at
-- once — the order, every losing request on the same listing, the listing's
-- status, and eventually the seller's completed_sales. A client doing that in
-- four PATCHes can be interrupted between any two of them, and the failure
-- mode is an item sold twice. Each function below is one transaction.
--
-- Every one is `security definer set search_path = ''` and starts by
-- establishing who the caller is and whether they are allowed. SECURITY
-- DEFINER bypasses RLS, so those checks are not decoration — they are the
-- entire access control for these paths.
--
-- The state machine, as drawn in the requirements doc:
--
--   requested --accept--> accepted --both confirm--> completed
--       |                     |
--       |                     +--cancel--> cancelled
--       |                     +--sweep---> expired
--       +--decline--> declined
--       +--cancel---> cancelled

-- ---------------------------------------------------------------------------
-- request_order — the buyer asks
-- ---------------------------------------------------------------------------

-- Idempotent on purpose: tapping "Request to buy" twice returns the same order
-- rather than raising a unique violation the client would have to decode.
create or replace function public.request_order(
  p_listing_id     uuid,
  p_payment_method public.payment_method
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller   uuid := (select auth.uid());
  lst      public.listings%rowtype;
  existing uuid;
  new_id   uuid;
begin
  if caller is null then
    raise exception 'Sign in to request an item'
      using errcode = 'insufficient_privilege';
  end if;

  -- FOR UPDATE: two buyers requesting the same item at the same moment
  -- serialise here rather than racing the seller's accept.
  select * into lst from public.listings l where l.id = p_listing_id for update;

  if lst.id is null then
    raise exception 'No such listing' using errcode = 'no_data_found';
  end if;

  if lst.seller_id = caller then
    raise exception 'You cannot request your own listing'
      using errcode = 'check_violation';
  end if;

  if not public.is_account_active(caller) then
    raise exception 'Your account cannot make purchase requests'
      using errcode = 'insufficient_privilege';
  end if;

  -- Deliberately the same message for "sold", "reserved" and "blocked". A
  -- buyer must not be able to probe whether a particular seller blocked them.
  if lst.status <> 'active' or public.is_blocked_between(caller, lst.seller_id) then
    raise exception 'This listing is no longer available'
      using errcode = 'check_violation';
  end if;

  select o.id into existing
    from public.orders o
   where o.listing_id = p_listing_id
     and o.buyer_id = caller
     and o.status = 'requested';

  if existing is not null then
    return existing;
  end if;

  -- amount_cents is snapshotted from the listing here and never re-read. A
  -- price edit after this point must not change what was agreed.
  insert into public.orders (listing_id, buyer_id, seller_id, amount_cents, payment_method)
  values (p_listing_id, caller, lst.seller_id, lst.price_cents, p_payment_method)
  returning id into new_id;

  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- accept_order — the seller picks one, and the others lose
-- ---------------------------------------------------------------------------

create or replace function public.accept_order(
  p_order_id       uuid,
  p_meetup_spot_id uuid        default null,
  p_meetup_at      timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  ord    public.orders%rowtype;
  lst    public.listings%rowtype;
begin
  select * into ord from public.orders o where o.id = p_order_id for update;

  if ord.id is null then
    raise exception 'No such order' using errcode = 'no_data_found';
  end if;

  if ord.seller_id <> caller then
    raise exception 'Only the seller can accept a request'
      using errcode = 'insufficient_privilege';
  end if;

  if ord.status <> 'requested' then
    raise exception 'Only a pending request can be accepted'
      using errcode = 'check_violation';
  end if;

  select * into lst from public.listings l where l.id = ord.listing_id for update;

  if lst.status <> 'active' then
    raise exception 'This listing already has a deal in progress'
      using errcode = 'check_violation';
  end if;

  if p_meetup_spot_id is not null and not exists (
    select 1 from public.meetup_spots m
     where m.id = p_meetup_spot_id and m.campus = lst.campus and m.is_active
  ) then
    raise exception 'Choose an active meetup spot on the listing''s campus'
      using errcode = 'check_violation';
  end if;

  update public.orders
     set status         = 'accepted',
         accepted_at    = now(),
         meetup_spot_id = coalesce(p_meetup_spot_id, lst.default_meetup_spot_id),
         meetup_at      = p_meetup_at
   where id = p_order_id;

  -- Every other pending request on this listing loses, in the same
  -- transaction. Leaving them open would mean several buyers each believing
  -- they are next in line for one item.
  update public.orders
     set status       = 'declined',
         cancelled_at = now()
   where listing_id = ord.listing_id
     and id <> p_order_id
     and status = 'requested';

  update public.listings
     set status = 'reserved'
   where id = ord.listing_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- decline_order — the seller says no
-- ---------------------------------------------------------------------------

create or replace function public.decline_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  ord    public.orders%rowtype;
begin
  select * into ord from public.orders o where o.id = p_order_id for update;

  if ord.id is null then
    raise exception 'No such order' using errcode = 'no_data_found';
  end if;

  if ord.seller_id <> caller then
    raise exception 'Only the seller can decline a request'
      using errcode = 'insufficient_privilege';
  end if;

  if ord.status <> 'requested' then
    raise exception 'Only a pending request can be declined'
      using errcode = 'check_violation';
  end if;

  update public.orders
     set status = 'declined', cancelled_at = now()
   where id = p_order_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- confirm_meetup — the buyer agrees to the time and place
-- ---------------------------------------------------------------------------

create or replace function public.confirm_meetup(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  ord    public.orders%rowtype;
begin
  select * into ord from public.orders o where o.id = p_order_id for update;

  if ord.id is null then
    raise exception 'No such order' using errcode = 'no_data_found';
  end if;

  if ord.buyer_id <> caller then
    raise exception 'Only the buyer confirms the meetup'
      using errcode = 'insufficient_privilege';
  end if;

  if ord.status <> 'accepted' then
    raise exception 'This order is not waiting on a meetup'
      using errcode = 'check_violation';
  end if;

  if ord.meetup_at is null then
    raise exception 'The seller has not proposed a time yet'
      using errcode = 'check_violation';
  end if;

  update public.orders
     set meetup_confirmed_at = coalesce(meetup_confirmed_at, now())
   where id = p_order_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- confirm_handoff — the one thing neither side can assert alone
-- ---------------------------------------------------------------------------

-- Each party confirms independently. The order completes on the second
-- confirmation, and that single moment is what sets the listing sold,
-- increments the seller's completed_sales, and unlocks reviews for both sides.
create or replace function public.confirm_handoff(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  ord    public.orders%rowtype;
begin
  select * into ord from public.orders o where o.id = p_order_id for update;

  if ord.id is null then
    raise exception 'No such order' using errcode = 'no_data_found';
  end if;

  if caller not in (ord.buyer_id, ord.seller_id) then
    raise exception 'Not a party to this order'
      using errcode = 'insufficient_privilege';
  end if;

  if ord.status <> 'accepted' then
    raise exception 'Only an accepted order can be handed over'
      using errcode = 'check_violation';
  end if;

  if caller = ord.buyer_id then
    update public.orders
       set buyer_confirmed_at = coalesce(buyer_confirmed_at, now())
     where id = p_order_id;
  else
    update public.orders
       set seller_confirmed_at = coalesce(seller_confirmed_at, now())
     where id = p_order_id;
  end if;

  select * into ord from public.orders o where o.id = p_order_id;

  if ord.buyer_confirmed_at is null or ord.seller_confirmed_at is null then
    return;
  end if;

  update public.orders
     set status = 'completed', completed_at = now()
   where id = p_order_id;

  -- touch_listing() stamps sold_at on the transition, so it is not set here.
  update public.listings
     set status = 'sold'
   where id = ord.listing_id;

  update public.profiles
     set completed_sales = completed_sales + 1
   where id = ord.seller_id;

  -- The conversation deliberately stays OPEN. People need to talk after a
  -- handoff — a missing part, a receipt, a refund. Only a block closes a
  -- thread.
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_order — either side, before it completes
-- ---------------------------------------------------------------------------

create or replace function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  ord    public.orders%rowtype;
begin
  select * into ord from public.orders o where o.id = p_order_id for update;

  if ord.id is null then
    raise exception 'No such order' using errcode = 'no_data_found';
  end if;

  if caller not in (ord.buyer_id, ord.seller_id) then
    raise exception 'Not a party to this order'
      using errcode = 'insufficient_privilege';
  end if;

  if ord.status not in ('requested', 'accepted') then
    raise exception 'This order can no longer be cancelled'
      using errcode = 'check_violation';
  end if;

  update public.orders
     set status = 'cancelled', cancelled_at = now()
   where id = p_order_id;

  -- A cancelled deal puts the item back on the market. Guarded on `reserved`
  -- so cancelling a stale request cannot resurrect a listing the seller has
  -- since removed or sold elsewhere.
  if ord.status = 'accepted' then
    update public.listings
       set status = 'active'
     where id = ord.listing_id
       and status = 'reserved';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- renew_listing — before or after expiry
-- ---------------------------------------------------------------------------

create or replace function public.renew_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  lst    public.listings%rowtype;
begin
  select * into lst from public.listings l where l.id = p_listing_id for update;

  if lst.id is null then
    raise exception 'No such listing' using errcode = 'no_data_found';
  end if;

  if lst.seller_id <> caller then
    raise exception 'Only the seller can renew a listing'
      using errcode = 'insufficient_privilege';
  end if;

  if lst.status not in ('active', 'expired') then
    raise exception 'Only an active or expired listing can be renewed'
      using errcode = 'check_violation';
  end if;

  -- bumped_at moves, created_at does not. Renewing lifts the listing in the
  -- feed without claiming it was posted today.
  update public.listings
     set status     = 'active',
         bumped_at  = now(),
         expires_at = now() + interval '30 days'
   where id = p_listing_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- submit_report — the only way into private.reports
-- ---------------------------------------------------------------------------

-- Returns void, not the report id. The reporter has no use for an identifier
-- they can never read a row with, and handing one back invites a client to
-- store it somewhere the reported user might see.
create or replace function public.submit_report(
  p_reason     public.report_reason,
  p_details    text default null,
  p_user_id    uuid default null,
  p_listing_id uuid default null,
  p_message_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'Sign in to report' using errcode = 'insufficient_privilege';
  end if;

  -- The table's CHECK enforces this too. Raising here gives the client a
  -- sentence instead of a constraint name.
  if (p_user_id is not null)::integer
   + (p_listing_id is not null)::integer
   + (p_message_id is not null)::integer <> 1 then
    raise exception 'Report exactly one user, listing, or message'
      using errcode = 'check_violation';
  end if;

  insert into private.reports (
    reporter_id, reported_user_id, reported_listing_id, reported_message_id,
    reason, details
  )
  values (caller, p_user_id, p_listing_id, p_message_id, p_reason, p_details);
end;
$$;

-- ---------------------------------------------------------------------------
-- register_device — push tokens, without a readable token table
-- ---------------------------------------------------------------------------

-- Upsert on the token, not on (user, platform). Expo hands the same token to
-- whoever signs in on that device, so a shared or re-flashed phone must
-- reassign it rather than accumulate rows that notify the previous owner.
create or replace function public.register_device(
  p_expo_push_token text,
  p_platform        text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'Sign in to register a device'
      using errcode = 'insufficient_privilege';
  end if;

  if p_platform not in ('ios', 'android', 'web') then
    raise exception 'Unknown platform %', p_platform
      using errcode = 'check_violation';
  end if;

  insert into public.user_devices (user_id, expo_push_token, platform)
  values (caller, p_expo_push_token, p_platform)
  on conflict (expo_push_token) do update
     set user_id    = excluded.user_id,
         platform   = excluded.platform,
         updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- delete_my_account — anonymise, do not erase
-- ---------------------------------------------------------------------------

-- Retention over deletion. Orders and reviews use `on delete restrict`
-- precisely so that one party leaving cannot rewrite the other party's
-- transaction history or delete the review they were given.
--
-- The auth.users row is deliberately NOT deleted here, and an Edge Function
-- completing this flow should BAN that user rather than delete them:
-- profiles.id cascades from auth.users, so deleting the auth row would destroy
-- this tombstone and then fail against the restrict FKs anyway.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  update public.profiles
     set username         = left('deleted_' || replace(gen_random_uuid()::text, '-', ''), 20),
         bio              = null,
         avatar_path      = null,
         campus           = null,
         last_active_at   = null,
         show_last_active = false,
         allow_follows    = false,
         status           = 'deleted'
   where id = caller;

  -- Anything still for sale comes down. `removed` rather than deleted, so a
  -- completed order still points at a readable listing.
  update public.listings
     set status = 'removed'
   where seller_id = caller
     and status in ('draft', 'active', 'reserved');

  -- Live deals end. The counterparty is told by the usual order notification.
  update public.orders
     set status = 'cancelled', cancelled_at = now()
   where (buyer_id = caller or seller_id = caller)
     and status in ('requested', 'accepted');

  -- Personal, and of no value to anyone else once the account is gone.
  delete from public.saved_listings where user_id = caller;
  delete from public.follows        where follower_id = caller or followed_id = caller;
  delete from public.user_devices   where user_id = caller;
end;
$$;

-- ---------------------------------------------------------------------------
-- Scheduled sweeps — service role only
-- ---------------------------------------------------------------------------

-- Both are called by pg_cron or a scheduled Edge Function, never by the app.
-- They take no caller into account and operate on every row that qualifies,
-- which is exactly why `authenticated` must not be able to execute them.

-- An accepted order nobody confirmed is a listing held hostage. Seven days is
-- the default because a campus week is the natural unit here — missing one
-- meetup should not cost a seller a fortnight of visibility.
create or replace function public.expire_stale_orders(p_after interval default interval '7 days')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  -- Both CTEs are data-modifying, so both run to completion whether or not
  -- the primary query reads them. The count comes off `swept` rather than
  -- GET DIAGNOSTICS, which would report the listings freed — a different
  -- number, since an order whose listing has since been removed frees nothing.
  with swept as (
    update public.orders o
       set status = 'expired', cancelled_at = now()
     where o.status = 'accepted'
       and o.accepted_at < now() - p_after
    returning o.listing_id
  ),
  freed as (
    update public.listings l
       set status = 'active'
      from swept
     where l.id = swept.listing_id
       and l.status = 'reserved'
    returning l.id
  )
  select count(*) into n from swept;

  return n;
end;
$$;

-- Expiry is what keeps a campus marketplace from filling with items that sold
-- over the summer. Only `active` rows expire: a reserved listing has a live
-- deal on it, and that deal has its own sweep above.
create or replace function public.expire_stale_listings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  update public.listings
     set status = 'expired'
   where status = 'active'
     and expires_at <= now();

  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

-- The app's functions. `anon` gets nothing: every one of these reads
-- auth.uid() and would raise for an anonymous caller anyway, but an
-- unreachable function cannot be probed.
revoke execute on function public.request_order(uuid, public.payment_method)            from anon, public;
revoke execute on function public.accept_order(uuid, uuid, timestamptz)                 from anon, public;
revoke execute on function public.decline_order(uuid)                                   from anon, public;
revoke execute on function public.confirm_meetup(uuid)                                  from anon, public;
revoke execute on function public.confirm_handoff(uuid)                                 from anon, public;
revoke execute on function public.cancel_order(uuid)                                    from anon, public;
revoke execute on function public.renew_listing(uuid)                                   from anon, public;
revoke execute on function public.submit_report(public.report_reason, text, uuid, uuid, uuid) from anon, public;
revoke execute on function public.register_device(text, text)                           from anon, public;
revoke execute on function public.delete_my_account()                                   from anon, public;

grant execute on function public.request_order(uuid, public.payment_method)            to authenticated;
grant execute on function public.accept_order(uuid, uuid, timestamptz)                 to authenticated;
grant execute on function public.decline_order(uuid)                                   to authenticated;
grant execute on function public.confirm_meetup(uuid)                                  to authenticated;
grant execute on function public.confirm_handoff(uuid)                                 to authenticated;
grant execute on function public.cancel_order(uuid)                                    to authenticated;
grant execute on function public.renew_listing(uuid)                                   to authenticated;
grant execute on function public.submit_report(public.report_reason, text, uuid, uuid, uuid) to authenticated;
grant execute on function public.register_device(text, text)                           to authenticated;
grant execute on function public.delete_my_account()                                   to authenticated;

-- The sweeps. Service role only — these ignore auth.uid() entirely.
revoke execute on function public.expire_stale_orders(interval) from anon, authenticated, public;
revoke execute on function public.expire_stale_listings()       from anon, authenticated, public;
grant  execute on function public.expire_stale_orders(interval) to service_role;
grant  execute on function public.expire_stale_listings()       to service_role;
