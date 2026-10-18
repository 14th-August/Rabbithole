/**
 * Reading the category tree.
 *
 * Two queries against `categories`: the whole tree, and top-level only.
 * Categories are seeded and administered, never user-generated — the table has a
 * SELECT policy and no write policies, so there is nothing to write here.
 * Flattening or grouping for a picker is view logic and belongs in the component.
 *
 * Returns: both functions return `AsyncResult<Category[]>`, empty array when
 * there are no rows.
 */

import type { Db } from "@/lib/supabase";
import type { AsyncResult } from "@/lib/hooks";
import type { Category } from "@/types";

import { fail, ok, toMessage } from "./errors";

/**
 * Every category, sorted by `position` then `name`.
 *
 * The tree is only two levels — enforced by a trigger, since a CHECK cannot run
 * the subquery that asks whether a parent has a parent — so callers can group by
 * `parent_category_id` without recursing.
 *
 * Returns every row, ordered for display.
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
 * A real query rather than a client-side filter of {@link getCategories} because
 * `design-rules.md` makes category selection primary navigation.
 *
 * Returns the rows with no `parent_category_id`.
 */
export async function getTopLevelCategories(db: Db): Promise<AsyncResult<Category[]>> {
  const { data, error } = await db
    .from("categories")
    .select("*")
    .is("parent_category_id", null)
    .order("position", { ascending: true });

  if (error) return fail(toMessage(error));
  return ok(data ?? []);
}
