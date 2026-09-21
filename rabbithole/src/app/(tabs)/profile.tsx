/**
 * Profile screen — `/profile`.
 *
 * Owns: the signed-in student's own account view, and — until a session exists —
 * the signed-out state that offers a way into the auth flow.
 * Does not own: another student's public profile. That will be a separate route
 * keyed by id, because what a seller shows strangers is not what you show
 * yourself. Nor does it own what signing in means; it only links to the screens
 * that will ask.
 *
 * Why signed-out is the default: there is no session yet, so rendering an
 * account view would be a lie. Signed-out is the honest state, and it is also
 * the only entry point the tab bar offers into `(auth)`.
 */

import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme";

/** The Profile tab. */
export default function Profile() {
  const { colors, layout, radius, spacing, typography } = useTheme();

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.background, paddingHorizontal: layout.screenPaddingX },
      ]}
    >
      <Text style={[typography.title2, { color: colors.text.primary }]}>Profile</Text>
      <Text
        style={[
          typography.subhead,
          { color: colors.text.secondary, marginTop: spacing.xs, textAlign: "center" },
        ]}
      >
        Sign in to see your listings, your reviews, and your account settings.
      </Text>

      {/*
        `asChild` makes Link clone this Pressable and merge its own props in,
        and it cannot merge into a style array — hence StyleSheet.flatten.
        Plain `<Link style={[...]}>` elsewhere is fine; it renders a Text, which
        accepts arrays. Only the asChild path needs this.
      */}
      <Link href="/sign-in" asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          style={StyleSheet.flatten([
            styles.button,
            {
              minHeight: layout.tapTargetMin,
              borderRadius: radius.md,
              backgroundColor: colors.brand.default,
              marginTop: spacing.xl,
              paddingHorizontal: spacing.xl,
            },
          ])}
        >
          <Text style={[typography.bodyStrong, { color: colors.brand.onBrand }]}>Sign in</Text>
        </Pressable>
      </Link>

      <View style={[styles.footer, { marginTop: spacing.lg }]}>
        <Text style={[typography.footnote, { color: colors.text.secondary }]}>New here? </Text>
        <Link href="/sign-up" style={[typography.footnote, { color: colors.brand.default }]}>
          Create an account
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
  },
});
