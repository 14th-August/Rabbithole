/*
 * Date: 2026-10-30
 * Saved -- the /saved tab. Placeholder, not built yet.
 * Becomes real once the feed's heart writes to saved_listings.
*/

import { StyleSheet, Text, View } from "react-native";

/*
* Def: Saved
* Desc: The bookmarked listings. saved_listings exists in the schema and
* SavedListing in src/types, with no reader for either yet -- the Discover
* card's heart reads is_saved but does not write it.
* Return: the placeholder.
*/
export default function Saved() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Saved</Text>
      <Text style={styles.body}>Listings you save will appear here.</Text>
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
