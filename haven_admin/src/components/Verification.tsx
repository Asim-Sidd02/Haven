"use client";

import { useState } from "react";
import { Check, ExternalLink, FileText, X } from "lucide-react";
import { setDocumentStatus } from "@/lib/actions";
import { errMsg, fmtDate } from "@/lib/format";
import type { AgencyDocument, DocStatus } from "@/lib/types";
import { Badge, Button, Empty, Field, IconButton, Modal, Textarea } from "@/components/ui";
import { useToast } from "@/components/Toast";

/** Asks for remarks before a reject / suspend style action. */
export function RemarksDialog({
  open,
  title,
  description,
  confirmLabel = "Reject",
  initial = "",
  required = true,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  initial?: string;
  required?: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (remarks: string) => void;
}) {
  const [text, setText] = useState(initial);
  const [shownFor, setShownFor] = useState(open);
  // Reset the text each time the dialog opens.
  if (open !== shownFor) {
    setShownFor(open);
    if (open) setText(initial);
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" loading={loading} disabled={required && !text.trim()} onClick={() => onConfirm(text.trim())}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && <p className="mb-4 text-sm text-muted">{description}</p>}
      <Field label="Remarks" hint="Shown to the agency.">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} autoFocus />
      </Field>
    </Modal>
  );
}

/** List of documents with verify / reject controls. */
export function DocumentList({ docs, emptyHint }: { docs: AgencyDocument[]; emptyHint: string }) {
  const toast = useToast();
  const [rejecting, setRejecting] = useState<AgencyDocument | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function set(d: AgencyDocument, status: DocStatus, remarks: string) {
    setBusy(d.id);
    try {
      await setDocumentStatus(d.id, status, remarks);
      toast(`${d.name || "Document"} marked ${status}.`);
      setRejecting(null);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(null);
    }
  }

  if (docs.length === 0) return <Empty compact icon={FileText} title="No documents" hint={emptyHint} />;

  return (
    <>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {docs.map((d) => (
          <li key={d.id} className="flex items-start gap-3 p-3">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink">{d.name || d.type}</p>
              <p className="truncate text-xs text-muted">
                <span className="capitalize">{d.type}</span>
                {d.ownerType === "personnel" && d.personnelName ? ` · ${d.personnelName}` : ""}
                {d.expiresAt ? ` · expires ${d.expiresAt}` : ""} · {fmtDate(d.uploadedAt)}
              </p>
              {d.remarks && <p className="mt-1 text-xs text-rose">{d.remarks}</p>}
              <div className="mt-1.5">
                <Badge value={d.status} />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {d.fileUrl && (
                <a href={d.fileUrl} target="_blank" rel="noreferrer" title="Open file" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-sage-soft hover:text-sage-dark">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <IconButton label="Mark verified" disabled={busy === d.id || d.status === "verified"} onClick={() => set(d, "verified", "")}>
                <Check className="h-4 w-4" />
              </IconButton>
              <IconButton label="Reject document" tone="danger" disabled={busy === d.id} onClick={() => setRejecting(d)}>
                <X className="h-4 w-4" />
              </IconButton>
            </div>
          </li>
        ))}
      </ul>
      <RemarksDialog
        open={!!rejecting}
        title="Reject document"
        description={rejecting?.name}
        initial={rejecting?.remarks ?? ""}
        loading={!!rejecting && busy === rejecting.id}
        onClose={() => setRejecting(null)}
        onConfirm={(r) => rejecting && set(rejecting, "rejected", r)}
      />
    </>
  );
}
