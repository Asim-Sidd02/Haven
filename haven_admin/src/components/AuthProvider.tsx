"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import type { AppUser } from "@/lib/types";

type AuthState =
  | { status: "loading" }
  | { status: "unconfigured" }
  | { status: "signedOut"; reason?: string }
  | { status: "admin"; user: User; profile: AppUser };

interface AuthCtx {
  state: AuthState;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ state: { status: "loading" }, logout: async () => {} });

export function useAuth() {
  return useContext(Ctx);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    if (!firebaseConfigured) {
      setState({ status: "unconfigured" });
      return;
    }
    return onAuthStateChanged(auth(), async (user) => {
      if (!user) {
        setState((s) => (s.status === "signedOut" ? s : { status: "signedOut" }));
        return;
      }
      try {
        const snap = await getDoc(doc(db(), "users", user.uid));
        const profile = snap.exists() ? ({ ...snap.data(), id: snap.id } as AppUser) : null;
        if (!profile || profile.role !== "admin") {
          await signOut(auth());
          setState({ status: "signedOut", reason: "This account is not authorized to access the admin dashboard." });
          return;
        }
        if (profile.isActive === false) {
          await signOut(auth());
          setState({ status: "signedOut", reason: "This admin account has been deactivated." });
          return;
        }
        setState({ status: "admin", user, profile });
      } catch (e) {
        await signOut(auth());
        setState({ status: "signedOut", reason: `Could not verify access: ${(e as Error).message}` });
      }
    });
  }, []);

  const logout = async () => {
    if (firebaseConfigured) await signOut(auth());
    setState({ status: "signedOut" });
  };

  return <Ctx.Provider value={{ state, logout }}>{children}</Ctx.Provider>;
}
