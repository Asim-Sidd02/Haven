"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileCheck2, FilePlus2, Send, Smartphone } from "lucide-react";
import { useData } from "@/components/DataProvider";
import { DocRow, DocUploader, ExpiryBadge } from "@/components/DocUploader";
import { Avatar, Button, Card, CardHeader, EmptyState, PageHeader, SearchInput, Stat, StatusBadge, Table, Tabs, Td, Th, Tr } from "@/components/ui";
import { useActor } from "@/lib/useActor";
import { bulkPatch, patch } from "@/lib/actions";
import { daysUntil, matches, pluralize } from "@/lib/format";
import type { AgencyDoc, Personnel, Verification } from "@/lib/types";

type TabKey = "personnel" | "documents" | "agency" | "expiring" | "rejected";
const FLOW: { s: Verification; d: string }[] = [
  { s: "draft", d: "Saved, not yet submitted" }, { s: "pending", d: "Waiting for Haven review" }, { s: "verified", d: "Can be deployed" },
  { s: "needs_correction", d: "Haven asked for fixes" }, { s: "rejected", d: "Fix and resubmit" }, { s: "expired", d: "A document lapsed" }, { s: "suspended", d: "Blocked by Haven" },
];

export default function Page() { return <Suspense><VerificationPage /></Suspense>; }

function VerificationPage() {
  const { personnel, documents } = useData();
  const { run } = useActor();
  const params = useSearchParams();
  const [tab, setTab] = useState<TabKey>((params.get("tab") as TabKey) || "personnel");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Verification | "">("");
  const [up, setUp] = useState<{ open: boolean; person: Personnel | null; replace: AgencyDoc | null }>({ open: false, person: null, replace: null });

  const counts = useMemo(() => Object.fromEntries(FLOW.map(({ s }) => [s, personnel.filter((p) => p.verificationStatus === s).length])) as Record<Verification, number>, [personnel]);
  const agencyDocs = documents.filter((d) => d.ownerType === "agency");
  const personDocs = documents.filter((d) => d.ownerType === "personnel");
  const expiring = documents.filter((d) => { const n = daysUntil(d.expiresAt); return n !== null && n <= 30; }).sort((a, b) => (daysUntil(a.expiresAt) ?? 0) - (daysUntil(b.expiresAt) ?? 0));
  const rejected = documents.filter((d) => d.status === "rejected" || d.status === "needs_correction");
  const appLinked = (pid: string | null) => !!personnel.find((p) => p.id === pid)?.userId;
  const drafts = personnel.filter((p) => p.verificationStatus === "draft");
  const list = personnel.filter((p) => (!status || p.verificationStatus === status) && matches(q, p.name, p.code));
  const docCount = (id: string) => documents.filter((d) => d.personnelId === id).length;

  return (
    <>
      <PageHeader title="Verification & documents" desc="Only verified personnel can be assigned to bookings. Keep documents current to stay deployable."
        actions={drafts.length > 0 && <Button variant="primary" icon={<Send className="h-4 w-4" />} onClick={() => run(() => bulkPatch("personnel", drafts.map((p) => p.id), { verificationStatus: "pending" }), `${pluralize(drafts.length, "draft")} submitted`, ["Submitted drafts for verification", `${drafts.length}`])}>Submit {drafts.length} draft{drafts.length > 1 ? "s" : ""}</Button>} />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {FLOW.map(({ s, d }) => <Stat key={s} label={d} value={counts[s]} sub={<StatusBadge status={s} />} active={status === s} onClick={() => { setTab("personnel"); setStatus(status === s ? "" : s); }} />)}
      </div>

      <Tabs value={tab} onChange={setTab} className="mb-4" items={[
        { value: "personnel", label: "Personnel", count: personnel.length }, { value: "documents", label: "Personnel documents", count: personDocs.length }, { value: "agency", label: "Agency documents", count: agencyDocs.length },
        { value: "expiring", label: "Expiring soon", count: expiring.length }, { value: "rejected", label: "Rejected / needs fixes", count: rejected.length },
      ]} />

      {tab === "personnel" && (
        <Card>
          <div className="flex items-center gap-3 border-b border-line p-4"><SearchInput value={q} onChange={setQ} placeholder="Search name or ID" className="flex-1" />
            {status && <Button size="sm" variant="ghost" onClick={() => setStatus("")}>Clear status filter</Button>}</div>
          {!list.length ? <EmptyState icon={<FileCheck2 className="h-5 w-5" />} title="No personnel here" desc="Add personnel first, then upload their documents." action={<Link href="/personnel?new=1"><Button>Add personnel</Button></Link>} /> : (
            <Table>
              <thead><tr><Th>Person</Th><Th>Status</Th><Th>Documents</Th><Th>Admin remarks</Th><Th /></tr></thead>
              <tbody>{list.map((p) => (
                <Tr key={p.id}>
                  <Td><Link href={`/personnel?id=${p.id}`} className="flex items-center gap-3 hover:underline"><Avatar name={p.name} url={p.photoUrl} size={30} /><span className="font-medium text-ink">{p.name}</span><span className="font-mono text-xs text-muted">{p.code}</span></Link></Td>
                  <Td><StatusBadge status={p.verificationStatus} /></Td>
                  <Td className="tnum">{docCount(p.id) || <span className="text-danger">None</span>}</Td>
                  <Td className={p.verificationStatus === "needs_correction" ? "max-w-[260px] text-danger" : "max-w-[260px] truncate text-muted"}>{p.adminRemarks || "—"}</Td>
                  <Td className="text-right"><div className="flex justify-end gap-2">
                    {["needs_correction", "rejected"].includes(p.verificationStatus) && <Button size="sm" variant="primary" icon={<Send className="h-3.5 w-3.5" />}
                      onClick={() => run(() => patch("personnel", p.id, { verificationStatus: "pending" }), `${p.name} resubmitted`, ["Resubmitted personnel", p.name])}>Resubmit</Button>}
                    <Button size="sm" icon={<FilePlus2 className="h-3.5 w-3.5" />} onClick={() => setUp({ open: true, person: p, replace: null })}>Upload</Button>
                  </div></Td>
                </Tr>
              ))}</tbody>
            </Table>
          )}
        </Card>
      )}

      {tab === "documents" && (
        <Card>
          <CardHeader title="Personnel documents" desc="Everything uploaded for your people, including documents bouncers uploaded themselves in the Haven app." />
          <div className="space-y-2 p-5">{personDocs.length ? personDocs.map((d) => (
            <div key={d.id}><p className="mb-1 flex items-center gap-1 text-xs text-muted">{d.personnelName}{appLinked(d.personnelId) && <> · <Smartphone className="h-3 w-3" />app user</>}</p>
              <DocRow d={d} onResubmit={() => setUp({ open: true, person: personnel.find((p) => p.id === d.personnelId) ?? null, replace: d })} /></div>
          )) : <EmptyState title="No personnel documents yet" />}</div>
        </Card>
      )}

      {tab === "agency" && (
        <Card>
          <CardHeader title="Business documents & licences" desc="Company registration, security agency licence, GST and insurance certificates."
            action={<Button size="sm" variant="primary" icon={<FilePlus2 className="h-3.5 w-3.5" />} onClick={() => setUp({ open: true, person: null, replace: null })}>Upload</Button>} />
          <div className="space-y-2 p-5">{agencyDocs.length ? agencyDocs.map((d) => <DocRow key={d.id} d={d} onResubmit={() => setUp({ open: true, person: null, replace: d })} />)
            : <EmptyState title="No business documents yet" desc="Upload your registration certificate and security licence. They’re required before Haven can approve your agency." />}</div>
        </Card>
      )}

      {tab === "expiring" && (
        <Card>{!expiring.length ? <EmptyState title="Nothing expiring in the next 30 days" desc="We’ll remind you here and in notifications before anything lapses." /> : (
          <Table><thead><tr><Th>Document</Th><Th>Belongs to</Th><Th>Expiry</Th><Th /></tr></thead>
            <tbody>{expiring.map((d) => (
              <Tr key={d.id}><Td className="font-medium text-ink">{d.name}</Td><Td>{d.personnelName || "Agency"}</Td><Td><ExpiryBadge date={d.expiresAt} /></Td>
                <Td className="text-right"><Button size="sm" onClick={() => setUp({ open: true, person: personnel.find((p) => p.id === d.personnelId) ?? null, replace: d })}>Upload renewal</Button></Td></Tr>
            ))}</tbody></Table>
        )}</Card>
      )}

      {tab === "rejected" && (
        <Card><div className="space-y-2 p-5">{rejected.length ? rejected.map((d) => (
          <div key={d.id}><p className="mb-1 flex items-center gap-1 text-xs text-muted">{d.personnelName || "Agency"}{d.ownerType === "personnel" && appLinked(d.personnelId) && <><Smartphone className="h-3 w-3" />uses app — can also replace it there</>}</p><DocRow d={d} onResubmit={() => setUp({ open: true, person: personnel.find((p) => p.id === d.personnelId) ?? null, replace: d })} /></div>
        )) : <EmptyState title="No rejected documents" />}</div></Card>
      )}

      <DocUploader key={`${up.person?.id}-${up.replace?.id}-${up.open}`} open={up.open} person={up.person} replace={up.replace} onClose={() => setUp({ open: false, person: null, replace: null })} />
    </>
  );
}
