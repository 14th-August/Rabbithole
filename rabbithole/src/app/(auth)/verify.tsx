/**
 * Verify screen — `/verify`.
 *
 * Owns: entering the 6-digit code from the confirmation email, and asking for a
 * new one.
 * Does not own: sending the code. `signUp` in `src/lib/auth.ts` did that; this
 * screen only completes what it started.
 *
 * Reached from sign-up with the address as a route param. A user here has an
 * account but **no session** — email confirmation is on, so `signUp` returns a
 * user and no tokens. That is why verification lives on the unauthenticated side
 * of the app alongside sign-in, rather than somewhere behind a session check.
 *
 * Matches `sign-in.tsx` and `sign-up.tsx`: same logo at the same derived size,
 * same spacing rhythm, same pill geometry.
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Link, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import logo from "@/assets/images/logo-round.png";
import { RESEND_COOLDOWN_SECONDS, confirmSignUp, resendSignUpCode } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { useTheme } from "@/theme";

/** Digits in a confirmation code. Set by `otp_length` in `supabase/config.toml`. */
const CODE_LENGTH = 6;

/** The verify screen. */
export default function Verify() {
  const { colors, spacing, radius, layout, typography } = useTheme();

  // Query params are never guaranteed at runtime — typed routes check that a
  // route exists, not that it was given the params it wants. Someone opening
  // rabbithole://verify directly lands here with nothing.
  const { email } = useLocalSearchParams<{ email?: string }>();

  const [code, setCode] = useState("");

  // The client is bound here rather than at every call. `confirmSignUp` takes it
  // as its first argument so it can run outside the app — see the note in
  // src/lib/supabase.ts — but a screen only ever has the one client.
  const submit = useAsync((input: { email: string; token: string }) =>
    confirmSignUp(supabase, input),
  );
  const resend = useAsync((input: { email: string }) => resendSignUpCode(supabase, input));

  // A code was just sent by whatever got the user here, so the cooldown starts
  // full. It is an approximation — the real window began a second or two ago —
  // and erring long is the safe direction, since asking early is a hard 429.
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    // Without this the interval keeps firing after the screen is gone, setting
    // state on an unmounted component every second until the app closes.
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const isComplete = code.length === CODE_LENGTH;
  const canSubmit = isComplete && !submit.isPending;

  // 96 — two steps of the grid's largest token. Same derivation as the other two
  // auth screens, so the logo does not shift across the transition.
  const logoSize = spacing.xxxl * 2;

  const fieldStyle = {
    minHeight: layout.tapTargetMin,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: layout.borderWidth,
    borderColor: submit.error !== null ? colors.status.danger : colors.border,
    backgroundColor: colors.surfaceSunken,
    color: colors.text.primary,
  };

  /**
   * Keep only digits, and never more than the code length.
   *
   * Codes get pasted out of mail clients with a trailing space often enough that
   * stripping here is the difference between "works" and an invalid-token error
   * on a code that was correct.
   */
  function handleChangeCode(next: string) {
    setCode(next.replace(/[^0-9]/g, "").slice(0, CODE_LENGTH));
    submit.clearError();
  }

  async function handleSubmit() {
    if (!email) return;

    // No navigation on success, deliberately. Confirming a code returns a
    // session, which fires `onAuthStateChange`, which flips the root layout's
    // guard and swaps route groups. Routing by hand here would race that swap
    // and can throw, because `(tabs)` is not in the tree at the instant it runs.
    await submit.run({ email, token: code });
  }

  async function handleResend() {
    if (!email || secondsLeft > 0) return;

    const sent = await resend.run({ email });
    if (sent !== null) setSecondsLeft(RESEND_COOLDOWN_SECONDS);
  }

  // Resolved before any hook that depends on it would run, so this early return
  // never changes how many hooks execute — a conditional hook is a Rules of
  // React violation the compiler bails on silently.
  if (!email) {
    return (
      <ScrollView
        contentContainerStyle={[styles.screen, { paddingVertical: spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={logo}
          style={{ width: logoSize, height: logoSize, borderRadius: radius.pill }}
          contentFit="cover"
          accessible={false}
        />

        <Text
          style={[
            typography.title1,
            styles.centered,
            { color: colors.text.primary, marginTop: spacing.xl },
          ]}
        >
          Something&rsquo;s missing
        </Text>

        <Text
          style={[
            typography.subhead,
            styles.centered,
            { color: colors.text.secondary, marginTop: spacing.xs },
          ]}
        >
          This link didn&rsquo;t carry an email address, so there&rsquo;s no account to confirm.
          Start again and we&rsquo;ll send you a fresh code.
        </Text>

        <Link
          href="/sign-up"
          style={[typography.footnote, { color: colors.brand.default, marginTop: spacing.xl }]}
        >
          Create an account
        </Link>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { paddingVertical: spacing.xl }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Image
        source={logo}
        style={{ width: logoSize, height: logoSize, borderRadius: radius.pill }}
        contentFit="cover"
        // Decorative: the heading below already says what this screen is for.
        accessible={false}
      />

      <Text
        style={[
          typography.title1,
          styles.centered,
          { color: colors.text.primary, marginTop: spacing.xl },
        ]}
      >
        Check your email
      </Text>

      <Text
        style={[
          typography.subhead,
          styles.centered,
          { color: colors.text.secondary, marginTop: spacing.xs },
        ]}
      >
        We sent a {CODE_LENGTH}-digit code to {email}.
      </Text>

      <TextInput
        value={code}
        onChangeText={handleChangeCode}
        placeholder="000000"
        placeholderTextColor={colors.text.placeholder}
        keyboardType="number-pad"
        maxLength={CODE_LENGTH}
        // Offers the code above the keyboard on iOS once the email arrives —
        // most of this flow's perceived quality, for one prop.
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        accessibilityLabel="Confirmation code"
        editable={!submit.isPending}
        style={[
          typography.title2,
          fieldStyle,
          styles.fullWidth,
          styles.code,
          { marginTop: spacing.xxl, letterSpacing: spacing.sm },
        ]}
      />

      {submit.error !== null ? (
        <View
          // Without these a rejected code is silent to a screen reader.
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
        accessibilityLabel="Confirm code"
        // Deliberately reads `submit`, never `resend`. The two run independently,
        // and conflating them would make the Confirm button claim to be working
        // while the user is only waiting on a new email.
        accessibilityState={{ disabled: !canSubmit, busy: submit.isPending }}
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
          <Text style={[typography.bodyStrong, { color: colors.brand.onBrand }]}>Confirm</Text>
        )}
      </Pressable>

      <Pressable
        onPress={handleResend}
        disabled={secondsLeft > 0 || resend.isPending || submit.isPending}
        accessibilityRole="button"
        accessibilityLabel="Send a new code"
        accessibilityState={{
          disabled: secondsLeft > 0 || resend.isPending || submit.isPending,
          busy: resend.isPending,
        }}
        hitSlop={layout.hitSlop}
        style={[styles.button, { minHeight: layout.tapTargetMin, marginTop: spacing.md }]}
      >
        {resend.isPending ? (
          // Its own indicator rather than the button's. Requesting a new email is
          // a separate wait from confirming a code, and one spinner for both
          // would misreport which call is actually running.
          <ActivityIndicator color={colors.brand.default} />
        ) : (
          <Text
            style={[
              typography.footnote,
              { color: secondsLeft > 0 ? colors.text.tertiary : colors.brand.default },
            ]}
          >
            {secondsLeft > 0 ? `Send a new code in ${secondsLeft}s` : "Send a new code"}
          </Text>
        )}
      </Pressable>

      {resend.error !== null ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[
            typography.footnote,
            styles.centered,
            { color: colors.status.danger, marginTop: spacing.xs },
          ]}
        >
          {resend.error}
        </Text>
      ) : null}

      {/*
        Not decoration. Supabase returns an obfuscated user for an address that is
        already registered, so signing up cannot reveal who has an account — which
        means sign-up genuinely cannot tell "code sent" from "already registered".
        A returning user who tapped Create account is waiting for a code that will
        never arrive, and this link is their way out.
      */}
      <View
        style={[styles.footer, { marginTop: spacing.xl, opacity: submit.isPending ? 0.4 : 1 }]}
        pointerEvents={submit.isPending ? "none" : "auto"}
      >
        <Text style={[typography.footnote, { color: colors.text.secondary }]}>
          Already have an account?{" "}
        </Text>
        <Link href="/sign-in" style={[typography.footnote, { color: colors.brand.default }]}>
          Sign in
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
  code: {
    textAlign: "center",
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
