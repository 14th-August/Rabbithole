# Rabbithole — agent instructions

A student marketplace for Vancouver Island University — textbooks and second-hand
items, traded between students on one campus. Expo SDK 57 / React Native /
TypeScript, targeting iOS, Android, and web from one codebase.

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before
writing any code. SDK 57 changed enough that model memory and most tutorials are
actively wrong about it.

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
| `src/theme/` | Design tokens — light and dark. Read `src/theme/README.md`. |
| `src/types/` | Domain types. **Currently the only written-down schema.** Read `src/types/README.md`. |
| `src/mocks/` | Fixtures, deliberately awkward. Read `src/mocks/README.md`. |
| `.claude/rules/` | The standards imported above. |
| `.claude/agents/` | `researcher`, `architecture-reviewer`, `code-tutor`, `test-engineer`. |
| `.claude/skills/` | `/daily-brief`. |
| `../ARCHITECTURE.md` | v1/v2 system design. **Gitignored** — local only, and absent in a worktree. |

## State

UI layers exist; screens do not. No backend, no auth, no tests.

- **Done** — navigation shell, theme tokens, domain types, fixtures.
- **Next** — shared components, then screens, then the Supabase schema.
- **Deferred on purpose** — Stripe. v1 settles in person; prepay is a v2 feature
  designed to cost exactly one additive `ALTER TABLE`. See `ARCHITECTURE.md`.
- **Known exception** — the five placeholder tab screens still hardcode colours,
  predating the theme layer. They are being replaced; do not treat them as a pattern.
