"use client";

import { useMemo, useState } from "react";
import { Pencil, Star, Trash2 } from "lucide-react";
import { useCollection } from "@/hooks/useCollection";
import { deleteReview, updateReview } from "@/lib/actions";
import { errMsg, fmtDate, matches } from "@/lib/format";
import type { Agency, Review } from "@/lib/types";
import { Button, Card, ConfirmDialog, Empty, ErrorNote, Field, Loading, Modal, PageHeader, SearchBox, Stars, Textarea } from "@/components/ui";
import { useToast } from "@/components/Toast";

export default function ReviewsPage() {
  const toast = useToast();
  const { data, loading, error } = useCollection<Review>("reviews");
  const agencies = useCollection<Agency>("agencies");
  const [q, setQ] = useState("");
  const [minStars, setMinStars] = useState(0);
  const [editing, setEditing] = useState<Review | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);

  const agencyName = useMemo(() => new Map(agencies.data.map((a) => [a.id, a.name])), [agencies.data]);

  const rows = useMemo(
    () =>
      data
        .filter((r) => (minStars ? r.rating === minStars : true))
        .filter((r) => matches(q, r.customerName, r.comment, agencyName.get(r.agencyId)))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
    [data, q, minStars, agencyName],
  );

  function open(r: Review) {
    setEditing(r);
    setRating(r.rating);
    setComment(r.comment ?? "");
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      await updateReview(editing, { rating, comment: comment.trim() });
      toast("Review updated and rating recalculated.");
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
      await deleteReview(deleting);
      toast("Review removed and agency rating adjusted.");
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
      <PageHeader title="Reviews" subtitle="What customers say. Keep feedback honest, kind and useful." />
      <ErrorNote error={error} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {[0, 5, 4, 3, 2, 1].map((n) => (
            <button
              key={n}
              onClick={() => setMinStars(n)}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                minStars === n ? "bg-sage text-white" : "bg-white text-muted ring-1 ring-line hover:text-ink"
              }`}
            >
              {n === 0 ? "All" : (
                <>
                  {n} <Star className="h-3 w-3" />
                </>
              )}
            </button>
          ))}
        </div>
        <SearchBox value={q} onChange={setQ} placeholder="Search reviews" />
      </div>

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Card>
          <Empty title="No reviews yet" hint="Reviews appear after customers complete a booking." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rows.map((r) => (
            <Card key={r.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Stars value={r.rating} />
                  <p className="mt-2 text-sm text-muted">
                    <span className="font-medium text-ink">{r.customerName}</span> about{" "}
                    <span className="font-medium text-ink">{agencyName.get(r.agencyId) ?? "a removed agency"}</span>
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => open(r)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(r)} aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink">{r.comment ? `“${r.comment}”` : <em className="text-muted">No comment</em>}</p>
              <p className="mt-4 text-xs text-muted">{fmtDate(r.createdAt)}</p>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit review"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Rating">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
                  <Star className={`h-7 w-7 ${n <= rating ? "fill-sand text-sand" : "text-line"}`} />
                </button>
              ))}
            </div>
          </Field>
          <Field label="Comment">
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title="Delete this review?"
        message="The agency's average rating will be recalculated, and the customer will be able to leave a new review for that booking."
      />
    </>
  );
}
