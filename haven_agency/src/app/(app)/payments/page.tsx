"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Wallet } from "lucide-react";
import { useData } from "@/components/DataProvider";
import { Bars } from "@/components/charts";
import { Button, Card, CardHeader, EmptyState, PageHeader, Stat, StatusBadge, Table, Tabs, Td, Th, Tr } from "@/components/ui";
import { useActor } from "@/lib/useActor";
import { exportXlsx } from "@/lib/excel";
import { fmtDate, fmtMoney, ymd } from "@/lib/format";
import { agencyShare, bookingMonth, earnings, lastMonths, monthLabel } from "@/lib/metrics";
import type { Booking } from "@/lib/types";

export default function PaymentsPage() {
  const { bookings, transactions, settings } = useData();
  const { agency } = useActor();
  const cur = settings.currency;
  const [tab, setTab] = useState<"bookings" | "transactions" | "monthly">("bookings");
  const money = useMemo(() => earnings(bookings), [bookings]);
  const billable = bookings.filter((b) => ["ongoing", "completed"].includes(b.status) || b.paymentStatus !== "unpaid");
  const months = lastMonths(6).map((m) => ({ m, value: bookings.filter((b) => b.status === "completed" && bookingMonth(b) === m).reduce((s, b) => s + agencyShare(b), 0) }));
  const fm = (n: number) => fmtMoney(n, cur);

  const invoice = (b: Booking) => {
    const w = window.open("", "_blank"); if (!w) return;
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
    w.document.write(`<html><head><title>Invoice ${b.id.slice(0, 8)}</title><style>body{font:14px/1.6 system-ui;max-width:680px;margin:48px auto;color:#111}table{width:100%;border-collapse:collapse;margin-top:24px}td{padding:8px 0;border-bottom:1px solid #eee}td:last-child{text-align:right}.t td{font-weight:600;border:0}.m{color:#666}</style></head><body>
      <h2>Tax invoice</h2><p class="m">${esc(agency.name)} · ${esc(agency.address || agency.city)}<br/>Reg: ${esc(agency.registrationNo || "—")} · Licence: ${esc(agency.licenseNo || "—")}</p>
      <p><b>Bill to:</b> ${esc(b.customerName)}<br/><b>Invoice no:</b> HV-${b.id.slice(0, 8).toUpperCase()} · <b>Date:</b> ${fmtDate(b.eventDate)}</p>
      <table><tr><td>${esc(b.serviceLabel)}: ${b.personnelCount} × ${b.hours}h @ ${fm(b.hourlyRate)}</td><td>${fm(b.subtotal)}</td></tr><tr><td>Platform fee</td><td>${fm(b.platformFee)}</td></tr><tr><td>Tax</td><td>${fm(b.tax)}</td></tr><tr class="t"><td>Total</td><td>${fm(b.totalAmount)}</td></tr></table>
      <p class="m">Payment status: ${b.paymentStatus}</p><script>print()</script></body></html>`);
    w.document.close();
  };

  return (
    <>
      <PageHeader title="Payments & earnings" desc="Your earnings are the booking subtotal. The platform fee and tax are collected by Haven and shown for reference."
        actions={<Button icon={<Download className="h-4 w-4" />} disabled={!billable.length} onClick={() => exportXlsx(`payments-${ymd(new Date())}`, billable.map((b) => ({
          Date: fmtDate(b.eventDate), Client: b.customerName, Service: b.serviceLabel, "Your earnings": agencyShare(b), "Platform fee": b.platformFee, Tax: b.tax, "Client paid": b.totalAmount, Status: b.paymentStatus,
        })), "Payments")}>Payment report</Button>} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total earnings" value={fm(money.total)} sub="Completed and ongoing" />
        <Stat label="Received" value={fm(money.received)} />
        <Stat label="Pending" value={fm(money.pending)} sub="Awaiting client payment or payout" />
        <Stat label="Refunds" value={fm(money.refunded)} sub={`Commission ${fm(money.commission)} · Tax ${fm(money.tax)}`} />
      </div>

      <Card className="mb-6">
        <CardHeader title="Monthly earnings" desc="Completed bookings, last 6 months" />
        <div className="p-5"><Bars data={months.map((x) => ({ label: monthLabel(x.m), value: x.value }))} format={fm} /></div>
      </Card>

      <Tabs value={tab} onChange={setTab} className="mb-4" items={[{ value: "bookings", label: "By booking", count: billable.length }, { value: "transactions", label: "Transactions", count: transactions.length }, { value: "monthly", label: "Monthly" }]} />
      <Card>
        {tab === "bookings" && (!billable.length ? <EmptyState icon={<Wallet className="h-5 w-5" />} title="No earnings yet" desc="Completed bookings and their payment status appear here." /> : (
          <Table>
            <thead><tr><Th>Date</Th><Th>Client</Th><Th>Service</Th><Th className="text-right">Your earnings</Th><Th className="text-right">Fee</Th><Th className="text-right">Tax</Th><Th>Payment</Th><Th /></tr></thead>
            <tbody>{billable.map((b) => (
              <Tr key={b.id}><Td className="tnum">{fmtDate(b.eventDate)}</Td><Td className="font-medium text-ink">{b.customerName}</Td><Td>{b.serviceLabel}</Td>
                <Td className="tnum text-right font-medium text-ink">{fm(agencyShare(b))}</Td><Td className="tnum text-right text-muted">{fm(b.platformFee)}</Td><Td className="tnum text-right text-muted">{fm(b.tax)}</Td>
                <Td><StatusBadge status={b.paymentStatus} /></Td><Td className="text-right"><Button size="sm" variant="ghost" icon={<FileText className="h-3.5 w-3.5" />} onClick={() => invoice(b)}>Invoice</Button></Td></Tr>
            ))}</tbody>
          </Table>
        ))}
        {tab === "transactions" && (!transactions.length ? <EmptyState title="No transactions yet" desc="Payments, refunds and payouts recorded by Haven appear here." /> : (
          <Table>
            <thead><tr><Th>Date</Th><Th>Type</Th><Th>Booking</Th><Th>Note</Th><Th className="text-right">Amount</Th><Th>Status</Th></tr></thead>
            <tbody>{transactions.map((t) => (
              <Tr key={t.id}><Td className="tnum">{fmtDate(t.createdAt)}</Td><Td className="capitalize">{t.type}</Td><Td className="font-mono text-xs">{t.bookingId?.slice(0, 8)}</Td><Td className="text-muted">{t.note}</Td>
                <Td className="tnum text-right font-medium">{t.type === "refund" || t.type === "commission" ? "−" : ""}{fm(t.amount)}</Td><Td><StatusBadge status={t.status === "completed" ? "paid" : "pending"} /></Td></Tr>
            ))}</tbody>
          </Table>
        ))}
        {tab === "monthly" && (
          <Table>
            <thead><tr><Th>Month</Th><Th className="text-right">Bookings</Th><Th className="text-right">Earnings</Th><Th /></tr></thead>
            <tbody>{lastMonths(12).reverse().map((m) => {
              const rows = bookings.filter((b) => b.status === "completed" && bookingMonth(b) === m);
              return <Tr key={m}><Td>{new Date(m + "-01T00:00:00").toLocaleString(undefined, { month: "long", year: "numeric" })}</Td><Td className="tnum text-right">{rows.length}</Td><Td className="tnum text-right font-medium">{fm(rows.reduce((s, b) => s + agencyShare(b), 0))}</Td>
                <Td className="text-right"><Button size="sm" variant="ghost" disabled={!rows.length} onClick={() => exportXlsx(`earnings-${m}`, rows.map((b) => ({ Date: fmtDate(b.eventDate), Client: b.customerName, Service: b.serviceLabel, Earnings: agencyShare(b), Status: b.paymentStatus })), m)}>Download</Button></Td></Tr>;
            })}</tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
