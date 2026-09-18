/**
 * Shell shared by every authentication route.
 *
 * Owns: the chrome around the auth forms — page background, the screen gutter,
 * and keeping the form clear of the keyboard.
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

import { Stack } from "expo-router";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";

import { useTheme } from "@/theme";

/**
 * Wraps the auth stack in the page background and the standard screen gutter.
 *
 * Screens rendered inside are responsible for their own vertical placement —
 * a navigator fills its parent, so centring cannot be imposed from out here.
 */
export default function AuthLayout() {
  const { colors, layout } = useTheme();

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
});
