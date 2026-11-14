import type { Timestamp } from "firebase/firestore";

export function toDate(ts?: Timestamp | null): Date | null {
  if (!ts || typeof ts.toDate !== "function") return null;
  return ts.toDate();
}

export function fmtDate(ts?: Timestamp | null, withTime = false): string {
  const d = toDate(ts);
  if (!d) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function fmtMoney(n: number | undefined, currency = "PKR"): string {
  const v = Number(n ?? 0);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
  } catch {
    return `${currency} ${v.toLocaleString()}`;
  }
}

/** Value for <input type="datetime-local"> */
export function toLocalInput(ts?: Timestamp | null): string {
  const d = toDate(ts);
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function splitList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function initials(name?: string): string {
  return (
    (name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function matches(q: string, ...fields: (string | undefined | null)[]): boolean {
  if (!q.trim()) return true;
  const needle = q.trim().toLowerCase();
  return fields.some((f) => (f ?? "").toLowerCase().includes(needle));
}

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
