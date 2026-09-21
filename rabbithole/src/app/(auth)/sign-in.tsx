/**
 * Sign-in screen — `/sign-in`.
 *
 * Owns: the sign-in form and the values typed into it.
 * Does not own: actually signing anyone in. There is no backend yet, so
 * `handleSubmit` is a placeholder. When Supabase arrives, that one function is
 * the only thing in this file that changes.
 */

import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "@/theme";

/**
 * The values this form collects.
 *
 * Kept as one object rather than loose `useState` calls because this is the
 * shape that will eventually be sent to the database.
 */
interface SignInForm {
  email: string;
  password: string;
}

/** The sign-in screen. */
export default function SignIn() {
  const { colors, spacing, radius, layout, typography } = useTheme();

  const [form, setForm] = useState<SignInForm>({ email: "", password: "" });

  const isComplete = form.email.trim() !== "" && form.password !== "";

  function handleSubmit() {
    // Placeholder. Real sign-in lands here once there is a backend.
  }

  // Both inputs look the same, so the style lives in one place.
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
      <Text style={[typography.title1, { color: colors.text.primary }]}>Sign in</Text>

      <Text style={[typography.subhead, { color: colors.text.secondary, marginTop: spacing.xs }]}>
        Welcome back to the campus marketplace.
      </Text>

      <Text style={[typography.caption, { color: colors.text.secondary, marginTop: spacing.xl }]}>
        EMAIL
      </Text>
      <TextInput
        value={form.email}
        onChangeText={(email) => setForm({ ...form, email })}
        placeholder="you@my.viu.ca"
        placeholderTextColor={colors.text.placeholder}
        keyboardType="email-address"
        autoCapitalize="none"
        accessibilityLabel="Email address"
        style={[typography.body, inputStyle, { marginTop: spacing.xs }]}
      />

      <Text style={[typography.caption, { color: colors.text.secondary, marginTop: spacing.md }]}>
        PASSWORD
      </Text>
      <TextInput
        value={form.password}
        onChangeText={(password) => setForm({ ...form, password })}
        placeholder="Your password"
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
        accessibilityLabel="Sign in"
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
        <Text style={[typography.bodyStrong, { color: colors.brand.onBrand }]}>Sign in</Text>
      </Pressable>

      <View style={[styles.footer, { marginTop: spacing.lg }]}>
        <Text style={[typography.footnote, { color: colors.text.secondary }]}>New here? </Text>
        <Link href="/sign-up" style={[typography.footnote, { color: colors.brand.default }]}>
          Create an account
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
