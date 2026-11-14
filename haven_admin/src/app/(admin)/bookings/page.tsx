"use client";

import { useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { Pencil, Trash2 } from "lucide-react";
import { useCollection } from "@/hooks/useCollection";
import { useSettings } from "@/hooks/useSettings";
import { deleteBooking, updateBooking } from "@/lib/actions";
import { errMsg, fmtDate, fmtMoney, matches, toLocalInput } from "@/lib/format";
import { BOOKING_STATUSES, EVENT_TYPES, type Booking, type BookingStatus } from "@/lib/types";
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
  Table,
  Td,
  Textarea,
} from "@/components/ui";
import { useToast } from "@/components/Toast";

interface Form {
  status: BookingStatus;
  eventType: string;
  eventDate: string;
  hours: string;
  location: string;
  guests: string;
  notes: string;
  hourlyRate: string;
  totalAmount: string;
  bouncerNote: string;
}

function toForm(b: Booking): Form {
  return {
    status: b.status,
    eventType: b.eventType ?? "Other",
    eventDate: toLocalInput(b.eventDate),
    hours: String(b.hours ?? 0),
    location: b.location ?? "",
    guests: String(b.guests ?? 0),
    notes: b.notes ?? "",
    hourlyRate: String(b.hourlyRate ?? 0),
    totalAmount: String(b.totalAmount ?? 0),
    bouncerNote: b.bouncerNote ?? "",
  };
}

export default function BookingsPage() {
  const toast = useToast();
  const { data, loading, error } = useCollection<Booking>("bookings");
  const { settings } = useSettings();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [editing, setEditing] = useState<Booking | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => {
    const c: Partial<Record<BookingStatus | "all", number>> = { all: data.length };
    for (const s of BOOKING_STATUSES) c[s] = data.filter((b) => b.status === s).length;
    return c;
  }, [data]);

  const rows = useMemo(
    () =>
      data
        .filter((b) => filter === "all" || b.status === filter)
        .filter((b) => matches(q, b.customerName, b.bouncerName, b.location, b.eventType, b.id))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
    [data, filter, q],
  );

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  function open(b: Booking) {
    setEditing(b);
    setForm(toForm(b));
  }

  async function save() {
    if (!editing || !form) return;
    setSaving(true);
    try {
      const date = form.eventDate ? new Date(form.eventDate) : null;
      await updateBooking(editing.id, {
        status: form.status,
        eventType: form.eventType,
        ...(date && !isNaN(date.getTime()) ? { eventDate: Timestamp.fromDate(date) } : {}),
        hours: Math.max(0, parseInt(form.hours) || 0),
        location: form.location.trim(),
        guests: Math.max(0, parseInt(form.guests) || 0),
        notes: form.notes.trim(),
        hourlyRate: Math.max(0, parseFloat(form.hourlyRate) || 0),
        totalAmount: Math.max(0, parseFloat(form.totalAmount) || 0),
        bouncerNote: form.bouncerNote.trim(),
      });
      toast("Booking updated.");
      setEditing(null);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteBooking(deleting.id);
      toast("Booking deleted.");
      setDeleting(null);
      setEditing(null);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  }

  const recalc = () => {
    if (!form) return;
    const total = (parseFloat(form.hourlyRate) || 0) * (parseInt(form.hours) || 0);
    set("totalAmount", String(total));
  };

  return (
    <>
      <PageHeader title="Bookings" subtitle="Every request between customers and bouncers, in one calm place." />
      <ErrorNote error={error} />
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <FilterPills value={filter} onChange={setFilter} options={BOOKING_STATUSES} counts={counts} />
          <SearchBox value={q} onChange={setQ} placeholder="Search people, place or event" />
        </div>
        {loading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty title="No bookings found" hint="Try a different filter or search." />
        ) : (
          <Table head={["Customer", "Bouncer", "Event", "When", "Total", "Status", ""]}>
            {rows.map((b) => (
              <tr key={b.id} className="cursor-pointer hover:bg-cream/60" onClick={() => open(b)}>
                <Td>
                  <p className="font-medium text-ink">{b.customerName}</p>
                  <p className="text-xs text-muted">{b.customerPhone || "—"}</p>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Avatar name={b.bouncerName} url={b.bouncerPhotoUrl} size={28} />
                    <span className="text-ink">{b.bouncerName}</span>
                  </div>
                </Td>
                <Td>
                  <p className="text-ink">{b.eventType}</p>
                  <p className="max-w-48 truncate text-xs text-muted">{b.location}</p>
                </Td>
                <Td className="text-muted">
                  {fmtDate(b.eventDate, true)}
                  <p className="text-xs">{b.hours} hrs · {b.guests} guests</p>
                </Td>
                <Td className="font-medium text-ink">{fmtMoney(b.totalAmount, settings.currency)}</Td>
                <Td>
                  <Badge value={b.status} />
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => open(b)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(b)} aria-label="Delete">
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
        title="Edit booking"
        wide
        footer={
          <>
            <Button variant="ghost" className="mr-auto text-rose hover:bg-rose-soft hover:text-rose" onClick={() => setDeleting(editing)}>
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
            <div className="grid grid-cols-1 gap-3 rounded-2xl bg-cream p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Customer</p>
                <p className="font-medium text-ink">{editing.customerName}</p>
                <p className="text-xs text-muted">{editing.customerPhone}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Bouncer</p>
                <p className="font-medium text-ink">{editing.bouncerName}</p>
                <p className="text-xs text-muted">
                  Booked {fmtDate(editing.createdAt, true)} · {editing.reviewed ? "Reviewed" : "Not reviewed"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Status">
                <Select value={form.status} onChange={(e) => set("status", e.target.value as BookingStatus)} options={BOOKING_STATUSES.map((s) => ({ value: s, label: s }))} />
              </Field>
              <Field label="Event type">
                <Select
                  value={form.eventType}
                  onChange={(e) => set("eventType", e.target.value)}
                  options={[...new Set([...EVENT_TYPES, form.eventType])].map((t) => ({ value: t, label: t }))}
                />
              </Field>
              <Field label="Date & time">
                <Input type="datetime-local" value={form.eventDate} onChange={(e) => set("eventDate", e.target.value)} />
              </Field>
              <Field label="Location">
                <Input value={form.location} onChange={(e) => set("location", e.target.value)} />
              </Field>
              <Field label="Hours">
                <Input type="number" min={0} value={form.hours} onChange={(e) => set("hours", e.target.value)} />
              </Field>
              <Field label="Guests">
                <Input type="number" min={0} value={form.guests} onChange={(e) => set("guests", e.target.value)} />
              </Field>
              <Field label={`Hourly rate (${settings.currency})`}>
                <Input type="number" min={0} value={form.hourlyRate} onChange={(e) => set("hourlyRate", e.target.value)} />
              </Field>
              <Field label={`Total (${settings.currency})`}>
                <div className="flex gap-2">
                  <Input type="number" min={0} value={form.totalAmount} onChange={(e) => set("totalAmount", e.target.value)} />
                  <Button variant="secondary" type="button" onClick={recalc} title="Rate × hours">
                    Recalc
                  </Button>
                </div>
              </Field>
              <Field label="Customer notes" className="sm:col-span-2">
                <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
              </Field>
              <Field label="Bouncer note" className="sm:col-span-2">
                <Textarea value={form.bouncerNote} onChange={(e) => set("bouncerNote", e.target.value)} rows={2} />
              </Field>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title="Delete this booking?"
        message={
          <>
            The booking between <strong className="text-ink">{deleting?.customerName}</strong> and{" "}
            <strong className="text-ink">{deleting?.bouncerName}</strong> will disappear for both of them. Consider cancelling it instead if they
            should still see the history.
          </>
        }
      />
    </>
  );
}
