/**
 * The pill button.
 * Returns: a `Pressable` pill — filled for `primary`, text-only for `ghost`.
 */

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";

const BRAND = "#0165F2";
const ON_BRAND = "#FFFFFF";
const TEXT_TERTIARY = "#6B7688";

/** Default hitSlop for the text-only variant, which has no fill to aim at. */
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

/**
 * Which of the two shapes to wear.
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
  isPending?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  isPending = false,
  disabled = false,
  accessibilityLabel,
  style,
}: ButtonProps) {
  // A press mid-flight would fire the same action twice, so pending blocks just
  const isInert = disabled || isPending;
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      disabled={isInert}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      // `busy` makes the wait audible. `disabled` alone announces
      // "unavailable", which is misleading for a button that is working.
      accessibilityState={{ disabled: isInert, busy: isPending }}
      hitSlop={isPrimary ? undefined : HIT_SLOP}
      style={[
        styles.button,
        isPrimary ? styles.primary : styles.ghost,
        // The filled pill dims whole; a text-only button recolours instead,
        isPrimary && isInert ? styles.dimmed : null,
        style,
      ]}
    >
      {isPending ? (
        <ActivityIndicator color={isPrimary ? ON_BRAND : BRAND} />
      ) : (
        <Text
          style={[
            isPrimary ? styles.primaryLabel : styles.ghostLabel,
            !isPrimary && disabled ? styles.ghostLabelDisabled : null,
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
    minHeight: 44,
    borderRadius: 999,
  },
  primary: {
    width: "100%",
    backgroundColor: BRAND,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  dimmed: {
    opacity: 0.5,
  },
  primaryLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    color: ON_BRAND,
  },
  ghostLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    color: BRAND,
  },
  ghostLabelDisabled: {
    color: TEXT_TERTIARY,
  },
});
