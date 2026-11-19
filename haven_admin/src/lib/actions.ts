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
import type { Agency, AgencyDocument, AgencyStatus, AppSettings, DocStatus, NotificationType, Review, TicketStatus, VerificationStatus } from "./types";

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

// ---------- audit ----------
let actorName = "";
/** Called by AuthProvider once the admin profile is loaded. */
export function setActorName(name: string) {
  actorName = name;
}

function actor() {
  const u = auth().currentUser;
  const uid = u?.uid ?? "";
  return { uid, name: actorName || u?.displayName || u?.email || uid || "Admin" };
}

/** Writes an `activity` audit entry (admin may create these; actorId must be the admin uid). */
export function logActivity(agencyId: string, action: string, target: string) {
  const a = actor();
  return addDoc(collection(db(), "activity"), {
    agencyId: agencyId ?? "",
    actorId: a.uid,
    actorName: a.name,
    action,
    target,
    createdAt: serverTimestamp(),
  });
}

function review() {
  return { reviewedBy: actor().name, reviewedAt: serverTimestamp() };
}

/** Statuses that must come with a reason. */
export const REASON_REQUIRED = new Set<string>(["rejected", "suspended", "needs_correction"]);

function requireReason(status: string, remarks?: string) {
  if (REASON_REQUIRED.has(status) && !remarks?.trim()) throw new Error("Please give a reason.");
}

const label = (s: string) => (s === "needs_correction" ? "needs correction" : s);

// ---------- agencies ----------
export function updateAgency(id: string, data: Record<string, unknown>) {
  return updateDoc(doc(db(), "agencies", id), { ...data, updatedAt: serverTimestamp() });
}

const AGENCY_MSG: Partial<Record<AgencyStatus, string>> = {
  approved: "Your agency has been approved and is now visible to customers.",
  rejected: "Your agency application was not approved.",
  suspended: "Your agency has been suspended. Please contact support.",
  needs_correction: "Your agency application needs a correction before it can be approved.",
};

/** Moderate an agency: records reviewer + time + reason, logs activity and notifies the agency. */
export async function setAgencyStatus(a: { id: string; name?: string }, status: AgencyStatus, remarks?: string) {
  requireReason(status, remarks);
  await updateAgency(a.id, { status, adminRemarks: remarks ?? "", ...review() });
  await logActivity(a.id, `Agency ${label(status)}${remarks ? `: ${remarks}` : ""}`, a.name || a.id);
  const msg = AGENCY_MSG[status];
  if (msg) {
    const title = status === "needs_correction" ? "Agency needs correction" : `Agency ${status}`;
    await notify(a.id, "verification", title, remarks ? `${msg} Remarks: ${remarks}` : msg);
  }
}

export function deleteAgency(id: string) {
  return deleteDoc(doc(db(), "agencies", id));
}

// ---------- personnel ----------
export function updatePersonnel(id: string, data: Record<string, unknown>) {
  return updateDoc(doc(db(), "personnel", id), { ...data, updatedAt: serverTimestamp() });
}

type PersonRef = { id: string; agencyId: string; name: string; userId?: string | null };

/** Notify the person's agency (if any) and the bouncer's own account (if linked). */
async function notifyPerson(p: PersonRef, type: NotificationType, title: string, body: string) {
  const jobs: Promise<unknown>[] = [];
  if (p.agencyId) jobs.push(notify(p.agencyId, type, title, body));
  if (p.userId) jobs.push(notify(p.userId, type, title, body));
  await Promise.all(jobs);
}

/** Moderate a person: records reviewer + time + reason, logs activity and notifies agency + bouncer. */
export async function setPersonnelStatus(p: PersonRef, status: VerificationStatus, remarks?: string) {
  requireReason(status, remarks);
  await updatePersonnel(p.id, { verificationStatus: status, adminRemarks: remarks ?? "", ...review() });
  await logActivity(p.agencyId ?? "", `Personnel ${label(status)}${remarks ? `: ${remarks}` : ""}`, p.name || p.id);
  if (status === "verified" || status === "rejected" || status === "suspended" || status === "needs_correction") {
    const title = status === "needs_correction" ? "Profile needs correction" : `Personnel ${status}`;
    const body =
      status === "needs_correction"
        ? `${p.name}'s profile needs a correction. Remarks: ${remarks}`
        : `${p.name} is now ${status}.${remarks ? ` Remarks: ${remarks}` : ""}`;
    await notifyPerson(p, "verification", title, body);
  }
}

export function deletePersonnel(id: string) {
  return deleteDoc(doc(db(), "personnel", id));
}

// ---------- documents ----------
/**
 * Moderate a document. Personnel documents notify the agency and the linked bouncer;
 * agency documents notify the agency. `person` is the personnel record when known.
 */
export async function setDocumentStatus(d: AgencyDocument, status: DocStatus, remarks: string, person?: PersonRef | null) {
  requireReason(status, remarks);
  await updateDoc(doc(db(), "documents", d.id), { status, remarks, ...review() });
  const docName = d.name || d.type || "Document";
  const target = d.ownerType === "personnel" && d.personnelName ? `${docName} (${d.personnelName})` : docName;
  await logActivity(d.agencyId ?? "", `Document ${label(status)}${remarks ? `: ${remarks}` : ""}`, target);
  if (status === "pending" || status === "expired") return;
  const title = status === "needs_correction" ? "Document needs correction" : `Document ${status}`;
  const body = `${target} is ${label(status)}.${remarks ? ` Remarks: ${remarks}` : ""}`;
  if (d.ownerType === "personnel") {
    await notifyPerson(
      { id: d.personnelId ?? "", name: d.personnelName, agencyId: person ? person.agencyId : d.agencyId, userId: person?.userId ?? null },
      "document",
      title,
      body,
    );
  } else if (d.agencyId) {
    await notify(d.agencyId, "document", title, body);
  }
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
