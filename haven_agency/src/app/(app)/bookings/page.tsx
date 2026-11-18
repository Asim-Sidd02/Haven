"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Timestamp } from "firebase/firestore";
import { CalendarDays, Check, CalendarClock, FileSignature, MapPin, Phone, Users, X } from "lucide-react";
import { useData } from "@/components/DataProvider";
import {
  Avatar, Button, Card, Drawer, EmptyState, Field, Input, KV, Modal, PageHeader, SearchInput, Section, StatusBadge,
  TableSkeleton, Tabs, Table, Td, Textarea, Th, Tr, useConfirm,
} from "@/components/ui";
import { useActor } from "@/lib/useActor";
import { notify, patch, conflictsFor } from "@/lib/actions";
import { fmtDate, fmtMoney, matches, toDate, toLocalInput } from "@/lib/format";
import { agencyShare } from "@/lib/metrics";
import type { Booking } from "@/lib/types";

type TabKey = "requests" | "upcoming" | "ongoing" | "completed" | "cancelled" | "all";
const IN: Record<TabKey, Booking["status"][] | null> = {
  requests: ["pending"], upcoming: ["accepted", "assigned"], ongoing: ["ongoing"], completed: ["completed"], cancelled: ["cancelled", "declined"], all: null,
};

export default function Page() { return <Suspense><Bookings /></Suspense>; }

function Bookings() {
  const { bookings, loading, settings } = useData();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<TabKey>((params.get("tab") as TabKey) || "requests");
  const [q, setQ] = useState("");
  const openId = params.get("id");

  const count = (t: TabKey) => bookings.filter((b) => !IN[t] || IN[t]!.includes(b.status)).length;
  const shown = useMemo(() => bookings
    .filter((b) => (!IN[tab] || IN[tab]!.includes(b.status)) && matches(q, b.customerName, b.location, b.serviceLabel, b.eventType))
    .sort((a, b) => tab === "completed" || tab === "cancelled" || tab === "all"
      ? (toDate(b.eventDate)?.getTime() ?? 0) - (toDate(a.eventDate)?.getTime() ?? 0)
      : (toDate(a.eventDate)?.getTime() ?? 0) - (toDate(b.eventDate)?.getTime() ?? 0)), [bookings, tab, q]);

  const open = bookings.find((b) => b.id === openId) ?? null;

  return (
    <>
      <PageHeader title="Bookings" desc="Respond to requests quickly. Clients see your response time." />
      <Card>
        <Tabs value={tab} onChange={setTab} className="px-3" items={[
          { value: "requests", label: "New requests", count: count("requests") },
          { value: "upcoming", label: "Upcoming", count: count("upcoming") },
          { value: "ongoing", label: "Ongoing", count: count("ongoing") },
          { value: "completed", label: "Completed", count: count("completed") },
          { value: "cancelled", label: "Cancelled", count: count("cancelled") },
          { value: "all", label: "All", count: count("all") },
        ]} />
        <div className="border-b border-line p-4"><SearchInput value={q} onChange={setQ} placeholder="Search client, location or service" /></div>
        {loading ? <TableSkeleton /> : !shown.length ? (
          <EmptyState icon={<CalendarDays className="h-5 w-5" />} title={tab === "requests" ? "No new requests" : "Nothing here"}
            desc={tab === "requests" ? "When clients book your agency in the Haven app, their requests land here." : "Try another tab."} />
        ) : (
          <Table>
            <thead><tr><Th>Client</Th><Th>Service</Th><Th>When</Th><Th>Location</Th><Th>Team</Th><Th>Value</Th><Th>Status</Th></tr></thead>
            <tbody>
              {shown.map((b) => (
                <Tr key={b.id} onClick={() => router.replace(`${pathname}?id=${b.id}`, { scroll: false })}>
                  <Td><div className="flex items-center gap-3"><Avatar name={b.customerName} size={30} /><span className="font-medium text-ink">{b.customerName}</span></div></Td>
                  <Td>{b.serviceLabel}<p className="text-xs text-muted">{b.eventType}</p></Td>
                  <Td className="tnum whitespace-nowrap">{fmtDate(b.eventDate, true)}<p className="text-xs text-muted">{b.hours}h shift</p></Td>
                  <Td className="max-w-[200px] truncate">{b.location}</Td>
                  <Td className="tnum">{b.assignedIds?.length ?? 0}/{b.personnelCount}</Td>
                  <Td className="tnum">{fmtMoney(agencyShare(b), settings.currency)}</Td>
                  <Td><StatusBadge status={b.clientApproval === "changes_requested" && b.status === "assigned" ? "changes_requested" : b.status} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <BookingDrawer booking={open} onClose={() => router.replace(pathname, { scroll: false })} />
    </>
  );
}

function BookingDrawer({ booking: b, onClose }: { booking: Booking | null; onClose: () => void }) {
  const { bookings, settings, agreements } = useData();
  const { run, agency } = useActor();
  const confirm = useConfirm();
  const [resched, setResched] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  if (!b) return null;
  const cur = settings.currency;
  const set = (data: Record<string, unknown>, ok: string, action: string, notice?: [string, string]) =>
    run(async () => {
      await patch("bookings", b.id, data);
      if (notice) await notify(b.customerId, "booking", notice[0], notice[1], `booking:${b.id}`);
    }, ok, [action, `${b.customerName} · ${b.serviceLabel}`]);

  const doubleBooked = (b.assignedIds ?? []).filter((id) => conflictsFor(id, b, bookings).length).length;
  const agreement = agreements.find((a) => a.bookingId === b.id);

  return (
    <Drawer open onClose={onClose} width="max-w-2xl" title={`${b.customerName} · ${b.serviceLabel}`}
      subtitle={<span className="flex items-center gap-2"><StatusBadge status={b.status} />{b.paymentStatus && <StatusBadge status={b.paymentStatus} />}</span>}
      footer={<>
        {b.status === "pending" && <>
          <Button variant="ghost" icon={<X className="h-4 w-4" />} onClick={async () => {
            const r = await confirm({ title: "Decline this request?", desc: "Tell the client why, so they can rebook elsewhere quickly.", confirm: "Decline", danger: true, input: { label: "Reason for the client", required: true, placeholder: "e.g. Fully booked on that date" } });
            if (r.ok) set({ status: "declined", agencyNote: r.text }, "Request declined", "Declined booking", [`${agency.name} declined your request`, r.text]);
          }}>Decline</Button>
          <Button variant="primary" icon={<Check className="h-4 w-4" />} onClick={() => set({ status: "accepted" }, "Accepted. Now assign a team.", "Accepted booking", [`${agency.name} accepted your booking`, "They’ll share your team shortly."])}>Accept</Button>
        </>}
        {["accepted", "assigned"].includes(b.status) && <Link href={`/assignments?id=${b.id}`}><Button variant={b.status === "accepted" ? "primary" : "secondary"} icon={<Users className="h-4 w-4" />}>{b.assignedIds?.length ? "Change team" : "Assign team"}</Button></Link>}
        {b.status === "ongoing" && <Button variant="primary" onClick={async () => {
          const r = await confirm({ title: "Mark as completed?", desc: "Assigned personnel become available again and the client can leave a review.", confirm: "Complete" });
          if (r.ok) set({ status: "completed" }, "Booking completed", "Completed booking", ["Your booking is complete", `Thanks for choosing ${agency.name}. How did we do?`]);
        }}>Mark completed</Button>}
        {["accepted", "assigned", "ongoing"].includes(b.status) && <Button variant="ghost" icon={<CalendarClock className="h-4 w-4" />} onClick={() => setResched(true)}>Reschedule</Button>}
        {["accepted", "assigned"].includes(b.status) && <Button variant="ghost" onClick={async () => {
          const r = await confirm({ title: "Cancel this booking?", desc: "Only cancel when you truly can’t serve it. The client is notified immediately.", confirm: "Cancel booking", danger: true, input: { label: "Reason", required: true } });
          if (r.ok) set({ status: "cancelled", cancelReason: r.text, assigned: [], assignedIds: [] }, "Booking cancelled", "Cancelled booking", [`${agency.name} cancelled your booking`, r.text]);
        }}>Cancel</Button>}
      </>}>
      {b.clientApproval === "changes_requested" && <div className="mb-5 rounded-xl bg-danger-soft p-4 text-sm text-danger"><b>Client asked for changes:</b> {b.clientFeedback || "No details given."}</div>}
      {b.cancelReason && <div className="mb-5 rounded-xl bg-wash p-4 text-sm"><b>Cancellation reason:</b> {b.cancelReason}</div>}
      {b.rescheduleRequest && <div className="mb-5 rounded-xl border border-line-2 p-4 text-sm"><b>Reschedule requested by {b.rescheduleRequest.by}</b> to {fmtDate(b.rescheduleRequest.date, true)}: {b.rescheduleRequest.reason}
        {b.rescheduleRequest.by === "customer" && <div className="mt-3 flex gap-2">
          <Button size="sm" variant="primary" onClick={() => set({ eventDate: b.rescheduleRequest!.date, rescheduleRequest: null }, "New date confirmed", "Accepted reschedule", ["New date confirmed", fmtDate(b.rescheduleRequest!.date, true)])}>Accept new date</Button>
          <Button size="sm" onClick={() => set({ rescheduleRequest: null }, "Reschedule declined", "Declined reschedule", ["Reschedule not possible", "We’ll keep the original date."])}>Keep original</Button>
        </div>}
      </div>}
      {doubleBooked > 0 && <div className="mb-5 rounded-xl bg-danger-soft p-3 text-sm text-danger">{doubleBooked} assigned person(s) overlap with another booking. Review the team.</div>}

      <div className="grid gap-x-8 sm:grid-cols-2">
        <Section title="Event">
          <div className="divide-y divide-line">
            <KV k="Date" v={fmtDate(b.eventDate, true)} /><KV k="Shift" v={`${b.hours} hours`} /><KV k="Event type" v={b.eventType} />
            <KV k="Guests" v={b.guests || ""} /><KV k="Personnel needed" v={b.personnelCount} />
          </div>
          <p className="mt-3 flex items-start gap-2 text-sm"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" />{b.location}</p>
        </Section>
        <Section title="Client">
          <div className="flex items-center gap-3"><Avatar name={b.customerName} size={40} /><div><p className="font-medium text-ink">{b.customerName}</p>
            {["accepted", "assigned", "ongoing"].includes(b.status) && b.customerPhone ? <a href={`tel:${b.customerPhone}`} className="flex items-center gap-1 text-sm text-muted hover:text-ink"><Phone className="h-3.5 w-3.5" />{b.customerPhone}</a>
              : <p className="text-xs text-muted">Contact shown after you accept</p>}</div></div>
          <Section title="Requirements"><p className="whitespace-pre-wrap rounded-lg bg-wash p-3 text-sm">{b.requirements || "No special requirements."}</p></Section>
        </Section>
      </div>

      <Section title="Price">
        <div className="divide-y divide-line rounded-lg border border-line px-4">
          <KV k={`${fmtMoney(b.hourlyRate, cur)}/h × ${b.hours}h × ${b.personnelCount}`} v={fmtMoney(b.subtotal, cur)} />
          <KV k="Platform fee" v={fmtMoney(b.platformFee, cur)} /><KV k="Tax" v={fmtMoney(b.tax, cur)} />
          <KV k="Client pays" v={fmtMoney(b.totalAmount, cur)} /><KV k="Your earnings" v={<b>{fmtMoney(agencyShare(b), cur)}</b>} />
        </div>
      </Section>

      <Section title={`Team (${b.assigned?.length ?? 0}/${b.personnelCount})`} action={b.clientApproval !== "none" ? <StatusBadge status={b.clientApproval === "pending" ? "sent" : b.clientApproval} /> : undefined}>
        {b.assigned?.length ? <div className="grid gap-2 sm:grid-cols-2">{b.assigned.map((p) => (
          <div key={p.personnelId} className="flex items-center gap-3 rounded-lg border border-line p-2.5"><Avatar name={p.name} url={p.photoUrl} size={32} /><div><p className="text-sm font-medium text-ink">{p.name}</p><p className="font-mono text-xs text-muted">{p.code}</p></div></div>
        ))}</div> : <p className="text-sm text-muted">No one assigned yet.</p>}
      </Section>

      <Section title="Agreement">
        {agreement ? <Link href={`/agreements?id=${agreement.id}`} className="flex items-center justify-between rounded-lg border border-line p-3 text-sm hover:bg-canvas"><span className="flex items-center gap-2"><FileSignature className="h-4 w-4" />{agreement.title}</span><StatusBadge status={agreement.status} /></Link>
          : <Link href={`/agreements?new=${b.id}`}><Button size="sm" icon={<FileSignature className="h-3.5 w-3.5" />}>Create agreement</Button></Link>}
      </Section>

      <Section title="Note to client" action={note === null ? <Button size="sm" variant="ghost" onClick={() => setNote(b.agencyNote ?? "")}>Edit</Button> : undefined}>
        {note === null ? <p className="text-sm text-body">{b.agencyNote || <span className="text-muted">No note.</span>}</p> : (
          <div className="space-y-2"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Team will arrive 30 minutes early for a briefing." />
            <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setNote(null)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={async () => { if (await set({ agencyNote: note }, "Note saved", "Updated booking note", ["Message from your agency", note])) setNote(null); }}>Save & notify</Button></div></div>
        )}
      </Section>
      <p className="text-xs text-faint">Requested {fmtDate(b.createdAt, true)} · ID {b.id}</p>
      <Reschedule open={resched} booking={b} onClose={() => setResched(false)} />
    </Drawer>
  );
}

function Reschedule({ open, booking: b, onClose }: { open: boolean; booking: Booking; onClose: () => void }) {
  const { run } = useActor();
  const [when, setWhen] = useState(toLocalInput(b.eventDate));
  const [reason, setReason] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Propose a new date" desc="The client is asked to confirm. The booking keeps its current date until they do."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!when || !reason.trim()} onClick={async () => {
        const ok = await run(async () => {
          await patch("bookings", b.id, { rescheduleRequest: { date: Timestamp.fromDate(new Date(when)), reason: reason.trim(), by: "agency" } });
          await notify(b.customerId, "booking", "Your agency proposed a new time", `${new Date(when).toLocaleString()}: ${reason.trim()}`, `booking:${b.id}`);
        }, "Reschedule proposed", ["Proposed reschedule", b.customerName]);
        if (ok) onClose();
      }}>Send to client</Button></>}>
      <div className="space-y-4">
        <Field label="New date & time"><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></Field>
        <Field label="Reason" required><Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[72px]" /></Field>
      </div>
    </Modal>
  );
}
