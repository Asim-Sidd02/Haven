"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2, Users as UsersIcon } from "lucide-react";
import { useCollection } from "@/hooks/useCollection";
import { deleteUserEverywhere, updateUser } from "@/lib/actions";
import { errMsg, fmtDate, matches } from "@/lib/format";
import { ROLES, type Agency, type AppUser, type Role } from "@/lib/types";
import {
  Avatar,
  Badge,
  Button,
  Card,
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
  Select,
  SkeletonRows,
  Table,
  Td,
  Toggle,
  Toolbar,
  Tr,
} from "@/components/ui";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/components/AuthProvider";

interface Form {
  name: string;
  phone: string;
  role: Role;
  isActive: boolean;
}

export default function UsersPage() {
  const toast = useToast();
  const { state } = useAuth();
  const me = state.status === "admin" ? state.user.uid : "";
  const { data, loading, error } = useCollection<AppUser>("users");
  const agencies = useCollection<Agency>("agencies");
  const agencyName = useMemo(() => new Map(agencies.data.map((a) => [a.id, a.name])), [agencies.data]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Role | "all">("all");
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [form, setForm] = useState<Form>({ name: "", phone: "", role: "customer", isActive: true });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<AppUser | null>(null);
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => {
    const c: Partial<Record<Role | "all", number>> = { all: data.length };
    for (const r of ROLES) c[r] = data.filter((u) => u.role === r).length;
    return c;
  }, [data]);

  const rows = useMemo(
    () =>
      data
        .filter((u) => filter === "all" || u.role === filter)
        .filter((u) => matches(q, u.name, u.email, u.phone))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
    [data, filter, q],
  );

  function open(u: AppUser) {
    setEditing(u);
    setForm({ name: u.name ?? "", phone: u.phone ?? "", role: u.role ?? "customer", isActive: u.isActive !== false });
  }
  const close = () => setEditing(null);

  async function save() {
    if (!editing) return;
    if (editing.id === me && (form.role !== "admin" || !form.isActive)) {
      toast("You can't remove your own admin access or deactivate yourself.", "error");
      return;
    }
    setSaving(true);
    try {
      await updateUser(editing.id, { name: form.name.trim(), phone: form.phone.trim(), role: form.role, isActive: form.isActive });
      toast("User updated.");
      close();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: AppUser) {
    if (u.id === me) return toast("You can't deactivate yourself.", "error");
    try {
      await updateUser(u.id, { isActive: u.isActive === false });
      toast(u.isActive === false ? `${u.name} can sign in again.` : `${u.name} has been deactivated.`);
    } catch (e) {
      toast(errMsg(e), "error");
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const r = await deleteUserEverywhere(deleting.id);
      if (r.authDeleted) toast("User and sign-in account deleted.");
      else toast(`User records deleted. ${r.authMessage ?? ""}`, "error");
      setDeleting(null);
      close();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  }

  const isMe = editing?.id === me;

  return (
    <>
      <PageHeader title="Users" subtitle="Everyone who has joined Haven — customers, agency staff and admins." />
      <ErrorNote error={error} />

      <Card>
        <Toolbar
          left={<FilterPills value={filter} onChange={setFilter} options={ROLES} counts={counts} />}
          right={<SearchBox value={q} onChange={setQ} placeholder="Search name, email or phone" />}
          count={loading ? undefined : rows.length}
          noun="user"
        />
        {!loading && rows.length === 0 ? (
          <Empty icon={UsersIcon} title="No users found" hint="Try a different filter or search." />
        ) : (
          <Table head={["User", "Phone", "Role", "Agency", "Access", "Joined", { label: "", align: "right" }]} minWidth={820}>
            {loading ? (
              <SkeletonRows cols={7} />
            ) : (
              rows.map((u) => (
                <Tr key={u.id} onClick={() => open(u)}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} url={u.photoUrl} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">
                          {u.name || "Unnamed"} {u.id === me && <span className="ml-1 rounded-md bg-cream px-1.5 py-px text-[10.5px] font-medium text-muted">You</span>}
                        </p>
                        <p className="truncate text-xs text-muted">{u.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="tabular-nums text-muted">{u.phone || "—"}</Td>
                  <Td>
                    <Badge value={u.role} dot={false} />
                    {u.role === "agency" && u.staffRole && <p className="mt-1 text-xs capitalize text-muted">{u.staffRole}</p>}
                  </Td>
                  <Td className="text-muted">{u.agencyId ? agencyName.get(u.agencyId) ?? u.agencyId : "—"}</Td>
                  <Td>
                    <button
                      type="button"
                      onClick={(e) => (e.stopPropagation(), toggleActive(u))}
                      className="rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/30"
                      title={u.isActive === false ? "Re-activate" : "Deactivate"}
                      aria-label={u.isActive === false ? "Re-activate account" : "Deactivate account"}
                    >
                      <Badge value={u.isActive === false ? "inactive" : "active"} />
                    </button>
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{fmtDate(u.createdAt)}</Td>
                  <Td>
                    <RowActions>
                      <IconButton label="Edit user" onClick={() => open(u)}>
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton label="Delete user" tone="danger" onClick={() => setDeleting(u)} disabled={u.id === me}>
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </RowActions>
                  </Td>
                </Tr>
              ))
            )}
          </Table>
        )}
      </Card>

      <Drawer
        open={!!editing}
        onClose={close}
        title="Edit user"
        header={
          editing && (
            <div className="flex items-center gap-3">
              <Avatar name={editing.name} url={editing.photoUrl} size={48} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-ink">{editing.name || "Unnamed"}</p>
                <p className="truncate text-xs text-muted">{editing.email}</p>
              </div>
              <Badge value={editing.role} dot={false} />
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
          !isMe && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">Removes their records and, when configured, their sign-in account.</p>
              <Button variant="secondary" size="sm" className="text-rose hover:bg-rose-soft" onClick={() => setDeleting(editing)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete user
              </Button>
            </div>
          )
        }
      >
        {editing && (
          <>
            <Section title="Details">
              <div className="space-y-4">
                <Field label="Full name">
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <Field label="Phone">
                  <Input value={form.phone} inputMode="tel" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </Field>
              </div>
            </Section>

            <Section title="Access">
              <div className="space-y-4">
                <Field
                  label="Role"
                  hint={
                    isMe
                      ? "You can't change your own role."
                      : form.role === "admin" && editing.role !== "admin"
                        ? "Admins get full access to every record in Haven."
                        : undefined
                  }
                >
                  <Select
                    value={form.role}
                    disabled={isMe}
                    onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                    options={ROLES.map((r) => ({ value: r, label: r }))}
                  />
                </Field>
                {editing.role === "agency" && (
                  <div className="grid grid-cols-2 gap-4 rounded-xl bg-cream p-4 text-[13px]">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.1em] text-muted">Agency</p>
                      <p className="mt-0.5 break-words text-ink">{editing.agencyId ? agencyName.get(editing.agencyId) ?? "Unknown" : "—"}</p>
                      {editing.agencyId && <p className="break-all text-[11px] text-muted">{editing.agencyId}</p>}
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.1em] text-muted">Staff role</p>
                      <p className="mt-0.5 capitalize text-ink">{editing.staffRole ?? "—"}</p>
                    </div>
                  </div>
                )}
                <div className="rounded-xl border border-line p-4">
                  <Toggle
                    checked={form.isActive}
                    disabled={isMe}
                    onChange={(v) => setForm({ ...form, isActive: v })}
                    label="Account active"
                    description="Inactive users are signed out of the app and can't sign back in."
                  />
                </div>
              </div>
            </Section>

            <p className="text-[11px] text-muted">
              UID {editing.id} · joined {fmtDate(editing.createdAt)}
            </p>
          </>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title="Delete this user?"
        message={
          <>
            <strong className="text-ink">{deleting?.name || deleting?.email}</strong> will be removed from Haven. Any agency they own stays in the
            records. Their sign-in account is removed too when server credentials are configured. This can&apos;t be undone.
          </>
        }
      />
    </>
  );
}
