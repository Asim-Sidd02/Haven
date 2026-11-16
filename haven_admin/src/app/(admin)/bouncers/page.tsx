"use client";

import { useMemo, useState } from "react";
import { Pencil, ShieldUser, Trash2 } from "lucide-react";
import { useCollection } from "@/hooks/useCollection";
import { useSettings } from "@/hooks/useSettings";
import { deleteBouncerProfile, deleteUserEverywhere, setBouncerStatus, updateBouncer } from "@/lib/actions";
import { errMsg, fmtDate, fmtMoney, matches } from "@/lib/format";
import { BOUNCER_STATUSES, type Bouncer, type BouncerStatus } from "@/lib/types";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ChipsInput,
  ConfirmDialog,
  Drawer,
  Empty,
  ErrorNote,
  Field,
  FilterPills,
  IconButton,
  Input,
  PageHeader,
  RowActions,
  SearchBox,
  Section,
  SkeletonRows,
  Stars,
  Table,
  Td,
  Textarea,
  Toggle,
  Toolbar,
  Tr,
  Verified,
} from "@/components/ui";
import { useToast } from "@/components/Toast";

const SKILL_SUGGESTIONS = ["Crowd control", "Door supervision", "VIP protection", "Event security", "First aid", "Conflict de-escalation", "CCTV monitoring", "Licensed / certified"];

const STATUS_HELP: Record<BouncerStatus, string> = {
  pending: "Hidden from customers until approved.",
  approved: "Visible to customers and able to take bookings.",
  rejected: "Hidden; the bouncer sees a note to update their profile.",
  suspended: "Hidden; the bouncer is asked to contact support.",
};

interface Form {
  name: string;
  bio: string;
  city: string;
  experienceYears: string;
  hourlyRate: string;
  heightCm: string;
  skills: string[];
  languages: string[];
  available: boolean;
  status: BouncerStatus;
  verified: boolean;
}

function toForm(b: Bouncer): Form {
  return {
    name: b.name ?? "",
    bio: b.bio ?? "",
    city: b.city ?? "",
    experienceYears: String(b.experienceYears ?? 0),
    hourlyRate: String(b.hourlyRate ?? 0),
    heightCm: String(b.heightCm ?? 0),
    skills: b.skills ?? [],
    languages: b.languages ?? [],
    available: Boolean(b.available),
    status: b.status ?? "pending",
    verified: Boolean(b.verified),
  };
}

export default function BouncersPage() {
  const toast = useToast();
  const { data, loading, error } = useCollection<Bouncer>("bouncers");
  const { settings } = useSettings();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<BouncerStatus | "all">("all");
  const [editing, setEditing] = useState<Bouncer | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Bouncer | null>(null);
  const [deleteAccount, setDeleteAccount] = useState(false);
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => {
    const c: Partial<Record<BouncerStatus | "all", number>> = { all: data.length };
    for (const s of BOUNCER_STATUSES) c[s] = data.filter((b) => b.status === s).length;
    return c;
  }, [data]);

  const rows = useMemo(
    () =>
      data
        .filter((b) => filter === "all" || b.status === filter)
        .filter((b) => matches(q, b.name, b.city, ...(b.skills ?? [])))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
    [data, filter, q],
  );

  function open(b: Bouncer) {
    setEditing(b);
    setForm(toForm(b));
  }
  function close() {
    setEditing(null);
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  async function save() {
    if (!editing || !form) return;
    setSaving(true);
    try {
      await updateBouncer(editing.id, {
        name: form.name.trim(),
        bio: form.bio.trim(),
        city: form.city.trim(),
        experienceYears: Math.max(0, parseInt(form.experienceYears) || 0),
        hourlyRate: Math.max(0, parseFloat(form.hourlyRate) || 0),
        heightCm: Math.max(0, parseInt(form.heightCm) || 0),
        skills: form.skills,
        languages: form.languages,
        available: form.available,
        status: form.status,
        verified: form.verified,
      });
      toast("Profile saved.");
      close();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(b: Bouncer, status: BouncerStatus) {
    try {
      await setBouncerStatus(b.id, status);
      toast(`${b.name} is now ${status}.`);
      if (editing?.id === b.id) set("status", status);
    } catch (e) {
      toast(errMsg(e), "error");
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      if (deleteAccount) {
        const r = await deleteUserEverywhere(deleting.id);
        toast(r.authDeleted ? "Bouncer and their account were removed." : `Profile and user record removed. ${r.authMessage ?? ""}`, r.authDeleted ? "success" : "error");
      } else {
        await deleteBouncerProfile(deleting.id);
        toast("Bouncer profile removed.");
      }
      setDeleting(null);
      close();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  }

  const askDelete = (b: Bouncer | null) => {
    if (!b) return;
    setDeleteAccount(false);
    setDeleting(b);
  };

  return (
    <>
      <PageHeader title="Bouncers" subtitle="Review applications, keep profiles accurate, and award the verified badge." />
      <ErrorNote error={error} />

      <Card>
        <Toolbar
          left={<FilterPills value={filter} onChange={setFilter} options={BOUNCER_STATUSES} counts={counts} />}
          right={<SearchBox value={q} onChange={setQ} placeholder="Search name, city or skill" />}
          count={loading ? undefined : rows.length}
          noun="bouncer"
        />
        {!loading && rows.length === 0 ? (
          <Empty icon={ShieldUser} title="No bouncers found" hint={q || filter !== "all" ? "Try a different filter or search." : "Bouncer profiles appear here after they sign up in the app."} />
        ) : (
          <Table head={["Bouncer", "City", "Rate", "Rating", "Status", "Joined", { label: "", align: "right" }]}>
            {loading ? (
              <SkeletonRows cols={7} />
            ) : (
              rows.map((b) => (
                <Tr key={b.id} onClick={() => open(b)}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={b.name} url={b.photoUrl} />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1 truncate font-semibold text-ink">
                          {b.name} {b.verified && <Verified />}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {b.experienceYears ?? 0} yrs ·{" "}
                          <span className={b.available ? "text-sage-dark" : ""}>{b.available ? "Taking bookings" : "Unavailable"}</span>
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-muted">{b.city || "—"}</Td>
                  <Td className="tabular-nums">
                    {fmtMoney(b.hourlyRate, settings.currency)}
                    <span className="text-muted">/hr</span>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Stars value={b.rating ?? 0} />
                      <span className="text-xs tabular-nums text-muted">{b.reviewCount ? `${(b.rating ?? 0).toFixed(1)} (${b.reviewCount})` : "New"}</span>
                    </div>
                  </Td>
                  <Td>
                    <Badge value={b.status} />
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{fmtDate(b.createdAt)}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {b.status === "pending" && (
                        <Button size="sm" variant="soft" onClick={() => quickStatus(b, "approved")}>
                          Approve
                        </Button>
                      )}
                      <RowActions>
                        <IconButton label="Edit bouncer" onClick={() => open(b)}>
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton label="Delete bouncer" tone="danger" onClick={() => askDelete(b)}>
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </RowActions>
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </Table>
        )}
      </Card>

      <Drawer
        open={!!editing && !!form}
        onClose={close}
        title="Edit bouncer"
        header={
          editing && (
            <div className="flex items-center gap-3">
              <Avatar name={editing.name} url={editing.photoUrl} size={48} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-base font-semibold text-ink">
                  {editing.name} {editing.verified && <Verified />}
                </p>
                <p className="truncate text-xs text-muted">
                  {editing.reviewCount ? `${(editing.rating ?? 0).toFixed(1)} ★ · ${editing.reviewCount} reviews` : "No reviews yet"} · joined {fmtDate(editing.createdAt)}
                </p>
              </div>
              <Badge value={form?.status ?? editing.status} />
            </div>
          )
        }
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              Save changes
            </Button>
          </>
        }
        danger={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">Remove this bouncer&apos;s public profile. Past bookings stay in the records.</p>
            <Button variant="secondary" size="sm" className="text-rose hover:bg-rose-soft" onClick={() => askDelete(editing)}>
              <Trash2 className="h-3.5 w-3.5" /> Delete bouncer
            </Button>
          </div>
        }
      >
        {editing && form && (
          <>
            <Section title="Moderation" hint={STATUS_HELP[form.status]}>
              <div className="flex flex-wrap gap-2">
                {BOUNCER_STATUSES.map((s) => (
                  <Button key={s} size="sm" variant={form.status === s ? "primary" : "secondary"} onClick={() => set("status", s)} className="capitalize">
                    {s}
                  </Button>
                ))}
              </div>
              <div className="mt-4 space-y-3 rounded-xl border border-line p-4">
                <Toggle checked={form.verified} onChange={(v) => set("verified", v)} label="Verified badge" description="Shown next to their name in the app." />
                <Toggle checked={form.available} onChange={(v) => set("available", v)} label="Taking bookings" description="Bouncers can switch this themselves too." />
              </div>
            </Section>

            <Section title="Profile">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Full name" className="sm:col-span-2">
                  <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
                </Field>
                <Field label="City">
                  <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
                </Field>
                <Field label={`Hourly rate (${settings.currency})`}>
                  <Input type="number" min={0} inputMode="decimal" value={form.hourlyRate} onChange={(e) => set("hourlyRate", e.target.value)} />
                </Field>
                <Field label="Experience (years)">
                  <Input type="number" min={0} inputMode="numeric" value={form.experienceYears} onChange={(e) => set("experienceYears", e.target.value)} />
                </Field>
                <Field label="Height (cm)">
                  <Input type="number" min={0} inputMode="numeric" value={form.heightCm} onChange={(e) => set("heightCm", e.target.value)} />
                </Field>
                <Field label="Bio" className="sm:col-span-2">
                  <Textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={4} />
                </Field>
              </div>
            </Section>

            <Section title="Skills & languages" hint="Type and press Enter">
              <div className="space-y-4">
                <Field label="Skills">
                  <ChipsInput value={form.skills} onChange={(v) => set("skills", v)} placeholder="Crowd control, First aid…" suggestions={SKILL_SUGGESTIONS} />
                </Field>
                <Field label="Languages">
                  <ChipsInput value={form.languages} onChange={(v) => set("languages", v)} placeholder="English, Urdu…" />
                </Field>
              </div>
            </Section>

            <p className="text-[11px] text-muted">UID {editing.id}</p>
          </>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title="Delete this bouncer?"
        message={
          <>
            <span className="block">
              <strong className="text-ink">{deleting?.name}</strong>&apos;s public profile will be removed and customers won&apos;t be able to find them.
              Past bookings stay in the records.
            </span>
            <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl bg-cream p-3 text-[13px] text-ink">
              <input type="checkbox" checked={deleteAccount} onChange={(e) => setDeleteAccount(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#b5726b]" />
              <span>Also delete their user record and sign-in account</span>
            </label>
          </>
        }
      />
    </>
  );
}
