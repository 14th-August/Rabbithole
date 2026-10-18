/**
 * Verify screen — `/verify`.
 *
 * Entering the 6-digit code from the confirmation email, and asking for a new
 * one. `signUp` sent the code; this only completes what it started. Reached from
 * sign-up with the address as a route param. A user here has an account but NO
 * session — email confirmation is on, so `signUp` returns a user and no tokens,
 * which is why verification lives on the unauthenticated side of the app.
 *
 * Returns: the verify screen.
 */

import { Image } from "expo-image";
import { Link, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import logo from "@/assets/images/logo-round.png";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { RESEND_COOLDOWN_SECONDS, confirmSignUp, resendSignUpCode } from "@/lib/verification";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/hooks";

const TEXT_PRIMARY = "#12161D";
const TEXT_SECONDARY = "#4C5566";
const BRAND = "#0165F2";
const DANGER = "#DC2626";

/** Matches the other two auth screens, so the logo does not shift. */
const LOGO_SIZE = 96;

/** Digits in a confirmation code. Set by `otp_length` in `supabase/config.toml`. */
const CODE_LENGTH = 6;

/** The verify screen. */
export default function Verify() {
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

  /**
   * Keeps only digits, and never more than the code length. Codes get pasted
   * from mail clients with trailing spaces often enough that stripping here is
   * the difference between working and an invalid-token error on a good code.
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
    // and can throw, because `(app)` is not in the tree at the instant it runs.
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
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Image source={logo} style={styles.logo} contentFit="cover" accessible={false} />

        <Text style={styles.title}>Something&rsquo;s missing</Text>

        <Text style={styles.subtitle}>
          This link didn&rsquo;t carry an email address, so there&rsquo;s no account to confirm.
          Start again and we&rsquo;ll send you a fresh code.
        </Text>

        <Link href="/sign-up" style={styles.standaloneLink}>
          Create an account
        </Link>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Image
        source={logo}
        style={styles.logo}
        contentFit="cover"
        // Decorative: the heading below already says what this screen is for.
        accessible={false}
      />

      <Text style={styles.title}>Check your email</Text>

      <Text style={styles.subtitle}>
        We sent a {CODE_LENGTH}-digit code to {email}.
      </Text>

      {/* Genuinely field-level here: the only thing that can be wrong is the code. */}
      <Field
        value={code}
        onChangeText={handleChangeCode}
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={CODE_LENGTH}
        // Offers the code above the keyboard on iOS once the email arrives —
        // most of this flow's perceived quality, for one prop.
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        accessibilityLabel="Confirmation code"
        editable={!submit.isPending}
        error={submit.error}
        // Larger than ordinary form input: the code is the subject of the screen,
        // not a detail on it.
        variant="title2"
        inputStyle={styles.codeInput}
        style={styles.firstField}
      />

      <Button
        label="Confirm"
        onPress={handleSubmit}
        disabled={!canSubmit}
        // Deliberately reads `submit`, never `resend`. The two run independently,
        // and conflating them would make the Confirm button claim to be working
        // while the user is only waiting on a new email.
        isPending={submit.isPending}
        style={styles.submit}
      />

      <Button
        variant="ghost"
        label={secondsLeft > 0 ? `Send a new code in ${secondsLeft}s` : "Send a new code"}
        // The countdown label changes every second and reads badly out loud, so
        // the announced name stays put while the visible text ticks.
        accessibilityLabel="Send a new code"
        onPress={handleResend}
        disabled={secondsLeft > 0 || submit.isPending}
        // Its own indicator rather than the Confirm button's. Requesting a new
        // email is a separate wait from confirming a code, and one spinner for
        // both would misreport which call is actually running.
        isPending={resend.isPending}
        style={styles.resend}
      />

      {resend.error !== null ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={styles.resendError}
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
        style={[styles.footer, submit.isPending ? styles.footerBusy : null]}
        pointerEvents={submit.isPending ? "none" : "auto"}
      >
        <Text style={styles.footerText}>Already have an account? </Text>
        <Link href="/sign-in" style={styles.footerLink}>
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
    paddingVertical: 24,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 999,
  },
  title: {
    textAlign: "center",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: TEXT_PRIMARY,
    marginTop: 24,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "400",
    color: TEXT_SECONDARY,
    marginTop: 4,
  },
  standaloneLink: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    color: BRAND,
    marginTop: 24,
  },
  firstField: {
    marginTop: 32,
  },
  codeInput: {
    textAlign: "center",
    // Wide tracking so six digits read as six separate characters rather than a
    // number, which is how people check a code against an email.
    letterSpacing: 8,
  },
  submit: {
    marginTop: 24,
  },
  resend: {
    marginTop: 12,
  },
  resendError: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    color: DANGER,
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerBusy: {
    opacity: 0.4,
  },
  footerText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    color: TEXT_SECONDARY,
  },
  footerLink: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    color: BRAND,
  },
});
