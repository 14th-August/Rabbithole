/**
 * Supabase Storage: object paths, public URLs, and uploading a listing photo.
 *
 * Columns store object paths, never URLs — a URL pins the row to a project ref
 * and CDN host, so restoring a backup into a new project would break every
 * image. The path survives; the URL is derived. This is the one module in
 * `queries/` that needs the native bridge, because reading a picked file does.
 *
 * Returns: the path builders return strings. `publicUrl` returns a loadable URL
 * or `null`. `uploadListingImage` returns an `AsyncResult<UploadedImage>`.
 */

// `bytes()` is the whole reason this import exists. `fetch(uri).blob()` is the
// intuitive alternative and it uploads ZERO bytes from React Native — the
// request succeeds, the object is empty, and nothing reports a failure.
import { File as FsFile } from "expo-file-system";

import type { Db } from "@/lib/supabase";
import type { AsyncResult } from "@/lib/hooks";

import { fail, ok } from "./errors";

/** The buckets this app writes to. Both are public-read; writes are owner-only. */
export const BUCKETS = {
  listingImages: "listing-images",
  avatars: "avatars",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

/**
 * The fields of an `ImagePickerAsset` this module actually reads.
 *
 * Structural rather than an `expo-image-picker` import, so the query layer does
 * not take a dependency on the picker. An `ImagePickerAsset` satisfies it as-is.
 */
export interface ImageAsset {
  /** A local `file://` URI. */
  uri: string;
  width: number;
  height: number;
  /** `undefined` when the system could not determine it. */
  mimeType?: string;
}

/** One uploaded photo, shaped for a `listing_images` insert. */
export interface UploadedImage {
  storage_path: string;
  /** 0-based. Position 0 is the cover. */
  position: number;
  width: number;
  height: number;
}

/**
 * Resolves a stored object path to a loadable URL.
 *
 * Both buckets are public-read, so this is a local string build with no expiry
 * and no round trip — which is what makes a feed of cards affordable.
 *
 * Returns `null` when the path is null, so callers fall through to a placeholder
 * rather than rendering a broken image. Photoless listings are common, not errors.
 *
 * @param path A `storage_path` or `avatar_path` value, or `null`.
 */
export function publicUrl(db: Db, bucket: BucketName, path: string | null): string | null {
  if (!path) return null;

  return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Builds the object path for a listing photo.
 *
 * The owner's uuid must be the first segment: the storage policy matches
 * `(storage.foldername(name))[1]` against `auth.uid()`, so any other layout is
 * refused at write time rather than caught at review time.
 *
 * Returns `<sellerId>/<listingId>/<position>.jpg`.
 *
 * @param position 0-based. Position 0 is the cover image.
 */
export function listingImagePath(
  sellerId: string,
  listingId: string,
  position: number,
): string {
  return `${sellerId}/${listingId}/${position}.jpg`;
}

/**
 * Builds the object path for a user's avatar.
 *
 * One object per user, overwritten on change — no reason to keep old avatars,
 * and a stable path means the column rarely needs updating.
 *
 * Returns `<userId>/avatar.jpg`.
 */
export function avatarPath(userId: string): string {
  return `${userId}/avatar.jpg`;
}

/**
 * Uploads one listing photo and reports what the `listing_images` row needs.
 *
 * `upsert` is on so retrying a half-finished publish overwrites rather than
 * failing on a duplicate object — the path is deterministic, so a retry at the
 * same position means the same photo.
 *
 * Returns the path and the dimensions. The dimensions come from the picker
 * rather than the uploaded file: they are known before the bytes move, and
 * `listing_images.width/height` exist so a card can reserve the right box
 * instead of reflowing the grid when the image arrives.
 *
 * @param position 0-based, 0 is the cover. Must be 0-7 — a CHECK enforces it.
 */
export async function uploadListingImage(
  db: Db,
  sellerId: string,
  listingId: string,
  position: number,
  asset: ImageAsset,
): Promise<AsyncResult<UploadedImage>> {
  const path = listingImagePath(sellerId, listingId, position);

  let bytes: Uint8Array;
  try {
    bytes = await new FsFile(asset.uri).bytes();
  } catch (cause) {
    // Unlike supabase-js, the file API throws. A picked asset can be gone by
    // now: iOS purges the cropped-image cache, and an iCloud original may never
    // have been downloaded.
    console.warn(`Could not read ${asset.uri}:`, cause);
    return fail("We couldn't read that photo. Try picking it again.");
  }

  const { error } = await db.storage.from(BUCKETS.listingImages).upload(path, bytes, {
    // From the picker, not from the `.jpg` in the path. The extension is
    // cosmetic on a public bucket; this header is what governs serving.
    contentType: asset.mimeType ?? "image/jpeg",
    upsert: true,
  });

  if (error) {
    // A StorageError, not a PostgrestError — no `code` to map, so `toMessage`
    // would log an unmapped-code warning and return the generic line anyway.
    console.warn(`Upload failed for ${path}:`, error);
    return fail("That photo didn't upload. Check your connection and try again.");
  }

  return ok({
    storage_path: path,
    position,
    width: asset.width,
    height: asset.height,
  });
}
