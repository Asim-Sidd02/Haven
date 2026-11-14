"use client";

import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import type { AppSettings, Bouncer, BouncerStatus, Review } from "./types";

// ---------- bouncers ----------
export async function updateBouncer(id: string, data: Partial<Bouncer>) {
  const { id: _omit, ...rest } = data as Partial<Bouncer> & { id?: string };
  void _omit;
  await updateDoc(doc(db(), "bouncers", id), { ...rest, updatedAt: serverTimestamp() } as DocumentData);
  // Keep the name in the user profile in sync.
  if (rest.name !== undefined) {
    const u = await getDoc(doc(db(), "users", id));
    if (u.exists()) await updateDoc(doc(db(), "users", id), { name: rest.name });
  }
}

export function setBouncerStatus(id: string, status: BouncerStatus) {
  return updateDoc(doc(db(), "bouncers", id), { status, updatedAt: serverTimestamp() });
}

export function deleteBouncerProfile(id: string) {
  return deleteDoc(doc(db(), "bouncers", id));
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
 * Deletes users/{uid}, bouncers/{uid} (if any) and — when the server has
 * Firebase Admin credentials — the Firebase Auth account.
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

  const batch = writeBatch(db());
  batch.delete(doc(db(), "users", uid));
  batch.delete(doc(db(), "bouncers", uid));
  await batch.commit();
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
async function bouncerRating(bouncerId: string) {
  const snap = await getDoc(doc(db(), "bouncers", bouncerId));
  if (!snap.exists()) return null;
  const b = snap.data() as Bouncer;
  return { ratingTotal: Number(b.ratingTotal ?? 0), reviewCount: Number(b.reviewCount ?? 0) };
}

export async function updateReview(review: Review, data: { rating: number; comment: string }) {
  const batch = writeBatch(db());
  batch.update(doc(db(), "reviews", review.id), data);
  const diff = data.rating - review.rating;
  if (diff !== 0) {
    const r = await bouncerRating(review.bouncerId);
    if (r) {
      const ratingTotal = Math.max(0, r.ratingTotal + diff);
      batch.update(doc(db(), "bouncers", review.bouncerId), {
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
  const r = await bouncerRating(review.bouncerId);
  if (r) {
    const reviewCount = Math.max(0, r.reviewCount - 1);
    const ratingTotal = Math.max(0, r.ratingTotal - review.rating);
    batch.update(doc(db(), "bouncers", review.bouncerId), {
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

// ---------- settings ----------
export function saveSettings(data: AppSettings) {
  return setDoc(doc(db(), "settings", "app"), data, { merge: true });
}
