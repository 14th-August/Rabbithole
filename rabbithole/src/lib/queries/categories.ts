/**
 * Reading the category tree.
 *
 * Owns: queries against `categories`.
 * Does not own: flattening or grouping the tree for a picker. That is view logic
 *   and belongs with the component that draws it.
 *
 * Categories are seeded and administered, never user-generated — the table has a
 * SELECT policy and no write policies at all, so there is nothing to write here.
 */

import type { Db } from "@/lib/supabase";
import type { AsyncResult } from "@/lib/useAsync";
import type { Category } from "@/types";

import { fail, ok, toMessage } from "./errors";

/**
 * Every category, ordered for display.
 *
 * Sorted by `position` then `name`. The tree is only two levels — enforced by a
 * trigger, because a CHECK constraint cannot run the subquery that asks whether a
 * parent itself has a parent — so callers can group by `parent_id` without
 * recursing.
 */
export async function getCategories(db: Db): Promise<AsyncResult<Category[]>> {
  const { data, error } = await db
    .from("categories")
    .select("*")
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  if (error) return fail(toMessage(error));
  return ok(data ?? []);
}

/**
 * Top-level categories only — what the Discover bar shows before any drill-down.
 *
 * `design-rules.md` makes category selection primary navigation rather than a
 * filter hidden behind a sheet, so this is a first-class query rather than a
 * client-side filter of {@link getCategories}.
 */
export async function getTopLevelCategories(db: Db): Promise<AsyncResult<Category[]>> {
  const { data, error } = await db
    .from("categories")
    .select("*")
    .is("parent_id", null)
    .order("position", { ascending: true });

  if (error) return fail(toMessage(error));
  return ok(data ?? []);
}
