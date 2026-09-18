/**
 * Profile fixtures, including the stand-in signed-in user.
 *
 * Owns: a cast of sellers chosen to cover the trust-signal edge cases.
 * Does not own: session state. `mockCurrentUser` is data, not auth — when auth
 *   lands it gets read through a `useCurrentUser()` hook and this export is the
 *   thing that hook stops returning.
 *
 * Deliberate spread: a high-reputation seller, a moderate one, a brand-new seller
 * with NO reviews, and a seller with exactly one. The null-rating case is the one
 * that breaks naive UI — `rating_avg` of `null` must render "New seller", never
 * "0.0 ★", and there is no way to catch that without a fixture that has it.
 */

import type { Profile, ProfilePreview } from "@/types";

import { daysAgo } from "./time";

export const mockProfiles: Profile[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    display_name: "Maya Chen",
    avatar_path: "avatars/maya-chen.jpg",
    viu_verified_at: daysAgo(420),
    rating_avg: 4.8,
    rating_count: 12,
    created_at: daysAgo(430),
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    display_name: "Devon Okafor",
    avatar_path: "avatars/devon-okafor.jpg",
    viu_verified_at: daysAgo(210),
    rating_avg: 4.5,
    rating_count: 3,
    created_at: daysAgo(215),
  },
  {
    // New seller: no reviews at all, and no avatar. Two fallbacks in one row.
    id: "00000000-0000-4000-8000-000000000003",
    display_name: "Priya Raman",
    avatar_path: null,
    viu_verified_at: daysAgo(4),
    rating_avg: null,
    rating_count: 0,
    created_at: daysAgo(4),
  },
  {
    // A perfect score from a single review — "5.0 ★" is technically true and
    // materially misleading. The card should surface the count alongside it.
    id: "00000000-0000-4000-8000-000000000004",
    display_name: "Sam Whitmore",
    avatar_path: "avatars/sam-whitmore.jpg",
    viu_verified_at: daysAgo(60),
    rating_avg: 5,
    rating_count: 1,
    created_at: daysAgo(62),
  },
  {
    // The signed-in user.
    id: "00000000-0000-4000-8000-000000000005",
    display_name: "Alex Reid",
    avatar_path: "avatars/alex-reid.jpg",
    viu_verified_at: daysAgo(300),
    rating_avg: 4.9,
    rating_count: 7,
    created_at: daysAgo(305),
  },
];

export const mockProfilesById: Record<string, Profile> = Object.fromEntries(
  mockProfiles.map((profile) => [profile.id, profile]),
);

/**
 * The stand-in signed-in user.
 *
 * Every screen that needs "me" should read it through a single accessor so the
 * swap to a real session is one edit. Do not import this directly into screens
 * once `useCurrentUser()` exists.
 */
export const mockCurrentUser: Profile = mockProfiles[4]!;

/** Narrow a full profile to the slice cards and rows actually render. */
export function toProfilePreview(profile: Profile): ProfilePreview {
  return {
    id: profile.id,
    display_name: profile.display_name,
    avatar_path: profile.avatar_path,
    rating_avg: profile.rating_avg,
    rating_count: profile.rating_count,
  };
}
