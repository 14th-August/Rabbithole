/**
 * Spacing, radii, and layout constants.
 *
 * Owns: every number that describes distance in the UI.
 * Does not own: colour or type. Those are siblings in this folder.
 *
 * A 4pt base grid. The constraint is the feature — arbitrary values are what make
 * a layout feel subtly wrong without anyone being able to say why. If a design
 * needs 18, the answer is 16 or 24, not a new token.
 */

export const spacing = {
  /** 4 — hairline gaps, icon-to-label. */
  xs: 4,
  /** 8 — tight internal padding, chip padding. */
  sm: 8,
  /** 12 — default gap between related elements. */
  md: 12,
  /** 16 — card padding, screen gutters. The workhorse. */
  lg: 16,
  /** 24 — separation between sections. */
  xl: 24,
  /** 32 — major section breaks. */
  xxl: 32,
  /** 48 — empty-state breathing room. */
  xxxl: 48,
} as const;

export const radius = {
  /** 6 — chips, badges, small inputs. */
  sm: 6,
  /** 10 — buttons, image thumbnails. */
  md: 10,
  /** 14 — listing cards, sheets. */
  lg: 14,
  /** 20 — modal sheets, hero imagery. */
  xl: 20,
  /** Fully round. Avatars and pill filters. */
  pill: 999,
} as const;

export const layout = {
  /** Horizontal gutter on every screen. Keep consistent or the app feels drunk. */
  screenPaddingX: spacing.lg,
  /** Vertical gap between cards in a feed. */
  listGap: spacing.md,

  /**
   * 44 — the minimum square a finger can reliably hit (Apple HIG; Material says
   * 48). Small icon buttons must pad or `hitSlop` up to this even when the glyph
   * is 20pt. This is an accessibility floor, not a style preference.
   */
  tapTargetMin: 44,

  /** Default `hitSlop` inset for small controls. */
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },

  /** Hairline that stays 1 physical pixel across densities. */
  borderWidth: 1,

  /**
   * 76 — width of the rabbit on the launch screen.
   *
   * Must equal `imageWidth` in the `expo-splash-screen` config in app.json. The
   * OS draws the native splash from that value before any JavaScript runs, so a
   * mismatch here makes the mark visibly jump at the handover. One of the very
   * few numbers in this file that is pinned to something outside it.
   */
  splashMarkWidth: 76,

  /** Listing cover images. 4:3 reads better than square for books and furniture. */
  listingAspectRatio: 4 / 3,
} as const;
