/**
 * A validation message belonging to one input.
 *
 * How a single field reports what is wrong with it. The screen decides that
 * something IS wrong and which field owns it, because only the screen knows what
 * it asked for. Distinct from the banner above the submit button: a banner
 * answers "why did this form not go through", this answers "what do I fix, and
 * where", so it sits against its field and nothing else is marked.
 *
 * Returns: an inline icon-and-text row, announced to screen readers on appearance.
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

/** Props for {@link FieldError}. */
interface FieldErrorProps {
  /** What to fix, as a sentence. Not an error code. */
  message: string;
}

const DANGER = "#DC2626";

/** Inline message shown directly beneath the field it refers to. */
export function FieldError({ message }: FieldErrorProps) {
  return (
    <View
      // Announced on appearance. A field that silently turns red says nothing
      // at all to a screen reader.
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={styles.row}
    >
      <Ionicons name="alert-circle" size={14} color={DANGER} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    // Matches the field's own horizontal padding so the text lines up with the
    // placeholder above it rather than the pill's outer edge.
    paddingHorizontal: 16,
    gap: 4,
  },
  text: {
    // Wraps beside the icon rather than pushing it off the row.
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    color: DANGER,
  },
});
