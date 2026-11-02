/*
 * Date: 2026-10-30
 * Profile -- the /profile screen: who you are, and the way out.
 * Not a tab; the root layout declares it beside (tabs), since the control that
 * opens it floats over the bar.
*/

import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { signOut, useSession } from "@/lib/verification";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/hooks";

/** One labelled profile value. */
interface RowProps {
  label: string;
  /** Already formatted. `null` renders the em-dash placeholder instead. */
  value: string | null;
}

/*
* Def: Row
* Desc: One label-and-value line in the card. Local to this screen -- two styled
* Text elements used in one place. It moves to src/components the second another
* screen needs it, and not before.
* Return: the row, with an em-dash when the value is null. A missing field is a
* fact about the account, not a loading state.
*/
function Row({ label, value }: RowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value ?? "—"}</Text>
    </View>
  );
}

/*
* Def: Home
* Desc: Reads useSession() rather than querying -- SessionProvider already holds
* the profile row, so a second read would be the same data a frame later.
* Signing out is signOut in verification/auth.ts.
* Return: the profile screen.
*/
export default function Home() {
  const { session, profile, isVerified } = useSession();

  const submit = useAsync(() => signOut(supabase));
  const [hasConfirmed, setHasConfirmed] = useState(false);

  /*
  * Def: handlePress
  * Desc: Signs out, in two taps. One is too easy to hit by accident on a screen
  * whose only other content is read-only, and there is no undo.
  * Return: nothing; the first tap arms, the second runs.
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

  /* `profile` is MyProfile | null -- null for a moment after launch while the
     row loads, and for the window between signup and confirmation. The email
     lives on the auth user, not the profile row, so it always exists and is the
     honest fallback rather than a spinner over the whole screen.
     Showing it is safe only because this is the user's OWN screen; there is no
     email column on `profiles` at all, so it cannot reach anyone else's. */
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

/*
* Def: formatDate
* Desc: Renders an ISO 8601 timestamp as a short date. Timestamps are stored and
* passed as strings, never Date, so parsing happens here at render. Still local
* because lib/utils/format.ts has only the RELATIVE form, which is wrong for a
* join date -- "Joined 300d" is worse than "Joined Oct 18, 2026".
* Return: something like "Oct 18, 2026".
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
    // Primary text.
    color: "#12161D",
  },
  email: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "400",
    // Secondary text, a step down from the name above it.
    color: "#4C5566",
    marginTop: 4,
  },
  card: {
    marginTop: 32,
    paddingHorizontal: 16,
    paddingVertical: 4,
    // A white card on the app's grey page background.
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    // Hairline. Just enough to separate the card from the page behind it.
    borderColor: "#E2E6ED",
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
    // Tertiary text - the label is the quieter half of the row.
    color: "#6B7688",
  },
  rowValue: {
    // Takes the slack so a long value wraps instead of pushing the label out.
    flex: 1,
    textAlign: "right",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "400",
    // Primary text - the value is what the row is for.
    color: "#12161D",
  },
  error: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    // Error red, matching the inline field errors elsewhere in the app.
    color: "#DC2626",
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
    // Error red. Signing out is destructive and has no undo, which is why this
    // is not the brand blue every other action wears.
    color: "#DC2626",
  },
});
