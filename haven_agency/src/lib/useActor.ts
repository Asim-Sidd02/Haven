"use client";

import { useCallback } from "react";
import { useSession } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { errMsg } from "./format";
import { log, type Actor } from "./actions";

/**
 * The signed-in person as an `Actor`, plus `run`: a wrapper that executes an action,
 * shows a success or error toast, and writes the audit log. Every page uses this,
 * so feedback is consistent everywhere.
 */
export function useActor() {
  const { user, profile, agency, role } = useSession();
  const toast = useToast();
  const actor: Actor = { uid: user.uid, name: profile.name || user.email || "Agency", agencyId: agency.id };

  const run = useCallback(async (fn: () => Promise<unknown>, ok: string, audit?: [string, string?]) => {
    try {
      await fn();
      if (ok) toast(ok);
      if (audit) log(actor, audit[0], audit[1] ?? "");
      return true;
    } catch (e) {
      toast(errMsg(e).replace(/^FirebaseError: /, "").replace(/Missing or insufficient permissions\.?/, "You don’t have permission to do that."), "error");
      return false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, actor.uid, actor.agencyId]);

  return { actor, run, agency, role, profile, toast };
}
