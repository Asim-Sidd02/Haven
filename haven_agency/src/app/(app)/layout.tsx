"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronsUpDown, LogOut, Menu, Search, X } from "lucide-react";
import { useAuth, useSession } from "@/components/AuthProvider";
import { DataProvider, useData } from "@/components/DataProvider";
import { HavenMark } from "@/components/Brand";
import { CommandPalette } from "@/components/CommandPalette";
import { Avatar, IconButton, StatusBadge, cx } from "@/components/ui";
import { NAV_GROUPS, NAV_ITEMS, canAccess, type ModuleKey } from "@/lib/nav";
import type { StaffRole } from "@/lib/types";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "signedOut" || state.status === "unconfigured") router.replace("/login");
    if (state.status === "onboarding") router.replace("/register");
  }, [state.status, router]);

  if (state.status !== "ready") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-muted">
        <HavenMark className="h-11 w-11 animate-pulse" />
        <p className="text-xs uppercase tracking-[0.16em]">Opening your workspace</p>
      </div>
    );
  }
  return <DataProvider><Shell>{children}</Shell></DataProvider>;
}

function Shell({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const { profile, agency } = useSession();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const data = useData();
  const role = (profile.staffRole ?? "owner") as StaffRole;

  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /** Small counters next to nav items: work that is waiting for someone. */
  const badges = useMemo<Partial<Record<ModuleKey, number>>>(() => ({
    notifications: data.notifications.filter((n) => !n.read).length,
    bookings: data.bookings.filter((b) => b.status === "pending").length,
    assignments: data.bookings.filter((b) => b.status === "accepted" || b.clientApproval === "changes_requested").length,
    support: data.tickets.filter((t) => t.status !== "resolved").length,
    verification: data.personnel.filter((p) => p.verificationStatus === "rejected" || p.verificationStatus === "expired").length,
  }), [data]);

  const current = NAV_ITEMS.find((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
  const allowed = !current || canAccess(role, current.key);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-5">
        {agency.logoUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={agency.logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover ring-1 ring-line" />
          : <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-sm font-semibold text-white">{agency.name.slice(0, 1)}</span>}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{agency.name}</p>
          <p className="truncate text-xs capitalize text-muted">{role} · Haven Agency</p>
        </div>
      </div>
      <button onClick={() => setPalette(true)} className="mx-3 mb-2 flex h-9 items-center gap-2 rounded-lg border border-line bg-canvas px-3 text-[13px] text-faint transition hover:border-line-2 hover:text-muted">
        <Search className="h-3.5 w-3.5" /> Search or jump to…
        <kbd className="ml-auto rounded border border-line bg-white px-1.5 font-mono text-[10px]">Ctrl K</kbd>
      </button>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Main">
        {NAV_GROUPS.map((g, gi) => {
          const items = g.items.filter((i) => canAccess(role, i.key));
          if (!items.length) return null;
          return (
            <div key={gi} className="mt-3">
              {g.title && <p className="mb-1 px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-faint">{g.title}</p>}
              {items.map(({ key, href, label, icon: Icon }) => {
                const active = current?.key === key;
                const n = badges[key];
                return (
                  <Link key={key} href={href} aria-current={active ? "page" : undefined}
                    className={cx("group relative flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13.5px] transition",
                      active ? "bg-ink font-medium text-white" : "text-body hover:bg-wash hover:text-ink")}>
                    <Icon className={cx("h-4 w-4 shrink-0", active ? "text-white" : "text-muted group-hover:text-ink")} strokeWidth={1.9} />
                    <span className="truncate">{label}</span>
                    {!!n && <span className={cx("tnum ml-auto rounded-full px-1.5 text-[11px] font-semibold", active ? "bg-white text-ink" : "bg-ink text-white")}>{n}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <Avatar name={profile.name} url={profile.photoUrl} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-ink">{profile.name}</p>
            <p className="truncate text-xs text-muted">{profile.email}</p>
          </div>
          <IconButton label="Sign out" onClick={logout}><LogOut className="h-4 w-4" /></IconButton>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-white lg:block">{sidebar}</aside>
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="anim-fade absolute inset-0 bg-ink/25" onClick={() => setDrawer(false)} />
          <aside className="anim-drawer absolute inset-y-0 left-0 w-72 bg-white shadow-pop">
            <div className="absolute right-2 top-4"><IconButton label="Close menu" onClick={() => setDrawer(false)}><X className="h-5 w-5" /></IconButton></div>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-white/85 px-4 backdrop-blur sm:px-6">
          <IconButton label="Open menu" className="lg:hidden" onClick={() => setDrawer(true)}><Menu className="h-5 w-5" /></IconButton>
          <nav className="flex min-w-0 items-center gap-2 text-sm" aria-label="Breadcrumb">
            <span className="hidden truncate text-muted sm:inline">{agency.name}</span>
            <span className="hidden text-faint sm:inline">/</span>
            <span className="truncate font-medium text-ink">{current?.label ?? "Overview"}</span>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {agency.status !== "approved" && <Link href="/profile" className="hidden sm:block"><StatusBadge status={agency.status} /></Link>}
            <IconButton label="Search (Ctrl K)" onClick={() => setPalette(true)} className="lg:hidden"><Search className="h-4 w-4" /></IconButton>
            <Link href="/notifications" className="relative inline-grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-wash hover:text-ink" aria-label="Notifications">
              <Bell className="h-[18px] w-[18px]" />
              {!!badges.notifications && <span className="ping absolute right-2 top-2 h-2 w-2 rounded-full bg-ink text-ink" />}
            </Link>
            <span className="hidden h-6 w-px bg-line sm:block" />
            <Link href="/settings" className="hidden items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-wash sm:flex">
              <Avatar name={profile.name} url={profile.photoUrl} size={28} />
              <ChevronsUpDown className="h-3.5 w-3.5 text-faint" />
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div key={pathname} className="anim-page">
            {allowed ? children : (
              <div className="py-24 text-center">
                <p className="text-lg font-semibold text-ink">You don’t have access to {current?.label}</p>
                <p className="mt-1 text-sm text-muted">Your role is <b className="capitalize">{role}</b>. Ask your agency owner if you need access.</p>
              </div>
            )}
          </div>
        </main>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} role={role} />
    </div>
  );
}
