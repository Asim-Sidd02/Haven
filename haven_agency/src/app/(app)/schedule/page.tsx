"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarClock } from "lucide-react";
import { useData } from "@/components/DataProvider";
import { Avatar, Button, Card, EmptyState, PageHeader, SearchInput, Segmented, Stat, Switch, cx } from "@/components/ui";
import { useActor } from "@/lib/useActor";
import { BUFFER_MS, isLive, patch } from "@/lib/actions";
import { matches, ymd } from "@/lib/format";
import type { Booking, Personnel } from "@/lib/types";

type View = "day" | "week" | "month";
const DAY = 86400000;
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const startOfWeek = (d: Date) => { const x = startOfDay(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };

/** What a person is doing on a given day. */
function cellFor(p: Personnel, day: Date, bookings: Booking[]) {
  const s = day.getTime(), e = s + DAY;
  const b = bookings.find((x) => isLive(x) && x.assignedIds?.includes(p.id) && (() => {
    const bs = x.eventDate?.toMillis?.() ?? 0, be = bs + x.hours * 3600000;
    return bs < e && be + BUFFER_MS > s;
  })());
  if (b) return { kind: "booked" as const, b };
  if (p.availability === "on_leave" && (!p.leaveUntil || ymd(day) <= p.leaveUntil)) return { kind: "leave" as const };
  if (p.availability === "unavailable") return { kind: "off" as const };
  return { kind: "free" as const };
}

export default function Schedule() {
  const { personnel, bookings } = useData();
  const { run } = useActor();
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [q, setQ] = useState("");

  const people = personnel.filter((p) => p.active && p.verificationStatus === "verified" && matches(q, p.name, p.code));
  const days = useMemo(() => {
    if (view === "day") return [anchor];
    if (view === "week") { const s = startOfWeek(anchor); return Array.from({ length: 7 }, (_, i) => new Date(s.getTime() + i * DAY)); }
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const s = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => new Date(s.getTime() + i * DAY));
  }, [view, anchor]);

  const shift = (dir: number) => {
    const d = new Date(anchor);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir);
    setAnchor(startOfDay(d));
  };

  const today = ymd(new Date());
  const focus = view === "day" ? anchor : startOfDay(new Date());
  const summary = useMemo(() => {
    const cells = personnel.filter((p) => p.active && p.verificationStatus === "verified").map((p) => cellFor(p, focus, bookings).kind);
    return { free: cells.filter((c) => c === "free").length, booked: cells.filter((c) => c === "booked").length, leave: cells.filter((c) => c === "leave").length, off: cells.filter((c) => c === "off").length };
  }, [personnel, bookings, focus]);

  const title = view === "month" ? anchor.toLocaleString(undefined, { month: "long", year: "numeric" })
    : view === "week" ? `${days[0].toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${days[6].toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`
    : anchor.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <PageHeader title="Availability & scheduling" desc="See who is free, booked or away at a glance. Availability updates automatically when bookings finish. A 2-hour rest buffer is kept between shifts." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Free ${view === "day" ? "this day" : "today"}`} value={summary.free} />
        <Stat label="On duty" value={summary.booked} />
        <Stat label="On leave" value={summary.leave} />
        <Stat label="Unavailable" value={summary.off} />
      </div>
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setAnchor(startOfDay(new Date()))}>Today</Button>
            <button onClick={() => shift(-1)} aria-label="Previous" className="rounded-lg p-1.5 text-muted hover:bg-wash hover:text-ink"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => shift(1)} aria-label="Next" className="rounded-lg p-1.5 text-muted hover:bg-wash hover:text-ink"><ChevronRight className="h-4 w-4" /></button>
            <h2 className="ml-1 text-[15px] font-semibold text-ink">{title}</h2>
          </div>
          <div className="flex flex-1 items-center gap-3 lg:justify-end">
            {view !== "month" && <SearchInput value={q} onChange={setQ} placeholder="Find a person" className="w-full lg:w-56" />}
            <Segmented value={view} onChange={setView} items={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }]} />
          </div>
        </div>

        {!personnel.some((p) => p.verificationStatus === "verified") ? (
          <EmptyState icon={<CalendarClock className="h-5 w-5" />} title="No verified personnel yet" desc="Once your personnel are verified, their schedules show up here." action={<Link href="/verification"><Button>Go to verification</Button></Link>} />
        ) : view === "month" ? (
          <div className="grid grid-cols-7 gap-px bg-line">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="bg-canvas px-2 py-2 text-center text-xs font-medium text-muted">{d}</div>)}
            {days.map((d) => {
              const inMonth = d.getMonth() === anchor.getMonth();
              const dayBookings = bookings.filter((b) => isLive(b) && b.eventDate && ymd(b.eventDate.toDate()) === ymd(d));
              const people = dayBookings.reduce((s, b) => s + (b.assignedIds?.length ?? 0), 0);
              return (
                <button key={d.toISOString()} onClick={() => { setAnchor(d); setView("day"); }}
                  className={cx("min-h-[92px] bg-white p-2 text-left transition hover:bg-canvas", !inMonth && "text-faint")}>
                  <span className={cx("tnum inline-grid h-6 w-6 place-items-center rounded-full text-xs", ymd(d) === today && "bg-ink font-semibold text-white")}>{d.getDate()}</span>
                  {dayBookings.length > 0 && <div className="mt-1 space-y-1">
                    <p className="truncate rounded bg-ink px-1.5 py-0.5 text-[11px] text-white">{dayBookings.length} booking{dayBookings.length > 1 ? "s" : ""}</p>
                    <p className="text-[11px] text-muted">{people} on duty</p>
                  </div>}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 w-56 border-b border-line bg-canvas px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted">Person</th>
                  {days.map((d) => <th key={d.toISOString()} className={cx("border-b border-l border-line bg-canvas px-2 py-2.5 text-center text-xs font-medium", ymd(d) === today ? "text-ink" : "text-muted")}>
                    {d.toLocaleDateString(undefined, { weekday: "short" })} <span className={cx("tnum ml-1 inline-grid h-5 w-5 place-items-center rounded-full", ymd(d) === today && "bg-ink text-white")}>{d.getDate()}</span></th>)}
                  {view === "day" && <th className="border-b border-l border-line bg-canvas px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted">Available for work</th>}
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id}>
                    <td className="sticky left-0 z-10 border-b border-line bg-white px-4 py-2">
                      <Link href={`/personnel?id=${p.id}`} className="flex items-center gap-2.5 hover:underline"><Avatar name={p.name} url={p.photoUrl} size={26} /><span className="truncate font-medium text-ink">{p.name}</span></Link>
                    </td>
                    {days.map((d) => {
                      const c = cellFor(p, d, bookings);
                      return (
                        <td key={d.toISOString()} className="border-b border-l border-line p-1">
                          {c.kind === "booked" ? <Link href={`/bookings?id=${c.b.id}`} title={`${c.b.customerName} · ${c.b.location}`} className="block truncate rounded-md bg-ink px-2 py-1.5 text-xs text-white hover:bg-ink-2">{c.b.customerName}</Link>
                            : c.kind === "leave" ? <div className="rounded-md bg-wash px-2 py-1.5 text-center text-xs text-muted">Leave</div>
                            : c.kind === "off" ? <div className="rounded-md border border-dashed border-line-2 px-2 py-1.5 text-center text-xs text-faint">Off</div>
                            : <div className="h-7" />}
                        </td>
                      );
                    })}
                    {view === "day" && <td className="border-b border-l border-line px-4">
                      <Switch label={`${p.name} available`} checked={p.availability !== "unavailable" && p.availability !== "on_leave"}
                        onChange={(v) => run(() => patch("personnel", p.id, { availability: v ? "available" : "unavailable", ...(v ? { leaveUntil: null } : {}) }), v ? `${p.name} is available` : `${p.name} marked unavailable`, [v ? "Marked available" : "Marked unavailable", p.name])} />
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap gap-4 px-4 py-3 text-xs text-muted">
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-ink" />On a booking (incl. rest buffer)</span>
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-wash" />On leave</span>
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded border border-dashed border-line-2" />Unavailable</span>
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded border border-line" />Free</span>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
