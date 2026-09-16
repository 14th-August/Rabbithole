import { StyleSheet, Text, View, useColorScheme } from "react-native";

export default function Discover() {
  const isDark = useColorScheme() === "dark";

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Text style={[styles.text, isDark && styles.textDark]}>
        This is the Discover screen
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  containerDark: {
    backgroundColor: "#000000",
  },
  text: {
    fontSize: 18,
    fontWeight: "600",
    color: "#11181C",
  },
  textDark: {
    color: "#ECEDEE",
  },
});
