# `src/lib`

The data layer, authentication, and the formatters. Everything that is behaviour
rather than shape, and everything that talks to Supabase.

## What belongs here

| Path | Holds |
| --- | --- |
| `supabase.ts` | The client, its session storage, and token refresh |
| `verification/` | Sign-up, sign-in, the current session, and the form checks that guard them |
| `queries/` | One module per domain area; the only callers of `supabase` |
| `hooks/` | `useAsync`, `useQuery`, `usePaged` — the lifecycle of a request |
| `utils/` | `format.ts` — stored value in, display string out |
| `storage.ts` | `storage_path` → URL |
| `validateListing.ts` | The Create form's draft checks |

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

`utils/format.ts` is not cosmetic. It encodes three rules from `design-rules.md`
that are easy to break in a component and hard to spot in review:

- `price_cents: 0` renders **"Free"**, never "$0.00".
- `rating_avg: null` renders **"New seller"**, never "0.0 ★". Zero stars is an
  accusation; no reviews is a fact.
- `rating_count` always travels with `rating_avg`. "5.0 ★" from one review is
  technically true and materially misleading.

Format in a component and these get re-implemented slightly differently each
time. Format here and there is one place to fix.

`validateListing.ts` and `verification/validation.ts` are the same kind of thing
for forms: every limit in them mirrors a CHECK constraint or an auth hook that
actually enforces it. They exist so a typo costs a keystroke instead of a round
trip, and neither may ever be the only thing standing between a bad value and the
database.

## Calling Supabase

The full guide is [`docs/backend/supabase-api-guide.md`](../../../docs/backend/supabase-api-guide.md).
The two things worth repeating:

**`supabase-js` returns `{ data, error }` and does not throw.** An unchecked
call is a silent failure that surfaces three screens later as an empty list.
Check `error` at every call site.

**RLS is the authorization layer.** A policy has already filtered the rows
before they reach you. Adding `.eq("seller_id", myId)` for *security* is false
comfort — add it only when you genuinely want a narrower result.
