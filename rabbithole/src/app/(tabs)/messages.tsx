/*
 * Date: 2026-10-30
 * Messages -- the /messages tab. Placeholder, not built yet.
 * Becomes real once a listing can be opened and its seller contacted.
*/

import { StyleSheet, Text, View } from "react-native";

/*
* Def: Messages
* Desc: The buyer/seller inbox. conversations and messages exist in the schema
* with no reader, and nothing can start a thread until a listing opens.
* Return: the placeholder.
*/
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
