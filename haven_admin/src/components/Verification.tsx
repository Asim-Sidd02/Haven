"use client";

import { useState } from "react";
import type { Timestamp } from "firebase/firestore";
import { Check, ExternalLink, FileText, PencilLine, X } from "lucide-react";
import { setDocumentStatus } from "@/lib/actions";
import { errMsg, fmtDate } from "@/lib/format";
import type { AgencyDocument, DocStatus, Personnel } from "@/lib/types";
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
      <Field label="Reason" hint="Required. Shown to the agency and the bouncer.">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} autoFocus />
      </Field>
    </Modal>
  );
}

/** Who last reviewed a record, when, and why. */
export function ReviewNote({ by, at, remarks }: { by?: string; at?: Timestamp | null; remarks?: string }) {
  if (!by && !remarks) return null;
  return (
    <div className="mt-3 rounded-xl bg-cream px-3 py-2 text-xs text-ink">
      {remarks && (
        <p>
          <span className="font-semibold">Reason:</span> {remarks}
        </p>
      )}
      {by && (
        <p className={remarks ? "mt-1 text-muted" : "text-muted"}>
          Reviewed by {by}
          {at ? ` · ${fmtDate(at, true)}` : ""}
        </p>
      )}
    </div>
  );
}

type DocAction = "rejected" | "needs_correction";

/** List of documents with verify / reject / request-correction controls. */
export function DocumentList({ docs, emptyHint, person }: { docs: AgencyDocument[]; emptyHint: string; person?: Personnel | null }) {
  const toast = useToast();
  const [acting, setActing] = useState<{ d: AgencyDocument; status: DocAction } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function set(d: AgencyDocument, status: DocStatus, remarks: string) {
    setBusy(d.id);
    try {
      await setDocumentStatus(d, status, remarks, person ?? null);
      toast(`${d.name || "Document"} marked ${status.replace(/_/g, " ")}.`);
      setActing(null);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(null);
    }
  }

  if (docs.length === 0) return <Empty compact icon={FileText} title="No documents" hint={emptyHint} />;

  const sorted = [...docs].sort((a, b) => (b.uploadedAt?.toMillis() ?? 0) - (a.uploadedAt?.toMillis() ?? 0));

  return (
    <>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {sorted.map((d) => (
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
              {d.reviewedBy && (
                <p className="mt-0.5 text-[11px] text-muted">
                  Reviewed by {d.reviewedBy}
                  {d.reviewedAt ? ` · ${fmtDate(d.reviewedAt, true)}` : ""}
                </p>
              )}
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
              <IconButton label="Request correction" disabled={busy === d.id || d.status === "needs_correction"} onClick={() => setActing({ d, status: "needs_correction" })}>
                <PencilLine className="h-4 w-4" />
              </IconButton>
              <IconButton label="Reject document" tone="danger" disabled={busy === d.id || d.status === "rejected"} onClick={() => setActing({ d, status: "rejected" })}>
                <X className="h-4 w-4" />
              </IconButton>
            </div>
          </li>
        ))}
      </ul>
      <RemarksDialog
        open={!!acting}
        title={acting?.status === "needs_correction" ? "Request document correction" : "Reject document"}
        confirmLabel={acting?.status === "needs_correction" ? "Request correction" : "Reject"}
        description={acting?.d.name}
        initial={acting?.d.remarks ?? ""}
        loading={!!acting && busy === acting.d.id}
        onClose={() => setActing(null)}
        onConfirm={(r) => acting && set(acting.d, acting.status, r)}
      />
    </>
  );
}
