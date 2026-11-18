"use client";

import { useMemo, useState } from "react";
import { Flag, MessageSquare, Star } from "lucide-react";
import { useData } from "@/components/DataProvider";
import { Ring } from "@/components/charts";
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, Segmented, Textarea, useConfirm, cx } from "@/components/ui";
import { useActor } from "@/lib/useActor";
import { patch } from "@/lib/actions";
import { ago } from "@/lib/format";
import type { Review } from "@/lib/types";

const Stars = ({ n, size = 14 }: { n: number; size?: number }) => (
  <span className="inline-flex gap-0.5" aria-label={`${n} out of 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} style={{ width: size, height: size }} className={i <= n ? "fill-ink text-ink" : "text-line-2"} />)}</span>
);

export default function ReviewsPage() {
  const { reviews, bookings } = useData();
  const { agency } = useActor();
  const [filter, setFilter] = useState<"all" | "unreplied" | "low">("all");

  const dist = useMemo(() => [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => r.rating === s).length })), [reviews]);
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  const shown = reviews.filter((r) => filter === "all" || (filter === "unreplied" ? !r.reply : r.rating <= 3));
  const responseRate = reviews.length ? Math.round((reviews.filter((r) => r.reply).length / reviews.length) * 100) : 0;

  return (
    <>
      <PageHeader title="Reviews & ratings" desc="What clients say about your agency and your team. Thoughtful replies show future clients you care." />
      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
        <Card className="flex items-center gap-5 p-5">
          <div><p className="text-[13px] text-muted">Overall rating</p><p className="tnum mt-1 text-4xl font-semibold text-ink">{avg ? avg.toFixed(1) : "—"}</p><Stars n={Math.round(avg)} /><p className="mt-1 text-xs text-muted">{reviews.length} reviews{agency.verified ? " · Verified agency" : ""}</p></div>
        </Card>
        <Card className="p-5">
          <div className="space-y-1.5">{dist.map(({ s, n }) => (
            <div key={s} className="flex items-center gap-2 text-[13px]"><span className="tnum w-3 text-muted">{s}</span><Star className="h-3 w-3 fill-ink" />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-wash"><div className="anim-grow h-full bg-ink" style={{ width: `${reviews.length ? (n / reviews.length) * 100 : 0}%` }} /></div><span className="tnum w-6 text-right text-muted">{n}</span></div>
          ))}</div>
        </Card>
        <Card className="flex items-center gap-5 p-5"><Ring value={responseRate} label={`${responseRate}%`} size={80} /><div><p className="text-sm font-medium text-ink">Response rate</p><p className="text-[13px] text-muted">Aim to reply to every review within 48 hours.</p></div></Card>
      </div>

      <div className="mb-4"><Segmented value={filter} onChange={setFilter} items={[{ value: "all", label: "All" }, { value: "unreplied", label: "Needs reply" }, { value: "low", label: "3 stars or less" }]} /></div>
      {!shown.length ? <Card><EmptyState icon={<Star className="h-5 w-5" />} title="No reviews here" desc="Clients can review your agency after a booking is completed." /></Card> : (
        <div className="stagger space-y-3">{shown.map((r) => <ReviewCard key={r.id} r={r} service={bookings.find((b) => b.id === r.bookingId)?.serviceLabel} />)}</div>
      )}
    </>
  );
}

function ReviewCard({ r, service }: { r: Review; service?: string }) {
  const { run } = useActor();
  const confirm = useConfirm();
  const [reply, setReply] = useState<string | null>(null);
  return (
    <Card className={cx("p-5", r.rating <= 2 && !r.reply && "border-ink/30")}>
      <div className="flex items-start gap-3">
        <Avatar name={r.customerName} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><p className="font-medium text-ink">{r.customerName}</p><Stars n={r.rating} />{service && <span className="text-xs text-muted">· {service}</span>}<span className="text-xs text-faint">· {ago(r.createdAt)}</span>{r.reported && <Badge tone="danger">Reported</Badge>}</div>
          <p className="mt-2 text-sm text-body">{r.comment || <span className="text-muted">No written comment.</span>}</p>
          {r.personnelFeedback && <p className="mt-2 rounded-lg bg-wash p-2.5 text-[13px]"><b className="font-medium text-ink">About the team:</b> {r.personnelFeedback}</p>}
          {r.reply && reply === null && <div className="mt-3 border-l-2 border-ink pl-3 text-sm"><p className="text-xs font-medium text-muted">Your reply · {ago(r.replyAt)}</p><p className="mt-0.5">{r.reply}</p></div>}
          {reply !== null && (
            <div className="mt-3 space-y-2"><Textarea autoFocus value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Thank them, and address any concern specifically." className="min-h-[80px]" />
              <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setReply(null)}>Cancel</Button>
                <Button size="sm" variant="primary" disabled={!reply.trim()} onClick={async () => { if (await run(() => patch("reviews", r.id, { reply: reply.trim(), replyAt: new Date() }, false), "Reply posted", ["Replied to review", r.customerName])) setReply(null); }}>Post reply</Button></div></div>
          )}
          {reply === null && (
            <div className="mt-3 flex gap-1">
              <Button size="sm" variant="ghost" icon={<MessageSquare className="h-3.5 w-3.5" />} onClick={() => setReply(r.reply ?? "")}>{r.reply ? "Edit reply" : "Reply"}</Button>
              {!r.reported && <Button size="sm" variant="ghost" icon={<Flag className="h-3.5 w-3.5" />} onClick={async () => {
                const c = await confirm({ title: "Report this review?", desc: "Haven reviews reports for abuse, personal information or reviews unrelated to a real booking.", confirm: "Report" });
                if (c.ok) run(() => patch("reviews", r.id, { reported: true }, false), "Reported to Haven", ["Reported review", r.customerName]);
              }}>Report</Button>}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
