# Rabbithole

Rabbithole is a student marketplace app for **Vancouver Island University** students who want to trade and re-sell textbooks, miscellaneous items, and more.

Built with [Expo](https://expo.dev) (SDK 57) and React Native, targeting iOS, Android, and web from a single codebase.

## Database Design

ER diagram of the backend database tables and their relations:

<img width="1083" height="647" alt="Rabbithole ER diagram" src="https://github.com/user-attachments/assets/8b8221ee-3504-40f2-82f4-5cfa13c56cbc" />

> The schema above is the design target. It is not yet implemented in code — see [Project Status](#project-status).

## Getting Started

**Requirements:** Node.js 22.13+ and an iOS simulator, Android emulator, or the [Expo Go](https://expo.dev/go) app.

```bash
cd rabbithole
npm install
npx expo start
```

Metro starts on **http://localhost:8081**. From there press `i` for the iOS simulator, `a` for Android, `w` for web, or scan the QR code with Expo Go.

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

## Project Layout

The git repository root holds project-level docs; the Expo application lives in the nested `rabbithole/` directory.

```
Rabbithole/
├── README.md               # this file
├── LICENSE
└── rabbithole/             # the Expo app
    ├── app.json            # Expo config — icons, plugins, scheme, experiments
    ├── package.json        # dependencies and scripts
    ├── tsconfig.json       # strict TS, "@/*" → ./src/*, "@/assets/*" → ./assets/*
    ├── AGENTS.md           # agent/contributor instructions (CLAUDE.md imports this)
    ├── assets/
    │   ├── expo.icon/      # Apple Icon Composer bundle used by ios.icon
    │   └── images/
    │       └── tabIcons/   # tab bar icons @1x/@2x/@3x
    └── src/
        └── app/            # expo-router route tree — every file here is a route
            ├── _layout.tsx # root layout (Stack)
            ├── index.tsx   # "/"
            └── (tabs)/     # route group — adds no URL segment
                ├── _layout.tsx
                ├── index.tsx
                ├── items.tsx
                ├── messages.tsx
                ├── profile.tsx
                └── wishlist.tsx
```

### Routing

Navigation is file-based via [`expo-router`](https://docs.expo.dev/router/introduction/). There is no route config file — `src/app/` *is* the route table.

- `_layout.tsx` defines how the routes in its directory are arranged (`Stack`, `Tabs`, or `Slot`). It is not itself a route.
- `index.tsx` is the default route for its directory.
- A directory in parentheses, like `(tabs)/`, is a **route group**: it organises files without adding a URL segment, so `(tabs)/items.tsx` serves `/items`.
- `[id].tsx` denotes a dynamic segment.

| Route | File |
| --- | --- |
| `/` | `src/app/index.tsx` |
| `/items` | `src/app/(tabs)/items.tsx` |
| `/messages` | `src/app/(tabs)/messages.tsx` |
| `/profile` | `src/app/(tabs)/profile.tsx` |
| `/wishlist` | `src/app/(tabs)/wishlist.tsx` |

`app.json` enables `typedRoutes`, so route strings are type-checked against this tree. It also enables `reactCompiler` — write plain React and let the compiler handle memoisation.

### Import aliases

```ts
import Something from "@/components/Something";   // → src/components/Something
import icon from "@/assets/images/tabIcons/home.png";
```

## Project Status

The navigation shell is scaffolded; screens are not yet implemented.

- ✅ Expo SDK 57 project, TypeScript strict mode, path aliases
- ✅ App icons, splash screen, and Android adaptive icon configured
- ✅ Route tree and tab group scaffolded
- 🚧 Tab screens are empty stubs pending implementation
- 🚧 Tab group layout still needs to render `Tabs` rather than `Stack`
- ⬜ Backend, authentication, and data layer not yet chosen or built
- ⬜ Tab bar icons exist for 2 of 5 tabs
- ⬜ No test suite or ESLint config yet

## License

[MIT](LICENSE)
