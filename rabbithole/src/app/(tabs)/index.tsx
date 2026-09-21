/**
 * Discover screen — `/`.
 *
 * Owns: the campus feed. A themed placeholder until the feed is built.
 * Does not own: listing data. That arrives through `getFeed` in
 * `src/lib/queries/listings.ts`, never by calling `supabase` here.
 */

import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme";

/** The Discover tab. */
export default function Discover() {
  const { colors, layout, spacing, typography } = useTheme();

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.background, paddingHorizontal: layout.screenPaddingX },
      ]}
    >
      <Text style={[typography.title2, { color: colors.text.primary }]}>Discover</Text>
      <Text
        style={[
          typography.subhead,
          { color: colors.text.secondary, marginTop: spacing.xs, textAlign: "center" },
        ]}
      >
        Listings from students on campus will appear here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
