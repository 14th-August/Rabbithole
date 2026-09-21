# Calling Supabase from Rabbithole

How the client talks to the database. Companion to [`roadmap.md`](roadmap.md) and
[`schema.md`](schema.md).

The defining constraint: **there is no custom API layer.** The Expo app speaks to
PostgREST directly and **RLS is the authorization layer**. Every rule about who may
read or write a row is a policy in the database, not a check in a controller. That
buys enormous speed at the cost of pushing authorization into SQL, where it is
harder to unit test — so the RLS test procedure in `roadmap.md` is not optional
ceremony.

---

## Client setup

**Expo's guidance wins over Supabase's, where they disagree.** They currently do:
Expo's SDK 57 guide uses `expo-sqlite`'s `localStorage` shim as the auth storage
adapter, while Supabase's React Native quickstart still says
`@react-native-async-storage/async-storage` plus `react-native-url-polyfill`.
`AGENTS.md` says read the versioned Expo docs first, so that is the tiebreak. Expo
also states the URL polyfill is unnecessary in Expo projects.

```ts
// src/lib/supabase.ts
import "expo-sqlite/localStorage/install";

import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      // There is no browser URL to parse a session out of on native.
      detectSessionInUrl: Platform.OS === "web",
    },
  },
);

// Nothing does this for you. Without it, tokens go stale while backgrounded and
// the next query after a long pause fails with a confusing 401.
AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
```

### Do not use `expo-secure-store` as the session adapter

SecureStore caps values at 2048 bytes. A Supabase session — JWT plus the user
object — routinely exceeds that, so it fails by silently dropping the session and
presenting as random sign-outs. The `expo-sqlite` store has no practical ceiling.

This is a trap worth naming because SecureStore is the intuitively correct choice
("sessions are secrets, store them securely") and it is wrong.

---

## Query patterns

### Errors do not throw

`supabase-js` returns `{ data, error }`. It does **not** throw. An unchecked call
is a silent failure, not a crash — which is worse, because it surfaces three screens
later as an empty list.

```ts
const { data, error } = await supabase.from("listings").select("*");
if (error) throw new Error(error.message);   // or surface it in an error state
```

Every call site checks `error`. There are no exceptions to this.

### One row versus maybe-one row

- `.single()` — errors if the result is not exactly one row. Use when the row must
  exist: fetching your own profile after sign-in.
- `.maybeSingle()` — returns `data: null` with no error on zero rows. Use when
  absence is a legitimate answer: "has this user saved this listing".

Reaching for `.single()` where absence is normal turns an empty state into an error
state, which is a design-rule violation as much as a bug.

### Reading the feed

`ListingSummary` is a view, so the feed is a flat select:

```ts
const { data, error } = await supabase
  .from("listing_summaries")
  .select("*")
  .in("status", ["active", "reserved"])
  .order("created_at", { ascending: false })
  .range(from, from + PAGE - 1);
```

`reserved` is included on purpose — a held item is still worth seeing, and hiding
it makes the marketplace look emptier than it is.

### Reading a detail screen

`ListingDetail` needs a nested category and an ordered image array, which is what
PostgREST embedding is for:

```ts
const { data, error } = await supabase
  .from("listings")
  .select(`
    *,
    seller:profiles!listings_seller_id_fkey (
      id, display_name, avatar_path, rating_avg, rating_count
    ),
    category:categories!listings_category_id_fkey ( id, parent_id, slug, name, position ),
    images:listing_images ( id, listing_id, storage_path, position )
  `)
  .eq("id", listingId)
  .order("position", { referencedTable: "listing_images", ascending: true })
  .single();
```

Name the foreign key explicitly when a table has more than one FK to the same
target — `conversations` has both `buyer_id` and `seller_id` pointing at `profiles`,
and PostgREST cannot guess which you meant.

### Never re-implement RLS on the client

```ts
// Pointless as security. The policy already did this.
.eq("seller_id", myUserId)
```

Adding an ownership filter for *security* is false comfort; the policy runs first
and the client cannot see rows it filters out. Add such a filter only when you
genuinely want a narrower result set — "my listings" on the Profile tab is a real
use, "so other people can't see it" is not.

### Pagination

`.range()` offset paging for v1. Keyset pagination is correct at scale, but with a
few hundred users and a few hundred listings the crossover is years away and
`.range()` is one line. Recorded here as a known future change rather than
pre-built.

### When to use an RPC instead

Prefer `.rpc()` when a write needs more than one statement, or a privilege the
client should not hold. The concrete case in this schema is
`mark_conversation_read` — updating `read_at` on messages you did not send.

```ts
const { data, error } = await supabase.rpc("mark_conversation_read", {
  p_conversation_id: conversationId,
});
```

**Any `SECURITY DEFINER` function must check membership itself.** It bypasses RLS
by definition, so the policy that would have protected the table is not running.

---

## Storage

Paths start with the owner's uuid so the folder-name policy works:

```ts
const path = `${userId}/${listingId}/${position}.jpg`;

const { error } = await supabase.storage
  .from("listing-images")
  .upload(path, file, { contentType: "image/jpeg", upsert: true });

// Buckets are public-read, so this is a plain URL with no expiry to manage.
const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
```

`storage_path` is stored in the database; the URL is derived at render time by a
`src/lib/storage.ts` helper. Never store a URL in a column — it pins you to a
project ref and a CDN hostname.

---

## Generated types

```bash
npx supabase gen types typescript --local > src/types/database.ts
```

Generated rows are a **second source, not a replacement**. Per
`src/types/README.md`:

1. Diff the generated rows against the hand-written ones. Every difference is
   either a schema mistake or a UI assumption that was never true.
2. Re-export generated rows from the barrel; keep the composed view models
   (`ListingSummary`, `ListingDetail`, `ConversationSummary`) hand-written, because
   generation cannot infer a `jsonb_build_object` shape.

Regenerate after every migration. A stale `database.ts` that still compiles is the
failure mode this is meant to prevent.

---

## Realtime

Not free. It needs the table added to the `supabase_realtime` publication, and it
costs per-message plus peak connections.

Worth it for the Messages tab. Not worth it for the feed — nobody needs a listing
to appear mid-scroll. Ship the inbox on plain queries first and add the subscription
as a separate, reversible change.

```sql
alter publication supabase_realtime add table public.messages;
```

---

## Where this code lives

`src/lib/queries/` is the single place fixtures become `supabase-js` calls. No
component imports `@/mocks` directly, and
`grep -r "@/mocks" src/app src/components` must stay empty — that command is the
answer to "what is still faked".

`src/lib/` also owns the formatters the design rules require and `src/types` is
forbidden to hold: `formatPrice` (0 → "Free"), `formatRating` (null → "New seller"),
`formatRelativeTime`.

---

## Things that will bite

| Trap | What happens | Fix |
| --- | --- | --- |
| Default SMTP is **2 emails/hour** | Signup appears broken during testing | Custom SMTP before Phase 4 |
| `expo-secure-store` as session storage | Random sign-outs | `expo-sqlite` localStorage shim |
| Missing `AppState` listener | 401 after the app is backgrounded | Wire `startAutoRefresh` / `stopAutoRefresh` |
| View without `security_invoker = on` | Every draft listing published | Set it on `listing_summaries` |
| `SECURITY DEFINER` without a membership check | Full-table write from any caller | Check membership first, always |
| Unchecked `error` | Empty list three screens later | Check `error` at every call site |
| Bare `auth.uid()` in a policy | Re-evaluated per row | Wrap as `(select auth.uid())` |
| `service_role` key in the client | Total RLS bypass | It never leaves the server. v1 never needs it. |
