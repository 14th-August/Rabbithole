-- Enums and the seventeen v1 tables.
--
-- Owns: the shape of every row the app reads or writes.
-- Does not own: indexes, triggers, policies, views, storage, or the order state
--   machine — each has its own migration so a failure names its own concern.
--
-- Transcribed from the "VIU Marketplace — ER & Use Cases Overview (v1)"
-- requirements doc (2026-10-03). Column names mirror src/types exactly, because
-- supabase-js returns PostgREST rows verbatim and any divergence becomes a
-- mapping layer that fails silently.
--
-- Three decisions in this file are deliberate departures from the requirements
-- doc. Each is marked DEPARTURE with its reason, so the next reader can reverse
-- it on purpose rather than by accident.

-- citext for username and tag name: "MayaC" and "mayac" must collide, and a
-- lower() unique index would make every lookup remember to lower() too.
create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Native enums rather than text + CHECK so `supabase gen types typescript`
-- emits the union that src/types already declares by hand. A checked text
-- column generates as bare `string`, which would silently destroy
-- ListingStatus / ListingCondition and break theme.colors.listingStatus,
-- a total Record over the union.

-- VIU's four teaching locations. UNVERIFIED — the requirements doc says
-- "confirm the campus list against VIU's actual locations" and that has not
-- been done. Adding a member later is `alter type ... add value`, which is
-- cheap; renaming one is not, so the slugs avoid abbreviations.
create type public.campus as enum (
  'nanaimo',
  'cowichan',
  'powell_river',
  'parksville_qualicum'
);

-- Member order is best-to-worst on purpose; it becomes the sort order.
create type public.listing_condition as enum ('new', 'like_new', 'good', 'fair', 'poor');

-- DEPARTURE: the requirements doc lists (active, reserved, sold, removed,
-- expired) and drops `draft`. `draft` is kept because the Post Listing screen
-- needs a pre-publish state, the RLS policy that hides unpublished work from
-- other users is written against it, and the seed carries a draft fixture on
-- purpose. Removing it is a product decision about whether a half-written
-- listing can exist, not a schema cleanup.
--
-- `expired` is new, and `reserved` now has an automatic writer: an accepted
-- order. v2's prepay flow reuses the same value, which is what keeps the Stripe
-- migration additive. See ARCHITECTURE.md.
create type public.listing_status as enum (
  'draft', 'active', 'reserved', 'sold', 'removed', 'expired'
);

-- The order state machine, as drawn in the requirements doc. Terminal states
-- are declined / cancelled / expired / completed.
create type public.order_status as enum (
  'requested', 'accepted', 'completed', 'declined', 'cancelled', 'expired'
);

-- Off-platform payment only in v1. A `card` member is NOT added speculatively:
-- adding one when Stripe lands is a single `alter type`, and an unused member
-- today is a member every exhaustive switch in the client has to handle.
create type public.payment_method as enum ('cash', 'etransfer');

-- `deleted` is an anonymised tombstone, not a removed row — see the retention
-- rule in the RLS migration. Orders and reviews outlive the account.
create type public.account_status as enum ('active', 'suspended', 'banned', 'deleted');

-- Drawn from design-rules.md's prohibited list plus the conduct cases. The doc
-- does not enumerate these; this set is proposed, not transcribed.
create type public.report_reason as enum (
  'prohibited_item',      -- alcohol, cannabis, vapes, weapons, medication, animals
  'academic_dishonesty',  -- completed assignments, essay services, exam material
  'scam_or_fraud',
  'counterfeit',
  'harassment',
  'spam',
  'other'
);

create type public.report_status as enum ('open', 'reviewing', 'actioned', 'dismissed');

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- Keyed by auth.users.id; there is no separate user id.
--
-- No email column and no real-name column, deliberately. The email lives in
-- auth.users, and this table is readable by every signed-in user because each
-- feed card joins a seller preview — exposing either here would turn a
-- pseudonymous marketplace into a scraped campus directory.
create table public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,

  -- Randomly generated at signup and never derived from the email, because
  -- VIU addresses are Preferred.Lastname@my.viu.ca and a username derived from
  -- one would publish the student's real name. See generate_username() in the
  -- triggers migration.
  username                extensions.citext not null unique
                            check (username ~ '^[A-Za-z0-9_]{3,20}$'),

  bio                     text check (bio is null or char_length(bio) <= 300),

  -- Nullable: a user who has not said which campus they are on still gets a
  -- feed. Listings, which are browsed by campus, do require one.
  campus                  public.campus,

  -- Storage object path, not a URL. Resolved at render time.
  avatar_path             text,

  -- Written by the client on app foreground, exposed through public_profiles
  -- only when show_last_active is true. The flag is on the row rather than in
  -- a settings table because the view has to read it on every profile fetch.
  last_active_at          timestamptz,
  show_last_active        boolean not null default true,
  allow_follows           boolean not null default true,

  -- Which push notifications this user has opted into. Use case 44 ("manage
  -- which notifications they receive") has nowhere else to live — the ER
  -- diagram has no preferences table, and user_devices holds tokens, not
  -- choices. Booleans on the row, because every send path already reads the
  -- profile. Follow notifications are per-follow (follows.notify) and so are
  -- not duplicated here.
  notify_messages         boolean not null default true,
  notify_orders           boolean not null default true,
  notify_new_listings     boolean not null default true,
  notify_listing_expiry   boolean not null default true,

  -- Trust signals. All server-written: the column grants in the RLS migration
  -- are what stop a client raising its own reputation.
  completed_sales         integer not null default 0 check (completed_sales >= 0),

  -- 0.000–1.000, not a percentage, so no one has to remember the scale.
  -- NULL means "not enough conversations to say", which is not 0% — the same
  -- distinction rating_avg makes, for the same reason.
  response_rate           numeric(4,3) check (response_rate between 0 and 1),
  median_response_minutes integer check (median_response_minutes >= 0),

  -- Sum and count rather than a stored average: adding a review is then a
  -- two-integer increment that cannot drift, and the average is derived.
  rating_sum              integer not null default 0 check (rating_sum >= 0),
  rating_count            integer not null default 0 check (rating_count >= 0),

  -- Generated, so it cannot disagree with its inputs. NULL when there are no
  -- reviews, which is NOT a rating of zero — the UI renders "New seller",
  -- never "0.0 stars". A default of 0 here would delete that distinction.
  rating_avg              numeric(2,1) generated always as (
                            case
                              when rating_count = 0 then null
                              else round(rating_sum::numeric / rating_count, 1)
                            end
                          ) stored,

  status                  public.account_status not null default 'active',

  -- Timestamp rather than a boolean: VIU addresses expire at graduation, so
  -- "how stale is this verification" is a question that will be asked, and a
  -- boolean cannot answer it.
  viu_verified_at         timestamptz,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table public.profiles is
  'Pseudonymous public identity and trust signals. Readable by every signed-in user through public_profiles; the feed joins it on every card.';
comment on column public.profiles.rating_avg is
  'Generated from rating_sum / rating_count. NULL means no reviews yet and must never render as 0.';
comment on column public.profiles.username is
  'Randomly generated at signup, never derived from the VIU email, which contains the student''s real name.';

-- ---------------------------------------------------------------------------
-- follows
-- ---------------------------------------------------------------------------

-- Composite primary key makes following idempotent: tapping Follow twice is an
-- upsert, not a duplicate row.
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followed_id uuid not null references public.profiles (id) on delete cascade,

  -- Per-follow, not per-account: following twelve sellers and wanting alerts
  -- from two of them is the normal case.
  notify      boolean not null default true,

  created_at  timestamptz not null default now(),

  primary key (follower_id, followed_id),
  constraint follows_not_self check (follower_id <> followed_id)
);

-- ---------------------------------------------------------------------------
-- blocks
-- ---------------------------------------------------------------------------

-- A block is one-directional in storage and two-directional in effect: the
-- trigger and policies check both orderings, so neither party can reach the
-- other. Storing it one way keeps "who blocked whom" answerable, which
-- moderation needs.
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

-- ---------------------------------------------------------------------------
-- user_devices
-- ---------------------------------------------------------------------------

-- Push tokens. Server-only: there is no SELECT policy at all, and clients
-- register through register_device() rather than writing here. A readable push
-- token table is a way to message every user in the app from a stolen anon key.
create table public.user_devices (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,

  -- Unique across all users, not per user: a shared or re-flashed phone hands
  -- the same token to a second account, and the newest registration wins.
  expo_push_token text not null unique check (char_length(expo_push_token) between 1 and 255),

  platform        text not null check (platform in ('ios', 'android', 'web')),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

create table public.categories (
  id                 uuid primary key default gen_random_uuid(),

  -- NULL marks a top-level category. Depth is capped at two by trigger; a
  -- CHECK constraint cannot run the subquery that asks whether the parent
  -- itself has a parent.
  parent_category_id uuid references public.categories (id) on delete restrict,

  -- Stable and URL-safe, so it is the identifier client code may hardcode.
  -- `name` is display copy and will be reworded.
  slug               text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name               text not null check (char_length(name) between 1 and 60),

  -- Orders the Discover category bar. Seeded in gaps of 10 so a category can
  -- be inserted between two others without renumbering the row.
  position           integer not null default 0,

  constraint categories_not_own_parent check (id is distinct from parent_category_id)
);

-- ---------------------------------------------------------------------------
-- tags
-- ---------------------------------------------------------------------------

-- Free-form, user-created, and shared across listings. Distinct from
-- categories, which are administered: a tag is "biol121", a category is
-- "Textbooks > Biology".
create table public.tags (
  id   uuid primary key default gen_random_uuid(),
  name extensions.citext not null unique check (name ~ '^[a-z0-9][a-z0-9-]{0,29}$')
);

-- ---------------------------------------------------------------------------
-- meetup_spots
-- ---------------------------------------------------------------------------

-- An administered list of safe, public, named places per campus. Curated
-- rather than free text because the safety value is entirely in the place
-- being public and findable — "my place" typed into a text box is the outcome
-- this table exists to prevent.
create table public.meetup_spots (
  id          uuid primary key default gen_random_uuid(),
  campus      public.campus not null,
  name        text not null check (char_length(name) between 1 and 80),
  description text check (description is null or char_length(description) <= 300),

  -- Retired spots keep their rows, because orders reference them.
  is_active   boolean not null default true,

  constraint meetup_spots_unique_per_campus unique (campus, name)
);

-- ---------------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------------

create table public.listings (
  id                     uuid primary key default gen_random_uuid(),

  -- restrict, not cascade: a completed order references this listing, and the
  -- retention rule keeps transaction history when an account is deleted. A
  -- deleted account's profile is anonymised instead.
  seller_id              uuid not null references public.profiles (id) on delete restrict,

  -- The primary category, and the one the Discover drill-down filters on.
  -- Secondary categories live in listing_categories.
  category_id            uuid not null references public.categories (id) on delete restrict,

  default_meetup_spot_id uuid references public.meetup_spots (id) on delete set null,

  -- 200, not eBay's 80. The nursing-bundle fixture in src/mocks is ~151
  -- characters and exists specifically to break naive layouts; a tighter cap
  -- would reject a fixture the mocks README forbids tidying.
  title                  text not null check (char_length(title) between 1 and 200),

  -- not null default '' because the draft fixture has an empty description.
  -- An empty string models "not written yet" without the UI branching on null.
  description            text not null default '' check (char_length(description) <= 4000),

  -- Integer cents, CAD. Never a float. 0 is a legitimate value meaning free,
  -- not unpriced, and renders as "Free" rather than "$0.00".
  price_cents            integer not null check (price_cents >= 0),

  condition              public.listing_condition not null,
  status                 public.listing_status not null default 'draft',

  -- Free text like "Bldg 300 lobby". Optional, and distinct from
  -- default_meetup_spot_id: the spot is where the handoff is booked, the hint
  -- is whatever the seller wants to add on top.
  pickup_hint            text check (pickup_hint is null or char_length(pickup_hint) <= 200),

  -- not null: the feed is browsed by campus, so a listing with no campus is
  -- invisible rather than universal. The seller's own campus is the default
  -- the Create screen offers.
  campus                 public.campus not null,

  is_negotiable          boolean not null default false,

  -- At least one must be true, or nobody can buy the item.
  accepts_cash           boolean not null default true,
  accepts_etransfer      boolean not null default false,

  -- The feed sorts on bumped_at, not created_at, so renewing a listing lifts
  -- it without rewriting its age. created_at stays the honest "posted" date.
  bumped_at              timestamptz not null default now(),

  -- 30 days. Expiry is what keeps a campus marketplace from filling with items
  -- sold months ago over summer break.
  expires_at             timestamptz not null default now() + interval '30 days',

  sold_at                timestamptz,

  -- DEPARTURE from the previous schema, which used an expression index to keep
  -- the row shape identical to src/types. The requirements doc specifies a
  -- generated column, which is faster (no recomputation per query) and
  -- weightable. The cost: `supabase gen types typescript` now emits a
  -- search_vector field that no hand-written type declares, so src/types must
  -- either declare it or the queries must select columns explicitly.
  search_vector          tsvector generated always as (
                           setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                           setweight(to_tsvector('english', coalesce(description, '')), 'B')
                         ) stored,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  -- DEPARTURE: the requirements doc specifies the biconditional
  -- (status = 'sold') = (sold_at is not null). Written exactly that way, a
  -- seller who removes a sold listing must clear sold_at, which destroys the
  -- record of a sale that a completed order still points at. These two
  -- constraints give the doc's intent for every live state while letting a
  -- sold listing be removed with its history intact.
  constraint listings_sold_has_timestamp
    check (status <> 'sold' or sold_at is not null),
  constraint listings_timestamp_implies_sale
    check (sold_at is null or status in ('sold', 'removed')),

  constraint listings_accepts_a_payment_method
    check (accepts_cash or accepts_etransfer),

  constraint listings_expires_after_creation
    check (expires_at > created_at)
);

comment on column public.listings.bumped_at is
  'Feed sort key. Renewing a listing sets this to now(); created_at stays the honest posted date.';
comment on column public.listings.search_vector is
  'Generated, stored, and therefore present in generated types. Weighted A on title, B on description.';

-- ---------------------------------------------------------------------------
-- listing_categories
-- ---------------------------------------------------------------------------

-- Secondary categories only. A bike that is also transport and also sporting
-- goods is one row in listings and two here. The primary category stays on
-- listings.category_id so the feed's hot path is a column, not a join.
--
-- "Max 3, never the primary" is enforced by trigger — both halves need a
-- subquery that a CHECK cannot run.
create table public.listing_categories (
  listing_id  uuid not null references public.listings (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,

  primary key (listing_id, category_id)
);

-- ---------------------------------------------------------------------------
-- listing_tags
-- ---------------------------------------------------------------------------

create table public.listing_tags (
  listing_id uuid not null references public.listings (id) on delete cascade,
  tag_id     uuid not null references public.tags (id) on delete cascade,

  primary key (listing_id, tag_id)
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

  -- 0-based. Position 0 is the cover image. The upper bound is how "max 8 per
  -- listing" is enforced — a range CHECK rather than a counting trigger,
  -- because the constraint is on the position, not on the count.
  position     integer not null check (position between 0 and 7),

  -- Known before upload, and needed so a card can reserve the right box before
  -- the image loads rather than reflowing the grid when it arrives.
  width        integer check (width > 0),
  height       integer check (height > 0),

  -- Deferrable because reordering photos swaps two positions inside one
  -- transaction, and a non-deferrable constraint fails mid-swap.
  constraint listing_images_position_unique
    unique (listing_id, position) deferrable initially deferred
);

-- ---------------------------------------------------------------------------
-- saved_listings
-- ---------------------------------------------------------------------------

-- Composite primary key makes saving idempotent: tapping the bookmark twice is
-- an upsert, not a duplicate row. Entirely private to the saver.
create table public.saved_listings (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (user_id, listing_id)
);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------

-- The v1 transaction record. No money moves through it — payment is cash or
-- e-Transfer, settled in person — but the row is what makes a sale a fact
-- rather than a claim, and a completed order is the only thing that unlocks a
-- review or increments completed_sales.
--
-- v2's Stripe flow adds columns here (payment intent, platform fee) and one
-- `paid` member to order_status. That is the whole migration, which is what
-- ARCHITECTURE.md's compatibility contract promises.
create table public.orders (
  id                  uuid primary key default gen_random_uuid(),

  -- All restrict. An order is a receipt; nothing it points at may vanish
  -- underneath it.
  listing_id          uuid not null references public.listings (id) on delete restrict,
  buyer_id            uuid not null references public.profiles (id) on delete restrict,

  -- Denormalised from the listing, so the Orders screen does not join to find
  -- the other party, and so a listing that changes hands cannot rewrite who
  -- sold it.
  seller_id           uuid not null references public.profiles (id) on delete restrict,

  meetup_spot_id      uuid references public.meetup_spots (id) on delete restrict,

  -- Snapshotted from the listing at request time. It is deliberately NOT
  -- listings.price_cents read live: a negotiable item settles at a different
  -- number, and a seller editing the price must not rewrite a past sale.
  amount_cents        integer not null check (amount_cents >= 0),

  payment_method      public.payment_method not null,
  status              public.order_status not null default 'requested',

  -- Proposed by the seller on accept, confirmed by the buyer.
  meetup_at           timestamptz,
  meetup_confirmed_at timestamptz,

  -- Two separate confirmations, because "we met and it happened" is the one
  -- fact neither party can be trusted to assert alone. Both set = completed.
  buyer_confirmed_at  timestamptz,
  seller_confirmed_at timestamptz,

  created_at          timestamptz not null default now(),
  accepted_at         timestamptz,
  completed_at        timestamptz,
  cancelled_at        timestamptz,

  constraint orders_not_self check (buyer_id <> seller_id),

  constraint orders_accepted_has_timestamp
    check (status not in ('accepted', 'completed') or accepted_at is not null),

  constraint orders_completed_needs_both_confirmations
    check (
      status <> 'completed'
      or (buyer_confirmed_at is not null
          and seller_confirmed_at is not null
          and completed_at is not null)
    ),

  constraint orders_cancelled_has_timestamp
    check (status not in ('cancelled', 'declined', 'expired') or cancelled_at is not null),

  constraint orders_meetup_confirmed_needs_a_meetup
    check (meetup_confirmed_at is null or meetup_at is not null)
);

comment on column public.orders.amount_cents is
  'Snapshotted at request time. Never read live from the listing — a negotiated price and a later price edit must not rewrite a past sale.';

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------

-- Reviews now hang off an ORDER rather than a listing. That is the change that
-- makes the trust system mean something: a review requires a completed
-- transaction that both parties confirmed, not merely a conversation about a
-- listing someone later marked sold.
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete restrict,
  reviewer_id uuid not null references public.profiles (id) on delete restrict,
  reviewee_id uuid not null references public.profiles (id) on delete restrict,

  -- int2: the range is 1–5 and will not grow. Enforced here rather than as a
  -- TS literal union, because PostgREST returns a plain number and a union
  -- would force a cast on every read.
  rating      smallint not null check (rating between 1 and 5),

  -- Optional. A star-only review is valid.
  body        text check (body is null or char_length(body) <= 1000),
  created_at  timestamptz not null default now(),

  -- One review per party per order. Two parties, so two rows maximum.
  constraint reviews_one_per_reviewer_per_order unique (order_id, reviewer_id),
  constraint reviews_not_self check (reviewer_id <> reviewee_id)
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

  -- Set when the thread stops accepting messages, which today means exactly
  -- one thing: a block between the two parties. A completed sale deliberately
  -- does NOT close a thread — people need to talk afterwards about a missing
  -- part or a refund. The row survives either way, so history stays readable;
  -- only new messages are refused.
  closed_at       timestamptz,

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
  body            text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at      timestamptz not null default now(),

  -- NULL until the recipient opens the thread. Only meaningful to the
  -- non-sender, and written through mark_conversation_read() rather than a
  -- client UPDATE.
  read_at         timestamptz
);

-- ---------------------------------------------------------------------------
-- private.reports
-- ---------------------------------------------------------------------------

-- The `private` schema is not exposed through PostgREST, so nothing in it is
-- reachable from the app with any key the client holds. Reports live here
-- because the reporter's identity must never be derivable by the person
-- reported — and an RLS policy that merely hides a column is one `select *`
-- away from being wrong.
--
-- Clients file reports through public.submit_report(), which is SECURITY
-- DEFINER. They cannot read this table at all, including their own rows.
create schema if not exists private;

revoke all on schema private from anon, authenticated, public;

create table private.reports (
  id                  uuid primary key default gen_random_uuid(),
  reporter_id         uuid not null references public.profiles (id) on delete restrict,

  -- Exactly one target. Three nullable FKs plus a CHECK, rather than a
  -- (target_type, target_id) pair, because this way the database still
  -- enforces that the thing reported exists.
  reported_user_id    uuid references public.profiles (id) on delete cascade,
  reported_listing_id uuid references public.listings (id) on delete cascade,
  reported_message_id uuid references public.messages (id) on delete cascade,

  reason              public.report_reason not null,
  details             text check (details is null or char_length(details) <= 1000),
  status              public.report_status not null default 'open',
  created_at          timestamptz not null default now(),

  constraint reports_exactly_one_target check (
    (reported_user_id    is not null)::integer
    + (reported_listing_id is not null)::integer
    + (reported_message_id is not null)::integer = 1
  ),

  constraint reports_not_self check (reported_user_id is distinct from reporter_id)
);

comment on table private.reports is
  'Server-only. Clients write through public.submit_report() and can never read this table. The reporter is never visible to the reported user.';
