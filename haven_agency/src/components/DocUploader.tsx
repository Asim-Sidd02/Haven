"use client";

import { useRef, useState } from "react";
import { ExternalLink, FileText, Paperclip, Upload } from "lucide-react";
import { Badge, Button, Field, Input, Modal, Select, StatusBadge, cx } from "./ui";
import { useActor } from "@/lib/useActor";
import { create, patch, upload } from "@/lib/actions";
import { daysUntil, fmtDate } from "@/lib/format";
import { DOC_TYPES, type AgencyDoc, type DocType, type Personnel } from "@/lib/types";

/** Upload a document for the agency itself or for one person. Also used to resubmit a rejected one. */
export function DocUploader({ open, onClose, person, replace, defaultType }: {
  open: boolean; onClose: () => void; person?: Personnel | null; replace?: AgencyDoc | null; defaultType?: DocType;
}) {
  const { agency, run } = useActor();
  const input = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<DocType>(replace?.type ?? defaultType ?? (person ? "identity" : "registration"));
  const [name, setName] = useState(replace?.name ?? "");
  const [expires, setExpires] = useState(replace?.expiresAt ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!file) return;
    setBusy(true);
    const label = name.trim() || DOC_TYPES.find((d) => d.key === type)?.label || file.name;
    const ok = await run(async () => {
      const fileUrl = await upload(agency.id, person ? `personnel/${person.id}` : "agency", file);
      if (replace) {
        await patch("documents", replace.id, { fileUrl, name: label, type, expiresAt: expires || null, status: "pending" }, false);
      } else {
        await create("documents", {
          agencyId: agency.id, ownerType: person ? "personnel" : "agency", personnelId: person?.id ?? null, personnelName: person?.name ?? "",
          type, name: label, fileUrl, expiresAt: expires || null, status: "pending", remarks: "", uploadedAt: new Date(),
        });
      }
      if (person && ["draft", "rejected", "expired"].includes(person.verificationStatus)) await patch("personnel", person.id, { verificationStatus: "pending" });
    }, replace ? "Document resubmitted for verification" : "Document uploaded for verification", [replace ? "Resubmitted document" : "Uploaded document", `${label}${person ? ` · ${person.name}` : ""}`]);
    setBusy(false);
    if (ok) { setFile(null); setName(""); setExpires(""); onClose(); }
  };

  return (
    <Modal open={open} onClose={onClose} title={replace ? "Resubmit document" : "Upload document"}
      desc={person ? `For ${person.name} (${person.code})` : "For your agency"}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!file} onClick={save}>Upload</Button></>}>
      <div className="space-y-4">
        {replace?.remarks && <div className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger">Admin remarks: {replace.remarks}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Document type">
            <Select value={type} onChange={(e) => setType(e.target.value as DocType)}>
              {DOC_TYPES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </Select>
          </Field>
          <Field label="Expiry date" hint="If it expires"><Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} /></Field>
          <Field label="Name" className="sm:col-span-2"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aadhaar card, PSARA licence 2026" /></Field>
        </div>
        <button type="button" onClick={() => input.current?.click()}
          className={cx("flex w-full items-center gap-3 rounded-xl border-2 border-dashed px-4 py-5 text-left transition", file ? "border-ink bg-wash" : "border-line-2 hover:border-ink/50")}>
          {file ? <Paperclip className="h-5 w-5 text-ink" /> : <Upload className="h-5 w-5 text-muted" />}
          <span className="flex-1 text-sm">{file ? <b className="font-medium text-ink">{file.name}</b> : <span className="text-muted">Choose a PDF or image (max 10 MB)</span>}</span>
        </button>
        <input ref={input} type="file" hidden accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <p className="text-xs text-muted">Only upload background checks where you have the person’s consent and it’s legally permitted.</p>
      </div>
    </Modal>
  );
}

export function ExpiryBadge({ date }: { date?: string | null }) {
  const n = daysUntil(date);
  if (n === null) return <span className="text-faint">No expiry</span>;
  if (n < 0) return <Badge tone="danger">Expired {Math.abs(n)}d ago</Badge>;
  if (n <= 30) return <Badge tone="outline">Expires in {n}d</Badge>;
  return <span className="text-muted">{fmtDate(new Date(date + "T00:00:00"))}</span>;
}

export function DocRow({ d, onResubmit }: { d: AgencyDoc; onResubmit?: () => void }) {
  const expired = (daysUntil(d.expiresAt) ?? 1) < 0;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5">
      <FileText className="h-4 w-4 shrink-0 text-muted" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{d.name}</p>
        <p className="text-xs text-muted">{DOC_TYPES.find((t) => t.key === d.type)?.label} · <ExpiryBadge date={d.expiresAt} /></p>
        {d.remarks && <p className="mt-0.5 text-xs text-danger">{d.remarks}</p>}
      </div>
      <StatusBadge status={expired ? "expired" : d.status} />
      {(d.status === "rejected" || expired) && onResubmit && <Button size="sm" onClick={onResubmit}>Resubmit</Button>}
      <a href={d.fileUrl} target="_blank" rel="noreferrer" className="rounded p-1 text-muted hover:text-ink" aria-label="Open document"><ExternalLink className="h-4 w-4" /></a>
    </div>
  );
}
