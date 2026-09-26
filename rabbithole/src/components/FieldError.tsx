/**
 * A validation message belonging to one input.
 *
 * Owns: how a single field reports what is wrong with it.
 * Does not own: deciding that anything is wrong, or which field owns the
 *   problem. The screen holds that, because only the screen knows what it
 *   asked for.
 *
 * Distinct from the error banner above the submit button, and the split is the
 * point. A banner answers "why did this form not go through" — a wrong
 * password, an unreachable server, a rejected signup. This answers "what do I
 * fix, and where", so it sits against the field it belongs to and nothing else
 * is marked.
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme";

/** Props for {@link FieldError}. */
interface FieldErrorProps {
  /** What to fix, as a sentence. Not an error code. */
  message: string;
}

/** Inline message shown directly beneath the field it refers to. */
export function FieldError({ message }: FieldErrorProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View
      // Announced on appearance. A field that silently turns red says nothing
      // at all to a screen reader.
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.row,
        {
          marginTop: spacing.xs,
          // Matches the field's own horizontal padding so the text lines up with
          // the placeholder above it rather than the pill's outer edge.
          paddingHorizontal: spacing.lg,
          gap: spacing.xs,
        },
      ]}
    >
      <Ionicons name="alert-circle" size={14} color={colors.status.danger} />
      <Text style={[typography.footnote, styles.text, { color: colors.status.danger }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    // Wraps beside the icon rather than pushing it off the row.
    flex: 1,
  },
});
