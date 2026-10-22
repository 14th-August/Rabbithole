/**
 * Messages — `/messages`.
 *
 * Buyer and seller conversations, not built yet. The schema carries the tables
 * already and nothing here reads them. A placeholder to be replaced wholesale
 * when messaging lands, rather than grown into the real screen.
 *
 * Returns: the Messages placeholder.
 */

import { StyleSheet, Text, View } from "react-native";

/** The conversations list's placeholder. */
export default function Messages() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Messages</Text>
      <Text style={styles.body}>Conversations with buyers and sellers will appear here.</Text>
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
