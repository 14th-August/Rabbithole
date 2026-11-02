/*
 * Date: 2026-10-30
 * Uploads -- the /uploads tab. Placeholder, not built yet.
 * Shows what you have posted; create.tsx already writes the rows it will read.
*/

import { StyleSheet, Text, View } from "react-native";

/*
* Def: Uploads
* Desc: Your own listings. The rows exist -- create.tsx writes them -- so this
* needs only a seller-scoped read, which listings_seller_idx is built for.
* Return: the placeholder.
*/
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
