/**
 * The pill that opens a list of options.
 *
 * For a choice too long or too variable for a chip row: campus, meetup spot,
 * category. Wears the `Field` pill so a form reads as one rhythm, and owns its
 * own loading, empty and disabled states — a spot list cannot populate until a
 * campus is chosen, and that wait is this control's to show, not the screen's.
 *
 * Returns: a pressable pill, plus a bottom sheet while it is open.
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * The darkened brand blue a selected tab wears in `(tabs)/_layout.tsx`.
 * Selection looks the same everywhere in the app, so a chosen row is the same
 * colour as the tab you are on.
 */
const BRAND_SELECTED = "#023b8b";

/** The sunken input fill, matching `Field` at rest. */
const SURFACE_SUNKEN = "#EFF1F5";

/** Card white. The sheet's own surface, against the dimmed page. */
const SURFACE = "#FFFFFF";

/** Hairline between rows in the sheet. */
const HAIRLINE = "#E2E6ED";

/** Primary text. A chosen value, and the sheet heading. */
const TEXT_PRIMARY = "#12161D";

/** Tertiary text. An option hint, and the chevron. */
const TEXT_TERTIARY = "#6B7688";

/** Placeholder grey. Shown until something is chosen. */
const PLACEHOLDER = "#9AA4B4";

/** One option the sheet offers. */
export interface SelectOption<T extends string> {
  value: T;
  label: string;

  /**
   * A second line under the label — a meetup spot description, say. `null`
   * renders nothing, which is the common case.
   */
  hint?: string | null;

  /**
   * Nesting level, 0 or 1. Indents the row so a two-level category tree reads
   * as a tree in a flat list. The tree is capped at two levels by trigger, so
   * there is no third value to handle.
   */
  depth?: number;
}

/** Props for {@link Select}. */
export interface SelectProps<T extends string> {
  options: readonly SelectOption<T>[];

  /** The chosen value, or `null` for "not chosen yet". */
  value: T | null;

  onChange: (value: T) => void;

  /** Shown in the pill until something is chosen. */
  placeholder: string;

  /** The sheet heading, and the screen-reader name for the pill. "Campus". */
  label: string;

  /** Swaps the chevron for a spinner and refuses presses. */
  isLoading?: boolean;

  /**
   * What the pill says when nothing is loading and there is nothing to choose.
   * A campus with no meetup spots is a real state, not an error, so it gets a
   * sentence rather than an empty sheet.
   */
  emptyMessage?: string;

  disabled?: boolean;
}

/**
 * A single choice, made in a bottom sheet.
 *
 * A sheet rather than an inline list because three of these stack in one form,
 * and eleven categories inline would bury the submit button. Opening is refused
 * while loading, while disabled, and when there is nothing to show — all three
 * are states the pill reports, rather than a tap that does nothing.
 *
 * Returns the pill. The sheet mounts only while open.
 */
export function Select<T extends string>({
  options,
  value,
  onChange,
  placeholder,
  label,
  isLoading = false,
  emptyMessage,
  disabled = false,
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const chosen = options.find((option) => option.value === value) ?? null;
  const isEmpty = !isLoading && options.length === 0;
  const isInert = disabled || isLoading || isEmpty;

  // The pill text, in priority order: what is chosen, why there is nothing to
  // choose, or the invitation to choose.
  const text = chosen?.label ?? (isEmpty ? emptyMessage ?? placeholder : placeholder);

  return (
    <View style={styles.fullWidth}>
      <Pressable
        onPress={() => setIsOpen(true)}
        disabled={isInert}
        accessibilityRole="button"
        // The visible text is a value, not a name — without this a screen
        // reader announces "Nanaimo, button" and never says of what.
        accessibilityLabel={label + ": " + text}
        // `busy` rather than `disabled` while loading: a spot list still
        // arriving is working, and `disabled` alone misreports that.
        accessibilityState={{ disabled: disabled || isEmpty, busy: isLoading }}
        style={[styles.pill, isInert ? styles.dimmed : null]}
      >
        <Text
          numberOfLines={1}
          style={[styles.pillText, chosen === null ? styles.pillPlaceholder : null]}
        >
          {text}
        </Text>

        {isLoading ? (
          <ActivityIndicator size="small" color={styles.chevron.color} />
        ) : (
          <Ionicons name="chevron-down" size={18} color={styles.chevron.color} />
        )}
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        // Android hardware back must close the sheet, not the screen.
        onRequestClose={() => setIsOpen(false)}
      >
        {/* The backdrop is the dismiss target. A sheet whose only way out is a
            button is a trap on a phone. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={"Close " + label}
          onPress={() => setIsOpen(false)}
          style={styles.backdrop}
        />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
          <Text style={styles.sheetTitle}>{label}</Text>

          <ScrollView
            // Bounded, or eleven categories push the sheet past the top of the
            // screen on a small phone.
            style={styles.sheetList}
            contentContainerStyle={styles.sheetListContent}
          >
            {options.map((option) => (
              <SelectRow
                key={option.value}
                option={option}
                isChosen={option.value === value}
                onPress={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              />
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

/** Props for the private {@link SelectRow}. */
interface SelectRowProps<T extends string> {
  option: SelectOption<T>;
  isChosen: boolean;
  onPress: () => void;
}

/** One row in the sheet. Private — it has no meaning outside the list. */
function SelectRow<T extends string>({ option, isChosen, onPress }: SelectRowProps<T>) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: isChosen }}
      style={[styles.row, option.depth ? styles.rowNested : null]}
    >
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, isChosen ? styles.rowLabelChosen : null]}>
          {option.label}
        </Text>

        {/* A real column on meetup_spots, null on most rows. */}
        {option.hint ? <Text style={styles.rowHint}>{option.hint}</Text> : null}
      </View>

      {/* The chosen row is marked by a glyph, not by colour alone. */}
      {isChosen ? (
        <Ionicons name="checkmark" size={20} color={styles.rowLabelChosen.color} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    width: "100%",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    // The `Field` geometry exactly, so a form of pills reads as one rhythm.
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    gap: 8,
    backgroundColor: SURFACE_SUNKEN,
  },
  dimmed: {
    opacity: 0.5,
  },
  pillText: {
    // Takes the row slack so the chevron sits against the far edge.
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400",
    color: TEXT_PRIMARY,
  },
  pillPlaceholder: {
    color: PLACEHOLDER,
  },
  chevron: {
    // Read by the `Ionicons` and `ActivityIndicator` `color` props, not applied
    // as a style — one home for the value either way.
    color: TEXT_TERTIARY,
  },
  backdrop: {
    flex: 1,
    // Black at 40%. The page stays visible behind the sheet, which is what says
    // "on top of the form" rather than "a new screen".
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  sheet: {
    paddingTop: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: SURFACE,
  },
  sheetTitle: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "600",
    letterSpacing: -0.2,
    color: TEXT_PRIMARY,
  },
  sheetList: {
    // Half a screen at most. `maxHeight` on the ScrollView rather than the
    // sheet, so the title stays put while the list scrolls under it.
    maxHeight: 360,
  },
  sheetListContent: {
    paddingHorizontal: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: HAIRLINE,
  },
  rowNested: {
    // A child category, indented so a flat list still reads as a tree.
    paddingLeft: 20,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400",
    color: TEXT_PRIMARY,
  },
  rowLabelChosen: {
    fontWeight: "600",
    // Also read back by the checkmark `color` prop.
    color: BRAND_SELECTED,
  },
  rowHint: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    color: TEXT_TERTIARY,
  },
});
