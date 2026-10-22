/**
 * Create — `/create`.
 *
 * Posting a listing, not built yet. The form that used to live here went in the
 * scale-down to auth and is being rebuilt from the schema rather than restored,
 * so this is a placeholder and not a stripped version of it. Reached from the
 * raised plus in the middle of the tab bar, which is this tab's own icon.
 *
 * Returns: the Create placeholder.
 */

import { StyleSheet, Text, View } from "react-native";

/** The new-listing form's placeholder. */
export default function Create() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Create</Text>
      <Text style={styles.body}>Listing something for sale starts here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    // The app's page background.
    backgroundColor: "#F7F8FA",
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    letterSpacing: -0.3,
    // Primary text.
    color: "#12161D",
  },
  body: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400",
    // Secondary text, a step down from the title above it.
    color: "#4C5566",
    marginTop: 8,
  },
});
