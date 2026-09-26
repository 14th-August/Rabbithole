# Rabbithole

Rabbithole is a student marketplace app for **Vancouver Island University** students who want to trade and re-sell textbooks, miscellaneous items, and more.

Built with [Expo](https://expo.dev) (SDK 57) and React Native, targeting iOS, Android, and web from a single codebase, on a [Supabase](https://supabase.com) backend.

## Architecture

```mermaid
flowchart TB
    subgraph client["Expo app — iOS / Android / Web"]
        direction TB
        router["expo-router<br/>(auth) · (tabs)"]
        theme["src/theme<br/>design tokens"]
        queries["src/lib/queries<br/>the only place the DB is touched"]
        sdk["supabase-js"]
        router --> queries
        router -.->|"reads"| theme
        queries --> sdk
    end

    subgraph supabase["Supabase project"]
        direction TB
        auth["Auth (GoTrue)"]
        rest["PostgREST<br/>auto REST over tables"]
        rt["Realtime<br/>messages channel"]
        store["Storage<br/>listing-images · avatars"]
        db[("Postgres + RLS<br/>system of record")]
        rest --> db
        rt --> db
        auth --> db
        store --> db
    end

    hook["Edge hook<br/>before_user_created<br/>@my.viu.ca gate"]

    sdk -->|JWT| auth
    sdk -->|select / insert / update| rest
    sdk -->|websocket subscribe| rt
    sdk -->|upload| store
    auth -.->|"invokes"| hook
```

**There is no custom API layer, and that is the defining decision.** The client speaks to PostgREST directly, and **RLS is the authorization layer** — every rule about who may read or write a row is a policy in the database, not a check in a controller. One hook exists, and only to reject non-`@my.viu.ca` signups before the user row is created.

That buys a great deal of speed — no server to write, deploy, version, or keep in sync — at the cost of pushing all authorization into SQL, where it is harder to unit test. It holds exactly as long as no operation needs a secret or a third party.

## Database Design

ER diagram of the backend database tables and their relations:

<img width="1083" height="647" alt="Rabbithole ER diagram" src="https://github.com/user-attachments/assets/8b8221ee-3504-40f2-82f4-5cfa13c56cbc" />

The schema is implemented across seven migrations in `rabbithole/supabase/migrations/` — tables and enums, indexes, triggers, RLS policies, views, storage buckets, and the VIU email gate.

## Getting Started

**Requirements:** Node.js 22.13+ and an iOS simulator, Android emulator, or the [Expo Go](https://expo.dev/go) app.

```bash
cd rabbithole
npm install
npx expo start
```

Metro starts on **http://localhost:8081**. From there press `i` for the iOS simulator, `a` for Android, `w` for web, or scan the QR code with Expo Go.

The app needs a backend to sign in against — see [Local development](#local-development) below.

### Scripts

Run from the `rabbithole/` directory:

| Script | What it does |
| --- | --- |
| `npm start` | Start the Metro dev server |
| `npm run android` | Build and run the native Android app |
| `npm run ios` | Build and run the native iOS app (macOS only) |
| `npm run web` | Start the web target |
| `npm run lint` | Run `expo lint` |

Dependencies are pinned to SDK-compatible ranges. Use `npx expo install --check` to upgrade rather than `npm update`.

## Local development

A full Supabase stack runs locally in Docker — Postgres, Auth, PostgREST, Realtime, Storage, Studio, and a mail catcher. Nothing touches the hosted project.

> [!IMPORTANT]
> **Run every `supabase` command from `rabbithole/`, never from the repository root.** The CLI derives its Docker project id from the containing folder name, so running from `Rabbithole/` creates a second, separate stack that collides with the real one on port 54322 and can tear down the healthy containers. `supabase/` lives inside `rabbithole/`, and that is the only directory that owns the migrations and seed.

**1. Start Docker Desktop**, and wait for it to report *Running*. Everything below fails without it.

**2. Start the stack and load the schema:**

```bash
cd rabbithole
npx supabase start      # first run pulls several GB of images
npx supabase db reset   # replays all migrations, then seeds
```

`db reset` drops and rebuilds the database, so any account you created through the app is lost. That is usually what you want — it is the only way a change to `supabase/seed.sql` takes effect.

**3. Point the app at it.** Copy `.env.example` to `.env` and fill in the values `npx supabase status` prints.

> [!NOTE]
> Use your machine's **LAN IP**, not `localhost`, if you test on a physical phone — `http://192.168.x.x:54321`. A device cannot resolve your computer's `localhost`. This goes stale whenever your machine's IP changes, which is the usual cause of a sudden "Can't reach the server".

**4. Run the app:** `npx expo start`.

### Test accounts

`supabase/seed.sql` creates five confirmed accounts. **Every one uses the password `rabbithole`.**

| Email | Notes |
| --- | --- |
| `maya.chen@my.viu.ca` | The fullest account — listings, reviews, a conversation |
| `devon.okafor@my.viu.ca` | |
| `alex.reid@my.viu.ca` | Stands in as the signed-in user in fixtures |
| `priya.raman@my.viu.ca` | |
| `sam.whitmore@my.viu.ca` | |

Signing up with any other address is fine as long as it ends in `@my.viu.ca`. Anything else is rejected by the auth hook with a message explaining why — that gate is server-side and cannot be bypassed from the client.

### Local URLs

| Service | URL | For |
| --- | --- | --- |
| API gateway | http://localhost:54321 | What the app talks to |
| Postgres | `postgresql://postgres:postgres@localhost:54322/postgres` | Direct SQL |
| Studio | http://localhost:54323 | Browse tables, run queries |
| Mailpit | http://localhost:54324 | **Read confirmation emails** — no mail leaves the machine |

Signup sends a 6-digit code rather than a link, so confirming a new account locally means opening Mailpit and reading the code out of the email.

> [!NOTE]
> **Editing `supabase/templates/confirmation.html` requires restarting Auth.** GoTrue
> reads the template once at container start and caches it, so a saved edit keeps
> sending the old email with no error to say why. Run
> `docker restart supabase_auth_rabbithole` — it is stateless, so nothing is lost.

### Other commands

```bash
npx supabase status                                        # local URLs and keys
npx supabase stop                                          # stop the stack
npx supabase stop --no-backup                              # stop and discard the database
npx supabase gen types typescript --local > src/types/database.ts
```

Regenerate the types after every migration, or `src/types/database.ts` quietly disagrees with the schema.

More detail, including hosted-project setup and Windows-specific troubleshooting, is in [`docs/backend/setup.md`](docs/backend/setup.md).

## Project Layout

The git repository root holds project-level docs; the Expo application lives in the nested `rabbithole/` directory.

```
Rabbithole/
├── README.md               # this file
├── docs/backend/           # setup runbook, schema, auth flow, API guide, roadmap
├── LICENSE
└── rabbithole/             # the Expo app
    ├── app.json            # Expo config — icons, plugins, scheme, experiments
    ├── assets.d.ts         # module declarations for image imports
    ├── tsconfig.json       # strict TS, "@/*" → ./src/*, "@/assets/*" → ./assets/*
    ├── AGENTS.md           # agent/contributor instructions (CLAUDE.md imports this)
    ├── supabase/
    │   ├── migrations/     # seven migrations — schema, RLS, storage, VIU gate
    │   ├── seed.sql        # deliberately awkward fixtures + test accounts
    │   └── templates/      # confirmation email
    └── src/
        ├── app/            # expo-router route tree — every file here is a route
        │   ├── _layout.tsx # session provider + the signed-in/out route guard
        │   ├── (auth)/     # sign-in, sign-up, verify
        │   └── (tabs)/     # the five primary tabs
        ├── components/     # shared UI
        ├── lib/            # supabase client, auth, session, queries, formatters
        ├── theme/          # design tokens — colours, spacing, typography
        └── types/          # domain types + the generated database schema
```

Each `src/*` folder carries a `README.md` describing what belongs in it and what does not.

### Routing

Navigation is file-based via [`expo-router`](https://docs.expo.dev/router/introduction/). There is no route config file — `src/app/` *is* the route table.

- `_layout.tsx` defines how the routes in its directory are arranged (`Stack`, `Tabs`, or `Slot`). It is not itself a route.
- `index.tsx` is the default route for its directory.
- A directory in parentheses, like `(tabs)/`, is a **route group**: it organises files without adding a URL segment, so `(tabs)/saved.tsx` serves `/saved`.
- `[id].tsx` denotes a dynamic segment.

| Route | File | Reachable when |
| --- | --- | --- |
| `/sign-in` | `src/app/(auth)/sign-in.tsx` | Signed out |
| `/sign-up` · `/verify` | `src/app/(auth)/` | Signed out |
| `/` (Discover) | `src/app/(tabs)/index.tsx` | Signed in |
| `/saved` · `/create` · `/messages` · `/profile` | `src/app/(tabs)/` | Signed in |

The root layout wraps each group in `Stack.Protected`, so a signed-out user can only reach `(auth)` and a signed-in user can only reach `(tabs)`. Screens never navigate after signing in or out — changing the session flips the guard and the router swaps groups on its own.

A session also expires after **five days** without a manual sign-in. A Supabase refresh token renews itself indefinitely, so that policy is tracked separately in `src/lib/sessionAge.ts`.

The tab bar is built with `Tabs` imported from **`expo-router/js-tabs`**. Importing `Tabs` from `expo-router` directly is deprecated in SDK 57. Icons come from `@expo/vector-icons` (Ionicons).

`app.json` enables `typedRoutes`, so route strings are type-checked against this tree. It also enables `reactCompiler` — write plain React and let the compiler handle memoisation.

### Import aliases

```ts
import { useTheme } from "@/theme";                    // → src/theme
import type { ListingSummary } from "@/types";
import { getFeed } from "@/lib/queries/listings";
import logo from "@/assets/images/logo-round.png";     // → assets/
```

Import from a folder's barrel (`@/types`), not from files inside it, so the internal split stays free to change.

## Project Status

- ✅ Expo SDK 57 project, TypeScript strict mode, path aliases, ESLint
- ✅ Supabase backend — schema, RLS policies, storage buckets, seed data
- ✅ VIU email gate enforced server-side by a Before User Created auth hook
- ✅ Authentication — sign-up, email confirmation by code, sign-in, session guard
- ✅ Design tokens, app icon, splash screen, and Android adaptive icon
- 🚧 Tab screens are still placeholders pending the feed, listings, and messaging
- ⬜ Payments deferred to v2 on purpose — v1 settles in person
- ⬜ No test suite yet

## License

[MIT](LICENSE)
