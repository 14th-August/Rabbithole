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
 * `(tabs)/index.tsx` for `/`, and the tab feed owns that route.
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme";

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
   * Leave the auth flow for the tab feed.
   *
   * Deliberately unconditional for now: popping would strand anyone who arrived
   * by deep link, since a direct hit on `/sign-in` has no history to pop and the
   * headers here are hidden. Revisit once there is a session to route on.
   */
  function handleDismiss() {
    router.push("/");
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      // iOS pushes content up; Android already resizes the window itself, and
      // applying "padding" on top of that double-counts and clips the form.
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingHorizontal: layout.screenPaddingX,
          },
        ]}
      >
        {/* Outside the Stack so one control serves both sign-in and sign-up. */}
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

        <Stack
          screenOptions={{
            headerShown: false,
            // Transparent so the themed background above shows through rather
            // than the navigator painting its own default white.
            contentStyle: { backgroundColor: "transparent" },
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
