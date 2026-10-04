/**
 * The selectable pill.
 *
 * Owns: how one option in a set of choices looks selected and unselected, and
 *   making that difference legible without relying on colour.
 * Does not own: which option is chosen, or whether a set allows more than one.
 *   Callers hold the selection and pass `isSelected` per pill.
 *
 * Used for category, condition, and campus on the Create screen — three sets on
 * one screen, which is why this is a component rather than three near-identical
 * blocks.
 *
 * Wears the same geometry as `Field`: a fully-rounded pill whose border is
 * always present and only ever recoloured, so selecting one never shifts the row
 * by a pixel.
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/theme";

/** Everything a {@link Pill} takes. */
export interface PillProps {
  /** The visible text, and what a screen reader announces. */
  label: string;

  /** Whether this option is currently chosen. */
  isSelected: boolean;

  onPress: () => void;

  /** True when the option cannot currently be chosen. */
  disabled?: boolean;

  style?: StyleProp<ViewStyle>;
}

/**
 * One option in a row of choices.
 *
 * @example
 * ```tsx
 * <Pill
 *   label={formatCondition(value)}
 *   isSelected={form.condition === value}
 *   onPress={() => updateField({ condition: value })}
 * />
 * ```
 */
export function Pill({ label, isSelected, onPress, disabled = false, style }: PillProps) {
  const { colors, spacing, radius, layout, typography } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      // `selected` is what makes the choice audible. Without it a screen reader
      // reads five identical buttons and never says which one is active.
      accessibilityState={{ selected: isSelected, disabled }}
      style={[
        styles.pill,
        {
          minHeight: layout.tapTargetMin,
          paddingHorizontal: spacing.lg,
          gap: spacing.xs,
          borderRadius: radius.pill,
          borderWidth: layout.borderWidth,
          borderColor: isSelected ? colors.brand.default : colors.surfaceSunken,
          backgroundColor: isSelected ? colors.brand.default : colors.surfaceSunken,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {/*
        Never colour alone. A filled blue pill and a grey one are the same pill
        to anyone who cannot tell the two apart, so the tick carries the state a
        second time — the same reason a status badge says "Reserved" as well as
        being amber.
      */}
      {isSelected ? <Ionicons name="checkmark" size={14} color={colors.brand.onBrand} /> : null}

      <Text
        style={[
          typography.caption,
          { color: isSelected ? colors.brand.onBrand : colors.text.primary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
