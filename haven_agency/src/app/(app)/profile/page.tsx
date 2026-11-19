"use client";

import { useEffect, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { Camera, Copy, KeyRound, RefreshCw, Send, Star } from "lucide-react";
import { db } from "@/lib/firebase";
import { useActor } from "@/lib/useActor";
import { patch, put, randomCode, upload } from "@/lib/actions";
import { fmtDate, splitList } from "@/lib/format";
import { Button, Callout, Card, CardHeader, Field, Input, PageHeader, StatusBadge, Textarea } from "@/components/ui";
import type { Payout } from "@/lib/types";

/**
 * One long, sectioned form with a sticky save bar that only appears when something changed,
 * so it's always clear whether there's unsaved work.
 */
export default function ProfilePage() {
  const { agency, run, toast } = useActor();
  const logoRef = useRef<HTMLInputElement>(null);
  const initial = () => ({
    name: agency.name ?? "", description: agency.description ?? "", registrationNo: agency.registrationNo ?? "", licenseNo: agency.licenseNo ?? "",
    ownerName: agency.ownerName ?? "", email: agency.email ?? "", phone: agency.phone ?? "", address: agency.address ?? "", city: agency.city ?? "",
    yearsExperience: String(agency.yearsExperience ?? ""), areas: (agency.areas ?? []).join(", "), workingHours: agency.workingHours ?? "",
  });
  const [f, setF] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pay, setPay] = useState<Payout>({ accountName: "", accountNumber: "", bankName: "", ifsc: "", upi: "" });
  const [paySaved, setPaySaved] = useState(pay);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getDoc(doc(db(), "agencies", agency.id, "private", "payout")).then((s) => {
      if (s.exists()) { const p = { ...pay, ...(s.data() as Payout) }; setPay(p); setPaySaved(p); }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agency.id]);

  const dirty = JSON.stringify(f) !== JSON.stringify(saved) || JSON.stringify(pay) !== JSON.stringify(paySaved);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    setBusy(true);
    const ok = await run(async () => {
      await patch("agencies", agency.id, { ...f, yearsExperience: Number(f.yearsExperience) || 0, areas: splitList(f.areas) });
      if (JSON.stringify(pay) !== JSON.stringify(paySaved)) await put(`agencies/${agency.id}/private`, "payout", { ...pay, updatedAt: new Date() });
    }, "Profile saved", ["Updated agency profile"]);
    if (ok) { setSaved(f); setPaySaved(pay); }
    setBusy(false);
  };

  return (
    <div className="pb-24">
      <PageHeader title="Agency profile" desc="This is what clients see in the Haven app. A complete profile gets more bookings." />

      {["rejected", "needs_correction", "draft"].includes(agency.status) && (
        <div className="mb-6"><Callout tone="warn"
          title={agency.status === "needs_correction" ? "Haven asked for corrections" : agency.status === "rejected" ? "Your application was rejected" : "Your agency hasn’t been submitted for review yet"}
          action={<Button size="sm" variant="primary" icon={<Send className="h-3.5 w-3.5" />} disabled={dirty}
            onClick={() => run(() => patch("agencies", agency.id, { status: "pending" }), "Submitted for review", ["Submitted agency for review"])}>
            {agency.status === "draft" ? "Submit for review" : "Resubmit for review"}</Button>}>
          {agency.adminRemarks || "Complete your profile and upload your registration documents, then submit."}
          {dirty && <p className="mt-1 text-xs text-muted">Save your changes first.</p>}
        </Callout></div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Identity" desc="Name, logo and how you describe your agency" />
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-4">
                {agency.logoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={agency.logoUrl} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-line" />
                  : <span className="grid h-16 w-16 place-items-center rounded-xl bg-ink text-2xl font-semibold text-white">{agency.name.slice(0, 1)}</span>}
                <div>
                  <Button size="sm" icon={<Camera className="h-3.5 w-3.5" />} onClick={() => logoRef.current?.click()}>Change logo</Button>
                  <p className="mt-1 text-xs text-muted">Square image, at least 256×256.</p>
                </div>
                <input ref={logoRef} type="file" accept="image/*" hidden onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  await run(async () => patch("agencies", agency.id, { logoUrl: await upload(agency.id, "logo", file) }), "Logo updated", ["Updated logo"]);
                }} />
              </div>
              <Field label="Agency name" required><Input value={f.name} onChange={set("name")} /></Field>
              <Field label="About your agency" hint={`${f.description.length}/600`}>
                <Textarea maxLength={600} value={f.description} onChange={set("description")} placeholder="Who you are, the kinds of events you cover, and what makes your team reliable." />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Years of experience"><Input type="number" min={0} value={f.yearsExperience} onChange={set("yearsExperience")} /></Field>
                <Field label="Working hours"><Input value={f.workingHours} onChange={set("workingHours")} placeholder="24/7 or Mon–Sat 9:00–21:00" /></Field>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Registration & licences" desc="Used by Haven to verify your agency. Not shown to clients." />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Company registration no."><Input value={f.registrationNo} onChange={set("registrationNo")} /></Field>
              <Field label="Security licence no." hint="e.g. PSARA"><Input value={f.licenseNo} onChange={set("licenseNo")} /></Field>
            </div>
            <p className="px-5 pb-5 text-[13px] text-muted">Upload the certificates under <a href="/verification?tab=agency" className="text-ink underline-offset-4 hover:underline">Verification → Agency documents</a>.</p>
          </Card>

          <Card>
            <CardHeader title="Contact & location" />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Owner name"><Input value={f.ownerName} onChange={set("ownerName")} /></Field>
              <Field label="Business phone"><Input type="tel" value={f.phone} onChange={set("phone")} /></Field>
              <Field label="Business email" className="sm:col-span-2"><Input type="email" value={f.email} onChange={set("email")} /></Field>
              <Field label="Office address" className="sm:col-span-2"><Textarea className="min-h-[72px]" value={f.address} onChange={set("address")} /></Field>
              <Field label="City"><Input value={f.city} onChange={set("city")} /></Field>
              <Field label="Areas of operation" hint="Comma separated"><Input value={f.areas} onChange={set("areas")} placeholder="Hyderabad, Secunderabad" /></Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Bank & payout details" desc="Private. Only owners, managers and finance staff can see this." />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Account holder name"><Input value={pay.accountName} onChange={(e) => setPay({ ...pay, accountName: e.target.value })} /></Field>
              <Field label="Bank name"><Input value={pay.bankName} onChange={(e) => setPay({ ...pay, bankName: e.target.value })} /></Field>
              <Field label="Account number"><Input value={pay.accountNumber} onChange={(e) => setPay({ ...pay, accountNumber: e.target.value })} inputMode="numeric" /></Field>
              <Field label="IFSC"><Input value={pay.ifsc} onChange={(e) => setPay({ ...pay, ifsc: e.target.value.toUpperCase() })} /></Field>
              <Field label="UPI ID" hint="Optional"><Input value={pay.upi} onChange={(e) => setPay({ ...pay, upi: e.target.value })} /></Field>
            </div>
          </Card>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Status</p>
            <div className="mt-2 flex items-center gap-2"><StatusBadge status={agency.status} />{agency.verified && <StatusBadge status="verified" />}</div>
            <div className="mt-4 flex items-center gap-2 text-sm"><Star className="h-4 w-4 fill-ink text-ink" /><b className="text-ink">{agency.reviewCount ? agency.rating.toFixed(1) : "New"}</b><span className="text-muted">· {agency.reviewCount} reviews</span></div>
            <p className="mt-2 text-xs text-muted">Member since {fmtDate(agency.createdAt)}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Join code for bouncers</p>
            {agency.joinCode ? (
              <div className="mt-2 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted" />
                <span className="font-mono text-xl font-semibold tracking-[0.25em] text-ink">{agency.joinCode}</span>
                <span className="flex-1" />
                <Button size="sm" variant="ghost" icon={<Copy className="h-3.5 w-3.5" />} onClick={async () => {
                  try { await navigator.clipboard.writeText(agency.joinCode!); toast("Join code copied"); } catch { toast("Couldn’t copy the code", "error"); }
                }}>Copy</Button>
              </div>
            ) : <p className="mt-2 text-sm text-muted">No join code yet.</p>}
            <p className="mt-2 text-xs text-muted">Bouncers who registered on their own in the Haven app enter this code to ask to join you. Requests appear under Personnel → Join requests.{agency.status !== "approved" && " Codes work once your agency is approved."}</p>
            <Button size="sm" className="mt-3" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => run(() => patch("agencies", agency.id, { joinCode: randomCode(6) }), agency.joinCode ? "New join code generated" : "Join code created", ["Generated join code"])}>
              {agency.joinCode ? "Generate new code" : "Create join code"}</Button>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Client preview</p>
            <div className="mt-3 rounded-xl border border-line p-4">
              <p className="font-semibold text-ink">{f.name || "Your agency"}</p>
              <p className="text-xs text-muted">{f.city || "City"} · {f.yearsExperience || 0} yrs</p>
              <p className="mt-2 line-clamp-4 text-[13px] text-body">{f.description || "Your description appears here."}</p>
            </div>
          </Card>
        </aside>
      </div>

      {dirty && (
        <div className="anim-pop fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <p className="text-sm text-muted">You have unsaved changes</p>
            <div className="flex gap-2"><Button variant="ghost" onClick={() => { setF(saved); setPay(paySaved); }}>Discard</Button><Button variant="primary" loading={busy} onClick={save}>Save changes</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
