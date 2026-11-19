"use client";

import { useMemo, useState } from "react";
import { Trash2, UserCheck } from "lucide-react";
import { useCollection } from "@/hooks/useCollection";
import { useSettings } from "@/hooks/useSettings";
import { deletePersonnel, setPersonnelStatus } from "@/lib/actions";
import { errMsg, fmtDate, fmtMoney, matches } from "@/lib/format";
import { VERIFICATION_STATUSES, type Agency, type AgencyDocument, type Personnel, type VerificationStatus } from "@/lib/types";
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
  Select,
  SkeletonRows,
  Table,
  Td,
  Toolbar,
  Tr,
} from "@/components/ui";
import { DocumentList, RemarksDialog, ReviewNote } from "@/components/Verification";
import { useToast } from "@/components/Toast";

function Info({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="mt-0.5 break-words text-[13px] text-ink">{value || "—"}</p>
    </div>
  );
}

type Filter = VerificationStatus | "independent" | "removal";

const FILTERS: Filter[] = ["pending", "needs_correction", "verified", "rejected", "suspended", "expired", "draft", "independent", "removal"];
const INDEPENDENT = "__independent";
const DAY_LABELS: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

function AgencyCell({ p, name }: { p: Personnel; name?: string }) {
  if (!p.agencyId) return <Badge value="independent" label="Independent" dot={false} />;
  return <>{name ?? "Unknown agency"}</>;
}

export default function PersonnelPage() {
  const toast = useToast();
  const { data, loading, error } = useCollection<Personnel>("personnel");
  const agencies = useCollection<Agency>("agencies");
  const documents = useCollection<AgencyDocument>("documents");
  const { settings } = useSettings();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter | "all">("all");
  const [agencyId, setAgencyId] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<{ p: Personnel; status: "rejected" | "suspended" | "needs_correction" } | null>(null);
  const [deleting, setDeleting] = useState<Personnel | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const agencyName = useMemo(() => new Map(agencies.data.map((a) => [a.id, a.name])), [agencies.data]);
  const selected = data.find((p) => p.id === openId) ?? null;
  const personDocs = useMemo(() => (openId ? documents.data.filter((d) => d.personnelId === openId) : []), [documents.data, openId]);

  const scoped = useMemo(() => data.filter((p) => agencyId === "all" || (agencyId === INDEPENDENT ? !p.agencyId : p.agencyId === agencyId)), [data, agencyId]);

  const counts = useMemo(() => {
    const c: Partial<Record<Filter | "all", number>> = { all: scoped.length };
    for (const s of VERIFICATION_STATUSES) c[s] = scoped.filter((p) => p.verificationStatus === s).length;
    c.independent = scoped.filter((p) => !p.agencyId).length;
    c.removal = scoped.filter((p) => p.removalRequested).length;
    return c;
  }, [scoped]);

  const rows = useMemo(
    () =>
      scoped
        .filter((p) =>
          filter === "all"
            ? true
            : filter === "removal"
              ? p.removalRequested
              : filter === "independent"
                ? !p.agencyId
                : p.verificationStatus === filter,
        )
        .filter((p) => matches(q, p.name, p.code, p.phone, agencyName.get(p.agencyId), ...(p.skills ?? [])))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
    [scoped, filter, q, agencyName],
  );

  async function moderate(p: Personnel, status: VerificationStatus, remarks?: string) {
    setBusy(p.id + status);
    try {
      await setPersonnelStatus(p, status, remarks);
      toast(`${p.name} is now ${status.replace(/_/g, " ")}.`);
      setRejecting(null);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy("delete");
    try {
      await deletePersonnel(deleting.id);
      toast(deleting.removalRequested ? "Removal request approved; record deleted." : "Personnel record deleted.");
      setDeleting(null);
      setOpenId(null);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(null);
    }
  }

  const agencyOptions = [
    { value: "all", label: "All agencies" },
    { value: INDEPENDENT, label: "Independent (no agency)" },
    ...agencies.data.map((a) => ({ value: a.id, label: a.name || a.id })).sort((a, b) => a.label.localeCompare(b.label)),
  ];

  return (
    <>
      <PageHeader title="Personnel" subtitle="The central registry of security staff across every agency." />
      <ErrorNote error={error || agencies.error || documents.error} />

      <Card>
        <Toolbar
          left={
            <FilterPills
              value={filter}
              onChange={setFilter}
              options={FILTERS.filter((f) => f === "independent" || f === "removal" || VERIFICATION_STATUSES.includes(f as VerificationStatus))}
              counts={counts}
              labels={{ pending: "Pending verification", removal: "Removal requests" }}
            />
          }
          right={
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="sm:w-48">
                <Select value={agencyId} onChange={(e) => setAgencyId(e.target.value)} options={agencyOptions} aria-label="Filter by agency" />
              </div>
              <SearchBox value={q} onChange={setQ} placeholder="Search name, ID, phone or skill" />
            </div>
          }
          count={loading ? undefined : rows.length}
          noun="person"
          plural="people"
        />
        {!loading && rows.length === 0 ? (
          <Empty icon={UserCheck} title="No personnel found" hint="Try a different filter or search." />
        ) : (
          <Table head={["Person", "Agency", "Experience", "Availability", "Status", "Added", { label: "", align: "right" }]}>
            {loading ? (
              <SkeletonRows cols={7} />
            ) : (
              rows.map((p) => (
                <Tr key={p.id} onClick={() => setOpenId(p.id)}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={p.name} url={p.photoUrl} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{p.name}</p>
                        <p className="truncate text-xs text-muted">
                          {p.code || "—"}
                          {p.active === false ? " · inactive" : ""}
                          {p.userId ? <span className="text-sage-dark"> · app linked</span> : null}
                          {p.verificationStatus === "pending" && p.reviewedBy ? <span className="text-amber"> · resubmitted</span> : null}
                          {p.removalRequested ? <span className="text-rose"> · removal requested</span> : null}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-muted">
                    <AgencyCell p={p} name={agencyName.get(p.agencyId)} />
                  </Td>
                  <Td className="tabular-nums text-muted">{p.experienceYears ?? 0} yrs</Td>
                  <Td className="capitalize text-muted">{(p.availability ?? "—").replace(/_/g, " ")}</Td>
                  <Td>
                    <Badge value={p.verificationStatus} />
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{fmtDate(p.createdAt)}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {p.verificationStatus === "pending" && (
                        <Button size="sm" variant="soft" loading={busy === p.id + "verified"} onClick={() => moderate(p, "verified")}>
                          Verify
                        </Button>
                      )}
                      <RowActions>
                        <IconButton label="Delete record" tone="danger" onClick={() => setDeleting(p)}>
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
        title="Personnel"
        header={
          selected && (
            <div className="flex items-center gap-3">
              <Avatar name={selected.name} url={selected.photoUrl} size={48} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-ink">{selected.name}</p>
                <p className="truncate text-xs text-muted">
                  {selected.code || "—"} · {selected.agencyId ? (agencyName.get(selected.agencyId) ?? "Unknown agency") : "Independent"}
                  {selected.userId ? " · App linked" : ""}
                </p>
              </div>
              <Badge value={selected.verificationStatus} />
            </div>
          )
        }
        danger={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {selected?.removalRequested ? "The agency asked to remove this record. Approving deletes it." : "Permanently delete this personnel record."}
            </p>
            <Button variant="secondary" size="sm" className="text-rose hover:bg-rose-soft" onClick={() => setDeleting(selected)}>
              <Trash2 className="h-3.5 w-3.5" /> {selected?.removalRequested ? "Approve removal" : "Delete record"}
            </Button>
          </div>
        }
      >
        {selected && (
          <>
            {selected.removalRequested && (
              <p className="rounded-xl bg-rose-soft px-4 py-3 text-sm text-rose">The agency has requested this record be removed.</p>
            )}
            <Section title="Verification">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={selected.verificationStatus === "verified"} loading={busy === selected.id + "verified"} onClick={() => moderate(selected, "verified")}>
                  Verify
                </Button>
                <Button size="sm" variant="secondary" disabled={selected.verificationStatus === "needs_correction"} onClick={() => setRejecting({ p: selected, status: "needs_correction" })}>
                  Request correction
                </Button>
                <Button size="sm" variant="secondary" disabled={selected.verificationStatus === "rejected"} onClick={() => setRejecting({ p: selected, status: "rejected" })}>
                  Reject
                </Button>
                <Button size="sm" variant="secondary" disabled={selected.verificationStatus === "suspended"} onClick={() => setRejecting({ p: selected, status: "suspended" })}>
                  Suspend
                </Button>
              </div>
              <ReviewNote by={selected.reviewedBy} at={selected.reviewedAt} remarks={selected.adminRemarks} />
            </Section>

            <Section title="Profile">
              <div className="grid grid-cols-2 gap-4">
                <Info label="Phone" value={selected.phone} />
                <Info label="Source" value={selected.source === "independent" || !selected.agencyId ? "Independent bouncer" : "Added by agency"} />
                <Info label="App account" value={selected.userId ? "Linked" : "Not linked"} />
                <Info label="Consent given" value={selected.consentAt ? fmtDate(selected.consentAt, true) : ""} />
                <Info label="Date of birth" value={selected.dob} />
                <Info label="Gender" value={selected.gender} />
                <Info label="Height" value={selected.heightCm ? `${selected.heightCm} cm` : ""} />
                <Info label="Experience" value={`${selected.experienceYears ?? 0} yrs`} />
                <Info label="Employment" value={(selected.employmentType ?? "").replace(/_/g, " ")} />
                <Info label="Daily wage" value={fmtMoney(selected.dailyWage, settings.currency)} />
                <Info
                  label="Availability"
                  value={`${(selected.availability ?? "").replace(/_/g, " ")}${selected.leaveUntil ? ` until ${selected.leaveUntil}` : ""}`}
                />
                <Info label="Active" value={selected.active === false ? "No" : "Yes"} />
                <Info label="Added" value={fmtDate(selected.createdAt)} />
                <div className="col-span-2">
                  <Info label="Address" value={selected.address} />
                </div>
                <Info label="Work days" value={(selected.workDays ?? []).map((d) => DAY_LABELS[d] ?? d).join(", ")} />
                <Info label="Shifts" value={(selected.shifts ?? []).join(", ")} />
                <div className="col-span-2">
                  <Info label="Preferred areas" value={(selected.preferredAreas ?? []).join(", ")} />
                </div>
                <div className="col-span-2">
                  <Info label="Skills" value={(selected.skills ?? []).join(", ")} />
                </div>
                <div className="col-span-2">
                  <Info label="Certifications" value={(selected.certifications ?? []).join(", ")} />
                </div>
                <div className="col-span-2">
                  <Info label="Languages" value={(selected.languages ?? []).join(", ")} />
                </div>
              </div>
            </Section>

            <Section title="Documents" hint={`${personDocs.length}`}>
              <DocumentList docs={personDocs} person={selected} emptyHint="No documents uploaded for this person yet." />
            </Section>

            <p className="text-[11px] text-muted">Record ID {selected.id}</p>
          </>
        )}
      </Drawer>

      <RemarksDialog
        open={!!rejecting}
        title={rejecting?.status === "suspended" ? "Suspend personnel" : rejecting?.status === "needs_correction" ? "Request correction" : "Reject personnel"}
        confirmLabel={rejecting?.status === "suspended" ? "Suspend" : rejecting?.status === "needs_correction" ? "Request correction" : "Reject"}
        description={
          rejecting && (
            <>
              {rejecting.status === "needs_correction" ? "Explain what needs fixing for " : "Explain why "}
              <strong className="text-ink">{rejecting.p.name}</strong>
              {rejecting.status === "needs_correction" ? "." : " wasn't verified."} The agency{rejecting.p.userId ? " and the bouncer" : ""} will be notified.
            </>
          )
        }
        initial={rejecting?.p.adminRemarks ?? ""}
        loading={!!rejecting && busy === rejecting.p.id + rejecting.status}
        onClose={() => setRejecting(null)}
        onConfirm={(r) => rejecting && moderate(rejecting.p, rejecting.status, r)}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy === "delete"}
        confirmLabel={deleting?.removalRequested ? "Remove" : "Delete"}
        title={deleting?.removalRequested ? "Approve removal request?" : "Delete this record?"}
        message={
          <>
            <strong className="text-ink">{deleting?.name}</strong>&apos;s personnel record will be permanently deleted. Their documents and past bookings stay in the
            records.
          </>
        }
      />
    </>
  );
}
