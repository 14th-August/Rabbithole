-- Triggers: the invariants the client cannot be trusted to maintain.
--
-- Owns: profile creation on signup, the VIU domain re-check, denormalised
--   rating aggregation, inbox ordering, listing timestamps, category depth.
-- Does not own: authorization. That is RLS, in its own migration.
--
-- Every function that writes across a row boundary or touches auth is
-- `security definer set search_path = ''`. The empty search path is the
-- hardening that prevents search-path hijacking inside the definer context,
-- and it is why every identifier below is schema-qualified.

-- ---------------------------------------------------------------------------
-- handle_new_user — layer 3 of the VIU gate
-- ---------------------------------------------------------------------------

-- The Before User Created hook (see the auth_viu_gate migration) is registered
-- as configuration and can be switched off without a commit. This check lives
-- in a migration, so it travels with `supabase db reset` and cannot silently
-- disappear. It is insurance against the one failure mode that would otherwise
-- be invisible: the gate being off while signups keep succeeding.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- display_name is cosmetic and nothing is authorised on it, so reading it
  -- from user-controlled metadata is fine. Falls back to the email local part,
  -- which for VIU is already "Preferred.Lastname".
  claimed_name text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    initcap(replace(split_part(new.email, '@', 1), '.', ' '))
  );
begin
  if new.email !~* '@my\.viu\.ca$' then
    raise exception 'Rabbithole accounts require a @my.viu.ca address'
      using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, left(claimed_name, 60));

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
-- refresh_profile_rating — denormalise reviews onto profiles
-- ---------------------------------------------------------------------------

-- Sorting or filtering a feed by seller rating must not be a correlated
-- subquery, so the aggregate is maintained here instead.
--
-- When the last review for a user is deleted, avg() returns NULL and count()
-- returns 0 — which lands exactly on the "New seller" semantic the UI already
-- handles. That is the intended behaviour, not a side effect of it.
create or replace function public.refresh_profile_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.reviewee_id, old.reviewee_id);
begin
  update public.profiles p
     set rating_avg   = agg.avg_rating,
         rating_count = agg.n
    from (
      select round(avg(r.rating)::numeric, 1) as avg_rating,
             count(*)::integer                as n
        from public.reviews r
       where r.reviewee_id = target
    ) agg
   where p.id = target;

  return null;
end;
$$;

create trigger reviews_refresh_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_profile_rating();

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
  if new.parent_id is not null and exists (
    select 1 from public.categories c
     where c.id = new.parent_id and c.parent_id is not null
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
-- mark_conversation_read — the one RPC
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
