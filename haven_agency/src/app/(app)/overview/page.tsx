"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowRight, CalendarDays, Check, FileClock, FileUp, Inbox, ListChecks, MessageSquare, Siren, UserPlus, Users, Wallet,
} from "lucide-react";
import { useData } from "@/components/DataProvider";
import { useActor } from "@/lib/useActor";
import { patch } from "@/lib/actions";
import { ago, daysUntil, fmtDate, fmtMoney, fmtTime, pluralize, toDate } from "@/lib/format";
import { bookingStats, earnings, personnelStats } from "@/lib/metrics";
import { canAccess } from "@/lib/nav";
import { Avatar, Button, Card, CardHeader, EmptyState, Progress, Skeleton, Stat, StatusBadge, cx } from "@/components/ui";

export default function Overview() {
  const d = useData();
  const { agency, profile, role, run } = useActor();
  const cur = d.settings.currency;

  const ps = useMemo(() => personnelStats(d.personnel, d.bookings), [d.personnel, d.bookings]);
  const bs = useMemo(() => bookingStats(d.bookings), [d.bookings]);
  const money = useMemo(() => earnings(d.bookings), [d.bookings]);

  /* ---------- onboarding checklist (only until the agency is approved) ---------- */
  const steps = [
    { done: !!(agency.description && agency.address && agency.phone), label: "Complete your agency profile", href: "/profile" },
    { done: Object.values(agency.services ?? {}).some((s) => s?.enabled), label: "Choose services and set your prices", href: "/services" },
    { done: d.documents.some((x) => x.ownerType === "agency"), label: "Upload business registration and licence", href: "/verification?tab=agency" },
    { done: d.personnel.length > 0, label: "Add your personnel", href: "/personnel" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const canSubmit = doneCount === steps.length && ["draft", "rejected"].includes(agency.status);

  /* ---------- the attention inbox: everything that is waiting on the agency ---------- */
  const attention = useMemo(() => {
    const items: { icon: React.ReactNode; title: string; sub: string; href: string; urgent?: boolean }[] = [];
    const emergencies = d.tickets.filter((t) => t.priority === "emergency" && t.status !== "resolved");
    if (emergencies.length) items.push({ icon: <Siren className="h-4 w-4" />, title: `${pluralize(emergencies.length, "emergency incident")} open`, sub: emergencies[0].subject, href: "/support?filter=emergency", urgent: true });
    const reqs = d.bookings.filter((b) => b.status === "pending");
    if (reqs.length) items.push({ icon: <Inbox className="h-4 w-4" />, title: `${pluralize(reqs.length, "new booking request")}`, sub: "Accept or decline so clients aren’t kept waiting", href: "/bookings?tab=requests" });
    const toAssign = d.bookings.filter((b) => b.status === "accepted");
    if (toAssign.length) items.push({ icon: <ListChecks className="h-4 w-4" />, title: `${pluralize(toAssign.length, "booking")} need a team`, sub: "Assign personnel to accepted bookings", href: "/assignments" });
    const changes = d.bookings.filter((b) => b.clientApproval === "changes_requested" && !["cancelled", "completed"].includes(b.status));
    if (changes.length) items.push({ icon: <Users className="h-4 w-4" />, title: `${pluralize(changes.length, "client")} asked for team changes`, sub: changes[0].clientFeedback || "Review their feedback", href: "/assignments", urgent: true });
    const expiring = d.documents.filter((x) => { const n = daysUntil(x.expiresAt); return n !== null && n <= 30; });
    if (expiring.length) items.push({ icon: <FileClock className="h-4 w-4" />, title: `${pluralize(expiring.length, "document")} expiring within 30 days`, sub: "Renew them to keep personnel deployable", href: "/verification?tab=expiring" });
    const rejected = d.personnel.filter((p) => p.verificationStatus === "rejected");
    if (rejected.length) items.push({ icon: <AlertTriangle className="h-4 w-4" />, title: `${pluralize(rejected.length, "person", "people")} failed verification`, sub: "See admin remarks and resubmit", href: "/verification?tab=rejected" });
    const corrections = d.attendance.filter((a) => a.correction?.status === "open");
    if (corrections.length) items.push({ icon: <Check className="h-4 w-4" />, title: `${pluralize(corrections.length, "attendance correction")} to review`, sub: "Approve or reject the requests", href: "/attendance?tab=corrections" });
    const unreplied = d.reviews.filter((r) => !r.reply);
    if (unreplied.length) items.push({ icon: <MessageSquare className="h-4 w-4" />, title: `${pluralize(unreplied.length, "review")} without a reply`, sub: "Replying builds client trust", href: "/reviews" });
    return items;
  }, [d]);

  const upcoming = useMemo(() => d.bookings
    .filter((b) => ["accepted", "assigned", "ongoing"].includes(b.status) && (toDate(b.eventDate)?.getTime() ?? 0) > Date.now() - 12 * 3600000)
    .sort((a, b) => (toDate(a.eventDate)?.getTime() ?? 0) - (toDate(b.eventDate)?.getTime() ?? 0)).slice(0, 6), [d.bookings]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{greeting}, {profile.name.split(" ")[0]}</h1>
        </div>
        {canAccess(role, "personnel") && (
          <div className="flex gap-2">
            <Link href="/personnel?import=1"><Button icon={<FileUp className="h-4 w-4" />}>Import from Excel</Button></Link>
            <Link href="/personnel?new=1"><Button variant="primary" icon={<UserPlus className="h-4 w-4" />}>Add personnel</Button></Link>
          </div>
        )}
      </div>

      {agency.status !== "approved" && (
        <Card className="overflow-hidden">
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_1.3fr]">
            <div>
              <StatusBadge status={agency.status} />
              <h2 className="mt-3 text-lg font-semibold text-ink">
                {agency.status === "pending" ? "Your agency is under review" : agency.status === "rejected" ? "Your application needs changes" : agency.status === "suspended" ? "Your agency is suspended" : "Get your agency live on Haven"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {agency.status === "pending" ? "We usually review within 2 working days. You can keep adding personnel meanwhile."
                  : agency.adminRemarks ? `Admin remarks: ${agency.adminRemarks}` : "Clients can find and book you once these steps are done and our team approves your agency."}
              </p>
              <div className="mt-5 flex items-center gap-3">
                <Progress value={(doneCount / steps.length) * 100} className="max-w-[200px]" />
                <span className="tnum text-xs text-muted">{doneCount} of {steps.length}</span>
              </div>
              {canSubmit && role !== "finance" && (
                <Button variant="primary" className="mt-5" onClick={() => run(() => patch("agencies", agency.id, { status: "pending" }), "Submitted. We’ll notify you once it’s reviewed.", ["Submitted agency for review"])}>
                  Submit for review
                </Button>
              )}
            </div>
            <ol className="stagger divide-y divide-line rounded-xl border border-line">
              {steps.map((s, i) => (
                <li key={s.label}>
                  <Link href={s.href} className="group flex items-center gap-3 px-4 py-3 transition hover:bg-canvas">
                    <span className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold",
                      s.done ? "border-ink bg-ink text-white" : "border-line-2 text-muted")}>{s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
                    <span className={cx("flex-1 text-sm", s.done ? "text-muted line-through" : "font-medium text-ink")}>{s.label}</span>
                    {!s.done && <ArrowRight className="h-4 w-4 text-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />}
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </Card>
      )}

      {/* KPIs */}
      {d.loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[98px]" />)}</div>
      ) : (
        <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat href="/personnel" label="Registered personnel" value={ps.total} sub={`${ps.underVerification} under verification`} icon={<Users className="h-4 w-4" />} />
          <Stat href="/schedule" label="Available now" value={ps.available} sub={`${ps.assigned} assigned · ${ps.onLeave} on leave`} icon={<Check className="h-4 w-4" />} />
          <Stat href="/bookings?tab=requests" label="New requests" value={bs.requests} sub={`${bs.ongoing} ongoing · ${bs.total} total`} icon={<Inbox className="h-4 w-4" />} />
          {canAccess(role, "payments")
            ? <Stat href="/payments" label="Total earnings" value={fmtMoney(money.total, cur)} sub={`${fmtMoney(money.pending, cur)} pending`} icon={<Wallet className="h-4 w-4" />} />
            : <Stat label="Completed bookings" value={bs.completed} sub={`${bs.cancelled} cancelled or declined`} icon={<CalendarDays className="h-4 w-4" />} />}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardHeader title="Needs your attention" desc="The most urgent items come first" />
          {attention.length === 0 ? (
            <EmptyState icon={<Check className="h-5 w-5" />} title="You’re all caught up" desc="New requests, expiring documents and client feedback will appear here." />
          ) : (
            <ul className="stagger divide-y divide-line">
              {attention.map((a) => (
                <li key={a.title}>
                  <Link href={a.href} className="group flex items-center gap-4 px-5 py-3.5 transition hover:bg-canvas">
                    <span className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-lg", a.urgent ? "bg-danger-soft text-danger" : "bg-wash text-ink")}>{a.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{a.title}</p>
                      <p className="truncate text-[13px] text-muted">{a.sub}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Upcoming bookings" action={<Link href="/bookings" className="text-[13px] text-muted hover:text-ink">View all</Link>} />
          {upcoming.length === 0 ? (
            <EmptyState icon={<CalendarDays className="h-5 w-5" />} title="No upcoming bookings" desc="Accepted bookings show up here with their team status." />
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map((b) => {
                const dt = toDate(b.eventDate);
                const short = (b.assignedIds?.length ?? 0) < b.personnelCount;
                return (
                  <li key={b.id}>
                    <Link href={`/bookings?id=${b.id}`} className="flex items-center gap-4 px-5 py-3 transition hover:bg-canvas">
                      <div className="w-12 shrink-0 rounded-lg border border-line py-1 text-center">
                        <p className="text-[10px] font-semibold uppercase text-muted">{dt?.toLocaleString(undefined, { month: "short" })}</p>
                        <p className="tnum text-lg font-semibold leading-tight text-ink">{dt?.getDate()}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{b.customerName} · {b.serviceLabel}</p>
                        <p className="truncate text-[13px] text-muted">{fmtTime(b.eventDate)} · {b.hours}h · {b.location}</p>
                      </div>
                      <div className="text-right">
                        <p className={cx("tnum text-[13px] font-medium", short ? "text-danger" : "text-ink")}>{b.assignedIds?.length ?? 0}/{b.personnelCount}</p>
                        <p className="text-[11px] text-muted">team</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.25fr]">
        <Card>
          <CardHeader title="Bookings at a glance" />
          <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
            {[["New", bs.requests], ["Ongoing", bs.ongoing], ["Completed", bs.completed], ["Cancelled", bs.cancelled]].map(([l, v]) => (
              <div key={l} className="bg-white p-5"><p className="text-[13px] text-muted">{l}</p><p className="tnum mt-1 text-xl font-semibold text-ink">{v}</p></div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Recent activity" desc="What your team did recently" />
          {d.activity.length === 0 ? <EmptyState title="No activity yet" desc="Actions by you and your team are logged here." /> : (
            <ul className="divide-y divide-line">
              {d.activity.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={a.actorName} size={28} />
                  <p className="min-w-0 flex-1 truncate text-sm"><b className="font-medium text-ink">{a.actorName}</b> <span className="text-body">{a.action.toLowerCase()}</span>{a.target && <span className="text-muted"> · {a.target}</span>}</p>
                  <span className="shrink-0 text-xs text-faint">{ago(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <p className="text-center text-xs text-faint">Agency since {fmtDate(agency.createdAt)}</p>
    </div>
  );
}
