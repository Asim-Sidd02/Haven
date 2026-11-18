"use client";

import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import type { Agency, AgencyStatus, AppSettings, DocStatus, NotificationType, Review, TicketStatus, VerificationStatus } from "./types";

// ---------- notifications ----------
export function notify(recipientId: string, type: NotificationType, title: string, body: string, link = "") {
  return addDoc(collection(db(), "notifications"), {
    recipientId,
    type,
    title,
    body,
    link,
    read: false,
    createdAt: serverTimestamp(),
  });
}

// ---------- agencies ----------
export function updateAgency(id: string, data: Record<string, unknown>) {
  return updateDoc(doc(db(), "agencies", id), { ...data, updatedAt: serverTimestamp() });
}

const AGENCY_MSG: Partial<Record<AgencyStatus, string>> = {
  approved: "Your agency has been approved and is now visible to customers.",
  rejected: "Your agency application was not approved.",
  suspended: "Your agency has been suspended. Please contact support.",
};

/** Moderate an agency; approve / reject / suspend also notify the agency. */
export async function setAgencyStatus(id: string, status: AgencyStatus, remarks?: string) {
  await updateAgency(id, { status, ...(remarks !== undefined ? { adminRemarks: remarks } : {}) });
  const msg = AGENCY_MSG[status];
  if (msg) {
    await notify(id, "verification", `Agency ${status}`, remarks ? `${msg} Remarks: ${remarks}` : msg);
  }
}

export function deleteAgency(id: string) {
  return deleteDoc(doc(db(), "agencies", id));
}

// ---------- personnel ----------
export function updatePersonnel(id: string, data: Record<string, unknown>) {
  return updateDoc(doc(db(), "personnel", id), { ...data, updatedAt: serverTimestamp() });
}

/** Moderate a person; verify / reject / suspend also notify their agency. */
export async function setPersonnelStatus(p: { id: string; agencyId: string; name: string }, status: VerificationStatus, remarks?: string) {
  await updatePersonnel(p.id, { verificationStatus: status, ...(remarks !== undefined ? { adminRemarks: remarks } : {}) });
  if (status === "verified" || status === "rejected" || status === "suspended") {
    const body = `${p.name} is now ${status}.${remarks ? ` Remarks: ${remarks}` : ""}`;
    await notify(p.agencyId, "verification", `Personnel ${status}`, body);
  }
}

export function deletePersonnel(id: string) {
  return deleteDoc(doc(db(), "personnel", id));
}

// ---------- documents ----------
export function setDocumentStatus(id: string, status: DocStatus, remarks: string) {
  return updateDoc(doc(db(), "documents", id), { status, remarks });
}

// ---------- users ----------
export function updateUser(id: string, data: Record<string, unknown>) {
  return updateDoc(doc(db(), "users", id), data);
}

export interface DeleteUserResult {
  authDeleted: boolean;
  authMessage?: string;
}

/**
 * Deletes users/{uid} and — when the server has Firebase Admin credentials —
 * the Firebase Auth account. Agency records are left in place.
 */
export async function deleteUserEverywhere(uid: string): Promise<DeleteUserResult> {
  let authDeleted = false;
  let authMessage: string | undefined;
  try {
    const token = await auth().currentUser?.getIdToken();
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
      body: JSON.stringify({ uid }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.ok) authDeleted = true;
    else authMessage = body.error ?? `Auth deletion failed (${res.status}).`;
  } catch (e) {
    authMessage = (e as Error).message;
  }

  await deleteDoc(doc(db(), "users", uid));
  return { authDeleted, authMessage };
}

// ---------- bookings ----------
export function updateBooking(id: string, data: Record<string, unknown>) {
  return updateDoc(doc(db(), "bookings", id), { ...data, updatedAt: serverTimestamp() });
}

export function deleteBooking(id: string) {
  return deleteDoc(doc(db(), "bookings", id));
}

// ---------- reviews ----------
async function agencyRating(agencyId: string) {
  const snap = await getDoc(doc(db(), "agencies", agencyId));
  if (!snap.exists()) return null;
  const a = snap.data() as Agency;
  return { ratingTotal: Number(a.ratingTotal ?? 0), reviewCount: Number(a.reviewCount ?? 0) };
}

export async function updateReview(review: Review, data: { rating: number; comment: string }) {
  const batch = writeBatch(db());
  batch.update(doc(db(), "reviews", review.id), data);
  const diff = data.rating - review.rating;
  if (diff !== 0) {
    const r = await agencyRating(review.agencyId);
    if (r) {
      const ratingTotal = Math.max(0, r.ratingTotal + diff);
      batch.update(doc(db(), "agencies", review.agencyId), {
        ratingTotal,
        rating: r.reviewCount > 0 ? ratingTotal / r.reviewCount : 0,
      });
    }
  }
  await batch.commit();
}

export async function deleteReview(review: Review) {
  const batch = writeBatch(db());
  batch.delete(doc(db(), "reviews", review.id));
  const r = await agencyRating(review.agencyId);
  if (r) {
    const reviewCount = Math.max(0, r.reviewCount - 1);
    const ratingTotal = Math.max(0, r.ratingTotal - review.rating);
    batch.update(doc(db(), "agencies", review.agencyId), {
      reviewCount,
      ratingTotal,
      rating: reviewCount > 0 ? ratingTotal / reviewCount : 0,
    });
  }
  // Let the customer review again if the booking still exists.
  const booking = await getDoc(doc(db(), "bookings", review.bookingId));
  if (booking.exists()) batch.update(booking.ref, { reviewed: false });
  await batch.commit();
}

// ---------- tickets ----------
export function replyTicket(id: string, name: string, text: string) {
  return updateDoc(doc(db(), "tickets", id), {
    messages: arrayUnion({ by: "admin", name, text, at: Timestamp.now() }),
    updatedAt: serverTimestamp(),
  });
}

export function setTicketStatus(id: string, status: TicketStatus) {
  return updateDoc(doc(db(), "tickets", id), { status, updatedAt: serverTimestamp() });
}

// ---------- settings ----------
export function saveSettings(data: AppSettings) {
  return setDoc(doc(db(), "settings", "app"), data, { merge: true });
}
