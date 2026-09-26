/**
 * Sign-up screen — `/sign-up`.
 *
 * Owns: the sign-up form, the values typed into it, and what to show while the
 * request is in flight.
 * Does not own: creating the account. That is `signUp` in `src/lib/auth.ts`.
 * Nor enforcing the VIU rule — the gate is a server-side auth hook, so this
 * screen only relays whatever it says.
 *
 * Deliberately mirrors `sign-in.tsx` line for line so the pair reads as one
 * pattern rather than two.
 */

import Ionicons from "@expo/vector-icons/Ionicons";
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

import { signUp } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { useTheme } from "@/theme";

/**
 * The values this form collects.
 *
 * `name` and `email` map to columns a future `profiles` row will need;
 * `password` never reaches that table — auth stores it separately.
 */
interface SignUpForm {
  name: string;
  email: string;
  password: string;
}

/** The sign-up screen. */
export default function SignUp() {
  const { colors, spacing, radius, layout, typography } = useTheme();
  const router = useRouter();

  const [form, setForm] = useState<SignUpForm>({ name: "", email: "", password: "" });

  // The client is bound once here. `signUp` takes it as an argument so it can
  // run outside the app, but a screen only ever has the one.
  const submit = useAsync((input: SignUpForm) => signUp(supabase, input));

  const isComplete =
    form.name.trim() !== "" && form.email.trim() !== "" && form.password !== "";
  const canSubmit = isComplete && !submit.isPending;

  /** Update one field, and clear any error so a retry starts clean. */
  function updateField(patch: Partial<SignUpForm>) {
    setForm({ ...form, ...patch });
    submit.clearError();
  }

  async function handleSubmit() {
    const created = await submit.run(form);
    if (!created) return;

    // Confirmation is on, so no session exists yet — `signUp` returned a user
    // and no tokens. The address travels as a param because the verify screen
    // needs it for both `verifyOtp` and resend, and there is nowhere else to
    // read it from before a session exists.
    router.push({ pathname: "/verify", params: { email: created.email } });
  }

  // All three inputs look the same, so the style lives in one place.
  const inputStyle = {
    minHeight: layout.tapTargetMin,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSunken,
    color: colors.text.primary,
  };

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <Text style={[typography.title1, { color: colors.text.primary }]}>Create account</Text>

      <Text style={[typography.subhead, { color: colors.text.secondary, marginTop: spacing.xs }]}>
        Use your campus email so other students know you study here.
      </Text>

      <Text style={[typography.caption, { color: colors.text.secondary, marginTop: spacing.xl }]}>
        NAME
      </Text>
      <TextInput
        value={form.name}
        onChangeText={(name) => updateField({ name })}
        editable={!submit.isPending}
        placeholder="Alex Chen"
        placeholderTextColor={colors.text.placeholder}
        accessibilityLabel="Your name"
        style={[typography.body, inputStyle, { marginTop: spacing.xs }]}
      />

      <Text style={[typography.caption, { color: colors.text.secondary, marginTop: spacing.md }]}>
        EMAIL
      </Text>
      <TextInput
        value={form.email}
        onChangeText={(email) => updateField({ email })}
        editable={!submit.isPending}
        placeholder="you@my.viu.ca"
        placeholderTextColor={colors.text.placeholder}
        keyboardType="email-address"
        autoCapitalize="none"
        accessibilityLabel="Campus email address"
        style={[typography.body, inputStyle, { marginTop: spacing.xs }]}
      />

      <Text style={[typography.caption, { color: colors.text.secondary, marginTop: spacing.md }]}>
        PASSWORD
      </Text>
      <TextInput
        value={form.password}
        onChangeText={(password) => updateField({ password })}
        editable={!submit.isPending}
        placeholder="At least 6 characters"
        placeholderTextColor={colors.text.placeholder}
        secureTextEntry
        autoCapitalize="none"
        accessibilityLabel="Password"
        style={[typography.body, inputStyle, { marginTop: spacing.xs }]}
      />

      {submit.error ? (
        <View
          // Without these a failed signup is silent to a screen reader: the
          // button stops spinning and nothing says why.
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
        accessibilityLabel="Create account"
        // `busy` is what makes the wait audible; `disabled` alone reads as
        // "unavailable", which is a different and misleading thing to announce.
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
  error: {
    width: "100%",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    // Takes the remaining width so a long sentence wraps beside the icon
    // rather than pushing it off the row.
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
