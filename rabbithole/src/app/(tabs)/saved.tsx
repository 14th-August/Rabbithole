/**
 * Saved screen — `/saved`.
 *
 * Owns: the listings this student has bookmarked. A themed placeholder for now.
 * Does not own: saving or unsaving. That belongs to the listing card.
 */

import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme";

/** The Saved tab. */
export default function Saved() {
  const { colors, layout, spacing, typography } = useTheme();

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.background, paddingHorizontal: layout.screenPaddingX },
      ]}
    >
      <Text style={[typography.title2, { color: colors.text.primary }]}>Saved</Text>
      <Text
        style={[
          typography.subhead,
          { color: colors.text.secondary, marginTop: spacing.xs, textAlign: "center" },
        ]}
      >
        Listings you save will appear here.
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
