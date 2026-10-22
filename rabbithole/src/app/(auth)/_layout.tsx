/**
 * Shell shared by every authentication route.
 *
 * The chrome around the auth forms - page background, screen gutter, dismiss
 * control, and keeping the form clear of the keyboard. Each route supplies its
 * own fields, so this file never learns what "signing in" is. `(auth)` adds no
 * URL segment, so these live at `/sign-in`, not `/auth/sign-in`. There is
 * deliberately no `index.tsx`: it would compete with `(app)/index.tsx` for `/`.
 *
 * Returns: the auth `Stack` inside its shared chrome.
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useRouter, useSegments } from "expo-router";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Default hitSlop for the dismiss chevron, whose glyph is smaller than its box. */
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

/**
 * The screen this group opens on. Load-bearing, not cosmetic.
 *
 * SDK 57's `Stack.Protected` has no `redirectTo`, so a failed guard falls back
 * to the first available screen in this group. Without an anchor the router
 * picks whichever it saw first, and signing out could land on `/verify`. Named
 * once because the back control also needs the bottom of the stack.
 */
const ANCHOR_SCREEN = "sign-in";

export const unstable_settings = { anchor: ANCHOR_SCREEN };

/**
 * Wraps the auth stack in the page background, the standard screen gutter, and a
 * dismiss control.
 *
 * Screens rendered inside are responsible for their own vertical placement - a
 * navigator fills its parent, so centring cannot be imposed from out here.
 */
export default function AuthLayout() {
  const router = useRouter();
  // Headers are hidden here, so nothing else is holding the control clear of the
  // notch or status bar. `expo-router` mounts the provider, so this is safe.
  const insets = useSafeAreaInsets();

  /**
   * Step back through the auth flow.
   *
   * Only rendered when there is somewhere to go. Sign-in is the landing screen
   * for a signed-out user, so it has nothing behind it - and `/` is guarded away
   * until a session exists.
   */
  function handleDismiss() {
    router.back();
  }

  // Derived from segments rather than `router.canGoBack()`, which reads
  // navigation state without subscribing to it: a layout does not re-render when
  // its child stack pushes, so the control would never appear after navigating
  // to /sign-up. `useSegments` is a store subscription, so this stays correct.
  const segments = useSegments();
  const canDismiss = segments[segments.length - 1] !== ANCHOR_SCREEN;

  // Inline because it depends on a runtime inset, which a StyleSheet cannot hold.
  const topSpacing = { marginTop: insets.top + 8 };

  return (
    <KeyboardAvoidingView
      // The background sits on the OUTERMOST element so no part of the screen is
      // ever unpainted. On the inner View, any region it did not cover fell
      // through to the navigator's own background, which read as a border.
      style={styles.screen}
      // iOS pushes content up; Android already resizes the window itself, and
      // applying "padding" on top of that double-counts and clips the form.
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        {/* Outside the Stack so one control serves every screen in the group. */}
        {canDismiss ? (
          <Pressable
            onPress={handleDismiss}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={HIT_SLOP}
            style={[styles.dismiss, topSpacing]}
          >
            <Ionicons name="chevron-back" size={24} color={styles.dismissIcon.color} />
          </Pressable>
        ) : (
          // Reserve the same height so the form does not jump when moving
          // between a screen with a back control and one without.
          <View style={[styles.dismissPlaceholder, topSpacing]} />
        )}

        <Stack
          screenOptions={{
            headerShown: false,
            // Instant swap, no slide. These screens are the same layout with
            // different fields - the logo and heading sit in identical
            // positions - so animating between them slides a near-identical
            // image across the screen, which reads as lag rather than motion.
            animation: "none",
            // The back-swipe is a swipe too, and with no animation to drive it
            // would be a gesture with nothing to show. The chevron is the way back.
            gestureEnabled: false,
            // Stops a screen re-rendering while it is blurred. Without it both
            // screens stay live through the whole push, so every keystroke on
            // the one being animated away costs frames on the one arriving.
            freezeOnBlur: true,
            // Opaque, and painted explicitly. "transparent" looks like the right
            // answer and is not: the screen falls through to React Navigation's
            // own theme, which painted #F2F2F2 behind the form, inset by this
            // layout's gutter - which is what the border around the app was.
            contentStyle: styles.content,
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    // The auth flow is a white page, not the app's slightly grey background.
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    // The same white as the page behind it. See the note on `contentStyle`.
    backgroundColor: "#FFFFFF",
  },
  dismiss: {
    alignItems: "center",
    justifyContent: "center",
    // Hugs the gutter rather than centring with the form above it.
    alignSelf: "flex-start",
    // An accessibility floor, not a style preference.
    width: 44,
    height: 44,
  },
  dismissPlaceholder: {
    height: 44,
  },
  dismissIcon: {
    // Primary text. Not a layout style - `Ionicons` takes a `color` prop, and
    // this is where the value it reads lives.
    color: "#12161D",
  },
});
