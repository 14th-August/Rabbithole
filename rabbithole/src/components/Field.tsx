/**
 * The pill text field.
 *
 * The pill geometry every text input wears, the error colouring that marks one
 * sentence; the field itself does not know. Extracted from `sign-in`, `sign-up` and
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

/**
 * Type scale for the entered text.
 *
 * A small local map rather than a shared module: `verify` wants its six-digit
 * code at `title2` so it reads as the subject of the screen, and every other
 * field wants `body`. Two options is not a design system.
 */

const TEXT_SIZES = {
  body: { fontSize: 16, fontWeight: "400" },
  title2: { fontSize: 20, fontWeight: "600", letterSpacing: -0.2 },
} satisfies Record<string, TextStyle>;

/** Which entry in {@link TEXT_SIZES} to use. */
export type FieldVariant = keyof typeof TEXT_SIZES;

/**
 * Leading, applied to MULTILINE fields and nothing else.
 *
 * `lineHeight` on a single-line `TextInput` is the bug it looks like a style:
 * the line box becomes taller than the glyphs need, the text settles toward the
 * bottom of it, and the shift shows up when the field blurs — because a focused
 * input is laid out by the platform's editor and a blurred one by RN. Every
 * field in the app sat a few points low after being typed into, for this reason.
 *
 * Multiline genuinely needs it: with no leading, wrapped lines touch.
 */
const LINE_HEIGHTS = {
  body: { lineHeight: 22 },
  title2: { lineHeight: 26 },
} satisfies Record<FieldVariant, TextStyle>;

/** Everything a {@link Field} takes, on top of the usual `TextInput` props. */
export interface FieldProps extends Omit<TextInputProps, "style"> {
  error?: string | null;

  /**
   * Sits inside the pill, before the text — a currency symbol, a `@`.
   *
   * Part of the value rather than decoration beside it, which is why it is in
   * the pill and not a label above: "$" and "12.50" are one number, and a
   * screen reader should not have to cross a container to read it.
   */
  leading?: ReactNode;

  trailing?: ReactNode;
  variant?: FieldVariant;
  inputStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
}

export function Field({
  error = null,
  leading,
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
        {leading}

        <TextInput
          multiline={multiline}
          placeholderTextColor={styles.placeholder.color}
          style={[
            styles.input,
            TEXT_SIZES[variant],
            multiline
              ? [LINE_HEIGHTS[variant], styles.inputMultiline]
              : styles.inputSingleLine,
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
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    // The sunken input fill.
    backgroundColor: "#EFF1F5",
    // The same value again, deliberately: no visible outline at rest, matched to
    // the fill rather than removed, so colouring it on error cannot shift the layout.
    borderColor: "#EFF1F5",
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
    // Error red, the same value the message beneath uses.
    borderColor: "#DC2626",
  },
  input: {
    // Takes the row's slack so a trailing accessory sits against the far edge
    // rather than immediately after the text.
    flex: 1,
    // RN gives a TextInput its own platform padding — several points on
    // Android, a little on iOS — which pushes the typed text off the baseline
    // of anything sitting beside it in the row. The pill owns the padding.
    padding: 0,
    // The other half of the same problem, and the half that was missed first
    // time: Android reserves font padding on a TextInput exactly as it does on
    // a Text, so switching it off on only one of the two left them misaligned.
    includeFontPadding: false,
    // Primary text - what the user typed is the most important thing in the pill.
    color: "#12161D",
  },
  inputSingleLine: {
    // Android only — iOS centres a single line in its own box already.
    textAlignVertical: "center",
  },
  inputMultiline: {
    // Text starts at the top of the box rather than floating in the middle of
    // a 112pt one.
    textAlignVertical: "top",
  },
  placeholder: {
    // Placeholder grey, a step lighter than the entered text so the two never
    // read as the same thing. Not a layout style - `placeholderTextColor` is a
    // prop, and this is where the value it reads lives.
    color: "#9AA4B4",
  },
});
