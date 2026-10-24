/**
 * Free-text tags, added one at a time.
 *
 * The only taxonomy a user creates: `categories` is administered and read-only,
 * `tags` has an INSERT policy. Normalises as it accepts, so "BIOL 121" becomes
 * `biol-121` rather than being refused — the CHECK on `tags.name` is strict and
 * what people type is not.
 *
 * Returns: the chips added so far, and a field for the next one.
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Field } from "@/components/Field";
import { normalizeTag } from "@/lib/utils";

/** Brand blue. The add affordance. */
const BRAND = "#0165F2";

/** The sunken input fill, matching `Field`. A tag chip. */
const SURFACE_SUNKEN = "#EFF1F5";

/** Secondary text. A chip label and its remove glyph. */
const TEXT_SECONDARY = "#4C5566";

/** The remove glyph is 14pt inside a chip; this lifts its target to 44. */
const HIT_SLOP = { top: 12, bottom: 12, left: 8, right: 12 };

/** Props for {@link TagInput}. */
export interface TagInputProps {
  /** Already normalised. The component never hands back anything else. */
  tags: readonly string[];

  /** Called with the whole next list, never with a delta. */
  onChange: (tags: string[]) => void;

  /**
   * How many tags one listing may carry.
   *
   * A product rule with no schema behind it — `listing_tags` has no cap — so it
   * is a prop rather than a constant, and raising it costs nothing.
   */
  max?: number;

  disabled?: boolean;
}

/**
 * Add up to `max` tags, each normalised on the way in.
 *
 * Refusing is inline and specific: an unusable tag says why rather than
 * disappearing, because the normaliser is forgiving enough that a rejection
 * means something genuinely unrepresentable — an emoji, an accent, a leading
 * hyphen — and "nothing happened" would read as a broken button.
 *
 * Returns the chip row and the field beneath it.
 */
export function TagInput({ tags, onChange, max = 5, disabled = false }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isFull = tags.length >= max;

  function add() {
    if (draft.trim() === "") return;

    if (isFull) {
      setError("That's " + max + " tags, which is the limit.");
      return;
    }

    const tag = normalizeTag(draft);

    if (tag === null) {
      setError("Tags are letters, numbers and hyphens, up to 30 characters.");
      return;
    }

    // Already there is not a failure — the user asked for a tag they have, and
    // they now have it. Clearing the field is the whole response.
    if (!tags.includes(tag)) onChange([...tags, tag]);

    setDraft("");
    setError(null);
  }

  function removeAt(index: number) {
    onChange(tags.filter((_, position) => position !== index));
    setError(null);
  }

  return (
    <View style={styles.fullWidth}>
      {tags.length > 0 ? (
        <View style={styles.chips}>
          {tags.map((tag, index) => (
            <View key={tag} style={styles.chip}>
              <Text style={styles.chipLabel}>{tag}</Text>

              <Pressable
                onPress={() => removeAt(index)}
                disabled={disabled}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel={"Remove tag " + tag}
                accessibilityState={{ disabled }}
              >
                <Ionicons name="close" size={14} color={styles.chipLabel.color} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <Field
        placeholder={isFull ? "That's all " + max : "Example: MATH121"}
        value={draft}
        onChangeText={(next) => {
          setDraft(next);
          // Clear as they retype. A message about the last attempt sitting
          // under a field they are already fixing reads as a live complaint.
          if (error !== null) setError(null);
        }}
        // Submitting from the keyboard is the fast path; the + is the one that
        // is visible. Both land here.
        onSubmitEditing={add}
        returnKeyType="done"
        // The keyboard would otherwise capitalise the first letter of every
        // tag, and the CHECK on `tags.name` refuses uppercase outright.
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={30}
        editable={!disabled && !isFull}
        error={error}
        trailing={
          <Pressable
            onPress={add}
            disabled={disabled || isFull}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Add this tag"
            accessibilityState={{ disabled: disabled || isFull }}
          >
            <Ionicons
              name="add"
              size={20}
              color={isFull ? styles.chipLabel.color : styles.addGlyph.color}
            />
          </Pressable>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    width: "100%",
    gap: 8,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    // Shorter than a 44pt control on purpose: a chip is a label with a remove
    // target on it, not something you press. The target itself is hitSlopped.
    minHeight: 32,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: 999,
    gap: 6,
    backgroundColor: SURFACE_SUNKEN,
  },
  chipLabel: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "500",
    // Also read back by the remove glyph, so the word and the cross match.
    color: TEXT_SECONDARY,
  },
  addGlyph: {
    // Read by the `Ionicons` `color` prop, not applied as a style.
    color: BRAND,
  },
});
