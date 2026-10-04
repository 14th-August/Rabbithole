/**
 * The pill text field.
 *
 * Owns: the pill geometry every text input in the app wears, the error colouring
 *   that marks one as wrong, and placing the message underneath it.
 * Does not own: deciding what is wrong. Callers validate and pass a sentence —
 *   see `src/lib/validation.ts`. Nor the label above a field; screens lay their
 *   own copy out.
 *
 * Extracted from `sign-in`, `sign-up`, and `verify`, which each defined the same
 * `fieldStyle` object literal. Three copies is how two of them quietly drift by a
 * pixel; the geometry now has one home.
 *
 * Geometry borrows Spotify's fully-rounded fields. Deliberately not borrowed:
 * their uppercase, letter-spaced labels, which read as brand styling rather than
 * platform convention.
 */

import type { ReactNode } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { FieldError } from "@/components/FieldError";
import { useTheme, type TypographyVariant } from "@/theme";

/** Everything a {@link Field} takes, on top of the usual `TextInput` props. */
export interface FieldProps extends Omit<TextInputProps, "style"> {
  /**
   * A sentence naming what is wrong with this field, or `null` when it is fine.
   *
   * Setting it does two things: the pill's border turns red, and the message
   * renders directly beneath. Pass `null` for a field that cannot be individually
   * blamed — a form-level failure belongs below every field, not against one.
   */
  error?: string | null;

  /**
   * Rendered inside the pill, after the input — a show/hide toggle, a clear
   * button, a unit. Sits on the trailing edge and does not scroll with the text.
   */
  trailing?: ReactNode;

  /**
   * Type scale for the entered text. Defaults to `body`.
   *
   * `verify` uses `title2` so a six-digit code reads as the subject of the
   * screen rather than as ordinary form input.
   */
  variant?: TypographyVariant;

  /** Style for the text itself — alignment, letter spacing. */
  inputStyle?: StyleProp<TextStyle>;

  /** Style for the pill container. Margins go here, not on `inputStyle`. */
  style?: StyleProp<ViewStyle>;
}

/**
 * A single-line (or multiline) text input wearing the app's pill.
 *
 * @example
 * ```tsx
 * <Field
 *   value={form.email}
 *   onChangeText={(email) => updateField({ email })}
 *   placeholder="Email"
 *   keyboardType="email-address"
 *   accessibilityLabel="Email address"
 *   error={fieldError?.message ?? null}
 *   style={{ marginTop: spacing.md }}
 * />
 * ```
 */
export function Field({
  error = null,
  trailing,
  variant = "body",
  inputStyle,
  style,
  multiline,
  ...inputProps
}: FieldProps) {
  const { colors, spacing, radius, layout, typography } = useTheme();

  return (
    <View style={styles.fullWidth}>
      <View
        style={[
          styles.pill,
          {
            minHeight: layout.tapTargetMin,
            paddingHorizontal: spacing.lg,
            borderRadius: radius.pill,
            borderWidth: layout.borderWidth,
            // No visible outline at rest. The width stays so an error can colour
            // it in without the field growing by a pixel and nudging everything
            // below it; matching the fill is what hides it rather than removing
            // it.
            borderColor: error !== null ? colors.status.danger : colors.surfaceSunken,
            backgroundColor: colors.surfaceSunken,
            // A multiline box grows downward, so its contents start at the top
            // and need room to breathe that a 44pt single-line row gets for free.
            alignItems: multiline ? "flex-start" : "center",
            paddingVertical: multiline ? spacing.md : 0,
          },
          style,
        ]}
      >
        <TextInput
          multiline={multiline}
          placeholderTextColor={colors.text.placeholder}
          style={[
            typography[variant],
            styles.input,
            { color: colors.text.primary },
            inputStyle,
          ]}
          {...inputProps}
        />

        {trailing}
      </View>

      {error !== null ? <FieldError message={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    width: "100%",
  },
  pill: {
    flexDirection: "row",
  },
  input: {
    // Takes the row's slack so a trailing accessory sits against the far edge
    // rather than immediately after the text.
    flex: 1,
  },
});
