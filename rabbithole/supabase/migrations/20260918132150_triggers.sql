-- Triggers: the invariants the client cannot be trusted to maintain.
--
-- Owns: profile creation on signup, the VIU domain re-check, denormalised
--   rating and response aggregation, inbox ordering, listing timestamps and
--   validation, category depth, follow and message gating, block side effects.
-- Does not own: authorization (RLS, its own migration) or the order state
--   machine (the orders-and-functions migration). A trigger here enforces that
--   a row is well formed; it never decides who may write it.
--
-- Every function that writes across a row boundary or touches auth is
-- `security definer set search_path = ''`. The empty search path is the
-- hardening that prevents search-path hijacking inside the definer context,
-- and it is why every identifier below is schema-qualified.

-- ---------------------------------------------------------------------------
-- generate_username — a name that is not the student's name
-- ---------------------------------------------------------------------------

-- VIU addresses are PreferredName.LastName@my.viu.ca, so ANY username derived
-- from the email publishes a real name to the whole campus. That is the single
-- reason this function exists: the default must be random, and the user picks
-- something better afterwards if they want to.
create or replace function public.generate_username()
returns extensions.citext
language plpgsql
set search_path = ''
as $$
declare
  -- Island-flavoured and deliberately bland. Nothing here should be funny at
  -- someone's expense, because it is assigned, not chosen.
  adjectives text[] := array[
    'amber', 'brisk', 'cedar', 'dusky', 'eager', 'fern', 'glass', 'harbour',
    'inlet', 'jade', 'kelp', 'lupin', 'misty', 'north', 'otter', 'pebble',
    'quiet', 'rowan', 'salt', 'tidal', 'umber', 'vivid', 'wren', 'yarrow'];
  nouns      text[] := array[
    'alder', 'bay', 'cove', 'dock', 'ember', 'ferry', 'grove', 'heron',
    'isle', 'juniper', 'kayak', 'lantern', 'maple', 'nook', 'orchard', 'pine',
    'quay', 'ridge', 'spruce', 'trail', 'urchin', 'vale', 'willow', 'yew'];
  candidate  text;
begin
  for attempt in 1..20 loop
    candidate :=
      adjectives[1 + floor(random() * array_length(adjectives, 1))::integer]
      || '_'
      || nouns[1 + floor(random() * array_length(nouns, 1))::integer]
      || floor(random() * 900 + 100)::integer::text;

    if not exists (
      select 1 from public.profiles p where p.username = candidate::extensions.citext
    ) then
      return candidate::extensions.citext;
    end if;
  end loop;

  -- 24 x 24 x 900 is about 518,000 combinations. Twenty collisions means the
  -- space is genuinely crowded, so fall back to something that cannot collide.
  -- Truncated to 20 to satisfy the username CHECK.
  return left('u_' || replace(gen_random_uuid()::text, '-', ''), 20)::extensions.citext;
end;
$$;

-- ---------------------------------------------------------------------------
-- handle_new_user — layer 3 of the VIU gate
-- ---------------------------------------------------------------------------

-- The Before User Created hook (see the auth_viu_gate migration) is registered
-- as configuration and can be switched off without a commit. This check lives
-- in a migration, so it travels with `supabase db reset` and cannot silently
-- disappear. It is insurance against the one failure mode that would otherwise
-- be invisible: the gate being off while signups keep succeeding.
--
-- Note what is NOT read here any more: raw_user_meta_data. The old schema took
-- a display_name from it. A pseudonymous marketplace has nowhere to put one.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email !~* '@my\.viu\.ca$' then
    raise exception 'Rabbithole accounts require a @my.viu.ca address'
      using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, username)
  values (new.id, public.generate_username());

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- handle_email_confirmed — stamp VIU verification
-- ---------------------------------------------------------------------------

-- viu_verified_at is set when, and only when, the address is actually
-- confirmed. Before that the account exists but has proven nothing.
create or replace function public.handle_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.profiles
       set viu_verified_at = new.email_confirmed_at
     where id = new.id;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_email_confirmed();

-- ---------------------------------------------------------------------------
-- touch_profile — updated_at
-- ---------------------------------------------------------------------------

create or replace function public.touch_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_profile();

-- ---------------------------------------------------------------------------
-- validate_listing — the cross-table checks a CHECK cannot make
-- ---------------------------------------------------------------------------

-- A meetup spot on the wrong campus is the kind of bad data that looks fine in
-- the database and strands two people in different cities. CHECK constraints
-- cannot reach another table, so this is a trigger.
create or replace function public.validate_listing()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.default_meetup_spot_id is not null and not exists (
    select 1 from public.meetup_spots m
     where m.id = new.default_meetup_spot_id
       and m.campus = new.campus
       and m.is_active
  ) then
    raise exception 'The default meetup spot must be an active spot on the listing''s campus'
      using errcode = 'foreign_key_violation';
  end if;

  return new;
end;
$$;

create trigger listings_validate
  before insert or update on public.listings
  for each row execute function public.validate_listing();

-- ---------------------------------------------------------------------------
-- touch_listing — updated_at, and sold_at on the transition into sold
-- ---------------------------------------------------------------------------

-- BEFORE, not AFTER: it mutates the row being written rather than issuing a
-- second UPDATE that would re-fire this same trigger.
create or replace function public.touch_listing()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();

  if new.status = 'sold' and old.status is distinct from 'sold' then
    new.sold_at := coalesce(new.sold_at, now());
  end if;

  return new;
end;
$$;

create trigger listings_touch
  before update on public.listings
  for each row execute function public.touch_listing();

-- ---------------------------------------------------------------------------
-- enforce_category_depth — the tree is two levels
-- ---------------------------------------------------------------------------

-- A CHECK constraint cannot run this subquery. Two levels is what makes the
-- Create screen's category picker a drill-down rather than an arbitrary tree
-- walk, so the limit is load-bearing for the UI, not just tidiness.
create or replace function public.enforce_category_depth()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_category_id is not null and exists (
    select 1 from public.categories c
     where c.id = new.parent_category_id and c.parent_category_id is not null
  ) then
    raise exception 'The category tree is two levels; "%" cannot nest under a child category', new.slug
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger categories_enforce_depth
  before insert or update on public.categories
  for each row execute function public.enforce_category_depth();

-- ---------------------------------------------------------------------------
-- enforce_listing_categories — secondary only, at most three
-- ---------------------------------------------------------------------------

-- Both halves of this rule need a subquery, so neither can be a CHECK. The cap
-- exists because a listing in nine categories is a listing in none — it is how
-- a seller games every category feed at once.
create or replace function public.enforce_listing_categories()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.listings l
     where l.id = new.listing_id and l.category_id = new.category_id
  ) then
    raise exception 'That is the listing''s primary category; this table holds secondary categories only'
      using errcode = 'check_violation';
  end if;

  -- BEFORE INSERT, so the new row is not yet counted: three existing rows
  -- means this would be the fourth.
  if (
    select count(*) from public.listing_categories lc
     where lc.listing_id = new.listing_id
  ) >= 3 then
    raise exception 'A listing may carry at most three secondary categories'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger listing_categories_enforce_limit
  before insert on public.listing_categories
  for each row execute function public.enforce_listing_categories();

-- ---------------------------------------------------------------------------
-- enforce_follow_allowed — allow_follows, and blocks in both directions
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER because the blocked party cannot see the block row — that
-- is the point of the blocks policy — and this check has to see it anyway.
create or replace function public.enforce_follow_allowed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
     where p.id = new.followed_id and p.allow_follows and p.status = 'active'
  ) then
    raise exception 'This user is not accepting follows'
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.blocks b
     where (b.blocker_id = new.follower_id and b.blocked_id = new.followed_id)
        or (b.blocker_id = new.followed_id and b.blocked_id = new.follower_id)
  ) then
    raise exception 'This user is not accepting follows'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger follows_enforce_allowed
  before insert on public.follows
  for each row execute function public.enforce_follow_allowed();

-- ---------------------------------------------------------------------------
-- apply_block — a block is retroactive
-- ---------------------------------------------------------------------------

-- Blocking someone you already follow, or who follows you, must sever both
-- edges — otherwise the blocked user keeps receiving new-listing alerts from
-- the person who blocked them, which is the opposite of what the button says.
-- Open conversations close; the history stays readable, new messages do not.
--
-- SECURITY DEFINER because it deletes the OTHER user's follow row, which no
-- RLS policy would ever permit the blocker to do directly.
create or replace function public.apply_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows f
   where (f.follower_id = new.blocker_id and f.followed_id = new.blocked_id)
      or (f.follower_id = new.blocked_id and f.followed_id = new.blocker_id);

  update public.conversations c
     set closed_at = now()
   where c.closed_at is null
     and ((c.buyer_id = new.blocker_id and c.seller_id = new.blocked_id)
       or (c.buyer_id = new.blocked_id and c.seller_id = new.blocker_id));

  return null;
end;
$$;

create trigger blocks_apply
  after insert on public.blocks
  for each row execute function public.apply_block();

-- ---------------------------------------------------------------------------
-- enforce_message_allowed — closed threads and blocks
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER for the same reason as the follow gate: the blocked party
-- must not be able to read the block, and this check must.
create or replace function public.enforce_message_allowed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  convo public.conversations%rowtype;
begin
  select * into convo
    from public.conversations c
   where c.id = new.conversation_id;

  if convo.closed_at is not null then
    raise exception 'This conversation is closed'
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.blocks b
     where (b.blocker_id = convo.buyer_id  and b.blocked_id = convo.seller_id)
        or (b.blocker_id = convo.seller_id and b.blocked_id = convo.buyer_id)
  ) then
    raise exception 'This conversation is closed'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger messages_enforce_allowed
  before insert on public.messages
  for each row execute function public.enforce_message_allowed();

-- ---------------------------------------------------------------------------
-- touch_conversation — keep the inbox ordered
-- ---------------------------------------------------------------------------

create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;

  return null;
end;
$$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- ---------------------------------------------------------------------------
-- refresh_response_metrics — "usually replies within an hour"
-- ---------------------------------------------------------------------------

-- Response rate and median response time are shown on every public profile, so
-- they must be cheap to read. Both are recomputed on the sender's FIRST
-- message in a thread and on no other, because those are the only two
-- messages that can move either number: the buyer's first makes the thread
-- answerable, and the seller's first answers it. Recomputing on every message
-- would rescan the seller's whole inbox per keystroke-sized write.
--
-- Recomputing on the BUYER's first message matters more than it looks. Without
-- it, a seller who never replies is never recalculated and keeps a NULL
-- response rate forever — so the one behaviour the metric exists to expose
-- would be the one it could not show.
--
-- A thread counts as answerable once the buyer has said something, and as
-- answered when the seller replied after that.
create or replace function public.refresh_response_metrics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  convo          public.conversations%rowtype;
  first_at       timestamptz;
  n_askable      integer;
  n_answered     integer;
  median_minutes double precision;
begin
  select * into convo from public.conversations c where c.id = new.conversation_id;

  -- "Is this the sender's first message in this thread?" asked by TIMESTAMP,
  -- not by counting rows.
  --
  -- AFTER ROW triggers are queued and fired once the whole statement finishes,
  -- so during a multi-row INSERT every row already sees its siblings. A
  -- count-based test therefore reports "not first" for all of them and the
  -- metrics are never computed at all — which is exactly what the seed did.
  -- A min() over the same set is stable however the rows arrived.
  select min(m.created_at) into first_at
    from public.messages m
   where m.conversation_id = new.conversation_id
     and m.sender_id = new.sender_id;

  if new.created_at > first_at then
    return null;
  end if;

  select
    count(*),
    count(*) filter (where t.replied_at is not null and t.replied_at >= t.asked_at),
    percentile_cont(0.5) within group (
      order by extract(epoch from (t.replied_at - t.asked_at)) / 60.0
    ) filter (where t.replied_at is not null and t.replied_at >= t.asked_at)
  into n_askable, n_answered, median_minutes
  from (
    select
      (select min(m.created_at) from public.messages m
        where m.conversation_id = c.id and m.sender_id = c.buyer_id)  as asked_at,
      (select min(m.created_at) from public.messages m
        where m.conversation_id = c.id and m.sender_id = c.seller_id) as replied_at
      from public.conversations c
     where c.seller_id = convo.seller_id
  ) t
  where t.asked_at is not null;

  update public.profiles p
     set response_rate = case
                           when n_askable = 0 then null
                           else round(n_answered::numeric / n_askable, 3)
                         end,
         median_response_minutes = case
                                     when median_minutes is null then null
                                     else greatest(round(median_minutes)::integer, 0)
                                   end
   where p.id = convo.seller_id;

  return null;
end;
$$;

create trigger messages_refresh_response_metrics
  after insert on public.messages
  for each row execute function public.refresh_response_metrics();

-- ---------------------------------------------------------------------------
-- refresh_profile_rating — denormalise reviews onto profiles
-- ---------------------------------------------------------------------------

-- Sorting or filtering a feed by seller rating must not be a correlated
-- subquery, so the aggregate is maintained here instead. profiles.rating_avg
-- is a generated column over these two, so there is no third value to keep in
-- step.
--
-- When the last review for a user is deleted, sum() is NULL and count() is 0.
-- The coalesce puts rating_sum back to 0, rating_count to 0, and the generated
-- rating_avg back to NULL — exactly the "New seller" semantic the UI handles.
-- That is the intended behaviour, not a side effect of it.
create or replace function public.refresh_profile_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Both, because an UPDATE that moved a review between reviewees leaves two
  -- stale rows. Nothing in the app can do that today; service_role can.
  targets uuid[] := array_remove(array[new.reviewee_id, old.reviewee_id], null);
  target  uuid;
begin
  foreach target in array targets loop
    update public.profiles p
       set rating_sum   = coalesce(agg.total, 0),
           rating_count = coalesce(agg.n, 0)
      from (
        select sum(r.rating)::integer as total,
               count(*)::integer      as n
          from public.reviews r
         where r.reviewee_id = target
      ) agg
     where p.id = target;
  end loop;

  return null;
end;
$$;

create trigger reviews_refresh_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_profile_rating();

-- ---------------------------------------------------------------------------
-- enforce_review_eligibility — a review needs a completed order
-- ---------------------------------------------------------------------------

-- The condition worth re-reading. Reviews hang off orders precisely so that
-- this check is possible: without "both parties confirmed a handoff", reviews
-- become free-form reputation anyone can write about anyone, which is the
-- cheapest possible way to make a trust system worthless.
create or replace function public.enforce_review_eligibility()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  ord public.orders%rowtype;
begin
  select * into ord from public.orders o where o.id = new.order_id;

  if ord.id is null then
    raise exception 'No such order' using errcode = 'foreign_key_violation';
  end if;

  if ord.status <> 'completed' then
    raise exception 'A review requires a completed order'
      using errcode = 'check_violation';
  end if;

  if new.reviewer_id not in (ord.buyer_id, ord.seller_id)
     or new.reviewee_id not in (ord.buyer_id, ord.seller_id) then
    raise exception 'Reviewer and reviewee must be the two parties to the order'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger reviews_enforce_eligibility
  before insert on public.reviews
  for each row execute function public.enforce_review_eligibility();

-- ---------------------------------------------------------------------------
-- enforce_order_payment_method — defence in depth
-- ---------------------------------------------------------------------------

-- request_order() already checks this. The trigger exists because orders are
-- the one table where a bug costs someone money, and a second check that
-- cannot be bypassed by a future function is worth a single extra index probe.
create or replace function public.enforce_order_payment_method()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.listings l
     where l.id = new.listing_id
       and ((new.payment_method = 'cash'      and l.accepts_cash)
         or (new.payment_method = 'etransfer' and l.accepts_etransfer))
  ) then
    raise exception 'The seller does not accept % for this listing', new.payment_method
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger orders_enforce_payment_method
  before insert on public.orders
  for each row execute function public.enforce_order_payment_method();

-- ---------------------------------------------------------------------------
-- mark_conversation_read
-- ---------------------------------------------------------------------------

-- Marking a thread read means updating read_at on messages the caller did NOT
-- send. That is an awkward RLS policy and a clean function.
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  -- SECURITY DEFINER bypasses RLS, so this membership check is not optional.
  -- It is the only thing standing between this function and a full-table update.
  if not exists (
    select 1 from public.conversations c
     where c.id = p_conversation_id
       and (select auth.uid()) in (c.buyer_id, c.seller_id)
  ) then
    raise exception 'Not a participant in this conversation'
      using errcode = 'insufficient_privilege';
  end if;

  update public.messages m
     set read_at = now()
   where m.conversation_id = p_conversation_id
     and m.sender_id <> (select auth.uid())
     and m.read_at is null;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke execute on function public.mark_conversation_read(uuid) from anon, public;
grant  execute on function public.mark_conversation_read(uuid) to authenticated;
