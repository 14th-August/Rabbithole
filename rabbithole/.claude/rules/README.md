# `.claude/rules`

Shared standards, loaded into **every** session.

## How these actually take effect

`.claude/rules/` is **not** a directory Claude Code reads on its own. These files
are inert unless something imports them. The chain is:

```
CLAUDE.md
  └─ @AGENTS.md
       ├─ @.claude/rules/workflow.md
       ├─ @.claude/rules/technical-defaults.md
       └─ @.claude/rules/design-rules.md
```

If you add a fourth rules file, **add the `@` import to `AGENTS.md` or it does
nothing.** This is the single most likely way this setup silently breaks.

## What goes where

| File | Holds | Changes when |
| --- | --- | --- |
| `workflow.md` | How work proceeds — definition of done, scope discipline, git, multi-session ownership, delegation | The process changes |
| `technical-defaults.md` | Stack rules — versions, React/routing conventions, data conventions, layering, documentation format | A technical decision is made |
| `design-rules.md` | How the app looks and behaves — tokens, states, accessibility, marketplace-specific rules | A design decision is made |

The test for which file a rule belongs in: **workflow** answers *how we work*,
**technical defaults** answers *what we build with*, **design rules** answers
*what it looks like*.

## Why rules and not a longer AGENTS.md

Three reasons, all practical:

1. **Agents can cite one file.** `architecture-reviewer` reviews against
   `technical-defaults.md`; nothing forces it to re-read design rules it is not
   checking. A single monolith cannot be referenced in parts.
2. **Diffs stay legible.** A design decision shows up as a change to
   `design-rules.md`, not as a hunk in the middle of an 800-line instructions file.
3. **Rules are the coordination mechanism between parallel sessions.** A message is
   read once by one session; a rule is read by every session forever. When a
   decision needs to stick, it is written here, not said.

## Cost

Everything here loads into context on every session, so it is not free. Keep rules
**declarative and short** — state the rule and the reason in a sentence, and put
long explanation in `src/*/README.md` or `ARCHITECTURE.md`, which are read on
demand. If a rules file drifts past roughly 200 lines, that is a signal it is
carrying documentation that should live elsewhere.

## Maintenance

A rule that is routinely ignored is worse than no rule, because it teaches every
reader that this directory is decorative. If a rule stops being true, delete it in
the same change that makes it untrue.
