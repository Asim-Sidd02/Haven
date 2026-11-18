"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, CornerDownLeft, FileUp, Search, UserPlus, Users } from "lucide-react";
import { NAV_ITEMS, canAccess } from "@/lib/nav";
import { fmtDate, matches } from "@/lib/format";
import type { StaffRole } from "@/lib/types";
import { useData } from "./DataProvider";
import { cx } from "./ui";

interface Cmd { id: string; group: string; label: string; hint?: string; icon: React.ReactNode; href: string }

/** Ctrl/⌘ K: jump to any module, person or booking, or start a common task, without the mouse. */
export function CommandPalette({ open, onClose, role }: { open: boolean; onClose: () => void; role: StaffRole }) {
  const router = useRouter();
  const { personnel, bookings } = useData();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) { setQ(""); setI(0); } }, [open]);

  const cmds = useMemo<Cmd[]>(() => {
    const out: Cmd[] = [];
    if (canAccess(role, "personnel")) {
      out.push({ id: "a-add", group: "Actions", label: "Add personnel", icon: <UserPlus className="h-4 w-4" />, href: "/personnel?new=1" });
      out.push({ id: "a-imp", group: "Actions", label: "Import personnel from Excel", icon: <FileUp className="h-4 w-4" />, href: "/personnel?import=1" });
    }
    NAV_ITEMS.filter((n) => canAccess(role, n.key)).forEach((n) =>
      out.push({ id: n.key, group: "Go to", label: n.label, icon: <n.icon className="h-4 w-4" />, href: n.href }));
    if (q.trim()) {
      if (canAccess(role, "personnel")) personnel.filter((p) => matches(q, p.name, p.code, p.phone)).slice(0, 6).forEach((p) =>
        out.push({ id: "p" + p.id, group: "Personnel", label: p.name, hint: p.code, icon: <Users className="h-4 w-4" />, href: `/personnel?id=${p.id}` }));
      if (canAccess(role, "bookings")) bookings.filter((b) => matches(q, b.customerName, b.location, b.serviceLabel, b.id)).slice(0, 6).forEach((b) =>
        out.push({ id: "b" + b.id, group: "Bookings", label: `${b.customerName} · ${b.serviceLabel}`, hint: fmtDate(b.eventDate), icon: <CalendarDays className="h-4 w-4" />, href: `/bookings?id=${b.id}` }));
    }
    return out.filter((c) => c.group === "Personnel" || c.group === "Bookings" || matches(q, c.label));
  }, [q, role, personnel, bookings]);

  useEffect(() => setI(0), [q]);
  useEffect(() => { listRef.current?.querySelector(`[data-i="${i}"]`)?.scrollIntoView({ block: "nearest" }); }, [i]);

  if (!open) return null;
  const go = (c?: Cmd) => { if (!c) return; onClose(); router.push(c.href); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(cmds.length - 1, x + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(0, x - 1)); }
    if (e.key === "Enter") go(cmds[i]);
    if (e.key === "Escape") onClose();
  };

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="anim-fade absolute inset-0 bg-ink/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className="anim-pop relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-white shadow-pop">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4 w-4 text-muted" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
            placeholder="Search personnel, bookings or pages…" className="h-14 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint" />
          <kbd className="rounded border border-line px-1.5 font-mono text-[10px] text-muted">Esc</kbd>
        </div>
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {!cmds.length && <p className="px-3 py-10 text-center text-sm text-muted">No matches for “{q}”</p>}
          {cmds.map((c, idx) => {
            const header = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            return (
              <div key={c.id}>
                {header && <p className="px-3 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-faint">{header}</p>}
                <button data-i={idx} onMouseMove={() => setI(idx)} onClick={() => go(c)}
                  className={cx("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition", idx === i ? "bg-ink text-white" : "text-body")}>
                  <span className={idx === i ? "text-white" : "text-muted"}>{c.icon}</span>
                  <span className="flex-1 truncate">{c.label}</span>
                  {c.hint && <span className={cx("text-xs", idx === i ? "text-white/70" : "text-faint")}>{c.hint}</span>}
                  {idx === i ? <CornerDownLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5 opacity-0" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
