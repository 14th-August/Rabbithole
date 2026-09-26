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
 * Why there is now a context: this file used to say that adding a manual
 * light/dark/system setting "means wrapping the app in a provider and editing
 * this file, and nothing else". That moment arrived — the auth flow renders
 * light in both schemes, by decision, recorded in `design-rules.md`. The
 * important property held: no component changed, because every one of them was
 * already funnelling through {@link useTheme} rather than reading `colorsFor`
 * directly.
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
 * "somebody pinned light" have to stay distinguishable, or the fallback would
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
 * Pin a subtree to one colour scheme.
 *
 * Use sparingly, and only where a *design* decision says a surface does not
 * follow the device — not to avoid doing the dark-mode work on a screen. Every
 * token still resolves through {@link useTheme}, so a pinned subtree is as
 * complete and as consistent as an unpinned one; it simply resolves to the
 * other half of the pair.
 *
 * Note this must wrap the component that calls `useTheme`, not sit inside it:
 * context reaches descendants, never the component that renders the provider.
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
  const pinned = useContext(SchemeContext);

  // `useColorScheme()` is `"light" | "dark" | null | undefined`. It is null on
  // web before hydration and on the static export, so light is the fallback —
  // a flash of light is survivable, a crash on `colorsFor(null)` is not.
  //
  // Called unconditionally even when a scheme is pinned, because hooks cannot be
  // skipped and the compiler would bail on the rule violation anyway.
  const system: ColorScheme = useColorScheme() === "dark" ? "dark" : "light";

  const scheme = pinned ?? system;

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
