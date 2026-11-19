"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, UploadCloud } from "lucide-react";
import { Badge, Button, Modal, Table, Td, Th, cx } from "./ui";
import { useData } from "./DataProvider";
import { useActor } from "@/lib/useActor";
import { bulkCreate, nextCode, patch } from "@/lib/actions";
import { cleanPhone, downloadPersonnelTemplate, exportXlsx, missingColumns, normaliseRow, parseSheet } from "@/lib/excel";
import { errMsg, splitList, ymd } from "@/lib/format";

interface Parsed { row: number; data: Record<string, string>; errors: string[]; duplicate: boolean }

/**
 * Bulk import in three visible steps: get the template, upload, review.
 * Problems are shown per row before anything is written, and the agency chooses
 * whether to skip duplicates, so a bad sheet never creates bad records.
 */
export function ImportPersonnel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { personnel } = useData();
  const { agency, run, toast } = useActor();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Parsed[]>([]);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => { setFile(null); setRows([]); };
  const close = () => { reset(); onClose(); };

  const load = async (f?: File) => {
    if (!f) return;
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) { toast("Please choose an Excel (.xlsx, .xls) or CSV file.", "error"); return; }
    if (f.size > 5 * 1024 * 1024) { toast("That file is larger than 5 MB. Split it into smaller sheets.", "error"); return; }
    setBusy(true);
    try {
      const raw = await parseSheet(f);
      const missing = missingColumns(Object.keys(raw[0] ?? {}));
      if (raw.length && missing.length) { toast(`Missing required column(s): ${missing.join(", ")}. Use the template.`, "error"); return; }
      const existing = new Map(personnel.map((p) => [cleanPhone(p.phone ?? ""), p.code]));
      const seen = new Map<string, number>();
      const num = (v: string, label: string, min: number, max: number, errors: string[]) => {
        if (!v) return;
        const n = Number(v);
        if (!Number.isFinite(n) || n < min || n > max) errors.push(`${label} must be a number between ${min} and ${max}`);
      };
      const parsed: Parsed[] = raw.map((r, i) => {
        const data = normaliseRow(r);
        const errors: string[] = [];
        const phone = cleanPhone(data.phone);
        const row = i + 2;
        if (data.name.length < 2) errors.push("Name missing");
        if (!phone) errors.push("Mobile missing");
        else if (!/^\+?\d{10,13}$/.test(phone)) errors.push("Invalid mobile");
        if (data.dob && (!/^\d{4}-\d{2}-\d{2}$/.test(data.dob) || isNaN(new Date(data.dob + "T00:00:00").getTime()))) errors.push("DOB must be YYYY-MM-DD");
        if (data.employmentType && !["full_time", "part_time", "contract"].includes(data.employmentType)) errors.push("Unknown employment type");
        if (data.gender && !["male", "female", "other"].includes(data.gender.toLowerCase())) errors.push("Gender must be Male, Female or Other");
        num(data.experienceYears, "Experience", 0, 60, errors);
        num(data.heightCm, "Height", 100, 250, errors);
        num(data.dailyWage, "Daily wage", 0, 1000000, errors);
        if (phone && existing.has(phone)) errors.push(`Mobile already registered (${existing.get(phone) || "existing record"})`);
        else if (phone && seen.has(phone)) errors.push(`Duplicate mobile in file (row ${seen.get(phone)})`);
        if (phone && !seen.has(phone)) seen.set(phone, row);
        return { row, data: { ...data, phone } as Record<string, string>, errors, duplicate: false };
      }).filter((p) => p.data.name || p.data.phone);
      if (!parsed.length) toast("That sheet looks empty. Use the template and try again.", "error");
      setFile(f); setRows(parsed);
    } catch (e) { toast(`Couldn’t read that file: ${errMsg(e)}`, "error"); }
    finally { setBusy(false); }
  };

  const valid = useMemo(() => rows.filter((r) => !r.errors.length && !r.duplicate), [rows]);
  const invalid = rows.filter((r) => r.errors.length).length;
  const dupes = rows.filter((r) => r.errors.some((e) => /mobile already|duplicate mobile/i.test(e))).length;

  /** Rejected rows with their reasons, so the agency can fix the sheet and re-upload just those. */
  const errorReport = () => exportXlsx(`personnel-import-errors-${ymd(new Date())}`, rows.filter((r) => r.errors.length).map((r) => ({
    Row: r.row, "Full name": r.data.name, "Mobile number": r.data.phone, "Date of birth": r.data.dob, Gender: r.data.gender,
    "Experience (years)": r.data.experienceYears, "Height (cm)": r.data.heightCm, Skills: r.data.skills, Certifications: r.data.certifications,
    Languages: r.data.languages, Employment: r.data.employmentType, "Daily wage": r.data.dailyWage, Errors: r.errors.join("; "),
  })), "Rejected rows");

  const doImport = async () => {
    setBusy(true);
    const docs = valid.map((r, i) => ({
      agencyId: agency.id, code: nextCode(personnel, i), name: r.data.name, phone: r.data.phone, photoUrl: null,
      dob: r.data.dob, gender: r.data.gender, experienceYears: Number(r.data.experienceYears) || 0, heightCm: Number(r.data.heightCm) || 0,
      skills: splitList(r.data.skills), certifications: splitList(r.data.certifications), languages: splitList(r.data.languages),
      employmentType: r.data.employmentType || "full_time", dailyWage: Number(r.data.dailyWage) || 0,
      // Bulk-created records are drafts: importing never implies verification.
      verificationStatus: "draft", adminRemarks: "", userId: null, source: "agency", inviteCode: null,
      address: "", workDays: [], shifts: [], preferredAreas: [], availability: "available", leaveUntil: null, active: true, removalRequested: false,
    }));
    const ok = await run(async () => {
      await bulkCreate("personnel", docs);
      await patch("agencies", agency.id, { personnelCount: personnel.length + docs.length });
    }, `${docs.length} personnel imported`, ["Imported personnel", `${docs.length} records from ${file?.name}`]);
    setBusy(false);
    if (ok) close();
  };

  return (
    <Modal open={open} onClose={close} size="max-w-3xl" title="Import personnel"
      desc="Add many people at once from an Excel or CSV file."
      footer={rows.length ? <>
        <Button variant="ghost" onClick={reset}>Choose another file</Button>
        <Button variant="primary" loading={busy} disabled={!valid.length} onClick={doImport}>Import {valid.length} {valid.length === 1 ? "person" : "people"}</Button>
      </> : <Button variant="ghost" onClick={close}>Close</Button>}>
      {!rows.length ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-xl border border-line p-4">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-wash"><FileSpreadsheet className="h-5 w-5 text-ink" /></span>
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">1. Start from our template</p>
              <p className="text-[13px] text-muted">It has the right columns and an instructions sheet.</p>
            </div>
            <Button size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={downloadPersonnelTemplate}>Download template</Button>
          </div>
          <button type="button" onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); load(e.dataTransfer.files?.[0]); }}
            className={cx("flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition",
              drag ? "border-ink bg-wash" : "border-line-2 hover:border-ink/50 hover:bg-canvas")}>
            <UploadCloud className={cx("h-8 w-8 transition", drag ? "-translate-y-1 text-ink" : "text-muted")} />
            <p className="mt-3 text-sm font-medium text-ink">{busy ? "Reading file…" : "2. Drop your file here, or click to browse"}</p>
            <p className="mt-1 text-xs text-muted">.xlsx, .xls or .csv · we check every row before importing</p>
          </button>
          <input ref={input} type="file" hidden accept=".xlsx,.xls,.csv" onChange={(e) => load(e.target.files?.[0])} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Summary icon={<CheckCircle2 className="h-4 w-4" />} n={valid.length} label="Ready to import" />
            <Summary icon={<AlertTriangle className="h-4 w-4" />} n={dupes} label="Duplicate mobiles" />
            <Summary icon={<AlertTriangle className="h-4 w-4" />} n={invalid} label="Rows with errors" danger={invalid > 0} />
          </div>
          <div className="max-h-[38vh] overflow-auto rounded-xl border border-line">
            <Table>
              <thead><tr><Th>Row</Th><Th>Name</Th><Th>Mobile</Th><Th>Skills</Th><Th>Check</Th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.row} className={r.errors.length ? "bg-danger-soft/50" : r.duplicate ? "text-muted" : ""}>
                    <Td className="tnum text-muted">{r.row}</Td>
                    <Td className="font-medium">{r.data.name || "—"}</Td>
                    <Td className="tnum">{r.data.phone || "—"}</Td>
                    <Td className="max-w-[200px] truncate">{r.data.skills || "—"}</Td>
                    <Td>{r.errors.length ? <span className="text-xs text-danger">{r.errors.join(" · ")}</span> : <Badge tone="solid">OK</Badge>}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          {invalid > 0 && <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[13px] text-muted">Rows with errors won’t be imported. Fix them and upload again, or import the valid rows now.</p>
            <Button size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={errorReport}>Download error report</Button></div>}
          <p className="text-[13px] text-muted">Imported people are saved as <b>drafts</b>. Upload their documents and submit them for verification before they can be assigned.</p>
        </div>
      )}
    </Modal>
  );
}

function Summary({ icon, n, label, danger }: { icon: React.ReactNode; n: number; label: string; danger?: boolean }) {
  return (
    <div className={cx("rounded-xl border p-3", danger ? "border-danger/30 bg-danger-soft" : "border-line")}>
      <div className={cx("flex items-center gap-2 text-xs", danger ? "text-danger" : "text-muted")}>{icon}{label}</div>
      <p className="tnum mt-1 text-xl font-semibold text-ink">{n}</p>
    </div>
  );
}
