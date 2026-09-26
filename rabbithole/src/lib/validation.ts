/**
 * Form checks that run before a request is worth making.
 *
 * Owns: deciding whether what someone typed is worth sending.
 * Does not own: enforcing any of it. Every rule here is also enforced server
 *   side — the campus domain by the `before_user_created` auth hook, the
 *   password by GoTrue. This layer exists so a typo costs a round trip instead
 *   of a wait, and it is a keyboard convenience, never a gate.
 *
 * `docs/backend/auth-flow.md` names this "Layer 1 — the client regex" and is
 * blunt about the limit: anyone can curl the Auth REST endpoint and skip the app
 * entirely. Nothing here may be the only thing standing between a bad value and
 * the database.
 */

/**
 * Whether a string is shaped like an email address.
 *
 * Deliberately permissive: something, an `@`, something, a dot, something. The
 * full RFC 5322 grammar is famously not expressible as a readable regex, and
 * every attempt to approximate it rejects addresses that genuinely work —
 * plus-tags, apostrophes, new TLDs. Being strict here fails real students to
 * catch hypothetical ones.
 *
 * What it does catch is the mistake that actually happens: no `@` at all,
 * nothing before it, nothing after it, or a domain with no dot.
 */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * The domain Rabbithole accepts.
 *
 * Note the dot: `my.viu.ca` is a **subdomain**. `@viu.ca` is the employee
 * domain and is deliberately excluded — this is a student marketplace. The same
 * distinction is made in the auth hook migration, and getting it wrong does not
 * fail loudly; it produces an app no real student can register for.
 */
const CAMPUS_EMAIL = /@my\.viu\.ca$/i;

/**
 * Whether an address belongs to a student.
 *
 * Only worth calling once {@link isValidEmail} passes — on its own it would
 * accept `@my.viu.ca` with nothing in front of it.
 */
export function isCampusEmail(value: string): boolean {
  return CAMPUS_EMAIL.test(value.trim());
}
