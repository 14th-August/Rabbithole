# `src/lib`

The data layer and the formatters. Everything that is behaviour rather than
shape, and everything that talks to Supabase.

## What belongs here

| File | Holds |
| --- | --- |
| `supabase.ts` | The client, its session storage, and token refresh |
| `format.ts` | `formatPrice`, `formatRating`, `formatRelativeTime`, `formatCondition` |
| `session.tsx` | `SessionProvider` / `useSession()` — who is signed in |
| `storage.ts` | `storage_path` → URL |
| `queries/` | One module per domain area; the only callers of `supabase` |

## What does not

- **Types.** Those are `src/types`, which holds no behaviour. The split is why
  formatters live here at all.
- **Components.** `src/components`. Nothing in this folder renders.
- **Fixtures.** Test data lives in `supabase/seed.sql`, loaded by `supabase db reset`.

## The seam

`src/lib/queries/` is the single place the database is touched. Screens read
through it, never through `supabase` directly, so:

```bash
grep -rn "lib/supabase" src/app src/components
```

answers "what is reaching past the query layer?" exactly. It must stay empty.

That indirection is what let the whole UI be built before a database existed, and
it is what will let caching, retries, or a query library be added later without
touching a screen.

## Rules that live in code here

`format.ts` is not cosmetic. It encodes three rules from `design-rules.md` that
are easy to break in a component and hard to spot in review:

- `price_cents: 0` renders **"Free"**, never "$0.00".
- `rating_avg: null` renders **"New seller"**, never "0.0 ★". Zero stars is an
  accusation; no reviews is a fact.
- `rating_count` always travels with `rating_avg`. "5.0 ★" from one review is
  technically true and materially misleading.

Format in a component and these get re-implemented slightly differently each
time. Format here and there is one place to fix.

## Calling Supabase

The full guide is [`docs/backend/supabase-api-guide.md`](../../../docs/backend/supabase-api-guide.md).
The two things worth repeating:

**`supabase-js` returns `{ data, error }` and does not throw.** An unchecked
call is a silent failure that surfaces three screens later as an empty list.
Check `error` at every call site.

**RLS is the authorization layer.** A policy has already filtered the rows
before they reach you. Adding `.eq("seller_id", myId)` for *security* is false
comfort — add it only when you genuinely want a narrower result.
