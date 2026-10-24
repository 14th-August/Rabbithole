/**
 * The screen shown while the app works out who is signed in.
 * Returns: a full-screen branded placeholder with a spinner and optional line.
 */

import { Image } from "expo-image";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import mark from "@/assets/images/splash-icon.png";

/** Must equal `expo-splash-screen.imageWidth` in app.json, or the mark jumps. */
const MARK_WIDTH = 76;

/** Props for {@link BootScreen}. */
interface BootScreenProps {
  /**
   * Optional line under the spinner.
  */
  message?: string;
}

export function BootScreen({ message }: BootScreenProps) {
  return (
    <View
      style={styles.screen}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading Rabbithole"
    >
      <Image
        source={mark}
        style={styles.mark}
        contentFit="contain"
        // The wrapper's label already announces this screen.
        accessible={false}
      />
      <ActivityIndicator color={styles.message.color} style={styles.spinner} />
      {message !== undefined ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    // Must equal `expo-splash-screen.backgroundColor` in app.json, which the OS
    // paints before any JavaScript runs. A mismatch flashes at the handover.
    backgroundColor: "#0165F2",
  },
  mark: {
    width: MARK_WIDTH,
    height: MARK_WIDTH,
  },
  spinner: {
    marginTop: 24,
  },
  message: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "400",
    // White, matching the rabbit, which is white on this screen in every case.
    color: "#FFFFFF",
    marginTop: 12,
    paddingHorizontal: 24,
  },
});
