/**
 * Theme barrel.
 *
 * Components should import exactly one thing from here:
 *
 *   import { useTheme } from "@/theme";
 *
 * The raw token modules are exported for the rare non-component caller — a
 * navigator's `screenOptions`, a `StyleSheet.create` block that genuinely has no
 * hook available. Reach for `useTheme()` first; a static import of `colorsFor`
 * inside a component is almost always a dark-mode bug.
 *
 * `palette` is deliberately NOT exported. Raw ramps stay inside this folder.
 */

export { ThemeProvider, useTheme, type Theme } from "./useTheme";
export { colorsFor, type ColorPair, type Colors, type ColorScheme } from "./colors";
export { layout, radius, spacing } from "./spacing";
export { typography, type TypographyVariant } from "./typography";
