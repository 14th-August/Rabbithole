/**
 * The screen shown while the app works out who is signed in.
 *
 * Owns: what the user looks at between the native splash disappearing and the
 *   first real route mounting.
 * Does not own: the work itself. `SessionProvider` reads the stored session and
 *   applies the five-day rule; this only stands in while that resolves.
 *
 * Why it is painted `brand.launch` rather than `surface`: the native splash that
 * precedes it is a fixed `#0165F2` from app.json, drawn by the OS before any
 * JavaScript runs. Matching that colour exactly — and reusing the same white
 * rabbit at the same width — makes the handover invisible. A white page here
 * would flash blue then white, which reads as a bug even though it is not.
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
      {/*
        A square box with `contain` rather than the mark's true 512x454 ratio.
        The rendered rabbit is still exactly `splashMarkWidth` across, which is
        what has to match the native splash; the extra height is transparent and
        sits on the same blue, so it cannot be seen.
      */}
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
