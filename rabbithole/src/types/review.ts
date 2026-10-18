/**
 * Review types — the trust layer.
 *
 * The shape of a review left after a completed trade. Rating aggregation is not
 * here: `profiles.rating_avg` is maintained by a database trigger, not by client
 * code summing an array. Reviews hang off an ORDER, not a listing or a user
 * pair, which is what makes the trust layer mean something — selling two
 * textbooks is two orders and so two reviewable events.
 *
 * Returns: types only. No behaviour lives in `src/types`.
 */

export interface Review {
  id: string;

  /**
   * The completed order being reviewed. One review per reviewer per order, so a
   * finished trade yields at most two.
   *
   * `enforce_review_eligibility` rejects an insert whose order is not
   * `completed`, or whose reviewer and reviewee are not its two parties. The UI
   * offers the control only when those hold; the trigger guarantees it.
   */
  order_id: string;

  reviewer_id: string;
  reviewee_id: string;

  /**
   * 1..5 inclusive.
   *
   * `number`, not `1 | 2 | 3 | 4 | 5`, even though the union reads nicer for
   * stars. The range is a CHECK constraint and PostgREST returns a plain number,
   * so a literal union would force a cast on every read and lie about the wire.
   */
  rating: number;

  /** Optional written note. A star-only review is valid. */
  body: string | null;

  created_at: string;
}
