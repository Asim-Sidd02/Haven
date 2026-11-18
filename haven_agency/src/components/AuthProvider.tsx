"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import type { Agency, AppUser } from "@/lib/types";

export type AuthState =
  | { status: "loading" }
  | { status: "unconfigured" }
  | { status: "signedOut"; reason?: string }
  /** Signed in, but the account has no agency yet: finish registration. */
  | { status: "onboarding"; user: User; profile: AppUser | null }
  | { status: "ready"; user: User; profile: AppUser; agency: Agency };

const Ctx = createContext<{ state: AuthState; logout: () => Promise<void> }>({
  state: { status: "loading" },
  logout: async () => {},
});

export const useAuth = () => useContext(Ctx);

/** Shortcut for pages inside the signed-in shell. */
export function useSession() {
  const { state } = useAuth();
  if (state.status !== "ready") throw new Error("useSession used outside the agency shell");
  return { user: state.user, profile: state.profile, agency: state.agency, agencyId: state.agency.id, role: state.profile.staffRole ?? "owner" };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    if (!firebaseConfigured) {
      setState({ status: "unconfigured" });
      return;
    }
    let unsubProfile = () => {};
    let unsubAgency = () => {};
    const unsubAuth = onAuthStateChanged(auth(), (user) => {
      unsubProfile(); unsubAgency();
      if (!user) {
        setState((s) => (s.status === "signedOut" ? s : { status: "signedOut" }));
        return;
      }
      setState({ status: "loading" });
      unsubProfile = onSnapshot(doc(db(), "users", user.uid), (snap) => {
        unsubAgency();
        const profile = snap.exists() ? ({ ...snap.data(), id: snap.id } as AppUser) : null;
        if (profile && profile.role !== "agency") {
          signOut(auth());
          setState({ status: "signedOut", reason: profile.role === "admin"
            ? "Admin accounts sign in to the Haven admin dashboard."
            : "This is a client account. Please use the Haven app to book security." });
          return;
        }
        if (profile && profile.isActive === false) {
          signOut(auth());
          setState({ status: "signedOut", reason: "This account has been deactivated. Contact your agency owner." });
          return;
        }
        if (!profile?.agencyId) {
          setState({ status: "onboarding", user, profile });
          return;
        }
        unsubAgency = onSnapshot(
          doc(db(), "agencies", profile.agencyId),
          (a) => {
            if (!a.exists()) setState({ status: "onboarding", user, profile });
            else setState({ status: "ready", user, profile, agency: { ...(a.data() as Agency), id: a.id } });
          },
          () => setState({ status: "onboarding", user, profile }),
        );
      }, (e) => setState({ status: "signedOut", reason: `Could not load your account: ${e.message}` }));
    });
    return () => { unsubAuth(); unsubProfile(); unsubAgency(); };
  }, []);

  const logout = async () => {
    if (firebaseConfigured) await signOut(auth());
    setState({ status: "signedOut" });
  };

  return <Ctx.Provider value={{ state, logout }}>{children}</Ctx.Provider>;
}
