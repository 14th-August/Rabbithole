/*
 * Date: 2026-10-30
 * Storage object paths, public URLs, and the listing-photo upload.
 * Used by createListing, and by the Discover feed for publicUrl.
*/

// Columns store object paths, never URLs: a URL pins the row to a project ref
// and CDN host, so restoring a backup into a new project breaks every image.

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

/*
* Def: ImageAsset
* Desc: One photo ready to upload -- the OUTPUT of normalizeToJpeg, not a raw
* picker asset. The bytes behind `uri` are guaranteed JPEG and the dimensions
* are post-resize. That guarantee is what lets the upload state a content type
* instead of guessing, so do not widen this to take a picked asset directly.
*/
export interface ImageAsset {
  /** A local `file://` URI. */
  uri: string;
  width: number;
  height: number;
}

/** One uploaded photo, shaped for a `listing_images` insert. */
export interface UploadedImage {
  storage_path: string;
  /** 0-based. Position 0 is the cover. */
  position: number;
  width: number;
  height: number;
}

/*
* Def: publicUrl
* Desc: Resolves a stored object path to a loadable URL. Both buckets are
* public-read, so this is a local string build with no expiry and no round trip
* -- which is what makes a feed of cards affordable.
* Return: the URL, or null when the path is null so callers can fall through to
* a placeholder. Photoless listings are common, not errors.
*/
export function publicUrl(db: Db, bucket: BucketName, path: string | null): string | null {
  if (!path) return null;

  return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/*
* Def: listingImagePath
* Desc: Builds the object path for a listing photo. The owner's uuid MUST be the
* first segment -- the storage policy matches (storage.foldername(name))[1]
* against auth.uid(), so any other layout is refused at write time.
* Return: <sellerId>/<listingId>/<position>.jpg, position 0 being the cover.
* The .jpg is accurate, not decorative: every photo is re-encoded before here.
*/
export function listingImagePath(
  sellerId: string,
  listingId: string,
  position: number,
): string {
  return `${sellerId}/${listingId}/${position}.jpg`;
}

/*
* Def: avatarPath
* Desc: Builds the object path for a user's avatar. One object per user,
* overwritten on change -- a stable path means the column rarely needs updating.
* Return: <userId>/avatar.jpg.
*/
export function avatarPath(userId: string): string {
  return `${userId}/avatar.jpg`;
}

/*
* Def: uploadListingImage
* Desc: Uploads one listing photo. `upsert` is on so retrying a half-finished
* publish overwrites rather than failing on a duplicate -- the path is
* deterministic, so a retry at the same position means the same photo.
* Position is 0-based and must be 0-7; a CHECK enforces it.
* Return: the path and the post-resize dimensions, which listing_images needs so
* a card can reserve the right box instead of reflowing when the image arrives.
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
    // Flat, not read off the asset: `normalizeToJpeg` has already re-encoded
    // the bytes, so the path, this header and the file all agree. The bucket
    // also rejects anything else, which is what keeps that true.
    contentType: "image/jpeg",
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
