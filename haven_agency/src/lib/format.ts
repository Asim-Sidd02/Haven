import type { Timestamp } from "firebase/firestore";

export function toDate(ts?: Timestamp | null): Date | null {
  if (!ts || typeof ts.toDate !== "function") return null;
  return ts.toDate();
}

export function fmtDate(ts?: Timestamp | Date | null, withTime = false): string {
  const d = ts instanceof Date ? ts : toDate(ts);
  if (!d) return "—";
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function fmtTime(ts?: Timestamp | null): string {
  const d = toDate(ts);
  return d ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "—";
}

export function ago(ts?: Timestamp | null): string {
  const d = toDate(ts);
  if (!d) return "";
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(ts);
}

export function fmtMoney(n: number | undefined, currency = "INR"): string {
  const v = Number(n ?? 0);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
  } catch {
    return `${currency} ${v.toLocaleString()}`;
  }
}

export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const ym = (d: Date) => ymd(d).slice(0, 7);

export function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function toLocalInput(ts?: Timestamp | null): string {
  const d = toDate(ts);
  if (!d) return "";
  return `${ymd(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export const splitList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export function initials(name?: string): string {
  return (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

export function matches(q: string, ...fields: (string | number | undefined | null)[]): boolean {
  if (!q.trim()) return true;
  const n = q.trim().toLowerCase();
  return fields.some((f) => String(f ?? "").toLowerCase().includes(n));
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const pluralize = (n: number, word: string, plural = word + "s") => `${n} ${n === 1 ? word : plural}`;

export function bookingEnd(start: Date, hours: number) {
  return new Date(start.getTime() + hours * 3600000);
}
