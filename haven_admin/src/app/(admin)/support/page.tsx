"use client";

import { useMemo, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { useCollection } from "@/hooks/useCollection";
import { replyTicket, setTicketStatus } from "@/lib/actions";
import { errMsg, fmtDate, matches } from "@/lib/format";
import { TICKET_STATUSES, type Agency, type Ticket, type TicketStatus } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  Drawer,
  Empty,
  ErrorNote,
  Field,
  FilterPills,
  PageHeader,
  SearchBox,
  Section,
  Select,
  SkeletonRows,
  Table,
  Td,
  Textarea,
  Toolbar,
  Tr,
} from "@/components/ui";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/components/AuthProvider";

// Escalated / emergency first, then high priority, then newest activity.
function rank(t: Ticket) {
  if (t.status === "resolved") return 3;
  if (t.status === "escalated" || t.priority === "emergency") return 0;
  if (t.priority === "high") return 1;
  return 2;
}

export default function SupportPage() {
  const toast = useToast();
  const { state } = useAuth();
  const adminName = state.status === "admin" ? state.profile.name || "Haven admin" : "Haven admin";
  const { data, loading, error } = useCollection<Ticket>("tickets");
  const agencies = useCollection<Agency>("agencies");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<TicketStatus | "all">("all");
  const [scope, setScope] = useState<"all" | "admin" | "bouncer">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const agencyName = useMemo(() => new Map(agencies.data.map((a) => [a.id, a.name])), [agencies.data]);
  const selected = data.find((t) => t.id === openId) ?? null;

  const counts = useMemo(() => {
    const c: Partial<Record<TicketStatus | "all", number>> = { all: data.length };
    for (const s of TICKET_STATUSES) c[s] = data.filter((t) => t.status === s).length;
    return c;
  }, [data]);

  const rows = useMemo(
    () =>
      data
        .filter((t) => filter === "all" || t.status === filter)
        .filter((t) => scope === "all" || (scope === "admin" ? !t.agencyId : !!t.reporterId))
        .filter((t) => matches(q, t.subject, t.customerName, t.reporterName, agencyName.get(t.agencyId), t.bookingId))
        .sort((a, b) => rank(a) - rank(b) || (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0)),
    [data, filter, scope, q, agencyName],
  );

  async function send() {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    try {
      await replyTicket(selected.id, adminName, reply.trim());
      setReply("");
      toast("Reply sent.");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(t: Ticket, status: TicketStatus) {
    try {
      await setTicketStatus(t.id, status);
      toast(`Ticket marked ${status.replace(/_/g, " ")}.`);
    } catch (e) {
      toast(errMsg(e), "error");
    }
  }

  return (
    <>
      <PageHeader title="Support" subtitle="Complaints, incidents and support requests. Escalated and emergency tickets come first." />
      <ErrorNote error={error || agencies.error} />

      <Card>
        <Toolbar
          left={<FilterPills value={filter} onChange={setFilter} options={TICKET_STATUSES} counts={counts} />}
          right={
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="sm:w-48">
                <Select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as "all" | "admin" | "bouncer")}
                  aria-label="Filter by queue"
                  options={[
                    { value: "all", label: "All tickets" },
                    { value: "admin", label: `Handled by Haven (${data.filter((t) => !t.agencyId).length})` },
                    { value: "bouncer", label: "From bouncers" },
                  ]}
                />
              </div>
              <SearchBox value={q} onChange={setQ} placeholder="Search subject, reporter or agency" />
            </div>
          }
          count={loading ? undefined : rows.length}
          noun="ticket"
        />
        {!loading && rows.length === 0 ? (
          <Empty icon={LifeBuoy} title="No tickets" hint="Tickets raised by customers, agencies and bouncers appear here." />
        ) : (
          <Table head={["Subject", "Agency", "Raised by", "Priority", "Status", "Updated"]}>
            {loading ? (
              <SkeletonRows cols={6} />
            ) : (
              rows.map((t) => (
                <Tr
                  key={t.id}
                  className={t.priority === "emergency" && t.status !== "resolved" ? "bg-rose-soft/50" : ""}
                  onClick={() => {
                    setOpenId(t.id);
                    setReply("");
                  }}
                >
                  <Td>
                    <p className="font-semibold text-ink">{t.subject || "No subject"}</p>
                    <p className="text-xs capitalize text-muted">
                      {t.category} · {t.messages?.length ?? 0} messages
                    </p>
                  </Td>
                  <Td className="text-muted">{t.agencyId ? (agencyName.get(t.agencyId) ?? "Unknown agency") : <Badge value="admin" label="Haven admin" dot={false} />}</Td>
                  <Td className="text-muted">
                    {t.reporterId ? (
                      <>
                        {t.reporterName || "Bouncer"} <span className="text-xs">(bouncer)</span>
                      </>
                    ) : (
                      t.customerName || "—"
                    )}
                  </Td>
                  <Td>
                    <Badge value={t.priority} dot={false} />
                  </Td>
                  <Td>
                    <Badge value={t.status} />
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{fmtDate(t.updatedAt ?? t.createdAt, true)}</Td>
                </Tr>
              ))
            )}
          </Table>
        )}
      </Card>

      <Drawer
        open={!!selected}
        onClose={() => setOpenId(null)}
        title="Ticket"
        header={
          selected && (
            <div>
              <p className="text-base font-semibold text-ink">{selected.subject || "No subject"}</p>
              <p className="mt-1 text-xs text-muted">
                {selected.agencyId ? (agencyName.get(selected.agencyId) ?? "Unknown agency") : "Handled by Haven admin"}
                {selected.reporterId ? ` · bouncer ${selected.reporterName || ""}` : ""}
                {selected.customerName ? ` · ${selected.customerName}` : ""}
                {selected.bookingId ? ` · booking ${selected.bookingId}` : ""}
              </p>
              <div className="mt-2 flex gap-2">
                <Badge value={selected.priority} dot={false} />
                <Badge value={selected.category} dot={false} />
              </div>
            </div>
          )
        }
        footer={
          <Button onClick={send} loading={busy} disabled={!reply.trim()}>
            Send reply
          </Button>
        }
      >
        {selected && (
          <>
            <Field label="Status">
              <Select
                value={selected.status}
                onChange={(e) => changeStatus(selected, e.target.value as TicketStatus)}
                options={TICKET_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
              />
            </Field>

            <Section title="Conversation">
              {(selected.messages ?? []).length === 0 ? (
                <p className="text-xs text-muted">No messages yet.</p>
              ) : (
                <ul className="space-y-3">
                  {selected.messages.map((m, i) => (
                    <li key={i} className={`rounded-xl p-3 text-[13px] ${m.by === "admin" ? "ml-6 bg-sage-soft" : "mr-6 bg-cream"}`}>
                      <p className="text-[11px] text-muted">
                        <span className="font-semibold capitalize text-ink">{m.name || m.by}</span> · {m.by} · {fmtDate(m.at, true)}
                      </p>
                      <p className="mt-1 whitespace-pre-line text-ink">{m.text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Field label="Reply as admin">
              <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} placeholder="Write a reply…" />
            </Field>
          </>
        )}
      </Drawer>
    </>
  );
}
