-- Enums and the eight v1 tables.
--
-- Owns: the shape of every row the app reads or writes.
-- Does not own: indexes, triggers, policies, views, or storage — each has its
--   own migration so a failure names its own concern.
--
-- Transcribed from docs/backend/schema.md. Column names mirror src/types
-- exactly, because supabase-js returns PostgREST rows verbatim and any
-- divergence becomes a mapping layer that fails silently.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Native enums rather than text + CHECK so `supabase gen types typescript`
-- emits the union that src/types already declares by hand. A checked text
-- column generates as bare `string`, which would silently destroy
-- ListingStatus / ListingCondition and break theme.colors.listingStatus,
-- a total Record over the union.
--
-- Member order is best-to-worst on purpose; it becomes the sort order.
create type public.listing_condition as enum ('new', 'like_new', 'good', 'fair', 'poor');

-- `reserved` exists in v1 even though nothing sets it automatically — a seller
-- flips it by hand. v2's prepay flow reuses the same value, which is what keeps
-- the Stripe migration additive. See ARCHITECTURE.md.
create type public.listing_status as enum ('draft', 'active', 'reserved', 'sold', 'removed');

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- Keyed by auth.users.id; there is no separate user id.
--
-- No email column, deliberately. It lives in auth.users, and this table is
-- readable by every signed-in user because each feed card joins a seller
-- preview — exposing email here would turn the marketplace into a scraped
-- mailing list.
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  display_name    text not null check (char_length(display_name) between 1 and 60),

  -- Storage object path, not a URL. Resolved at render time.
  avatar_path     text,

  -- Timestamp rather than a boolean: VIU addresses expire at graduation, so
  -- "how stale is this verification" is a question that will be asked, and a
  -- boolean cannot answer it.
  viu_verified_at timestamptz,

  -- Denormalised from reviews by trigger. NULL means no reviews yet, which is
  -- NOT a rating of zero — the UI renders "New seller", never "0.0 stars".
  rating_avg      numeric(2,1) check (rating_avg between 1.0 and 5.0),
  rating_count    integer not null default 0 check (rating_count >= 0),

  created_at      timestamptz not null default now()
);

comment on table public.profiles is
  'Public identity and trust signals. Readable by every signed-in user; the feed joins it on every card.';
comment on column public.profiles.rating_avg is
  'NULL means no reviews yet. Must never render as 0.';

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

create table public.categories (
  id        uuid primary key default gen_random_uuid(),

  -- NULL marks a top-level category. Depth is capped at two by trigger; a
  -- CHECK constraint cannot run the subquery that asks whether the parent
  -- itself has a parent.
  parent_id uuid references public.categories (id) on delete restrict,

  -- Stable and URL-safe, so it is the identifier client code may hardcode.
  -- `name` is display copy and will be reworded.
  slug      text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name      text not null,

  -- Orders the Discover category bar. Without it the order is whatever the
  -- planner returns.
  position  integer not null default 0,

  constraint categories_not_own_parent check (id is distinct from parent_id)
);

-- ---------------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------------

create table public.listings (
  id          uuid primary key default gen_random_uuid(),
  seller_id   uuid not null references public.profiles (id) on delete cascade,

  -- restrict, not cascade: deleting a category must not take its listings.
  category_id uuid not null references public.categories (id) on delete restrict,

  -- 200, not eBay's 80. The nursing-bundle fixture in src/mocks is ~151
  -- characters and exists specifically to break naive layouts; a tighter cap
  -- would reject a fixture the mocks README forbids tidying.
  title       text not null check (char_length(title) between 1 and 200),

  -- not null default '' because the draft fixture has an empty description.
  -- An empty string models "not written yet" without the UI branching on null.
  description text not null default '' check (char_length(description) <= 4000),

  -- Integer cents, CAD. Never a float. 0 is a legitimate value meaning free,
  -- not unpriced, and renders as "Free" rather than "$0.00".
  price_cents integer not null check (price_cents >= 0),

  condition   public.listing_condition not null,
  status      public.listing_status not null default 'draft',

  -- Free text like "Bldg 300 lobby". Optional; some sellers only say so in chat.
  pickup_hint text check (pickup_hint is null or char_length(pickup_hint) <= 200),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  sold_at     timestamptz,

  -- One-directional on purpose: sold implies a timestamp, but a timestamp does
  -- not imply sold, so a listing that goes sold -> removed keeps its history.
  constraint listings_sold_has_timestamp
    check (status <> 'sold' or sold_at is not null)
);

-- ---------------------------------------------------------------------------
-- listing_images
-- ---------------------------------------------------------------------------

create table public.listing_images (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings (id) on delete cascade,

  -- Object path, not a URL, and it starts with the owner's uuid so the
  -- storage.foldername policy works. See the storage migration.
  storage_path text not null,

  -- 0-based. Position 0 is the cover image. A listing with no rows here is
  -- legitimate and common for cheap items.
  position     integer not null check (position >= 0),

  -- Deferrable because reordering photos swaps two positions inside one
  -- transaction, and a non-deferrable constraint fails mid-swap.
  constraint listing_images_position_unique
    unique (listing_id, position) deferrable initially deferred
);

-- ---------------------------------------------------------------------------
-- saved_listings
-- ---------------------------------------------------------------------------

-- Composite primary key makes saving idempotent: tapping the bookmark twice is
-- an upsert, not a duplicate row.
create table public.saved_listings (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------

-- A conversation is always about a listing. There is no general DM surface,
-- which keeps moderation tractable and makes (listing_id, buyer_id) a natural
-- uniqueness key.
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.listings (id) on delete cascade,
  buyer_id        uuid not null references public.profiles (id) on delete cascade,

  -- Denormalised from the listing so inbox queries need not join to find the
  -- other party.
  seller_id       uuid not null references public.profiles (id) on delete cascade,

  -- Maintained by trigger on message insert. The inbox sorts on this.
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),

  -- What makes "Message seller" idempotent: tapping it repeatedly reopens the
  -- same thread rather than spawning duplicates.
  constraint conversations_one_thread_per_buyer unique (listing_id, buyer_id),
  constraint conversations_not_self check (buyer_id <> seller_id)
);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 2000),
  created_at      timestamptz not null default now(),

  -- NULL until the recipient opens the thread. Only meaningful to the
  -- non-sender, and written through mark_conversation_read() rather than a
  -- client UPDATE.
  read_at         timestamptz
);

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------

-- Reviews hang off a listing rather than a user pair, so selling someone two
-- textbooks yields two reviewable events rather than one overwritten opinion.
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,

  -- Range enforced here rather than as a TS literal union, because PostgREST
  -- returns a plain number and a union would force a cast on every read.
  rating      integer not null check (rating between 1 and 5),

  -- Optional. A star-only review is valid.
  body        text check (body is null or char_length(body) <= 1000),
  created_at  timestamptz not null default now(),

  constraint reviews_one_per_reviewer_per_listing unique (listing_id, reviewer_id),
  constraint reviews_not_self check (reviewer_id <> reviewee_id)
);
