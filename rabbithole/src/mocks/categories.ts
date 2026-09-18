/**
 * Category fixtures.
 *
 * Owns: a small but real category tree — two levels, because textbooks need
 *   subject subdivisions and nothing else does.
 * Does not own: category selection logic or tree flattening helpers.
 *
 * The shape here is the interesting part: `parent_id` self-reference means the
 * Create screen's category picker is a two-step drill-down, not a flat list. Worth
 * knowing before that screen is designed rather than after.
 */

import type { Category } from "@/types";

export const mockCategories: Category[] = [
  // Top level
  { id: "10000000-0000-4000-8000-000000000001", parent_id: null, slug: "textbooks", name: "Textbooks" },
  { id: "10000000-0000-4000-8000-000000000002", parent_id: null, slug: "electronics", name: "Electronics" },
  { id: "10000000-0000-4000-8000-000000000003", parent_id: null, slug: "furniture", name: "Furniture" },
  { id: "10000000-0000-4000-8000-000000000004", parent_id: null, slug: "transport", name: "Transport" },
  { id: "10000000-0000-4000-8000-000000000005", parent_id: null, slug: "supplies", name: "Course Supplies" },

  // Textbook subjects
  {
    id: "10000000-0000-4000-8000-000000000011",
    parent_id: "10000000-0000-4000-8000-000000000001",
    slug: "biology",
    name: "Biology",
  },
  {
    id: "10000000-0000-4000-8000-000000000012",
    parent_id: "10000000-0000-4000-8000-000000000001",
    slug: "mathematics",
    name: "Mathematics",
  },
  {
    id: "10000000-0000-4000-8000-000000000013",
    parent_id: "10000000-0000-4000-8000-000000000001",
    slug: "chemistry",
    name: "Chemistry",
  },
  {
    id: "10000000-0000-4000-8000-000000000014",
    parent_id: "10000000-0000-4000-8000-000000000001",
    slug: "nursing",
    name: "Nursing",
  },
  {
    id: "10000000-0000-4000-8000-000000000015",
    parent_id: "10000000-0000-4000-8000-000000000001",
    slug: "psychology",
    name: "Psychology",
  },
];

/** Lookup by id. Fixtures reference categories often enough to justify the map. */
export const mockCategoriesById: Record<string, Category> = Object.fromEntries(
  mockCategories.map((category) => [category.id, category]),
);

/** Top-level categories only — what the Discover filter bar shows first. */
export const mockTopLevelCategories: Category[] = mockCategories.filter(
  (category) => category.parent_id === null,
);
