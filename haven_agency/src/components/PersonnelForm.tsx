"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Avatar, Button, Drawer, Field, Input, Select, Section } from "./ui";
import { splitList } from "@/lib/format";
import { cleanPhone } from "@/lib/excel";
import { create, nextCode, patch, upload } from "@/lib/actions";
import { useActor } from "@/lib/useActor";
import { useData } from "./DataProvider";
import type { Personnel } from "@/lib/types";

const SKILL_SUGGESTIONS = ["Crowd control", "VIP protection", "First aid", "Fire safety", "Access control", "De-escalation", "Driving", "CCTV"];

/** Add or edit one person. Grouped into short sections; only name and mobile are required. */
export function PersonnelForm({ open, onClose, editing }: { open: boolean; onClose: () => void; editing?: Personnel | null }) {
  const { personnel } = useData();
  const { agency, run } = useActor();
  const fileRef = useRef<HTMLInputElement>(null);
  const init = () => ({
    name: editing?.name ?? "", phone: editing?.phone ?? "", dob: editing?.dob ?? "", gender: editing?.gender ?? "",
    experienceYears: String(editing?.experienceYears ?? ""), heightCm: String(editing?.heightCm ?? ""),
    skills: (editing?.skills ?? []).join(", "), certifications: (editing?.certifications ?? []).join(", "),
    languages: (editing?.languages ?? []).join(", "), employmentType: editing?.employmentType ?? "full_time",
    dailyWage: String(editing?.dailyWage ?? ""), photoUrl: editing?.photoUrl ?? null as string | null,
  });
  const [f, setF] = useState(init);
  const [key, setKey] = useState(editing?.id ?? "new");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  if ((editing?.id ?? "new") !== key) { setKey(editing?.id ?? "new"); setF(init()); setErrors({}); }

  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = "Enter the full name";
    const ph = cleanPhone(f.phone);
    if (ph.replace(/\D/g, "").length < 10) e.phone = "Enter a valid 10-digit mobile number";
    else if (personnel.some((p) => p.id !== editing?.id && cleanPhone(p.phone) === ph)) e.phone = "Someone with this number is already registered";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async (submit: boolean) => {
    if (!validate()) return;
    setBusy(true);
    const data = {
      name: f.name.trim(), phone: cleanPhone(f.phone), dob: f.dob, gender: f.gender,
      experienceYears: Number(f.experienceYears) || 0, heightCm: Number(f.heightCm) || 0,
      skills: splitList(f.skills), certifications: splitList(f.certifications), languages: splitList(f.languages),
      employmentType: f.employmentType, dailyWage: Number(f.dailyWage) || 0, photoUrl: f.photoUrl,
    };
    const ok = editing
      ? await run(() => patch("personnel", editing.id, { ...data, ...(submit ? { verificationStatus: "pending" } : {}) }), "Changes saved", ["Updated personnel", data.name])
      : await run(() => create("personnel", {
          ...data, agencyId: agency.id, code: nextCode(personnel), verificationStatus: submit ? "pending" : "draft", adminRemarks: "", userId: null, source: "agency", inviteCode: null,
          availability: "available", leaveUntil: null, active: true, removalRequested: false,
        }).then(() => patch("agencies", agency.id, { personnelCount: personnel.length + 1 })), submit ? `${data.name} added and sent for verification` : `${data.name} saved as draft`, ["Added personnel", data.name]);
    setBusy(false);
    if (ok) onClose();
  };

  const onPhoto = async (file?: File) => {
    if (!file) return;
    await run(async () => set("photoUrl", await upload(agency.id, "personnel", file)), "Photo uploaded");
  };

  return (
    <Drawer open={open} onClose={onClose} title={editing ? `Edit ${editing.name}` : "Add personnel"}
      subtitle={editing ? editing.code : "Only name and mobile are required. You can complete the rest later."}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        {(!editing || editing.verificationStatus === "draft") && <Button loading={busy} onClick={() => save(false)}>Save as draft</Button>}
        <Button variant="primary" loading={busy} onClick={() => save(!editing || ["draft", "rejected", "needs_correction", "expired"].includes(editing.verificationStatus))}>
          {editing && !["draft", "rejected", "needs_correction", "expired"].includes(editing.verificationStatus) ? "Save changes" : "Save & submit for verification"}
        </Button>
      </>}>
      <div className="mb-6 flex items-center gap-4">
        <Avatar name={f.name} url={f.photoUrl} size={64} />
        <div>
          <Button size="sm" icon={<Camera className="h-3.5 w-3.5" />} onClick={() => fileRef.current?.click()}>{f.photoUrl ? "Change photo" : "Upload photo"}</Button>
          <p className="mt-1 text-xs text-muted">A clear, front-facing photo. Clients see it when you assign this person.</p>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
        </div>
      </div>

      <Section title="Basic details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required error={errors.name} className="sm:col-span-2"><Input autoFocus value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Mobile number" required error={errors.phone}><Input type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Date of birth"><Input type="date" value={f.dob} onChange={(e) => set("dob", e.target.value)} /></Field>
          <Field label="Gender">
            <Select value={f.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="">Prefer not to say</option><option>Male</option><option>Female</option><option>Other</option>
            </Select>
          </Field>
          <Field label="Height (cm)"><Input type="number" min={0} value={f.heightCm} onChange={(e) => set("heightCm", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="Professional">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Experience (years)"><Input type="number" min={0} value={f.experienceYears} onChange={(e) => set("experienceYears", e.target.value)} /></Field>
          <Field label="Languages" hint="Comma separated"><Input value={f.languages} onChange={(e) => set("languages", e.target.value)} placeholder="English, Hindi" /></Field>
          <Field label="Skills & specialisations" hint="Comma separated" className="sm:col-span-2">
            <Input value={f.skills} onChange={(e) => set("skills", e.target.value)} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SKILL_SUGGESTIONS.filter((s) => !splitList(f.skills).includes(s)).map((s) => (
                <button key={s} type="button" onClick={() => set("skills", [...splitList(f.skills), s].join(", "))}
                  className="rounded-full border border-dashed border-line-2 px-2.5 py-0.5 text-xs text-muted transition hover:border-ink hover:text-ink">+ {s}</button>
              ))}
            </div>
          </Field>
          <Field label="Training & certifications" hint="Comma separated" className="sm:col-span-2"><Input value={f.certifications} onChange={(e) => set("certifications", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="Employment">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Employment type">
            <Select value={f.employmentType} onChange={(e) => set("employmentType", e.target.value)}>
              <option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="contract">Contract</option>
            </Select>
          </Field>
          <Field label="Daily wage" hint="Used for payroll"><Input type="number" min={0} value={f.dailyWage} onChange={(e) => set("dailyWage", e.target.value)} /></Field>
        </div>
      </Section>
    </Drawer>
  );
}
