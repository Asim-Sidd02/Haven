import type { Booking, Personnel } from "./types";
import { derivedAvailability } from "./actions";

/** The agency's share of a booking: the subtotal (platform fee and tax are not agency income). */
export const agencyShare = (b: Booking) => Number(b.subtotal ?? (b.hourlyRate || 0) * (b.hours || 0) * (b.personnelCount || 1));

export function earnings(bookings: Booking[]) {
  const done = bookings.filter((b) => b.status === "completed");
  const received = done.filter((b) => b.paymentStatus === "paid").reduce((s, b) => s + agencyShare(b), 0);
  const pending = bookings.filter((b) => ["completed", "ongoing"].includes(b.status) && b.paymentStatus !== "paid")
    .reduce((s, b) => s + agencyShare(b), 0);
  const refunded = bookings.filter((b) => b.paymentStatus === "refunded").reduce((s, b) => s + Number(b.totalAmount || 0), 0);
  const commission = done.reduce((s, b) => s + Number(b.platformFee || 0), 0);
  const tax = done.reduce((s, b) => s + Number(b.tax || 0), 0);
  return { total: received + pending, received, pending, refunded, commission, tax };
}

export function personnelStats(personnel: Personnel[], bookings: Booking[]) {
  const active = personnel.filter((p) => p.active);
  const avail = active.map((p) => derivedAvailability(p, bookings));
  return {
    total: personnel.length,
    available: active.filter((p, i) => p.verificationStatus === "verified" && avail[i] === "available").length,
    assigned: avail.filter((a) => a === "assigned").length,
    onLeave: avail.filter((a) => a === "on_leave").length,
    underVerification: personnel.filter((p) => ["pending", "draft"].includes(p.verificationStatus)).length,
    verified: personnel.filter((p) => p.verificationStatus === "verified").length,
    pendingVerification: personnel.filter((p) => p.verificationStatus === "pending").length,
    needsCorrection: personnel.filter((p) => p.verificationStatus === "needs_correction").length,
  };
}

export function bookingStats(bookings: Booking[]) {
  const c = (s: Booking["status"][]) => bookings.filter((b) => s.includes(b.status)).length;
  return {
    total: bookings.length,
    requests: c(["pending"]),
    ongoing: c(["accepted", "assigned", "confirmed", "ongoing"]),
    completed: c(["completed"]),
    cancelled: c(["cancelled", "declined"]),
  };
}

/** Last N months as YYYY-MM keys, oldest first. */
export function lastMonths(n: number) {
  const out: string[] = [];
  const d = new Date(); d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export const monthLabel = (k: string) => new Date(k + "-01T00:00:00").toLocaleString(undefined, { month: "short" });

export const bookingMonth = (b: Booking) => {
  const d = b.eventDate?.toDate?.() ?? b.createdAt?.toDate?.();
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : "";
};
