/**
 * Uploads — `/uploads`.
 *
 * The listings you have posted, not built yet. Named `uploads` to match the tab
 * label and the trigger in `_layout.tsx` - the file was `uploaded.tsx`, which
 * left that trigger pointing at a route the router never created.
 *
 * Returns: the Uploads placeholder.
 */

import { StyleSheet, Text, View } from "react-native";

/** The your-listings list's placeholder. */
export default function Uploads() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Uploads</Text>
      <Text style={styles.body}>Listings you post will appear here.</Text>
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
