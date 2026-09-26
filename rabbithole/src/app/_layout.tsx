/**
 * The app shell.
 *
 * Owns: mounting session state, and deciding which half of the route tree is
 *   reachable — the auth flow or the tabs.
 * Does not own: what either half renders. `(auth)/_layout.tsx` and
 *   `(tabs)/_layout.tsx` arrange their own directories.
 *
 * This is the file `auth.ts` refers to when it says screens do not navigate after
 * signing in or out. Changing the session flips the guards below, and the router
 * swaps route groups on its own; a manual `router.replace` would race that.
 */

import { Stack } from "expo-router";

import { BootScreen } from "@/components/BootScreen";
import { SessionProvider, useSession } from "@/lib/session";
import { ThemeProvider, useTheme } from "@/theme";

/**
 * Mounts session state and the colour scheme once, for the whole app.
 *
 * The app is pinned to **light** for now: a static white page everywhere,
 * regardless of the device's appearance setting. This is a temporary product
 * decision, not the loss of dark mode — every dark token still exists and every
 * component still resolves through `useTheme()`, so re-enabling it is deleting
 * the `scheme` prop below and nothing else.
 *
 * `userInterfaceStyle` in app.json is set to "light" to match. Without that the
 * OS keeps handing the app dark keyboards, share sheets, and alerts on a phone
 * in dark mode, which looks broken next to a white page.
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
  const { session, isLoading } = useSession();
  const { colors } = useTheme();

  // The persisted session is read asynchronously, so rendering the navigator
  // before it resolves would show the sign-in screen for a frame and then yank
  // an already-signed-in user out of it.
  if (isLoading) {
    return <BootScreen />;
  }

  const isSignedIn = session !== null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Explicit, because React Navigation's default theme paints #F2F2F2 in
        // light and near-black in dark — neither of which is one of our tokens.
        // Any region a screen does not cover itself falls through to this, and a
        // mismatched fallback reads as a border around the app.
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/*
        Declared first on purpose. SDK 57 has no `redirectTo` on Stack.Protected
        — that landed in SDK 58 — so a failed guard falls back to the *first
        available screen*. Listing `(auth)` ahead of `(tabs)` is therefore what
        makes sign-in the screen an unauthenticated user lands on, and
        `(auth)/_layout.tsx` names `sign-in` as the anchor within the group.
      */}
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}
