"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareHeart,
  Settings,
  ShieldUser,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { Brand } from "@/components/Brand";
import { Avatar, Loading } from "@/components/ui";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/bouncers", label: "Bouncers", icon: ShieldUser },
  { href: "/users", label: "Users", icon: Users },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/reviews", label: "Reviews", icon: MessageSquareHeart },
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
      <div className="flex min-h-screen items-center justify-center">
        <Loading />
      </div>
    );
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6">
        <Brand />
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-sage-soft text-sage-dark" : "text-muted hover:bg-cream hover:text-ink"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="m-3 rounded-2xl bg-cream p-3">
        <div className="flex items-center gap-3">
          <Avatar name={state.profile.name} url={state.profile.photoUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{state.profile.name || "Admin"}</p>
            <p className="truncate text-xs text-muted">{state.profile.email}</p>
          </div>
          <button onClick={logout} className="rounded-lg p-2 text-muted hover:bg-white hover:text-rose" title="Sign out" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <aside className="animate-fade-in absolute inset-y-0 left-0 w-72 bg-white shadow-soft">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-6 rounded-lg p-1 text-muted" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <Brand compact />
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-ink hover:bg-cream" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <main className="px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
