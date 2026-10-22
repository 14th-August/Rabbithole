/**
 * The signed-in app's tab bar.
 *
 * Five tabs in a floating white pill, with Create as a raised blue circle in the
 * middle rather than an ordinary item. JS tabs, not `NativeTabs`: a native bar
 * draws its own shape and its own items, so neither the pill nor the circle
 * could have been more than a fake painted over it.
 *
 * Returns: the tab navigator, with the profile control floating over it.
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
// `expo-router` directly is the deprecated path in SDK 57.
import { Tabs } from "expo-router/js-tabs";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Profile control hitSlop — its glyph is smaller than its 44pt box. */
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

/** Under React Navigation's 28, which crowded the narrowed pill. */
const ICON_SIZE = 26;

/**
 * Arranges the five tabs and overlays the profile control.
 *
 * `index` is first because it is the leftmost tab and the screen the app opens
 * on; `create` is third because the circle has to be the middle of five.
 */
export default function TabLayout() {
  // The pill switches off the bar's own safe-area padding, so it is paid here.
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: styles.tabIconSelected.color,
          tabBarInactiveTintColor: styles.tabIcon.color,
          // An explicit colour in here beats the active tint, keeping labels black.
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: styles.tabBarItem,
          // Inline: a runtime inset, which a StyleSheet cannot hold.
          tabBarStyle: [styles.tabBar, { marginBottom: insets.bottom + 8 }],
        }}
      >
        {/* `focused` swaps outline for filled, so selection is never colour alone. */}
        <Tabs.Screen
          name="index"
          options={{
            title: "Discover",
            // A storefront, not a grid: the shop, not the layout.
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "storefront" : "storefront-outline"}
                size={ICON_SIZE}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="messages"
          options={{
            title: "Messages",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"}
                size={ICON_SIZE}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="create"
          options={{
            // Empty, not absent — a caption would crowd the two labels beside it.
            title: "",
            // The only name a screen reader has for this tab.
            tabBarAccessibilityLabel: "Post a listing",
            // Skips the centring nudge; this one is meant to ride high.
            tabBarItemStyle: styles.tabBarItemRaised,
            // Ignores `color`: an action, not a place, so never the active tint.
            tabBarIcon: () => (
              <View style={styles.plus}>
                <Ionicons name="add" size={24} color={styles.plusGlyph.color} />
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="saved"
          options={{
            title: "Saved",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "heart" : "heart-outline"} size={ICON_SIZE} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="uploads"
          options={{
            title: "Uploads",
            // A price tag, not an upload arrow: the listing, not the act.
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "pricetag" : "pricetag-outline"}
                size={ICON_SIZE}
                color={color}
              />
            ),
          }}
        />
      </Tabs>

      {/* Outside `Tabs`, which renders only its screens — a child here vanishes. */}
      <ProfileButton />
    </View>
  );
}

/**
 * The control that opens the profile screen.
 *
 * Local to this file because it has one caller. Headers are hidden, so there is
 * no header slot for it — hence an absolute overlay whose own box takes touches.
 */
function ProfileButton() {
  const router = useRouter();
  // Nothing else holds this clear of the notch: the root Stack hides its header.
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      onPress={() => router.push("/profile")}
      accessibilityRole="button"
      accessibilityLabel="Your profile"
      hitSlop={HIT_SLOP}
      // Inline: a runtime inset, which a StyleSheet cannot hold.
      style={[styles.profile, { top: insets.top + 8 }]}
    >
      <Ionicons name="person-circle-outline" size={28} color={styles.profileIcon.color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  tabBar: {
    // The pill the buttons and fields already wear.
    borderRadius: 999,
    // Not `left`/`right` — the base style sets `start`/`end`, which win.
    marginHorizontal: 24,
    // Sets the icon spacing. Items are `flex: 1` inside this, so widening it
    // narrows every slot AND leaves bare pill at the ends. Capping item width
    // instead packs all five to one side; that row has no `justifyContent`.
    paddingHorizontal: 14,
    height: 64,
    backgroundColor: "#FFFFFF",
    // Both zeroed: a numeric height is taken verbatim, but the bar still adds
    // the safe-area inset as padding inside it and squashes the icons.
    paddingTop: 0,
    paddingBottom: 0,
    // On a pill the default hairline draws a chord across the curve.
    borderTopWidth: 0,
    // Grey and soft — a surface lifted off the page, not a light.
    shadowColor: "#12161D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  tabBarItem: {
    // Centres icon + label. React Navigation pins the column to the top and it
    // is 49pt tall (the UIKit bar height); half the 64pt pill's surplus evens it.
    paddingTop: 8,
  },
  tabBarItemRaised: {
    // The plus keeps the original top alignment.
    paddingTop: 0,
  },
  tabLabel: {
    // A point under React Navigation's default of 10.
    fontSize: 9,
    // Primary text, both states.
    color: "#12161D",
  },
  tabIcon: {
    // Tertiary text — the tabs you are not on. Read by `tabBarInactiveTintColor`.
    color: "#6B7688",
  },
  tabIconSelected: {
    // Brand blue, same literal as the plus, the Button fill, the icon and splash.
    color: "#0165F2",
  },
  plus: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    height: 60,
    borderRadius: 999,
    // Constant: an action, never the active tint.
    backgroundColor: "#0165F2",
    // Rides proud of the bar; the bar does not clip its items.
    marginTop: -6,
    // A glow in its own blue — the button lit, not held above a surface.
    shadowColor: "#0165F2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    // Android has no shadowColor, so this is the whole effect there.
    elevation: 7,
  },
  plusGlyph: {
    // Read by the `Ionicons` `color` prop, not applied as a style.
    color: "#FFFFFF",
  },
  profile: {
    position: "absolute",
    // The same 16pt gutter the auth screens use.
    left: 16,
    alignItems: "center",
    justifyContent: "center",
    // An accessibility floor, not a preference.
    width: 44,
    height: 44,
  },
  profileIcon: {
    // Read by the `Ionicons` `color` prop, not applied as a style.
    color: "#12161D",
  },
});
