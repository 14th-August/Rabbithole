-- The VIU email gate — layer 2, the authoritative one.
--
-- Owns: rejecting signups from outside @my.viu.ca before an auth.users row
--   exists.
-- Does not own: what a verified account may then do. That is RLS.
--
-- Supabase has NO built-in allowed-email-domains setting — it has been an open
-- feature request since 2023. The Before User Created hook is the only
-- mechanism that runs inside GoTrue before the user row is created, on every
-- signup path: the app, the REST API, curl, anything. A client-side regex is
-- UX; this is the gate.
--
-- Registering it is configuration, not code:
--   local  — [auth.hook.before_user_created] in supabase/config.toml
--   hosted — Dashboard -> Auth -> Hooks -> Before User Created
--
-- Because registration can be switched off without a commit, handle_new_user()
-- re-checks the same domain as layer 3. See the triggers migration.

-- ---------------------------------------------------------------------------
-- The domain, in one place
-- ---------------------------------------------------------------------------

-- VIU students are PreferredName.LastName@my.viu.ca. Note the dot: my.viu.ca
-- is a SUBDOMAIN. @viu.ca is the employee domain and is deliberately excluded —
-- this is a student marketplace.
--
-- Getting this wrong does not fail loudly; it produces an app that no real
-- student can register for. See docs/backend/roadmap.md.

create or replace function public.before_user_created_viu_gate(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_email text := lower(event -> 'user' ->> 'email');
begin
  if claimed_email is null or claimed_email !~ '@my\.viu\.ca$' then
    -- This message is surfaced verbatim as the client's signUp() error, so it
    -- is user-facing copy, not a log line.
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Rabbithole is for VIU students. Please sign up with your @my.viu.ca address.'
      )
    );
  end if;

  -- An empty object means "continue".
  return '{}'::jsonb;
end;
$$;

comment on function public.before_user_created_viu_gate(jsonb) is
  'Before User Created auth hook. Rejects any signup whose email is not @my.viu.ca. Must stay registered in config.toml (local) and the dashboard (hosted).';

-- Only GoTrue may call this. It must not be reachable from PostgREST, where an
-- authenticated user could probe it.
grant  usage   on schema public to supabase_auth_admin;
grant  execute on function public.before_user_created_viu_gate(jsonb) to supabase_auth_admin;
revoke execute on function public.before_user_created_viu_gate(jsonb) from anon, authenticated, public;
