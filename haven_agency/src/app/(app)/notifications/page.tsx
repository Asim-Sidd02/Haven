"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell, CalendarDays, CheckCheck, FileCheck2, FileSignature, Megaphone, MessageSquare, Siren, Users, Wallet, FileClock, Trash2,
} from "lucide-react";
import { useData } from "@/components/DataProvider";
import { Button, Card, EmptyState, IconButton, PageHeader, Segmented, cx } from "@/components/ui";
import { useActor } from "@/lib/useActor";
import { patch, remove } from "@/lib/actions";
import { ago, daysUntil, toDate } from "@/lib/format";
import type { Notice } from "@/lib/types";

const ICONS: Record<Notice["type"], React.ReactNode> = {
  booking: <CalendarDays className="h-4 w-4" />, assignment: <Users className="h-4 w-4" />, verification: <FileCheck2 className="h-4 w-4" />,
  agreement: <FileSignature className="h-4 w-4" />, payment: <Wallet className="h-4 w-4" />, document: <FileClock className="h-4 w-4" />,
  message: <MessageSquare className="h-4 w-4" />, announcement: <Megaphone className="h-4 w-4" />, emergency: <Siren className="h-4 w-4" />,
};

/** Where a notification should take you, from its type and link. */
function hrefFor(n: Notice) {
  const [kind, id] = (n.link || "").split(":");
  if (kind === "booking" && id) return `/bookings?id=${id}`;
  if (kind === "ticket") return "/support";
  return ({ booking: "/bookings", assignment: "/assignments", verification: "/verification", agreement: "/agreements", payment: "/payments",
    document: "/verification?tab=expiring", message: "/support", announcement: "/notifications", emergency: "/support?filter=emergency" } as const)[n.type];
}

function dayGroup(n: Notice) {
  const d = toDate(n.createdAt);
  if (!d) return "Earlier";
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  return days < 1 ? "Today" : days < 2 ? "Yesterday" : days < 7 ? "This week" : "Earlier";
}

export default function NotificationsPage() {
  const { notifications, documents } = useData();
  const { run } = useActor();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  // Expiry reminders are computed live from documents, so they can never be missed.
  const reminders = documents.filter((d) => { const n = daysUntil(d.expiresAt); return n !== null && n <= 14 && n >= -30; });
  const list = notifications.filter((n) => filter === "all" || !n.read);
  const unread = notifications.filter((n) => !n.read);
  const groups = useMemo(() => {
    const g = new Map<string, Notice[]>();
    list.forEach((n) => g.set(dayGroup(n), [...(g.get(dayGroup(n)) ?? []), n]));
    return [...g.entries()];
  }, [list]);

  return (
    <>
      <PageHeader title="Notifications" desc="Booking updates, verification results, payments and messages from clients and Haven."
        actions={<>
          <Segmented value={filter} onChange={setFilter} items={[{ value: "all", label: "All" }, { value: "unread", label: `Unread (${unread.length})` }]} />
          <Button icon={<CheckCheck className="h-4 w-4" />} disabled={!unread.length} onClick={() => run(() => Promise.all(unread.map((n) => patch("notifications", n.id, { read: true }, false))), "All caught up")}>Mark all read</Button>
        </>} />

      {reminders.length > 0 && (
        <Card className="mb-4 border-ink/20">
          <Link href="/verification?tab=expiring" className="flex items-center gap-4 p-4 hover:bg-canvas">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-white"><FileClock className="h-4 w-4" /></span>
            <div className="flex-1"><p className="text-sm font-medium text-ink">{reminders.length} document{reminders.length > 1 ? "s" : ""} expiring or expired</p>
              <p className="text-[13px] text-muted">{reminders.slice(0, 3).map((d) => `${d.name}${d.personnelName ? ` (${d.personnelName})` : ""}`).join(", ")}</p></div>
          </Link>
        </Card>
      )}

      <Card>
        {!list.length ? <EmptyState icon={<Bell className="h-5 w-5" />} title={filter === "unread" ? "No unread notifications" : "No notifications yet"} desc="You’ll hear about new bookings, approvals and payments here." /> : groups.map(([g, items]) => (
          <div key={g}>
            <p className="border-b border-line bg-canvas px-5 py-2 text-xs font-semibold uppercase tracking-wider text-muted">{g}</p>
            <ul className="divide-y divide-line">{items.map((n) => (
              <li key={n.id} className={cx("group flex items-start gap-4 px-5 py-4 transition hover:bg-canvas", !n.read && "bg-white")}>
                <span className={cx("mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg", n.type === "emergency" ? "bg-danger-soft text-danger" : n.read ? "bg-wash text-muted" : "bg-ink text-white")}>{ICONS[n.type] ?? <Bell className="h-4 w-4" />}</span>
                <Link href={hrefFor(n)} onClick={() => !n.read && patch("notifications", n.id, { read: true }, false).catch(() => {})} className="min-w-0 flex-1">
                  <p className={cx("text-sm", n.read ? "text-body" : "font-semibold text-ink")}>{n.title}</p>
                  {n.body && <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">{n.body}</p>}
                  <p className="mt-1 text-xs text-faint">{ago(n.createdAt)}</p>
                </Link>
                {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-ink" aria-label="Unread" />}
                <IconButton label="Delete notification" className="opacity-0 group-hover:opacity-100" onClick={() => run(() => remove("notifications", n.id), "")}><Trash2 className="h-4 w-4" /></IconButton>
              </li>
            ))}</ul>
          </div>
        ))}
      </Card>
    </>
  );
}
