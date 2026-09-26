# `src/components`

Shared UI. A component earns a place here on its **second** use, not its first.

## What belongs

Presentational pieces reused across more than one screen, and full-screen states
that are not routes — `BootScreen` is the latter: the app shows it while
`SessionProvider` resolves, and it has no URL.

Everything here reads design tokens through `useTheme()` and takes its content
through props. A component that imports from `src/lib/queries/` is a screen
wearing the wrong hat; move the fetch up to the route and pass the data down.

## What does not

- **Anything used once.** It lives in the screen that uses it until a second
  caller appears. Premature extraction is how a components folder fills with
  wrappers nobody can name.
- **Routes.** Those are files in `src/app/`, and only files in `src/app/`.
- **Raw colour ramps.** `src/theme/palette.ts` stays inside `src/theme`.
- **Domain types.** They belong in `src/types` and are imported from the barrel.

## Current contents

| Component | Purpose |
| --- | --- |
| `BootScreen` | Branded launch placeholder, colour-matched to the native splash so the handover is invisible. |

## Known gap

The auth screens still repeat their own field and button styling — `inputStyle`
is defined three times across `sign-in`, `sign-up`, and `verify`, and the
tap-target button block four times. Those are the next two components to land
here, in that order.
