import {
  addDoc, collection, deleteDoc, doc, serverTimestamp, setDoc, updateDoc, writeBatch, Timestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import type { AssignedPerson, Booking, Personnel } from "./types";

export interface Actor { uid: string; name: string; agencyId: string }

/** Append to the agency audit log. Never blocks the user's action. */
export async function log(actor: Actor, action: string, target = "") {
  try {
    await addDoc(collection(db(), "activity"), {
      agencyId: actor.agencyId, actorId: actor.uid, actorName: actor.name, action, target, createdAt: serverTimestamp(),
    });
  } catch { /* audit log is best-effort */ }
}

export async function notify(recipientId: string, type: string, title: string, body: string, link = "") {
  try {
    await addDoc(collection(db(), "notifications"), { recipientId, type, title, body, link, read: false, createdAt: serverTimestamp() });
  } catch { /* best-effort */ }
}

export const create = (path: string, data: Record<string, unknown>) =>
  addDoc(collection(db(), path), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });

export const patch = (path: string, id: string, data: Record<string, unknown>, stamp = true) =>
  updateDoc(doc(db(), path, id), stamp ? { ...data, updatedAt: serverTimestamp() } : data);

export const remove = (path: string, id: string) => deleteDoc(doc(db(), path, id));

export const put = (path: string, id: string, data: Record<string, unknown>) =>
  setDoc(doc(db(), path, id), data, { merge: true });

/** Update many docs in chunks of 450 (Firestore batch limit is 500). */
export async function bulkPatch(path: string, ids: string[], data: Record<string, unknown>) {
  for (let i = 0; i < ids.length; i += 450) {
    const b = writeBatch(db());
    ids.slice(i, i + 450).forEach((id) => b.update(doc(db(), path, id), { ...data, updatedAt: serverTimestamp() }));
    await b.commit();
  }
}

export async function bulkCreate(path: string, rows: Record<string, unknown>[]) {
  for (let i = 0; i < rows.length; i += 450) {
    const b = writeBatch(db());
    rows.slice(i, i + 450).forEach((r) => b.set(doc(collection(db(), path)), { ...r, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await b.commit();
  }
}

export async function upload(agencyId: string, folder: string, file: File): Promise<string> {
  const safe = file.name.replace(/[^\w.-]+/g, "_");
  const r = ref(storage(), `agencies/${agencyId}/${folder}/${Date.now()}_${safe}`);
  await uploadBytes(r, file, { contentType: file.type });
  return getDownloadURL(r);
}

export const now = () => Timestamp.now();

export const toAssigned = (p: Personnel): AssignedPerson => ({
  personnelId: p.id, code: p.code, name: p.name, photoUrl: p.photoUrl ?? null, skills: p.skills ?? [],
});

/** Next personnel code like HV-0042, based on the highest existing number. */
export function nextCode(existing: Personnel[], offset = 0) {
  const max = existing.reduce((m, p) => Math.max(m, parseInt(p.code?.replace(/\D/g, "") || "0", 10) || 0), 0);
  return `HV-${String(max + 1 + offset).padStart(4, "0")}`;
}

/* ---------- scheduling ---------- */

const span = (b: Booking): [number, number] | null => {
  const s = b.eventDate?.toMillis?.();
  if (!s) return null;
  return [s, s + (b.hours || 0) * 3600000];
};

/** Bookings still occupying people. */
export const isLive = (b: Booking) => ["accepted", "assigned", "ongoing"].includes(b.status);

/** Rest buffer between back-to-back shifts. */
export const BUFFER_MS = 2 * 3600000;

/** Other live bookings that overlap `target` (including the rest buffer) and already use this person. */
export function conflictsFor(personId: string, target: Booking, all: Booking[]): Booking[] {
  const t = span(target);
  if (!t) return [];
  return all.filter((b) => {
    if (b.id === target.id || !isLive(b) || !(b.assignedIds ?? []).includes(personId)) return false;
    const o = span(b);
    return !!o && o[0] < t[1] + BUFFER_MS && t[0] < o[1] + BUFFER_MS;
  });
}

/** Why a person cannot be assigned right now, or null when they can. */
export function blockReason(p: Personnel, target: Booking, all: Booking[]): string | null {
  if (!p.active) return "Deactivated";
  if (p.verificationStatus !== "verified") return "Not verified";
  if (p.availability === "on_leave") return "On leave";
  if (p.availability === "unavailable") return "Unavailable";
  const c = conflictsFor(p.id, target, all);
  if (c.length) return `Booked: ${c[0].customerName}`;
  return null;
}

/** Compute availability from live bookings (keeps leave/unavailable as set by the agency). */
export function derivedAvailability(p: Personnel, all: Booking[]): Personnel["availability"] {
  if (p.availability === "on_leave" || p.availability === "unavailable") return p.availability;
  const nowMs = Date.now();
  const busy = all.some((b) => isLive(b) && (b.assignedIds ?? []).includes(p.id) && (span(b)?.[1] ?? 0) > nowMs);
  return busy ? "assigned" : "available";
}
