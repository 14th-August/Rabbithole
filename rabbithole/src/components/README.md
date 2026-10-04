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
| `Button` | The pill button, in `primary` (filled brand) and `ghost` (text-only) variants. Owns the disabled and in-flight treatments. |
| `Field` | The pill text input. Owns the geometry, the error colouring, and placing the message beneath. Takes an optional `trailing` accessory. |
| `FieldError` | One line of danger-coloured text with an alert icon, announced to screen readers. Used both against a field and, on its own, for form-level failures. |

## Closed gap

`Field` and `Button` landed together and the three auth screens were migrated
onto them, retiring the `fieldStyle` object literal that had been defined once
per screen and the tap-target button block that appeared four times between them.

Two things that fell out of the extraction and are worth keeping:

- **The pill's border is always present, never added on error.** It sits at
  `colors.surfaceSunken`, matching the fill, so it is invisible at rest. An error
  recolours it rather than introducing it — adding a border would grow the field
  by a pixel and nudge everything below it.
- **`ghost` recolours where `primary` dims.** Halving the opacity of small text
  fails contrast, so a disabled text-only button moves to `colors.text.tertiary`
  instead of inheriting the filled pill's `opacity: 0.5`.
