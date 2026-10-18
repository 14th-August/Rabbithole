/**
 * Home screen — `/`.
 *
 * The whole signed-in app, for now: who you are, and a way out. This is the
 * deliberate floor the project was scaled back to — authentication works, and
 * everything is built back from here one feature at a time.
 *
 * Reads from `useSession()` rather than querying, because `SessionProvider`
 * already holds the profile. Signing out is `signOut` in `verification/auth.ts`.
 *
 * Returns: the signed-in home screen.
 */

import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { signOut, useSession } from "@/lib/verification";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/hooks";

const TEXT_PRIMARY = "#12161D";
const TEXT_SECONDARY = "#4C5566";
const TEXT_TERTIARY = "#6B7688";
const SURFACE = "#FFFFFF";
const BORDER = "#E2E6ED";
const DANGER = "#DC2626";

/** One labelled profile value. */
interface RowProps {
  label: string;
  /** Already formatted. `null` renders the em-dash placeholder instead. */
  value: string | null;
}

/**
 * A label-and-value row.
 *
 * Local to this screen: two styled `Text` elements used in one place. It moves
 * to `src/components` the second a different screen needs it, and not before.
 *
 * Returns the row, with an em-dash when the value is absent — a missing field is
 * a fact about the account, not a loading state.
 */
function Row({ label, value }: RowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value ?? "—"}</Text>
    </View>
  );
}

/** The signed-in home screen. */
export default function Home() {
  const { session, profile, isVerified } = useSession();

  const submit = useAsync(() => signOut(supabase));
  const [hasConfirmed, setHasConfirmed] = useState(false);

  /**
   * Signs out, in two taps. One is too easy to hit by accident on a screen whose
   * only other content is read-only, and there is no undo.
   */
  async function handlePress() {
    if (!hasConfirmed) {
      setHasConfirmed(true);
      return;
    }

    // No navigation afterwards, deliberately. Clearing the session fires
    // `onAuthStateChange`, which flips the root layout's guard and swaps route
    // groups; routing by hand here would race that swap.
    await submit.run();
  }

  // `profile` is null for a moment after launch while the row loads, and for the
  // window between signup and confirmation. The email always exists, so it is
  // the honest fallback rather than a spinner over the whole screen.
  //
  // Showing the email here is fine precisely because this is the signed-in
  // user's own screen. It must never reach another user's profile — which is why
  // there is no email column on `profiles` at all.
  const name = profile?.username ?? session?.user.email ?? "Signed in";

  // `rating_avg` is null until the first review, which is NOT a rating of zero.
  const rating =
    profile === null || profile.rating_avg === null
      ? "New seller"
      : `${profile.rating_avg.toFixed(1)} (${profile.rating_count})`;

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.email}>{session?.user.email}</Text>

      <View style={styles.card}>
        <Row label="Username" value={profile?.username ?? null} />
        <Row label="Campus" value={profile?.campus ?? null} />
        <Row label="Rating" value={rating} />
        <Row label="Completed sales" value={profile ? String(profile.completed_sales) : null} />
        <Row label="Email confirmed" value={isVerified ? "Yes" : "No"} />
        <Row
          label="VIU verified"
          value={profile?.viu_verified_at ? formatDate(profile.viu_verified_at) : null}
        />
        <Row label="Joined" value={profile ? formatDate(profile.created_at) : null} />
      </View>

      {submit.error !== null ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
          {submit.error}
        </Text>
      ) : null}

      <Pressable
        onPress={handlePress}
        disabled={submit.isPending}
        accessibilityRole="button"
        accessibilityLabel={hasConfirmed ? "Confirm sign out" : "Sign out"}
        accessibilityState={{ disabled: submit.isPending, busy: submit.isPending }}
        style={styles.signOut}
      >
        <Text style={styles.signOutLabel}>
          {submit.isPending ? "Signing out…" : hasConfirmed ? "Tap again to confirm" : "Sign out"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

/**
 * Renders an ISO 8601 timestamp as a short date.
 *
 * Timestamps are stored and passed as strings, never `Date`, so parsing happens
 * here at render. Local because it is the only formatting this screen needs —
 * the shared formatters went with the marketplace screens.
 *
 * Returns something like "Oct 18, 2026".
 */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  name: {
    textAlign: "center",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: TEXT_PRIMARY,
  },
  email: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "400",
    color: TEXT_SECONDARY,
    marginTop: 4,
  },
  card: {
    marginTop: 32,
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    paddingVertical: 12,
  },
  rowLabel: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "400",
    color: TEXT_TERTIARY,
  },
  rowValue: {
    // Takes the slack so a long value wraps instead of pushing the label out.
    flex: 1,
    textAlign: "right",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "400",
    color: TEXT_PRIMARY,
  },
  error: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    color: DANGER,
    marginTop: 16,
  },
  signOut: {
    alignItems: "center",
    justifyContent: "center",
    // An accessibility floor, not a style preference.
    minHeight: 44,
    marginTop: 24,
  },
  signOutLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
    color: DANGER,
  },
});
