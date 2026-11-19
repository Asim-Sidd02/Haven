"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Building2, CalendarCheck, ChevronRight, Clock, Sparkles, Star, UserCheck, Wallet } from "lucide-react";
import { useCollection } from "@/hooks/useCollection";
import { useSettings } from "@/hooks/useSettings";
import { setAgencyStatus } from "@/lib/actions";
import { errMsg, fmtDate, fmtMoney } from "@/lib/format";
import { BOOKING_STATUSES, type Agency, type AppUser, type Assignment, type Booking, type BookingStatus, type Personnel, type Review } from "@/lib/types";
import { Avatar, Badge, Button, Card, CardHeader, Empty, ErrorNote, PageHeader, Skeleton } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/components/AuthProvider";

const BAR: Record<BookingStatus, string> = {
  pending: "bg-amber",
  accepted: "bg-sage",
  assigned: "bg-slate/60",
  confirmed: "bg-sage/60",
  ongoing: "bg-sand",
  completed: "bg-slate",
  declined: "bg-rose",
  cancelled: "bg-rose/50",
};
const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Awaiting agency",
  accepted: "Accepted",
  assigned: "Awaiting bouncers",
  confirmed: "Confirmed",
  ongoing: "Ongoing",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
};

type Tone = "sage" | "sand" | "slate" | "amber";
const TONE: Record<Tone, string> = {
  sage: "bg-sage-soft text-sage-dark",
  sand: "bg-sand-soft text-sand-dark",
  slate: "bg-slate-soft text-slate",
  amber: "bg-amber-soft text-amber",
};

function Stat({ label, value, icon: Icon, hint, tone = "sage", href }: { label: string; value: string | number; icon: React.ElementType; hint?: string; tone?: Tone; href?: string }) {
  const body = (
    <Card className={`h-full p-5 transition duration-150 ${href ? "hover:-translate-y-px hover:border-[#d6d2cb]" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-2 truncate text-[28px] font-semibold leading-none tracking-tight text-ink tabular-nums">{value}</p>
          {hint && <p className="mt-2.5 text-xs text-muted">{hint}</p>}
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${TONE[tone]}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
    </Card>
  );
  return href ? (
    <Link href={href} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/30">
      {body}
    </Link>
  ) : (
    body
  );
}

function StatSkeleton() {
  return (
    <Card className="p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-20" />
      <Skeleton className="mt-3 h-2.5 w-32" />
    </Card>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const { state } = useAuth();
  const toast = useToast();
  const users = useCollection<AppUser>("users");
  const agencies = useCollection<Agency>("agencies");
  const personnel = useCollection<Personnel>("personnel");
  const bookings = useCollection<Booking>("bookings");
  const reviews = useCollection<Review>("reviews");
  const assignments = useCollection<Assignment>("assignments");
  const { settings } = useSettings();
  const [busy, setBusy] = useState<string | null>(null);

  const stats = useMemo(() => {
    const byStatus = Object.fromEntries(BOOKING_STATUSES.map((s) => [s, 0])) as Record<BookingStatus, number>;
    let revenue = 0;
    const weekAgo = Date.now() - 7 * 86400_000;
    let newThisWeek = 0;
    for (const b of bookings.data) {
      if (b.status in byStatus) byStatus[b.status]++;
      if (b.paymentStatus === "paid" || (b.status === "completed" && b.paymentStatus !== "refunded")) revenue += Number(b.totalAmount ?? 0);
      if ((b.createdAt?.toMillis() ?? 0) > weekAgo) newThisWeek++;
    }
    const ratings = reviews.data.map((r) => Number(r.rating ?? 0)).filter((n) => n > 0);
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    return {
      customers: users.data.filter((u) => u.role === "customer").length,
      approved: agencies.data.filter((a) => a.status === "approved").length,
      pending: agencies.data.filter((a) => a.status === "pending"),
      personnelPending: personnel.data.filter((p) => p.verificationStatus === "pending").length,
      removals: personnel.data.filter((p) => p.removalRequested).length,
      personnelCorrection: personnel.data.filter((p) => p.verificationStatus === "needs_correction").length,
      agenciesCorrection: agencies.data.filter((a) => a.status === "needs_correction").length,
      independent: personnel.data.filter((p) => !p.agencyId).length,
      awaitingBouncers: byStatus.assigned,
      byStatus,
      revenue,
      newThisWeek,
      avg,
    };
  }, [users.data, agencies.data, personnel.data, bookings.data, reviews.data]);

  const recent = useMemo(
    () => [...bookings.data].sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)).slice(0, 6),
    [bookings.data],
  );

  const missedCheckIns = useMemo(() => {
    const closed = new Set(bookings.data.filter((b) => b.status === "completed" || b.status === "cancelled").map((b) => b.id));
    const now = Date.now();
    return assignments.data.filter((a) => {
      const start = a.eventDate?.toMillis();
      return a.status === "accepted" && !a.checkIn && !!start && now > start + 30 * 60_000 && !closed.has(a.bookingId);
    }).length;
  }, [assignments.data, bookings.data]);

  const outstanding = [
    { label: "Personnel pending verification", count: stats.personnelPending, href: "/personnel", urgent: false },
    { label: "Personnel needing correction", count: stats.personnelCorrection, href: "/personnel", urgent: false },
    { label: "Agencies needing correction", count: stats.agenciesCorrection, href: "/agencies", urgent: false },
    { label: "Independent bouncers awaiting an agency", count: stats.independent, href: "/personnel", urgent: false },
    { label: "Bookings awaiting bouncers", count: stats.awaitingBouncers, href: "/bookings", urgent: false },
    { label: "Missed check-ins", count: missedCheckIns, href: "/bookings", urgent: true },
  ];

  async function moderate(a: Agency, status: "approved" | "rejected") {
    const id = a.id;
    setBusy(id + status);
    try {
      await setAgencyStatus(a, status, status === "rejected" ? "Your application was declined. Please review your profile and documents, then resubmit." : undefined);
      toast(status === "approved" ? "Agency approved and now visible to customers." : "Application declined.");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(null);
    }
  }

  const loading = users.loading || agencies.loading || personnel.loading || bookings.loading;
  const total = bookings.data.length;
  const firstName = state.status === "admin" ? state.profile.name?.split(" ")[0] : "";

  return (
    <>
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        subtitle={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }) + " · Here's how Haven is doing."}
      />
      <ErrorNote error={users.error || agencies.error || personnel.error || bookings.error || assignments.error} />

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <Stat
              label="Agencies pending review"
              value={stats.pending.length}
              icon={Building2}
              tone="amber"
              hint={`${stats.approved} live · ${agencies.data.length} in total`}
              href="/agencies"
            />
            <Stat
              label="Personnel to verify"
              value={stats.personnelPending}
              icon={UserCheck}
              tone="slate"
              hint={stats.removals ? `${stats.removals} removal requests` : `${personnel.data.length} in the registry`}
              href="/personnel"
            />
            <Stat label="Bookings" value={total} icon={Clock} tone="sage" hint={`${stats.newThisWeek} new this week · ${stats.customers} customers`} href="/bookings" />
            <Stat label="Revenue" value={fmtMoney(stats.revenue, settings.currency)} icon={Wallet} tone="sand" hint="Paid or completed bookings" href="/bookings" />
          </>
        )}
      </div>

      {/* Outstanding actions */}
      <Card className="mt-6">
        <CardHeader title="Outstanding actions" meta={loading || assignments.loading ? undefined : `${outstanding.reduce((n, o) => n + o.count, 0)} open`} />
        {loading || assignments.loading ? (
          <div className="space-y-2 px-5 pb-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-4 w-64" />
            ))}
          </div>
        ) : (
          <ul className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
            {outstanding.map((o) => (
              <li key={o.label}>
                <Link href={o.href} className="flex items-center gap-3 px-5 py-3 text-[13px] transition hover:bg-cream/60">
                  {o.urgent && o.count > 0 ? <AlertTriangle className="h-4 w-4 text-rose" /> : <span className="h-4 w-4" />}
                  <span className="flex-1 text-ink">{o.label}</span>
                  <span className={`font-semibold tabular-nums ${o.count ? (o.urgent ? "text-rose" : "text-ink") : "text-muted"}`}>{o.count}</span>
                  <ChevronRight className="h-4 w-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Bookings by status */}
        <Card className="xl:col-span-2">
          <CardHeader title="Bookings by status" meta={`${total} total`} />
          <div className="px-5 pb-5">
            {loading ? (
              <Skeleton className="h-3 w-full rounded-full" />
            ) : total === 0 ? (
              <Empty compact icon={CalendarCheck} title="No bookings yet" hint="The bar fills in as customers start booking." />
            ) : (
              <>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-cream" role="img" aria-label="Bookings by status">
                  {BOOKING_STATUSES.map((s) =>
                    stats.byStatus[s] ? (
                      <div key={s} className={`${BAR[s]} transition-all duration-300`} style={{ width: `${(stats.byStatus[s] / total) * 100}%` }} title={`${STATUS_LABEL[s]}: ${stats.byStatus[s]}`} />
                    ) : null,
                  )}
                </div>
                <ul className="mt-5 space-y-2.5">
                  {BOOKING_STATUSES.map((s) => (
                    <li key={s} className="flex items-center gap-3 text-[13px]">
                      <span className={`h-2.5 w-2.5 rounded-full ${BAR[s]}`} />
                      <span className="flex-1 text-ink">{STATUS_LABEL[s]}</span>
                      <span className="tabular-nums text-muted">{total ? Math.round((stats.byStatus[s] / total) * 100) : 0}%</span>
                      <span className="w-8 text-right font-medium tabular-nums text-ink">{stats.byStatus[s]}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.1em] text-muted">New this week</p>
                    <p className="mt-1 text-lg font-semibold text-ink tabular-nums">{stats.newThisWeek}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.1em] text-muted">Avg. rating</p>
                    <p className="mt-1 flex items-center gap-1 text-lg font-semibold text-ink tabular-nums">
                      {stats.avg ? stats.avg.toFixed(1) : "—"}
                      {stats.avg > 0 && <Star className="h-4 w-4 fill-sand text-sand" />}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Needs attention */}
        <Card className="xl:col-span-3">
          <CardHeader
            title="Needs your attention"
            meta={stats.pending.length ? `${stats.pending.length} pending` : undefined}
            action={
              <Link href="/agencies" className="flex items-center gap-1 text-xs font-medium text-sage transition hover:text-sage-dark">
                All agencies <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {loading ? (
            <div className="space-y-3 px-5 pb-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-2.5 w-56" />
                  </div>
                </div>
              ))}
            </div>
          ) : stats.pending.length === 0 ? (
            <Empty compact icon={Sparkles} title="You're all caught up" hint="No agency applications are waiting for a decision." />
          ) : (
            <ul className="divide-y divide-line">
              {stats.pending.slice(0, 5).map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <Avatar name={b.name} url={b.logoUrl} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-ink">{b.name || "Unnamed agency"}</p>
                    <p className="truncate text-xs text-muted">
                      {b.city || "No city"} · {b.yearsExperience ?? 0} yrs · {b.personnelCount ?? 0} personnel
                      {b.licenseNo ? ` · licence ${b.licenseNo}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" loading={busy === b.id + "rejected"} onClick={() => moderate(b, "rejected")}>
                      Decline
                    </Button>
                    <Button size="sm" loading={busy === b.id + "approved"} onClick={() => moderate(b, "approved")}>
                      Approve
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Recent bookings */}
      <Card className="mt-6">
        <CardHeader
          title="Recent bookings"
          action={
            <Link href="/bookings" className="flex items-center gap-1 text-xs font-medium text-sage transition hover:text-sage-dark">
              All bookings <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        {loading ? (
          <div className="space-y-3 px-5 pb-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-56" />
                  <Skeleton className="h-2.5 w-72" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <Empty compact icon={CalendarCheck} title="No bookings yet" hint="They'll appear here as soon as customers start booking." />
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <Avatar name={b.customerName} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] text-ink">
                    <span className="font-semibold">{b.customerName}</span> <span className="text-muted">booked</span>{" "}
                    <span className="font-semibold">{b.agencyName}</span>
                  </p>
                  <p className="truncate text-xs text-muted">
                    {b.serviceLabel || b.eventType} · {b.personnelCount ?? 1} staff · {fmtDate(b.eventDate, true)} · {b.location}
                  </p>
                </div>
                <span className="text-[13px] font-semibold tabular-nums text-ink">{fmtMoney(b.totalAmount, settings.currency)}</span>
                <Badge value={b.status} label={STATUS_LABEL[b.status] ?? b.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
