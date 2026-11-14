"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useCollection } from "@/hooks/useCollection";
import { deleteUserEverywhere, updateUser } from "@/lib/actions";
import { errMsg, fmtDate, matches } from "@/lib/format";
import { ROLES, type AppUser, type Role } from "@/lib/types";
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
  Toggle,
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
      setEditing(null);
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
      setEditing(null);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Users" subtitle="Everyone who has joined Haven — customers, bouncers and admins." />
      <ErrorNote error={error} />
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <FilterPills value={filter} onChange={setFilter} options={ROLES} counts={counts} />
          <SearchBox value={q} onChange={setQ} placeholder="Search name, email or phone" />
        </div>
        {loading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty title="No users found" hint="Try a different filter or search." />
        ) : (
          <Table head={["User", "Phone", "Role", "Status", "Joined", ""]}>
            {rows.map((u) => (
              <tr key={u.id} className="cursor-pointer hover:bg-cream/60" onClick={() => open(u)}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} url={u.photoUrl} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">
                        {u.name || "Unnamed"} {u.id === me && <span className="text-xs font-normal text-muted">(you)</span>}
                      </p>
                      <p className="truncate text-xs text-muted">{u.email}</p>
                    </div>
                  </div>
                </Td>
                <Td className="text-muted">{u.phone || "—"}</Td>
                <Td>
                  <Badge value={u.role} />
                </Td>
                <Td>
                  <button onClick={(e) => (e.stopPropagation(), toggleActive(u))} title="Toggle access">
                    <Badge value={u.isActive === false ? "inactive" : "active"} />
                  </button>
                </Td>
                <Td className="text-muted">{fmtDate(u.createdAt)}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => open(u)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(u)} aria-label="Delete" disabled={u.id === me}>
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
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit user"
        footer={
          <>
            {editing && editing.id !== me && (
              <Button variant="ghost" className="mr-auto text-rose hover:bg-rose-soft hover:text-rose" onClick={() => setDeleting(editing)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              Save changes
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-cream p-4">
              <Avatar name={form.name} url={editing.photoUrl} size={48} />
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{editing.email}</p>
                <p className="truncate text-xs text-muted">UID {editing.id}</p>
              </div>
            </div>
            <Field label="Full name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field
              label="Role"
              hint={form.role === "admin" && editing.role !== "admin" ? "Admins get full access to every record in Haven." : undefined}
            >
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} options={ROLES.map((r) => ({ value: r, label: r }))} />
            </Field>
            <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="Account active (can sign in to the app)" />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title="Delete this user?"
        message={
          <>
            <strong className="text-ink">{deleting?.name || deleting?.email}</strong> will be removed from Haven, including their bouncer profile if
            they have one. Their sign-in account is removed too when server credentials are configured. This can&apos;t be undone.
          </>
        }
      />
    </>
  );
}
