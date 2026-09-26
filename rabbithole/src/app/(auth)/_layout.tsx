/**
 * Shell shared by every authentication route.
 *
 * Owns: the chrome around the auth forms — page background, the screen gutter,
 * the dismiss control, and keeping the form clear of the keyboard.
 * Does not own: the fields inside it, or what submitting one means. Each route
 * supplies its own form, so this file never learns what "signing in" is.
 *
 * Why a group and not a stack of real segments: `(auth)` adds no URL segment, so
 * these screens live at `/sign-in` and `/sign-up` rather than `/auth/sign-in`.
 * The group exists to attach this layout, not to namespace the URLs.
 *
 * There is deliberately no `index.tsx` here. An index would compete with
 * `(tabs)/index.tsx` for `/`, and the tab feed owns that route. `unstable_settings`
 * below is what names the landing screen instead.
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useRouter, useSegments } from "expo-router";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme";

/**
 * The screen this group opens on.
 *
 * Load-bearing, not cosmetic. The root layout guards `(tabs)` behind a session,
 * and SDK 57's `Stack.Protected` has no `redirectTo` — a failed guard falls back
 * to the first available screen, which is this group. Without an anchor the
 * router would pick whichever route it happened to see first, so signing out
 * could land on `/verify`.
 *
 * Named once because the back control below also needs to know which screen is
 * the bottom of the stack.
 */
const ANCHOR_SCREEN = "sign-in";

export const unstable_settings = { anchor: ANCHOR_SCREEN };

/**
 * Wraps the auth stack in the page background, the standard screen gutter, and a
 * dismiss control.
 *
 * Screens rendered inside are responsible for their own vertical placement —
 * a navigator fills its parent, so centring cannot be imposed from out here.
 */
export default function AuthLayout() {
  const { colors, layout, spacing } = useTheme();
  const router = useRouter();
  // Headers are hidden here, so nothing else is holding the control clear of the
  // notch or status bar. `expo-router` mounts the provider, so this is safe.
  const insets = useSafeAreaInsets();

  /**
   * Step back through the auth flow.
   *
   * Only rendered when there is somewhere to go. Sign-in is the landing screen
   * for a signed-out user now, so it has nothing behind it — and `/` is guarded
   * away until a session exists, which is what the old unconditional push
   * assumed.
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

  return (
    <KeyboardAvoidingView
      // The background sits on the OUTERMOST element so no part of the screen is
      // ever unpainted. While it was on the inner View, any region that View did
      // not cover fell through to the navigator's own background, which is what
      // read as a border around the app.
      style={[styles.flex, { backgroundColor: colors.surface }]}
      // iOS pushes content up; Android already resizes the window itself, and
      // applying "padding" on top of that double-counts and clips the form.
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* `surface` is `neutral[0]` — #FFFFFF — but stays a token so the page, its
          text, its fields and its borders remain a set one edit can restyle. */}
      <View style={[styles.container, { paddingHorizontal: layout.screenPaddingX }]}>
        {/* Outside the Stack so one control serves every screen in the group. */}
        {canDismiss ? (
          <Pressable
            onPress={handleDismiss}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={layout.hitSlop}
            style={[
              styles.dismiss,
              {
                width: layout.tapTargetMin,
                height: layout.tapTargetMin,
                marginTop: insets.top + spacing.sm,
              },
            ]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </Pressable>
        ) : (
          // Reserve the same height so the form does not jump when moving
          // between a screen with a back control and one without.
          <View style={{ height: layout.tapTargetMin, marginTop: insets.top + spacing.sm }} />
        )}

        <Stack
          screenOptions={{
            headerShown: false,
            // Instant swap, no slide. These screens are the same layout with
            // different fields — the logo and heading sit in identical
            // positions — so animating between them slides a near-identical
            // image across the screen, which reads as lag rather than motion.
            // Cutting straight to the new one is both faster and calmer.
            animation: "none",
            // The back-swipe is a swipe too, and with no animation to drive it
            // would be a gesture with nothing to show. The chevron in this
            // layout is the way back.
            gestureEnabled: false,
            // Stops a screen re-rendering while it is blurred. Without it both
            // screens stay live through the whole push, so every keystroke and
            // state change on the one being animated away costs frames on the
            // one arriving. react-native-screens does the freezing natively.
            freezeOnBlur: true,
            // Opaque, and painted from a token. "transparent" looks like the
            // right answer and is not: the screen still falls through to React
            // Navigation's own theme, which is a colour no token owns. That
            // fall-through painted #F2F2F2 behind the form, inset by this
            // layout's gutter — which is what the border around the app was.
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  dismiss: {
    alignItems: "center",
    justifyContent: "center",
    // Hugs the gutter rather than centring with the form above it.
    alignSelf: "flex-start",
  },
});
