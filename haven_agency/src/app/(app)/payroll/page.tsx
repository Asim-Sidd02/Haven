"use client";

import { useMemo, useState } from "react";
import { Banknote, Calculator, Check, Download } from "lucide-react";
import { useData } from "@/components/DataProvider";
import { Avatar, Button, Card, Drawer, EmptyState, Field, Input, KV, PageHeader, Stat, StatusBadge, Table, Td, Th, Tr, useConfirm } from "@/components/ui";
import { useActor } from "@/lib/useActor";
import { bulkCreate, bulkPatch, now, patch } from "@/lib/actions";
import { exportXlsx } from "@/lib/excel";
import { fmtMoney, ym } from "@/lib/format";
import type { Payroll } from "@/lib/types";

/**
 * Payroll is generated from attendance: days present × daily wage + overtime.
 * Managers then adjust advances and deductions per person before marking paid.
 */
export default function PayrollPage() {
  const { payroll, personnel, attendance, settings } = useData();
  const { agency, run } = useActor();
  const confirm = useConfirm();
  const [month, setMonth] = useState(ym(new Date()));
  const [edit, setEdit] = useState<Payroll | null>(null);
  const fm = (n: number) => fmtMoney(n, settings.currency);

  const rows = payroll.filter((p) => p.month === month);
  const totals = useMemo(() => ({ net: rows.reduce((s, r) => s + r.net, 0), paid: rows.filter((r) => r.status === "paid").reduce((s, r) => s + r.net, 0), pending: rows.filter((r) => r.status === "pending").length }), [rows]);

  const generate = async () => {
    const existing = new Set(rows.map((r) => r.personnelId));
    const people = personnel.filter((p) => p.active && !existing.has(p.id));
    const recs = people.map((p) => {
      const days = new Set(attendance.filter((a) => a.personnelId === p.id && a.date.startsWith(month) && a.status !== "absent").map((a) => a.date)).size;
      const ot = attendance.filter((a) => a.personnelId === p.id && a.date.startsWith(month)).reduce((s, a) => s + (a.overtimeHours || 0), 0);
      const wage = p.dailyWage || 0;
      const overtimePay = Math.round(ot * (wage / 8) * 1.5);
      return { agencyId: agency.id, personnelId: p.id, personnelName: p.name, month, daysWorked: days, dailyWage: wage, overtimePay, advance: 0, deductions: 0, net: days * wage + overtimePay, status: "pending", paidAt: null };
    }).filter((r) => r.daysWorked > 0 || r.overtimePay > 0);
    if (!recs.length) { run(async () => { throw new Error(rows.length ? "Payroll is already up to date for this month." : "No attendance recorded for this month yet."); }, ""); return; }
    run(() => bulkCreate("payroll", recs), `Payroll generated for ${recs.length} people`, ["Generated payroll", month]);
  };

  return (
    <>
      <PageHeader title="Salary & payroll" desc="Generated from attendance. Overtime is paid at 1.5× the hourly equivalent of the daily wage (8-hour day)."
        actions={<>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" aria-label="Month" />
          <Button icon={<Download className="h-4 w-4" />} disabled={!rows.length} onClick={() => exportXlsx(`salary-${month}`, rows.map((r) => ({ Name: r.personnelName, Month: r.month, "Days worked": r.daysWorked, "Daily wage": r.dailyWage, Overtime: r.overtimePay, Advance: r.advance, Deductions: r.deductions, "Net pay": r.net, Status: r.status })), "Salary")}>Salary statement</Button>
          <Button variant="primary" icon={<Calculator className="h-4 w-4" />} onClick={generate}>Generate from attendance</Button>
        </>} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="People on payroll" value={rows.length} />
        <Stat label="Total net pay" value={fm(totals.net)} />
        <Stat label="Paid" value={fm(totals.paid)} />
        <Stat label="Pending payments" value={totals.pending} />
      </div>
      <Card>
        {!rows.length ? <EmptyState icon={<Banknote className="h-5 w-5" />} title={`No payroll for ${new Date(month + "-01T00:00:00").toLocaleString(undefined, { month: "long", year: "numeric" })}`} desc="Generate it from this month’s attendance. You can adjust advances and deductions before paying." action={<Button variant="primary" onClick={generate}>Generate payroll</Button>} /> : (
          <>
            <Table>
              <thead><tr><Th>Person</Th><Th className="text-right">Days</Th><Th className="text-right">Wages</Th><Th className="text-right">Overtime</Th><Th className="text-right">Advance</Th><Th className="text-right">Deductions</Th><Th className="text-right">Net pay</Th><Th>Status</Th></tr></thead>
              <tbody>{rows.map((r) => (
                <Tr key={r.id} onClick={() => setEdit(r)}>
                  <Td><div className="flex items-center gap-3"><Avatar name={r.personnelName} size={28} /><span className="font-medium text-ink">{r.personnelName}</span></div></Td>
                  <Td className="tnum text-right">{r.daysWorked}</Td><Td className="tnum text-right">{fm(r.daysWorked * r.dailyWage)}</Td><Td className="tnum text-right">{fm(r.overtimePay)}</Td>
                  <Td className="tnum text-right text-muted">{r.advance ? `−${fm(r.advance)}` : "—"}</Td><Td className="tnum text-right text-muted">{r.deductions ? `−${fm(r.deductions)}` : "—"}</Td>
                  <Td className="tnum text-right font-semibold text-ink">{fm(r.net)}</Td><Td><StatusBadge status={r.status} /></Td>
                </Tr>
              ))}</tbody>
            </Table>
            {totals.pending > 0 && <div className="flex justify-end border-t border-line p-4"><Button variant="primary" icon={<Check className="h-4 w-4" />} onClick={async () => {
              const r = await confirm({ title: `Mark ${totals.pending} salaries as paid?`, desc: "Do this after you’ve transferred the money.", confirm: "Mark paid" });
              if (r.ok) run(() => bulkPatch("payroll", rows.filter((x) => x.status === "pending").map((x) => x.id), { status: "paid", paidAt: now() }), "Salaries marked paid", ["Paid salaries", month]);
            }}>Mark all paid</Button></div>}
          </>
        )}
      </Card>
      {edit && <EditPay row={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function EditPay({ row, onClose }: { row: Payroll; onClose: () => void }) {
  const { run } = useActor();
  const { settings, payroll } = useData();
  const [f, setF] = useState({ daysWorked: row.daysWorked, dailyWage: row.dailyWage, overtimePay: row.overtimePay, advance: row.advance, deductions: row.deductions });
  const net = f.daysWorked * f.dailyWage + f.overtimePay - f.advance - f.deductions;
  const history = payroll.filter((p) => p.personnelId === row.personnelId && p.id !== row.id).sort((a, b) => b.month.localeCompare(a.month));
  const num = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Number(e.target.value) || 0 });
  const fm = (n: number) => fmtMoney(n, settings.currency);
  return (
    <Drawer open onClose={onClose} title={row.personnelName} subtitle={`Salary for ${new Date(row.month + "-01T00:00:00").toLocaleString(undefined, { month: "long", year: "numeric" })}`}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        {row.status === "pending" && <Button onClick={() => run(() => patch("payroll", row.id, { ...f, net }, false), "Saved", ["Adjusted salary", row.personnelName]).then((ok) => ok && onClose())}>Save</Button>}
        {row.status === "pending" && <Button variant="primary" onClick={() => run(() => patch("payroll", row.id, { ...f, net, status: "paid", paidAt: now() }, false), "Marked paid", ["Paid salary", row.personnelName]).then((ok) => ok && onClose())}>Save & mark paid</Button>}
      </>}>
      <fieldset disabled={row.status === "paid"} className="grid gap-4 sm:grid-cols-2">
        <Field label="Days worked"><Input type="number" min={0} value={f.daysWorked} onChange={num("daysWorked")} /></Field>
        <Field label="Daily wage"><Input type="number" min={0} value={f.dailyWage} onChange={num("dailyWage")} /></Field>
        <Field label="Overtime pay"><Input type="number" min={0} value={f.overtimePay} onChange={num("overtimePay")} /></Field>
        <Field label="Advance already paid"><Input type="number" min={0} value={f.advance} onChange={num("advance")} /></Field>
        <Field label="Other deductions" className="sm:col-span-2"><Input type="number" min={0} value={f.deductions} onChange={num("deductions")} /></Field>
      </fieldset>
      <div className="mt-6 divide-y divide-line rounded-xl border border-line px-4">
        <KV k="Wages" v={fm(f.daysWorked * f.dailyWage)} /><KV k="Overtime" v={fm(f.overtimePay)} /><KV k="Advance & deductions" v={`−${fm(f.advance + f.deductions)}`} />
        <KV k="Net pay" v={<span className="text-lg">{fm(net)}</span>} />
      </div>
      {history.length > 0 && <div className="mt-6"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Salary history</p>
        <div className="divide-y divide-line">{history.map((h) => <KV key={h.id} k={h.month} v={<span className="flex items-center gap-2">{fm(h.net)}<StatusBadge status={h.status} /></span>} />)}</div></div>}
    </Drawer>
  );
}
