/**
 * Raw colour ramps.
 *
 * Owns: the literal hex values the app is allowed to use.
 * Does not own: what any of them *mean*. Nothing outside `src/theme/` should
 *   import this file — screens ask for `colors.text.primary`, never `blue[500]`.
 *
 * Why the indirection: a ramp is a palette, not a design. The moment a screen
 * reaches for `neutral[200]` directly, that screen has silently opted out of dark
 * mode, because `neutral[200]` is a light-mode border and a dark-mode nothing.
 * `colors.ts` is where ramps become meanings, and meanings are what flip.
 *
 * The blue ramp is built around `#0165F2` (step 500), sampled from the app icon.
 * The rabbit logo is the first colour decision anyone actually made here, so the
 * ramp follows it rather than the other way round. `app.json` mirrors step 500 for
 * the splash and adaptive-icon backgrounds.
 *
 * Worth knowing why this changed: the previous brand blue (`#208AEF`, inherited
 * from the Expo starter template) put white-on-brand at 3.53:1 — under the 4.5:1
 * this project targets for body text. `#0165F2` is darker and reaches 5.07:1, so
 * primary buttons stopped failing contrast as a side effect of adopting the logo.
 */

export const palette = {
  blue: {
    50: "#E5F0FF",
    100: "#C7DEFF",
    200: "#99C3FF",
    300: "#66A6FF",
    400: "#2E85FF",
    500: "#0165F2",
    600: "#0155CB",
    700: "#0244A2",
    800: "#03347C",
    900: "#05265C",
  },

  /** Slightly blue-tinted greys, so neutrals sit with the brand rather than against it. */
  neutral: {
    0: "#FFFFFF",
    50: "#F7F8FA",
    100: "#EFF1F5",
    200: "#E2E6ED",
    300: "#CBD2DD",
    400: "#9AA4B4",
    500: "#6B7688",
    600: "#4C5566",
    700: "#363E4C",
    800: "#222833",
    900: "#12161D",
    950: "#0D1117",
    1000: "#0A0E13",
  },

  green: { 500: "#16A34A", 400: "#4ADE80", subtleLight: "#DCFCE7", subtleDark: "#0E2A1A" },
  amber: { 500: "#D97706", 400: "#FBBF24", subtleLight: "#FEF3C7", subtleDark: "#2E2007" },
  red: { 500: "#DC2626", 400: "#F87171", subtleLight: "#FEE2E2", subtleDark: "#2E1113" },
} as const;
