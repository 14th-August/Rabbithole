/**
 * The screen shown while the app works out who is signed in.
 *
 * Stands in between the native splash disappearing and the first real route
 * mounting; `SessionProvider` does the actual work. Painted LAUNCH_BLUE rather
 * than the page background because the native splash before it is a fixed
 * `#0165F2` from app.json, drawn by the OS before any JavaScript runs - matching
 * that colour and reusing the same white rabbit makes the handover invisible.
 *
 * Returns: a full-screen branded placeholder with a spinner and optional line.
 */

import { Image } from "expo-image";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import mark from "@/assets/images/splash-icon.png";

/**
 * Must equal `expo-splash-screen.backgroundColor` in app.json. A mismatch
 * flashes at the native-to-JS handover, which reads as a bug.
 */
const LAUNCH_BLUE = "#0165F2";

/** White, matching the rabbit, which is white on this screen in every case. */
const ON_LAUNCH = "#FFFFFF";

/** Must equal `expo-splash-screen.imageWidth` in app.json, or the mark jumps. */
const MARK_WIDTH = 76;

/** Props for {@link BootScreen}. */
interface BootScreenProps {
  /**
   * Optional line under the spinner.
   *
   * Left unset for an ordinary launch, which resolves far too fast to read.
   * Worth passing when the wait has a cause the user would otherwise misread -
   * an expired session being cleared, for instance.
   */
  message?: string;
}

/** Full-screen branded placeholder, matched to the native splash. */
export function BootScreen({ message }: BootScreenProps) {
  return (
    <View
      style={styles.screen}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading Rabbithole"
    >
      {/* Square box with `contain`, not the mark's true 512x454. The rabbit is
          still exactly MARK_WIDTH across, which is what must match the native
          splash; the spare height is transparent on the same blue. */}
      <Image
        source={mark}
        style={styles.mark}
        contentFit="contain"
        // The wrapper's label already announces this screen.
        accessible={false}
      />

      <ActivityIndicator color={ON_LAUNCH} style={styles.spinner} />

      {message !== undefined ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: LAUNCH_BLUE,
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
    color: ON_LAUNCH,
    marginTop: 12,
    paddingHorizontal: 24,
  },
});
