/** Excel / CSV helpers. SheetJS is loaded on demand so it never weighs down page loads. */

export type Row = Record<string, string | number | boolean | null | undefined>;

export async function exportXlsx(filename: string, rows: Row[], sheet = "Sheet1") {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const cols = Object.keys(rows[0] ?? {});
  ws["!cols"] = cols.map((c) => ({ wch: Math.min(40, Math.max(c.length + 2, ...rows.map((r) => String(r[c] ?? "").length + 2))) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export async function parseSheet(file: File): Promise<Row[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Row>(ws, { defval: "", raw: false });
}

/** Columns of the personnel import template, with the header text agencies see. */
export const PERSONNEL_COLUMNS = [
  { key: "name", header: "Full name *", example: "Ravi Kumar" },
  { key: "phone", header: "Mobile number *", example: "9876543210" },
  { key: "dob", header: "Date of birth (YYYY-MM-DD)", example: "1992-04-18" },
  { key: "gender", header: "Gender", example: "Male" },
  { key: "experienceYears", header: "Experience (years)", example: "5" },
  { key: "heightCm", header: "Height (cm)", example: "185" },
  { key: "skills", header: "Skills (comma separated)", example: "Crowd control, First aid" },
  { key: "certifications", header: "Certifications (comma separated)", example: "PSARA basic training" },
  { key: "languages", header: "Languages (comma separated)", example: "English, Hindi, Telugu" },
  { key: "employmentType", header: "Employment (full_time / part_time / contract)", example: "full_time" },
  { key: "dailyWage", header: "Daily wage", example: "1200" },
] as const;

export async function downloadPersonnelTemplate() {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([PERSONNEL_COLUMNS.map((c) => c.header), PERSONNEL_COLUMNS.map((c) => c.example)]);
  ws["!cols"] = PERSONNEL_COLUMNS.map((c) => ({ wch: Math.max(c.header.length, 14) + 2 }));
  const help = XLSX.utils.aoa_to_sheet([
    ["How to fill this template"],
    ["1. One person per row. Delete the example row before uploading."],
    ["2. Columns marked * are required."],
    ["3. Separate multiple skills, certifications or languages with commas."],
    ["4. Mobile numbers must be unique. Duplicates are flagged before import."],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Personnel");
  XLSX.utils.book_append_sheet(wb, help, "Instructions");
  XLSX.writeFile(wb, "haven-personnel-template.xlsx");
}

/** Map a sheet row to template keys, tolerating header variations ("Full name", "name", "NAME *"). */
export function normaliseRow(r: Row): Record<string, string> {
  const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)|\*/g, "").replace(/[^a-z]/g, "");
  const lookup = new Map(Object.entries(r).map(([k, v]) => [norm(k), String(v ?? "").trim()]));
  const out: Record<string, string> = {};
  for (const c of PERSONNEL_COLUMNS) out[c.key] = lookup.get(norm(c.header)) ?? lookup.get(norm(c.key)) ?? "";
  if (!out.name) out.name = lookup.get("name") ?? "";
  if (!out.phone) out.phone = lookup.get("phone") ?? lookup.get("mobile") ?? "";
  return out;
}

export const cleanPhone = (p: string) => p.replace(/[^\d+]/g, "").replace(/^\+?91(?=\d{10}$)/, "");
