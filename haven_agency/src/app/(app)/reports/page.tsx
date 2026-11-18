"use client";

import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { useData } from "@/components/DataProvider";
import { Bars, Breakdown, Ring } from "@/components/charts";
import { Button, Card, CardHeader, PageHeader, Segmented, Stat, Table, Td, Th, Tr } from "@/components/ui";
import { exportXlsx, type Row } from "@/lib/excel";
import { fmtMoney, ymd } from "@/lib/format";
import { agencyShare, bookingMonth, lastMonths, monthLabel } from "@/lib/metrics";

export default function ReportsPage() {
  const d = useData();
  const [range, setRange] = useState<"3" | "6" | "12">("6");
  const months = lastMonths(Number(range));
  const inRange = d.bookings.filter((b) => months.includes(bookingMonth(b)));
  const fm = (n: number) => fmtMoney(n, d.settings.currency);

  const r = useMemo(() => {
    const done = inRange.filter((b) => b.status === "completed");
    const cancelled = inRange.filter((b) => ["cancelled", "declined"].includes(b.status));
    const att = d.attendance.filter((a) => months.includes(a.date.slice(0, 7)));
    const byService = new Map<string, { n: number; rev: number }>();
    done.forEach((b) => { const x = byService.get(b.serviceLabel) ?? { n: 0, rev: 0 }; x.n++; x.rev += agencyShare(b); byService.set(b.serviceLabel, x); });
    const perf = d.personnel.map((p) => {
      const pa = att.filter((a) => a.personnelId === p.id);
      return { name: p.name, code: p.code, shifts: done.filter((b) => b.assignedIds?.includes(p.id)).length, late: pa.filter((a) => a.status === "late").length, absent: pa.filter((a) => a.status === "absent").length, overtime: pa.reduce((s, a) => s + (a.overtimeHours || 0), 0) };
    }).filter((p) => p.shifts || p.late || p.absent).sort((a, b) => b.shifts - a.shifts);
    const reviews = d.reviews.filter((x) => months.some((m) => ymd(x.createdAt?.toDate?.() ?? new Date(0)).startsWith(m)));
    return {
      done, cancelled, att, perf, reviews,
      revenue: done.reduce((s, b) => s + agencyShare(b), 0),
      onTime: att.length ? Math.round((att.filter((a) => a.status === "present").length / att.length) * 100) : 0,
      cancelRate: inRange.length ? Math.round((cancelled.length / inRange.length) * 100) : 0,
      byService: [...byService.entries()].map(([label, x]) => ({ label, value: x.rev, n: x.n })).sort((a, b) => b.value - a.value),
      reasons: Object.entries(cancelled.reduce<Record<string, number>>((m, b) => { const k = b.status === "declined" ? "Declined by agency" : b.cancelReason ? "Cancelled with reason" : "Cancelled by client"; m[k] = (m[k] ?? 0) + 1; return m; }, {})).map(([label, value]) => ({ label, value })),
      salary: d.payroll.filter((p) => months.includes(p.month)).reduce((s, p) => s + p.net, 0),
    };
  }, [d, inRange, months]);

  const exp = (name: string, rows: Row[]) => exportXlsx(`${name}-${ymd(new Date())}`, rows.length ? rows : [{ Note: "No data in this period" }], name);
  const REPORTS: [string, () => void][] = [
    ["Bookings", () => exp("bookings", inRange.map((b) => ({ Date: ymd(b.eventDate?.toDate() ?? new Date()), Client: b.customerName, Service: b.serviceLabel, Personnel: b.personnelCount, Hours: b.hours, Status: b.status, Earnings: agencyShare(b) })))],
    ["Revenue", () => exp("revenue", months.map((m) => ({ Month: m, Earnings: r.done.filter((b) => bookingMonth(b) === m).reduce((s, b) => s + agencyShare(b), 0) })))],
    ["Personnel performance", () => exp("performance", r.perf.map((p) => ({ ID: p.code, Name: p.name, Shifts: p.shifts, Late: p.late, Absent: p.absent, "Overtime (h)": p.overtime })))],
    ["Availability", () => exp("availability", d.personnel.map((p) => ({ ID: p.code, Name: p.name, Availability: p.availability, Verified: p.verificationStatus, Active: p.active ? "Yes" : "No" })))],
    ["Attendance", () => exp("attendance", r.att.map((a) => ({ Date: a.date, Name: a.personnelName, Status: a.status, "Overtime (h)": a.overtimeHours, "Client confirmed": a.clientConfirmed ? "Yes" : "No" })))],
    ["Salary", () => exp("salary", d.payroll.filter((p) => months.includes(p.month)).map((p) => ({ Month: p.month, Name: p.personnelName, Days: p.daysWorked, Net: p.net, Status: p.status })))],
    ["Service-wise", () => exp("services", r.byService.map((s) => ({ Service: s.label, Bookings: s.n, Earnings: s.value })))],
    ["Cancellations", () => exp("cancellations", r.cancelled.map((b) => ({ Date: ymd(b.eventDate?.toDate() ?? new Date()), Client: b.customerName, Status: b.status, Reason: b.cancelReason || b.agencyNote || "" })))],
    ["Client feedback", () => exp("feedback", r.reviews.map((x) => ({ Client: x.customerName, Rating: x.rating, Comment: x.comment, Reply: x.reply ?? "" })))],
  ];

  return (
    <>
      <PageHeader title="Reports & analytics" desc="How your agency is performing. Every report can be exported to Excel or printed as PDF."
        actions={<><Segmented value={range} onChange={setRange} items={[{ value: "3", label: "3 months" }, { value: "6", label: "6 months" }, { value: "12", label: "12 months" }]} />
          <Button icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Save as PDF</Button></>} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Completed bookings" value={r.done.length} sub={`${inRange.length} total in period`} />
        <Stat label="Revenue" value={fm(r.revenue)} />
        <Stat label="Salary paid out" value={fm(r.salary)} sub={r.revenue ? `${Math.round((r.salary / r.revenue) * 100)}% of revenue` : undefined} />
        <Stat label="Cancellation rate" value={`${r.cancelRate}%`} />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card><CardHeader title="Bookings per month" /><div className="p-5"><Bars data={months.map((m) => ({ label: monthLabel(m), value: inRange.filter((b) => bookingMonth(b) === m).length }))} /></div></Card>
        <Card><CardHeader title="Punctuality" desc="Share of check-ins on time" />
          <div className="flex items-center gap-6 p-5"><Ring value={r.onTime} label={`${r.onTime}%`} size={110} />
            <div className="space-y-1 text-sm"><p>{r.att.filter((a) => a.status === "present").length} on time</p><p className="text-muted">{r.att.filter((a) => a.status === "late").length} late</p><p className="text-muted">{r.att.filter((a) => a.status === "absent").length} absent</p></div></div></Card>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card><CardHeader title="Revenue by service" /><div className="p-5">{r.byService.length ? <Breakdown rows={r.byService} format={fm} /> : <p className="text-sm text-muted">No completed bookings in this period.</p>}</div></Card>
        <Card><CardHeader title="Cancellations" /><div className="p-5">{r.reasons.length ? <Breakdown rows={r.reasons} /> : <p className="text-sm text-muted">No cancellations. Nice.</p>}</div></Card>
      </div>

      <Card className="mb-6">
        <CardHeader title="Personnel performance" desc="Top 10 by completed shifts" />
        {!r.perf.length ? <p className="p-5 text-sm text-muted">No shifts in this period.</p> : (
          <Table><thead><tr><Th>Person</Th><Th className="text-right">Shifts</Th><Th className="text-right">Late</Th><Th className="text-right">Absent</Th><Th className="text-right">Overtime</Th></tr></thead>
            <tbody>{r.perf.slice(0, 10).map((p) => <Tr key={p.code}><Td className="font-medium text-ink">{p.name} <span className="font-mono text-xs text-muted">{p.code}</span></Td><Td className="tnum text-right">{p.shifts}</Td><Td className="tnum text-right">{p.late}</Td><Td className="tnum text-right">{p.absent}</Td><Td className="tnum text-right">{p.overtime}h</Td></Tr>)}</tbody></Table>
        )}
      </Card>

      <Card className="no-print">
        <CardHeader title="Export reports" desc={`Excel files for the last ${range} months`} />
        <div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {REPORTS.map(([name, fn]) => <button key={name} onClick={fn} className="flex items-center justify-between rounded-lg border border-line px-4 py-3 text-left text-sm transition hover:border-ink/40 hover:bg-canvas"><span className="font-medium text-ink">{name} report</span><Download className="h-4 w-4 text-muted" /></button>)}
        </div>
      </Card>
    </>
  );
}
