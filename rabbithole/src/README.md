# `src`

The application. Five folders, and one rule that explains all of them.

## The rule: dependencies point downward

```
app/         routes and screens      → may import components, lib, theme, types
components/  shared UI               → may import lib, theme, types
lib/         data, formatters        → may import theme, types
theme/       design tokens           → may import types
types/       domain types            → imports nothing
```

Nothing imports *upward*. `theme/` knows nothing about screens, so a screen
cannot quietly bend a token. `types/` knows nothing about React, so it survives a
UI rewrite untouched. Break the direction and you get a cycle, and cycles are how
a codebase stops being separable into parts.

## What each folder is

| Folder | Holds | Read |
| --- | --- | --- |
| `app/` | The route table. Every file in it is a URL. | below |
| `components/` | Shared UI. **Not created yet.** | — |
| `lib/` | The Supabase client, queries, session, formatters | [`lib/README.md`](lib/README.md) |
| `theme/` | Light and dark design tokens | [`theme/README.md`](theme/README.md) |
| `types/` | Domain types — hand-written, plus the generated schema | [`types/README.md`](types/README.md) |

---

## `app/` — the router

**`src/app/` *is* the route table.** There is no route config file anywhere. You
add a route by adding a file; you remove one by deleting the file.

| File | URL | What it is |
| --- | --- | --- |
| `_layout.tsx` | — | Root layout. Mounts `SessionProvider` and the auth guard. |
| `(auth)/_layout.tsx` | — | Keyboard handling, the screen gutter, the auth stack |
| `(auth)/sign-up.tsx` | `/sign-up` | Name, email, password. The entry point. |
| `(auth)/sign-in.tsx` | `/sign-in` | Email and password |
| `(auth)/verify.tsx` | `/verify` | The 6-digit confirmation code |
| `(tabs)/_layout.tsx` | — | The five-tab bar |
| `(tabs)/index.tsx` | `/` | Discover — the feed |
| `(tabs)/saved.tsx` | `/saved` | Saved listings |
| `(tabs)/create.tsx` | `/create` | Post a listing |
| `(tabs)/messages.tsx` | `/messages` | Conversations |
| `(tabs)/profile.tsx` | `/profile` | Account |

### Three naming conventions that do real work

**`_layout.tsx` is not a route.** It wraps every route in its directory and
decides how they are *arranged* — a stack, tabs, or a plain wrapper. The
underscore is what keeps it out of the URL table.

**`(parentheses)` group files without adding a URL segment.** `(tabs)/saved.tsx`
serves `/saved`, not `/tabs/saved`. The group exists to attach a layout, not to
namespace URLs.

That creates the one trap in this tree: `(auth)` deliberately has **no
`index.tsx`**, because a group adds no segment, so `(auth)/index.tsx` and
`(tabs)/index.tsx` would both claim `/`. `(auth)/_layout.tsx` declares its entry
point with `unstable_settings = { anchor: "sign-up" }` instead.

**`[id].tsx` is a dynamic segment.** None exist yet; `/listings/[id]` is coming.

### `.tsx` versus `.ts`

`.tsx` only where JSX appears. Every file in `app/` returns markup, so all of
them are `.tsx`. In `lib/`, only `session.tsx` is — because it renders a context
provider. Everything else there is pure logic and stays `.ts`.

### Route conventions

- `Tabs` is imported from **`expo-router/js-tabs`**. Importing it from
  `expo-router` directly is deprecated in SDK 57.
- `typedRoutes` is on, so route strings are checked against the tree. A new route
  does not typecheck until its file exists.
- Every route file uses `export default function` — expo-router requires a
  default export per route.

---

## Conventions that apply everywhere

### Data is `snake_case`, props are `camelCase`

```ts
interface Listing { price_cents: number; created_at: string }              // data
interface ListingCardProps { listing: ListingSummary; onPress: () => void } // props
```

This looks inconsistent and is worth the inconsistency. `supabase-js` returns
PostgREST rows **verbatim** — no key transformation. Adopting camelCase for data
would mean a mapping layer on every read *and* every write, and mapping layers
fail silently: miss a field and you get `undefined`, not a compile error.

The boundary: **if the value came from or is going to the database, it is
snake_case.**

### Import from the barrel, never from inside a folder

```ts
import { useTheme } from "@/theme";              // yes
import { useTheme } from "@/theme/useTheme";     // no
```

The barrel is the public surface. Importing past it freezes a folder's internal
file layout, because any reshuffle breaks callers.

### Nothing hardcoded from the design system

No colour, spacing, radius, or font size is ever a literal. Everything comes from
`useTheme()`. The single sanctioned exception is `app.json`, which carries
`#208AEF` because Expo config cannot import TypeScript — and both values are
mirrored in `theme/palette.ts`.

### Static styles at the bottom, theme values inline

```tsx
<View style={[styles.card, { backgroundColor: colors.surface }]} />
// ...
const styles = StyleSheet.create({ card: { flex: 1, padding: 0 } });
```

`StyleSheet.create` holds only values that never change. Anything that depends on
the colour scheme has to be inline, because it is recomputed when the scheme
flips underneath the app at runtime.

### No `useMemo`, `useCallback`, or `React.memo`

`reactCompiler` is enabled in `app.json`. It handles memoisation, and
hand-memoising can defeat it. The compiler also bails **silently** on Rules of
React violations, so a broken rule costs the optimisation with no error to say so.

### Every file carries a module header

```ts
/**
 * <What this module is.>
 *
 * Owns: <the responsibility it holds>
 * Does not own: <the neighbouring responsibility it deliberately refuses>
 */
```

The "does not own" line is the valuable half. It stops files accreting unrelated
logic and points a cold reader somewhere else.

---

## Why this shape

**Because each layer has exactly one reason to change.** A design tweak touches
`theme/`. A schema change touches `types/`. A new screen touches `app/`. When
those are separate, a change is a change; when they are tangled, every change is
a negotiation.

Two specific separations are worth naming:

**Screens never call `supabase` directly.** They go through `lib/queries/`. That
indirection is what let the whole UI be built before a database existed, and it
is what will let caching, retries, or a query library be added later without
touching a screen.

**`types/` holds no behaviour.** No formatters, no validators, no fetchers. That
is why `lib/format.ts` exists: rules like "`price_cents: 0` renders Free" and
"`rating_avg: null` renders New seller" need a home, and a component is the wrong
one — format in three components and you get three slightly different
implementations of the same rule.

## Where the fixtures went

`src/mocks/` held twelve deliberately awkward listings — a free item, a photoless
listing, a null pickup hint, a 151-character title, a seller with no reviews. They
were load-bearing while there was no database.

They now live in `supabase/seed.sql`, with the same edge cases and the same
comments explaining what each one is there to break, loaded into real Postgres by
`supabase db reset`. Testing against the seed exercises the real query path,
policies included, which a fixture array never could.
