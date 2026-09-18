/**
 * The single entry point every component uses to read design tokens.
 *
 * Owns: resolving the active colour scheme and assembling the `Theme` object.
 * Does not own: token values. Those live in the sibling modules.
 *
 * Why a hook and not a plain export: colours depend on the active scheme, which
 * changes at runtime when the user flips their system appearance. A module-level
 * `export const colors = light` would be read once and never update.
 *
 * Why no React context: nothing today needs to *override* the system scheme, and
 * a provider that only ever forwards `useColorScheme()` is ceremony. The important
 * part is that every component funnels through this one hook — so adding a manual
 * light/dark/system setting later means wrapping the app in a provider and editing
 * this file, and nothing else. Same discipline as a `useCurrentUser()` hook.
 */

import { useColorScheme } from "react-native";

import { colorsFor, type Colors, type ColorScheme } from "./colors";
import { layout, radius, spacing } from "./spacing";
import { typography } from "./typography";

export interface Theme {
  /** The resolved scheme. Never null — see the fallback below. */
  scheme: ColorScheme;
  /** Convenience for the common `scheme === "dark"` check. */
  isDark: boolean;
  colors: Colors;
  spacing: typeof spacing;
  radius: typeof radius;
  layout: typeof layout;
  typography: typeof typography;
}

/**
 * Read the active theme.
 *
 * ```ts
 * const { colors, spacing, typography } = useTheme();
 * <Text style={[typography.title3, { color: colors.text.primary }]} />
 * ```
 *
 * Styles that depend on theme go inline; everything static stays in a
 * `StyleSheet.create` block at the bottom of the file.
 */
export function useTheme(): Theme {
  // `useColorScheme()` is `"light" | "dark" | null | undefined`. It is null on
  // web before hydration and on the static export, so light is the fallback —
  // a flash of light is survivable, a crash on `colorsFor(null)` is not.
  const scheme: ColorScheme = useColorScheme() === "dark" ? "dark" : "light";

  // No useMemo: reactCompiler is enabled in app.json and handles memoisation.
  // Hand-memoising here would be noise at best and could defeat the compiler.
  return {
    scheme,
    isDark: scheme === "dark",
    colors: colorsFor(scheme),
    spacing,
    radius,
    layout,
    typography,
  };
}
