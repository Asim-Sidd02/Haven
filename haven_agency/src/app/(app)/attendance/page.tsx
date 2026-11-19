"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ClipboardCheck, Download, LogIn, LogOut, MapPin, Smartphone, UserX } from "lucide-react";
import { useData } from "@/components/DataProvider";
import {
  Avatar, Badge, Button, Card, CardHeader, EmptyState, PageHeader, SearchInput, Stat, StatusBadge, Table, Tabs, Td, Th, Tr, useConfirm,
} from "@/components/ui";
import { useActor } from "@/lib/useActor";
import { missedCheckIns, now, patch, put } from "@/lib/actions";
import { exportXlsx } from "@/lib/excel";
import { fmtDate, fmtTime, matches, toDate, ymd } from "@/lib/format";
import type { Attendance, AssignedPerson, Booking, GeoPoint } from "@/lib/types";

const GRACE_MIN = 15;

export default function Page() { return <Suspense><AttendancePage /></Suspense>; }

function AttendancePage() {
  const { bookings, attendance, assignments } = useData();
  const params = useSearchParams();
  const [tab, setTab] = useState<"today" | "exceptions" | "records" | "corrections">((params.get("tab") as "corrections") || "today");
  const missed = useMemo(() => missedCheckIns(assignments, bookings, attendance), [assignments, bookings, attendance]);
  const [q, setQ] = useState("");
  const today = ymd(new Date());

  const todays = useMemo(() => bookings.filter((b) => ["assigned", "confirmed", "ongoing"].includes(b.status) && b.eventDate && ymd(b.eventDate.toDate()) === today), [bookings, today]);
  const todayRecs = attendance.filter((a) => a.date === today);
  const corrections = attendance.filter((a) => a.correction?.status === "open");
  const rows = attendance.filter((a) => matches(q, a.personnelName, a.date, a.status));

  return (
    <>
      <PageHeader title="Attendance & duty" desc={`Check people in and out. Arrivals more than ${GRACE_MIN} minutes after the start are marked late, and extra hours count as overtime for payroll.`}
        actions={<Button icon={<Download className="h-4 w-4" />} disabled={!attendance.length} onClick={() => exportXlsx(`attendance-${today}`, attendance.map((a) => ({
          Date: a.date, Person: a.personnelName, "Check in": fmtTime(a.checkIn), "Check out": fmtTime(a.checkOut), Status: a.status,
          "Overtime (h)": a.overtimeHours, "Client confirmed": a.clientConfirmed ? "Yes" : "No", Booking: a.bookingId,
        })), "Attendance")}>Export report</Button>} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="On duty today" value={todays.reduce((s, b) => s + (b.assignedIds?.length ?? 0), 0)} />
        <Stat label="Checked in" value={todayRecs.filter((a) => a.checkIn).length} />
        <Stat label="Late today" value={todayRecs.filter((a) => a.status === "late").length} />
        <Stat label="Missed check-ins" value={missed.length} sub={missed.length ? "Needs follow-up" : "None"} onClick={() => setTab("exceptions")} />
      </div>
      <Tabs value={tab} onChange={setTab} className="mb-4" items={[
        { value: "today", label: "Today’s duty" }, { value: "exceptions", label: "Missed check-ins", count: missed.length }, { value: "records", label: "All records", count: attendance.length }, { value: "corrections", label: "Correction requests", count: corrections.length },
      ]} />

      {tab === "today" && (todays.length ? <div className="space-y-4">{todays.map((b) => <DutyCard key={b.id} booking={b} records={attendance.filter((a) => a.bookingId === b.id)} />)}</div>
        : <Card><EmptyState icon={<ClipboardCheck className="h-5 w-5" />} title="No duty scheduled today" desc="Bookings with an assigned team for today appear here for check-in." /></Card>)}

      {tab === "exceptions" && <Card>{missed.length ? (
        <ul className="divide-y divide-line">{missed.map((a) => {
          const b = bookings.find((x) => x.id === a.bookingId);
          return (
            <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <AlertTriangle className="h-4 w-4 text-danger" />
              <div className="min-w-0 flex-1"><p className="text-sm font-medium text-ink">{a.personnelName}</p>
                <p className="text-xs text-muted">{b?.customerName ?? a.customerName} · {b?.serviceLabel ?? a.serviceLabel} · started {fmtDate(b?.eventDate ?? a.eventDate, true)}</p></div>
              <Badge tone="danger">Exception</Badge>
            </li>
          );
        })}</ul>
      ) : <EmptyState icon={<ClipboardCheck className="h-5 w-5" />} title="No missed check-ins" desc="Accepted assignments with no check-in 30 minutes after the start time appear here." />}</Card>}

      {tab === "records" && (
        <Card>
          <div className="border-b border-line p-4"><SearchInput value={q} onChange={setQ} placeholder="Search person, date or status" /></div>
          {!rows.length ? <EmptyState title="No attendance records yet" /> : (
            <Table>
              <thead><tr><Th>Date</Th><Th>Person</Th><Th>Check in</Th><Th>Check out</Th><Th>Source</Th><Th>Status</Th><Th>Overtime</Th><Th>Client</Th></tr></thead>
              <tbody>{rows.map((a) => (
                <Tr key={a.id}>
                  <Td className="tnum">{a.date}</Td><Td className="font-medium text-ink">{a.personnelName}</Td>
                  <Td className="tnum">{fmtTime(a.checkIn)} <MapLink loc={a.checkInLocation} /></Td><Td className="tnum">{fmtTime(a.checkOut)} <MapLink loc={a.checkOutLocation} /></Td>
                  <Td>{a.source === "app" ? <Badge tone="dark"><Smartphone className="h-3 w-3" />App</Badge> : <Badge tone="muted">Agency</Badge>}</Td>
                  <Td><StatusBadge status={a.status} /></Td><Td className="tnum">{a.overtimeHours ? `${a.overtimeHours}h` : "—"}</Td>
                  <Td>{a.clientConfirmed ? <Badge tone="solid">Confirmed</Badge> : <Badge tone="dashed">Not yet</Badge>}</Td>
                </Tr>
              ))}</tbody>
            </Table>
          )}
        </Card>
      )}

      {tab === "corrections" && <Card>{corrections.length ? <ul className="divide-y divide-line">{corrections.map((a) => <Correction key={a.id} a={a} />)}</ul>
        : <EmptyState title="No open correction requests" desc="When a client or team member disputes an attendance record, it appears here." />}</Card>}
    </>
  );
}

function DutyCard({ booking: b, records }: { booking: Booking; records: Attendance[] }) {
  const { run } = useActor();
  const confirm = useConfirm();
  const start = toDate(b.eventDate)!;

  const checkIn = (p: AssignedPerson) => {
    const late = Date.now() > start.getTime() + GRACE_MIN * 60000;
    return run(async () => {
      // Same id the bouncer app uses, so a manual mark and an app check-in can never duplicate.
      await put("attendance", `${b.id}_${p.personnelId}`, {
        agencyId: b.agencyId, bookingId: b.id, customerId: b.customerId, personnelId: p.personnelId, personnelName: p.name, date: ymd(start),
        scheduledStart: b.eventDate, checkIn: now(), checkOut: null, status: late ? "late" : "present", overtimeHours: 0, clientConfirmed: false, correction: null,
        source: "agency", checkInLocation: null, checkOutLocation: null,
      });
      if (b.status === "confirmed") await patch("bookings", b.id, { status: "ongoing" });
    }, `${p.name} checked in${late ? " (late)" : ""}`, ["Checked in", p.name]);
  };
  const checkOut = (a: Attendance) => {
    const worked = (Date.now() - (a.checkIn?.toMillis() ?? Date.now())) / 3600000;
    const overtime = Math.max(0, Math.round((worked - b.hours) * 10) / 10);
    return run(() => patch("attendance", a.id, { checkOut: now(), overtimeHours: overtime }, false), `${a.personnelName} checked out${overtime ? ` · ${overtime}h overtime` : ""}`, ["Checked out", a.personnelName]);
  };

  return (
    <Card>
      <CardHeader title={`${b.customerName} · ${b.serviceLabel}`} desc={`Starts ${fmtTime(b.eventDate)} · ${b.hours}h · ${b.location}`} action={<StatusBadge status={b.status} />} />
      <ul className="divide-y divide-line">
        {b.assigned.map((p) => {
          const rec = records.find((r) => r.personnelId === p.personnelId);
          return (
            <li key={p.personnelId} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <Avatar name={p.name} url={p.photoUrl} size={32} />
              <div className="min-w-0 flex-1"><p className="text-sm font-medium text-ink">{p.name}</p>
                <p className="flex flex-wrap items-center gap-1 text-xs text-muted">{rec ? <>In {fmtTime(rec.checkIn)} <MapLink loc={rec.checkInLocation} />{rec.checkOut && <> · Out {fmtTime(rec.checkOut)} <MapLink loc={rec.checkOutLocation} /></>}
                  {rec.source === "app" && <span className="inline-flex items-center gap-0.5"> · <Smartphone className="h-3 w-3" />via app</span>}</> : "Not checked in"}</p></div>
              {rec && <StatusBadge status={rec.status} />}
              {!rec && <>
                <Button size="sm" variant="ghost" icon={<UserX className="h-3.5 w-3.5" />} onClick={async () => {
                  const r = await confirm({ title: `Mark ${p.name} absent?`, desc: "Consider assigning a replacement from Assignments.", confirm: "Mark absent", danger: true });
                  if (r.ok) run(() => put("attendance", `${b.id}_${p.personnelId}`, { agencyId: b.agencyId, bookingId: b.id, customerId: b.customerId, personnelId: p.personnelId, personnelName: p.name, date: ymd(start), scheduledStart: b.eventDate, checkIn: null, checkOut: null, status: "absent", overtimeHours: 0, clientConfirmed: false, correction: null, source: "agency", checkInLocation: null, checkOutLocation: null }), `${p.name} marked absent`, ["Marked absent", p.name]);
                }}>Absent</Button>
                <Button size="sm" variant="primary" icon={<LogIn className="h-3.5 w-3.5" />} onClick={() => checkIn(p)}>Check in</Button>
              </>}
              {rec?.checkIn && !rec.checkOut && <Button size="sm" icon={<LogOut className="h-3.5 w-3.5" />} onClick={() => checkOut(rec)}>Check out</Button>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Correction({ a }: { a: Attendance }) {
  const { run } = useActor();
  const resolve = (status: "approved" | "rejected", extra: Record<string, unknown> = {}) =>
    run(() => patch("attendance", a.id, { correction: { ...a.correction, status }, ...extra }, false), status === "approved" ? "Correction approved" : "Correction rejected", [`Attendance correction ${status}`, a.personnelName]);
  return (
    <li className="flex flex-wrap items-center gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{a.personnelName} · {fmtDate(new Date(a.date + "T00:00:00"))}</p>
        <p className="text-[13px] text-muted">Recorded as <b>{a.status}</b>. Request: “{a.correction?.reason}”</p>
      </div>
      <Button size="sm" variant="ghost" onClick={() => resolve("rejected")}>Reject</Button>
      <Button size="sm" variant="primary" onClick={() => resolve("approved", a.status !== "present" ? { status: "present" } : {})}>Approve & mark present</Button>
    </li>
  );
}

/** Small Google Maps link for a GPS fix recorded by the bouncer app. */
function MapLink({ loc }: { loc?: GeoPoint | null }) {
  if (!loc || typeof loc.lat !== "number") return null;
  return (
    <a href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
      title={loc.accuracy ? `±${Math.round(loc.accuracy)} m` : "Open in Google Maps"} className="inline-flex items-center text-muted hover:text-ink">
      <MapPin className="h-3.5 w-3.5" />
    </a>
  );
}
