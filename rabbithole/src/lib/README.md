# `src/lib`

The data layer, authentication, and the formatters. Everything that is behaviour
rather than shape, and everything that talks to Supabase.

## What belongs here

| Path | Holds |
| --- | --- |
| `supabase.ts` | The client, its session storage, and token refresh |
| `verification/` | Sign-up, sign-in, the current session, and the form checks that guard them |
| `queries/` | `errors.ts` (raw failures to sentences), `rows.ts` (the view-nullability cast), and one module per thing touched: `profiles.ts`, `listings.ts`, `categories.ts`, `tags.ts`, `meetups.ts`, `storage.ts` |
| `hooks/` | `useAsync` — the lifecycle of one request |
| `utils/` | Pure helpers. No database, no React, no native modules |

Each subfolder has an `index.ts` barrel. Import `@/lib/verification`, not
`@/lib/verification/auth` — the folder's internal split stays free to change.
`queries/` is the exception and is imported per module (`@/lib/queries/listings`),
because its modules are domain areas rather than one subject.

## What does not

- **Types.** Those are `src/types`, which holds no behaviour. The split is why
  formatters live here at all.
- **Components.** `src/components`. Nothing in this folder renders — with the one
  exception of `verification/session.tsx`, which is a provider and renders only
  its children.
- **Fixtures.** Test data lives in `supabase/seed.sql`, loaded by `supabase db reset`.
- **Routing.** No module here navigates. `verification/` returns an outcome and
  the screen decides where to go, because the same `signIn` is called from two
  places that go different ways afterwards.

## The seam

`src/lib/queries/` is the single place the database is touched. Screens read
through it, never through `supabase` directly, so:

```bash
grep -rn "lib/supabase" src/app src/components
```

answers "what is reaching past the query layer?" exactly.

That indirection is what let the whole UI be built before a database existed, and
it is what will let caching, retries, or a query library be added later without
touching a screen.

`storage.ts` is the one module here that imports a native module: reading a
picked photo needs `expo-file-system`, so it cannot be loaded from plain Node
like the rest. That is a stated exception, not an oversight.

**Query and auth functions take the client as their first argument** rather than
importing the singleton. That is why the five screens currently calling a query
do import `@/lib/supabase` — to pass it in, not to query with it. The convention
keeps every function in `queries/` and `verification/auth.ts` loadable from plain
Node, which is what will make them testable without a React tree.

## Why `verification/` and not `auth/`

The folder covers more than the two auth calls: it also holds who is signed in
(`session.tsx`), the five-day staleness policy (`sessionAge.ts`), the one-shot
post-signup greeting (`welcome.ts`), and the client-side email and username
checks (`validation.ts`). Those only make sense next to each other — `signIn`
writes the stamp that `SessionProvider` reads, and `confirmSignUp` sets the flag
that `WelcomeOverlay` consumes.

Two things in here look redundant and are not:

- **`sessionAge.ts` and `welcome.ts` each import `expo-sqlite/localStorage/install`.**
  Both reach `localStorage` without importing the client, which only imports the
  Supabase types. Dropping either import leaves `localStorage` undefined at
  runtime, and nothing fails at compile time.
- **`verification/auth.ts` imports `ok`/`fail` from `../queries/errors`.** The
  result constructors are shared; the two *error translators* are not.
  `toAuthMessage` maps GoTrue codes, `toMessage` maps Postgres codes, and merging
  them would produce a map where half the keys can never fire.

## Rules that live in code here

`utils/valid_posts.ts` and `verification/validation.ts` are the same kind of
thing for two different forms: every limit in them mirrors a CHECK constraint or
an auth hook that actually enforces it. They exist so a typo costs a keystroke
instead of a round trip, and **neither may ever be the only thing standing
between a bad value and the database**.

One rule in there is worth naming because it is easy to get backwards:
`parsePriceToCents("0")` returns `0`, not `null`. Zero is a real price meaning
free. Only `null` means "that was not a price", so a caller testing falsiness
rejects every free listing.

**Still missing, deliberately.** The display side of this — `formatPrice`,
`formatRating`, `formatRelativeTime` — went in the 2026-10-18 scale-down and has
not come back, because nothing renders a listing yet. It returns with the Browse
card, and it carries three rules from `design-rules.md`: `price_cents: 0` renders
"Free" and never "$0.00"; `rating_avg: null` renders "New seller" and never
"0.0 ★", because zero stars is an accusation and no reviews is a fact; and
`rating_count` always travels with `rating_avg`, since "5.0 ★" from one review is
true and misleading at once.

Recover the originals rather than rewriting them:

```sh
git show 9180fd2^:rabbithole/src/lib/utils/format.ts
```

## Calling Supabase

The full guide is [`docs/backend/supabase-api-guide.md`](../../../docs/backend/supabase-api-guide.md).
The two things worth repeating:

**`supabase-js` returns `{ data, error }` and does not throw.** An unchecked
call is a silent failure that surfaces three screens later as an empty list.
Check `error` at every call site.

**RLS is the authorization layer.** A policy has already filtered the rows
before they reach you. Adding `.eq("seller_id", myId)` for *security* is false
comfort — add it only when you genuinely want a narrower result.
