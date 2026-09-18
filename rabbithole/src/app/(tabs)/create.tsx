/**
 * Create screen — `/create`.
 *
 * Owns: posting a new listing. A themed placeholder until the form is built.
 * Does not own: what may or may not be listed. The university guidelines shown
 * during this flow come from content policy, not from this file.
 */

import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme";

/** The Create tab. */
export default function Create() {
  const { colors, layout, spacing, typography } = useTheme();

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.background, paddingHorizontal: layout.screenPaddingX },
      ]}
    >
      <Text style={[typography.title2, { color: colors.text.primary }]}>Create a listing</Text>
      <Text
        style={[
          typography.subhead,
          { color: colors.text.secondary, marginTop: spacing.xs, textAlign: "center" },
        ]}
      >
        The form for posting something for sale will live here.
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
