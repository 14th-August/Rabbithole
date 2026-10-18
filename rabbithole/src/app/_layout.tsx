/**
 * The app shell.
 *
 * Mounts session state and decides which half of the route tree is reachable —
 * the auth flow or the tabs. Each half arranges its own directory. This is the
 * file `auth.ts` means when it says screens do not navigate after signing in or
 * out: changing the session flips the guards below and the router swaps groups
 * on its own, so a manual `router.replace` would race it.
 *
 * Returns: the root `Stack`, wrapped in the theme and session providers.
 */

import { Stack } from "expo-router";

import { BootScreen } from "@/components/BootScreen";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";
import { SessionProvider, useSession } from "@/lib/verification";
import { ThemeProvider, useTheme } from "@/theme";

/**
 * Mounts session state and the colour scheme once, for the whole app.
 *
 * Pinned to LIGHT for now — a temporary product decision, not the loss of dark
 * mode: every dark token still exists and every component resolves through
 * `useTheme()`, so re-enabling it means deleting the `scheme` prop below.
 * `userInterfaceStyle` in app.json matches, or the OS hands the app dark
 * keyboards and alerts that look broken against a white page.
 *
 * Returns: the provider tree wrapping the root navigator.
 */
export default function RootLayout() {
  return (
    <ThemeProvider scheme="light">
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
    </ThemeProvider>
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
  const { colors } = useTheme();

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
          // Explicit, because React Navigation's default theme paints #F2F2F2 in
          // light and near-black in dark — neither of which is one of our
          // tokens. Any region a screen does not cover itself falls through to
          // this, and a mismatched fallback reads as a border around the app.
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/*
          Declared first on purpose. SDK 57 has no `redirectTo` on
          Stack.Protected — that landed in SDK 58 — so a failed guard falls back
          to the *first available screen*. Listing `(auth)` ahead of `(tabs)` is
          therefore what makes sign-in the screen an unauthenticated user lands
          on, and `(auth)/_layout.tsx` names `sign-in` as the anchor.
        */}
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={isSignedIn}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
      </Stack>

      {/*
        Sits over the navigator rather than inside it, so the tabs are already
        mounted and settled behind the greeting — it fades to a finished screen
        instead of to a loading one.

        Mounted unconditionally for anyone signed in. It decides for itself
        whether a welcome is owed, and renders nothing at all when it is not, so
        the condition lives in one place rather than being restated here.

        `username` is null for a moment while the profile loads. There is no
        metadata fallback any more: the trigger generates a random username and
        never reads signup metadata, because a VIU address is
        PreferredName.LastName and anything derived from it would publish a real
        name. "there" is the honest stand-in for that half-second.
      */}
      {isSignedIn ? (
        <WelcomeOverlay
          userId={session.user.id}
          name={profile?.username ?? "there"}
        />
      ) : null}
    </>
  );
}
