"use client";

import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { arrayRemove, arrayUnion, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { ArrowLeft, Check, Clock, ListChecks, Lock, RefreshCw, Send, Smartphone, UserCheck } from "lucide-react";
import { useData } from "@/components/DataProvider";
import {
  Avatar, Badge, Button, Card, CardHeader, Chips, EmptyState, PageHeader, SearchInput, Segmented, StatusBadge, Tabs, cx, useConfirm,
} from "@/components/ui";
import { useActor } from "@/lib/useActor";
import { assignmentId, blockReason, notify, respondByFor, toAssigned } from "@/lib/actions";
import { db } from "@/lib/firebase";
import { fmtDate, matches, toDate } from "@/lib/format";
import type { Agency, Assignment, Booking, Personnel } from "@/lib/types";

export default function Page() { return <Suspense><Assignments /></Suspense>; }

type TabKey = "todo" | "awaiting" | "confirmed" | "history";

/** Needs the agency's attention: no team yet, a bouncer declined, or the client asked for changes. */
const needsWork = (b: Booking) => b.status === "accepted"
  || (b.status === "assigned" && !!b.declinedIds?.length)
  || (["assigned", "confirmed"].includes(b.status) && b.clientApproval === "changes_requested");

/**
 * Two panes: bookings that need a team on the left, the team builder on the right.
 * Saving a team sends an offer to every new person; the booking is Confirmed once all of them accept.
 */
function Assignments() {
  const { bookings } = useData();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<TabKey>("todo");
  const openId = params.get("id");
  const select = (id: string | null) => router.replace(id ? `${pathname}?id=${id}` : pathname, { scroll: false });

  const lists = useMemo(() => {
    const by = (a: Booking, b: Booking) => (toDate(a.eventDate)?.getTime() ?? 0) - (toDate(b.eventDate)?.getTime() ?? 0);
    return {
      todo: bookings.filter(needsWork).sort(by),
      awaiting: bookings.filter((b) => b.status === "assigned" && !needsWork(b)).sort(by),
      confirmed: bookings.filter((b) => ["confirmed", "ongoing"].includes(b.status) && !needsWork(b)).sort(by),
      history: bookings.filter((b) => b.status === "completed" && b.assigned?.length).sort((a, b) => by(b, a)),
    };
  }, [bookings]);

  const selected = bookings.find((b) => b.id === openId) ?? null;

  return (
    <>
      <PageHeader title="Assignments" desc="Build the right team for each booking. Each person gets an offer in the Haven app; the booking is confirmed once everyone accepts." />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className={cx("self-start", selected && "hidden lg:block")}>
          <Tabs value={tab} onChange={setTab} className="px-2" items={[
            { value: "todo", label: "To assign", count: lists.todo.length },
            { value: "awaiting", label: "Awaiting bouncers", count: lists.awaiting.length },
            { value: "confirmed", label: "Confirmed", count: lists.confirmed.length },
            { value: "history", label: "History" },
          ]} />
          {!lists[tab].length ? (
            <EmptyState icon={<ListChecks className="h-5 w-5" />} title={tab === "todo" ? "Every booking has a team" : "Nothing here"}
              desc={tab === "todo" ? "Accepted bookings that need personnel, and teams with declines, appear here." : undefined} />
          ) : (
            <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
              {lists[tab].map((b) => (
                <li key={b.id}>
                  <button onClick={() => select(b.id)} className={cx("w-full px-4 py-3 text-left transition hover:bg-canvas", b.id === openId && "bg-wash")}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-ink">{b.customerName}</p>
                      <span className="tnum text-xs text-muted">{b.acceptedIds?.length ?? 0}✓ · {b.assignedIds?.length ?? 0}/{b.personnelCount}</span>
                    </div>
                    <p className="truncate text-[13px] text-muted">{b.serviceLabel} · {fmtDate(b.eventDate, true)}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <StatusBadge status={b.status} />
                      {!!b.declinedIds?.length && <Badge tone="danger">{b.declinedIds.length} declined</Badge>}
                      {b.clientApproval === "changes_requested" && <Badge tone="danger">Client wants changes</Badge>}
                    </div>
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

/** Snapshot of the job copied onto each offer so the bouncer app can show it without reading the booking. */
function offerDoc(b: Booking, p: Personnel, agency: Agency) {
  return {
    bookingId: b.id, agencyId: b.agencyId, agencyName: agency.name, agencyPhone: agency.phone ?? "",
    personnelId: p.id, personnelName: p.name, status: "offered", declineReason: "", respondBy: respondByFor(b), respondedAt: null,
    serviceLabel: b.serviceLabel ?? "", eventType: b.eventType ?? "", eventDate: b.eventDate ?? null, hours: b.hours ?? 0,
    location: b.location ?? "", requirements: b.requirements ?? "", agencyNote: b.agencyNote ?? "", customerName: b.customerName ?? "",
    checkIn: null, checkOut: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  };
}

function TeamBuilder({ booking: b, onBack }: { booking: Booking; onBack: () => void }) {
  const { personnel, bookings, assignments } = useData();
  const { run, agency } = useActor();
  const confirm = useConfirm();
  const [picked, setPicked] = useState<string[]>(b.assignedIds ?? []);
  const [q, setQ] = useState("");
  const [show, setShow] = useState<"eligible" | "all">("eligible");
  const editable = ["accepted", "assigned", "confirmed"].includes(b.status);

  /** Latest offer per person for this booking. */
  const offers = useMemo(() => {
    const m = new Map<string, Assignment>();
    assignments.filter((a) => a.bookingId === b.id).forEach((a) => m.set(a.personnelId, a));
    return m;
  }, [assignments, b.id]);
  const accepted = new Set(b.acceptedIds ?? []);
  const declined = new Set(b.declinedIds ?? []);
  const responseOf = (pid: string): "accepted" | "declined" | "offered" | "withdrawn" | null => {
    if (accepted.has(pid)) return "accepted";
    if (declined.has(pid)) return "declined";
    return offers.get(pid)?.status ?? null;
  };

  const candidates = useMemo(() => personnel
    .filter((p) => p.active)
    .map((p) => ({ p, reason: offers.get(p.id)?.status === "declined" || declined.has(p.id) ? "Declined this booking" : blockReason(p, b, bookings) }))
    .filter(({ p, reason }) => (show === "all" || !reason || picked.includes(p.id)) && matches(q, p.name, p.code, ...(p.skills ?? []), ...(p.languages ?? [])))
    .sort((x, y) => Number(!!x.reason) - Number(!!y.reason) || (y.p.experienceYears ?? 0) - (x.p.experienceYears ?? 0)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [personnel, bookings, b, q, show, picked, offers]);

  const need = b.personnelCount;
  const full = picked.length >= need;
  const toggle = (id: string) => setPicked((s) => s.includes(id) ? s.filter((x) => x !== id) : full ? s : [...s, id]);
  const changed = picked.slice().sort().join() !== (b.assignedIds ?? []).slice().sort().join();

  const save = () => run(async () => {
    const team = personnel.filter((p) => picked.includes(p.id));
    const old = b.assignedIds ?? [];
    const keptAccepted = (b.acceptedIds ?? []).filter((id) => picked.includes(id));
    const keptDeclined = (b.declinedIds ?? []).filter((id) => picked.includes(id));
    // New people, plus anyone kept whose offer is missing or was withdrawn, get a fresh offer.
    const toOffer = team.filter((p) => !keptAccepted.includes(p.id) && !keptDeclined.includes(p.id)
      && (!old.includes(p.id) || !offers.get(p.id) || offers.get(p.id)!.status === "withdrawn"));
    const removed = old.filter((id) => !picked.includes(id) && offers.get(id) && offers.get(id)!.status !== "withdrawn");
    const allIn = picked.length > 0 && picked.every((id) => keptAccepted.includes(id));

    const batch = writeBatch(db());
    batch.update(doc(db(), "bookings", b.id), {
      assigned: team.map(toAssigned), assignedIds: picked, status: allIn ? "confirmed" : "assigned",
      acceptedIds: keptAccepted, declinedIds: keptDeclined, clientApproval: "none", clientFeedback: "", updatedAt: serverTimestamp(),
    });
    toOffer.forEach((p) => batch.set(doc(db(), "assignments", assignmentId(b.id, p.id)), offerDoc(b, p, agency)));
    removed.forEach((id) => batch.update(doc(db(), "assignments", assignmentId(b.id, id)), { status: "withdrawn", updatedAt: serverTimestamp() }));
    await batch.commit();

    await Promise.all(toOffer.filter((p) => p.userId).map((p) => notify(p.userId!, "assignment", `New job from ${agency.name}`,
      `${b.serviceLabel} · ${fmtDate(b.eventDate, true)} · ${b.location}. Please accept or decline.`, `assignment:${assignmentId(b.id, p.id)}`)));
    await Promise.all(personnel.filter((p) => removed.includes(p.id) && p.userId).map((p) => notify(p.userId!, "assignment",
      "Assignment withdrawn", `${agency.name} changed the team for ${b.serviceLabel} on ${fmtDate(b.eventDate)}.`, `assignment:${assignmentId(b.id, p.id)}`)));
    if (allIn) await notify(b.customerId, "booking", "Your booking is confirmed", `${agency.name}: ${team.map((t) => t.name).join(", ")}.`, `booking:${b.id}`);
    else await notify(b.customerId, "assignment", `${agency.name} is confirming your team`, `${team.map((t) => t.name).join(", ")}. We’ll let you know once everyone confirms.`, `booking:${b.id}`);
  }, allSavedAccepted(picked, b) ? "Team saved — booking confirmed" : "Offers sent to the team", ["Assigned team", `${b.customerName}: ${picked.length} people`]);

  /** Record an acceptance for someone (e.g. a person without the app). Confirms the booking when it completes the team. */
  const acceptFor = async (p: Personnel) => {
    const r = await confirm({ title: `Mark ${p.name} as accepted?`, desc: "Use this when they confirmed by phone or don’t use the Haven app.", confirm: "Mark accepted" });
    if (!r.ok) return;
    const assigned = b.assignedIds ?? [];
    const complete = assigned.every((id) => id === p.id || accepted.has(id));
    await run(async () => {
      const batch = writeBatch(db());
      const ref = doc(db(), "assignments", assignmentId(b.id, p.id));
      if (offers.get(p.id)) batch.update(ref, { status: "accepted", declineReason: "", respondedAt: serverTimestamp(), updatedAt: serverTimestamp() });
      else batch.set(ref, { ...offerDoc(b, p, agency), status: "accepted", respondedAt: serverTimestamp() });
      batch.update(doc(db(), "bookings", b.id), {
        acceptedIds: arrayUnion(p.id), declinedIds: arrayRemove(p.id),
        ...(complete && b.status === "assigned" ? { status: "confirmed" } : {}), updatedAt: serverTimestamp(),
      });
      await batch.commit();
      if (complete && b.status === "assigned") await notify(b.customerId, "booking", "Your booking is confirmed", `${agency.name} confirmed your full team for ${fmtDate(b.eventDate, true)}.`, `booking:${b.id}`);
    }, complete ? "Accepted — booking confirmed" : "Marked as accepted", ["Recorded acceptance", `${p.name} · ${b.customerName}`]);
  };

  const team = personnel.filter((p) => picked.includes(p.id));
  const saved = new Set(b.assignedIds ?? []);

  return (
    <Card className="self-start">
      <CardHeader title={`${b.customerName} · ${b.serviceLabel}`} desc={`${fmtDate(b.eventDate, true)} · ${b.hours}h · ${b.location}`}
        action={<Button size="sm" variant="ghost" className="lg:hidden" icon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>Back</Button>} />
      <div className="space-y-4 p-5">
        {b.requirements && <p className="rounded-lg bg-wash p-3 text-sm"><b className="font-medium text-ink">Client requirements:</b> {b.requirements}</p>}
        {b.clientApproval === "changes_requested" && <p className="rounded-lg bg-danger-soft p-3 text-sm text-danger"><b>Client feedback:</b> {b.clientFeedback || "They asked for a different team."}</p>}

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">{team.slice(0, 6).map((p) => <Avatar key={p.id} name={p.name} url={p.photoUrl} size={32} className="ring-2 ring-white" />)}</div>
          <div className="flex-1">
            <p className="text-sm font-medium text-ink"><span className="tnum">{picked.length}</span> of <span className="tnum">{need}</span> selected · <span className="tnum">{picked.filter((id) => accepted.has(id)).length}</span> accepted</p>
            <div className="mt-1 flex gap-1">{Array.from({ length: need }).map((_, i) => <span key={i} className={cx("h-1.5 flex-1 rounded-full transition", i < picked.length ? "bg-ink" : "bg-line")} />)}</div>
          </div>
          {editable && <Button variant="primary" disabled={!picked.length || !changed} onClick={save} icon={<Send className="h-4 w-4" />}>Send offers</Button>}
        </div>

        {!!team.length && (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {team.map((p) => {
              const st = saved.has(p.id) ? responseOf(p.id) : null;
              const offer = offers.get(p.id);
              return (
                <li key={p.id} className={cx("flex flex-wrap items-center gap-3 px-3 py-2.5", st === "declined" && "bg-danger-soft/60")}>
                  <Avatar name={p.name} url={p.photoUrl} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium text-ink">{p.name}
                      {p.userId ? <span title="Uses the Haven app"><Smartphone className="h-3.5 w-3.5 text-muted" /></span> : <Badge tone="dashed">Not on app</Badge>}</p>
                    <p className="text-xs text-muted">
                      {!st ? "Not sent yet — will get an offer when you save"
                        : st === "declined" ? `Declined${offer?.declineReason ? `: “${offer.declineReason}”` : ""}`
                        : st === "accepted" ? `Accepted${offer?.respondedAt ? ` ${fmtDate(offer.respondedAt, true)}` : ""}`
                        : offer?.respondBy ? <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />Respond by {fmtDate(offer.respondBy, true)}</span> : "Awaiting response"}
                    </p>
                  </div>
                  {st && <StatusBadge status={st} />}
                  {editable && st === "declined" && <Button size="sm" variant="secondary" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => setPicked((s) => s.filter((x) => x !== p.id))}>Replace</Button>}
                  {editable && st && st !== "accepted" && !changed && (
                    <Button size="sm" variant="ghost" icon={<UserCheck className="h-3.5 w-3.5" />} onClick={() => acceptFor(p)}>Mark accepted on their behalf</Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

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
          <p className="text-sm text-muted">This booking is <StatusBadge status={b.status} />, so its team is locked.</p>
        )}
      </div>
    </Card>
  );
}

const allSavedAccepted = (picked: string[], b: Booking) => picked.length > 0 && picked.every((id) => (b.acceptedIds ?? []).includes(id));
