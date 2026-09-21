/**
 * The Supabase client — the app's single connection to the backend.
 *
 * Owns: client construction, session persistence, and token refresh.
 * Does not own: queries. Those live in `src/lib/queries/`, which is the one
 *   place fixtures become `supabase-js` calls. Nothing outside that folder
 *   should import this module directly.
 */

// Installs a `localStorage` global backed by on-device SQLite. Must be imported
// before `createClient`, because the auth storage adapter below reads it at
// construction time.
//
// This is Expo's SDK 57 guidance, and it deliberately differs from Supabase's
// own React Native quickstart, which still says AsyncStorage. `expo-secure-store`
// is the wrong answer here despite being the intuitive one: it caps values at
// 2048 bytes and a Supabase session exceeds that, which presents as random
// sign-outs rather than an error.
import "expo-sqlite/localStorage/install";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

import type { Database } from "@/types";

/**
 * The typed client, as a type.
 *
 * Every function in `src/lib/queries/` takes one of these as its first argument
 * rather than importing the singleton below. Two reasons, both hard:
 *
 * - This module imports `expo-sqlite`, which needs the native bridge. A plain
 *   Node script — `scripts/try-queries.ts` — could never load it, so a
 *   module-level singleton would make the query layer untestable outside the app.
 * - Testing RLS means running the same query as two different users at once,
 *   which needs two clients.
 *
 * Importing this type with `import type` is safe from Node: TypeScript erases
 * type-only imports entirely, so nothing from this file reaches the runtime.
 */
export type Db = SupabaseClient<Database>;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

// Failing here is better than failing on the first query with a confusing
// network error. A missing .env is the most likely cause on a fresh clone.
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY. " +
      "Copy .env.example to .env and fill it in — see docs/backend/setup.md.",
  );
}

/**
 * The shared Supabase client.
 *
 * Authorization is **not** this object's job. Every rule about who may read or
 * write a row is an RLS policy in the database, so a query here returns only
 * what the signed-in user is allowed to see. Do not add ownership filters for
 * security — add them only to narrow a result set.
 *
 * The `<Database>` generic is what makes every query typed. Without it
 * `.from("listings").select()` returns `any`, and nothing downstream can catch a
 * column that no longer exists. Regenerate `src/types/database.ts` after every
 * migration so this stays honest.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // There is no browser URL to parse a session out of on native. On web there
    // is, and leaving this false would break any future redirect-based flow.
    detectSessionInUrl: Platform.OS === "web",
  },
});

// Nothing refreshes tokens for you while the app is backgrounded. Without this,
// the first query after a long pause fails with a 401 that looks like a bug in
// the query rather than an expired token.
//
// Web has no AppState lifecycle in this sense, and supabase-js already handles
// visibility there.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
