# `src/types`

Domain types. What a listing, profile, conversation, and review *are*.

These are hand-written **ahead of** the database, not generated from it. Right now
they are the only written-down schema the project has, so they are the contract
that `src/mocks` conforms to and that the eventual SQL migration transcribes.

## The naming rule

**Data types are `snake_case`. Component props and local view models are `camelCase`.**

```ts
// Data — mirrors a database column exactly
interface Listing { price_cents: number; created_at: string }

// Props — idiomatic React
interface ListingCardProps { listing: ListingSummary; onPress: () => void }
```

This looks inconsistent and is worth the inconsistency. `supabase-js` returns rows
verbatim from PostgREST — no key transformation. Adopting camelCase for data would
mean a mapping layer on every read *and* every write, and mapping layers fail
silently: miss a field and you get `undefined`, not a compile error. Snake_case
data means a row can go straight from the wire into a component with nothing in
between, and `supabase gen types typescript` will later emit exactly these names.

The boundary is easy to state: **if the value came from or is going to the
database, it is snake_case.**

## Two kinds of type

**Row types** — `Listing`, `Profile`, `Message`. One-to-one with a table. These are
the write shape.

**View models** — `ListingSummary`, `ListingDetail`, `ConversationSummary`. What a
screen actually renders, composed from joins and aggregates. Each is a forward
declaration of a Postgres view.

Keeping them separate makes query cost visible. `ListingSummary` is the Discover
feed's cost sheet: every field on it beyond the base row is a join or an aggregate
the feed pays for on every scroll. Growing it is a performance decision, and this
split is what forces that decision to be made on purpose.

## Conventions

- **Money** is integer cents in a `*_cents` field, CAD. Never a float. `0` means
  free, not unpriced.
- **Timestamps** are ISO 8601 strings, never `Date`. That is what JSON carries and
  what PostgREST returns; converting at the model boundary guarantees drift where
  half the codebase holds strings and half holds `Date`. Parse at render.
- **Nullable means something.** `rating_avg: null` is "no reviews yet" and must not
  render as zero stars. `primary_image: null` is a listing with no photos, which
  real users will create.
- **Unions over free text** for closed sets (`ListingStatus`, `ListingCondition`),
  so adding a member produces errors everywhere it must be handled.
- **No behaviour in this folder.** No formatters, no validators, no fetchers —
  types only. Formatting belongs in `src/lib/`.

## When the database lands

`supabase gen types typescript` will generate row types from the real schema. At
that point:

1. Diff the generated rows against these hand-written ones. Every difference is
   either a schema mistake or a UI assumption that was never true — both worth
   knowing.
2. Re-export the generated rows from `index.ts`, and keep the composed view models
   here by hand, since generation cannot infer them.

Until then, this folder *is* the schema.
