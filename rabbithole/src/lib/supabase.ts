/**
 * Date: 2026-10-28
 * Supabase client for the mobile app.
 * This is the single source of truth for the app's connection to the backend.
 * Builds the client, persists the session, and keeps tokens refreshed. 
 * Returns: the `supabase` singleton, and `Db` as the type every query takes.
 */

/* We go with a localStorage session for multiple reasons
 * 1. The session bytes cap at 2048 bytes for AsyncStorage and we already hit the capacity
 * 2. The Browser handles the local storage and the package is lightweight on install.
 * 3. It's an implicit global, meaning we don't need to pass it as a variable.
 * 4. Trade offs with storage outweigh AsyncStorage.
*/
import "expo-sqlite/localStorage/install";

/*
 * createClient: gets our supaBase client created
 * type SupaBaseClient: How our client is structure
 * AppState: Used to detect when the app is backgrounded and stop refreshing tokens
 * Platform: Used to detect if the app is running on web or native, so we can handle session detection accordingly
*/
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

import type { Database } from "@/types";

/**
 * The typed client, as a type.
 *
 * Every function in `src/lib/queries` takes one of these as its first argument
 * rather than importing the singleton, for two hard reasons: this module imports
 * `expo-sqlite`, which needs the native bridge, so a module-level singleton
 * would make the query layer untestable from a plain Node script; and testing
 * RLS means running the same query as two users at once, which needs two
 * clients. `import type` is safe from Node — TypeScript erases it entirely.
 */
export type Db = SupabaseClient<Database>;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

// Failing here beats failing on the first query with a confusing network error.
// A missing .env is the most likely cause on a fresh clone.
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY. " +
      "Check your .env file and restart the bundler."
  );
}

/**
 * The shared Supabase client. We use a Database object so
 * In other words, we let clients use the same db object for all queries, 
 * and we don't have to reload the db queries for each session.
 * This is mostly to support sqlite implementation so we 
 * dont drag the whole supabase client into memory for each query.
**/
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Leaving this for web scalability later on.
    detectSessionInUrl: Platform.OS === "web",
  },
});

// Nothing refreshes tokens while the app is backgrounded. Without this we 404.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

// more notes: we pass in DB as the client and two login tokens fight
// for the same session. We also pass db so we don;t hard wire to a specific client
