# Rabbithole — agent instructions

A student marketplace for Vancouver Island University — textbooks and second-hand
items, traded between students on one campus. Expo SDK 58 / React Native /
TypeScript, targeting iOS, Android, and web from one codebase.

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v58.0.0/ before
writing any code. SDK 58 changed enough that model memory and most tutorials are
actively wrong about it — the project moved 57 to 58 on 2026-10-24, and React
Native went 0.86 to 0.88 with it.

## Rules

These load into every session. Follow them.

@.claude/rules/workflow.md
@.claude/rules/technical-defaults.md
@.claude/rules/design-rules.md

## Where things are

The git repository root is `Rabbithole/`; the Expo app lives in the nested
`rabbithole/` directory, which is where all paths below are rooted.

| Path | Holds |
| --- | --- |
| `src/app/` | The route table. Every file in it is a URL. |
| `src/components/` | The three shared auth inputs. Read `src/components/README.md`. |
| `src/types/` | Domain types, plus the generated schema. Read `src/types/README.md`. |
| `src/lib/` | Supabase client, auth, session, queries. Read `src/lib/README.md`. |
| `supabase/` | Migrations, RLS, the VIU auth hook, seed. Run the CLI from here. |
| `.claude/rules/` | The standards imported above. |
| `.claude/agents/` | `researcher`, `architecture-reviewer`, `code-mentor`, `code-tutor`, `requirements-checker`, `test-engineer`. |
| `.claude/skills/` | `/daily-brief`, `/verify`. |
| `../ARCHITECTURE.md` | v1/v2 system design. **Gitignored** — local only, and absent in a worktree. |

There is no `src/theme`. Styles are file-scoped `StyleSheet.create` blocks with
literal values — see `design-rules.md`.

## State

**The project was scaled back to working authentication on 2026-10-18.** Scope
had outrun what was actually built: a feed, saved listings, messaging, orders and
a 701-line create form existed as code, and none of it had ever run. 24 files
were deleted on purpose. This is the floor to build out from, one feature at a
time.

- **Works end to end** — sign-up, the SMTP confirmation code, the `@my.viu.ca`
  gate (a server-side `before_user_created` hook), sign-in, the five-day
  staleness policy, sign-out, and the one-shot welcome splash.
- **The signed-in app** is one screen: `(app)/index.tsx`, showing your own
  profile fields and a sign-out button. That is deliberate, not unfinished.
- **The database is complete and untouched** — 16 public tables, RLS, triggers,
  views. The schema describes the whole marketplace even though the app no
  longer does. `src/types/database.ts` is generated from it and in sync.
- **Kept but unused** — `src/types/listing.ts`. No importer after the scale-down;
  it is the shape to build back toward.
- **Next** — one feature, briefed before it is written. Browse is the obvious
  first, and `listing_summaries` already exists in the schema for it.
- **No tests.** `test-engineer` has a harness to set up when that starts.
