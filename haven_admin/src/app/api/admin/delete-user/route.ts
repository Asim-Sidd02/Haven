import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { adminApp, adminConfigured } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/**
 * Deletes a Firebase Auth account. Caller must send their Firebase ID token
 * and have role == 'admin' in users/{uid}. Firestore docs are removed by the
 * client (admins have full rules access).
 */
export async function POST(req: Request) {
  if (!adminConfigured()) {
    return NextResponse.json(
      { error: "Server admin credentials are not configured, so the sign-in account was kept. Add FIREBASE_ADMIN_* env vars to remove it." },
      { status: 501 },
    );
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Missing ID token." }, { status: 401 });

  let body: { uid?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const uid = body.uid;
  if (!uid || typeof uid !== "string") return NextResponse.json({ error: "uid is required." }, { status: 400 });

  try {
    const app = adminApp();
    const decoded = await getAuth(app).verifyIdToken(token);
    const caller = await getFirestore(app).doc(`users/${decoded.uid}`).get();
    if (caller.get("role") !== "admin") {
      return NextResponse.json({ error: "Only admins can delete accounts." }, { status: 403 });
    }
    if (decoded.uid === uid) {
      return NextResponse.json({ error: "You can't delete your own admin account." }, { status: 400 });
    }

    try {
      await getAuth(app).deleteUser(uid);
    } catch (e) {
      // Already gone from Auth is fine.
      if ((e as { code?: string }).code !== "auth/user-not-found") throw e;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
