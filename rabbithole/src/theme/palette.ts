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
 * The blue ramp is built around `#208AEF` (step 500), the brand blue already used
 * by the splash screen and tab bar. `blue[50]` is `#E6F4FE`, the Android adaptive
 * icon background. Both previously existed only in `app.json`.
 */

export const palette = {
  blue: {
    50: "#E6F4FE",
    100: "#C9E6FD",
    200: "#9BD1FB",
    300: "#66B6F7",
    400: "#3B9DF3",
    500: "#208AEF",
    600: "#1570CC",
    700: "#1159A3",
    800: "#0E477F",
    900: "#0B3560",
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
