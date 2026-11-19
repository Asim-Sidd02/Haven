"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LifeBuoy, Paperclip, Plus, Send, Siren } from "lucide-react";
import { useData } from "@/components/DataProvider";
import {
  Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Segmented, Select, StatusBadge, Textarea, cx,
} from "@/components/ui";
import { useActor } from "@/lib/useActor";
import { create, notify, now, patch, upload } from "@/lib/actions";
import { ago, fmtDate, toDate } from "@/lib/format";
import type { Ticket } from "@/lib/types";

const RANK = { emergency: 0, high: 1, normal: 2 } as const;
const who = (t: Ticket) => t.reporterId ? (t.reporterName || "Bouncer") : (t.customerName || "Haven team");

export default function Page() { return <Suspense><Support /></Suspense>; }

/** An inbox: emergencies pinned on top, then by urgency and recency. Threads read like chat. */
function Support() {
  const { tickets } = useData();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [filter, setFilter] = useState<"open" | "emergency" | "resolved" | "all">(params.get("filter") === "emergency" ? "emergency" : "open");
  const [newOpen, setNewOpen] = useState(false);
  const openId = params.get("id");

  const list = useMemo(() => tickets
    .filter((t) => filter === "all" || (filter === "open" ? t.status !== "resolved" : filter === "emergency" ? t.priority === "emergency" && t.status !== "resolved" : t.status === "resolved"))
    .sort((a, b) => RANK[a.priority] - RANK[b.priority] || (toDate(b.updatedAt)?.getTime() ?? 0) - (toDate(a.updatedAt)?.getTime() ?? 0)), [tickets, filter]);
  const sel = tickets.find((t) => t.id === openId) ?? null;
  const select = (id: string | null) => router.replace(id ? `${pathname}?id=${id}` : pathname, { scroll: false });

  return (
    <>
      <PageHeader title="Complaints & support" desc="Client complaints, incidents reported by your bouncers, and conversations with the Haven team. Emergencies always come first."
        actions={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setNewOpen(true)}>Contact Haven</Button>} />
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card className={cx("self-start overflow-hidden", sel && "hidden lg:block")}>
          <div className="border-b border-line p-3"><Segmented value={filter} onChange={setFilter} items={[{ value: "open", label: "Open" }, { value: "emergency", label: "Emergency" }, { value: "resolved", label: "Resolved" }, { value: "all", label: "All" }]} /></div>
          {!list.length ? <EmptyState icon={<LifeBuoy className="h-5 w-5" />} title="Nothing to handle" desc="Client complaints and incidents appear here." /> : (
            <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">{list.map((t) => (
              <li key={t.id}><button onClick={() => select(t.id)} className={cx("w-full px-4 py-3 text-left transition hover:bg-canvas", t.id === openId && "bg-wash", t.priority === "emergency" && t.status !== "resolved" && "border-l-2 border-danger")}>
                <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-medium text-ink">{t.subject}</p><span className="shrink-0 text-xs text-faint">{ago(t.updatedAt)}</span></div>
                <div className="mt-1 flex items-center gap-2"><span className="truncate text-[13px] text-muted">{who(t)}</span>{t.reporterId && <Badge tone="outline">Bouncer</Badge>}
                  {t.priority !== "normal" && <Badge tone={t.priority === "emergency" ? "danger" : "outline"}>{t.priority === "emergency" ? "Emergency" : "High"}</Badge>}<StatusBadge status={t.status} /></div>
              </button></li>
            ))}</ul>
          )}
        </Card>
        {sel ? <Thread key={sel.id} t={sel} onBack={() => select(null)} /> : <Card className="hidden lg:block"><EmptyState title="Select a conversation" /></Card>}
      </div>
      <NewTicket open={newOpen} onClose={() => setNewOpen(false)} />
    </>
  );
}

function Thread({ t, onBack }: { t: Ticket; onBack: () => void }) {
  const { profile, agency, run } = useActor();
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [t.messages?.length]);

  const send = (body: string) => run(async () => {
    await patch("tickets", t.id, { messages: [...(t.messages ?? []), { by: "agency", name: profile.name, text: body, at: now() }], status: t.status === "open" ? "in_progress" : t.status });
    if (t.customerId) await notify(t.customerId, "message", `${agency.name} replied`, body.slice(0, 120), `ticket:${t.id}`);
    if (t.reporterId) await notify(t.reporterId, "message", `${agency.name} replied`, body.slice(0, 120), `ticket:${t.id}`);
  }, "", ["Replied to ticket", t.subject]).then((ok) => ok && setText(""));

  const setStatus = (status: Ticket["status"], msg: string) => run(() => patch("tickets", t.id, { status }), msg, [`Ticket ${status}`, t.subject]);

  return (
    <Card className="flex min-h-[60vh] flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <button onClick={onBack} className="mb-1 text-xs text-muted hover:text-ink lg:hidden">← All conversations</button>
          <p className="flex items-center gap-2 font-semibold text-ink">{t.priority === "emergency" && <Siren className="h-4 w-4 text-danger" />}{t.subject}</p>
          <p className="text-[13px] text-muted">{t.category} · {who(t)}{t.bookingId && ` · booking ${t.bookingId.slice(0, 6)}`} · opened {fmtDate(t.createdAt, true)}</p>
        </div>
        <div className="flex gap-2">
          {t.status !== "resolved" && t.status !== "escalated" && <Button size="sm" variant="ghost" onClick={() => setStatus("escalated", "Escalated to Haven")}>Escalate</Button>}
          {t.status !== "resolved" ? <Button size="sm" variant="primary" onClick={() => setStatus("resolved", "Marked resolved")}>Resolve</Button> : <Button size="sm" onClick={() => setStatus("open", "Reopened")}>Reopen</Button>}
        </div>
      </div>
      {t.priority === "emergency" && t.status !== "resolved" && <div className="border-b border-line bg-danger-soft px-5 py-3 text-sm text-danger"><b>Emergency protocol:</b> {t.reporterId ? `call ${t.reporterName || "the reporting bouncer"} and your on-site lead now` : "call the client and your on-site lead now"}, alert local authorities if anyone is at risk, then log what happened here.</div>}
      <div className="flex-1 space-y-3 overflow-y-auto bg-canvas p-5">
        {(t.messages ?? []).map((m, i) => {
          const mine = m.by === "agency";
          const link = m.text.match(/^\[attachment\] (.+)$/)?.[1];
          return (
            <div key={i} className={cx("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cx("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm", mine ? "rounded-br-sm bg-ink text-white" : m.by === "admin" ? "rounded-bl-sm border border-ink/20 bg-white" : "rounded-bl-sm border border-line bg-white")}>
                <p className={cx("mb-0.5 text-[11px]", mine ? "text-white/60" : "text-muted")}>{m.by === "admin" ? "Haven team" : m.by === "bouncer" ? `${m.name} (bouncer)` : m.name} · {fmtDate(m.at, true)}</p>
                {link ? <a href={link} target="_blank" rel="noreferrer" className="flex items-center gap-1 underline"><Paperclip className="h-3.5 w-3.5" />Attachment</a> : <p className="whitespace-pre-wrap">{m.text}</p>}
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      {t.status !== "resolved" && (
        <div className="flex items-end gap-2 border-t border-line p-3">
          <button onClick={() => fileRef.current?.click()} aria-label="Attach file" className="grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-wash hover:text-ink"><Paperclip className="h-4 w-4" /></button>
          <input ref={fileRef} type="file" hidden accept="image/*,application/pdf" onChange={async (e) => { const f = e.target.files?.[0]; if (f) send(`[attachment] ${await upload(agency.id, "support", f)}`); }} />
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a reply…" className="min-h-[40px] flex-1 resize-none py-2"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && text.trim()) { e.preventDefault(); send(text.trim()); } }} />
          <Button variant="primary" disabled={!text.trim()} onClick={() => send(text.trim())} icon={<Send className="h-4 w-4" />}>Send</Button>
        </div>
      )}
    </Card>
  );
}

function NewTicket({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { agency, profile, run } = useActor();
  const { bookings } = useData();
  const [f, setF] = useState({ subject: "", category: "support" as Ticket["category"], priority: "normal" as Ticket["priority"], bookingId: "", text: "" });
  return (
    <Modal open={open} onClose={onClose} title="Contact Haven" desc="Our team replies here. For emergencies, choose Emergency so it’s handled first."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant={f.priority === "emergency" ? "danger" : "primary"} disabled={!f.subject.trim() || !f.text.trim()} onClick={async () => {
        const b = bookings.find((x) => x.id === f.bookingId);
        const ok = await run(() => create("tickets", { agencyId: agency.id, customerId: b?.customerId ?? null, customerName: b?.customerName ?? "", bookingId: f.bookingId || null, subject: f.subject.trim(), category: f.category, priority: f.priority, status: f.priority === "emergency" ? "escalated" : "open", messages: [{ by: "agency", name: profile.name, text: f.text.trim(), at: now() }] }), "Sent to Haven", ["Opened ticket", f.subject]);
        if (ok) { setF({ subject: "", category: "support", priority: "normal", bookingId: "", text: "" }); onClose(); }
      }}>{f.priority === "emergency" ? "Raise emergency" : "Send"}</Button></>}>
      <div className="space-y-4">
        <Field label="Subject" required><Input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Type"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as Ticket["category"] })}><option value="support">Question</option><option value="complaint">Complaint</option><option value="incident">Incident</option></Select></Field>
          <Field label="Priority"><Select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as Ticket["priority"] })}><option value="normal">Normal</option><option value="high">High</option><option value="emergency">Emergency</option></Select></Field>
          <Field label="Booking"><Select value={f.bookingId} onChange={(e) => setF({ ...f, bookingId: e.target.value })}><option value="">None</option>{bookings.slice(0, 50).map((b) => <option key={b.id} value={b.id}>{b.customerName} · {fmtDate(b.eventDate)}</option>)}</Select></Field>
        </div>
        <Field label="Message" required><Textarea value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
