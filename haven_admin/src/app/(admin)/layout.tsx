"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  CalendarCheck,
  LifeBuoy,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareHeart,
  Settings,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { Brand, HavenEmblem } from "@/components/Brand";
import { Avatar, IconButton } from "@/components/ui";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/agencies", label: "Agencies", icon: Building2 },
  { href: "/personnel", label: "Personnel", icon: UserCheck },
  { href: "/users", label: "Users", icon: Users },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/reviews", label: "Reviews", icon: MessageSquareHeart },
  { href: "/support", label: "Support", icon: LifeBuoy },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { state, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.status === "signedOut" || state.status === "unconfigured") router.replace("/login");
  }, [state.status, router]);

  useEffect(() => setOpen(false), [pathname]);

  if (state.status !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-muted">
        <HavenEmblem className="h-12 w-12 animate-pulse" />
        <p className="text-xs uppercase tracking-[0.14em]">Preparing your workspace</p>
      </div>
    );
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-6">
        <Brand />
      </div>

      <nav className="flex-1 space-y-0.5 px-3 pt-2" aria-label="Main">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/30 ${
                active ? "bg-sage-soft text-sage-dark" : "text-muted hover:bg-cream hover:text-ink"
              }`}
            >
              {active && <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sage" aria-hidden />}
              <Icon className={`h-[18px] w-[18px] ${active ? "text-sage" : "text-muted/80"}`} strokeWidth={active ? 2.2 : 1.9} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar name={state.profile.name} url={state.profile.photoUrl} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink">{state.profile.name || "Admin"}</p>
            <p className="truncate text-[11.5px] text-muted">{state.profile.email}</p>
          </div>
          <IconButton label="Sign out" tone="danger" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-line bg-white lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="animate-fade absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <aside className="animate-slide-in-left absolute inset-y-0 left-0 w-72 bg-white shadow-lift">
            <div className="absolute right-3 top-5">
              <IconButton label="Close menu" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </IconButton>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Mobile topbar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur lg:hidden">
        <Brand compact />
        <IconButton label="Open menu" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </IconButton>
      </header>

      <main className="lg:pl-60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="animate-fade-in">{children}</div>
        </div>
      </main>
    </div>
  );
}
