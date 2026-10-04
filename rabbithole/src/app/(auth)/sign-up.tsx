/**
 * Sign-up screen — `/sign-up`.
 *
 * Owns: the sign-up form, the values typed into it, whether the two passwords
 * agree, and what to show while the request is in flight.
 * Does not own: creating the account. That is `signUp` in `src/lib/auth.ts`.
 * Nor enforcing the VIU rule — the gate is a server-side auth hook, so this
 * screen only relays whatever it says. Nor the geometry of its own fields and
 * button, which are `Field` and `Button` in `src/components`.
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
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import logo from "@/assets/images/logo-round.png";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { FieldError } from "@/components/FieldError";
import { isUsernameAvailable, signUp } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { isCampusEmail, isValidEmail, validateUsername } from "@/lib/validation";
import { useTheme } from "@/theme";

/**
 * The values this form collects.
 *
 * `username` becomes `profiles.username`; `email` never reaches that table at
 * all, and neither does a real name — a VIU address carries one, which is why
 * the profile is pseudonymous. `password` is stored by auth, separately.
 * `confirmPassword` never leaves this screen.
 */
interface SignUpForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/** The sign-up screen. */
export default function SignUp() {
  const { colors, spacing, radius, layout, typography } = useTheme();
  const router = useRouter();

  const [form, setForm] = useState<SignUpForm>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  // Which field is wrong, not just that something is. Reddening all four inputs
  // because one is malformed makes the user hunt for a problem the UI already
  // knows the location of.
  const [fieldError, setFieldError] = useState<{
    field: "username" | "email" | "confirmPassword";
    message: string;
  } | null>(null);

  // The client is bound once here. `signUp` takes it as an argument so it can
  // run outside the app, but a screen only ever has the one.
  const submit = useAsync((input: { username: string; email: string; password: string }) =>
    signUp(supabase, input),
  );

  const isComplete =
    form.username.trim() !== "" &&
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

  /**
   * Check the username once the user leaves the field, not on every keystroke.
   *
   * A request per character would ask the server about `k`, `ke`, `kel` — all
   * available, none meaningful — and would tell someone their username is
   * taken while they are still halfway through typing it.
   *
   * A stale answer here is not dangerous. The database re-validates on insert
   * and `signUp` turns a lost race back into a sentence, so this is a
   * courtesy, never the guarantee.
   */
  async function handleUsernameBlur() {
    const username = form.username.trim();
    if (username === "") return;

    const shape = validateUsername(username);
    if (shape !== null) {
      setFieldError({ field: "username", message: shape });
      return;
    }

    const check = await isUsernameAvailable(supabase, username);
    // A failed check says nothing either way, so it says nothing. Claiming
    // "available" on a network error would walk the user into a signup that
    // the trigger then refuses.
    if (check.data === false) {
      setFieldError({ field: "username", message: `${username} is taken.` });
    }
  }

  async function handleSubmit() {
    // Ordered widest-to-narrowest so the message names the first thing actually
    // wrong. Checking the campus domain first would tell someone who typed their
    // username to use a @my.viu.ca address, which is true but not the problem.
    const usernameProblem = validateUsername(form.username);
    if (usernameProblem !== null) {
      setFieldError({ field: "username", message: usernameProblem });
      return;
    }

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

    // Availability is deliberately NOT re-checked here. Between a check and
    // the insert there is always a window, so the only check that can be
    // trusted is the one the database makes — `signUp` asks again only after
    // a failure, to turn an opaque 500 into "that was just taken".
    const created = await submit.run({
      username: form.username,
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

      {/*
        A username, not a name. `autoComplete="username"` and
        `autoCapitalize="none"` both matter: the keyboard's default capital
        would produce `Kelp_quay`, which the server treats as the same name as
        `kelp_quay` but shows back with the capital, and people read that as
        the app having changed what they typed.
      */}
      <Field
        value={form.username}
        onChangeText={(username) => updateField({ username })}
        onBlur={handleUsernameBlur}
        editable={!submit.isPending}
        placeholder="Pick a username"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        accessibilityLabel="Username"
        error={fieldError?.field === "username" ? fieldError.message : null}
        style={{ marginTop: spacing.xxl }}
      />

      <Field
        value={form.email}
        onChangeText={(email) => updateField({ email })}
        editable={!submit.isPending}
        placeholder="first.last@my.viu.ca"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        accessibilityLabel="Campus email address"
        error={fieldError?.field === "email" ? fieldError.message : null}
        style={{ marginTop: spacing.md }}
      />

      <Field
        value={form.password}
        onChangeText={(password) => updateField({ password })}
        editable={!submit.isPending}
        placeholder="Password"
        secureTextEntry={!isPasswordVisible}
        autoCapitalize="none"
        autoComplete="new-password"
        accessibilityLabel="Password"
        style={{ marginTop: spacing.md }}
        trailing={
          // One toggle drives both fields. Revealing only one of a pair leaves
          // the typo hidden in the other, which is the exact thing the second
          // field exists to catch.
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
        }
      />

      <Field
        value={form.confirmPassword}
        onChangeText={(confirmPassword) => updateField({ confirmPassword })}
        editable={!submit.isPending}
        placeholder="Confirm password"
        secureTextEntry={!isPasswordVisible}
        autoCapitalize="none"
        autoComplete="new-password"
        accessibilityLabel="Confirm password"
        error={fieldError?.field === "confirmPassword" ? fieldError.message : null}
        style={{ marginTop: spacing.md }}
      />

      {/*
        Form-level, so it belongs to no single input — the VIU gate's refusal, an
        unreachable server. Same inline treatment as a field error so the screen
        speaks in one voice, positioned below every field and above the button.
      */}
      {submit.error !== null ? <FieldError message={submit.error} /> : null}

      <Button
        label="Create account"
        onPress={handleSubmit}
        disabled={!canSubmit}
        isPending={submit.isPending}
        style={{ marginTop: spacing.xl }}
      />

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
  footer: {
    flexDirection: "row",
    justifyContent: "center",
  },
});
