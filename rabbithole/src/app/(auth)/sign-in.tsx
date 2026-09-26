/**
 * Sign-in screen — `/sign-in`.
 *
 * Owns: the sign-in form, the values typed into it, and what to show while the
 * request is in flight.
 * Does not own: authenticating. That is `signIn` in `src/lib/auth.ts`. Nor
 * navigation once it succeeds — see `handleSubmit`.
 *
 * This is the first screen a signed-out user sees. The root layout guards
 * `(tabs)` behind a session, and `(auth)/_layout.tsx` anchors this group here.
 *
 * Layout borrows Spotify's pill geometry — fully rounded fields and a fully
 * rounded primary action — on an otherwise plain iOS page. Deliberately not
 * borrowed: their uppercase, letter-spaced button labels, which read as brand
 * styling rather than platform convention and fight the HIG on iOS.
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

// Not `icon.png`: that is the 1024px store icon. Rendering it at 96pt made
// Metro ship 185 KB over the LAN on every dev reload and decode a 1024x1024
// bitmap to fill a 96pt circle. Same artwork, sized for the job: 288px is 96pt
// at @3x, the densest screen this renders on.
import logo from "@/assets/images/logo-round.png";
import { signIn } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { useTheme } from "@/theme";

/**
 * The values this form collects.
 *
 * Kept as one object rather than loose `useState` calls because this is the
 * shape `signIn` takes.
 */
interface SignInForm {
  email: string;
  password: string;
}

/** The sign-in screen. */
export default function SignIn() {
  const { colors, spacing, radius, layout, typography } = useTheme();
  const router = useRouter();

  const [form, setForm] = useState<SignInForm>({ email: "", password: "" });
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // The client is bound once here. `signIn` takes it as an argument so it can
  // run outside the app, but a screen only ever has the one.
  const submit = useAsync((input: SignInForm) => signIn(supabase, input));

  const isComplete = form.email.trim() !== "" && form.password !== "";
  const canSubmit = isComplete && !submit.isPending;
  const hasError = submit.error !== null;

  /** Update one field, and clear any error so a retry starts clean. */
  function updateField(patch: Partial<SignInForm>) {
    setForm({ ...form, ...patch });
    submit.clearError();
  }

  async function handleSubmit() {
    const outcome = await submit.run(form);
    if (!outcome) return;

    if (outcome.kind === "needs-verification") {
      // The account exists but the address was never confirmed. Whatever code
      // was issued at signup has almost certainly expired, so /verify offers a
      // resend rather than this screen showing red text under the password.
      router.push({ pathname: "/verify", params: { email: outcome.email } });
      return;
    }

    // "signed-in" needs nothing here. Storing the session fires
    // `onAuthStateChange`, which flips the root layout's guard and swaps route
    // groups; navigating manually would race that swap.
  }

  // 96 — two steps of the grid's largest token. Derived rather than written as a
  // literal so the logo stays on the 4pt grid, and kept local because one
  // screen's hero size does not belong in the shared theme.
  const logoSize = spacing.xxxl * 2;

  // Both fields share the pill. Defined once so they cannot drift apart.
  //
  // The border turns red for the whole form rather than per field, because the
  // only failure the server will name is `invalid_credentials` — and it refuses
  // to say which of the two was wrong, deliberately, so that sign-in cannot be
  // used to discover which addresses have accounts. Marking one field would be
  // inventing a detail the API withheld.
  const fieldStyle = {
    minHeight: layout.tapTargetMin,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: layout.borderWidth,
    borderColor: hasError ? colors.status.danger : colors.border,
    backgroundColor: colors.surfaceSunken,
  };

  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Image
        source={logo}
        style={{ width: logoSize, height: logoSize, borderRadius: radius.pill }}
        contentFit="cover"
        // Decorative: the heading directly below already names the app, so
        // announcing the logo too would only repeat it to a screen reader.
        accessible={false}
      />

      <Text
        style={[
          typography.title1,
          styles.centered,
          { color: colors.text.primary, marginTop: spacing.xl },
        ]}
      >
        Welcome to Rabbithole!
      </Text>

      <Text
        style={[
          typography.subhead,
          styles.centered,
          { color: colors.text.secondary, marginTop: spacing.xs },
        ]}
      >
        Buy and sell with students on your campus.
      </Text>

      <TextInput
        value={form.email}
        onChangeText={(email) => updateField({ email })}
        editable={!submit.isPending}
        placeholder="Email"
        placeholderTextColor={colors.text.placeholder}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        accessibilityLabel="Email address"
        style={[
          typography.body,
          fieldStyle,
          styles.fullWidth,
          { color: colors.text.primary, marginTop: spacing.xxl },
        ]}
      />

      <View style={[fieldStyle, styles.fullWidth, styles.passwordRow, { marginTop: spacing.md }]}>
        <TextInput
          value={form.password}
          onChangeText={(password) => updateField({ password })}
          editable={!submit.isPending}
          placeholder="Password"
          placeholderTextColor={colors.text.placeholder}
          secureTextEntry={!isPasswordVisible}
          autoCapitalize="none"
          autoComplete="current-password"
          accessibilityLabel="Password"
          style={[typography.body, styles.passwordInput, { color: colors.text.primary }]}
        />

        <Pressable
          onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          accessibilityRole="button"
          accessibilityLabel={isPasswordVisible ? "Hide password" : "Show password"}
          hitSlop={layout.hitSlop}
        >
          <Ionicons
            name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={colors.text.secondary}
          />
        </Pressable>
      </View>

      {hasError ? (
        <View
          // `alert` covers VoiceOver, `accessibilityLiveRegion` covers TalkBack.
          // Without them a failed sign-in is silent to a screen reader: the
          // button simply stops spinning and nothing says why.
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[
            styles.fullWidth,
            styles.errorRow,
            {
              backgroundColor: colors.status.dangerSubtle,
              borderRadius: radius.lg,
              padding: spacing.md,
              marginTop: spacing.md,
              gap: spacing.sm,
            },
          ]}
        >
          <Ionicons name="alert-circle" size={18} color={colors.status.danger} />
          <Text style={[typography.footnote, styles.errorText, { color: colors.status.danger }]}>
            {submit.error}
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit}
        accessibilityRole="button"
        accessibilityLabel="Log in"
        accessibilityState={{ disabled: !canSubmit }}
        style={[
          styles.button,
          styles.fullWidth,
          {
            minHeight: layout.tapTargetMin,
            borderRadius: radius.pill,
            backgroundColor: colors.brand.default,
            marginTop: spacing.xl,
            opacity: canSubmit ? 1 : 0.5,
          },
        ]}
      >
        {submit.isPending ? (
          <ActivityIndicator color={colors.brand.onBrand} />
        ) : (
          <Text style={[typography.bodyStrong, { color: colors.brand.onBrand }]}>Log in</Text>
        )}
      </Pressable>

      <View style={[styles.footer, { marginTop: spacing.xl }]}>
        <Text style={[typography.footnote, { color: colors.text.secondary }]}>
          Don&apos;t have an account?{" "}
        </Text>
        <Link href="/sign-up" style={[typography.footnote, { color: colors.brand.default }]}>
          Sign up
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    textAlign: "center",
  },
  fullWidth: {
    width: "100%",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    // Takes the remaining width so a long sentence wraps beside the icon rather
    // than pushing it off the row.
    flex: 1,
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
