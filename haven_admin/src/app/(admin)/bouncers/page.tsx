"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useCollection } from "@/hooks/useCollection";
import { useSettings } from "@/hooks/useSettings";
import { deleteBouncerProfile, deleteUserEverywhere, setBouncerStatus, updateBouncer } from "@/lib/actions";
import { errMsg, fmtDate, fmtMoney, matches, splitList } from "@/lib/format";
import { BOUNCER_STATUSES, type Bouncer, type BouncerStatus } from "@/lib/types";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Empty,
  ErrorNote,
  Field,
  FilterPills,
  Input,
  Loading,
  Modal,
  PageHeader,
  SearchBox,
  Select,
  Stars,
  Table,
  Td,
  Textarea,
  Toggle,
  Verified,
} from "@/components/ui";
import { useToast } from "@/components/Toast";

interface Form {
  name: string;
  bio: string;
  city: string;
  experienceYears: string;
  hourlyRate: string;
  heightCm: string;
  skills: string;
  languages: string;
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
    skills: (b.skills ?? []).join(", "),
    languages: (b.languages ?? []).join(", "),
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
        skills: splitList(form.skills),
        languages: splitList(form.languages),
        available: form.available,
        status: form.status,
        verified: form.verified,
      });
      toast("Profile saved.");
      setEditing(null);
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
      setEditing(null);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Bouncers" subtitle="Review applications, keep profiles accurate, and award the verified badge." />
      <ErrorNote error={error} />
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <FilterPills value={filter} onChange={setFilter} options={BOUNCER_STATUSES} counts={counts} />
          <SearchBox value={q} onChange={setQ} placeholder="Search name, city or skill" />
        </div>
        {loading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty title="No bouncers found" hint="Try a different filter or search." />
        ) : (
          <Table head={["Bouncer", "City", "Rate", "Rating", "Status", "Joined", ""]}>
            {rows.map((b) => (
              <tr key={b.id} className="cursor-pointer hover:bg-cream/60" onClick={() => open(b)}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={b.name} url={b.photoUrl} />
                    <div>
                      <p className="font-medium text-ink">
                        {b.name} {b.verified && <Verified />}
                      </p>
                      <p className="text-xs text-muted">
                        {b.experienceYears ?? 0} yrs · {b.available ? "Taking bookings" : "Unavailable"}
                      </p>
                    </div>
                  </div>
                </Td>
                <Td className="text-muted">{b.city || "—"}</Td>
                <Td>{fmtMoney(b.hourlyRate, settings.currency)}/hr</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Stars value={b.rating ?? 0} />
                    <span className="text-xs text-muted">({b.reviewCount ?? 0})</span>
                  </div>
                </Td>
                <Td>
                  <Badge value={b.status} />
                </Td>
                <Td className="text-muted">{fmtDate(b.createdAt)}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {b.status === "pending" && (
                      <Button size="sm" variant="soft" onClick={() => quickStatus(b, "approved")}>
                        Approve
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => open(b)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDeleteAccount(false);
                        setDeleting(b);
                      }}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal
        open={!!editing && !!form}
        onClose={() => setEditing(null)}
        title="Edit bouncer"
        wide
        footer={
          <>
            <Button
              variant="ghost"
              className="mr-auto text-rose hover:bg-rose-soft hover:text-rose"
              onClick={() => {
                setDeleteAccount(false);
                setDeleting(editing);
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              Save changes
            </Button>
          </>
        }
      >
        {editing && form && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-2xl bg-cream p-4">
              <Avatar name={form.name} url={editing.photoUrl} size={56} />
              <div className="flex-1">
                <p className="font-semibold text-ink">
                  {editing.name} {editing.verified && <Verified />}
                </p>
                <p className="text-xs text-muted">
                  {(editing.rating ?? 0).toFixed(1)} ★ from {editing.reviewCount ?? 0} reviews · UID {editing.id}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="mr-1 self-center text-xs font-medium uppercase tracking-wide text-muted">Moderation</span>
              {(["approved", "rejected", "suspended", "pending"] as BouncerStatus[]).map((s) => (
                <Button key={s} size="sm" variant={form.status === s ? "primary" : "secondary"} onClick={() => set("status", s)} className="capitalize">
                  {s === "approved" ? "Approve" : s === "rejected" ? "Reject" : s === "suspended" ? "Suspend" : "Mark pending"}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="City">
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
              </Field>
              <Field label={`Hourly rate (${settings.currency})`}>
                <Input type="number" min={0} value={form.hourlyRate} onChange={(e) => set("hourlyRate", e.target.value)} />
              </Field>
              <Field label="Experience (years)">
                <Input type="number" min={0} value={form.experienceYears} onChange={(e) => set("experienceYears", e.target.value)} />
              </Field>
              <Field label="Height (cm)">
                <Input type="number" min={0} value={form.heightCm} onChange={(e) => set("heightCm", e.target.value)} />
              </Field>
              <Field label="Status">
                <Select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value as BouncerStatus)}
                  options={BOUNCER_STATUSES.map((s) => ({ value: s, label: s }))}
                />
              </Field>
              <Field label="Skills" hint="Comma separated" className="sm:col-span-2">
                <Input value={form.skills} onChange={(e) => set("skills", e.target.value)} placeholder="Crowd control, VIP protection, First aid" />
              </Field>
              <Field label="Languages" hint="Comma separated" className="sm:col-span-2">
                <Input value={form.languages} onChange={(e) => set("languages", e.target.value)} placeholder="English, Urdu" />
              </Field>
              <Field label="Bio" className="sm:col-span-2">
                <Textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={4} />
              </Field>
            </div>

            <div className="flex flex-wrap gap-6 rounded-2xl border border-line p-4">
              <Toggle checked={form.verified} onChange={(v) => set("verified", v)} label="Verified badge" />
              <Toggle checked={form.available} onChange={(v) => set("available", v)} label="Taking bookings" />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title="Delete this bouncer?"
        message={
          <>
            <span className="block">
              <strong className="text-ink">{deleting?.name}</strong>&apos;s public profile will be removed and customers won&apos;t be able to find
              them. Past bookings stay in the records.
            </span>
            <label className="mt-4 flex items-center gap-2 text-ink">
              <input type="checkbox" checked={deleteAccount} onChange={(e) => setDeleteAccount(e.target.checked)} className="accent-[#b5726b]" />
              Also delete their user record and sign-in account
            </label>
          </>
        }
      />
    </>
  );
}
