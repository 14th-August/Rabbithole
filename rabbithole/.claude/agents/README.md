# `.claude/agents`

Subagent definitions. Each `<name>.md` defines an agent that can be spawned with
the `Agent` tool, or asked for by name ("use the code-tutor subagent").

## The roster

| Agent | Role | Tools | Model | Edits files? |
| --- | --- | --- | --- | --- |
| `researcher` | Establishes facts before they are built on — versioned APIs, library behaviour, trade-offs | Read, Glob, Grep, WebFetch, WebSearch | sonnet | **No** |
| `architecture-reviewer` | Judges whether code fits the system and the v1/v2 plan | Read, Glob, Grep, Bash | opus (high) | **No** |
| `code-mentor` | Designs an implementation *before* it is written — placement, reuse, skeleton, trade-offs, first step | Read, Glob, Grep, WebFetch | opus (high) | **No** |
| `code-tutor` | Explains files, patterns, and stack concepts that already exist | Read, Glob, Grep, WebFetch | opus | **No** |
| `test-engineer` | Writes and runs tests; sets up the harness | Read, Write, Edit, Glob, Grep, Bash | sonnet (high) | Tests only |

**Three of four are read-only by design.** Tools are the real permission boundary —
an agent with no `Write` cannot edit no matter what its prompt says, and a prompt
that says "do not edit" while holding `Write` is a suggestion. Research, review, and
explanation are advisory roles; only `test-engineer` produces files, and only test
files.

## Roles and memory

Every agent sets `memory: project`, which persists notes across sessions in
`.claude/agent-memory/`. Each definition ends with a **Memory** section naming what
that role should retain — this is what makes them roles rather than one-off prompts:

- `researcher` keeps **dated verified facts and dead ends**, so settled questions
  are not re-researched and stale facts are re-checked.
- `architecture-reviewer` keeps **recurring violations and accepted deviations**, so
  it stops re-raising decisions the user consciously made.
- `code-tutor` keeps **what has been explained and where understanding was shaky**,
  so teaching compounds instead of restarting.
- `test-engineer` keeps **harness configuration and known-flaky tests**, because
  rediscovering Jest + React Native config every session is pure waste.

The `.claude/agent-memory/` directory is created on first use. Decide deliberately
whether to commit it: committed, memory is shared and reviewable; ignored, it stays
local and private.

## Model and effort choices

Deliberate, and worth changing if the trade-off feels wrong:

- **`researcher` runs on sonnet** — fetching and summarising documentation is
  volume work, not judgment work. Raise it if findings feel shallow.
- **`architecture-reviewer` runs on opus at high effort** — judging whether a change
  fits a system is the hardest thing in this roster and the one where a wrong answer
  is most expensive.
- **`code-tutor` runs on opus** — explanation quality *is* the deliverable. A cheap
  wrong explanation to someone learning is worse than none, because they build on it.
- **`test-engineer` runs on sonnet at high effort** — mechanical work, but the edge
  cases need care.

## When to use an agent, and when not to

Use one when the work is genuinely separable and you want the conclusion rather than
the search: a broad codebase sweep, a doc dig, a focused review pass.

**Do not** spawn one for work you can do in a few tool calls. Every agent starts
cold and re-derives context the main session already has. A subagent that spends
five calls rediscovering the project structure to answer a one-line question is a
net loss.

## Adding an agent

1. Create `.claude/agents/<name>.md` with `name` and `description` frontmatter —
   both required. The **description is what drives delegation**, so write it as
   *when to use this*, not *what this is*.
2. Set `tools` explicitly. Omitting it inherits everything, which for an advisory
   role means it can edit your codebase.
3. Set `memory: project` if the role benefits from continuity, and say in the body
   what it should remember. Memory with no instructions about what to store fills
   with noise.
4. Add the row to the table above.

## Related

- `.claude/rules/` — the standards these agents review and build against.
- `.claude/skills/` — user-invoked workflows, including `/daily-brief`.
