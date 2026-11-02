/*
 * Date: 2026-10-30
 * The app shell: mounts session state and guards the two halves of the routes.
 * Every screen in src/app renders inside this.
*/

import { Stack } from "expo-router";
import { StyleSheet } from "react-native";

import { BootScreen } from "@/components/BootScreen";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";
import { SessionProvider, useSession } from "@/lib/verification";

/*
* Def: RootLayout
* Desc: Mounts session state once for the whole app. Nothing else in src/app
* may navigate on sign-in or sign-out -- changing the session flips the guards
* below and the router swaps groups itself, so a manual router.replace races it.
* Return: the session provider wrapping the root navigator.
*/
export default function RootLayout() {
  return (
    <SessionProvider>
      <RootNavigator />
    </SessionProvider>
  );
}

/*
* Def: RootNavigator
* Desc: Chooses which half of the route tree is reachable. Split out from
* RootLayout because useSession has to run INSIDE the provider, and a component
* cannot consume a context it renders itself.
* Return: the root Stack, plus the welcome overlay when signed in.
*/
function RootNavigator() {
  /* useSession returns { session, profile, isLoading, isVerified }.
     `session` is the raw Supabase session or null; `profile` is the matching
     profiles row and can be null even when session is set, because it loads
     separately. Only `isLoading` says whether the stored token has been read
     off disk yet. */
  const { session, profile, isLoading } = useSession();

  // That read is asynchronous, so rendering the navigator first would show the
  // sign-in screen for a frame and then yank a signed-in user out of it.
  if (isLoading) {
    return <BootScreen />;
  }

  const isSignedIn = session !== null;

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          // Signing in or out swaps a whole route group. Sliding an entire app
          // section in looks like a stall, so the new group is simply there.
          animation: "none",
          contentStyle: styles.content,
        }}
      >
        <Stack.Protected guard={!isSignedIn} redirectTo="/">
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={isSignedIn} redirectTo="/sign-in">
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="profile" />
        </Stack.Protected>
      </Stack>

      {isSignedIn ? (
        <WelcomeOverlay userId={session.user.id} name={profile?.username ?? "there"} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: "#F7F8FA",
  },
});
