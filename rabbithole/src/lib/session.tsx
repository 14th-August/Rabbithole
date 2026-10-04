/**
 * Who is signed in.
 *
 * Owns: the current auth session, the matching `profiles` row, and the loading
 *   state while both are being resolved.
 * Does not own: signing in, or the forms that do it. The one exception is a
 *   session that has outlived the five-day policy: ending that is part of owning
 *   session state, not a transition a screen asked for. Every other change comes
 *   from `auth.ts`.
 *
 * `src/types/profile.ts` anticipates exactly this: "Session state belongs to a
 * future `useCurrentUser()` hook, not to this file." This is that hook, and
 * `mockCurrentUser` is what it replaces.
 */

import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import type { MyProfile } from "@/types";

import { getMyProfile } from "./queries/profiles";
import { isSessionStale } from "./sessionAge";
import { supabase } from "./supabase";

/** What {@link useSession} returns. */
interface SessionState {
  /** The raw Supabase session, or `null` when signed out. */
  session: Session | null;

  /**
   * The signed-in user's own profile, read through the `my_profile` view.
   *
   * Can be `null` even when `session` is set — briefly while it loads, and for
   * the window between signup and email confirmation.
   */
  profile: MyProfile | null;

  /**
   * `true` until the stored session has been read from disk.
   *
   * Routing on `session` before this flips would bounce an already-signed-in
   * user to the sign-in screen for a frame, because the persisted session is
   * read asynchronously.
   */
  isLoading: boolean;

  /**
   * Whether the account's email has been confirmed.
   *
   * Signing up creates a user with no session, so in practice an unconfirmed
   * account cannot get this far — but the check is explicit rather than assumed,
   * because "has a session" and "has proven they own a VIU address" are
   * different claims.
   */
  isVerified: boolean;
}

const SessionContext = createContext<SessionState | undefined>(undefined);

/**
 * Read the current session.
 *
 * @throws If called outside {@link SessionProvider}, which is a wiring mistake
 *   rather than a runtime condition worth handling at the call site.
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
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Read the persisted session first so a returning user is not shown the
    // signed-out UI while the token is loaded from disk.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;

      // A refresh token outlives the five-day policy on its own, so holding a
      // valid session is not sufficient to stay signed in. Ending it here is
      // what makes the policy real.
      //
      // Scope is `local` deliberately: the rule is about how long *this device*
      // may go without a password, so revoking the user's other sessions would
      // overreach — and a local sign-out still succeeds with no network.
      if (data.session !== null && isSessionStale()) {
        void supabase.auth.signOut({ scope: "local" });
        setSession(null);
        setIsLoading(false);
        return;
      }

      setSession(data.session);
      setIsLoading(false);
    });

    // Fires on sign-in, sign-out, token refresh, and user updates. Covers the
    // cases a one-shot read cannot: another tab signing out, a refresh failing,
    // an OTP verification completing on this device.
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
    if (userId === null) {
      setProfile(null);
      return;
    }

    // Guards against a slow response for a previous user overwriting a newer
    // one — a real ordering hazard when sign-out and sign-in happen quickly.
    let active = true;

    // Through the query layer, not around it. This read used to live here
    // inline, which made it the one database call in the app outside
    // `src/lib/queries/` — and because it bypassed `toMessage`, a failure
    // printed a raw PostgREST string and left `profile` null, indistinguishable
    // from an account whose row does not exist yet.
    //
    // `getMyProfile` owns both of those now: why the read goes to a view rather
    // than the table, and what a null actually means.
    getMyProfile(supabase).then(({ data, error }) => {
      if (!active) return;

      if (error !== null) {
        // The session is still valid; only the profile failed to load. Screens
        // render their own fallbacks rather than the app failing whole.
        console.warn("Failed to load profile:", error);
        setProfile(null);
        return;
      }

      setProfile(data);
    });

    return () => {
      active = false;
    };
  }, [userId]);

  const value: SessionState = {
    session,
    profile,
    isLoading,
    isVerified: session?.user.email_confirmed_at != null,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
