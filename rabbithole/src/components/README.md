# `src/components`

Shared UI. A component earns a place here on its **second** use, not its first.

## What belongs

Presentational pieces reused across more than one screen, and full-screen states
that are not routes — `BootScreen` is the latter: the app shows it while
`SessionProvider` resolves, and it has no URL.

Everything here declares its own styles in a file-scoped `StyleSheet.create`
block and takes its content through props. A component that imports from
`src/lib/queries/` is a screen wearing the wrong hat; move the fetch up to the
route and pass the data down.

Nine live here. `Button`, `Field` and `FieldError` are shared by all three auth
screens; `Chips`, `Select`, `PhotoPicker` and `TagInput` are the Create form's inputs; and
`BootScreen` and `WelcomeOverlay` are full-screen states with no URL. `WelcomeOverlay` is the one exception to the no-lib rule — it reads
`consumeWelcome` itself, because whether a greeting is owed is its own question
to answer rather than a prop three callers would have to thread.

## What does not

- **Anything used once.** It lives in the screen that uses it until a second
  caller appears. Premature extraction is how a components folder fills with
  wrappers nobody can name.
- **Routes.** Those are files in `src/app/`, and only files in `src/app/`.
- **A shared style module.** Styles are file-scoped on purpose — a repeated
  colour literal is the convention here, not a duplicate to extract.
- **Domain types.** They belong in `src/types` and are imported from the barrel.

## Current contents

| Component | Purpose |
| --- | --- |
| `BootScreen` | Branded launch placeholder, colour-matched to the native splash so the handover is invisible. |
| `Button` | The pill button, in `primary` (filled brand) and `ghost` (text-only) variants. Owns the disabled and in-flight treatments. |
| `Field` | The pill text input. Owns the geometry, the error colouring, and placing the message beneath. Takes an optional `trailing` accessory. |
| `FieldError` | One line of danger-coloured text with an alert icon, announced to screen readers. Used both against a field and, on its own, for form-level failures. |
| `Chips` | Two row-of-pills controls: `ChipPicker` chooses one, `ChipToggles` chooses any. Share a pill and nothing else. |
| `Select` | The pill that opens a bottom sheet of options. Owns its loading, empty and disabled states, because a spot list cannot populate until a campus is chosen. |
| `PhotoPicker` | The photo well. Camera or library, a cap passed in as a prop, cover badge on the first. Holds nothing — the screen owns the array. |
| `TagInput` | Free-text tags, normalised on the way in. The only taxonomy a user creates, because `categories` is read-only to clients and `tags` is not. |

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

## A deliberate exception to the second-use rule

`Chips`, `Select`, `PhotoPicker` and `TagInput` landed with **one** screen using them, which the rule at the top of this
file says should have kept it inside `create.tsx`. That was a decision, not an
oversight, and the reason is worth keeping:

Create needs five selection controls and a photo well, and this repo had none. Built inline, the
screen is back over 700 lines — the exact shape that was deleted on 2026-10-18
for being too large to follow. Splitting the controls out is what keeps the
screen readable, so the cost the rule exists to prevent is smaller here than the
cost of obeying it.

The rule still holds everywhere else. If a second caller never appears for one of
them, folding it back into the screen is a small, honest change — not a
migration. `Select` is the least likely to need that: Browse filters want the
same control.

Two things that fell out of building them:

- **`ChipPicker` and `ChipToggles` are separate components, not one with a
  `mode` prop.** Their value is `T | null` versus `readonly T[]`, their callback
  signature differs, and their screen-reader role is `radio` versus `checkbox`.
  A shared component would have been three conditionals wearing a trench coat.
- **A chosen chip shows a checkmark, not just a blue fill.** `design-rules.md`
  forbids encoding meaning in colour alone, and the glyph reads the colour back
  from the label's style entry so the two cannot drift apart.

## `lineHeight` belongs to multiline inputs only

`Field` applied `lineHeight` to every `TextInput` through its type scale, and
every field in the app sat a few points low once it had been typed into and
blurred. It read as a `Field` bug and it was a React Native one:

- A **focused** input is laid out by the platform's text editor, a **blurred**
  one by React Native. They disagree about where glyphs sit inside a line box
  taller than the glyphs need — so the shift only appears after you finish
  typing, which is what makes it hard to attribute.
- On a **single line** `lineHeight` buys nothing. There is no second line for
  leading to separate, so the taller box is pure offset.
- On **multiline** it is required: without it, wrapped lines touch.

So `TEXT_SIZES` carries size and weight, `LINE_HEIGHTS` carries leading, and
only `multiline` fields get the second one. Two rules fall out, and both have
bitten already:

- **Anything placed in the pill beside the input — a `leading` currency symbol,
  a `trailing` glyph — must not set `lineHeight` either.** Matching the input
  means matching its *absence*.
- **`includeFontPadding: false` goes on both halves or neither.** Android
  reserves font padding on a `Text` and a `TextInput` alike; switching it off on
  one of the two makes the misalignment symmetrical rather than removing it.
