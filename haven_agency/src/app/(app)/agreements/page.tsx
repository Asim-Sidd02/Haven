"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, FilePlus2, FileSignature, Send } from "lucide-react";
import { useData } from "@/components/DataProvider";
import { Badge, Button, Card, Drawer, EmptyState, Field, Input, KV, PageHeader, SearchInput, Section, Segmented, Select, StatusBadge, Table, Td, Textarea, Th, Tr } from "@/components/ui";
import { useActor } from "@/lib/useActor";
import { create, notify, now, patch, remove } from "@/lib/actions";
import { fmtDate, fmtMoney, matches, ymd } from "@/lib/format";
import type { Agreement, Booking } from "@/lib/types";

const termsFor = (agencyName: string, b?: Booking, type: Agreement["type"] = "booking") => type === "booking" && b ? `1. ${agencyName} will provide ${b.personnelCount} ${b.serviceLabel.toLowerCase()} personnel for "${b.eventType}" at ${b.location} on ${fmtDate(b.eventDate, true)} for ${b.hours} hours.
2. Personnel will arrive in the agreed dress code at least 15 minutes before the start time.
3. Attendance is recorded at check-in and check-out; hours beyond the booking are billed as overtime at the same hourly rate.
4. The client will provide safe working conditions and will not ask personnel to act outside the law.
5. Cancellations within 24 hours of the start may be charged as per Haven’s cancellation policy.
6. Payment is made through Haven. ${agencyName} will issue a GST invoice for the services.`
  : `1. ${agencyName} will provide security personnel on a recurring basis between the start and end dates below.
2. Staffing levels, shifts and posts are as listed in the attached schedule and may be changed with 7 days’ written notice.
3. ${agencyName} will replace absent personnel within 2 hours of being informed.
4. Invoices are raised monthly and payable within 15 days.
5. Either party may terminate this agreement with 30 days’ written notice.`;

export default function Page() { return <Suspense><Agreements /></Suspense>; }

function Agreements() {
  const { agreements, bookings } = useData();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "draft" | "sent" | "accepted">("all");
  const [editor, setEditor] = useState<{ open: boolean; ag: Agreement | null; booking?: Booking }>({ open: false, ag: null });

  useEffect(() => {
    const n = params.get("new"), id = params.get("id");
    if (n) setEditor({ open: true, ag: null, booking: bookings.find((b) => b.id === n) });
    if (id) { const a = agreements.find((x) => x.id === id); if (a) setEditor({ open: true, ag: a }); }
  }, [params, bookings, agreements]);
  const close = () => { setEditor({ open: false, ag: null }); router.replace(pathname, { scroll: false }); };

  const shown = agreements.filter((a) => (filter === "all" || a.status === filter) && matches(q, a.title, a.customerName));

  return (
    <>
      <PageHeader title="Agreements" desc="Generate a booking or long-term agreement, send it to the client to accept, and keep every version on record."
        actions={<Button variant="primary" icon={<FilePlus2 className="h-4 w-4" />} onClick={() => setEditor({ open: true, ag: null })}>New agreement</Button>} />
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row">
          <SearchInput value={q} onChange={setQ} placeholder="Search agreements" className="flex-1" />
          <Segmented value={filter} onChange={setFilter} items={[{ value: "all", label: "All" }, { value: "draft", label: "Drafts" }, { value: "sent", label: "Awaiting client" }, { value: "accepted", label: "Accepted" }]} />
        </div>
        {!shown.length ? <EmptyState icon={<FileSignature className="h-5 w-5" />} title="No agreements" desc="Create one from a booking, or a long-term contract for a regular client." /> : (
          <Table>
            <thead><tr><Th>Agreement</Th><Th>Client</Th><Th>Type</Th><Th>Amount</Th><Th>Agency</Th><Th>Client</Th><Th>Status</Th></tr></thead>
            <tbody>{shown.map((a) => (
              <Tr key={a.id} onClick={() => setEditor({ open: true, ag: a })}>
                <Td className="font-medium text-ink">{a.title}<p className="text-xs font-normal text-muted">v{a.version} · {fmtDate(a.updatedAt)}</p></Td>
                <Td>{a.customerName}</Td><Td>{a.type === "booking" ? "Booking" : "Long-term"}</Td><Td className="tnum">{fmtMoney(a.amount)}</Td>
                <Td>{a.agencyAccepted ? <Badge tone="solid">Signed</Badge> : <Badge tone="dashed">—</Badge>}</Td>
                <Td>{a.clientAccepted ? <Badge tone="solid">Signed</Badge> : <Badge tone="dashed">—</Badge>}</Td>
                <Td><StatusBadge status={a.status} /></Td>
              </Tr>
            ))}</tbody>
          </Table>
        )}
      </Card>
      {editor.open && <Editor ag={editor.ag} booking={editor.booking} onClose={close} />}
    </>
  );
}

function Editor({ ag, booking, onClose }: { ag: Agreement | null; booking?: Booking; onClose: () => void }) {
  const { bookings } = useData();
  const { agency, profile, run } = useActor();
  const clientsFromBookings = [...new Map(bookings.map((b) => [b.customerId, b.customerName])).entries()];
  const [f, setF] = useState(() => ({
    type: ag?.type ?? "booking" as Agreement["type"], bookingId: ag?.bookingId ?? booking?.id ?? "", customerId: ag?.customerId ?? booking?.customerId ?? "",
    title: ag?.title ?? (booking ? `${booking.serviceLabel} for ${booking.customerName}, ${fmtDate(booking.eventDate)}` : ""),
    terms: ag?.terms ?? termsFor(agency.name, booking), amount: String(ag?.amount ?? booking?.subtotal ?? ""),
    startDate: ag?.startDate ?? (booking?.eventDate ? ymd(booking.eventDate.toDate()) : ""), endDate: ag?.endDate ?? "",
  }));
  const locked = !!ag && ag.status === "accepted";
  const pickBooking = (id: string) => {
    const b = bookings.find((x) => x.id === id);
    setF({ ...f, bookingId: id, customerId: b?.customerId ?? f.customerId, title: b ? `${b.serviceLabel} for ${b.customerName}, ${fmtDate(b.eventDate)}` : f.title, terms: termsFor(agency.name, b, f.type), amount: String(b?.subtotal ?? f.amount), startDate: b?.eventDate ? ymd(b.eventDate.toDate()) : f.startDate });
  };
  const customerName = clientsFromBookings.find(([id]) => id === f.customerId)?.[1] ?? ag?.customerName ?? "";

  const save = (send: boolean) => run(async () => {
    const entry = { at: now(), by: profile.name, action: send ? (ag?.status === "sent" ? "Amended and re-sent" : "Sent to client") : ag ? "Edited draft" : "Created draft" };
    const data = { type: f.type, bookingId: f.bookingId || null, customerId: f.customerId, customerName, title: f.title.trim(), terms: f.terms, amount: Number(f.amount) || 0,
      startDate: f.startDate, endDate: f.endDate, status: send ? "sent" : "draft", agencyAccepted: send, clientAccepted: false };
    if (ag) await patch("agreements", ag.id, { ...data, version: (ag.version || 1) + (ag.status === "draft" ? 0 : 1), history: [...(ag.history ?? []), entry] });
    else await create("agreements", { ...data, agencyId: agency.id, agencyName: agency.name, version: 1, history: [entry] });
    if (send) await notify(f.customerId, "agreement", `${agency.name} sent you an agreement`, f.title, f.bookingId ? `booking:${f.bookingId}` : "");
  }, send ? "Agreement sent to client" : "Draft saved", [send ? "Sent agreement" : "Saved agreement draft", f.title]).then((ok) => ok && onClose());

  const download = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const esc = (x: string) => x.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
    w.document.write(`<html><head><title>${esc(f.title)}</title><style>body{font:14px/1.6 system-ui;max-width:720px;margin:48px auto;color:#111}h1{font-size:22px}pre{white-space:pre-wrap;font:inherit}.m{color:#666}</style></head><body>
      <h1>${esc(f.title)}</h1><p class="m">${esc(agency.name)} · Client: ${esc(customerName)} · ${f.startDate}${f.endDate ? ` to ${f.endDate}` : ""} · Amount: ${fmtMoney(Number(f.amount))}</p><pre>${esc(f.terms)}</pre>
      <p class="m">Agency accepted: ${ag?.agencyAccepted ? "Yes" : "No"} · Client accepted: ${ag?.clientAccepted ? "Yes" : "No"} · Version ${ag?.version ?? 1}</p><script>print()</script></body></html>`);
    w.document.close();
  };

  return (
    <Drawer open onClose={onClose} width="max-w-2xl" title={ag ? ag.title : "New agreement"} subtitle={ag ? <span className="flex gap-2"><StatusBadge status={ag.status} /><span>Version {ag.version}</span></span> : "Pre-filled from the booking. Review the terms before sending."}
      footer={<>
        {ag?.status === "draft" && <Button variant="ghost" onClick={() => run(() => remove("agreements", ag.id), "Draft deleted").then((ok) => ok && onClose())}>Delete draft</Button>}
        {ag && <Button variant="ghost" icon={<Download className="h-4 w-4" />} onClick={download}>Download PDF</Button>}
        <span className="flex-1" />
        {!locked && <Button onClick={() => save(false)} disabled={!f.customerId || !f.title}>Save draft</Button>}
        {!locked && <Button variant="primary" icon={<Send className="h-4 w-4" />} disabled={!f.customerId || !f.title} onClick={() => save(true)}>{ag?.status === "sent" ? "Send amendment" : "Accept & send to client"}</Button>}
      </>}>
      {locked && <div className="mb-5 rounded-xl bg-wash p-3 text-sm">Accepted by both parties. Create a new agreement to amend it.</div>}
      <fieldset disabled={locked} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type"><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as Agreement["type"], terms: termsFor(agency.name, bookings.find((b) => b.id === f.bookingId), e.target.value as Agreement["type"]) })}><option value="booking">Booking agreement</option><option value="long_term">Long-term hiring</option></Select></Field>
          {f.type === "booking"
            ? <Field label="Booking"><Select value={f.bookingId} onChange={(e) => pickBooking(e.target.value)}><option value="">Select a booking</option>{bookings.filter((b) => !["declined", "cancelled"].includes(b.status)).map((b) => <option key={b.id} value={b.id}>{b.customerName} · {fmtDate(b.eventDate)}</option>)}</Select></Field>
            : <Field label="Client"><Select value={f.customerId} onChange={(e) => setF({ ...f, customerId: e.target.value })}><option value="">Select a client</option>{clientsFromBookings.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</Select></Field>}
        </div>
        <Field label="Title" required><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Amount"><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <Field label="Start date"><Input type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
          <Field label="End date"><Input type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></Field>
        </div>
        <Field label="Terms"><Textarea value={f.terms} onChange={(e) => setF({ ...f, terms: e.target.value })} className="min-h-[260px] font-mono text-[13px]" /></Field>
      </fieldset>
      {ag && (
        <Section title="History">
          <div className="divide-y divide-line">{(ag.history ?? []).map((h, i) => <KV key={i} k={`${h.action} · ${h.by}`} v={fmtDate(h.at, true)} />)}</div>
        </Section>
      )}
    </Drawer>
  );
}
