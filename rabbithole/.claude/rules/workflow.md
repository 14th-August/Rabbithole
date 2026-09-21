# Workflow rules

How work proceeds on Rabbithole. Loaded into every session via `AGENTS.md`.

## Before writing code

1. **Read the versioned Expo docs** at https://docs.expo.dev/versions/v57.0.0/ for
   any Expo or React Native API you are about to touch. SDK 57 changed things;
   memory and older tutorials are unreliable. This is not optional.
2. **Check whether the thing already exists.** `src/theme` has tokens, `src/types`
   has domain types, `src/mocks` has fixtures. A new colour constant, a new
   `Listing` interface, or a new fake seller is almost always a duplicate.
3. **Read the neighbouring file** before adding a sibling. Match its structure,
   comment density, and naming rather than importing a different style.

## Definition of done

A change is not done until all of these hold:

- [ ] `npx tsc --noEmit` exits clean.
- [ ] Rendered and eyeballed in **both** light and dark. Not "it should be fine".
- [ ] No hardcoded colour, spacing, radius, or font size — everything from `useTheme()`.
- [ ] Module header present, exported symbols carry TSDoc.
- [ ] Empty, loading, and error states considered for anything that renders data.
- [ ] No new dependency added without `npx expo install` (see technical defaults).

## Scope discipline

- **Do what was asked.** If you spot an adjacent problem, say so in one sentence
  and keep going — do not silently expand the change.
- **Finish what was asked.** If part of the scope is blocked, complete everything
  else and state plainly what was left and why.
- **Do not tidy fixtures.** `src/mocks` is deliberately awkward. If a fixture
  surfaced a layout bug, fix the layout.

## Git

- Work on a branch, not `main`, for anything larger than a typo.
- Commit when the user asks, not spontaneously.
- `ARCHITECTURE.md` at the repo root is **gitignored on purpose** — a design
  scratchpad, not a published spec. Do not commit it, do not move it into
  `README.md`, and remember it will be **absent in a git worktree**.

## Multi-session ownership

When more than one Claude session runs against this repo, sessions may only run
in parallel if their **write sets are disjoint**. Job titles do not make work
parallel; non-overlapping directories do.

| Owner | May write | Reads only |
| --- | --- | --- |
| UI session | `src/theme`, `src/components`, `src/app`, `src/types`, `src/mocks` | — |
| Backend session | `supabase/`, migration and seed files | `src/types` |
| Any session | its own scratch files | — |

**`src/types/` has exactly one owner: the UI session.** It is the contended
boundary, because UI drives the shape and the migration transcribes it. A backend
session that needs a type changed asks for the change; it does not make it. This
single rule prevents the only failure mode here that does not announce itself —
the schema and the view models silently disagreeing.

Other constraints:

- **One Metro server.** Only the designated session runs `npx expo start`; port
  8081 does not multiplex.
- **Never `npm install` from two sessions at once.** Concurrent lockfile writes
  corrupt it.
- **Coordination happens through these rules files, not through messages.** A
  message is read once by one session; a rule is read by every session forever.
  If a decision needs to stick, write it down here.

## Delegation

**Route automatically.** When a request matches a row below and clears the gate,
spawn that agent without being asked and without first offering it as a choice.
Naming an agent explicitly always overrides this table.

| The request looks like | Route to | You get back |
| --- | --- | --- |
| "how does X work", "what are the trade-offs", "is X supported in SDK 57" — anything resting on a fact nobody in the session has verified | `researcher` | Findings with sources. No edits. |
| "is this right", "does this fit", "review this", "should I refactor" — or a feature just landed | `architecture-reviewer` | Findings against these rules and the v1/v2 plan. No edits. |
| "how do I build X", "where should this go", starting any feature — the question is how to implement something that does not exist yet | `code-mentor` | An implementation brief: where it goes, what to reuse, the skeleton, the trade-offs, and the one first step. No code. |
| "what does this file do", "why is it written this way", "explain", "teach me" — about code that already exists | `code-tutor` | An explanation pitched at someone learning the stack. No edits. |
| "write tests", "add a regression test", a bug that needs one, harness setup | `test-engineer` | Test files, run. Never edits app code to make them pass. |
| "can Claude Code…", hooks, slash commands, MCP, settings, keybindings, Agent SDK, Claude API | `claude-code-guide` | An answer from current docs rather than model memory. |
| "where is X", "which files do Y" — a sweep across many files where only the conclusion matters | `Explore` | Locations and a conclusion, not file dumps. |
| Daily orientation | `/daily-brief` | — |

**The gate — do not delegate when any of these hold:**

- You can finish it inline in a few tool calls. A cold agent re-derives context you
  already have, and that cost is paid every time.
- The answer is already in this session's context.
- The work writes outside the agent's remit. Only `test-engineer` writes, and only
  test files.
- It is a one-line factual answer.

**Delegating is the default for the rows above; not delegating is the default
everywhere else.** The gate exists because "it has several parts" or "be thorough"
is not a routing signal — a matching *kind of work* is. Breadth is not a reason to
spawn; a different mode of work is.

Independent routes spawn in one batch and run in parallel. Dependent ones do not:
**`code-mentor` and `researcher` run in parallel at the start of a feature** —
research establishes what an API actually does, the mentor decides how this
codebase should use it. Neither writes code, and the brief comes back before
implementation starts, not after.

`researcher` informs a decision, so it runs before; `architecture-reviewer` judges
code, so it runs after that code exists.

**Relay what an agent returns in your own words.** Its report is never shown to the
user — an unrelayed finding is a finding that did not happen.

## Pace

**One feature at a time, briefed before it is built.**

The person building this is learning the stack by building it. Code they did not
follow being written is code they cannot maintain — a large correct diff is a
worse outcome than a small one they understand.

- Run `code-mentor` before implementing a feature, not after.
- Then write **one module or one screen**, walk through what it does, and stop.
- Prefer the smallest, most self-contained piece first, so each is
  understandable before anything depends on it.
- A plan may list eight files. Executing all eight without pausing is not the
  same thing, and is not wanted.

## Asking versus assuming

Make routine judgment calls without asking. Stop and ask only when two readings of
the request would produce materially different work, or when proceeding would be
unsafe. When you do assume, state the assumption in the reply.
