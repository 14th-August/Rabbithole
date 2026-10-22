/**
 * Discover — `/`, and the tab the app opens on.
 *
 * The browse feed, not built yet. Being `index.tsx` is what makes this the
 * default tab, so the file has to exist even while it is a placeholder. The
 * sentence below is the empty state the real feed keeps for when nothing
 * matches.
 *
 * Returns: the Discover placeholder.
 */

import { StyleSheet, Text, View } from "react-native";

/** The browse feed's placeholder. */
export default function Discover() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Discover</Text>
      <Text style={styles.body}>
        Textbooks and second-hand items from students on your campus will appear here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    // The app's page background. Painted here rather than left to the navigator:
    // React Navigation's default theme is #F2F2F2, which is not this value.
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
