/**
 * Profile screen — `/profile`.
 *
 * Owns: the signed-in student's own account view. A themed placeholder for now.
 * Does not own: another student's public profile. That will be a separate route
 * keyed by id, because what a seller shows strangers is not what you show
 * yourself.
 */

import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme";

/** The Profile tab. */
export default function Profile() {
  const { colors, layout, spacing, typography } = useTheme();

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.background, paddingHorizontal: layout.screenPaddingX },
      ]}
    >
      <Text style={[typography.title2, { color: colors.text.primary }]}>Profile</Text>
      <Text
        style={[
          typography.subhead,
          { color: colors.text.secondary, marginTop: spacing.xs, textAlign: "center" },
        ]}
      >
        Your listings, reviews, and account settings will appear here.
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
