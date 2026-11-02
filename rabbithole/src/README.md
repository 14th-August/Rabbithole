# `src`

The application. Four folders, and one rule that explains all of them.

The project was scaled back to working authentication on 2026-10-18 — see the
State section of `AGENTS.md`. Built back since: the tab bar, and Create. The
other four tabs are placeholders that say so in their own headers, and each is
to be replaced wholesale rather than grown into the real screen.

## The rule: dependencies point downward

```
app/         routes and screens      → may import components, lib, types
components/  shared UI               → may import lib, types
lib/         client, auth, queries   → may import types
types/       domain types            → imports nothing
```

Nothing imports *upward*. `types/` knows nothing about React, so it survives a UI
rewrite untouched. Break the direction and you get a cycle, and cycles are how a
codebase stops being separable into parts.

**There is no `theme/`.** Styles are file-scoped `StyleSheet.create` blocks with
literal values, declared in the file that uses them. The values table lives in
`.claude/rules/design-rules.md`.

## What each folder is

| Folder | Holds | Read |
| --- | --- | --- |
| `app/` | The route table. Every file in it is a URL. | below |
| `components/` | `Button`, `Field`, `FieldError`, plus the two full-screen states that are not routes (`BootScreen`, `WelcomeOverlay`) | `components/README.md` |
| `lib/` | The Supabase client, auth, session, and the query modules | `lib/README.md` |
| `types/` | Domain types and the generated schema | `types/README.md` |

## The route table

| File | URL | Is |
| --- | --- | --- |
| `_layout.tsx` | — | The root guard. Picks `(auth)` or `(tabs)` from the session, and names where a failed guard lands |
| `(auth)/_layout.tsx` | — | Shared auth chrome: white page, gutter, back chevron |
| `(auth)/sign-in.tsx` | `/sign-in` | Email and password |
| `(auth)/sign-up.tsx` | `/sign-up` | Username, campus email, password twice |
| `(auth)/verify.tsx` | `/verify` | The 6-digit code, and resend |
| `(tabs)/_layout.tsx` | — | The floating tab pill, with Create as a raised circle |
| `(tabs)/index.tsx` | `/` | Discover — the browse feed. Placeholder |
| `(tabs)/messages.tsx` | `/messages` | Messages. Placeholder |
| `(tabs)/create.tsx` | `/create` | Post a listing. Built |
| `(tabs)/saved.tsx` | `/saved` | Saved listings. Placeholder |
| `(tabs)/uploads.tsx` | `/uploads` | Your own listings. Placeholder |
| `profile.tsx` | `/profile` | Your own profile, and sign out. Not a tab — the control that opens it floats over the bar |

**`(parentheses)` group files without adding a URL segment.** `(auth)/sign-in.tsx`
is `/sign-in`, not `/auth/sign-in`. The group exists to attach a layout.

**There is no `(auth)/index.tsx`,** deliberately — it would compete with
`(tabs)/index.tsx` for `/`. `(auth)/_layout.tsx` names `sign-in` as its anchor
instead, which decides the screen the group opens on and tells the back control
it is at the bottom of the stack. Since SDK 58 the guard fallback is named
outright with `redirectTo` in `_layout.tsx`, so it rests on neither the anchor
nor declaration order.

## Imports

Always the alias, never a long relative chain:

```ts
import { useSession } from "@/lib/verification";
import type { MyProfile } from "@/types";
import { getMyProfile } from "@/lib/queries/profiles";
```

Import from a folder's barrel (`@/types`, `@/lib/verification`), not from files
inside it, so the internal split stays free to change. `queries/` is the
exception and is imported per module.
