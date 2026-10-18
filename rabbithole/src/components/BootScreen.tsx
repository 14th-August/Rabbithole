/**
 * The screen shown while the app works out who is signed in.
 *
 * Stands in between the native splash disappearing and the first real route
 * mounting; `SessionProvider` does the actual work. Painted `brand.launch`
 * rather than `surface` because the native splash before it is a fixed `#0165F2`
 * from app.json, drawn by the OS before any JavaScript runs — matching that
 * colour and reusing the same white rabbit makes the handover invisible. A white
 * page here would flash blue then white, which reads as a bug.
 *
 * Returns: a full-screen branded placeholder with a spinner and optional line.
 */

import { Image } from "expo-image";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import mark from "@/assets/images/splash-icon.png";
import { useTheme } from "@/theme";

/** Props for {@link BootScreen}. */
interface BootScreenProps {
  /**
   * Optional line under the spinner.
   *
   * Left unset for an ordinary launch, which resolves far too fast to read.
   * Worth passing when the wait has a cause the user would otherwise misread —
   * an expired session being cleared, for instance.
   */
  message?: string;
}

/** Full-screen branded placeholder, matched to the native splash. */
export function BootScreen({ message }: BootScreenProps) {
  const { colors, spacing, layout, typography } = useTheme();

  return (
    <View
      style={[styles.screen, { backgroundColor: colors.brand.launch }]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading Rabbithole"
    >
      {/* Square box with `contain`, not the mark's true 512x454. The rabbit is
          still exactly `splashMarkWidth` across, which is what must match the
          native splash; the spare height is transparent on the same blue. */}
      <Image
        source={mark}
        style={{ width: layout.splashMarkWidth, height: layout.splashMarkWidth }}
        contentFit="contain"
        // The wrapper's label already announces this screen.
        accessible={false}
      />

      <ActivityIndicator
        // White, matching the rabbit above it. Deliberately not `onBrand`, which
        // flips to near-black in dark mode — correct on a dark-mode button, but
        // near-invisible against the launch screen's fixed blue.
        color={colors.brand.onLaunch}
        style={{ marginTop: spacing.xl }}
      />

      {message !== undefined ? (
        <Text
          style={[
            typography.subhead,
            styles.message,
            {
              color: colors.brand.onLaunch,
              marginTop: spacing.md,
              paddingHorizontal: spacing.xl,
            },
          ]}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    textAlign: "center",
  },
});
