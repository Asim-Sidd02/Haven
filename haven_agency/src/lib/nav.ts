import {
  BarChart3, Bell, Building2, CalendarClock, CalendarDays, ClipboardCheck, FileSignature, FileCheck2,
  Handshake, LayoutDashboard, LifeBuoy, Settings, ShieldCheck, Star, UserCog, Users, Wallet, Banknote, ListChecks,
  type LucideIcon,
} from "lucide-react";
import type { StaffRole } from "./types";

export type ModuleKey =
  | "overview" | "notifications" | "bookings" | "assignments" | "schedule" | "attendance"
  | "personnel" | "verification" | "staff" | "profile" | "services" | "clients" | "agreements"
  | "payments" | "payroll" | "reports" | "reviews" | "support" | "settings";

export interface NavItem { key: ModuleKey; href: string; label: string; icon: LucideIcon; roles: StaffRole[] | "all" }

const ALL = "all" as const;
const OPS: StaffRole[] = ["owner", "manager", "bookings"];
const HR: StaffRole[] = ["owner", "manager", "hr"];
const FIN: StaffRole[] = ["owner", "manager", "finance"];

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  { title: "", items: [
    { key: "overview", href: "/overview", label: "Overview", icon: LayoutDashboard, roles: ALL },
    { key: "notifications", href: "/notifications", label: "Notifications", icon: Bell, roles: ALL },
  ] },
  { title: "Operations", items: [
    { key: "bookings", href: "/bookings", label: "Bookings", icon: CalendarDays, roles: OPS },
    { key: "assignments", href: "/assignments", label: "Assignments", icon: ListChecks, roles: OPS },
    { key: "schedule", href: "/schedule", label: "Availability", icon: CalendarClock, roles: [...OPS, "hr"] },
    { key: "attendance", href: "/attendance", label: "Attendance & duty", icon: ClipboardCheck, roles: [...HR, "bookings"] },
  ] },
  { title: "People", items: [
    { key: "personnel", href: "/personnel", label: "Personnel", icon: Users, roles: HR },
    { key: "verification", href: "/verification", label: "Verification & documents", icon: FileCheck2, roles: HR },
    { key: "staff", href: "/staff", label: "Staff & roles", icon: UserCog, roles: ["owner", "manager"] },
  ] },
  { title: "Business", items: [
    { key: "profile", href: "/profile", label: "Agency profile", icon: Building2, roles: ["owner", "manager"] },
    { key: "services", href: "/services", label: "Services & pricing", icon: ShieldCheck, roles: ["owner", "manager"] },
    { key: "clients", href: "/clients", label: "Clients", icon: Handshake, roles: OPS },
    { key: "agreements", href: "/agreements", label: "Agreements", icon: FileSignature, roles: OPS },
  ] },
  { title: "Finance", items: [
    { key: "payments", href: "/payments", label: "Payments & earnings", icon: Wallet, roles: FIN },
    { key: "payroll", href: "/payroll", label: "Salary & payroll", icon: Banknote, roles: [...FIN, "hr"] },
    { key: "reports", href: "/reports", label: "Reports", icon: BarChart3, roles: FIN },
  ] },
  { title: "Engagement", items: [
    { key: "reviews", href: "/reviews", label: "Reviews & ratings", icon: Star, roles: OPS },
    { key: "support", href: "/support", label: "Complaints & support", icon: LifeBuoy, roles: OPS },
  ] },
  { title: "", items: [
    { key: "settings", href: "/settings", label: "Settings & security", icon: Settings, roles: ALL },
  ] },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function canAccess(role: StaffRole | null | undefined, key: ModuleKey): boolean {
  const item = NAV_ITEMS.find((i) => i.key === key);
  if (!item || !role) return false;
  return item.roles === "all" || item.roles.includes(role);
}
