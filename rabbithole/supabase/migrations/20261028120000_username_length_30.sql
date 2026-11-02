-- Usernames may be up to 30 characters.
--
-- Owns: the length bound on `profiles.username`, in both places that hold it —
--   the column CHECK from 20260918132138_enums_and_tables.sql and the format
--   arm of `is_username_available()` from 20261004090100_username_at_signup.sql.
-- Does not own: the client mirror in src/lib/verification/validation.ts, which
--   is a courtesy check and has to move in the same change, nor the three
--   `left(..., 20)` truncations in generate_username() and
--   request_account_deletion(). Those still produce legal names under a 30
--   bound; only their comments, which explain the 20 as "to satisfy the
--   username CHECK", go stale.
--
-- Why both, in one migration. The two patterns are a single rule written
-- twice, and 20261004090100 says so: "these two cannot drift without one of
-- them failing loudly." Widen only the CHECK and signup still rejects a
-- 25-character name, because `handle_new_user` re-validates through
-- `is_username_available`. Widen only the function and the insert reaches a
-- CHECK that refuses it. Neither half is shippable alone.
--
-- Widening is safe where the price cap was not. Every stored username already
-- satisfies the old 20-char bound, so every stored username satisfies 30 — the
-- new constraint is added VALID and Postgres scans the table to prove it. No
-- NOT VALID escape hatch, no rows to clean up first, and nothing is rewritten.

-- ---------------------------------------------------------------------------
-- profiles.username — the column CHECK
-- ---------------------------------------------------------------------------

do $$
declare
  old_name text;
begin
  -- Found by its definition, not by a guessed name. The constraint was
  -- declared inline on the column, so Postgres named it, not us — and
  -- `drop constraint if exists profiles_username_check` would be a silent
  -- no-op if that guess were ever wrong. The 20-char CHECK would then survive
  -- alongside the new one and go on refusing exactly the names this migration
  -- exists to allow, with nothing in the log to say why.
  --
  -- position(), not LIKE: `_` is a LIKE wildcard and the pattern is full of
  -- them.
  select conname
    into old_name
    from pg_constraint
   where conrelid = 'public.profiles'::regclass
     and contype  = 'c'
     and position('{3,20}' in pg_get_constraintdef(oid)) > 0;

  if old_name is null then
    raise exception
      'No CHECK on public.profiles carries the {3,20} username pattern'
      using hint = 'Already applied, or the pattern moved. Refusing to stack a second length CHECK on top of one this migration cannot see.';
  end if;

  execute format('alter table public.profiles drop constraint %I', old_name);
end
$$;

-- Named explicitly, so the next change to this bound is a plain drop/add by
-- name instead of the lookup above.
alter table public.profiles
  add constraint profiles_username_check
  check (username ~ '^[A-Za-z0-9_]{3,30}$');

comment on constraint profiles_username_check on public.profiles is
  'Letters, numbers and underscores, 3 to 30 characters. The same pattern is the format arm of is_username_available(); they cannot drift without one of them failing loudly.';

-- ---------------------------------------------------------------------------
-- is_username_available — the same bound, server-side
-- ---------------------------------------------------------------------------

-- Replaces the body from 20261004090100_username_at_signup.sql. Only the
-- pattern changes; the rest is reproduced verbatim because CREATE OR REPLACE
-- rewrites the whole definition. CREATE OR REPLACE keeps the existing
-- privileges and the existing COMMENT, so the revoke/grant pair and the
-- function comment from that migration are not repeated here.
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
  select p_username ~ '^[A-Za-z0-9_]{3,30}$'
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
