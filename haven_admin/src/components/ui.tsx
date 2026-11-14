"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { AlertTriangle, Inbox, Loader2, Search, ShieldCheck, Star, X } from "lucide-react";
import { initials } from "@/lib/format";

/* ------------------------------------------------------------------ */
/*  Buttons                                                            */
/* ------------------------------------------------------------------ */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className = "",
  children,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "icon"; loading?: boolean }) {
  const styles: Record<Variant, string> = {
    primary: "bg-sage text-white hover:bg-sage-dark shadow-[inset_0_-1px_0_rgba(0,0,0,.08)]",
    secondary: "border border-line bg-white text-ink hover:border-[#d6d2cb] hover:bg-cream",
    ghost: "text-muted hover:bg-sage-soft hover:text-sage-dark",
    danger: "bg-rose text-white hover:brightness-95",
    soft: "bg-sage-soft text-sage-dark hover:bg-[#dbe5df]",
  };
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", icon: "h-8 w-8 p-0 text-sm" };
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-medium transition duration-150 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${FOCUS} ${styles[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  tone = "default",
  className = "",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: "default" | "danger" }) {
  const tones = {
    default: "text-muted hover:bg-sage-soft hover:text-sage-dark",
    danger: "text-muted hover:bg-rose-soft hover:text-rose",
  };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition duration-150 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS} ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Layout bits                                                        */
/* ------------------------------------------------------------------ */

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl border border-line bg-white shadow-soft ${className}`}>{children}</div>;
}

export function CardHeader({ title, meta, action }: { title: string; meta?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {meta && <span className="text-xs text-muted">{meta}</span>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-[28px] font-semibold leading-tight tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Section({ title, hint, children, className = "" }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <fieldset className={`min-w-0 ${className}`}>
      <legend className="mb-3 flex items-baseline gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</span>
        {hint && <span className="text-xs text-muted/80">{hint}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/*  Badges, stars, avatars                                             */
/* ------------------------------------------------------------------ */

const TONES: Record<string, string> = {
  pending: "bg-amber-soft text-amber",
  approved: "bg-sage-soft text-sage-dark",
  accepted: "bg-sage-soft text-sage-dark",
  completed: "bg-slate-soft text-slate",
  declined: "bg-rose-soft text-rose",
  cancelled: "bg-rose-soft text-rose",
  rejected: "bg-rose-soft text-rose",
  suspended: "bg-[#eeeae5] text-muted",
  admin: "bg-sand-soft text-sand-dark",
  bouncer: "bg-sage-soft text-sage-dark",
  customer: "bg-slate-soft text-slate",
  active: "bg-sage-soft text-sage-dark",
  inactive: "bg-rose-soft text-rose",
};

const DOTS: Record<string, string> = {
  pending: "bg-amber",
  approved: "bg-sage",
  accepted: "bg-sage",
  completed: "bg-slate",
  declined: "bg-rose",
  cancelled: "bg-rose",
  rejected: "bg-rose",
  suspended: "bg-muted",
  active: "bg-sage",
  inactive: "bg-rose",
};

export function Badge({ value, label, dot = true }: { value: string; label?: string; dot?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold capitalize leading-4 ${
        TONES[value] ?? "bg-cream text-muted"
      }`}
    >
      {dot && DOTS[value] && <span className={`h-1.5 w-1.5 rounded-full ${DOTS[value]}`} />}
      {label ?? value}
    </span>
  );
}

export function Verified() {
  return <ShieldCheck className="inline h-4 w-4 text-sage" aria-label="Verified" />;
}

export function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${cls} ${i <= Math.round(value) ? "fill-sand text-sand" : "fill-line/60 text-line"}`} />
      ))}
    </span>
  );
}

export function Avatar({ name, url, size = 36 }: { name?: string; url?: string | null; size?: number }) {
  const fs = size >= 56 ? 18 : size >= 44 ? 14 : size >= 32 ? 12 : 10;
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name ?? ""} width={size} height={size} className="shrink-0 rounded-full object-cover ring-1 ring-line" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="inline-flex shrink-0 select-none items-center justify-center rounded-full bg-sand-soft font-semibold text-sand-dark ring-1 ring-sand/30"
      style={{ width: size, height: size, fontSize: fs }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Form controls                                                      */
/* ------------------------------------------------------------------ */

const inputCls =
  "h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink shadow-[inset_0_1px_0_rgba(47,58,54,.02)] outline-none transition duration-150 placeholder:text-muted/60 hover:border-[#d6d2cb] focus:border-sage focus:ring-2 focus:ring-sage/20 disabled:bg-cream disabled:text-muted";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} h-auto min-h-24 resize-y py-2.5 leading-relaxed ${props.className ?? ""}`} />;
}

export function Select({
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select {...props} className={`${inputCls} appearance-none pr-9 capitalize ${props.className ?? ""}`}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-ink/80">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-[22px] w-[38px] shrink-0 rounded-full transition duration-150 ${FOCUS} ${checked ? "bg-sage" : "bg-[#d6d2cb]"}`}
      >
        <span
          className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.2)] transition-all duration-150 ${
            checked ? "left-[18px]" : "left-[2px]"
          }`}
        />
      </button>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
    </label>
  );
}

/** Type a value and press Enter (or comma) to add a chip. */
export function ChipsInput({
  value,
  onChange,
  placeholder,
  suggestions = [],
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const v = raw.trim();
    if (!v) return;
    if (!value.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...value, v]);
    setDraft("");
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }
  const remaining = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));

  return (
    <div>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-line bg-white px-2 py-1.5 transition duration-150 focus-within:border-sage focus-within:ring-2 focus-within:ring-sage/20">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-lg bg-sage-soft py-1 pl-2.5 pr-1 text-xs font-medium text-sage-dark">
            {v}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== v))}
              className="rounded-md p-0.5 text-sage-dark/60 hover:bg-white/70 hover:text-sage-dark"
              aria-label={`Remove ${v}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => add(draft)}
          placeholder={value.length ? "" : placeholder}
          className="h-7 min-w-24 flex-1 bg-transparent px-1 text-sm text-ink outline-none placeholder:text-muted/60"
        />
      </div>
      {remaining.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {remaining.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-lg border border-dashed border-line px-2 py-0.5 text-[11px] text-muted transition hover:border-sage hover:text-sage-dark"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? "Search…"} className="pl-9 pr-8" aria-label={placeholder ?? "Search"} />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:bg-cream hover:text-ink"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/** Segmented filter control */
export function FilterPills<T extends string>({
  value,
  onChange,
  options,
  counts,
  labels,
}: {
  value: T | "all";
  onChange: (v: T | "all") => void;
  options: T[];
  counts?: Partial<Record<T | "all", number>>;
  labels?: Partial<Record<T | "all", string>>;
}) {
  const all: (T | "all")[] = ["all", ...options];
  return (
    <div role="tablist" className="inline-flex max-w-full flex-wrap gap-0.5 rounded-xl bg-cream p-1">
      {all.map((o) => {
        const active = value === o;
        return (
          <button
            key={o}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(o)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium capitalize transition duration-150 ${FOCUS} ${
              active ? "bg-white text-ink shadow-[0_1px_2px_rgba(47,58,54,.08)]" : "text-muted hover:text-ink"
            }`}
          >
            {labels?.[o] ?? o}
            {counts?.[o] !== undefined && (
              <span className={`rounded-md px-1.5 py-px text-[10.5px] tabular-nums ${active ? "bg-sage-soft text-sage-dark" : "bg-white/70 text-muted"}`}>
                {counts[o]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Toolbar row above a table: filter · search · result count */
export function Toolbar({ left, right, count, noun = "result" }: { left?: React.ReactNode; right?: React.ReactNode; count?: number; noun?: string }) {
  return (
    <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        {left}
        {count !== undefined && (
          <span className="text-xs tabular-nums text-muted">
            {count} {noun}
            {count === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {right}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Overlays                                                           */
/* ------------------------------------------------------------------ */

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

/** Slide-over panel from the right. */
export function Drawer({
  open,
  onClose,
  title,
  header,
  children,
  footer,
  danger,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  danger?: React.ReactNode;
}) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="animate-fade absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="animate-slide-in-right absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-lift sm:w-[480px] sm:border-l sm:border-line">
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</p>
            {header && <div className="mt-2">{header}</div>}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1">
            <X className="h-5 w-5" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-7">{children}</div>
          {danger && (
            <div className="mt-10 rounded-2xl border border-rose-soft bg-rose-soft/40 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-rose">Danger zone</p>
              <div className="mt-3">{danger}</div>
            </div>
          )}
        </div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line bg-white px-6 py-4">{footer}</div>}
      </aside>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="animate-fade fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={`animate-pop flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-lift sm:rounded-2xl ${wide ? "sm:max-w-2xl" : "sm:max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
  loading,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="animate-fade fixed inset-0 z-[60] flex items-center justify-center bg-ink/30 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="animate-pop w-full max-w-sm rounded-2xl bg-white p-6 shadow-lift"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-soft text-rose">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <h2 id="confirm-title" className="mt-4 text-base font-semibold text-ink">
          {title}
        </h2>
        <div className="mt-2 text-sm leading-relaxed text-muted">{message}</div>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onClose}>
            Keep it
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  States                                                             */
/* ------------------------------------------------------------------ */

export function Empty({ title, hint, icon: Icon = Inbox, compact }: { title: string; hint?: string; icon?: React.ElementType; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center px-6 text-center ${compact ? "py-10" : "py-16"}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-soft text-sage">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-sm font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex items-center justify-center py-16 text-muted">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`block animate-pulse rounded-md bg-cream ${className}`} />;
}

export function SkeletonRows({ cols, rows = 6 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <Td key={c}>
              {c === 0 ? (
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
              ) : (
                <Skeleton className={`h-3 ${c % 3 === 0 ? "w-14" : "w-24"}`} />
              )}
            </Td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-soft bg-rose-soft/60 px-4 py-3 text-sm text-rose">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{error}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Table                                                              */
/* ------------------------------------------------------------------ */

export function Table({ head, children, minWidth = 760 }: { head: (string | { label: string; align?: "right" })[]; children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-b-2xl lg:overflow-visible">
      <table className="w-full text-left text-[13px] leading-5" style={{ minWidth }}>
        <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur">
          <tr className="border-b border-line text-[11px] uppercase tracking-[0.1em] text-muted">
            {head.map((h, i) => {
              const label = typeof h === "string" ? h : h.label;
              const right = typeof h !== "string" && h.align === "right";
              return (
                <th key={i} scope="col" className={`px-4 py-3 font-semibold ${right ? "text-right" : ""}`}>
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Tr({ children, onClick, className = "" }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <tr
      onClick={onClick}
      className={`group transition-colors duration-150 ${onClick ? "cursor-pointer hover:bg-cream/60" : ""} ${className}`}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}

/** Right-aligned action icons that reveal on hover (always visible on touch). */
export function RowActions({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
