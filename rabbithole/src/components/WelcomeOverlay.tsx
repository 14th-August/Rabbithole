/**
 * The one-time greeting a new account sees before the app.
 *
 * Decides whether this user is owed a welcome, shows it, then gets out of the
 * way. `welcome.ts` holds the flag and `auth.ts` sets it. Rendered over the
 * navigator rather than as a route: it is not a place in the app, so a URL would
 * put a decoration in the route table and let a deep link reach it out of
 * context. Painted the same fixed blue as the splash and boot screen, so the
 * whole first run is one continuous surface.
 *
 * Returns: a fading overlay for a newly confirmed account, and `null` for
 * everyone else - so it is safe to mount unconditionally wherever a session exists.
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
import { consumeWelcome } from "@/lib/verification";

/** Must match `BootScreen` and app.json, so the first run never changes colour. */
const LAUNCH_BLUE = "#0165F2";
const ON_LAUNCH = "#FFFFFF";

/** 1.5x the splash mark. Larger than boot on purpose - this one is the subject. */
const MARK_WIDTH = 76 * 1.5;

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
  // A lazy initialiser, not an effect: it runs exactly once, which is what a
  // one-shot flag wants, and keeps setState out of an effect body where the
  // compiler bails on the Rules of React violation silently.
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
        // instead would race the animation and flash the screen in mid-fade.
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
      style={[StyleSheet.absoluteFill, styles.screen, fade]}
      // Covers the screen while it is up, so a tap during the greeting cannot
      // land on a control the user has not seen yet.
      pointerEvents="auto"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Image source={mark} style={styles.mark} contentFit="contain" accessible={false} />

      <Text style={styles.greeting}>Welcome to the marketplace {firstName}!</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: LAUNCH_BLUE,
  },
  mark: {
    width: MARK_WIDTH,
    height: MARK_WIDTH,
  },
  greeting: {
    textAlign: "center",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: ON_LAUNCH,
    marginTop: 24,
    paddingHorizontal: 24,
  },
});
