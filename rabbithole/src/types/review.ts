/**
 * Review types — the trust layer.
 *
 * Owns: the shape of a review left after a completed trade.
 * Does not own: rating aggregation. `profiles.rating_avg` is maintained by a
 *   database trigger, not by client code summing this array.
 *
 * Reviews hang off an **order**, not a listing and not a user pair. That is what
 * makes the trust layer mean something: a review requires a transaction both
 * parties confirmed, rather than a conversation about a listing someone later
 * marked sold. Selling Maya two textbooks is two orders and so two reviewable
 * events, rather than one overwritten opinion.
 */

export interface Review {
  id: string;

  /**
   * The completed order being reviewed. One review per reviewer per order, so a
   * finished trade yields at most two — one from each side.
   *
   * `enforce_review_eligibility` rejects an insert whose order is not
   * `completed`, or whose reviewer and reviewee are not its two parties. The
   * UI's job is to offer the control only when those hold; the trigger is what
   * guarantees it.
   */
  order_id: string;

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
