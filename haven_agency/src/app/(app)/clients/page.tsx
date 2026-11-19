"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Handshake, MessageSquare, Phone, Star } from "lucide-react";
import { useData } from "@/components/DataProvider";
import { Avatar, Callout, Card, Drawer, EmptyState, KV, PageHeader, SearchInput, Section, StatusBadge, Table, Td, Th, Tr } from "@/components/ui";
import { fmtDate, fmtMoney, matches, toDate } from "@/lib/format";
import { agencyShare } from "@/lib/metrics";
import type { Booking } from "@/lib/types";

/** Clients are derived from bookings: the agency only sees people who booked it, and only what it needs. */
export default function ClientsPage() {
  const { bookings, reviews, tickets, settings } = useData();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const clients = useMemo(() => {
    const m = new Map<string, { id: string; name: string; phone: string; bookings: Booking[] }>();
    bookings.forEach((b) => {
      const c = m.get(b.customerId) ?? { id: b.customerId, name: b.customerName, phone: "", bookings: [] };
      c.bookings.push(b);
      // Contact details only once the agency has accepted at least one of their bookings.
      if (["accepted", "assigned", "confirmed", "ongoing", "completed"].includes(b.status) && b.customerPhone) c.phone = b.customerPhone;
      m.set(b.customerId, c);
    });
    return [...m.values()].map((c) => ({
      ...c,
      spent: c.bookings.filter((b) => b.status === "completed").reduce((s, b) => s + agencyShare(b), 0),
      active: c.bookings.filter((b) => ["accepted", "assigned", "confirmed", "ongoing"].includes(b.status)).length,
      last: Math.max(...c.bookings.map((b) => toDate(b.eventDate)?.getTime() ?? 0)),
      rating: reviews.filter((r) => r.customerId === c.id).map((r) => r.rating),
      complaints: tickets.filter((t) => t.customerId === c.id && t.category !== "support").length,
    })).sort((a, b) => b.last - a.last);
  }, [bookings, reviews, tickets]);

  const shown = clients.filter((c) => matches(q, c.name, c.phone));
  const c = clients.find((x) => x.id === open);

  return (
    <>
      <PageHeader title="Clients" desc="Everyone who has booked your agency, with their history and feedback." />
      <Card>
        <div className="border-b border-line p-4"><SearchInput value={q} onChange={setQ} placeholder="Search clients" /></div>
        {!shown.length ? <EmptyState icon={<Handshake className="h-5 w-5" />} title="No clients yet" desc="Clients appear here after their first booking request." /> : (
          <Table>
            <thead><tr><Th>Client</Th><Th>Bookings</Th><Th>Active</Th><Th>Earned</Th><Th>Rating given</Th><Th>Last booking</Th></tr></thead>
            <tbody>{shown.map((x) => (
              <Tr key={x.id} onClick={() => setOpen(x.id)}>
                <Td><div className="flex items-center gap-3"><Avatar name={x.name} size={30} /><span className="font-medium text-ink">{x.name}</span>{x.complaints > 0 && <StatusBadge status="open" />}</div></Td>
                <Td className="tnum">{x.bookings.length}</Td><Td className="tnum">{x.active || "—"}</Td>
                <Td className="tnum">{fmtMoney(x.spent, settings.currency)}</Td>
                <Td>{x.rating.length ? <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-ink" />{(x.rating.reduce((a, b) => a + b, 0) / x.rating.length).toFixed(1)}</span> : "—"}</Td>
                <Td className="tnum">{fmtDate(new Date(x.last))}</Td>
              </Tr>
            ))}</tbody>
          </Table>
        )}
      </Card>

      {c && (
        <Drawer open onClose={() => setOpen(null)} title={c.name} subtitle={`${c.bookings.length} bookings · ${fmtMoney(c.spent, settings.currency)} earned`}>
          <Callout>Only use client details to deliver their bookings. Contact numbers appear once you’ve accepted a booking from them.</Callout>
          <Section title="Contact">{c.phone ? <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-sm text-ink hover:underline"><Phone className="h-4 w-4" />{c.phone}</a> : <p className="text-sm text-muted">Not available yet.</p>}</Section>
          <Section title="Bookings">
            <div className="divide-y divide-line rounded-lg border border-line">{c.bookings.map((b) => (
              <Link key={b.id} href={`/bookings?id=${b.id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-canvas">
                <div><p className="text-sm font-medium text-ink">{b.serviceLabel} · {b.eventType}</p><p className="text-xs text-muted">{fmtDate(b.eventDate, true)}</p>
                  {b.requirements && <p className="mt-0.5 line-clamp-1 text-xs text-body">{b.requirements}</p>}</div>
                <StatusBadge status={b.status} />
              </Link>
            ))}</div>
          </Section>
          <Section title="Feedback">
            {reviews.filter((r) => r.customerId === c.id).map((r) => <div key={r.id} className="mb-2 rounded-lg bg-wash p-3 text-sm"><p className="flex items-center gap-1 font-medium"><Star className="h-3.5 w-3.5 fill-ink" />{r.rating}/5</p><p className="mt-1">{r.comment}</p></div>)}
            {!reviews.some((r) => r.customerId === c.id) && <p className="text-sm text-muted">No reviews from this client.</p>}
          </Section>
          <Section title="Complaints & queries">
            {tickets.filter((t) => t.customerId === c.id).map((t) => <Link key={t.id} href={`/support?id=${t.id}`} className="mb-2 flex items-center justify-between rounded-lg border border-line p-3 text-sm hover:bg-canvas"><span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-muted" />{t.subject}</span><StatusBadge status={t.status} /></Link>)}
            {!tickets.some((t) => t.customerId === c.id) && <p className="text-sm text-muted">None.</p>}
          </Section>
          <div className="divide-y divide-line"><KV k="First booking" v={fmtDate(c.bookings[c.bookings.length - 1]?.createdAt)} /></div>
        </Drawer>
      )}
    </>
  );
}
