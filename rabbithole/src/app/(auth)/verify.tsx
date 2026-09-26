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
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
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

import { RESEND_COOLDOWN_SECONDS, confirmSignUp, resendSignUpCode } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { useTheme } from "@/theme";

/** Digits in a confirmation code. Set by `otp_length` in `supabase/config.toml`. */
const CODE_LENGTH = 6;

/** The verify screen. */
export default function Verify() {
  const { colors, spacing, radius, layout, typography } = useTheme();
  const router = useRouter();

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

  const inputStyle = {
    minHeight: layout.tapTargetMin,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
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

    const session = await submit.run({ email, token: code });
    if (!session) return;

    // TEMPORARY — delete this when the auth wall lands (step 5).
    //
    // Once `_layout.tsx` guards `(tabs)` on the session, confirming a code makes
    // SessionProvider flip the guard and the router swaps groups on its own.
    // Navigating here as well would race that swap and can throw, because
    // `(tabs)` is not in the tree at the instant this runs.
    router.replace("/");
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
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <Text style={[typography.title1, { color: colors.text.primary }]}>
          Something&rsquo;s missing
        </Text>
        <Text
          style={[typography.subhead, { color: colors.text.secondary, marginTop: spacing.xs }]}
        >
          This link didn&rsquo;t carry an email address, so there&rsquo;s no account to confirm.
          Start again and we&rsquo;ll send you a fresh code.
        </Text>
        <Link
          href="/sign-up"
          style={[typography.footnote, { color: colors.brand.default, marginTop: spacing.lg }]}
        >
          Create an account
        </Link>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <Text style={[typography.title1, { color: colors.text.primary }]}>Check your email</Text>

      <Text style={[typography.subhead, { color: colors.text.secondary, marginTop: spacing.xs }]}>
        We sent a {CODE_LENGTH}-digit code to {email}.
      </Text>

      <Text style={[typography.caption, { color: colors.text.secondary, marginTop: spacing.xl }]}>
        CODE
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
          inputStyle,
          styles.code,
          { marginTop: spacing.xs, letterSpacing: spacing.sm },
        ]}
      />

      {submit.error ? (
        <View
          // Without these a rejected code is silent to a screen reader.
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[
            styles.error,
            styles.errorRow,
            {
              backgroundColor: colors.status.dangerSubtle,
              borderRadius: radius.md,
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
          {
            minHeight: layout.tapTargetMin,
            borderRadius: radius.md,
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
        style={[styles.resend, { minHeight: layout.tapTargetMin, marginTop: spacing.md }]}
      >
        {resend.isPending ? (
          // Its own indicator rather than the button's. Requesting a new email
          // is a separate wait from confirming a code, and showing one spinner
          // for both would misreport which call is actually running.
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

      {resend.error ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[
            typography.footnote,
            { color: colors.status.danger, textAlign: "center", marginTop: spacing.xs },
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
        style={[
          styles.footer,
          { marginTop: spacing.lg, opacity: submit.isPending ? 0.4 : 1 },
        ]}
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
    justifyContent: "center",
  },
  code: {
    textAlign: "center",
  },
  error: {
    width: "100%",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    flex: 1,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
  resend: {
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
  },
});
