# Connecting to Supabase — the runbook

Everything between "Docker is running" and "migrations are live on the hosted
project". Companion to [`roadmap.md`](roadmap.md) — this is Phase 0 and Phase 2 in
operational detail.

**Two rounds of work on your side**, with my work in between. The split exists
because the Auth Hook can only be registered *after* its function exists in the
database, and that function arrives in a migration.

---

## Round 1 — yours (about 10 minutes)

### 1. Create the Supabase project

[supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.

| Field | Value | Why |
| --- | --- | --- |
| Name | `rabbithole` | |
| Database password | **Generate, then save it somewhere** | Shown once. Needed to push migrations. Recoverable via Settings → Database → Reset database password, but resetting invalidates existing connections. |
| Region | **Canada (Central)** | Student names and email addresses are personal information about Canadian residents. Keeping it in-country costs nothing and avoids a conversation later. |
| Plan | Free | Sufficient. The Before User Created hook is available on Free. |

Provisioning takes a couple of minutes.

### 2. Authenticate the CLI yourself

**In your own terminal — Windows Terminal or PowerShell — not inside a Claude
session.**

```
npx supabase login
```

This opens a browser to complete the flow, which needs a real TTY. Running it
through Claude Code's `!` prefix fails with
`LegacyLoginMissingTokenError: Cannot use automatic login flow inside non-TTY
environments`.

The CLI stores the token under your Windows user account, so any later
`npx supabase` call from this repo picks it up automatically. Nothing is pasted
into chat.

**Alternative, if the browser flow is awkward:** generate a Personal Access Token
at [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
and run `npx supabase login --token <token>` — still in your own terminal. A PAT
carries full account access, so keep it out of any transcript.

### 3. Send me three values

From **Project Settings** in the dashboard. The API page was recently split, so
depending on when you read this the keys are under **Settings → API** or
**Settings → API Keys**.

| Value | Where | Secret? |
| --- | --- | --- |
| **Project URL** — `https://<ref>.supabase.co` | Settings → API (or Data API) | No |
| **Publishable key** (older UI calls it the `anon` key) | Settings → API Keys | **No** — it is designed to ship in the client. RLS is what protects the data, not this key. |
| **Project ref** — the `<ref>` part of the URL | Settings → General | No |

**Do not send me:** the `service_role` / secret key, or the database password.
`service_role` bypasses RLS entirely and must never enter the client or this
conversation. The database password I will prompt you for at the one moment it is
needed, in step 5.

---

## Then I do (no input needed from you)

4. Add `.env` to `rabbithole/.gitignore` — it currently only ignores `.env*.local`,
   so a plain `.env` would be committed today. Then write:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_KEY=<publishable key>
   ```

5. `npx supabase init` → creates `supabase/`.
   `npx supabase link --project-ref <ref>` → **this prompts for the database
   password**. You type it; it goes into the CLI's local credential store, not into
   the repo and not into chat.

6. `npx supabase start` → the local stack in Docker. First run pulls several
   gigabytes of images, so it is slow exactly once.

7. Write the migrations from [`schema.md`](schema.md), plus `supabase/seed.sql`
   transcribed from `src/mocks`.

8. `npx supabase db reset` repeatedly until every migration replays clean from
   scratch onto an empty database. A migration that only works incrementally will
   fail on the hosted project, which is the expensive place to find out.

9. `npx supabase db push` → applies them to your hosted project.

10. `npx supabase gen types typescript --local > src/types/database.ts`, then diff
    the generated rows against the hand-written ones in `src/types`.

---

## Round 2 — yours (after migrations land)

These are dashboard clicks. None of them is in version control, which is why
[`auth-flow.md`](auth-flow.md) keeps a checklist — re-check it after any project
restore.

### 11. Custom SMTP — do this before testing signup

**Auth → SMTP Settings.** The built-in service is capped at **2 emails per hour**,
best-effort. One OTP attempt is one email, so you and one other tester will exhaust
it in under a minute, and the failure looks like a broken app rather than a quota.

[Resend](https://resend.com) is the shortest path: sign up, verify a domain (or use
their test sender to start), create an API key, then in Supabase set host
`smtp.resend.com`, port `465`, username `resend`, password = the API key, and a
sender address you control.

### 12. Switch the confirmation email to a code

**Auth → Email Templates → Confirm signup.** Replace the
`{{ .ConfirmationURL }}` link with `{{ .Token }}` so the email carries six digits
instead of a link. This is what makes the mobile flow work without deep-link
configuration.

Check **Auth → Providers → Email** has *Confirm email* **on**.

### 13. Register the VIU gate

**Auth → Hooks → Before User Created** → enable → select the Postgres function
`public.before_user_created_viu_gate`.

The function itself arrives in a migration in step 7, so it will be in the
dropdown by the time you get here. This is the only authoritative part of the
domain gate — Supabase has no built-in allowed-domains setting.

### 14. Tell me it's done

Then I run the `curl` test from [`auth-flow.md`](auth-flow.md) — signing up a
`@gmail.com` address directly against the Auth API, bypassing the app entirely — and
confirm it comes back `403`. A `200` there means the gate is off no matter how the
app behaves.

---

## What I will never ask you for

| Credential | Why not |
| --- | --- |
| `service_role` / secret key | Bypasses RLS completely. v1 never needs it, and it is the one thing standing between a bug and a full-table compromise. |
| Your Supabase account password | `supabase login` handles auth without it. |
| A PAT pasted into chat | If you use the `--token` variant in step 2, run it in your own terminal. A PAT carries full account access and does not belong in a transcript. |

The publishable key is different in kind — it is meant to be public, ships inside
the app bundle, and is useless without a matching RLS policy. Sending it is fine.

---

## Expected config drift — read this before reacting to `supabase config diff`

`config diff` compares `supabase/config.toml` against the hosted project. It is a
genuinely useful tool — it caught a malformed Site URL (`http://rabbithole://`,
silently mangled by the dashboard field) that nothing else would have surfaced.

It stays useful only if its output is signal. A diff full of known, accepted
differences trains you to skim it, and that is exactly when it stops catching the
real one. So: these differences are **expected and correct**. Anything else is worth
a look.

| Difference | Why it is fine |
| --- | --- |
| `auth.email.smtp.*` present remotely, absent locally | Local uses the Mailpit catcher on `:54324`; SMTP is a hosted-only concern. |
| `auth.email.max_frequency` — local `1s`, remote `1m` | Local needs fast resends to test. **The hosted 1-minute throttle is the number the verify screen's resend cooldown must respect.** |
| `storage.analytics.enabled` / `storage.vector.enabled` off locally | Windows + 4 GB Docker workarounds, below. Never push these up. |
| `storage.image_transformation.enabled` remote only | A hosted platform feature with no local equivalent. |
| `db.pooler.*` | Hosted defaults; the local pooler is disabled entirely. |
| `auth.mfa.totp.*`, `auth.sms.twilio.enabled` remote `true` | Dashboard defaults. Inert — no Twilio credentials exist and nobody can enrol. |

**Do not run `supabase config push` to close these.** It would carry the local-dev
workarounds up to the hosted project and drop the email throttle from a minute to a
second. Fix hosted settings in the dashboard by hand; the CLI's own help warns that
a non-interactive push silently overwrites real settings with template defaults.

## Windows notes — learned the hard way, 2026-09-18

`supabase start` failed twice on this machine before working. All three fixes are
now committed in `supabase/config.toml`, so a fresh clone should not hit them —
but the reasoning matters if the symptoms reappear.

**`[analytics] enabled = false`.** The Logflare analytics container needs the
Docker daemon exposed on `tcp://localhost:2375`, which Docker Desktop does not do
by default. Without it the container never reports healthy, and `supabase start`
**rolls back the entire stack** with `LegacyHealthCheckTimeoutError` — the error
names five containers, which makes it look like a much bigger problem than one
optional log viewer. Turning it off also stops the `vector` sidecar.

**`[storage.vector] enabled = false`.** The embeddings vector store runs its own
migrations at container start and was the single slowest step. Rabbithole does not
use it.

**`[edge_runtime] enabled = false`.** v1 has no Edge Functions by design — the
client speaks to PostgREST and RLS is the authorization layer. Re-enable with v2's
Stripe work.

**Docker memory.** This machine allocates **3.76 GB / 4 CPUs** to Docker, which is
tight for the stack even trimmed. If health checks start timing out again, raise it
in Docker Desktop → Settings → Resources before disabling anything else.

**The first run will look like a failure.** Postgres `initdb` takes several minutes
on a fresh volume, and the CLI's health-check window can expire before it finishes
— reporting `LegacyDbConnectError: Connection terminated unexpectedly` and tearing
down the containers. **Just run `npx supabase start` again.** The images and volume
are cached by then and it succeeds.

Also note: `supabase start` exits with **code 0 even when it fails**. Read the last
line of its output, not the exit status.

## Run every command from `rabbithole/` — 2026-09-25

> ```
> failed to start docker container "supabase_db_Rabbithole":
> Bind for 0.0.0.0:54322 failed: port is already allocated
> ```

The CLI derives its Docker project id from the **containing folder name**. This
repository has two directories one letter apart:

| Run from | Project id | Owns `supabase/`? |
| --- | --- | --- |
| `Rabbithole/` (repo root) | `Rabbithole` | No |
| `rabbithole/` (the app) | `rabbithole` | **Yes** |

Running from the root therefore starts a *second, unrelated* stack with no
migrations and no seed, which then collides with the real one on 54322. Worse, the
failed start's rollback tore down the healthy lowercase containers and deleted its
database volume — so the visible symptom was the API dying, not a naming mistake.

**Recovery:** `npx supabase stop` from whichever directory owns the stray project,
then `npx supabase start` from `rabbithole/`. Check which is which with
`docker ps --format "{{.Names}}"` and read the case of the suffix.

## A seeded account cannot sign in — 2026-09-25

> ```
> HTTP 500  {"code":500,"error_code":"unexpected_failure",
>            "msg":"Database error querying schema"}
> ```

**The tell:** a seeded account 500s while an account created through the app's own
signup returns a normal `400 invalid_credentials`. That asymmetry means the row is
malformed, not the password.

GoTrue scans `confirmation_token`, `recovery_token`, `email_change`,
`email_change_token_new`, `email_change_token_current`, `phone_change`,
`phone_change_token` and `reauthentication_token` into plain Go strings. All are
`varchar NULL` with no default, so any hand-written `insert into auth.users` that
omits them stores NULL — and NULL fails that scan. Real signups are unaffected
because GoTrue writes empty strings itself.

Fixed in `supabase/seed.sql` with a `coalesce` pass after the insert. It fails at
**sign-in**, not at insert, and the app surfaces it as "Something went wrong" —
which is indistinguishable from a network fault, and is what made it expensive.

## Quick reference

```bash
# One-time, yours — in your OWN terminal, not a Claude session (needs a TTY)
npx supabase login

# One-time, mine
npx supabase init
npx supabase link --project-ref <ref>     # prompts for the DB password

# The loop
npx supabase start                         # local stack, needs Docker
npx supabase db reset                      # replay all migrations + seed
npx supabase db push                       # apply to the hosted project
npx supabase gen types typescript --local > src/types/database.ts

npx supabase status                        # local URLs and keys
npx supabase stop                          # free the containers
npx supabase stop --no-backup              # ...and discard the database volume
```

**Every one of these must run from `rabbithole/`.** See the section above for what
happens otherwise.

| Service | URL |
| --- | --- |
| API gateway — what the app talks to | `http://localhost:54321` |
| Postgres | `postgresql://postgres:postgres@localhost:54322/postgres` |
| Studio | `http://localhost:54323` |
| Mailpit — reads confirmation codes locally | `http://localhost:54324` |

Signup sends a 6-digit code rather than a link, so confirming an account locally
means opening Mailpit and reading the code out of the email. Nothing is sent.

**Editing the email template requires restarting Auth.** GoTrue reads
`supabase/templates/confirmation.html` once at container start and caches it, so a
saved edit keeps sending the previous version and nothing reports an error —
verified 2026-09-26. `docker restart supabase_auth_rabbithole` picks it up; the
container is stateless, so no sessions or data are lost.

To check the auth stack end to end without touching the app:

```bash
curl -s -X POST "http://127.0.0.1:54321/auth/v1/token?grant_type=password"   -H "apikey: $EXPO_PUBLIC_SUPABASE_KEY" -H "Content-Type: application/json"   -d '{"email":"maya.chen@my.viu.ca","password":"rabbithole"}'
```

A 200 with an `access_token` means the backend is fine and any remaining failure is
the device or the network — which is the fastest way to split those two apart.
