/**
 * Review types — the trust layer.
 *
 * Owns: the shape of a review left after a completed trade.
 * Does not own: rating aggregation. `profiles.rating_avg` is maintained by a
 *   database trigger, not by client code summing this array.
 *
 * Reviews hang off a listing rather than off a user pair, so "I sold Maya two
 * textbooks" yields two reviewable events rather than one overwritten opinion.
 */

export interface Review {
  id: string;
  /** The trade being reviewed. One review per reviewer per listing. */
  listing_id: string;
  reviewer_id: string;
  reviewee_id: string;

  /**
   * 1..5 inclusive.
   *
   * Typed as `number`, not `1 | 2 | 3 | 4 | 5`, even though the union would be
   * nicer for star rendering. The range is enforced by a CHECK constraint in the
   * database, and PostgREST returns a plain number — a literal union here would
   * force a cast on every read and quietly lie about what the wire actually
   * carries. Types mirror the source of truth; the source of truth is the column.
   */
  rating: number;

  /** Optional written note. A star-only review is valid. */
  body: string | null;

  created_at: string;
}
