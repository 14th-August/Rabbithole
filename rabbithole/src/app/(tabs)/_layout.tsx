/**
 * The five-tab bar.
 *
 * Owns: which tabs exist, their order, their icons, and their tinting.
 * Does not own: what any tab renders. Each screen is its own file.
 *
 * Tabs comes from `expo-router/js-tabs` — importing it from `expo-router`
 * directly is deprecated in SDK 57.
 *
 * **The selected tab fills.** Every icon has an outline form and a solid form;
 * `focused` picks between them. Colour alone was doing all the work before, and
 * a tint shift is the weakest signal a tab bar can give — weight reads at a
 * glance where hue does not, and it is the half that survives a colour-vision
 * difference. `tabBarActiveTintColor` still supplies the blue, so the render
 * prop never sets a colour itself; it only chooses the glyph.
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router/js-tabs";

import { useTheme } from "@/theme";

/** Arranges the five primary tabs. */
export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand.default,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text.primary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Discover",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "compass" : "compass-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "bookmark" : "bookmark-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create Post",
          // The only tab that draws its own header. It needs a close button and
          // a Publish action styled from tokens, which the native header cannot
          // carry — and hiding it is what makes the screen read as an overlay
          // rather than another tab page.
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "add-circle" : "add-circle-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "chatbubble" : "chatbubble-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
