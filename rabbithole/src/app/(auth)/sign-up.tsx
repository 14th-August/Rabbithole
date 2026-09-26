/**
 * Sign-up screen — `/sign-up`.
 *
 * Owns: the sign-up form, the values typed into it, whether the two passwords
 * agree, and what to show while the request is in flight.
 * Does not own: creating the account. That is `signUp` in `src/lib/auth.ts`.
 * Nor enforcing the VIU rule — the gate is a server-side auth hook, so this
 * screen only relays whatever it says.
 *
 * Deliberately mirrors `sign-in.tsx` element for element — same logo at the same
 * size, same spacing rhythm, same pill fields and button — so moving between the
 * two reads as one screen changing rather than two screens swapping. The one
 * structural difference is that this scrolls: four fields and a keyboard do not
 * fit on a small phone, where sign-in's two do.
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

import logo from "@/assets/images/logo-round.png";
import { FieldError } from "@/components/FieldError";
import { signUp } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { isCampusEmail, isValidEmail } from "@/lib/validation";
import { useTheme } from "@/theme";

/**
 * The values this form collects.
 *
 * `name` and `email` map to columns the `profiles` row needs; `password` never
 * reaches that table — auth stores it separately. `confirmPassword` never leaves
 * this screen at all.
 */
interface SignUpForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/** The sign-up screen. */
export default function SignUp() {
  const { colors, spacing, radius, layout, typography } = useTheme();
  const router = useRouter();

  const [form, setForm] = useState<SignUpForm>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  // Which field is wrong, not just that something is. Reddening all four inputs
  // because one is malformed makes the user hunt for a problem the UI already
  // knows the location of.
  const [fieldError, setFieldError] = useState<{
    field: "email" | "confirmPassword";
    message: string;
  } | null>(null);

  // The client is bound once here. `signUp` takes it as an argument so it can
  // run outside the app, but a screen only ever has the one.
  const submit = useAsync((input: { name: string; email: string; password: string }) =>
    signUp(supabase, input),
  );

  const isComplete =
    form.name.trim() !== "" &&
    form.email.trim() !== "" &&
    form.password !== "" &&
    form.confirmPassword !== "";
  const canSubmit = isComplete && !submit.isPending;

  // Two different questions, answered in two places. `submit.error` is
  // form-level — the VIU gate's refusal, an unreachable server — and goes in the
  // banner above the button. `fieldError` is "fix this input", and renders
  // against the input it belongs to.

  /** Update one field, and clear any error so a retry starts clean. */
  function updateField(patch: Partial<SignUpForm>) {
    setForm({ ...form, ...patch });
    setFieldError(null);
    submit.clearError();
  }

  async function handleSubmit() {
    // Ordered widest-to-narrowest so the message names the first thing actually
    // wrong. Checking the campus domain first would tell someone who typed their
    // name to use a @my.viu.ca address, which is true but not the problem.
    if (!isValidEmail(form.email)) {
      setFieldError({ field: "email", message: "Enter a valid email address." });
      return;
    }

    // Layer 1 from docs/backend/auth-flow.md — a keyboard convenience, not the
    // gate. The auth hook rejects this server side regardless, but finding out
    // here saves a round trip and a more confusing error.
    if (!isCampusEmail(form.email)) {
      setFieldError({
        field: "email",
        message: "Use your campus email — it should end in @my.viu.ca.",
      });
      return;
    }

    // Checked on submit rather than on every keystroke: telling someone their
    // passwords do not match while they are still typing the second one is
    // noise, since it is true for most of the time they spend in that field.
    if (form.password !== form.confirmPassword) {
      setFieldError({ field: "confirmPassword", message: "Those passwords don't match." });
      return;
    }

    const created = await submit.run({
      name: form.name,
      email: form.email,
      password: form.password,
    });
    if (!created) return;

    // Confirmation is on, so no session exists yet — `signUp` returned a user
    // and no tokens. The address travels as a param because the verify screen
    // needs it for both `verifyOtp` and resend, and there is nowhere else to
    // read it from before a session exists.
    router.push({ pathname: "/verify", params: { email: created.email } });
  }

  // 96 — two steps of the grid's largest token. Same derivation as sign-in, so
  // the logo does not shift by a pixel across the transition.
  const logoSize = spacing.xxxl * 2;

  // All four fields share the pill. Defined once so they cannot drift apart.
  const fieldStyle = {
    minHeight: layout.tapTargetMin,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSunken,
  };

  return (
    <ScrollView
      // paddingVertical inline because it is a token and StyleSheet.create has
      // no hook. It only bites once the content is tall enough to scroll, and
      // then it keeps the logo and footer off the safe-area edges.
      contentContainerStyle={[styles.screen, { paddingVertical: spacing.xl }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Image
        source={logo}
        style={{ width: logoSize, height: logoSize, borderRadius: radius.pill }}
        contentFit="cover"
        // Decorative: the heading directly below already names the action, so
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
        Create account
      </Text>

      <Text
        style={[
          typography.subhead,
          styles.centered,
          { color: colors.text.secondary, marginTop: spacing.xs },
        ]}
      >
        Use your campus email so other students know you study here.
      </Text>

      <TextInput
        value={form.name}
        onChangeText={(name) => updateField({ name })}
        editable={!submit.isPending}
        placeholder="Enter your name"
        placeholderTextColor={colors.text.placeholder}
        autoComplete="name"
        accessibilityLabel="Your name"
        style={[
          typography.body,
          fieldStyle,
          styles.fullWidth,
          { color: colors.text.primary, marginTop: spacing.xxl },
        ]}
      />

      <TextInput
        value={form.email}
        onChangeText={(email) => updateField({ email })}
        editable={!submit.isPending}
        placeholder="first.last@my.viu.ca"
        placeholderTextColor={colors.text.placeholder}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        accessibilityLabel="Campus email address"
        style={[
          typography.body,
          fieldStyle,
          styles.fullWidth,
          {
            color: colors.text.primary,
            marginTop: spacing.md,
            borderColor:
              fieldError?.field === "email" ? colors.status.danger : colors.border,
          },
        ]}
      />

      {fieldError?.field === "email" ? <FieldError message={fieldError.message} /> : null}

      <View style={[fieldStyle, styles.fullWidth, styles.passwordRow, { marginTop: spacing.md }]}>
        <TextInput
          value={form.password}
          onChangeText={(password) => updateField({ password })}
          editable={!submit.isPending}
          placeholder="Password"
          placeholderTextColor={colors.text.placeholder}
          secureTextEntry={!isPasswordVisible}
          autoCapitalize="none"
          autoComplete="new-password"
          accessibilityLabel="Password"
          style={[typography.body, styles.passwordInput, { color: colors.text.primary }]}
        />

        {/*
          One toggle drives both fields. Revealing only one of a pair leaves the
          typo hidden in the other, which is the exact thing the second field
          exists to catch.
        */}
        <Pressable
          onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          accessibilityRole="button"
          accessibilityLabel={isPasswordVisible ? "Hide passwords" : "Show passwords"}
          hitSlop={layout.hitSlop}
        >
          <Ionicons
            name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={colors.text.secondary}
          />
        </Pressable>
      </View>

      <TextInput
        value={form.confirmPassword}
        onChangeText={(confirmPassword) => updateField({ confirmPassword })}
        editable={!submit.isPending}
        placeholder="Confirm password"
        placeholderTextColor={colors.text.placeholder}
        secureTextEntry={!isPasswordVisible}
        autoCapitalize="none"
        autoComplete="new-password"
        accessibilityLabel="Confirm password"
        style={[
          typography.body,
          fieldStyle,
          styles.fullWidth,
          {
            color: colors.text.primary,
            marginTop: spacing.md,
            borderColor:
              fieldError?.field === "confirmPassword" ? colors.status.danger : colors.border,
          },
        ]}
      />

      {fieldError?.field === "confirmPassword" ? (
        <FieldError message={fieldError.message} />
      ) : null}

      {submit.error !== null ? (
        <View
          // Without these a failed signup is silent to a screen reader: the
          // button stops spinning and nothing says why.
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
        accessibilityLabel="Create account"
        // `busy` is what makes the wait audible; `disabled` alone reads as
        // "unavailable", which is a different and misleading thing to announce.
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
          <Text style={[typography.bodyStrong, { color: colors.brand.onBrand }]}>
            Create account
          </Text>
        )}
      </Pressable>

      {/*
        Dimmed and inert while the request is in flight. An account is being
        created on the server; navigating away mid-call leaves the user with no
        idea whether it succeeded, and the verify screen unreachable.
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
