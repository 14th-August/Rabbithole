/*
 * Date: 2026-10-30
 * The signed-in app's tab bar, plus the bell and profile glyphs floating over it.
 * Arranges every screen in src/app/(tabs).
*/

import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
// `expo-router` directly is the deprecated path in SDK 57.
import { Tabs } from "expo-router/js-tabs";
import { Alert, Pressable, StyleSheet, View } from "react-native";
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

/*
* Def: BELL_HIT_SLOP / PROFILE_HIT_SLOP
* Desc: The two header glyphs are smaller than their 44pt boxes, so both need
* slop. The boxes are flush, so neither may slop INWARD -- overlapping slop
* makes the boundary between them a render-order accident. Each reaches 8pt
* outward only.
*/
const BELL_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 0 };
const PROFILE_HIT_SLOP = { top: 8, bottom: 8, left: 0, right: 8 };

/** Under React Navigation's 28, which crowded the narrowed pill. */
const ICON_SIZE = 26;

/*
* Def: iconColor
* Desc: Narrows what React Navigation hands a tabBarIcon down to what Ionicons
* takes. RN 0.88 widened ColorValue to admit null and number (a pre-processed
* colour), neither of which the icon prop accepts. Both tints below are
* stylesheet strings, so nothing is ever actually discarded here.
* Return: the colour when it is a plain string, undefined otherwise.
*/
function iconColor(color: unknown): string | undefined {
  return typeof color === "string" ? color : undefined;
}

/*
* Def: TabLayout
* Desc: Arranges the five tabs and overlays the two header glyphs. Declaration
* order IS left-to-right order: index first because it is the leftmost tab and
* the screen the app opens on, create third because the raised circle has to be
* the middle of five. JS tabs, not NativeTabs -- a native bar draws its own
* shape and items, so the pill and the circle could only have been fakes
* painted over it.
* Return: the tab navigator, with the bell and profile control above it.
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
        {/* React Navigation calls tabBarIcon with { color, focused, size }.
            `color` is already resolved to the active or inactive tint set
            above, and `focused` is the boolean this swaps outline for filled
            on, so selection is never carried by colour alone. */}
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
      <NotificationsButton />
      <ProfileButton />
    </View>
  );
}

/*
* Def: NotificationsButton
* Desc: The bell, sitting immediately left of the profile glyph. Floats over
* every tab the same way, since notifications are not Discover-specific.
* Nothing is built behind it yet -- typedRoutes makes pushing to /notifications
* a compile error until that route exists, which is the guard keeping this
* honest. An Alert rather than no handler: a control that cannot be tapped
* still invites the tap that tells you so.
* Return: the absolutely-positioned bell.
*/
function NotificationsButton() {
  // Must match ProfileButton, create.tsx and index.tsx. All four put their top
  // edge on insets.top + 8; if one moves the title stops sharing a centre line.
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      onPress={() => Alert.alert("Notifications", "Notifications aren't turned on yet.")}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
      hitSlop={BELL_HIT_SLOP}
      // Inline: a runtime inset, which a StyleSheet cannot hold.
      style={[styles.bell, { top: insets.top + 8 }]}
    >
      <Ionicons name="notifications-outline" size={28} color={styles.headerGlyph.color} />
    </Pressable>
  );
}

/*
* Def: ProfileButton
* Desc: The control that opens the profile screen. headerShown is false app-wide,
* so there is no header slot to put it in -- hence an absolute overlay whose own
* 44pt box takes the touch. Local to this file; it has one caller.
* Return: the absolutely-positioned profile glyph.
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
      hitSlop={PROFILE_HIT_SLOP}
      // Inline: a runtime inset, which a StyleSheet cannot hold.
      style={[styles.profile, { top: insets.top + 8 }]}
    >
      <Ionicons name="person-circle-outline" size={28} color={styles.headerGlyph.color} />
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
  // Flush against the profile box, not gapped: a gutter between two touch
  // targets is a dead zone, and the 28pt glyphs already leave 16pt of air.
  bell: {
    position: "absolute",
    right: 60,
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
  },
  headerGlyph: {
    // Read by the `Ionicons` `color` prop, not applied as a style. Shared: the
    // bell and the profile glyph are the same thing in two positions.
    color: TEXT_PRIMARY,
  },
});
