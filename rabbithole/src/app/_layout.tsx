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

import { BootScreen } from "@/components/BootScreen";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";
import { SessionProvider, useSession } from "@/lib/verification";

/**
 * The page behind everything.
 *
 * Explicit because React Navigation's default theme paints #F2F2F2, which is
 * not this app's background. Any region a screen does not cover itself falls
 * through to this, and a mismatch reads as a border around the app.
 */
const BACKGROUND = "#F7F8FA";

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
          contentStyle: { backgroundColor: BACKGROUND },
        }}
      >
        {/*
          Declared first on purpose. SDK 57 has no `redirectTo` on
          Stack.Protected - that landed in SDK 58 - so a failed guard falls back
          to the *first available screen*. Listing `(auth)` ahead of `(app)` is
          therefore what makes sign-in the screen an unauthenticated user lands
          on, and `(auth)/_layout.tsx` names `sign-in` as the anchor.
        */}
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={isSignedIn}>
          <Stack.Screen name="(app)" />
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
