/**
 * The one-time greeting a new account sees before the app.
 *
 * Owns: deciding whether this user is owed a welcome, showing it, and getting
 *   out of the way.
 * Does not own: who is signed in, or when an account became new. `welcome.ts`
 *   holds that flag and `auth.ts` sets it.
 *
 * Renders over the tabs rather than as a route. It is not a place in the app —
 * there is nothing to navigate to or back from — so giving it a URL would put a
 * decoration in the route table and let a deep link reach it out of context.
 *
 * Painted `brand.launch`, the same fixed blue as the native splash and the boot
 * screen. That makes the whole first-run sequence one continuous blue surface
 * rather than three separate ones that happen to be similar.
 */

import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import mark from "@/assets/images/splash-icon.png";
import { consumeWelcome } from "@/lib/welcome";
import { useTheme } from "@/theme";

/**
 * How long the greeting holds at full opacity, in ms.
 *
 * Long enough to read a name you have just typed and a line you have not seen
 * before. Under about two seconds it registers as a flash rather than a
 * greeting, which is the thing this screen exists to avoid.
 */
const HOLD_MS = 2000;

/** How long the fade itself takes, in ms. */
const FADE_MS = 450;

/** Props for {@link WelcomeOverlay}. */
interface WelcomeOverlayProps {
  /** The signed-in user's id. Decides whether the greeting is owed at all. */
  userId: string;
  /**
   * What to call them.
   *
   * Pass the full display name; this trims it to the first word itself, because
   * "Welcome to the marketplace Casey Adams!" reads like a form letter.
   */
  name: string;
}

/**
 * Greets a newly confirmed account, once, then fades out.
 *
 * Renders nothing at all for everyone else, so it is safe to mount
 * unconditionally wherever a session exists.
 */
export function WelcomeOverlay({ userId, name }: WelcomeOverlayProps) {
  const { colors, spacing, typography, layout } = useTheme();

  // Read in a lazy initialiser rather than an effect. It runs exactly once, on
  // the first render, which is what a one-shot flag wants — and it keeps the
  // read out of an effect body, where calling setState is a Rules of React
  // violation the compiler bails on silently.
  const [isOwed] = useState(() => consumeWelcome(userId));
  const [isMounted, setIsMounted] = useState(isOwed);

  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!isOwed) return;

    opacity.value = withDelay(
      HOLD_MS,
      withTiming(0, { duration: FADE_MS }, (finished) => {
        "worklet";
        // Unmount only once the pixels are actually gone. Dropping it on a timer
        // instead would race the animation and flash the tabs in mid-fade.
        if (finished) runOnJS(setIsMounted)(false);
      }),
    );
  }, [isOwed, opacity]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!isMounted) return null;

  // First word only. See the `name` prop.
  const firstName = name.trim().split(" ")[0];

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.screen, fade, { backgroundColor: colors.brand.launch }]}
      // Covers the tabs while it is up, so a tap during the greeting cannot land
      // on a control the user has not seen yet.
      pointerEvents="auto"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Image
        source={mark}
        style={{ width: layout.splashMarkWidth * 1.5, height: layout.splashMarkWidth * 1.5 }}
        contentFit="contain"
        accessible={false}
      />

      <Text
        style={[
          typography.title1,
          styles.greeting,
          {
            color: colors.brand.onLaunch,
            marginTop: spacing.xl,
            paddingHorizontal: spacing.xl,
          },
        ]}
      >
        Welcome to the marketplace {firstName}!
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    textAlign: "center",
  },
});
