"use client";

import { useMemo, useState } from "react";
import { Building2, Trash2 } from "lucide-react";
import { useCollection } from "@/hooks/useCollection";
import { deleteAgency, setAgencyStatus, updateAgency } from "@/lib/actions";
import { errMsg, fmtDate, fmtMoney, matches } from "@/lib/format";
import { useSettings } from "@/hooks/useSettings";
import { AGENCY_STATUSES, SERVICE_LABELS, type Agency, type AgencyDocument, type AgencyStatus } from "@/lib/types";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  Empty,
  ErrorNote,
  FilterPills,
  IconButton,
  PageHeader,
  RowActions,
  SearchBox,
  Section,
  SkeletonRows,
  Stars,
  Table,
  Td,
  Toggle,
  Toolbar,
  Tr,
  Verified,
} from "@/components/ui";
import { DocumentList, RemarksDialog } from "@/components/Verification";
import { useToast } from "@/components/Toast";

const STATUS_HELP: Record<AgencyStatus, string> = {
  draft: "The agency has not submitted its profile yet.",
  pending: "Submitted for review; hidden from customers.",
  approved: "Visible to customers and able to take bookings.",
  rejected: "Hidden; the agency sees your remarks and can resubmit.",
  suspended: "Hidden; the agency is asked to contact support.",
};

function Info({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="mt-0.5 break-words text-[13px] text-ink">{value || "—"}</p>
    </div>
  );
}

export default function AgenciesPage() {
  const toast = useToast();
  const { data, loading, error } = useCollection<Agency>("agencies");
  const documents = useCollection<AgencyDocument>("documents");
  const { settings } = useSettings();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<AgencyStatus | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<{ agency: Agency; status: "rejected" | "suspended" } | null>(null);
  const [deleting, setDeleting] = useState<Agency | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const selected = data.find((a) => a.id === openId) ?? null;
  const agencyDocs = useMemo(
    () => (openId ? documents.data.filter((d) => d.agencyId === openId && d.ownerType === "agency") : []),
    [documents.data, openId],
  );

  const counts = useMemo(() => {
    const c: Partial<Record<AgencyStatus | "all", number>> = { all: data.length };
    for (const s of AGENCY_STATUSES) c[s] = data.filter((a) => a.status === s).length;
    return c;
  }, [data]);

  const rows = useMemo(
    () =>
      data
        .filter((a) => filter === "all" || a.status === filter)
        .filter((a) => matches(q, a.name, a.city, a.ownerName, a.email, a.registrationNo, a.licenseNo))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
    [data, filter, q],
  );

  async function moderate(a: Agency, status: AgencyStatus, remarks?: string) {
    setBusy(a.id + status);
    try {
      await setAgencyStatus(a.id, status, remarks);
      toast(`${a.name || "Agency"} is now ${status}.`);
      setRejecting(null);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(null);
    }
  }

  async function toggleVerified(a: Agency, verified: boolean) {
    try {
      await updateAgency(a.id, { verified });
      toast(verified ? "Verified badge awarded." : "Verified badge removed.");
    } catch (e) {
      toast(errMsg(e), "error");
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy("delete");
    try {
      await deleteAgency(deleting.id);
      toast("Agency profile removed.");
      setDeleting(null);
      setOpenId(null);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(null);
    }
  }

  const services = selected ? Object.entries(selected.services ?? {}).filter(([, s]) => s?.enabled) : [];

  return (
    <>
      <PageHeader title="Agencies" subtitle="Review agency applications, verify their documents and award the verified badge." />
      <ErrorNote error={error || documents.error} />

      <Card>
        <Toolbar
          left={<FilterPills value={filter} onChange={setFilter} options={AGENCY_STATUSES} counts={counts} />}
          right={<SearchBox value={q} onChange={setQ} placeholder="Search name, city, owner or licence" />}
          count={loading ? undefined : rows.length}
          noun="agency" plural="agencies"
        />
        {!loading && rows.length === 0 ? (
          <Empty icon={Building2} title="No agencies found" hint={q || filter !== "all" ? "Try a different filter or search." : "Agencies appear here after they sign up on the agency dashboard."} />
        ) : (
          <Table head={["Agency", "City", "Personnel", "Rating", "Status", "Joined", { label: "", align: "right" }]}>
            {loading ? (
              <SkeletonRows cols={7} />
            ) : (
              rows.map((a) => (
                <Tr key={a.id} onClick={() => setOpenId(a.id)}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={a.name} url={a.logoUrl} />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1 truncate font-semibold text-ink">
                          {a.name || "Unnamed agency"} {a.verified && <Verified />}
                        </p>
                        <p className="truncate text-xs text-muted">{a.ownerName || a.email || "—"}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-muted">{a.city || "—"}</Td>
                  <Td className="tabular-nums text-muted">{a.personnelCount ?? 0}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Stars value={a.rating ?? 0} />
                      <span className="text-xs tabular-nums text-muted">{a.reviewCount ? `${(a.rating ?? 0).toFixed(1)} (${a.reviewCount})` : "New"}</span>
                    </div>
                  </Td>
                  <Td>
                    <Badge value={a.status} />
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{fmtDate(a.createdAt)}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {a.status === "pending" && (
                        <Button size="sm" variant="soft" loading={busy === a.id + "approved"} onClick={() => moderate(a, "approved")}>
                          Approve
                        </Button>
                      )}
                      <RowActions>
                        <IconButton label="Delete agency" tone="danger" onClick={() => setDeleting(a)}>
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
        open={!!selected}
        onClose={() => setOpenId(null)}
        title="Agency"
        header={
          selected && (
            <div className="flex items-center gap-3">
              <Avatar name={selected.name} url={selected.logoUrl} size={48} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-base font-semibold text-ink">
                  {selected.name || "Unnamed agency"} {selected.verified && <Verified />}
                </p>
                <p className="truncate text-xs text-muted">
                  {selected.reviewCount ? `${(selected.rating ?? 0).toFixed(1)} ★ · ${selected.reviewCount} reviews` : "No reviews yet"} · joined {fmtDate(selected.createdAt)}
                </p>
              </div>
              <Badge value={selected.status} />
            </div>
          )
        }
        danger={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">Remove this agency&apos;s profile. Personnel, documents and bookings stay in the records.</p>
            <Button variant="secondary" size="sm" className="text-rose hover:bg-rose-soft" onClick={() => setDeleting(selected)}>
              <Trash2 className="h-3.5 w-3.5" /> Delete agency
            </Button>
          </div>
        }
      >
        {selected && (
          <>
            <Section title="Moderation" hint={STATUS_HELP[selected.status]}>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={selected.status === "approved"} loading={busy === selected.id + "approved"} onClick={() => moderate(selected, "approved")}>
                  Approve
                </Button>
                <Button size="sm" variant="secondary" disabled={selected.status === "rejected"} onClick={() => setRejecting({ agency: selected, status: "rejected" })}>
                  Reject
                </Button>
                <Button size="sm" variant="secondary" disabled={selected.status === "suspended"} onClick={() => setRejecting({ agency: selected, status: "suspended" })}>
                  Suspend
                </Button>
              </div>
              {selected.adminRemarks && (
                <p className="mt-3 rounded-xl bg-cream px-3 py-2 text-xs text-ink">
                  <span className="font-semibold">Remarks:</span> {selected.adminRemarks}
                </p>
              )}
              <div className="mt-4 rounded-xl border border-line p-4">
                <Toggle checked={!!selected.verified} onChange={(v) => toggleVerified(selected, v)} label="Verified badge" description="Shown next to the agency name in the client app." />
              </div>
            </Section>

            <Section title="Profile">
              {selected.description && <p className="mb-4 whitespace-pre-line text-[13px] leading-relaxed text-ink">{selected.description}</p>}
              <div className="grid grid-cols-2 gap-4">
                <Info label="Owner" value={selected.ownerName} />
                <Info label="Email" value={selected.email} />
                <Info label="Phone" value={selected.phone} />
                <Info label="City" value={selected.city} />
                <Info label="Registration no." value={selected.registrationNo} />
                <Info label="Licence no." value={selected.licenseNo} />
                <Info label="Experience" value={`${selected.yearsExperience ?? 0} yrs`} />
                <Info label="Working hours" value={selected.workingHours} />
                <Info label="Personnel" value={String(selected.personnelCount ?? 0)} />
                <Info label="Areas" value={(selected.areas ?? []).join(", ")} />
                <div className="col-span-2">
                  <Info label="Address" value={selected.address} />
                </div>
              </div>
            </Section>

            <Section title="Services" hint={`${services.length} enabled`}>
              {services.length === 0 ? (
                <p className="text-xs text-muted">No services enabled.</p>
              ) : (
                <ul className="space-y-2">
                  {services.map(([key, s]) => (
                    <li key={key} className="rounded-xl border border-line p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[13px] font-semibold text-ink">{SERVICE_LABELS[key] ?? key}</p>
                        <p className="text-xs tabular-nums text-ink">
                          {fmtMoney(s?.hourlyRate, settings.currency)}
                          <span className="text-muted">/hr · min {s?.minHours ?? 0}h</span>
                        </p>
                      </div>
                      {s?.description && <p className="mt-1 text-xs text-muted">{s.description}</p>}
                      {s?.locations?.length ? <p className="mt-1 text-xs text-muted">Locations: {s.locations.join(", ")}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Agency documents" hint={`${agencyDocs.length}`}>
              <DocumentList docs={agencyDocs} emptyHint="This agency hasn't uploaded any company documents yet." />
            </Section>

            <p className="text-[11px] text-muted">Agency ID {selected.id}</p>
          </>
        )}
      </Drawer>

      <RemarksDialog
        open={!!rejecting}
        title={rejecting?.status === "suspended" ? "Suspend agency" : "Reject agency"}
        confirmLabel={rejecting?.status === "suspended" ? "Suspend" : "Reject"}
        description={rejecting && <>Tell <strong className="text-ink">{rejecting.agency.name}</strong> why. They&apos;ll get a notification.</>}
        initial={rejecting?.agency.adminRemarks ?? ""}
        loading={!!rejecting && busy === rejecting.agency.id + rejecting.status}
        onClose={() => setRejecting(null)}
        onConfirm={(r) => rejecting && moderate(rejecting.agency, rejecting.status, r)}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy === "delete"}
        title="Delete this agency?"
        message={
          <>
            <strong className="text-ink">{deleting?.name}</strong>&apos;s public profile will be removed and customers won&apos;t be able to find it. Staff
            accounts, personnel and past bookings stay in the records.
          </>
        }
      />
    </>
  );
}
