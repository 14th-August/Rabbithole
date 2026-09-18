---
name: verify
description: How to verify changes in this repo at their real surface.
---

# Verifying Rabbithole changes

## Rules / agent-config changes (`.claude/rules/*`, `AGENTS.md`, `CLAUDE.md`)

The surface is **the agent**, not a test. Rules load at session start through
`CLAUDE.md` -> `@AGENTS.md` -> `@.claude/rules/*.md`. Editing a rules file does
nothing until a new session starts.

Drive it headless, asking for a fact that exists ONLY in the rules:

```powershell
cd <repo>/rabbithole
claude -p "Do no work, read no files. Answer only from project rules: what must price_cents 0 render as? If you have no project rules loaded, reply exactly: NO RULES LOADED."
```

Expected: `"Free"`. A `NO RULES LOADED` reply means the import chain broke.

**You must run from `rabbithole/`, not the repo root.** `CLAUDE.md` lives in the
nested app directory. Running `claude` from the repo root `Rabbithole/` loads
NOTHING - verified 2026-09-17.

To verify a change survives cloning, clone the branch to a temp dir and run the
above from the clone rather than trusting the working tree.

## Gotchas

- `(Get-Content f | Measure-Object -Line).Lines` SKIPS BLANK LINES and undercounts.
  Use `(Get-Content f).Count` or `wc -l`.
- Git operations against the main checkout are blocked from a worktree-isolated
  session in Bash; use the PowerShell tool instead.

## App changes

Not yet exercised - no screens exist. When they do, `npx expo start --web` and
drive the browser via the `chrome-devtools` MCP server.
