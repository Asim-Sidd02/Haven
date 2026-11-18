"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { Check, Building2, UserRound } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { friendlyAuthError } from "@/lib/authErrors";
import { useAuth } from "@/components/AuthProvider";
import { AuthShell } from "@/components/AuthShell";
import { Button, Callout, Field, Input, cx } from "@/components/ui";
import type { Invite } from "@/lib/types";

/**
 * Two short steps instead of one long form: who you are, then your agency.
 * Everything else (documents, services, personnel) is collected later through the
 * onboarding checklist, so agencies reach a working dashboard in under a minute.
 */
export default function RegisterPage() {
  const { state, logout } = useAuth();
  const router = useRouter();
  const signedIn = state.status === "onboarding";
  const [step, setStep] = useState<1 | 2>(1);
  const [acct, setAcct] = useState({ name: "", email: "", phone: "", password: "" });
  const [ag, setAg] = useState({ name: "", city: "", registrationNo: "", licenseNo: "", yearsExperience: "" });
  const [invite, setInvite] = useState<Invite | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (state.status === "ready") router.replace("/overview"); }, [state.status, router]);

  // A signed-in account without an agency resumes at step 2 (or joins via invite).
  useEffect(() => {
    if (state.status !== "onboarding") return;
    const email = state.user.email?.toLowerCase() ?? "";
    setAcct((a) => ({ ...a, name: state.profile?.name || state.user.displayName || a.name, email, phone: state.profile?.phone || a.phone }));
    getDoc(doc(db(), "invites", email)).then((s) => s.exists() && setInvite({ ...(s.data() as Invite), id: s.id })).catch(() => {});
    setStep(2);
  }, [state]);

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (acct.password.length < 8) { setError("Use a password of at least 8 characters."); return; }
    setBusy(true); setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth(), acct.email.trim(), acct.password);
      await updateProfile(cred.user, { displayName: acct.name.trim() });
      // AuthProvider moves us to "onboarding"; the effect above advances to step 2.
    } catch (err) {
      // The account may already exist from an earlier attempt that never finished
      // step 2. If the password matches, sign in and resume instead of blocking.
      if (/email-already-in-use/.test(String(err))) {
        try { await signInWithEmailAndPassword(auth(), acct.email.trim(), acct.password); return; }
        catch { setError("An account with this email already exists. Sign in with its password to continue."); return; }
      }
      setError(friendlyAuthError(err));
    }
    finally { setBusy(false); }
  };

  const userDoc = (agencyId: string, staffRole: string) => ({
    uid: auth().currentUser!.uid, name: acct.name.trim(), email: acct.email.trim().toLowerCase(), phone: acct.phone.trim(),
    photoUrl: null, role: "agency", agencyId, staffRole, isActive: true, createdAt: serverTimestamp(),
  });

  const joinInvite = async () => {
    if (!invite) return;
    setBusy(true); setError("");
    try { await setDoc(doc(db(), "users", auth().currentUser!.uid), userDoc(invite.agencyId, invite.staffRole)); }
    catch (err) { setError(friendlyAuthError(err)); setBusy(false); }
  };

  const createAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    const uid = auth().currentUser!.uid;
    const batch = writeBatch(db());
    // A retry after a half-finished attempt must not rewrite the profile (rules forbid it).
    const existing = state.status === "onboarding" ? state.profile : null;
    if (!existing?.agencyId) batch.set(doc(db(), "users", uid), userDoc(uid, "owner"));
    batch.set(doc(db(), "agencies", uid), {
      name: ag.name.trim(), logoUrl: null, description: "", registrationNo: ag.registrationNo.trim(), licenseNo: ag.licenseNo.trim(),
      ownerName: acct.name.trim(), email: acct.email.trim().toLowerCase(), phone: acct.phone.trim(), address: "", city: ag.city.trim(),
      yearsExperience: Number(ag.yearsExperience) || 0, areas: ag.city.trim() ? [ag.city.trim()] : [], workingHours: "24/7", services: {},
      status: "draft", verified: false, adminRemarks: "", rating: 0, ratingTotal: 0, reviewCount: 0, lastReviewId: null, personnelCount: 0,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    try {
      // Firestore waits forever when it can't reach the database, so give up after 20s.
      await Promise.race([
        batch.commit(),
        new Promise((_, reject) => setTimeout(() => reject(new Error(
          "Couldn't reach the database. Check your connection, and that Cloud Firestore is created in the Firebase console.")), 20000)),
      ]);
      // AuthProvider sees the new agency and redirects to /overview.
    } catch (err) { setError(friendlyAuthError(err)); setBusy(false); }
  };

  return (
    <AuthShell>
      <Steps step={step} />

      {step === 1 && (
        <>
          <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink">Create your account</h1>
          <p className="mt-1 text-sm text-muted">You’ll be the owner. You can invite your team later.</p>
          <form onSubmit={createAccount} className="mt-8 space-y-4">
            <Field label="Your full name" required><Input required autoFocus value={acct.name} onChange={(e) => setAcct({ ...acct, name: e.target.value })} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Work email" required><Input type="email" required value={acct.email} onChange={(e) => setAcct({ ...acct, email: e.target.value })} /></Field>
              <Field label="Mobile number" required><Input type="tel" required value={acct.phone} onChange={(e) => setAcct({ ...acct, phone: e.target.value })} /></Field>
            </div>
            <Field label="Password" hint="8+ characters" required><Input type="password" required value={acct.password} onChange={(e) => setAcct({ ...acct, password: e.target.value })} /></Field>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <Button type="submit" variant="primary" loading={busy} className="w-full">Continue</Button>
          </form>
          <p className="mt-8 text-center text-sm text-muted">Already registered? <Link href="/login" className="font-medium text-ink hover:underline">Sign in</Link></p>
        </>
      )}

      {step === 2 && invite && (
        <>
          <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink">You’ve been invited</h1>
          <p className="mt-1 text-sm text-muted">{invite.invitedBy || "Your team"} invited you to join <b className="text-ink">{invite.agencyName}</b> as <b className="text-ink">{invite.staffRole}</b>.</p>
          {error && <p className="mt-4 text-sm text-danger">{error}</p>}
          <Button variant="primary" loading={busy} onClick={joinInvite} className="mt-8 w-full">Join {invite.agencyName}</Button>
          <button onClick={() => setInvite(null)} className="mt-3 w-full text-sm text-muted hover:text-ink">Register a different agency instead</button>
        </>
      )}

      {step === 2 && !invite && (
        <>
          <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink">Tell us about your agency</h1>
          <p className="mt-1 text-sm text-muted">Just the basics for now. You can complete the rest from your dashboard.</p>
          <form onSubmit={createAgency} className="mt-8 space-y-4">
            <Field label="Agency name" required><Input required autoFocus value={ag.name} onChange={(e) => setAg({ ...ag, name: e.target.value })} placeholder="e.g. Shield Force Security" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City" required><Input required value={ag.city} onChange={(e) => setAg({ ...ag, city: e.target.value })} /></Field>
              <Field label="Years in business"><Input type="number" min={0} value={ag.yearsExperience} onChange={(e) => setAg({ ...ag, yearsExperience: e.target.value })} /></Field>
            </div>
            <Field label="Company registration no."><Input value={ag.registrationNo} onChange={(e) => setAg({ ...ag, registrationNo: e.target.value })} /></Field>
            <Field label="Security licence no." hint="e.g. PSARA"><Input value={ag.licenseNo} onChange={(e) => setAg({ ...ag, licenseNo: e.target.value })} /></Field>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <Button type="submit" variant="primary" loading={busy} className="w-full">Create agency workspace</Button>
          </form>
          {signedIn && <button onClick={logout} className="mt-4 w-full text-sm text-muted hover:text-ink">Sign out</button>}
          <div className="mt-8"><Callout>Your agency stays private until you submit it for review and our team approves it.</Callout></div>
        </>
      )}
    </AuthShell>
  );
}

function Steps({ step }: { step: 1 | 2 }) {
  const items = [{ n: 1, label: "Account", icon: UserRound }, { n: 2, label: "Agency", icon: Building2 }];
  return (
    <ol className="flex items-center gap-3 text-sm">
      {items.map(({ n, label }, i) => (
        <li key={n} className="flex items-center gap-3">
          <span className={cx("grid h-7 w-7 place-items-center rounded-full border text-xs font-semibold transition",
            step > n ? "border-ink bg-ink text-white" : step === n ? "border-ink text-ink" : "border-line-2 text-faint")}>
            {step > n ? <Check className="h-3.5 w-3.5" /> : n}
          </span>
          <span className={step >= n ? "font-medium text-ink" : "text-faint"}>{label}</span>
          {i === 0 && <span className="h-px w-10 bg-line-2" />}
        </li>
      ))}
    </ol>
  );
}
