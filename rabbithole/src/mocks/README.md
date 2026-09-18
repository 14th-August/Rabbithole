# `src/mocks`

Development fixtures. Everything here conforms to `@/types`, so the UI can be
built and reviewed with zero backend — no Supabase project, no migrations, no RLS
debugging while layout is still moving.

## Usage

```tsx
import { mockFeedListings } from "@/mocks";

<FlatList data={mockFeedListings} renderItem={({ item }) => <ListingCard listing={item} />} />
```

## What's here

| File | Holds |
| --- | --- |
| `categories.ts` | Two-level category tree |
| `profiles.ts` | Five users, including `mockCurrentUser` |
| `listings.ts` | Twelve listings + the slices each screen consumes |
| `conversations.ts` | Four threads + derived inbox rows |
| `time.ts` | `minutesAgo` / `hoursAgo` / `daysAgo` |

## Design rules

**Fixtures are authored at full fidelity and narrower shapes are derived.**
`ListingSummary` rows come from `ListingDetail` via `toListingSummary`, and inbox
rows come from the message log. The feed and the detail screen therefore cannot
disagree about a price, and `unread_count` cannot drift from the thread it counts.
Those derivation functions are also the client-side stand-ins for the Postgres
views the real queries will use — when the database lands they disappear rather
than needing rewriting.

**Fixtures exist to be awkward.** Tidy data hides the layout work. This set
deliberately includes a free item, a three-line title, a listing with no photos,
a seller with no reviews and no avatar, a sold item, a reserved item, a draft, a
`null` pickup hint, an empty conversation, and a thread where the current user is
the seller rather than the buyer. Each is annotated at its definition with the
case it covers. **If you fix a layout bug that a fixture surfaced, do not tidy the
fixture — that is the fixture doing its job.**

**Time is relative, not absolute.** `NOW` is captured once at module load, so a
run is internally consistent while "posted 18 minutes ago" keeps reading correctly
whenever the app is opened. Pin `NOW` to a fixed epoch when snapshot tests arrive.

## Known gap: images do not resolve

`storage_path` values are Supabase Storage object paths, exactly as the real
column will be — and Storage does not exist yet, so **nothing renders**. Until it
does, image components should fall back to the `colors.surfaceSunken` placeholder.
That fallback is needed in production anyway (listings with no photos are real, and
`mockListings` includes one), so building it now is not throwaway work.

Resolving a path to a URL will be a helper in `src/lib/`, not a change here.

## Retiring this folder

Mocks are load-bearing until the schema lands, then they become test fixtures. The
transition is a single rule: **no component imports from `@/mocks` directly.**
Screens read through a hook or data module; that module is the one place fixtures
get swapped for `supabase-js` calls. Because the barrel is the only import surface,
`grep -r "@/mocks" src/app src/components` answers "what is still faked?" exactly.
