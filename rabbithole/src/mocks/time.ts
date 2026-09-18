/**
 * Relative timestamp helpers for fixtures.
 *
 * Owns: producing ISO strings at a known offset from "now".
 * Does not own: formatting timestamps for display. That is a `src/lib/` concern
 *   and should never import this file.
 *
 * `NOW` is captured once at module load rather than read per call, so every
 * fixture in a single run agrees on what "now" was. Without that, two listings
 * created in the same render can disagree by milliseconds and sort unstably.
 *
 * Offsets are relative rather than hardcoded dates so "posted 2h ago" keeps
 * reading correctly no matter when the app is opened. The trade-off is that
 * fixtures are not deterministic across runs — when snapshot tests arrive, pin
 * `NOW` to a fixed epoch and they become so.
 */

const NOW = Date.now();

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function minutesAgo(n: number): string {
  return new Date(NOW - n * MINUTE).toISOString();
}

export function hoursAgo(n: number): string {
  return new Date(NOW - n * HOUR).toISOString();
}

export function daysAgo(n: number): string {
  return new Date(NOW - n * DAY).toISOString();
}
