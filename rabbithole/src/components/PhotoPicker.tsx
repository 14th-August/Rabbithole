/**
 * The photo well on the Create form.
 *
 * Picks images from the camera or the library, caps how many, and reports them
 * in order — the first is the cover. It holds nothing itself: the screen owns
 * the array, so a failed publish does not lose what the user already chose.
 *
 * Returns: an empty well, or a strip of thumbnails followed by an add tile.
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

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

/**
 * Picker options shared by the camera and the library.
 *
 * `quality` is the only compression available without a new dependency, and
 * unresized phone photos are what the storage migration warns will dominate the
 * free tier. It also forces an iPhone HEIC to transcode to JPEG — except for
 * `.png` and `.bmp` picked from the library, where iOS ignores it. That is why
 * the upload reads `mimeType` rather than assuming.
 */
const QUALITY = 0.7;

/** Props for {@link PhotoPicker}. */
export interface PhotoPickerProps {
  /** In display order. `photos[0]` becomes the cover. */
  photos: readonly ImageAsset[];

  /** Called with the whole next array, never with a delta. */
  onChange: (photos: ImageAsset[]) => void;

  /**
   * How many photos are allowed. Passed in rather than imported so this stays a
   * presentational component — `MAX_LISTING_PHOTOS` is the query layer's rule,
   * and `src/components` does not reach into `src/lib/queries` for values.
   */
  max: number;

  disabled?: boolean;
}

/**
 * Choose up to `max` photos, cover first.
 *
 * Whether at least one is required is not decided here — the screen asks
 * `validateListing`, which currently says yes. This component only ever reports
 * what was chosen, so making photos optional again is a change in one place.
 *
 * Returns the well when empty, the strip once there is something to show.
 */
export function PhotoPicker({ photos, onChange, max, disabled = false }: PhotoPickerProps) {
  const isFull = photos.length >= max;

  /** Appends whatever the picker returned, never past `max`. */
  function append(assets: ImagePicker.ImagePickerAsset[]) {
    const added = assets.map((asset) => ({
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      mimeType: asset.mimeType,
    }));

    onChange([...photos, ...added].slice(0, max));
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
      quality: QUALITY,
    });

    if (!result.canceled) append(result.assets);
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
      quality: QUALITY,
    });

    if (!result.canceled) append(result.assets);
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
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Add a photo of your item"
      accessibilityState={{ disabled }}
      style={[styles.well, disabled ? styles.dimmed : null]}
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
            disabled={disabled}
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
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={"Add a photo. " + photos.length + " of " + max + " chosen"}
          accessibilityState={{ disabled }}
          style={[styles.tile, styles.addTile, disabled ? styles.dimmed : null]}
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
          not only once you are near it. */}
      <Text style={styles.count}>
        {"Photos Chosen (" + photos.length + "/" + max + ")"}
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
