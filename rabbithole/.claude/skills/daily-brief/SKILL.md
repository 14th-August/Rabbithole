---
name: daily-brief
description: Daily orientation on the Rabbithole codebase — what changed, what state the project is in, which conventions have drifted, and a ranked set of suggested next actions. Use at the start of a working session, or when picking the project back up after time away.
shell: bash
argument-hint: "[focus area, e.g. 'ui' or 'schema'] (optional)"
allowed-tools: Read, Glob, Grep, Bash(git *), Bash(npx tsc *)
---

# Daily brief

Produce a short standup for a solo developer picking this project back up. Optional
focus from the user: **$ARGUMENTS** — if given, weight the recommendations toward it,
but still report drift found anywhere.

---

## Collected state

### Commits in the last 24 hours
!`git log --since="24 hours ago" --pretty=format:"%h  %ad  %s" --date=format:"%m-%d %H:%M" 2>/dev/null || echo "(none)"`

### Recent history
!`git log --oneline -12 2>/dev/null`

### Working tree
!`git status --short 2>/dev/null || echo "(clean)"`

### Uncommitted change size
!`git diff --stat HEAD 2>/dev/null || echo "(no diff)"`

### Source tree
!`find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.md" \) 2>/dev/null | sort`

### Largest modules
!`find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec wc -l {} + 2>/dev/null | sort -rn | head -12`

### Typecheck
!`npx tsc --noEmit 2>&1 | tail -8 || echo "typecheck reported errors above"`

### Open markers
!`grep -rn "TODO\|FIXME\|HACK\|XXX" src --include="*.ts" --include="*.tsx" 2>/dev/null | head -15 || echo "(none)"`

### Convention drift — hardcoded colours outside the theme (count per file)
!`grep -rn "#[0-9a-fA-F]\{3,8\}\b" src/app src/components 2>/dev/null | awk -F: '{print $1}' | sort | uniq -c | sort -rn || echo "(none)"`

### Convention drift — components importing fixtures directly
!`grep -rln "@/mocks" src/app src/components 2>/dev/null || echo "(none — good)"`

### Convention drift — raw palette imports outside the theme
!`grep -rn "theme/palette" src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "^src/theme/" || echo "(none — good)"`

### Backend status
!`test -d supabase && find supabase -type f | head -20 || echo "no supabase/ directory — schema not started"`

### Test harness status
!`grep -q '"test"' package.json 2>/dev/null && echo "test script present" || echo "no test script — harness not set up"`

---

## Instructions

Read the collected state above. Read `ARCHITECTURE.md` at the repository root if it
exists (it is gitignored, so it may be absent in a worktree) for the v1/v2 plan, and
consult `.claude/rules/` for the standards drift is measured against.

Do **not** re-run the commands above — the output is already here. Read files only
when the state above is genuinely ambiguous.

Write the brief in this shape. Keep the whole thing scannable in under a minute.

### 1. Since last time
Two or three sentences on what actually changed. If nothing changed, say so in one
line and move on — do not pad. Name the work, not the file count.

### 2. Where the project stands
One short paragraph, plus a status line per area. Be blunt about what is scaffolding
versus what is real. Current areas: **UI**, **types**, **fixtures**, **backend**,
**tests**, **auth**.

### 3. Drift and health
Only report what the checks above actually found. For each:

- **Typecheck** — clean or the specific errors.
- **Hardcoded values** — file:line for any colour literal outside `src/theme` and
  `app.json`. Note that the five placeholder tab screens are a known, accepted
  exception until they are replaced.
- **Fixture leakage** — any component importing `@/mocks` directly. This should be
  empty; if it is not, it is the most important line in the brief.
- **Palette leakage** — any import of `theme/palette` from outside `src/theme`.
- **Open markers** — TODO/FIXME worth acting on.

**If everything is clean, say "no drift" in one line.** Do not manufacture findings
to fill the section — a brief that always finds problems stops being read.

### 4. What is blocked
Anything that cannot proceed without a decision from the user. Name the decision,
not the symptom. Pull open questions from `ARCHITECTURE.md` when relevant — but only
surface one that is actually blocking work *now*, not the whole list.

### 5. Suggested next actions
**Exactly three**, ranked, each with:

- **The action** — concrete enough to start immediately, not "work on the UI".
- **Why now** — what it unblocks, or what it costs to defer.
- **Rough size** — a quick change, a session, or a multi-session project.

Rank by what unblocks the most downstream work, not by what is easiest. Respect the
established order: theme and types exist, so components come before screens, screens
before the schema, and payments stay deferred to v2. If the user gave a focus in
`$ARGUMENTS`, weight toward it — but if the top recommendation lies outside that
focus, say so and explain why.

### 6. One decision to make
A single open question worth answering today, with a recommendation and a sentence
of reasoning. One — not a list. If nothing is genuinely pending, omit this section
entirely rather than inventing a question.

---

## Tone

Terse and factual. This is a standup, not a report. No preamble, no
congratulation, no "great progress!" — the value is in accurate state and a clear
next move. If the honest read is "nothing changed and the next step is unchanged
from yesterday", that is a valid and useful brief.
