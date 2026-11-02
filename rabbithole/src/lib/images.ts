/*
 * Date: 2026-10-30
 * normalizeToJpeg: re-encodes a picked photo as a JPEG the app can decode.
 * Used by PhotoPicker, at pick time, before anything enters the screen's state.
*/

import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import type { ImageAsset } from "./queries/storage";

/** Long edge of a stored photo, in px. Matches the seed's fixture dimensions. */
const MAX_EDGE = 1600;

/** The only lossy step in the pipeline, so it can afford to be gentle. */
const COMPRESS = 0.8;

/*
* Def: DECODE_EDGE
* Desc: Ceiling for the decode, at twice the target. Downsampling while decoding
* snaps to whole ratios, so asking for exactly MAX_EDGE can land well under it.
* 2x leaves enough pixels to hit the target in the resize, and still keeps a
* 50MP photo from ever being held at full size.
*/
const DECODE_EDGE = MAX_EDGE * 2;

/** The fields of an `ImagePickerAsset` this reads. An ImagePickerAsset satisfies it. */
export interface PickedAsset {
  /** A local `file://` URI. */
  uri: string;
  width: number;
  height: number;
}

/*
* Def: normalizeToJpeg
* Desc: Re-encodes one picked photo as a JPEG with a long edge of at most
* MAX_EDGE. SaveFormat.JPEG sets the output format rather than inferring it, so
* the result is a real JPEG whatever went in -- which is what makes the .jpg in
* the storage path true and lets the upload send a flat image/jpeg header.
* Return: the saved cache URI with its POST-RESIZE dimensions, or null if the
* file could not be read or encoded. Never throws.
*/
export async function normalizeToJpeg(asset: PickedAsset): Promise<ImageAsset | null> {
  const longEdge = Math.max(asset.width, asset.height);
  const isMeasured = Number.isFinite(longEdge) && longEdge > 0;

  // Without usable dimensions there is no way to resize without risking an
  // upscale, so let the decode do the capping instead. The re-encode below
  // still fixes the format, which is the actual bug.
  const decodeBound = isMeasured ? DECODE_EDGE : MAX_EDGE;

  try {
    const context = ImageManipulator.manipulate(asset.uri, {
      maxWidth: decodeBound,
      maxHeight: decodeBound,
    });

    // Only ever downwards. A photo already under the cap is left alone rather
    // than stretched into one.
    if (isMeasured && longEdge > MAX_EDGE) {
      // One edge only; the other follows from the ratio.
      context.resize(asset.width >= asset.height ? { width: MAX_EDGE } : { height: MAX_EDGE });
    }

    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: COMPRESS });

    return { uri: saved.uri, width: saved.width, height: saved.height };
  } catch (cause) {
    // A picked asset can be gone by now: iOS purges its cache, and an iCloud
    // original may never have been downloaded. The caller tells the user.
    console.warn(`Could not normalise ${asset.uri}:`, cause);
    return null;
  }
}
