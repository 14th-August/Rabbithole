/**
 * Pill chips for a choice that fits on one row.
 *
 * Two controls, not one with a mode: {@link ChipPicker} picks exactly one
 * option, {@link ChipToggles} picks any number. They share a pill and an
 * accessibility shape but nothing else — their value, their callback and their
 * screen-reader role all differ, which is what makes them two components.
 *
 * Returns: a row of pressable pills, wrapping or scrolling. Neither renders a
 * label or an error; the screen owns both, as it does for `Field`.
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

/**
 * The darkened brand blue a selected tab wears in `(tabs)/_layout.tsx`.
 * Selection looks the same everywhere in the app, so a chosen chip is the
 * same colour as the tab you are on.
 */
const BRAND_SELECTED = "#023b8b";

/** On brand: a chosen chip's label and check. */
const ON_BRAND = "#FFFFFF";

/** The sunken input fill, matching `Field` at rest. An unchosen chip. */
const SURFACE_SUNKEN = "#EFF1F5";

/** Secondary text. An unchosen chip's label. */
const TEXT_SECONDARY = "#4C5566";

/** One option a chip row offers. */
export interface ChipOption<T extends string> {
  /** The value stored when chosen. Usually a database enum member. */
  value: T;
  /** What the user reads. Display copy, safe to reword. */
  label: string;
}

/** Props for {@link ChipPicker}. */
export interface ChipPickerProps<T extends string> {
  options: readonly ChipOption<T>[];

  /** The chosen value, or `null` for "not chosen yet" — a real, distinct state. */
  value: T | null;

  onChange: (value: T) => void;

  /**
   * Names the group for a screen reader, since the visible label lives on the
   * screen rather than in here. "Condition", not "Condition picker".
   */
  accessibilityLabel: string;

  /**
   * Lay the chips out on one scrolling line instead of wrapping.
   *
   * Keeps the control one row tall, which matters when several stack in a form.
   * The cost is real: options past the fold are behind a gesture nothing
   * signposts, so use it where the first chip or two already tell the user what
   * kind of thing this is.
   */
  scrollable?: boolean;

  disabled?: boolean;
}

/**
 * Pick exactly one. Condition, in the Create form.
 *
 * A row rather than a modal because five options fit, and a modal to choose
 * between five words is a tap and a dismissal spent on nothing.
 *
 * Returns the row. Re-pressing the chosen chip does nothing — deselecting would
 * return the field to `null`, and there is no path back to "unchosen" the user
 * would want.
 */
export function ChipPicker<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  scrollable = false,
  disabled = false,
}: ChipPickerProps<T>) {
  const chips = options.map((option) => (
    <Chip
      key={option.value}
      label={option.label}
      isChosen={option.value === value}
      disabled={disabled}
      role="radio"
      onPress={() => onChange(option.value)}
    />
  ));

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="radiogroup"
        accessibilityLabel={accessibilityLabel}
        contentContainerStyle={styles.scrollRow}
      >
        {chips}
      </ScrollView>
    );
  }

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.row}>
      {chips}
    </View>
  );
}

/** Props for {@link ChipToggles}. */
export interface ChipTogglesProps<T extends string> {
  options: readonly ChipOption<T>[];

  /** Every chosen value. `[]` is valid here — the screen decides if it is allowed. */
  values: readonly T[];

  /** Called with the whole next set, not the one that changed. */
  onChange: (values: T[]) => void;

  accessibilityLabel: string;

  disabled?: boolean;
}

/**
 * Pick any number. Payment Type, in the Create form.
 *
 * Hands back the full next array rather than the toggled member, so the caller
 * never reconstructs state from a delta — the one shape that makes a double tap
 * produce the wrong set.
 *
 * Returns the row. Enforcing a minimum is NOT this component's job:
 * `listings_accepts_a_payment_method` is a CHECK constraint and
 * `validateListing` mirrors it, so a control that silently refused the last
 * untoggle would hide a rule the form is supposed to explain.
 */
export function ChipToggles<T extends string>({
  options,
  values,
  onChange,
  accessibilityLabel,
  disabled = false,
}: ChipTogglesProps<T>) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const isChosen = values.includes(option.value);

        return (
          <Chip
            key={option.value}
            label={option.label}
            // There is no checkbox-group role in React Native, so a label on
            // the row above is never read out. Naming the group on each chip is
            // what actually reaches a screen reader: "Payment type, Cash".
            accessibilityLabel={`${accessibilityLabel}, ${option.label}`}
            isChosen={isChosen}
            disabled={disabled}
            role="checkbox"
            onPress={() =>
              onChange(
                isChosen
                  ? values.filter((member) => member !== option.value)
                  : [...values, option.value],
              )
            }
          />
        );
      })}
    </View>
  );
}

/** Props for the private {@link Chip}. */
interface ChipProps {
  label: string;
  /** Overrides the visible text for a screen reader. Defaults to `label`. */
  accessibilityLabel?: string;
  isChosen: boolean;
  disabled: boolean;
  /** `radio` inside a picker, `checkbox` inside toggles. */
  role: "radio" | "checkbox";
  onPress: () => void;
}

/**
 * One pill. Private: it is the shared half of the two controls above, and has
 * no meaning on its own — a chip outside a group is a `Button`.
 */
function Chip({ label, accessibilityLabel, isChosen, disabled, role, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? label}
      // `checked`, not `selected`: both roles announce a chosen state this way,
      // and `selected` on a radio reads as focus rather than choice.
      accessibilityState={{ checked: isChosen, disabled }}
      style={[styles.chip, isChosen ? styles.chipChosen : null, disabled ? styles.dimmed : null]}
    >
      {/* Never colour alone — design-rules.md. The check is what a chosen chip
          reads as in greyscale, and to anyone who cannot separate blue from grey. */}
      {isChosen ? (
        <Ionicons name="checkmark" size={16} color={styles.chipLabelChosen.color} />
      ) : null}

      <Text style={[styles.chipLabel, isChosen ? styles.chipLabelChosen : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    // The default. Every option is visible at once, at the cost of the control
    // growing taller on a narrow screen — see `scrollable` for the other trade.
    flexWrap: "wrap",
    gap: 8,
  },
  scrollRow: {
    flexDirection: "row",
    gap: 8,
    // The ScrollView clips at its own edge, so the last chip needs the gap that
    // a wrapping row gets from the screen's padding.
    paddingRight: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    // The accessibility floor, and the same height as `Field`, so a chip row
    // and a text row sit on one rhythm.
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    gap: 4,
    backgroundColor: SURFACE_SUNKEN,
  },
  chipChosen: {
    backgroundColor: BRAND_SELECTED,
  },
  dimmed: {
    opacity: 0.5,
  },
  chipLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
    color: TEXT_SECONDARY,
  },
  chipLabelChosen: {
    // Also read back by the `Ionicons` `color` prop above, so the glyph and the
    // word cannot drift apart.
    color: ON_BRAND,
  },
});
