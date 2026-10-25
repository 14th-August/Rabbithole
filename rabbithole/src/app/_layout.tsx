/**
 * The app shell.
 *
 * Mounts session state and decides which half of the route tree is reachable -
 * the auth flow or the signed-in app. Each half arranges its own directory. This
 * is the file `auth.ts` means when it says screens do not navigate after signing
 * in or out: changing the session flips the guards below and the router swaps
 * groups on its own, so a manual `router.replace` would race it.
 *
 * Returns: the root `Stack`, wrapped in the session provider.
 */

import { Stack } from "expo-router";
import { StyleSheet } from "react-native";

import { BootScreen } from "@/components/BootScreen";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";
import { SessionProvider, useSession } from "@/lib/verification";

/**
 * Mounts session state once, for the whole app.
 *
 * The app is light only - `userInterfaceStyle` is "light" in app.json, which is
 * what stops the OS handing it dark keyboards and alerts that would look broken
 * against a white page.
 *
 * Returns: the session provider wrapping the root navigator.
 */
export default function RootLayout() {
  return (
    <SessionProvider>
      <RootNavigator />
    </SessionProvider>
  );
}

/**
 * Chooses the reachable half of the route tree.
 *
 * Split out from {@link RootLayout} because `useSession` has to run *inside* the
 * provider, and a component cannot consume a context it renders itself.
 */
function RootNavigator() {
  const { session, profile, isLoading } = useSession();

  // The persisted session is read asynchronously, so rendering the navigator
  // before it resolves would show the sign-in screen for a frame and then yank
  // an already-signed-in user out of it.
  if (isLoading) {
    return <BootScreen />;
  }

  const isSignedIn = session !== null;

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          // Matches the auth stack: signing in or out swaps the whole route
          // group, and sliding an entire app section in looks like a stall. The
          // guard flips and the new group is simply there.
          animation: "none",
          contentStyle: styles.content,
        }}
      >
        {/*
          Each half names where a failed guard lands. `redirectTo` arrived in SDK
          58; before it, the fallback was the *first available screen*, which is
          why `(auth)` is still declared first. Inference was not enough: it
          resolves a screen that is merely present, and signing out from the
          pushed `profile` screen left `/profile` matching nothing at all, which
          is the unmatched-route screen rather than sign-in.
        */}
        <Stack.Protected guard={!isSignedIn} redirectTo="/">
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={isSignedIn} redirectTo="/sign-in">
          <Stack.Screen name="(tabs)" />

          {/*
            After `(tabs)`, for the same fallback reason: the first available
            screen is where a failed guard lands, and that has to be the tab bar
            rather than a pushed detail screen. It sits out here rather than
            inside `(tabs)` because it is not a tab - the control that opens it
            floats over the bar. `create` IS a tab, so it is not listed here.
          */}
          <Stack.Screen name="profile" />
        </Stack.Protected>
      </Stack>

      {/*
        Sits over the navigator rather than inside it, so the screen behind is
        already mounted and settled - it fades to a finished screen instead of
        to a loading one.

        Mounted unconditionally for anyone signed in. It decides for itself
        whether a welcome is owed and renders nothing when it is not, so the
        condition lives in one place rather than being restated here.

        `username` is null for a moment while the profile loads. There is no
        metadata fallback: the trigger generates a random username and never
        reads signup metadata, because a VIU address is PreferredName.LastName
        and anything derived from it would publish a real name. "there" is the
        honest stand-in for that half-second.
      */}
      {isSignedIn ? (
        <WelcomeOverlay userId={session.user.id} name={profile?.username ?? "there"} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    // The page behind everything, and explicit because React Navigation's
    // default theme paints #F2F2F2 instead. Any region a screen does not cover
    // falls through to this, and a mismatch reads as a border around the app.
    backgroundColor: "#F7F8FA",
  },
});
