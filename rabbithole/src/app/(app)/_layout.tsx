/**
 * Shell for the signed-in half of the app.
 *
 * A bare Stack. It exists so the root layout has a group to guard - the five
 * tabs were removed in the scale-down to auth, and there is one screen behind
 * this for now. Headers are hidden; screens paint their own.
 *
 * Returns: the signed-in `Stack`.
 */

import { Stack } from "expo-router";

/** The page behind everything. Matches the root navigator's fallback. */
const BACKGROUND = "#F7F8FA";

/** Arranges the signed-in screens. */
export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: BACKGROUND },
      }}
    />
  );
}
