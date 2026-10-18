/**
 * The pill text field.
 *
 * The pill geometry every text input wears, the error colouring that marks one
 * wrong, and the message underneath it. Callers decide what is wrong and pass a
 * sentence; screens lay out their own labels. Extracted from three auth screens
 * that each defined the same `fieldStyle` literal — three copies is how two
 * quietly drift by a pixel.
 *
 * Returns: a pill-wrapped `TextInput`, with a {@link FieldError} below it when
 * `error` is set.
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

const SURFACE_SUNKEN = "#EFF1F5";
const DANGER = "#DC2626";
const PLACEHOLDER = "#9AA4B4";

/**
 * Type scale for the entered text.
 *
 * A small local map rather than a shared module: `verify` wants its six-digit
 * code at `title2` so it reads as the subject of the screen, and every other
 * field wants `body`. Two options is not a design system.
 */
const TEXT_SIZES = {
  body: { fontSize: 16, lineHeight: 22, fontWeight: "400" },
  title2: { fontSize: 20, lineHeight: 26, fontWeight: "600", letterSpacing: -0.2 },
} satisfies Record<string, TextStyle>;

/** Which entry in {@link TEXT_SIZES} to use. */
export type FieldVariant = keyof typeof TEXT_SIZES;

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

  /** Type scale for the entered text. Defaults to `body`. */
  variant?: FieldVariant;

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
 *   style={{ marginTop: 12 }}
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
  return (
    <View style={styles.fullWidth}>
      <View
        style={[
          styles.pill,
          // A multiline box grows downward, so it needs padding a 44pt
          // single-line row gets for free.
          multiline ? styles.pillMultiline : styles.pillSingleLine,
          error !== null ? styles.pillErrored : null,
          style,
        ]}
      >
        <TextInput
          multiline={multiline}
          placeholderTextColor={PLACEHOLDER}
          style={[styles.input, TEXT_SIZES[variant], inputStyle]}
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
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: SURFACE_SUNKEN,
    // No visible outline at rest — matched to the fill rather than removed, so
    // colouring it on error cannot shift the layout.
    borderColor: SURFACE_SUNKEN,
  },
  pillSingleLine: {
    alignItems: "center",
    paddingVertical: 0,
  },
  pillMultiline: {
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  pillErrored: {
    borderColor: DANGER,
  },
  input: {
    // Takes the row's slack so a trailing accessory sits against the far edge
    // rather than immediately after the text.
    flex: 1,
    color: "#12161D",
  },
});
