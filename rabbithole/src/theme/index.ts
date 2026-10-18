/**
 * Design tokens.
 *
 * Components should import exactly one thing from here: `useTheme`. The raw
 * token modules are exported for the rare non-component caller — a navigator's
 * `screenOptions`, or a `StyleSheet.create` block with no hook available. A
 * static import of `colorsFor` inside a component is almost always a dark-mode
 * bug. `palette` is deliberately NOT exported: raw ramps stay in this folder.
 *
 * Returns: re-exports only. Import from `@/theme`.
 */

export { ThemeProvider, useTheme, type Theme } from "./useTheme";
export { colorsFor, type ColorPair, type Colors, type ColorScheme } from "./colors";
export { layout, radius, spacing } from "./spacing";
export { typography, type TypographyVariant } from "./typography";
