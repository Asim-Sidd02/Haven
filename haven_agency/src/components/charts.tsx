"use client";

import { cx } from "./ui";

/** Minimal monochrome bar chart: no library, accessible labels, animated growth. */
export function Bars({ data, format = (n) => String(n), height = 160 }: {
  data: { label: string; value: number }[]; format?: (n: number) => string; height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2" style={{ height }} role="img" aria-label={data.map((d) => `${d.label}: ${format(d.value)}`).join(", ")}>
      {data.map((d, i) => (
        <div key={d.label + i} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
          <span className="tnum text-[11px] text-muted opacity-0 transition group-hover:opacity-100">{format(d.value)}</span>
          <div className="w-full max-w-10 origin-bottom rounded-t-md bg-ink transition-[height,background-color] duration-700 group-hover:bg-ink-2"
            style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 3 : 0, animation: `fade-up .6s ${i * 40}ms both` }} />
          <span className={cx("text-[11px]", i === data.length - 1 ? "font-medium text-ink" : "text-muted")}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Horizontal share bars, for "by service" or "by status" breakdowns. */
export function Breakdown({ rows, format = (n) => String(n) }: { rows: { label: string; value: number }[]; format?: (n: number) => string }) {
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex justify-between text-[13px]">
            <span className="text-body">{r.label}</span>
            <span className="tnum font-medium text-ink">{format(r.value)} <span className="font-normal text-faint">· {Math.round((r.value / total) * 100)}%</span></span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-wash"><div className="anim-grow h-full rounded-full bg-ink" style={{ width: `${(r.value / total) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

/** Ring gauge for a single 0–100 value, e.g. agency rating or fill rate. */
export function Ring({ value, label, size = 96 }: { value: number; label: string; size?: number }) {
  const r = 40, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f0f0f0" strokeWidth="9" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#0a0a0a" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: "stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <span className="tnum text-lg font-semibold text-ink">{label}</span>
      </div>
    </div>
  );
}
