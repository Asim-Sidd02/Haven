"use client";

import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Info, Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { initials } from "@/lib/format";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

/* ---------------- Buttons ---------------- */

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant; size?: "sm" | "md"; loading?: boolean; icon?: React.ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = "secondary", size = "md", loading, icon, className, children, disabled, ...rest }, ref,
) {
  const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition duration-150 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";
  const sizes = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-sm" };
  const variants: Record<BtnVariant, string> = {
    primary: "bg-ink text-white hover:bg-ink-2 shadow-card",
    secondary: "border border-line-2 bg-white text-ink hover:border-ink/40 hover:bg-wash",
    ghost: "text-body hover:bg-wash hover:text-ink",
    danger: "bg-danger text-white hover:opacity-90",
    link: "h-auto px-0 text-ink underline-offset-4 hover:underline",
  };
  return (
    <button ref={ref} disabled={disabled || loading} className={cx(base, variant !== "link" && sizes[size], variants[variant], className)} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

export function IconButton({ label, className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} title={label} className={cx("inline-grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-wash hover:text-ink", className)} {...rest}>
      {children}
    </button>
  );
}

/* ---------------- Form controls ---------------- */

const control = "w-full rounded-lg border border-line-2 bg-white px-3 text-sm text-ink transition placeholder:text-faint hover:border-ink/30 focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/5 disabled:bg-wash disabled:text-muted";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cx(control, "h-10", className)} {...p} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cx(control, "min-h-[96px] py-2.5 leading-relaxed", className)} {...p} />;
});

export function Select({ className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cx(control, "h-10 appearance-none pr-9", className)} {...p}>{children}</select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

export function Field({ label, hint, error, required, children, className }: {
  label: string; hint?: string; error?: string; required?: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-medium text-ink">
        <span>{label}{required && <span className="text-muted"> *</span>}</span>
        {hint && !error && <span className="text-xs font-normal text-muted">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export function Checkbox({ checked, onChange, label, indeterminate, className }: {
  checked: boolean; onChange: (v: boolean) => void; label?: string; indeterminate?: boolean; className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <label className={cx("inline-flex cursor-pointer items-center gap-2 text-sm", className)} onClick={(e) => e.stopPropagation()}>
      <input ref={ref} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer rounded border-line-2 accent-ink" aria-label={label} />
      {label && <span>{label}</span>}
    </label>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={cx("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50", checked ? "bg-ink" : "bg-line-2")}>
      <span className={cx("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
    </button>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search", className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cx("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cx(control, "h-10 pl-9 pr-8")} />
      {value && (
        <button onClick={() => onChange("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-faint hover:text-ink">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* ---------------- Display ---------------- */

export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("rounded-xl border border-line bg-white shadow-card", className)} {...p}>{children}</div>;
}

export function CardHeader({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {desc && <p className="mt-0.5 text-[13px] text-muted">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, desc, actions }: { title: string; desc?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {desc && <p className="mt-1 max-w-2xl text-sm text-muted">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export type Tone = "solid" | "dark" | "outline" | "muted" | "danger" | "dashed";

export function Badge({ tone = "muted", children, dot, className }: { tone?: Tone; children: React.ReactNode; dot?: boolean; className?: string }) {
  const tones: Record<Tone, string> = {
    solid: "bg-ink text-white border-ink",
    dark: "bg-ink-2/10 text-ink border-transparent",
    outline: "bg-white text-ink border-line-2",
    muted: "bg-wash text-muted border-transparent",
    danger: "bg-danger-soft text-danger border-transparent",
    dashed: "bg-white text-muted border-dashed border-line-2",
  };
  return (
    <span className={cx("inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-medium", tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Every status in the product mapped to a label + tone so they read consistently everywhere. */
const STATUS: Record<string, [string, Tone]> = {
  // booking
  pending: ["Pending", "outline"], accepted: ["Accepted", "dark"], declined: ["Declined", "muted"], assigned: ["Awaiting bouncers", "outline"], confirmed: ["Confirmed", "dark"],
  ongoing: ["Ongoing", "solid"], completed: ["Completed", "muted"], cancelled: ["Cancelled", "dashed"],
  // verification
  draft: ["Draft", "dashed"], verified: ["Verified", "solid"], rejected: ["Rejected", "danger"], expired: ["Expired", "danger"], suspended: ["Suspended", "danger"],
  approved: ["Approved", "solid"], needs_correction: ["Needs correction", "danger"],
  // assignment offers
  offered: ["Awaiting response", "outline"], withdrawn: ["Withdrawn", "dashed"],
  // availability
  available: ["Available", "solid"], on_leave: ["On leave", "muted"], unavailable: ["Unavailable", "dashed"],
  // attendance
  present: ["Present", "solid"], late: ["Late", "outline"], absent: ["Absent", "danger"],
  // agreements / payments / tickets
  sent: ["Awaiting client", "outline"], paid: ["Paid", "solid"], unpaid: ["Unpaid", "outline"], refunded: ["Refunded", "muted"],
  open: ["Open", "outline"], in_progress: ["In progress", "dark"], escalated: ["Escalated", "danger"], resolved: ["Resolved", "muted"],
  changes_requested: ["Changes requested", "danger"],
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const [label, tone] = STATUS[status] ?? [status.replace(/_/g, " "), "muted" as Tone];
  return <Badge tone={tone} dot className={className}>{label}</Badge>;
}

export function Avatar({ name, url, size = 32, className }: { name?: string; url?: string | null; size?: number; className?: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" width={size} height={size} className={cx("shrink-0 rounded-full object-cover ring-1 ring-line", className)} style={{ width: size, height: size }} />
  ) : (
    <span className={cx("inline-grid shrink-0 place-items-center rounded-full bg-wash font-semibold text-body ring-1 ring-line", className)}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}>{initials(name)}</span>
  );
}

export function Stat({ label, value, sub, icon, onClick, active, href }: {
  label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: React.ReactNode; onClick?: () => void; active?: boolean; href?: string;
}) {
  const cls = cx("group block w-full rounded-xl border bg-white p-4 text-left shadow-card transition",
    (onClick || href) && "hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-pop", active ? "border-ink" : "border-line");
  const inner = (<>
      <div className="flex items-center justify-between text-[13px] text-muted">
        <span>{label}</span>
        {icon && <span className="text-faint transition group-hover:text-ink">{icon}</span>}
      </div>
      <div className="tnum mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
  </>);
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  if (onClick) return <button onClick={onClick} className={cls}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cx("h-1.5 w-full overflow-hidden rounded-full bg-wash", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="anim-grow h-full rounded-full bg-ink" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function EmptyState({ icon, title, desc, action, className }: { icon?: React.ReactNode; title: string; desc?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon && <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl border border-line bg-wash text-muted">{icon}</div>}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {desc && <p className="mt-1 max-w-sm text-sm text-muted">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} />;
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  );
}

export function Callout({ tone = "info", title, children, action }: { tone?: "info" | "warn" | "success"; title?: string; children?: React.ReactNode; action?: React.ReactNode }) {
  const Icon = tone === "warn" ? AlertTriangle : tone === "success" ? CheckCircle2 : Info;
  return (
    <div className={cx("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
      tone === "warn" ? "border-ink/20 bg-white" : "border-line bg-wash")}>
      <Icon className={cx("mt-0.5 h-4 w-4 shrink-0", tone === "warn" ? "text-ink" : "text-muted")} />
      <div className="flex-1">
        {title && <p className="font-medium text-ink">{title}</p>}
        {children && <div className="text-body">{children}</div>}
      </div>
      {action}
    </div>
  );
}

/* ---------------- Tabs ---------------- */

export function Tabs<T extends string>({ value, onChange, items, className }: {
  value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[]; className?: string;
}) {
  return (
    <div role="tablist" className={cx("flex gap-1 overflow-x-auto border-b border-line", className)}>
      {items.map((it) => {
        const on = it.value === value;
        return (
          <button key={it.value} role="tab" aria-selected={on} onClick={() => onChange(it.value)}
            className={cx("relative -mb-px flex shrink-0 items-center gap-2 px-3 py-2.5 text-sm transition",
              on ? "font-medium text-ink" : "text-muted hover:text-ink")}>
            {it.label}
            {it.count !== undefined && (
              <span className={cx("tnum rounded-full px-1.5 text-[11px] font-medium", on ? "bg-ink text-white" : "bg-wash text-muted")}>{it.count}</span>
            )}
            {on && <span className="anim-grow absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ink" />}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-wash p-0.5">
      {items.map((it) => (
        <button key={it.value} onClick={() => onChange(it.value)}
          className={cx("rounded-md px-3 py-1.5 text-[13px] transition", it.value === value ? "bg-white font-medium text-ink shadow-card" : "text-muted hover:text-ink")}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Table ---------------- */

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
    </div>
  );
}
export const Th = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <th className={cx("whitespace-nowrap border-b border-line bg-canvas px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted", className)}>{children}</th>
);
export const Td = ({ children, className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cx("border-b border-line px-4 py-3 align-middle", className)} {...p}>{children}</td>
);
export const Tr = ({ children, onClick, selected }: { children: React.ReactNode; onClick?: () => void; selected?: boolean }) => (
  <tr onClick={onClick} className={cx("transition-colors", onClick && "cursor-pointer hover:bg-canvas", selected && "bg-wash")}>{children}</tr>
);

/* ---------------- Overlays ---------------- */

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = prev; };
  }, [open, onClose]);
}

export function Drawer({ open, onClose, title, subtitle, children, footer, width = "max-w-xl" }: {
  open: boolean; onClose: () => void; title: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; width?: string;
}) {
  useEscape(open, onClose);
  if (!open) return null;
  // Portalled to <body> so an animated/transformed page wrapper can't trap the fixed overlay.
  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="anim-fade absolute inset-0 bg-ink/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cx("anim-drawer absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-pop", width)}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-ink">{title}</h2>
            {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
          </div>
          <IconButton label="Close" onClick={onClose}><X className="h-5 w-5" /></IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-canvas px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Modal({ open, onClose, title, desc, children, footer, size = "max-w-lg" }: {
  open: boolean; onClose: () => void; title: string; desc?: string; children?: React.ReactNode; footer?: React.ReactNode; size?: string;
}) {
  useEscape(open, onClose);
  const id = useId();
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby={id}>
      <div className="anim-fade absolute inset-0 bg-ink/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cx("anim-pop relative flex max-h-[90vh] w-full flex-col rounded-2xl bg-white shadow-pop", size)}>
        <div className="px-6 pb-2 pt-6">
          <h2 id={id} className="text-lg font-semibold text-ink">{title}</h2>
          {desc && <p className="mt-1 text-sm text-muted">{desc}</p>}
        </div>
        {children && <div className="overflow-y-auto px-6 py-3">{children}</div>}
        {footer && <div className="flex flex-wrap justify-end gap-2 px-6 pb-6 pt-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ---------------- Confirm (promise-based) ---------------- */

interface ConfirmOpts { title: string; desc?: string; confirm?: string; danger?: boolean; input?: { label: string; placeholder?: string; required?: boolean } }
type ConfirmFn = (o: ConfirmOpts) => Promise<{ ok: boolean; text: string }>;
const ConfirmCtx = createContext<ConfirmFn>(async () => ({ ok: false, text: "" }));
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOpts & { resolve: (r: { ok: boolean; text: string }) => void }) | null>(null);
  const [text, setText] = useState("");
  const fn = useCallback<ConfirmFn>((o) => new Promise((resolve) => { setText(""); setState({ ...o, resolve }); }), []);
  const close = (ok: boolean) => { state?.resolve({ ok, text: text.trim() }); setState(null); };
  const blocked = !!state?.input?.required && !text.trim();
  return (
    <ConfirmCtx.Provider value={fn}>
      {children}
      <Modal open={!!state} onClose={() => close(false)} title={state?.title ?? ""} desc={state?.desc}
        footer={<>
          <Button variant="ghost" onClick={() => close(false)}>Cancel</Button>
          <Button variant={state?.danger ? "danger" : "primary"} disabled={blocked} onClick={() => close(true)}>{state?.confirm ?? "Confirm"}</Button>
        </>}>
        {state?.input && (
          <Field label={state.input.label} required={state.input.required}>
            <Textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={state.input.placeholder} className="min-h-[80px]" />
          </Field>
        )}
      </Modal>
    </ConfirmCtx.Provider>
  );
}

/* ---------------- Misc ---------------- */

export function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-muted">{k}</span>
      <span className="text-right font-medium text-ink">{v || "—"}</span>
    </div>
  );
}

export function Section({ title, desc, children, action }: { title: string; desc?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h4>
          {desc && <p className="mt-0.5 text-xs text-faint">{desc}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function BulkBar({ count, onClear, children }: { count: number; onClear: () => void; children: React.ReactNode }) {
  if (!count) return null;
  return (
    <div className="anim-pop fixed inset-x-0 bottom-6 z-40 mx-auto flex w-fit max-w-[calc(100%-2rem)] flex-wrap items-center gap-2 rounded-2xl bg-ink px-3 py-2 text-white shadow-pop">
      <span className="px-2 text-sm font-medium tnum">{count} selected</span>
      <span className="h-5 w-px bg-white/20" />
      <div className="flex flex-wrap gap-1 [&_button]:text-white [&_button:hover]:bg-white/10">{children}</div>
      <IconButton label="Clear selection" onClick={onClear} className="text-white/70 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></IconButton>
    </div>
  );
}

export function Chips({ items, max = 3 }: { items?: string[]; max?: number }) {
  if (!items?.length) return <span className="text-faint">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.slice(0, max).map((s) => <span key={s} className="rounded-md bg-wash px-1.5 py-0.5 text-xs text-body">{s}</span>)}
      {items.length > max && <span className="px-1 text-xs text-muted">+{items.length - max}</span>}
    </div>
  );
}
