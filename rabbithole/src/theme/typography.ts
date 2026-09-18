/**
 * Type scale.
 *
 * Owns: font size, line height, weight, and letter spacing for every text role.
 * Does not own: colour. Compose them — `[theme.typography.body, { color: c.text.primary }]`.
 *   Keeping colour out is what lets one scale serve both schemes.
 *
 * Each variant is a complete `TextStyle`, spreadable straight into a style array.
 * Line heights are explicit on purpose: React Native's default leading differs
 * between iOS and Android, so omitting it is how a layout drifts across platforms.
 *
 * No custom font is loaded yet, so these resolve to the system face (SF on iOS,
 * Roboto on Android). `expo-font` is already a dependency for when that changes;
 * adding a family here is then a one-file edit.
 */

import type { TextStyle } from "react-native";

export const typography = {
  /** Rare. Empty-state headlines, onboarding. */
  display: { fontSize: 32, lineHeight: 38, fontWeight: "700", letterSpacing: -0.5 },

  /** Screen titles. */
  title1: { fontSize: 24, lineHeight: 30, fontWeight: "700", letterSpacing: -0.3 },
  /** Section headings, listing detail title. */
  title2: { fontSize: 20, lineHeight: 26, fontWeight: "600", letterSpacing: -0.2 },
  /** Card titles, list row headings. */
  title3: { fontSize: 17, lineHeight: 22, fontWeight: "600" },

  /** Default reading size — descriptions, message bubbles. */
  body: { fontSize: 16, lineHeight: 22, fontWeight: "400" },
  /** Body weight bumped for emphasis. Same metrics, so it never reflows. */
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: "600" },

  /** Secondary copy, button labels. */
  callout: { fontSize: 15, lineHeight: 20, fontWeight: "500" },
  /** Metadata rows, seller names on cards. */
  subhead: { fontSize: 14, lineHeight: 19, fontWeight: "400" },
  /** Timestamps, helper text. */
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: "400" },
  /** Badges and chips. Small enough that weight carries it. */
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "600", letterSpacing: 0.2 },

  /**
   * Prices get their own variant rather than borrowing `title3`.
   *
   * Price is the single most-scanned element on a marketplace card; tying it to a
   * general heading style means a later typographic tweak to headings silently
   * changes scanning behaviour across the whole feed. Tabular figures would be
   * ideal here — revisit when a custom font lands.
   */
  price: { fontSize: 18, lineHeight: 22, fontWeight: "700", letterSpacing: -0.2 },
  /** Price on a compact card. */
  priceCompact: { fontSize: 16, lineHeight: 20, fontWeight: "700", letterSpacing: -0.2 },
} satisfies Record<string, TextStyle>;

/** Union of every variant name — `"body" | "title1" | ...`. */
export type TypographyVariant = keyof typeof typography;
