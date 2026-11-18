"use client";

import { useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail, signOut, updatePassword } from "firebase/auth";
import { KeyRound, LogOut, ShieldCheck, Smartphone } from "lucide-react";
import { auth } from "@/lib/firebase";
import { friendlyAuthError } from "@/lib/authErrors";
import { useActor } from "@/lib/useActor";
import { useData } from "@/components/DataProvider";
import { create, patch } from "@/lib/actions";
import { ago } from "@/lib/format";
import { Badge, Button, Card, CardHeader, Field, Input, PageHeader, Switch, useConfirm } from "@/components/ui";

const PREFS = [
  ["booking", "New bookings & changes"], ["verification", "Verification results"], ["document", "Document expiry reminders"],
  ["payment", "Payments & payouts"], ["message", "Client messages & complaints"], ["announcement", "Haven announcements"],
] as const;

export default function SettingsPage() {
  const { profile, run, toast, agency, role } = useActor();
  const { activity } = useData();
  const confirm = useConfirm();
  const [acct, setAcct] = useState({ name: profile.name, phone: profile.phone });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("haven.prefs") || "{}"); } catch { return {}; }
  });
  const setPref = (k: string, v: boolean) => { const n = { ...prefs, [k]: v }; setPrefs(n); try { localStorage.setItem("haven.prefs", JSON.stringify(n)); } catch {} };

  const changePassword = async () => {
    if (pw.next.length < 8) { toast("Use at least 8 characters for the new password.", "error"); return; }
    setBusy(true);
    try {
      const u = auth().currentUser!;
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email!, pw.current));
      await updatePassword(u, pw.next);
      setPw({ current: "", next: "" });
      toast("Password changed");
    } catch (e) { toast(friendlyAuthError(e), "error"); }
    setBusy(false);
  };

  const mine = activity.filter((a) => a.actorId === profile.id).slice(0, 8);

  return (
    <>
      <PageHeader title="Settings & security" desc="Your personal account, sign-in security and notification preferences." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Your account" />
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name"><Input value={acct.name} onChange={(e) => setAcct({ ...acct, name: e.target.value })} /></Field>
              <Field label="Mobile"><Input value={acct.phone} onChange={(e) => setAcct({ ...acct, phone: e.target.value })} /></Field>
            </div>
            <Field label="Email" hint="Contact Haven support to change"><Input value={profile.email} disabled /></Field>
            <div className="flex items-center justify-between"><Badge tone="dark" className="capitalize">{role}</Badge>
              <Button variant="primary" disabled={acct.name === profile.name && acct.phone === profile.phone} onClick={() => run(() => patch("users", profile.id, { name: acct.name.trim(), phone: acct.phone.trim() }, false), "Account updated")}>Save</Button></div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Password" desc="Use a strong password you don’t use elsewhere." />
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Current password"><Input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
              <Field label="New password" hint="8+ characters"><Input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <Button variant="ghost" onClick={() => sendPasswordResetEmail(auth(), profile.email).then(() => toast("Reset link sent to your email"))}>Email me a reset link</Button>
              <Button variant="primary" icon={<KeyRound className="h-4 w-4" />} loading={busy} disabled={!pw.current || !pw.next} onClick={changePassword}>Change password</Button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Sign-in security" />
          <div className="divide-y divide-line">
            <div className="flex items-center gap-4 p-5">
              <Smartphone className="h-5 w-5 text-muted" />
              <div className="flex-1"><p className="text-sm font-medium text-ink">Two-factor authentication</p><p className="text-[13px] text-muted">SMS codes at sign-in. Requires Haven to enable multi-factor auth for your organisation.</p></div>
              <Badge tone="dashed">Coming soon</Badge>
            </div>
            <div className="flex items-center gap-4 p-5">
              <ShieldCheck className="h-5 w-5 text-muted" />
              <div className="flex-1"><p className="text-sm font-medium text-ink">Sessions</p><p className="text-[13px] text-muted">Signed in on this device. Sign out everywhere by changing your password.</p></div>
              <Button size="sm" icon={<LogOut className="h-3.5 w-3.5" />} onClick={() => signOut(auth())}>Sign out</Button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Notification preferences" desc="Saved on this device. Emergency alerts are always on." />
          <ul className="divide-y divide-line">{PREFS.map(([k, label]) => (
            <li key={k} className="flex items-center justify-between px-5 py-3 text-sm"><span>{label}</span><Switch label={label} checked={prefs[k] !== false} onChange={(v) => setPref(k, v)} /></li>
          ))}</ul>
        </Card>

        <Card>
          <CardHeader title="Your recent activity" />
          {!mine.length ? <p className="p-5 text-sm text-muted">Nothing yet.</p> : <ul className="divide-y divide-line">{mine.map((a) => <li key={a.id} className="flex justify-between gap-3 px-5 py-2.5 text-sm"><span className="truncate">{a.action}{a.target && <span className="text-muted"> · {a.target}</span>}</span><span className="shrink-0 text-xs text-faint">{ago(a.createdAt)}</span></li>)}</ul>}
        </Card>

        {role === "owner" && (
          <Card className="border-danger/30">
            <CardHeader title="Deactivate agency" desc="Ask Haven to close your agency account. Your records are kept as required by law." />
            <div className="p-5"><Button variant="danger" onClick={async () => {
              const r = await confirm({ title: "Request account deactivation?", desc: "Haven’s team will contact you to confirm. Active bookings must be completed or cancelled first.", confirm: "Send request", danger: true, input: { label: "Reason", required: true } });
              if (r.ok) run(() => create("tickets", { agencyId: agency.id, customerId: null, customerName: "", bookingId: null, subject: "Account deactivation request", category: "support", priority: "high", status: "escalated", messages: [{ by: "agency", name: profile.name, text: r.text, at: new Date() }] }), "Request sent to Haven", ["Requested agency deactivation"]);
            }}>Request deactivation</Button></div>
          </Card>
        )}
      </div>
    </>
  );
}
