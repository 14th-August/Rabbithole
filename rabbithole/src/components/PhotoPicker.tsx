/*
 * Date: 2026-10-30
 * PhotoPicker: the photo well on the Create form, camera or library.
 * Used by src/app/(tabs)/create.tsx, which owns the array it reports.
*/

import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { normalizeToJpeg } from "@/lib/images";
import type { ImageAsset } from "@/lib/queries/storage";

/** Brand blue. The add glyph, and the cover badge. */
const BRAND = "#0165F2";

/** On brand: the cover badge label. */
const ON_BRAND = "#FFFFFF";

/** The sunken input fill. The well and the add tile. */
const SURFACE_SUNKEN = "#EFF1F5";

/** Secondary text. The well caption. */
const TEXT_SECONDARY = "#4C5566";

/** Primary text. The remove button, over its white disc. */
const TEXT_PRIMARY = "#12161D";

/** Tertiary text. The "Photos Chosen" count. */
const TEXT_TERTIARY = "#6B7688";

/** The remove button glyph is 16pt inside a 24pt disc; this lifts it to 44. */
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

// No `quality` on either picker call, deliberately: it only applies when the
// picker re-encodes, which it skips for a multi-select library pick and for a
// PNG, so it never was the format guarantee it looked like. normalizeToJpeg
// does the one lossy encode now.

/** Props for {@link PhotoPicker}. */
export interface PhotoPickerProps {
  /** In display order. `photos[0]` becomes the cover. */
  photos: readonly ImageAsset[];

  /** Called with the whole next array, never with a delta. */
  onChange: (photos: ImageAsset[]) => void;

  /** How many are allowed. Passed in, not imported: that rule is the query layer's. */
  max: number;

  disabled?: boolean;
}

/*
* Def: PhotoPicker
* Desc: Choose up to `max` photos, cover first. Whether at least one is REQUIRED
* is not decided here -- the screen asks validateListing, which says yes. This
* only reports what was chosen, so making photos optional is a one-place change.
* Return: the well when empty, the strip once there is something to show.
*/
export function PhotoPicker({ photos, onChange, max, disabled = false }: PhotoPickerProps) {
  /** Re-encoding is fast but not instant, and a 4-photo pick is four of them. */
  const [isPreparing, setIsPreparing] = useState(false);

  const isFull = photos.length >= max;

  // Everything that mutates the array goes through this rather than `disabled`,
  // so a second pick cannot land while the first is still being re-encoded.
  const isBusy = disabled || isPreparing;

  /*
  * Def: append
  * Desc: Re-encodes whatever the picker returned, then appends it, never past
  * `max`. Trimmed to the remaining room BEFORE normalising, so nothing is
  * decoded only to be sliced off and thrown away.
  * Return: nothing; reports upward through onChange.
  */
  async function append(assets: ImagePicker.ImagePickerAsset[]) {
    const room = max - photos.length;
    if (room <= 0) return;

    setIsPreparing(true);

    // Sequential, not `Promise.all`: four full-resolution decodes at once is
    // how an older phone runs out of memory mid-pick.
    const added: ImageAsset[] = [];
    for (const asset of assets.slice(0, room)) {
      const normalized = await normalizeToJpeg(asset);
      if (normalized) added.push(normalized);
    }

    setIsPreparing(false);

    // One alert for the batch, not one per photo.
    const failed = Math.min(assets.length, room) - added.length;
    if (failed > 0) {
      Alert.alert(
        failed === 1 ? "A photo could not be used" : failed + " photos could not be used",
        "Try picking " + (failed === 1 ? "it" : "them") + " again.",
      );
    }

    if (added.length > 0) onChange([...photos, ...added]);
  }

  async function pickFromLibrary() {
    // No permission request here on purpose. The library picker needs none for
    // images on a modern OS, and asking anyway costs the user a dialog that
    // explains nothing. The camera below is the one that genuinely requires it.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      // Only as many as there is room for, so the cap is enforced in the system
      // UI rather than by silently discarding what the user just chose.
      selectionLimit: max - photos.length,
      // iOS 15+. Without it the return order is not guaranteed, and the order
      // is what decides which photo becomes the cover.
      orderedSelection: true,
    });

    if (!result.canceled) await append(result.assets);
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Camera access needed",
        permission.canAskAgain
          ? "Allow camera access to photograph your item."
          : "Allow camera access for Rabbithole in Settings to photograph your item.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
    });

    if (!result.canceled) await append(result.assets);
  }

  /** The source choice. `Alert` rather than a sheet — two options and a cancel. */
  function addPhoto() {
    Alert.alert("Add a photo", undefined, [
      { text: "Take a photo", onPress: () => void takePhoto() },
      { text: "Choose from library", onPress: () => void pickFromLibrary() },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function removeAt(index: number) {
    onChange(photos.filter((_, position) => position !== index));
  }

  const well = (
    <Pressable
      onPress={addPhoto}
      disabled={isBusy}
      accessibilityRole="button"
      accessibilityLabel="Add a photo of your item"
      accessibilityState={{ disabled: isBusy, busy: isPreparing }}
      style={[styles.well, isBusy ? styles.dimmed : null]}
    >
      <Ionicons name="add" size={40} color={styles.addGlyph.color} />
      <Text style={styles.wellCaption}>Take or upload a photo of your item</Text>
    </Pressable>
  );

  const strip = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      {photos.map((photo, index) => (
        <View key={photo.uri} style={styles.tile}>
          <Image
            source={{ uri: photo.uri }}
            style={styles.thumbnail}
            contentFit="cover"
            // Decorative: the position and cover state are announced by the
            // remove button beside it, and the photo itself has no alt text a
            // user could have written.
            accessible={false}
          />

          {/* Position 0 is the cover, and nothing else on the tile says so. */}
          {index === 0 ? (
            <View style={styles.coverBadge}>
              <Text style={styles.coverBadgeLabel}>Cover</Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => removeAt(index)}
            disabled={isBusy}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={
              "Remove photo " + (index + 1) + " of " + photos.length +
              (index === 0 ? ", the cover" : "")
            }
            style={styles.remove}
          >
            <Ionicons name="close" size={16} color={styles.removeGlyph.color} />
          </Pressable>
        </View>
      ))}

      {/* Gone at the cap rather than disabled: a tile that cannot be tapped
          still invites the tap that tells you so. */}
      {isFull ? null : (
        <Pressable
          onPress={addPhoto}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel={"Add a photo. " + photos.length + " of " + max + " chosen"}
          accessibilityState={{ disabled: isBusy, busy: isPreparing }}
          style={[styles.tile, styles.addTile, isBusy ? styles.dimmed : null]}
        >
          <Ionicons name="add" size={32} color={styles.addGlyph.color} />
        </Pressable>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.fullWidth}>
      {photos.length === 0 ? well : strip}

      {/* Rendered at zero too. The cap is something to know before you start,
          not only once you are near it. Doubles as the progress line, because a
          spinner of its own would be a third thing moving on a busy form. */}
      <Text style={styles.count}>
        {isPreparing
          ? "Preparing photos…"
          : "Photos Chosen (" + photos.length + "/" + max + ")"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    width: "100%",
    gap: 8,
  },
  count: {
    // Same treatment as the labels above every other control, so it reads as
    // part of the form rather than as a caption on the photos.
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    color: TEXT_TERTIARY,
  },
  well: {
    width: "100%",
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    backgroundColor: SURFACE_SUNKEN,
  },
  wellCaption: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "400",
    color: TEXT_SECONDARY,
  },
  dimmed: {
    opacity: 0.5,
  },
  strip: {
    flexDirection: "row",
    gap: 8,
    // The strip is inside a ScrollView, so its own padding is what keeps the
    // first and last tiles off the screen edge.
    paddingVertical: 2,
  },
  tile: {
    width: 148,
    height: 148,
    borderRadius: 14,
    // Clips the thumbnail to the radius. The remove button sits inside the
    // tile for the same reason — overflow here would cut it off.
    overflow: "hidden",
    backgroundColor: SURFACE_SUNKEN,
  },
  addTile: {
    alignItems: "center",
    justifyContent: "center",
  },
  addGlyph: {
    // Read by the `Ionicons` `color` prop, not applied as a style.
    color: BRAND,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  coverBadge: {
    position: "absolute",
    left: 6,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: BRAND,
  },
  coverBadgeLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: ON_BRAND,
  },
  remove: {
    position: "absolute",
    top: 6,
    right: 6,
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: 999,
    // A white disc, so the glyph stays legible over a dark photo.
    backgroundColor: ON_BRAND,
  },
  removeGlyph: {
    // Read by the `Ionicons` `color` prop, not applied as a style.
    color: TEXT_PRIMARY,
  },
});
