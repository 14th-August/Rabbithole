-- Let a new account choose its own username.
--
-- Owns: accepting a requested username at signup, and answering "is this one
--   free" before an account exists to ask with.
-- Does not own: changing a username later. That is a Settings screen writing
--   to profiles.username, which the column grants in the RLS migration already
--   permit.
--
-- Random generation stays the FALLBACK and the default, and the reason for it
-- is unchanged: a VIU address is PreferredName.LastName@my.viu.ca, so anything
-- derived from the email publishes a real name to the whole campus. What
-- changes is that someone who would rather be `kelp_quay` than `otter_413` can
-- say so, and someone who does not care still gets a name that is not theirs.

-- ---------------------------------------------------------------------------
-- is_username_available
-- ---------------------------------------------------------------------------

-- Granted to `anon`, which is unusual enough to justify. Signup happens before
-- a session exists, so the one caller that needs this has no JWT at all.
--
-- It does allow username enumeration. That is acceptable here and not a
-- concession: usernames are printed on every listing card and every review, so
-- the set is already public, and a signup form that cannot say "taken" before
-- submission is a form people fail repeatedly. What it must never do is leak
-- anything the username is attached to — hence it returns a bare boolean and
-- reads no other column.
--
-- STABLE, not IMMUTABLE: the answer changes as accounts are created.
create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- Format first, so a malformed request is "not available" rather than an
  -- error the client has to special-case. The same pattern is a CHECK on the
  -- column, so these two cannot drift without one of them failing loudly.
  select p_username ~ '^[A-Za-z0-9_]{3,20}$'
     and not exists (
       select 1
         from public.profiles p
        -- OPERATOR(extensions.=), not a bare `=`. These functions run with
        -- `search_path = ''`, which hides the extensions schema — so a bare
        -- `=` on two citext values does NOT find citext's case-insensitive
        -- operator. It falls back to text equality, and the check reports
        -- "KELP_QUAY" free while the UNIQUE index, whose operator class is
        -- resolved by type rather than by search_path, still refuses it. The
        -- symptom is a signup that passes validation and then fails.
        where p.username OPERATOR(extensions.=) p_username::extensions.citext
     );
$$;

comment on function public.is_username_available(text) is
  'True when the username is well formed and unclaimed. Case-insensitive, because profiles.username is citext. Callable by anon: signup has no session.';

revoke execute on function public.is_username_available(text) from public;
grant  execute on function public.is_username_available(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- generate_username — the same citext bug, fixed
-- ---------------------------------------------------------------------------

-- Replaces the version in 20260918132150_triggers.sql, which compared with a
-- bare `=` under `search_path = ''` and so collision-checked case-sensitively.
-- It mattered less there, because every generated candidate is lowercase — but
-- it stops mattering at all the moment a user picks `Otter_413` and the
-- generator later proposes `otter_413`.
create or replace function public.generate_username()
returns extensions.citext
language plpgsql
set search_path = ''
as $$
declare
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

    if public.is_username_available(candidate) then
      return candidate::extensions.citext;
    end if;
  end loop;

  -- About 518,000 combinations. Twenty collisions means the space is genuinely
  -- crowded, so fall back to something that cannot collide. Truncated to 20 to
  -- satisfy the username CHECK.
  return left('u_' || replace(gen_random_uuid()::text, '-', ''), 20)::extensions.citext;
end;
$$;

revoke execute on function public.generate_username() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- handle_new_user — now reads an optional requested username
-- ---------------------------------------------------------------------------

-- Replaces the version in 20260918132150_triggers.sql. The VIU domain re-check
-- is unchanged and is still layer 3 of the gate — see auth-flow.md.
--
-- `raw_user_meta_data` is user-controlled: it is whatever the client put in
-- `signUp({ options: { data } })`. So the requested username is validated here
-- rather than trusted, by the same function the client used to check it. The
-- UNIQUE index on profiles.username is the backstop for the race between that
-- check and this insert.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested text := nullif(btrim(new.raw_user_meta_data ->> 'username'), '');
begin
  if new.email !~* '@my\.viu\.ca$' then
    raise exception 'Rabbithole accounts require a @my.viu.ca address'
      using errcode = 'check_violation';
  end if;

  -- Raising, rather than quietly falling back to a random name. Someone who
  -- typed a username and received `pebble_cove_812` instead would reasonably
  -- call that a bug, and would not find out until the profile screen.
  if requested is not null and not public.is_username_available(requested) then
    raise exception 'The username % is not available', requested
      using errcode = 'unique_violation';
  end if;

  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(requested::extensions.citext, public.generate_username())
  );

  return new;
end;
$$;
