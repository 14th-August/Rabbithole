/*
 * Date: 2026-10-30
 * Constrains the listing-images bucket to JPEG under 2 MiB.
 * Backstop for src/lib/images.ts, which does the re-encode.
*/

-- Both columns were null, so the bucket accepted anything. Four objects were
-- stored before that was caught: three HEIC and one PNG, all named .jpg, all
-- undecodable in React Native on Android and web. Nothing errored, because
-- every layer faithfully preserved and correctly labelled the wrong format.
-- 1600px at compress 0.8 lands around 200-600 KB, so 2 MiB is headroom.
update storage.buckets
   set allowed_mime_types = array['image/jpeg'],
       file_size_limit    = 2097152   -- 2 MiB
 where id = 'listing-images';

-- The avatars bucket is deliberately left permissive: there is no avatar upload
-- function yet (queries/profiles.ts has only the avatar_path column), so a
-- constraint here would be guessing at a shape that does not exist. Add it with
-- the uploader, when the format is a decision rather than a prediction.
