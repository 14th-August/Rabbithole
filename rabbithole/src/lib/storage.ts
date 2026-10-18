/**
 * Supabase Storage paths and URLs.
 *
 * Turns a stored `storage_path` into something an `<Image>` can load, and builds
 * the paths uploads must use. Uploading itself belongs with the mutation that
 * creates the row, in `src/lib/queries`. Columns store object paths, never URLs:
 * a URL pins the row to a project ref and CDN host, so restoring a backup into a
 * new project would break every image. The path survives; the URL is derived.
 *
 * Returns: `publicUrl` returns a loadable URL or `null`. The two path builders
 * return the string an upload must use.
 */

import { supabase } from "./supabase";

/** The buckets this app writes to. */
export const BUCKETS = {
  listingImages: "listing-images",
  avatars: "avatars",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

/**
 * Resolves a stored object path to a loadable URL.
 *
 * Both buckets are public-read, so this is a plain URL with no expiry and no
 * round trip — which matters when a feed renders a dozen at once.
 *
 * Returns `null` when the path is null, so callers fall through to the
 * `surfaceSunken` placeholder rather than rendering a broken image. Listings
 * with no photos are common, not an error.
 *
 * @param path A `storage_path` or `avatar_path` value, or `null`.
 */
export function publicUrl(bucket: BucketName, path: string | null): string | null {
  if (!path) return null;

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Builds the object path for a listing photo.
 *
 * The owner's uuid must be the first segment: storage policies match
 * `(storage.foldername(name))[1]` against `auth.uid()`, so any other layout is
 * rejected at write time rather than at review time.
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
