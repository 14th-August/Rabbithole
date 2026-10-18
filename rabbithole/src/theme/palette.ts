/**
 * Raw colour ramps — the literal hex values the app may use.
 *
 * What they MEAN is `colors.ts`. Nothing outside `src/theme` imports this file:
 * a screen reaching for `neutral[200]` has silently opted out of dark mode,
 * because that value is a light-mode border and a dark-mode nothing. Ramps are a
 * palette, not a design; meanings are what flip between schemes.
 *
 * Returns: the `palette` object. Blue step 500 is `#0165F2`, sampled from the app
 * icon and mirrored in `app.json`. It replaced the Expo starter's `#208AEF`,
 * which put white-on-brand at 3.53:1 — under the 4.5:1 this project targets.
 * `#0165F2` reaches 5.07:1, so primary buttons stopped failing contrast.
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
