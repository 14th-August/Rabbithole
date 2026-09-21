/**
 * Supabase Storage paths and URLs.
 *
 * Owns: turning a stored `storage_path` into something an `<Image>` can load,
 *   and building the paths uploads must use.
 * Does not own: uploading. That belongs with the mutation that creates the row,
 *   in `src/lib/queries/`.
 *
 * Columns store object *paths*, never URLs. A URL pins the row to a project ref
 * and a CDN hostname, so restoring a backup into a new project would break every
 * image in the database. The path survives that; the URL is derived at render.
 */

import { supabase } from "./supabase";

/** The buckets this app writes to. */
export const BUCKETS = {
  listingImages: "listing-images",
  avatars: "avatars",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

/**
 * Resolve a stored object path to a loadable URL.
 *
 * Both buckets are public-read, so this is a plain URL with no expiry to manage
 * and no round trip — which matters when a feed renders a dozen of them at once.
 *
 * @param path A `storage_path` or `avatar_path` value, or `null`.
 * @returns `null` when the path is null, so callers fall through to the
 *   `surfaceSunken` placeholder rather than rendering a broken image. Listings
 *   with no photos are a real and common case, not an error.
 */
export function publicUrl(bucket: BucketName, path: string | null): string | null {
  if (!path) return null;

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Build the object path for a listing photo.
 *
 * The owner's uuid **must** be the first segment: the storage policies match
 * `(storage.foldername(name))[1]` against `auth.uid()`, so any other layout is
 * rejected at write time rather than at review time.
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
 * Build the object path for a user's avatar.
 *
 * One object per user, overwritten on change — there is no reason to keep old
 * avatars, and a stable path means the column rarely needs updating.
 */
export function avatarPath(userId: string): string {
  return `${userId}/avatar.jpg`;
}
