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

/** Brand blue. The plus at rest, and the same value as the app icon and splash. */
const BRAND = "#0165F2";

/** The darkened brand blue a selected tab wears — the plus included. */
const BRAND_SELECTED = "#023b8b";

/** The pill's own surface, against the app's grey page. */
const SURFACE = "#FFFFFF";

/** On brand: the plus glyph, against its blue fill. */
const ON_BRAND = "#FFFFFF";

/** Primary text. The labels, the profile glyph, and the pill's shadow. */
const TEXT_PRIMARY = "#12161D";

/** Tertiary text. The tabs you are not on. */
const TEXT_TERTIARY = "#6B7688";

/** Profile control hitSlop — its glyph is smaller than its 44pt box. */
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

/** Under React Navigation's 28, which crowded the narrowed pill. */
const ICON_SIZE = 26;

/**
 * Narrows what React Navigation hands a `tabBarIcon` to what `Ionicons` takes.
 *
 * An SDK 58 tax rather than a real case. React Native 0.88 tightened its types:
 * `ColorValue` now admits `null` and `number` (a pre-processed colour), neither
 * of which the icon prop accepts. Both tints below are stylesheet strings, so
 * this never actually discards anything — but it narrows honestly instead of
 * asserting a type the compiler was right to doubt.
 *
 * Returns the colour when it is a plain string, `undefined` otherwise.
 */
function iconColor(color: unknown): string | undefined {
  return typeof color === "string" ? color : undefined;
}

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
                color={iconColor(color)}
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
                color={iconColor(color)}
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
            // Takes `focused`, not `color`. The circle is its own fill rather
            // than a tinted glyph, so selection darkens the button itself.
            tabBarIcon: ({ focused }) => (
              <View style={[styles.plus, focused ? styles.plusFocused : null]}>
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
              <Ionicons name={focused ? "heart" : "heart-outline"} size={ICON_SIZE} color={iconColor(color)} />
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
                color={iconColor(color)}
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
    backgroundColor: SURFACE,
    // Both zeroed: a numeric height is taken verbatim, but the bar still adds
    // the safe-area inset as padding inside it and squashes the icons.
    paddingTop: 0,
    paddingBottom: 0,
    // On a pill the default hairline draws a chord across the curve.
    borderTopWidth: 0,
    // Grey and soft — a surface lifted off the page, not a light.
    shadowColor: TEXT_PRIMARY,
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
    color: TEXT_PRIMARY,
  },
  tabIcon: {
    // Read by `tabBarInactiveTintColor`, not applied as a style.
    color: TEXT_TERTIARY,
  },
  tabIconSelected: {
    // Read by `tabBarActiveTintColor`, not applied as a style.
    color: BRAND_SELECTED,
  },
  plus: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    height: 60,
    borderRadius: 999,
    // At rest; selection swaps this below.
    backgroundColor: BRAND,
    // Rides proud of the bar; the bar does not clip its items.
    marginTop: -6,
    // A glow in its own blue — the button lit, not held above a surface.
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    // Android has no shadowColor, so this is the whole effect there.
    elevation: 7,
  },
  plusFocused: {
    // Darkens like every other tab, only a fill rather than a glyph.
    backgroundColor: BRAND_SELECTED,
    // The glow follows the fill, or the halo outshines the button.
    shadowColor: BRAND_SELECTED,
  },
  plusGlyph: {
    // Read by the `Ionicons` `color` prop, not applied as a style.
    color: ON_BRAND,
  },
  profile: {
    position: "absolute",
    // The same 16pt gutter the auth screens use.
    right: 16,
    alignItems: "center",
    justifyContent: "center",
    // An accessibility floor, not a preference.
    width: 44,
    height: 44,
  },
  profileIcon: {
    // Read by the `Ionicons` `color` prop, not applied as a style.
    color: TEXT_PRIMARY,
  },
});
