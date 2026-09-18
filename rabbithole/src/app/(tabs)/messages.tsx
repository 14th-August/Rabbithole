/**
 * Messages screen — `/messages`.
 *
 * Owns: the list of conversations. A themed placeholder for now.
 * Does not own: an individual thread. That will be its own route.
 */

import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme";

/** The Messages tab. */
export default function Messages() {
  const { colors, layout, spacing, typography } = useTheme();

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.background, paddingHorizontal: layout.screenPaddingX },
      ]}
    >
      <Text style={[typography.title2, { color: colors.text.primary }]}>Messages</Text>
      <Text
        style={[
          typography.subhead,
          { color: colors.text.secondary, marginTop: spacing.xs, textAlign: "center" },
        ]}
      >
        Conversations with buyers and sellers will appear here.
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
