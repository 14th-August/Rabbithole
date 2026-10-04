-- Lock down function EXECUTE, and move the block check off a policy.
--
-- Owns: who may CALL a function, as distinct from who may read a row.
-- Does not own: what the functions do. That is the triggers and orders
--   migrations.
--
-- THE BUG THIS FIXES
--
-- Postgres grants EXECUTE on every new function to PUBLIC by default, and
-- PostgREST exposes any non-trigger function in an exposed schema as an RPC
-- endpoint. `is_blocked_between()` is SECURITY DEFINER — it has to be, because
-- it exists to see block rows the caller cannot — so the default grant turned
-- it into an oracle:
--
--   select public.is_blocked_between('<me>', '<them>')  -> true
--
-- Any signed-in user could ask whether any two people had blocked each other.
-- That is precisely what the blocks SELECT policy exists to prevent: someone
-- who can detect a block makes a second account, and someone who cannot just
-- sees an unresponsive person.
--
-- The fix is not to revoke the grant on its own. An RLS policy expression is
-- evaluated as the calling user, so a policy that calls a function requires
-- the caller to hold EXECUTE on it — revoking alone would break every INSERT
-- into conversations. The block check therefore moves into a BEFORE INSERT
-- trigger, which the system invokes regardless of the caller's grants. That is
-- already how `messages` does it; this makes `conversations` consistent.

-- ---------------------------------------------------------------------------
-- conversations: block checking moves from the policy to a trigger
-- ---------------------------------------------------------------------------

drop policy if exists "a buyer opens a thread on a live listing" on public.conversations;

-- Identical to the previous policy minus the is_blocked_between() call.
-- Everything here is a fact the caller may already read, so none of it needs a
-- definer function.
create policy "a buyer opens a thread on a live listing"
  on public.conversations for insert to authenticated
  with check (
    (select auth.uid()) = buyer_id
    and public.is_account_active((select auth.uid()))
    and exists (
      select 1 from public.listings l
       where l.id = conversations.listing_id
         and l.seller_id = conversations.seller_id
         and l.seller_id <> (select auth.uid())
         and l.status in ('active', 'reserved')
    )
  );

create or replace function public.enforce_conversation_allowed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_blocked_between(new.buyer_id, new.seller_id) then
    -- Deliberately the same wording a closed thread produces. A buyer must not
    -- be able to tell "blocked" from "unavailable".
    raise exception 'This conversation is closed'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger conversations_enforce_allowed
  before insert on public.conversations
  for each row execute function public.enforce_conversation_allowed();

-- ---------------------------------------------------------------------------
-- Revoke the default PUBLIC grant on everything not meant to be called
-- ---------------------------------------------------------------------------

-- Trigger functions cannot be invoked as RPCs — Postgres refuses, and PostgREST
-- does not publish them — so these revokes are hygiene rather than a fix. They
-- are here so that `has_function_privilege('authenticated', …)` is a truthful
-- inventory of what a client can reach, instead of a list that has to be read
-- with a caveat.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prorettype = 'pg_catalog.trigger'::regtype
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn.sig);
  end loop;
end;
$$;

-- The oracle. Now reachable only from inside the SECURITY DEFINER triggers
-- that need it, never from PostgREST.
revoke execute on function public.is_blocked_between(uuid, uuid) from public, anon, authenticated;

-- Called only by handle_new_user(), which runs as its owner.
revoke execute on function public.generate_username() from public, anon, authenticated;

-- is_account_active() KEEPS its grant, deliberately. Several RLS policies call
-- it, so the caller must hold EXECUTE, and it leaks nothing: account status is
-- already a column of public_profiles, readable by every signed-in user.
