/** 
 * Date: 2026-10-27
 * Shell shared by every authentication route.
 * Shared for all auth routes for consistent layouts
 * Used for sign-in, sign-up, and OTP verification.
**/

/** Import Dependencies
 * Ionicons - Icon Components for usable UI, used in back button
 * Stack - Navigation stack for routing between auth screens
 * useRouter - Hook for navigation, same as web useRouter hook but for mobile
 * useSegments - Hook for getting the current route segments, used for determining if the back button should be shown
 * KeyboardAvoidingView - Component to adjust the view when the keyboard is open, used for forms
 * Platform - Used to determine the platform (iOS or Android) for conditional styling
 * Pressable - Component for creating pressable elements, used for creating the back button
 * StyleSheet - Used for creating CSS styles in React Native
 * View - Basic container component in React Native
 * useSafeAreaInsets - Hook to get safe area insets, used for padding around notches and status bars
**/

import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useRouter, useSegments } from "expo-router";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** 
 * tapArea — its glyph is smaller than its 44pt box.
 * 44pt is the recommended for touch targets, it's the area
 * a user clicks for the back button.
 */
const tapArea = { top: 8, bottom: 8, left: 8, right: 8 };

/**
 * Default screen for auth flow. No backbutton on this screen, as it is the landing page for signed-out users.
 * First screen a user sees when they are not signed in.
 * unstable_settings sets the default screen for the auth flow.
 * Sets sign in to be at bottom of the stack, so that when a user signs out, they are taken to the sign in screen.
 */
const defaultScreen = "sign-in";
export const unstable_settings = { anchor: defaultScreen };


/*
* Def: AuthLayout
* Desc: Wraps every auth route in one shell: the keyboard avoider, the shared
* padding, and the back button that only appears off the default screen.
* animation is "none" because these three screens are the same layout with
* different fields, so sliding between them reads as lag rather than motion.
* Return: the auth Stack inside its shared chrome.
*/
export default function AuthLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  /* Backbutton functionality by using useRouter to go to previous page
   * Wont render when at bottom of the stack or sign-in screen
  */
  function handleDismiss() {
    router.back();
  }

  /* useSegments in auth will return an array of the current route segments 
  example: ["(auth)" "sign-up"] Therefore, if we see that length is 2 so
  we get the last segment by checking for last element in the array
  If the last element is not the default screen, we can dismiss and render the back button. */
  const segmentsArray = useSegments();
  const canDismiss = segmentsArray[segmentsArray.length - 1] !== defaultScreen;
  const topSpacing = { marginTop: insets.top + 8 };

  return (
    /* We wrap around a KeyboardAvoidingView to ensure that the keyboard does not cover the form when it is open.
       Handles differently depending on OS, as iOS pushes content up, while Android resizes the window itself. */
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        {canDismiss ? (
          //Ternary for checking dismiss back button.
          <Pressable
            onPress={handleDismiss}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={tapArea}
            style={[styles.dismiss, topSpacing]}
          >
            <Ionicons name="chevron-back" size={24} color={styles.dismissIcon.color} />
          </Pressable>
        ) : (
          // If we cannot dismiss, we render a placeholder to keep the layout consistent.
          <View style={[styles.dismissPlaceholder, topSpacing]} />
        )}

        {/*
          Stack is the navigation stack for the auth flow shell.
          headerShown disables title bar, animation disables the transition animation between screens, 
          gestureEnabled disables swipe back left, freezeOnBlur freezes the screen when it is not active, 
          contentStyle sets the background color of the stack to white.
        */}
        
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "none",
            gestureEnabled: false,
            freezeOnBlur: true,
            contentStyle: styles.content,
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    backgroundColor: "#FFFFFF",
  },
  dismiss: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    width: 44,
    height: 44,
  },
  dismissPlaceholder: {
    height: 44,
  },
  dismissIcon: {
    color: "#12161D",
  },
});
