"use client";

import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, ListChecks, Lock, Send } from "lucide-react";
import { useData } from "@/components/DataProvider";
import {
  Avatar, Badge, Button, Card, CardHeader, Chips, EmptyState, PageHeader, SearchInput, Segmented, StatusBadge, Tabs, cx,
} from "@/components/ui";
import { useActor } from "@/lib/useActor";
import { blockReason, notify, patch, toAssigned } from "@/lib/actions";
import { fmtDate, matches, toDate } from "@/lib/format";
import type { Booking } from "@/lib/types";

export default function Page() { return <Suspense><Assignments /></Suspense>; }

/**
 * Two panes: bookings that need a team on the left, the team builder on the right.
 * People who can't be assigned are shown greyed out with the reason, so managers
 * understand why instead of guessing, and double booking can't happen.
 */
function Assignments() {
  const { bookings } = useData();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<"todo" | "awaiting" | "history">("todo");
  const openId = params.get("id");
  const select = (id: string | null) => router.replace(id ? `${pathname}?id=${id}` : pathname, { scroll: false });

  const lists = useMemo(() => {
    const by = (a: Booking, b: Booking) => (toDate(a.eventDate)?.getTime() ?? 0) - (toDate(b.eventDate)?.getTime() ?? 0);
    return {
      todo: bookings.filter((b) => b.status === "accepted" || (b.status === "assigned" && b.clientApproval === "changes_requested")).sort(by),
      awaiting: bookings.filter((b) => b.status === "assigned" && b.clientApproval === "pending").sort(by),
      history: bookings.filter((b) => ["ongoing", "completed"].includes(b.status) && b.assigned?.length).sort((a, b) => by(b, a)),
    };
  }, [bookings]);

  const selected = bookings.find((b) => b.id === openId) ?? null;

  return (
    <>
      <PageHeader title="Assignments" desc="Build the right team for each booking. Haven blocks overlapping shifts and unverified people automatically." />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className={cx("self-start", selected && "hidden lg:block")}>
          <Tabs value={tab} onChange={setTab} className="px-2" items={[
            { value: "todo", label: "To assign", count: lists.todo.length },
            { value: "awaiting", label: "With client", count: lists.awaiting.length },
            { value: "history", label: "History" },
          ]} />
          {!lists[tab].length ? (
            <EmptyState icon={<ListChecks className="h-5 w-5" />} title={tab === "todo" ? "Every booking has a team" : "Nothing here"}
              desc={tab === "todo" ? "Accepted bookings that need personnel appear here." : undefined} />
          ) : (
            <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
              {lists[tab].map((b) => (
                <li key={b.id}>
                  <button onClick={() => select(b.id)} className={cx("w-full px-4 py-3 text-left transition hover:bg-canvas", b.id === openId && "bg-wash")}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-ink">{b.customerName}</p>
                      <span className="tnum text-xs text-muted">{b.assignedIds?.length ?? 0}/{b.personnelCount}</span>
                    </div>
                    <p className="truncate text-[13px] text-muted">{b.serviceLabel} · {fmtDate(b.eventDate, true)}</p>
                    {b.clientApproval === "changes_requested" && <Badge tone="danger" className="mt-1.5">Client wants changes</Badge>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {selected ? <TeamBuilder key={selected.id} booking={selected} onBack={() => select(null)} /> : (
          <Card className="hidden lg:block"><EmptyState icon={<ListChecks className="h-5 w-5" />} title="Select a booking" desc="Pick a booking on the left to build or review its team." /></Card>
        )}
      </div>
    </>
  );
}

function TeamBuilder({ booking: b, onBack }: { booking: Booking; onBack: () => void }) {
  const { personnel, bookings } = useData();
  const { run, agency } = useActor();
  const [picked, setPicked] = useState<string[]>(b.assignedIds ?? []);
  const [q, setQ] = useState("");
  const [show, setShow] = useState<"eligible" | "all">("eligible");
  const editable = ["accepted", "assigned"].includes(b.status);

  const candidates = useMemo(() => personnel
    .filter((p) => p.active)
    .map((p) => ({ p, reason: blockReason(p, b, bookings) }))
    .filter(({ p, reason }) => (show === "all" || !reason || picked.includes(p.id)) && matches(q, p.name, p.code, ...(p.skills ?? []), ...(p.languages ?? [])))
    .sort((x, y) => Number(!!x.reason) - Number(!!y.reason) || (y.p.experienceYears ?? 0) - (x.p.experienceYears ?? 0)),
  [personnel, bookings, b, q, show, picked]);

  const need = b.personnelCount;
  const full = picked.length >= need;
  const toggle = (id: string) => setPicked((s) => s.includes(id) ? s.filter((x) => x !== id) : full ? s : [...s, id]);
  const changed = picked.slice().sort().join() !== (b.assignedIds ?? []).slice().sort().join();

  const save = () => run(async () => {
    const team = personnel.filter((p) => picked.includes(p.id)).map(toAssigned);
    await patch("bookings", b.id, { assigned: team, assignedIds: picked, status: "assigned", clientApproval: "pending", clientFeedback: "" });
    await notify(b.customerId, "assignment", `${agency.name} assigned your team`, `${team.map((t) => t.name).join(", ")}. Please review and approve.`, `booking:${b.id}`);
  }, "Team sent to the client for approval", ["Assigned team", `${b.customerName}: ${picked.length} people`]);

  return (
    <Card className="self-start">
      <CardHeader title={`${b.customerName} · ${b.serviceLabel}`} desc={`${fmtDate(b.eventDate, true)} · ${b.hours}h · ${b.location}`}
        action={<Button size="sm" variant="ghost" className="lg:hidden" icon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>Back</Button>} />
      <div className="space-y-4 p-5">
        {b.requirements && <p className="rounded-lg bg-wash p-3 text-sm"><b className="font-medium text-ink">Client requirements:</b> {b.requirements}</p>}
        {b.clientApproval === "changes_requested" && <p className="rounded-lg bg-danger-soft p-3 text-sm text-danger"><b>Client feedback:</b> {b.clientFeedback || "They asked for a different team."}</p>}

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">{personnel.filter((p) => picked.includes(p.id)).slice(0, 6).map((p) => <Avatar key={p.id} name={p.name} url={p.photoUrl} size={32} className="ring-2 ring-white" />)}</div>
          <div className="flex-1">
            <p className="text-sm font-medium text-ink"><span className="tnum">{picked.length}</span> of <span className="tnum">{need}</span> selected</p>
            <div className="mt-1 flex gap-1">{Array.from({ length: need }).map((_, i) => <span key={i} className={cx("h-1.5 flex-1 rounded-full transition", i < picked.length ? "bg-ink" : "bg-line")} />)}</div>
          </div>
          {editable && <Button variant="primary" disabled={!picked.length || !changed} onClick={save} icon={<Send className="h-4 w-4" />}>Send to client</Button>}
        </div>

        {editable ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row">
              <SearchInput value={q} onChange={setQ} placeholder="Search by name, skill or language" className="flex-1" />
              <Segmented value={show} onChange={setShow} items={[{ value: "eligible", label: "Free" }, { value: "all", label: "Everyone" }]} />
            </div>
            {!candidates.length ? <EmptyState title="No one is free for this slot" desc="Everyone verified is on another booking, on leave, or unavailable. Switch to “Everyone” to see why." /> : (
              <ul className="grid max-h-[52vh] gap-2 overflow-y-auto sm:grid-cols-2">
                {candidates.map(({ p, reason }) => {
                  const on = picked.includes(p.id);
                  const blocked = !!reason && !on;
                  return (
                    <li key={p.id}>
                      <button disabled={blocked || (!on && full)} onClick={() => toggle(p.id)}
                        className={cx("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                          on ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink/40", (blocked || (!on && full)) && "cursor-not-allowed opacity-50 hover:border-line")}>
                        <Avatar name={p.name} url={p.photoUrl} size={36} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          <p className={cx("truncate text-xs", on ? "text-white/70" : "text-muted")}>{p.experienceYears || 0} yrs{p.heightCm ? ` · ${p.heightCm} cm` : ""}{p.languages?.length ? ` · ${p.languages.join(", ")}` : ""}</p>
                          {!on && <div className="mt-1"><Chips items={p.skills} max={2} /></div>}
                        </div>
                        {on ? <Check className="h-4 w-4" /> : reason ? <span className="flex items-center gap-1 text-[11px] text-muted"><Lock className="h-3 w-3" />{reason}</span> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">{b.assigned?.map((p) => <div key={p.personnelId} className="flex items-center gap-3 rounded-xl border border-line p-3"><Avatar name={p.name} url={p.photoUrl} size={32} /><span className="text-sm font-medium">{p.name}</span></div>)}
            <p className="text-sm text-muted sm:col-span-2">This booking is <StatusBadge status={b.status} />, so its team is locked.</p></div>
        )}
      </div>
    </Card>
  );
}
