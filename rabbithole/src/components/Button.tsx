/**
 * The pill button.
 *
 * Owns: the two button shapes the app uses, their disabled and in-flight
 *   treatments, and what a screen reader is told about both.
 * Does not own: what the press does, or whether it is allowed to happen. Callers
 *   own `onPress` and compute `disabled`.
 *
 * Extracted from `sign-in`, `sign-up`, and `verify`, which repeated the same
 * tap-target block four times between them.
 */

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useTheme } from "@/theme";

/**
 * Which of the two shapes to wear.
 *
 * `primary` is the filled brand pill — one per screen, the thing the screen is
 * for. `ghost` is text-only, for the secondary action sitting under it.
 */
export type ButtonVariant = "primary" | "ghost";

/** Everything a {@link Button} takes. */
export interface ButtonProps {
  /** The visible text. Also the accessibility label unless one is given. */
  label: string;

  onPress: () => void;

  /** Defaults to `primary`. */
  variant?: ButtonVariant;

  /**
   * True while the press's work is running. Swaps the label for a spinner and
   * blocks further presses.
   */
  isPending?: boolean;

  /** True when the press is not currently allowed. */
  disabled?: boolean;

  /**
   * Overrides the announced name when `label` alone is not descriptive — a
   * countdown label like "Send a new code in 5s" reads badly out loud.
   */
  accessibilityLabel?: string;

  style?: StyleProp<ViewStyle>;
}

/**
 * A button in one of the app's two shapes.
 *
 * @example
 * ```tsx
 * <Button
 *   label="Log in"
 *   onPress={handleSubmit}
 *   disabled={!isComplete}
 *   isPending={submit.isPending}
 *   style={{ marginTop: spacing.xl }}
 * />
 * ```
 */
export function Button({
  label,
  onPress,
  variant = "primary",
  isPending = false,
  disabled = false,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const { colors, radius, layout, typography } = useTheme();

  // A press mid-flight would fire the same action twice, so pending blocks just
  // as disabled does — but the two are announced differently below.
  const isInert = disabled || isPending;

  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      disabled={isInert}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      // `busy` is what makes the wait audible. `disabled` alone reads as
      // "unavailable", which is a different and misleading thing to announce
      // about a button that is working.
      accessibilityState={{ disabled: isInert, busy: isPending }}
      hitSlop={isPrimary ? undefined : layout.hitSlop}
      style={[
        styles.button,
        {
          minHeight: layout.tapTargetMin,
          borderRadius: radius.pill,
          backgroundColor: isPrimary ? colors.brand.default : "transparent",
          // The filled pill dims as a whole. A text-only button has no fill to
          // dim, so it recolours instead — halving the opacity of small text
          // fails contrast rather than reading as unavailable.
          opacity: isPrimary && isInert ? 0.5 : 1,
        },
        isPrimary ? styles.fullWidth : null,
        style,
      ]}
    >
      {isPending ? (
        <ActivityIndicator color={isPrimary ? colors.brand.onBrand : colors.brand.default} />
      ) : (
        <Text
          style={[
            isPrimary ? typography.bodyStrong : typography.footnote,
            {
              color: isPrimary
                ? colors.brand.onBrand
                : disabled
                  ? colors.text.tertiary
                  : colors.brand.default,
            },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidth: {
    width: "100%",
  },
});
