"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarCheck, Clock, ShieldUser, Users, Wallet } from "lucide-react";
import { useCollection } from "@/hooks/useCollection";
import { useSettings } from "@/hooks/useSettings";
import { setBouncerStatus } from "@/lib/actions";
import { errMsg, fmtDate, fmtMoney } from "@/lib/format";
import { BOOKING_STATUSES, type AppUser, type Booking, type BookingStatus, type Bouncer } from "@/lib/types";
import { Avatar, Badge, Button, Card, Empty, ErrorNote, Loading, PageHeader } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/components/AuthProvider";

const BAR_COLORS: Record<BookingStatus, string> = {
  pending: "bg-amber",
  accepted: "bg-sage",
  completed: "bg-slate",
  declined: "bg-rose",
  cancelled: "bg-rose/60",
};

function Stat({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon: React.ElementType; hint?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage-soft text-sage-dark">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export default function DashboardPage() {
  const { state } = useAuth();
  const toast = useToast();
  const users = useCollection<AppUser>("users");
  const bouncers = useCollection<Bouncer>("bouncers");
  const bookings = useCollection<Booking>("bookings");
  const { settings } = useSettings();
  const [busy, setBusy] = useState<string | null>(null);

  const stats = useMemo(() => {
    const byStatus = Object.fromEntries(BOOKING_STATUSES.map((s) => [s, 0])) as Record<BookingStatus, number>;
    let revenue = 0;
    for (const b of bookings.data) {
      if (b.status in byStatus) byStatus[b.status]++;
      if (b.status === "completed") revenue += Number(b.totalAmount ?? 0);
    }
    return {
      customers: users.data.filter((u) => u.role === "customer").length,
      bouncers: users.data.filter((u) => u.role === "bouncer").length,
      pending: bouncers.data.filter((b) => b.status === "pending"),
      byStatus,
      revenue,
    };
  }, [users.data, bouncers.data, bookings.data]);

  const recent = useMemo(
    () => [...bookings.data].sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)).slice(0, 6),
    [bookings.data],
  );

  async function moderate(id: string, status: "approved" | "rejected") {
    setBusy(id + status);
    try {
      await setBouncerStatus(id, status);
      toast(status === "approved" ? "Bouncer approved and now visible to customers." : "Application declined.");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(null);
    }
  }

  const loading = users.loading || bouncers.loading || bookings.loading;
  const maxBar = Math.max(1, ...Object.values(stats.byStatus));
  const firstName = state.status === "admin" ? state.profile.name?.split(" ")[0] : "";

  return (
    <>
      <PageHeader title={`Hello${firstName ? `, ${firstName}` : ""}`} subtitle="Here's how Haven is doing today." />
      <ErrorNote error={users.error || bouncers.error || bookings.error} />
      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total users" value={users.data.length} icon={Users} hint={`${stats.customers} customers · ${stats.bouncers} bouncers`} />
            <Stat label="Bouncer profiles" value={bouncers.data.length} icon={ShieldUser} hint={`${bouncers.data.filter((b) => b.status === "approved").length} approved`} />
            <Stat label="Awaiting review" value={stats.pending.length} icon={Clock} hint="Bouncer applications" />
            <Stat label="Revenue" value={fmtMoney(stats.revenue, settings.currency)} icon={Wallet} hint="From completed bookings" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <Card className="p-5 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-ink">Bookings by status</h2>
                <span className="text-sm text-muted">{bookings.data.length} total</span>
              </div>
              <div className="mt-5 space-y-4">
                {BOOKING_STATUSES.map((s) => (
                  <div key={s}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="capitalize text-ink">{s}</span>
                      <span className="text-muted">{stats.byStatus[s]}</span>
                    </div>
                    <div className="h-2 rounded-full bg-cream">
                      <div
                        className={`h-2 rounded-full ${BAR_COLORS[s]} transition-all`}
                        style={{ width: `${(stats.byStatus[s] / maxBar) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="lg:col-span-3">
              <div className="flex items-center justify-between px-5 pt-5">
                <h2 className="font-semibold text-ink">Waiting for approval</h2>
                <Link href="/bouncers" className="flex items-center gap-1 text-sm text-sage hover:text-sage-dark">
                  All bouncers <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              {stats.pending.length === 0 ? (
                <Empty title="You're all caught up" hint="No bouncer applications are waiting." />
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {stats.pending.slice(0, 5).map((b) => (
                    <li key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <Avatar name={b.name} url={b.photoUrl} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{b.name}</p>
                        <p className="truncate text-xs text-muted">
                          {b.city || "—"} · {b.experienceYears ?? 0} yrs · {fmtMoney(b.hourlyRate, settings.currency)}/hr
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" loading={busy === b.id + "rejected"} onClick={() => moderate(b.id, "rejected")}>
                          Decline
                        </Button>
                        <Button size="sm" loading={busy === b.id + "approved"} onClick={() => moderate(b.id, "approved")}>
                          Approve
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="font-semibold text-ink">Recent bookings</h2>
              <Link href="/bookings" className="flex items-center gap-1 text-sm text-sage hover:text-sage-dark">
                All bookings <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {recent.length === 0 ? (
              <Empty title="No bookings yet" hint="They'll appear here as soon as customers start booking." />
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {recent.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cream text-muted">
                      <CalendarCheck className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {b.customerName} <span className="font-normal text-muted">booked</span> {b.bouncerName}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {b.eventType} · {fmtDate(b.eventDate, true)} · {b.location}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-ink">{fmtMoney(b.totalAmount, settings.currency)}</span>
                    <Badge value={b.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
