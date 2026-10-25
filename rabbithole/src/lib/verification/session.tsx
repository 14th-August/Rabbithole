/**
 * Who is signed in.
 *
 * Holds the current Supabase session, the matching `profiles` row, and the
 * loading flag while both resolve. Signing in and out belongs to `auth.ts` — the
 * one exception is a session past the five-day policy, which this ends itself
 * because expiring a session is part of owning session state.
 *
 * Returns: `useSession` returns the session state. `SessionProvider` returns the
 * provider element; mount it once in the root layout.
 */

import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import type { MyProfile } from "@/types";

import { getMyProfile } from "../queries/profiles";
import { isSessionStale } from "./sessionAge";
import { supabase } from "../supabase";

/** What {@link useSession} returns. */
interface SessionState {
  /** The raw Supabase session, or `null` when signed out. */
  session: Session | null;

  /**
   * The signed-in user's own profile, read through the `my_profile` view.
   *
   * Can be `null` even when `session` is set — briefly while it loads, and
   * between signup and email confirmation.
   */
  profile: MyProfile | null;

  /**
   * `true` until the stored session has been read from disk.
   *
   * Routing on `session` before this flips bounces an already-signed-in user to
   * the sign-in screen for a frame, because the read is asynchronous.
   */
  isLoading: boolean;

  /**
   * Whether the account's email has been confirmed.
   *
   * Explicit rather than assumed: "has a session" and "has proven they own a VIU
   * address" are different claims.
   */
  isVerified: boolean;
}

/** A profile read, tagged with the user it was read for. */
interface LoadedProfile {
  userId: string;
  profile: MyProfile | null;
}

const SessionContext = createContext<SessionState | undefined>(undefined);

/**
 * Reads the current session from context.
 *
 * Returns the session state.
 *
 * @throws If called outside {@link SessionProvider} — a wiring mistake, not a
 *   runtime condition worth handling at the call site.
 */
export function useSession(): SessionState {
  const state = useContext(SessionContext);

  if (state === undefined) {
    throw new Error("useSession must be used inside a <SessionProvider>.");
  }

  return state;
}

/**
 * Provides session state to the tree. Mount once, in the root layout.
 *
 * Returns the provider element wrapping `children`.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState<LoadedProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Read the persisted session first so a returning user is not shown the
    // signed-out UI while the token loads from disk.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;

      // A refresh token outlives the five-day policy on its own, so ending the
      // session here is what makes the policy real. Scope is `local` because the
      // rule is about this device, and a local sign-out needs no network.
      if (data.session !== null && isSessionStale()) {
        void supabase.auth.signOut({ scope: "local" });
        setSession(null);
        setIsLoading(false);
        return;
      }

      setSession(data.session);
      setIsLoading(false);
    });

    // Covers what a one-shot read cannot: another tab signing out, a refresh
    // failing, an OTP verification completing on this device.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setIsLoading(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (userId === null) return;

    // The tag on `loaded` already keeps a stale read off the screen; this just
    // skips the pointless write when the user changes mid-flight.
    let active = true;

    // Through the query layer, not around it. Inline here it bypassed
    // `toMessage`, so a failure printed a raw PostgREST string and left
    // `profile` null — indistinguishable from an account with no row yet.
    getMyProfile(supabase).then(({ data, error }) => {
      if (!active) return;

      if (error !== null) {
        // The session is still valid; only the profile failed. Screens render
        // their own fallbacks rather than the app failing whole.
        console.warn("Failed to load profile:", error);
        setLoaded({ userId, profile: null });
        return;
      }

      setLoaded({ userId, profile: data });
    });

    return () => {
      active = false;
    };
  }, [userId]);

  // Derived, not stored: tagging the read with its user means sign-out and
  // user-switch clear the profile on render, instead of an effect writing
  // `null` and cascading a render.
  const profile = loaded?.userId === userId ? loaded.profile : null;

  const value: SessionState = {
    session,
    profile,
    isLoading,
    isVerified: session?.user.email_confirmed_at != null,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
