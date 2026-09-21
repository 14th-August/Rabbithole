# `.claude/skills`

Project skills — reusable workflows invoked with `/<name>`.

## Structure

Skills are **directory-based**, not flat files. The directory name becomes the
command:

```
.claude/skills/daily-brief/SKILL.md   →  /daily-brief
```

A flat `.claude/skills/daily-brief.md` does nothing. `SKILL.md` is required; other
files in the directory can be referenced from it for detail that should not load
every time.

## The roster

| Skill | Invoke | What it does |
| --- | --- | --- |
| `daily-brief` | `/daily-brief [focus]` | Standup on the codebase — what changed, project state, convention drift, three ranked next actions, one decision to make |

## How `daily-brief` works

The interesting part is **dynamic context injection**. Lines written as
`` !`command` `` run locally *before* Claude sees the skill, and their output is
substituted into the prompt. So the brief arrives with git log, working tree, source
tree, typecheck result, and several convention greps already in hand — no tool calls
needed to gather state, and no chance of the model guessing at it.

The greps are the part worth extending. Each one encodes a rule from
`.claude/rules/` as an executable check:

| Check | Enforces |
| --- | --- |
| Hex literals in `src/app` and `src/components` | "never hardcode a colour" |
| `lib/supabase` imported by screens | "no screen calls the database directly" |
| `theme/palette` imported outside `src/theme` | "raw ramps never leave the theme" |

**A rule that can be grepped should be grepped.** A written rule is a hope; a check
in the brief is a fact, reported every morning without anyone remembering to look.

Note `npx tsc --noEmit` runs on every invocation and takes roughly 20 seconds. That
is the main cost of the skill, and it is worth it — but it means `/daily-brief` is a
once-a-session command, not something to run repeatedly.

## Adding a skill

1. `mkdir .claude/skills/<name>` and create `SKILL.md`.
2. Frontmatter needs `name` and `description`. The **description drives
   auto-invocation** — Claude may run the skill when a request matches it. Add
   `disable-model-invocation: true` if it should only ever run when you type it.
3. Set `shell: bash` if you use `` !`command` `` injection with POSIX syntax; this
   machine also has PowerShell, and the two are not interchangeable.
4. Scope `allowed-tools` to what the skill actually needs.
5. Use `$ARGUMENTS` for user input, `${CLAUDE_PROJECT_DIR}` for the project root.

## Skills vs. agents vs. rules

Easy to conflate; they do different jobs:

- **Rules** (`.claude/rules/`) — always loaded, passive. Standards that apply to
  everything.
- **Agents** (`.claude/agents/`) — delegated, fresh context, report back. A role.
- **Skills** (`.claude/skills/`) — invoked, run in *this* session with full context.
  A procedure.

`/daily-brief` is a skill rather than an agent precisely because it should run in
the main session: the brief is only useful if the session that reads it is the one
that acts on it.
