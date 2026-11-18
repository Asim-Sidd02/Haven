"use client";

import { useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { Pencil, Trash2 } from "lucide-react";
import { useCollection } from "@/hooks/useCollection";
import { useSettings } from "@/hooks/useSettings";
import { deleteBooking, updateBooking } from "@/lib/actions";
import { errMsg, fmtDate, fmtMoney, matches, toLocalInput } from "@/lib/format";
import { BOOKING_STATUSES, EVENT_TYPES, PAYMENT_STATUSES, type Booking, type BookingStatus, type PaymentStatus } from "@/lib/types";
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
  paymentStatus: PaymentStatus;
  personnelCount: string;
  subtotal: string;
  platformFee: string;
  tax: string;
  eventType: string;
  eventDate: string;
  hours: string;
  location: string;
  guests: string;
  requirements: string;
  hourlyRate: string;
  totalAmount: string;
  agencyNote: string;
}

function toForm(b: Booking): Form {
  return {
    status: b.status,
    paymentStatus: b.paymentStatus ?? "unpaid",
    personnelCount: String(b.personnelCount ?? 1),
    subtotal: String(b.subtotal ?? 0),
    platformFee: String(b.platformFee ?? 0),
    tax: String(b.tax ?? 0),
    eventType: b.eventType ?? "Other",
    eventDate: toLocalInput(b.eventDate),
    hours: String(b.hours ?? 0),
    location: b.location ?? "",
    guests: String(b.guests ?? 0),
    requirements: b.requirements ?? "",
    hourlyRate: String(b.hourlyRate ?? 0),
    totalAmount: String(b.totalAmount ?? 0),
    agencyNote: b.agencyNote ?? "",
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
        .filter((b) => matches(q, b.customerName, b.agencyName, b.serviceLabel, b.location, b.eventType, b.id))
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
        paymentStatus: form.paymentStatus,
        personnelCount: Math.max(1, parseInt(form.personnelCount) || 1),
        subtotal: Math.max(0, parseFloat(form.subtotal) || 0),
        platformFee: Math.max(0, parseFloat(form.platformFee) || 0),
        tax: Math.max(0, parseFloat(form.tax) || 0),
        eventType: form.eventType,
        ...(date && !isNaN(date.getTime()) ? { eventDate: Timestamp.fromDate(date) } : {}),
        hours: Math.max(0, parseInt(form.hours) || 0),
        location: form.location.trim(),
        guests: Math.max(0, parseInt(form.guests) || 0),
        requirements: form.requirements.trim(),
        hourlyRate: Math.max(0, parseFloat(form.hourlyRate) || 0),
        totalAmount: Math.max(0, parseFloat(form.totalAmount) || 0),
        agencyNote: form.agencyNote.trim(),
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

  // subtotal = rate x hours x personnel; fee and tax use the percentages in settings.
  const recalc = () => {
    if (!form) return;
    const subtotal = (parseFloat(form.hourlyRate) || 0) * (parseInt(form.hours) || 0) * Math.max(1, parseInt(form.personnelCount) || 1);
    const fee = Math.round(subtotal * (Number(settings.commissionPercent) || 0)) / 100;
    const tax = Math.round((subtotal + fee) * (Number(settings.taxPercent) || 0)) / 100;
    setForm((f) => (f ? { ...f, subtotal: String(subtotal), platformFee: String(fee), tax: String(tax), totalAmount: String(subtotal + fee + tax) } : f));
  };

  return (
    <>
      <PageHeader title="Bookings" subtitle="Every request between customers and agencies, in one calm place." />
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
          <Table head={["Customer", "Agency", "Event", "When", "Total", "Status", ""]}>
            {rows.map((b) => (
              <tr key={b.id} className="cursor-pointer hover:bg-cream/60" onClick={() => open(b)}>
                <Td>
                  <p className="font-medium text-ink">{b.customerName}</p>
                  <p className="text-xs text-muted">{b.customerPhone || "—"}</p>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Avatar name={b.agencyName} size={28} />
                    <div className="min-w-0">
                      <p className="text-ink">{b.agencyName}</p>
                      <p className="text-xs text-muted">{b.serviceLabel || b.service}</p>
                    </div>
                  </div>
                </Td>
                <Td>
                  <p className="text-ink">{b.eventType}</p>
                  <p className="max-w-48 truncate text-xs text-muted">{b.location}</p>
                </Td>
                <Td className="text-muted">
                  {fmtDate(b.eventDate, true)}
                  <p className="text-xs">
                    {b.hours} hrs · {b.personnelCount ?? 1} staff · {b.assignedIds?.length ?? 0} assigned
                  </p>
                </Td>
                <Td className="font-medium text-ink">
                  {fmtMoney(b.totalAmount, settings.currency)}
                  <div className="mt-1">
                    <Badge value={b.paymentStatus ?? "unpaid"} dot={false} />
                  </div>
                </Td>
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
                <p className="text-xs uppercase tracking-wide text-muted">Agency</p>
                <p className="font-medium text-ink">{editing.agencyName}</p>
                <p className="text-xs text-muted">{editing.serviceLabel || editing.service}</p>
                <p className="text-xs text-muted">
                  Booked {fmtDate(editing.createdAt, true)} · {editing.reviewed ? "Reviewed" : "Not reviewed"}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-muted">
                Assigned team ({editing.assigned?.length ?? 0} of {editing.personnelCount ?? 1}) · client approval:{" "}
                <span className="normal-case text-ink">{(editing.clientApproval ?? "none").replace(/_/g, " ")}</span>
              </p>
              {editing.assigned?.length ? (
                <ul className="flex flex-wrap gap-2">
                  {editing.assigned.map((p) => (
                    <li key={p.personnelId} className="flex items-center gap-2 rounded-xl border border-line px-2.5 py-1.5">
                      <Avatar name={p.name} url={p.photoUrl} size={24} />
                      <span className="text-[13px] text-ink">{p.name}</span>
                      <span className="text-xs text-muted">{p.code}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted">No one assigned yet.</p>
              )}
              {editing.clientFeedback && <p className="mt-2 text-xs text-muted">Client feedback: {editing.clientFeedback}</p>}
              {editing.rescheduleRequest && (
                <p className="mt-2 text-xs text-muted">
                  Reschedule requested by {editing.rescheduleRequest.by} to {fmtDate(editing.rescheduleRequest.date, true)}
                  {editing.rescheduleRequest.reason ? ` — ${editing.rescheduleRequest.reason}` : ""}
                </p>
              )}
              {editing.cancelReason && <p className="mt-2 text-xs text-rose">Cancel reason: {editing.cancelReason}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Status">
                <Select value={form.status} onChange={(e) => set("status", e.target.value as BookingStatus)} options={BOOKING_STATUSES.map((s) => ({ value: s, label: s }))} />
              </Field>
              <Field label="Payment status">
                <Select value={form.paymentStatus} onChange={(e) => set("paymentStatus", e.target.value as PaymentStatus)} options={PAYMENT_STATUSES.map((s) => ({ value: s, label: s }))} />
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
              <Field label="Personnel needed">
                <Input type="number" min={1} value={form.personnelCount} onChange={(e) => set("personnelCount", e.target.value)} />
              </Field>
              <Field label={`Hourly rate (${settings.currency})`}>
                <Input type="number" min={0} value={form.hourlyRate} onChange={(e) => set("hourlyRate", e.target.value)} />
              </Field>
              <Field label={`Subtotal (${settings.currency})`}>
                <Input type="number" min={0} value={form.subtotal} onChange={(e) => set("subtotal", e.target.value)} />
              </Field>
              <Field label={`Platform fee (${settings.currency})`}>
                <Input type="number" min={0} value={form.platformFee} onChange={(e) => set("platformFee", e.target.value)} />
              </Field>
              <Field label={`Tax (${settings.currency})`}>
                <Input type="number" min={0} value={form.tax} onChange={(e) => set("tax", e.target.value)} />
              </Field>
              <Field label={`Total (${settings.currency})`}>
                <div className="flex gap-2">
                  <Input type="number" min={0} value={form.totalAmount} onChange={(e) => set("totalAmount", e.target.value)} />
                  <Button variant="secondary" type="button" onClick={recalc} title="Rate × hours × personnel, plus commission and tax from settings">
                    Recalc
                  </Button>
                </div>
              </Field>
              <Field label="Requirements" className="sm:col-span-2">
                <Textarea value={form.requirements} onChange={(e) => set("requirements", e.target.value)} rows={3} />
              </Field>
              <Field label="Agency note" className="sm:col-span-2">
                <Textarea value={form.agencyNote} onChange={(e) => set("agencyNote", e.target.value)} rows={2} />
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
            <strong className="text-ink">{deleting?.agencyName}</strong> will disappear for both of them. Consider cancelling it instead if they
            should still see the history.
          </>
        }
      />
    </>
  );
}
