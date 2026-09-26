/**
 * Semantic colour tokens for light and dark.
 *
 * Owns: the mapping from raw ramps to meanings, once per scheme.
 * Does not own: which scheme is active. That is `useTheme()`'s job.
 *
 * Tokens are named for their role, never their appearance — `text.secondary`,
 * not `grey600`. This is the whole reason dark mode works: the role is stable
 * across schemes even though the hex is not. A token called `grey600` has nowhere
 * to go when the background turns black.
 *
 * The two palettes below are exhaustive and parallel: `Colors` is the contract,
 * and adding a token to it breaks compilation until *both* schemes define it.
 * That is deliberate — a token that exists in only one scheme is a dark-mode bug
 * that ships.
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
     * White in light mode, but near-black in dark mode: the dark scheme lifts the
     * brand blue to `blue[300]` for legibility against a dark page, and white text
     * on `#66A6FF` fails contrast badly. This token existing is what stops that
     * bug — a hardcoded `color: "#fff"` on a primary button would ship it.
     */
    onBrand: string;
    /**
     * The launch background.
     *
     * The one token that is deliberately **identical in both schemes**. A native
     * splash screen is painted by the OS from a fixed colour in `app.json`, long
     * before React or `useColorScheme` exist, so anything rendered on top of it
     * has to match that one value or the handover flickers.
     */
    launch: string;
    /**
     * Foreground on {@link launch} — the spinner, and any text beside it.
     *
     * Fixed in both schemes for the same reason `launch` is. `onBrand` cannot be
     * used here: it is near-black in dark mode, which is correct on the lifted
     * `blue[300]` of a dark-mode button but invisible on the launch screen's
     * fixed `blue[500]`. It is also simply the wrong colour — the rabbit on that
     * screen is white, and the spinner beside it should match.
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
  },
};

/** Resolve a scheme to its token set. Prefer `useTheme()` in components. */
export function colorsFor(scheme: ColorScheme): Colors {
  return scheme === "dark" ? dark : light;
}
