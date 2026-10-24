/**
 * Minting tags and attaching them to a listing.
 *
 * Tags are the one piece of taxonomy users create: `categories` is administered
 * and read-only to clients, `tags` has an INSERT policy. A tag is "biol121"; a
 * category is "Textbooks". Names arrive already normalised — see `normalizeTag`
 * in `src/lib/utils`, which mirrors the CHECK this table enforces.
 *
 * Returns: `AsyncResult<null>`. An empty list is `ok(null)` with no round trip.
 */

import type { Db } from "@/lib/supabase";
import type { AsyncResult } from "@/lib/hooks";

import { fail, ok, toMessage } from "./errors";

/**
 * Creates any tags that do not exist yet and links them all to a listing.
 *
 * Three statements, and the shape of the first is the interesting part. An
 * `upsert` with `ignoreDuplicates` sends `ON CONFLICT DO NOTHING`, which stays
 * an INSERT — the ordinary upsert would fall back to an UPDATE on conflict, and
 * `tags` has **no UPDATE policy**, so a tag someone else minted would make the
 * whole write fail with 42501. Nobody renames a shared tag, which is why that
 * policy does not exist, and why this cannot be one statement.
 *
 * Reading the ids back is a second query rather than the upsert's return value,
 * because `DO NOTHING` returns only the rows it actually inserted — the tags
 * that already existed, which is most of them, come back empty.
 *
 * Returns `ok(null)` once the links are written.
 *
 * @param names Normalised, de-duplicated tag names. `[]` costs no round trip.
 */
export async function attachTags(
  db: Db,
  listingId: string,
  names: readonly string[],
): Promise<AsyncResult<null>> {
  if (names.length === 0) return ok(null);

  const { error: mintError } = await db
    .from("tags")
    .upsert(
      names.map((name) => ({ name })),
      { onConflict: "name", ignoreDuplicates: true },
    );

  if (mintError) return fail(toMessage(mintError));

  // `citext`, so this matches regardless of case. The names are lowercased
  // before they get here anyway — the CHECK on the column demands it.
  const { data, error: readError } = await db.from("tags").select("id").in("name", names);

  if (readError) return fail(toMessage(readError));

  const rows = (data ?? []).map((tag) => ({ listing_id: listingId, tag_id: tag.id }));
  if (rows.length === 0) return ok(null);

  const { error: linkError } = await db.from("listing_tags").insert(rows);

  if (linkError) return fail(toMessage(linkError));
  return ok(null);
}
