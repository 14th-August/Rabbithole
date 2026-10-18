/**
 * Semantic colour tokens for light and dark.
 *
 * Maps raw ramps to meanings, once per scheme; `useTheme()` decides which scheme
 * is active. Tokens are named for their role, never their appearance —
 * `text.secondary`, not `grey600` — because the role is stable across schemes
 * even though the hex is not. `Colors` is the contract: adding a token breaks
 * compilation until BOTH schemes define it, since a one-scheme token is a
 * dark-mode bug that ships.
 *
 * Returns: `colorsFor(scheme)` returns that scheme's complete token set.
 */

import type { ListingStatus } from "@/types";
import { palette } from "./palette";

export type ColorScheme = "light" | "dark";

/** A pair of foreground and background used together for a badge or chip. */
export interface ColorPair {
  fg: string;
  bg: string;
}

export interface Colors {
  /** The page behind everything. Cards sit on top of it. */
  background: string;
  /** Raised content — listing cards, sheets, the tab bar. */
  surface: string;
  /** Recessed content — input fields, image placeholders, skeletons. */
  surfaceSunken: string;
  /** Scrims behind modals and image viewers. Includes alpha. */
  overlay: string;

  /** Hairlines and dividers. */
  border: string;
  /** Borders that must be seen — focused inputs, selected chips. */
  borderStrong: string;

  text: {
    /** Titles and body copy. */
    primary: string;
    /** Supporting copy — timestamps, metadata, captions. */
    secondary: string;
    /** De-emphasised copy that is still content. */
    tertiary: string;
    /** Input placeholders and disabled labels. Not for real content. */
    placeholder: string;
    /** Text on a dark surface in light mode, and vice versa. */
    inverse: string;
  };

  brand: {
    /** Primary actions, active tab, links. */
    default: string;
    /** Pressed state for the above. */
    pressed: string;
    /** Tinted backgrounds — selected chips, info banners. */
    subtle: string;
    /**
     * Text/icons placed ON `brand.default`.
     *
     * White in light mode, near-black in dark: the dark scheme lifts the brand to
     * `blue[300]`, and white on `#66A6FF` fails contrast badly. This token is
     * what stops a hardcoded `color: "#fff"` shipping that bug.
     */
    onBrand: string;
    /**
     * The launch background — the one token identical in both schemes.
     *
     * The OS paints the native splash from a fixed colour in `app.json` before
     * React exists, so anything on top must match it or the handover flickers.
     */
    launch: string;
    /**
     * Foreground on {@link launch} — the spinner and any text beside it.
     *
     * Fixed in both schemes for the same reason. `onBrand` cannot be used: it is
     * near-black in dark mode, correct on a lifted `blue[300]` button but
     * invisible on the launch screen's fixed `blue[500]`, and the rabbit there is
     * white anyway.
     */
    onLaunch: string;
  };

  status: {
    success: string;
    successSubtle: string;
    warning: string;
    warningSubtle: string;
    danger: string;
    dangerSubtle: string;
  };

  /**
   * Badge colours per listing lifecycle state.
   *
   * Typed as a total `Record` over `ListingStatus`, so adding a status to the
   * domain union fails the build here until it has a colour. That coupling from
   * theme to domain is intentional: it is cheaper than discovering an uncoloured
   * badge in the simulator.
   */
  listingStatus: Record<ListingStatus, ColorPair>;
}

const light: Colors = {
  background: palette.neutral[50],
  surface: palette.neutral[0],
  surfaceSunken: palette.neutral[100],
  overlay: "rgba(18, 22, 29, 0.55)",

  border: palette.neutral[200],
  borderStrong: palette.neutral[300],

  text: {
    primary: palette.neutral[900],
    secondary: palette.neutral[600],
    tertiary: palette.neutral[500],
    placeholder: palette.neutral[400],
    inverse: palette.neutral[0],
  },

  brand: {
    default: palette.blue[500],
    pressed: palette.blue[600],
    subtle: palette.blue[50],
    onBrand: palette.neutral[0],
    // Mirrors the `expo-splash-screen` backgroundColor in app.json.
    launch: palette.blue[500],
    onLaunch: palette.neutral[0],
  },

  status: {
    success: palette.green[500],
    successSubtle: palette.green.subtleLight,
    warning: palette.amber[500],
    warningSubtle: palette.amber.subtleLight,
    danger: palette.red[500],
    dangerSubtle: palette.red.subtleLight,
  },

  listingStatus: {
    draft: { fg: palette.neutral[600], bg: palette.neutral[100] },
    active: { fg: palette.green[500], bg: palette.green.subtleLight },
    reserved: { fg: palette.amber[500], bg: palette.amber.subtleLight },
    sold: { fg: palette.neutral[500], bg: palette.neutral[200] },
    removed: { fg: palette.red[500], bg: palette.red.subtleLight },
    // Neutral rather than amber, which `reserved` owns. Expired is "lapsed,
    // not wrong" — to a browser it is stale, to its owner it sits beside a
    // Renew action, so it must not read as an error.
    expired: { fg: palette.neutral[500], bg: palette.neutral[100] },
  },
};

const dark: Colors = {
  // Not pure black: OLED black makes elevation impossible to read, because a
  // raised card has nowhere darker to sit against.
  background: palette.neutral[950],
  surface: palette.neutral[800],
  surfaceSunken: palette.neutral[1000],
  overlay: "rgba(0, 0, 0, 0.66)",

  border: "#262D38",
  borderStrong: "#39414F",

  text: {
    primary: "#F0F3F7",
    secondary: "#A9B3C1",
    tertiary: "#7C8798",
    placeholder: "#5C6675",
    inverse: palette.neutral[900],
  },

  brand: {
    // Lifted two steps from the light-mode brand. `blue[500]` on a near-black
    // page is legible but muddy, and fails contrast at small text sizes.
    default: palette.blue[300],
    pressed: palette.blue[400],
    subtle: "#10243A",
    onBrand: "#0A1622",
    // Not lifted like the rest of the brand, and that is the point: the native
    // splash is `blue[500]` in every scheme, so this has to be too — and so is
    // the white that sits on it.
    launch: palette.blue[500],
    onLaunch: palette.neutral[0],
  },

  status: {
    success: palette.green[400],
    successSubtle: palette.green.subtleDark,
    warning: palette.amber[400],
    warningSubtle: palette.amber.subtleDark,
    danger: palette.red[400],
    dangerSubtle: palette.red.subtleDark,
  },

  listingStatus: {
    draft: { fg: "#A9B3C1", bg: "#262D38" },
    active: { fg: palette.green[400], bg: palette.green.subtleDark },
    reserved: { fg: palette.amber[400], bg: palette.amber.subtleDark },
    sold: { fg: "#7C8798", bg: "#262D38" },
    removed: { fg: palette.red[400], bg: palette.red.subtleDark },
    // Dimmer ground than `sold` so the two are separable at a glance; the pair
    // still carries its label, because meaning is never in colour alone.
    expired: { fg: "#7C8798", bg: "#1F2630" },
  },
};

/** Resolve a scheme to its token set. Prefer `useTheme()` in components. */
export function colorsFor(scheme: ColorScheme): Colors {
  return scheme === "dark" ? dark : light;
}
