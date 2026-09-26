/**
 * Profile screen — `/profile`.
 *
 * Owns: the signed-in student's own account view, and the control that ends
 * their session.
 * Does not own: another student's public profile. That will be a separate route
 * keyed by id, because what a seller shows strangers is not what you show
 * yourself. Nor does it own what signing out *means* — `signOut` in
 * `src/lib/auth.ts` does that, and the root layout decides where it lands you.
 *
 * This screen no longer carries a signed-out state. It used to, from before
 * there was a session to check, and that became unreachable the moment the root
 * layout put `(tabs)` behind a guard: nobody without a session can open this
 * route, so "Sign in to see your listings" was being shown only to people who
 * already had. The old Sign in button also pointed at `/sign-in`, which the same
 * guard makes unreachable from here.
 */

import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { signOut } from "@/lib/auth";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { useTheme } from "@/theme";

/** The Profile tab. */
export default function Profile() {
  const { colors, layout, radius, spacing, typography } = useTheme();
  const { session, profile } = useSession();

  const submit = useAsync(() => signOut(supabase));
  const [hasConfirmed, setHasConfirmed] = useState(false);

  /**
   * Sign out, in two taps.
   *
   * A single tap is too easy to hit by accident on a screen people open to look
   * at their own listings, and there is no undo — the next screen is the sign-in
   * form. The second tap is the confirmation.
   */
  async function handlePress() {
    if (!hasConfirmed) {
      setHasConfirmed(true);
      return;
    }

    // No navigation afterwards, deliberately. Clearing the session fires
    // `onAuthStateChange`, which flips the root layout's guard and swaps route
    // groups; routing by hand here would race that swap.
    await submit.run();
  }

  // `profile` is null for a moment after launch while the row loads, and for the
  // window between signup and confirmation. The email always exists, so it is
  // the honest fallback rather than a spinner over the whole screen.
  const name = profile?.display_name ?? session?.user.email ?? "Signed in";

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.background, paddingHorizontal: layout.screenPaddingX },
      ]}
    >
      <Text style={[typography.title2, styles.centered, { color: colors.text.primary }]}>
        {name}
      </Text>

      {profile !== null ? (
        <Text
          style={[
            typography.subhead,
            styles.centered,
            { color: colors.text.secondary, marginTop: spacing.xs },
          ]}
        >
          {session?.user.email}
        </Text>
      ) : null}

      <Text
        style={[
          typography.footnote,
          styles.centered,
          { color: colors.text.tertiary, marginTop: spacing.xl },
        ]}
      >
        Your listings, reviews, and settings will live here.
      </Text>

      {submit.error !== null ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[
            typography.footnote,
            styles.centered,
            { color: colors.status.danger, marginTop: spacing.lg },
          ]}
        >
          {submit.error}
        </Text>
      ) : null}

      <Pressable
        onPress={handlePress}
        disabled={submit.isPending}
        accessibilityRole="button"
        accessibilityLabel={hasConfirmed ? "Confirm sign out" : "Sign out"}
        accessibilityHint={hasConfirmed ? undefined : "Asks you to confirm before signing out"}
        accessibilityState={{ disabled: submit.isPending, busy: submit.isPending }}
        style={[
          styles.button,
          {
            minHeight: layout.tapTargetMin,
            borderRadius: radius.pill,
            borderWidth: layout.borderWidth,
            borderColor: hasConfirmed ? colors.status.danger : colors.border,
            backgroundColor: colors.surface,
            marginTop: spacing.xxl,
            paddingHorizontal: spacing.xl,
            opacity: submit.isPending ? 0.5 : 1,
          },
        ]}
      >
        {submit.isPending ? (
          <ActivityIndicator color={colors.status.danger} />
        ) : (
          <Text style={[typography.bodyStrong, { color: colors.status.danger }]}>
            {hasConfirmed ? "Tap again to sign out" : "Sign out"}
          </Text>
        )}
      </Pressable>

      {hasConfirmed && !submit.isPending ? (
        <Pressable
          onPress={() => setHasConfirmed(false)}
          accessibilityRole="button"
          accessibilityLabel="Cancel signing out"
          hitSlop={layout.hitSlop}
          style={[styles.button, { minHeight: layout.tapTargetMin, marginTop: spacing.xs }]}
        >
          <Text style={[typography.footnote, { color: colors.text.secondary }]}>Cancel</Text>
        </Pressable>
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
  centered: {
    textAlign: "center",
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
});
