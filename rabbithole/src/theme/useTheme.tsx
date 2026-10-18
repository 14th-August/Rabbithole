/**
 * The single entry point every component uses to read design tokens.
 *
 * Resolves the active colour scheme and assembles the `Theme` object; the token
 * values live in the sibling modules. A hook rather than a plain export because
 * colours depend on the scheme, which changes at runtime — a module-level
 * `export const colors = light` would be read once and never update. The context
 * exists so a subtree can be pinned, which the auth flow uses.
 *
 * Returns: `useTheme` returns the resolved {@link Theme}. `ThemeProvider`
 * returns a provider that pins its descendants to one scheme.
 */

import { createContext, useContext, type ReactNode } from "react";
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
 * A scheme pinned by an ancestor, or `null` to follow the system.
 *
 * Null rather than a default scheme on purpose: "nobody pinned one" and
 * "somebody pinned light" must stay distinguishable, or the fallback would
 * silently win over a real choice.
 */
const SchemeContext = createContext<ColorScheme | null>(null);

/** Props for {@link ThemeProvider}. */
interface ThemeProviderProps {
  /** The scheme every descendant will resolve to, regardless of the device. */
  scheme: ColorScheme;
  children: ReactNode;
}

/**
 * Pins a subtree to one colour scheme.
 *
 * Use sparingly, and only where a design decision says a surface does not follow
 * the device — not to avoid doing the dark-mode work. Tokens still resolve
 * through {@link useTheme}, so a pinned subtree is as complete as an unpinned
 * one; it resolves to the other half of the pair.
 *
 * Must wrap the component that calls `useTheme`, not sit inside it: context
 * reaches descendants, never the component rendering the provider.
 *
 * Returns the provider element.
 *
 * @example
 * ```tsx
 * export default function AuthLayout() {
 *   return (
 *     <ThemeProvider scheme="light">
 *       <AuthShell />
 *     </ThemeProvider>
 *   );
 * }
 * ```
 */
export function ThemeProvider({ scheme, children }: ThemeProviderProps) {
  return <SchemeContext.Provider value={scheme}>{children}</SchemeContext.Provider>;
}

/**
 * Reads the active theme.
 *
 * Returns the resolved {@link Theme} — a pinned scheme if an ancestor set one,
 * otherwise the system scheme. Theme-dependent styles go inline; everything
 * static stays in a `StyleSheet.create` block at the bottom of the file.
 *
 * ```ts
 * const { colors, spacing, typography } = useTheme();
 * <Text style={[typography.title3, { color: colors.text.primary }]} />
 * ```
 */
export function useTheme(): Theme {
  const pinned = useContext(SchemeContext);

  // `useColorScheme()` is `"light" | "dark" | null | undefined` — null on web
  // before hydration and on the static export, so light is the fallback: a flash
  // of light is survivable, a crash on `colorsFor(null)` is not. Called
  // unconditionally even when pinned, because hooks cannot be skipped.
  const system: ColorScheme = useColorScheme() === "dark" ? "dark" : "light";

  const scheme = pinned ?? system;

  // No useMemo: reactCompiler is enabled and handles memoisation.
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
