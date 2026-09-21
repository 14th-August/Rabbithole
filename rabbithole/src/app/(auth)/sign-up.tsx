/**
 * Sign-up screen — `/sign-up`.
 *
 * Owns: the sign-up form and the values typed into it.
 * Does not own: creating the account, or checking the email really belongs to
 * VIU. There is no backend yet, so `handleSubmit` is a placeholder and the
 * campus-email line is a prompt, not a rule this screen enforces.
 *
 * Deliberately mirrors `sign-in.tsx` line for line so the pair reads as one
 * pattern rather than two.
 */

import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

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

  const [form, setForm] = useState<SignUpForm>({ name: "", email: "", password: "" });

  const isComplete =
    form.name.trim() !== "" && form.email.trim() !== "" && form.password !== "";

  function handleSubmit() {
    // Placeholder. Real account creation lands here once there is a backend.
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
        onChangeText={(name) => setForm({ ...form, name })}
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
        onChangeText={(email) => setForm({ ...form, email })}
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
        onChangeText={(password) => setForm({ ...form, password })}
        placeholder="At least 8 characters"
        placeholderTextColor={colors.text.placeholder}
        secureTextEntry
        autoCapitalize="none"
        accessibilityLabel="Password"
        style={[typography.body, inputStyle, { marginTop: spacing.xs }]}
      />

      <Pressable
        onPress={handleSubmit}
        disabled={!isComplete}
        accessibilityRole="button"
        accessibilityLabel="Create account"
        style={[
          styles.button,
          {
            minHeight: layout.tapTargetMin,
            borderRadius: radius.md,
            backgroundColor: colors.brand.default,
            marginTop: spacing.xl,
            opacity: isComplete ? 1 : 0.5,
          },
        ]}
      >
        <Text style={[typography.bodyStrong, { color: colors.brand.onBrand }]}>
          Create account
        </Text>
      </Pressable>

      <View style={[styles.footer, { marginTop: spacing.lg }]}>
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
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
  },
});
