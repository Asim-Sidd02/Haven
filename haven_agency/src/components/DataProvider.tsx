"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSession } from "./AuthProvider";
import {
  DEFAULT_SETTINGS, type Activity, type AgencyDoc, type Agreement, type AppSettings, type AppUser, type Attendance,
  type Assignment, type Booking, type Invite, type JoinRequest, type PersonnelInvite, type Notice, type Payroll, type Personnel, type Review, type Ticket, type Transaction,
} from "@/lib/types";

interface Data {
  personnel: Personnel[];
  bookings: Booking[];
  documents: AgencyDoc[];
  attendance: Attendance[];
  agreements: Agreement[];
  payroll: Payroll[];
  transactions: Transaction[];
  notifications: Notice[];
  reviews: Review[];
  tickets: Ticket[];
  activity: Activity[];
  staff: AppUser[];
  invites: Invite[];
  assignments: Assignment[];
  joinRequests: JoinRequest[];
  personnelInvites: PersonnelInvite[];
  settings: AppSettings;
  loading: boolean;
}

const EMPTY: Data = {
  personnel: [], bookings: [], documents: [], attendance: [], agreements: [], payroll: [], transactions: [],
  notifications: [], reviews: [], tickets: [], activity: [], staff: [], invites: [], assignments: [], joinRequests: [], personnelInvites: [], settings: DEFAULT_SETTINGS, loading: true,
};

const Ctx = createContext<Data>(EMPTY);
export const useData = () => useContext(Ctx);

const ms = (x: { createdAt?: { toMillis?: () => number } }) => x.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;

/**
 * One live subscription per collection, scoped to this agency, shared by every page.
 * Collections the signed-in role may not read are simply skipped.
 */
export function DataProvider({ children }: { children: React.ReactNode }) {
  const { agencyId, role } = useSession();
  const [data, setData] = useState<Data>(EMPTY);

  useEffect(() => {
    const finance = ["owner", "manager", "finance"].includes(role);
    const payroll = finance || role === "hr";
    const sources: [keyof Data, string, string, boolean][] = [
      ["personnel", "personnel", "agencyId", true],
      ["bookings", "bookings", "agencyId", true],
      ["documents", "documents", "agencyId", true],
      ["attendance", "attendance", "agencyId", true],
      ["agreements", "agreements", "agencyId", true],
      ["payroll", "payroll", "agencyId", payroll],
      ["transactions", "transactions", "agencyId", finance],
      ["notifications", "notifications", "recipientId", true],
      ["reviews", "reviews", "agencyId", true],
      ["tickets", "tickets", "agencyId", true],
      ["activity", "activity", "agencyId", true],
      ["staff", "users", "agencyId", true],
      ["invites", "invites", "agencyId", ["owner", "manager"].includes(role)],
      ["assignments", "assignments", "agencyId", true],
      ["joinRequests", "joinRequests", "agencyId", true],
      ["personnelInvites", "personnelInvites", "agencyId", true],
    ];
    let pending = sources.filter((s) => s[3]).length + 1;
    const settle = () => { pending = Math.max(0, pending - 1); if (pending === 0) setData((d) => ({ ...d, loading: false })); };

    const unsubs = sources.filter((s) => s[3]).map(([key, path, field]) => {
      let first = true;
      return onSnapshot(
        query(collection(db(), path), where(field, "==", agencyId)),
        (snap) => {
          const rows = snap.docs.map((d) => ({ ...d.data(), id: d.id })) as { createdAt?: { toMillis?: () => number } }[];
          rows.sort((a, b) => ms(b) - ms(a));
          setData((d) => ({ ...d, [key]: rows }));
          if (first) { first = false; settle(); }
        },
        (e) => {
          console.warn(`[haven] ${path}:`, e.message);
          if (first) { first = false; settle(); }
        },
      );
    });
    unsubs.push(onSnapshot(doc(db(), "settings", "app"), (s) => {
      setData((d) => ({ ...d, settings: { ...DEFAULT_SETTINGS, ...(s.data() as Partial<AppSettings> | undefined) } }));
      settle();
    }, () => settle()));
    return () => unsubs.forEach((u) => u());
  }, [agencyId, role]);

  const value = useMemo(() => data, [data]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
