# Technical defaults

Stack-level rules. When a choice is not specified, these are the answer.
Loaded into every session via `AGENTS.md`.

## Platform

| Thing | Version | Notes |
| --- | --- | --- |
| Expo SDK | `~57.0.20` | Read https://docs.expo.dev/versions/v57.0.0/ before using any API |
| React Native | `0.86.3` | |
| React | `19.2.3` | |
| TypeScript | `~6.0.3` | `strict: true` |
| Node | ≥ 22.13 | Required by SDK 57 |

**Add dependencies with `npx expo install <pkg>`, never `npm install`.** Expo pins
packages to SDK-compatible ranges; hand-bumping a native module past the supported
range breaks the build in ways that surface at runtime, not install time. Upgrade
with `npx expo install --check`, never `npm update`.

## React

- **`reactCompiler` is enabled** (`app.json` → `experiments`). Do **not** write
  `useMemo`, `useCallback`, or `React.memo`, and do not comment about memoisation.
  The compiler handles it, and hand-memoising can defeat it.
- Follow the Rules of React strictly — no mutation during render, no conditional
  hooks. The compiler bails **silently** on violations, so a broken rule costs you
  the optimisation with no error to tell you.
- Function components with named exports. `export default function Screen()` for
  route files, because expo-router requires a default export per route.

## Routing

- `src/app/` **is** the route table. Every file in it is a URL; nothing else is.
- `_layout.tsx` arranges its directory and is not itself a route.
- `(group)/` adds no URL segment. `[id].tsx` is a dynamic segment.
- Import `Tabs` from **`expo-router/js-tabs`** — importing it from `expo-router`
  directly is deprecated in SDK 57.
- `typedRoutes` is on, so route strings are checked against the tree. A missing or
  stale `.expo/` means route types will not resolve; `npx expo start` regenerates them.

## Imports

```ts
import { useTheme } from "@/theme";          // → src/theme
import type { ListingSummary } from "@/types";
import { getFeed } from "@/lib/queries/listings";
import icon from "@/assets/images/tabIcons/home.png";
```

Always the alias, never a long relative chain. Import from a folder's barrel
(`@/types`), not from files inside it (`@/types/listing`), so the internal split
stays free to change.

## Data conventions

These exist so the hand-written types and the eventual database agree without a
translation layer. Breaking one means writing a mapping layer, and mapping layers
fail silently.

- **Domain data types are `snake_case`**, mirroring database columns exactly.
  Component props and local view models are `camelCase`. The boundary: if the value
  came from or is going to the database, it is snake_case.
- **Money is integer cents** in a `*_cents` field, CAD. Never a float, never a
  pre-formatted string. `0` means free, not unpriced.
- **Timestamps are ISO 8601 strings**, never `Date` objects. That is what JSON
  carries and what PostgREST returns. Parse at render.
- **Nullable carries meaning.** `rating_avg: null` is "no reviews yet" and must not
  render as zero. `primary_image: null` is a listing with no photos — a real case.
- **Closed sets are unions**, not free text, so adding a member produces errors
  everywhere it must be handled.
- **No behaviour in `src/types`.** Types only. Formatters and validators go in `src/lib`.

## Layering

```
src/app/        routes and screens
src/components/ shared UI
src/theme/      design tokens          ← no imports from app/components
src/types/      domain types           ← no imports from anything but itself
src/lib/        client, queries, formatters
```

- **No screen calls `supabase` directly.** Screens read through `src/lib/queries/`,
  which is the single place the database is touched. `grep -rn "lib/supabase" src/app
  src/components` must stay empty.
- **`src/theme/palette.ts` is private to `src/theme`.** Raw ramps never leave.

## Documentation

**Module header on every file:**

```ts
/**
 * <What this module is.>
 *
 * Owns: <the responsibility it holds>
 * Does not own: <the neighbouring responsibility it deliberately refuses>
 */
```

The "does not own" line is the valuable half — it stops files accreting unrelated
logic and points a cold reader somewhere else.

**TSDoc on every exported symbol.** These render on IDE hover, so they pay off
continuously. Document what a prop *means*, not what its type already says.

**"Why" comments at non-obvious decisions**, never narration:

```ts
// BAD  — restates the code
// map over the listings
// GOOD — explains a decision the code cannot
// Denormalised from reviews; sorting the feed on a correlated subquery
// would need an index we don't have.
```

**A `README.md` in each `src/*` folder** saying what belongs there and what does not.

Prefer a precise type and a good name over prose. TypeScript is the documentation
that cannot go stale.

## Style

Double quotes, 2-space indent, semicolons. `StyleSheet.create` at the bottom of
the file. Static layout in the StyleSheet, theme-dependent values inline.

## Not yet chosen

Do not introduce these without asking — each is an architectural decision, not a
dependency:

- State manager (Zustand / Redux / Jotai)
- Data fetching (TanStack Query / SWR)
- Forms and validation (react-hook-form / zod)
- Backend client (`@supabase/supabase-js` is planned, not installed)
- Anything payment-related — see `ARCHITECTURE.md`, deferred to v2 on purpose
