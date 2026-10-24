/**
 * Reading the meetup spots for a campus.
 *
 * One query against `meetup_spots`, the administered list of safe public places
 * to hand an item over. Curated rather than free text because the whole safety
 * value is in the place being somewhere other people are — the table has a
 * SELECT policy and no write policies, so there is nothing to write here.
 *
 * Returns: `AsyncResult<MeetupSpot[]>`, empty array when a campus has no spots.
 */

import type { Db } from "@/lib/supabase";
import type { AsyncResult } from "@/lib/hooks";
import type { Campus, MeetupSpot } from "@/types";

import { fail, ok, toMessage } from "./errors";

/**
 * The active spots on one campus, by name.
 *
 * Campus is a parameter rather than a client-side filter of every spot because
 * `validate_listing()` raises `foreign_key_violation` on a listing whose spot is
 * on another campus — so a picker that offers one is offering a failed submit.
 * Changing the Campus field has to re-run this, not just re-sort what it has.
 *
 * `is_active` is filtered for a different reason: retired spots keep their rows
 * because past orders still point at them, and the same trigger rejects them.
 *
 * Returns the spots, or `[]` for a campus nobody has added one for yet.
 */
export async function getMeetupSpots(
  db: Db,
  campus: Campus,
): Promise<AsyncResult<MeetupSpot[]>> {
  const { data, error } = await db
    .from("meetup_spots")
    .select("*")
    .eq("campus", campus)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) return fail(toMessage(error));
  return ok(data ?? []);
}
