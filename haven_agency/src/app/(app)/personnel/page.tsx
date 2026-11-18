"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Download, FileUp, MoreHorizontal, Pencil, Plane, Power, Send, Trash2, UserPlus, Users, FilePlus2,
} from "lucide-react";
import { useData } from "@/components/DataProvider";
import { PersonnelForm } from "@/components/PersonnelForm";
import { ImportPersonnel } from "@/components/ImportPersonnel";
import { DocRow, DocUploader } from "@/components/DocUploader";
import {
  Avatar, Badge, BulkBar, Button, Card, Checkbox, Chips, Drawer, EmptyState, Field, Input, KV, Modal, PageHeader, SearchInput, Section,
  Select, StatusBadge, TableSkeleton, Tabs, Table, Td, Th, Tr,
} from "@/components/ui";
import { useActor } from "@/lib/useActor";
import { bulkPatch, derivedAvailability, patch } from "@/lib/actions";
import { exportXlsx } from "@/lib/excel";
import { ago, fmtDate, matches, pluralize, ymd } from "@/lib/format";
import type { AgencyDoc, Personnel } from "@/lib/types";
import { useConfirm } from "@/components/ui";

type TabKey = "all" | "available" | "assigned" | "on_leave" | "verification" | "inactive";

export default function Page() {
  return <Suspense><PersonnelPage /></Suspense>;
}

function PersonnelPage() {
  const { personnel, bookings, documents, loading } = useData();
  const { run } = useActor();
  const confirm = useConfirm();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [tab, setTab] = useState<TabKey>("all");
  const [q, setQ] = useState("");
  const [skill, setSkill] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<{ open: boolean; editing: Personnel | null }>({ open: false, editing: null });
  const [importOpen, setImportOpen] = useState(false);
  const [leaveFor, setLeaveFor] = useState<string[] | null>(null);

  // Deep links from the command palette and overview: ?new=1, ?import=1, ?id=…
  useEffect(() => {
    if (params.get("new")) setForm({ open: true, editing: null });
    if (params.get("import")) setImportOpen(true);
  }, [params]);
  const openId = params.get("id");
  const setOpenId = (id: string | null) => router.replace(id ? `${pathname}?id=${id}` : pathname, { scroll: false });
  const clearParams = () => (params.get("new") || params.get("import")) && router.replace(pathname, { scroll: false });

  const rows = useMemo(() => personnel.map((p) => ({ ...p, live: derivedAvailability(p, bookings) })), [personnel, bookings]);
  const counts = useMemo(() => ({
    all: rows.filter((p) => p.active).length,
    available: rows.filter((p) => p.active && p.live === "available" && p.verificationStatus === "verified").length,
    assigned: rows.filter((p) => p.active && p.live === "assigned").length,
    on_leave: rows.filter((p) => p.active && (p.live === "on_leave" || p.live === "unavailable")).length,
    verification: rows.filter((p) => p.verificationStatus !== "verified").length,
    inactive: rows.filter((p) => !p.active).length,
  }), [rows]);
  const skills = useMemo(() => [...new Set(personnel.flatMap((p) => p.skills ?? []))].sort(), [personnel]);

  const shown = rows.filter((p) => {
    const inTab = tab === "all" ? p.active
      : tab === "available" ? p.active && p.live === "available" && p.verificationStatus === "verified"
      : tab === "assigned" ? p.active && p.live === "assigned"
      : tab === "on_leave" ? p.active && (p.live === "on_leave" || p.live === "unavailable")
      : tab === "verification" ? p.verificationStatus !== "verified" : !p.active;
    return inTab && (!skill || p.skills?.includes(skill)) && matches(q, p.name, p.code, p.phone, ...(p.languages ?? []));
  });

  const allSel = shown.length > 0 && shown.every((p) => sel.has(p.id));
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const ids = [...sel];

  const exportList = (list: Personnel[]) => exportXlsx(`personnel-${ymd(new Date())}`, list.map((p) => ({
    "Personnel ID": p.code, Name: p.name, Mobile: p.phone, "Date of birth": p.dob, Gender: p.gender, "Experience (yrs)": p.experienceYears,
    "Height (cm)": p.heightCm, Skills: (p.skills ?? []).join(", "), Certifications: (p.certifications ?? []).join(", "),
    Languages: (p.languages ?? []).join(", "), Employment: p.employmentType, "Daily wage": p.dailyWage,
    Verification: p.verificationStatus, Availability: derivedAvailability(p, bookings), Active: p.active ? "Yes" : "No",
  })), "Personnel");

  const bulk = async (data: Record<string, unknown>, msg: string, action: string) => {
    if (await run(() => bulkPatch("personnel", ids, data), msg, [action, pluralize(ids.length, "person", "people")])) setSel(new Set());
  };

  const openPerson = rows.find((p) => p.id === openId) ?? null;

  return (
    <>
      <PageHeader title="Personnel" desc="Everyone your agency can deploy. Add people one at a time or import them from Excel."
        actions={<>
          <Button icon={<Download className="h-4 w-4" />} onClick={() => exportList(shown)} disabled={!shown.length}>Export</Button>
          <Button icon={<FileUp className="h-4 w-4" />} onClick={() => setImportOpen(true)}>Import</Button>
          <Button variant="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setForm({ open: true, editing: null })}>Add personnel</Button>
        </>} />

      <Card>
        <Tabs value={tab} onChange={(v) => { setTab(v); setSel(new Set()); }} className="px-3" items={[
          { value: "all", label: "Active", count: counts.all },
          { value: "available", label: "Available", count: counts.available },
          { value: "assigned", label: "Assigned", count: counts.assigned },
          { value: "on_leave", label: "On leave", count: counts.on_leave },
          { value: "verification", label: "Not verified", count: counts.verification },
          { value: "inactive", label: "Deactivated", count: counts.inactive },
        ]} />
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row">
          <SearchInput value={q} onChange={setQ} placeholder="Search by name, ID, mobile or language" className="flex-1" />
          <div className="sm:w-56">
            <Select value={skill} onChange={(e) => setSkill(e.target.value)} aria-label="Filter by skill">
              <option value="">All skills</option>
              {skills.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </div>
        </div>

        {loading ? <TableSkeleton /> : personnel.length === 0 ? (
          <EmptyState icon={<Users className="h-5 w-5" />} title="Add your first team members"
            desc="Import your existing roster from Excel in one go, or add people one by one."
            action={<div className="flex gap-2"><Button onClick={() => setImportOpen(true)} icon={<FileUp className="h-4 w-4" />}>Import from Excel</Button><Button variant="primary" onClick={() => setForm({ open: true, editing: null })}>Add personnel</Button></div>} />
        ) : shown.length === 0 ? (
          <EmptyState title="No one matches" desc="Try a different tab, search or skill filter." action={<Button size="sm" onClick={() => { setQ(""); setSkill(""); setTab("all"); }}>Clear filters</Button>} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="w-10"><Checkbox checked={allSel} indeterminate={!allSel && shown.some((p) => sel.has(p.id))} onChange={(v) => setSel(v ? new Set(shown.map((p) => p.id)) : new Set())} label="Select all" /></Th>
                <Th>Person</Th><Th>Mobile</Th><Th>Experience</Th><Th>Skills</Th><Th>Verification</Th><Th>Availability</Th><Th />
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <Tr key={p.id} onClick={() => setOpenId(p.id)} selected={sel.has(p.id)}>
                  <Td><Checkbox checked={sel.has(p.id)} onChange={() => toggle(p.id)} label={`Select ${p.name}`} /></Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={p.name} url={p.photoUrl} size={34} />
                      <div><p className="font-medium text-ink">{p.name}</p><p className="font-mono text-xs text-muted">{p.code}</p></div>
                    </div>
                  </Td>
                  <Td className="tnum">{p.phone}</Td>
                  <Td className="tnum">{p.experienceYears ? `${p.experienceYears} yrs` : "—"}</Td>
                  <Td><Chips items={p.skills} max={2} /></Td>
                  <Td><StatusBadge status={p.verificationStatus} /></Td>
                  <Td>{p.active ? <StatusBadge status={p.live} /> : <Badge tone="dashed">Deactivated</Badge>}</Td>
                  <Td className="text-right"><MoreHorizontal className="ml-auto h-4 w-4 text-faint" /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        {shown.length > 0 && <p className="px-5 py-3 text-xs text-muted">Showing {pluralize(shown.length, "person", "people")}</p>}
      </Card>

      <BulkBar count={sel.size} onClear={() => setSel(new Set())}>
        <Button size="sm" variant="ghost" icon={<Users className="h-3.5 w-3.5" />} onClick={() => bulk({ availability: "available", leaveUntil: null }, "Marked available", "Bulk set available")}>Available</Button>
        <Button size="sm" variant="ghost" icon={<Plane className="h-3.5 w-3.5" />} onClick={() => setLeaveFor(ids)}>On leave</Button>
        <Button size="sm" variant="ghost" icon={<Send className="h-3.5 w-3.5" />} onClick={() => {
          const eligible = personnel.filter((p) => sel.has(p.id) && ["draft", "rejected", "expired"].includes(p.verificationStatus)).map((p) => p.id);
          if (!eligible.length) { run(async () => { throw new Error("None of the selected people need verification."); }, ""); return; }
          run(() => bulkPatch("personnel", eligible, { verificationStatus: "pending" }), `${pluralize(eligible.length, "person", "people")} sent for verification`, ["Bulk submitted for verification", `${eligible.length}`]).then(() => setSel(new Set()));
        }}>Verify</Button>
        <Button size="sm" variant="ghost" icon={<Download className="h-3.5 w-3.5" />} onClick={() => exportList(personnel.filter((p) => sel.has(p.id)))}>Export</Button>
        {tab === "inactive"
          ? <Button size="sm" variant="ghost" icon={<Power className="h-3.5 w-3.5" />} onClick={() => bulk({ active: true }, "Reactivated", "Bulk reactivated")}>Reactivate</Button>
          : <Button size="sm" variant="ghost" icon={<Power className="h-3.5 w-3.5" />} onClick={async () => {
              const r = await confirm({ title: `Deactivate ${pluralize(ids.length, "person", "people")}?`, desc: "They won’t appear when assigning teams. You can reactivate them any time.", confirm: "Deactivate", danger: true });
              if (r.ok) bulk({ active: false }, "Deactivated", "Bulk deactivated");
            }}>Deactivate</Button>}
      </BulkBar>

      <PersonnelForm open={form.open} editing={form.editing} onClose={() => { setForm({ open: false, editing: null }); clearParams(); }} />
      <ImportPersonnel open={importOpen} onClose={() => { setImportOpen(false); clearParams(); }} />
      <LeaveModal ids={leaveFor} onClose={() => setLeaveFor(null)} onDone={() => setSel(new Set())} />
      <PersonDrawer person={openPerson} docs={documents.filter((d) => d.personnelId === openPerson?.id)} onClose={() => setOpenId(null)}
        onEdit={(p) => setForm({ open: true, editing: p })} onLeave={(p) => setLeaveFor([p.id])} />
    </>
  );
}

function LeaveModal({ ids, onClose, onDone }: { ids: string[] | null; onClose: () => void; onDone: () => void }) {
  const { run } = useActor();
  const [until, setUntil] = useState("");
  return (
    <Modal open={!!ids} onClose={onClose} title="Mark on leave" desc={ids ? `${pluralize(ids.length, "person", "people")} won’t be offered for assignments until they return.` : ""}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={async () => {
          if (ids && await run(() => bulkPatch("personnel", ids, { availability: "on_leave", leaveUntil: until || null }), "Marked on leave", ["Marked on leave", `${ids.length}`])) { onDone(); onClose(); setUntil(""); }
        }}>Mark on leave</Button></>}>
      <Field label="Back on" hint="Optional"><Input type="date" value={until} min={ymd(new Date())} onChange={(e) => setUntil(e.target.value)} /></Field>
    </Modal>
  );
}

function PersonDrawer({ person: p, docs, onClose, onEdit, onLeave }: {
  person: (Personnel & { live: Personnel["availability"] }) | null; docs: AgencyDoc[]; onClose: () => void; onEdit: (p: Personnel) => void; onLeave: (p: Personnel) => void;
}) {
  const { bookings, activity } = useData();
  const { run } = useActor();
  const confirm = useConfirm();
  const [upload, setUpload] = useState<{ open: boolean; replace: AgencyDoc | null }>({ open: false, replace: null });
  if (!p) return null;
  const history = bookings.filter((b) => b.assignedIds?.includes(p.id));
  const acts = activity.filter((a) => a.target.includes(p.name)).slice(0, 6);

  return (
    <Drawer open onClose={onClose} width="max-w-2xl"
      title={<span className="flex items-center gap-3"><Avatar name={p.name} url={p.photoUrl} size={40} />{p.name}</span>}
      subtitle={<span className="flex flex-wrap items-center gap-2"><span className="font-mono">{p.code}</span><StatusBadge status={p.verificationStatus} />{p.active ? <StatusBadge status={p.live} /> : <Badge tone="dashed">Deactivated</Badge>}</span>}
      footer={<>
        {p.active ? (
          <Button variant="ghost" icon={<Power className="h-4 w-4" />} onClick={async () => {
            const r = await confirm({ title: `Deactivate ${p.name}?`, desc: "They won’t be offered for new assignments. Their history is kept.", confirm: "Deactivate", danger: true });
            if (r.ok) run(() => patch("personnel", p.id, { active: false }), `${p.name} deactivated`, ["Deactivated personnel", p.name]);
          }}>Deactivate</Button>
        ) : <Button variant="ghost" onClick={() => run(() => patch("personnel", p.id, { active: true }), `${p.name} reactivated`, ["Reactivated personnel", p.name])}>Reactivate</Button>}
        {!p.removalRequested ? (
          <Button variant="ghost" icon={<Trash2 className="h-4 w-4" />} onClick={async () => {
            const r = await confirm({ title: "Request removal?", desc: "Records are kept centrally for compliance, so the Haven team removes them on request.", confirm: "Request removal", danger: true, input: { label: "Reason", required: true } });
            if (r.ok) run(() => patch("personnel", p.id, { removalRequested: true, active: false }), "Removal requested", ["Requested personnel removal", `${p.name}: ${r.text}`]);
          }}>Request removal</Button>
        ) : <Badge tone="danger">Removal requested</Badge>}
        <span className="flex-1" />
        {p.availability !== "on_leave"
          ? <Button icon={<Plane className="h-4 w-4" />} onClick={() => onLeave(p)}>Mark on leave</Button>
          : <Button onClick={() => run(() => patch("personnel", p.id, { availability: "available", leaveUntil: null }), "Back from leave", ["Marked available", p.name])}>End leave</Button>}
        <Button variant="primary" icon={<Pencil className="h-4 w-4" />} onClick={() => onEdit(p)}>Edit</Button>
      </>}>
      {p.adminRemarks && p.verificationStatus === "rejected" && <div className="mb-5 rounded-xl bg-danger-soft p-4 text-sm text-danger"><b>Admin remarks:</b> {p.adminRemarks}</div>}
      {p.availability === "on_leave" && p.leaveUntil && <div className="mb-5 rounded-xl bg-wash p-3 text-sm">On leave until <b>{fmtDate(new Date(p.leaveUntil + "T00:00:00"))}</b></div>}

      <div className="grid gap-x-8 sm:grid-cols-2">
        <Section title="Profile">
          <div className="divide-y divide-line">
            <KV k="Mobile" v={p.phone} /><KV k="Date of birth" v={p.dob} /><KV k="Gender" v={p.gender} />
            <KV k="Height" v={p.heightCm ? `${p.heightCm} cm` : ""} /><KV k="Experience" v={p.experienceYears ? `${p.experienceYears} years` : ""} />
          </div>
        </Section>
        <Section title="Employment">
          <div className="divide-y divide-line">
            <KV k="Type" v={p.employmentType?.replace("_", "-")} /><KV k="Daily wage" v={p.dailyWage || ""} />
            <KV k="Languages" v={(p.languages ?? []).join(", ")} /><KV k="Joined" v={fmtDate(p.createdAt)} />
          </div>
        </Section>
      </div>
      <Section title="Skills & certifications">
        <div className="space-y-2"><Chips items={p.skills} max={20} /><Chips items={p.certifications} max={20} /></div>
      </Section>

      <Section title={`Documents (${docs.length})`} action={<Button size="sm" icon={<FilePlus2 className="h-3.5 w-3.5" />} onClick={() => setUpload({ open: true, replace: null })}>Upload</Button>}>
        {docs.length ? <div className="space-y-2">{docs.map((d) => <DocRow key={d.id} d={d} onResubmit={() => setUpload({ open: true, replace: d })} />)}</div>
          : <p className="rounded-lg border border-dashed border-line-2 p-4 text-center text-sm text-muted">No documents yet. Upload an ID proof and training certificate to get {p.name.split(" ")[0]} verified.</p>}
      </Section>

      <Section title={`Assignment history (${history.length})`}>
        {history.length ? (
          <div className="divide-y divide-line rounded-lg border border-line">
            {history.slice(0, 8).map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <div><p className="font-medium text-ink">{b.customerName} · {b.serviceLabel}</p><p className="text-xs text-muted">{fmtDate(b.eventDate, true)} · {b.location}</p></div>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted">Not assigned to any booking yet.</p>}
      </Section>

      {acts.length > 0 && (
        <Section title="Activity">
          <ul className="space-y-2 text-sm">{acts.map((a) => <li key={a.id} className="flex justify-between gap-3"><span><b className="font-medium text-ink">{a.actorName}</b> {a.action.toLowerCase()}</span><span className="text-xs text-faint">{ago(a.createdAt)}</span></li>)}</ul>
        </Section>
      )}
      <DocUploader open={upload.open} replace={upload.replace} person={p} onClose={() => setUpload({ open: false, replace: null })} />
    </Drawer>
  );
}
