"use client";

import { useState } from "react";
import { Mail, UserPlus, X } from "lucide-react";
import { serverTimestamp } from "firebase/firestore";
import { useData } from "@/components/DataProvider";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, PageHeader, Select, Table, Td, Th, Tr, useConfirm, cx } from "@/components/ui";
import { useActor } from "@/lib/useActor";
import { patch, put, remove } from "@/lib/actions";
import { ago, fmtDate } from "@/lib/format";
import { STAFF_ROLES, type StaffRole } from "@/lib/types";

const MODULES: [string, StaffRole[]][] = [
  ["Bookings & assignments", ["owner", "manager", "bookings"]], ["Personnel & documents", ["owner", "manager", "hr"]],
  ["Attendance", ["owner", "manager", "hr", "bookings"]], ["Payroll", ["owner", "manager", "finance", "hr"]],
  ["Payments & reports", ["owner", "manager", "finance"]], ["Profile, services, staff", ["owner", "manager"]], ["Bank details", ["owner", "manager", "finance"]],
];

export default function StaffPage() {
  const { staff, invites, activity } = useData();
  const { agency, profile, run } = useActor();
  const confirm = useConfirm();
  const [invite, setInvite] = useState(false);

  return (
    <>
      <PageHeader title="Staff & roles" desc="Give your office team their own logins. Each role only sees what it needs, which keeps personal and financial data safe."
        actions={<Button variant="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setInvite(true)}>Invite staff</Button>} />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title={`Team (${staff.length})`} />
            <Table>
              <thead><tr><Th>Member</Th><Th>Role</Th><Th>Status</Th><Th /></tr></thead>
              <tbody>{staff.map((u) => {
                const self = u.id === profile.id, owner = u.staffRole === "owner";
                return (
                  <Tr key={u.id}>
                    <Td><div className="flex items-center gap-3"><Avatar name={u.name} url={u.photoUrl} size={32} /><div><p className="font-medium text-ink">{u.name}{self && <span className="text-muted"> (you)</span>}</p><p className="text-xs text-muted">{u.email}</p></div></div></Td>
                    <Td>{owner || self ? <Badge tone="dark" className="capitalize">{u.staffRole}</Badge> : (
                      <div className="w-36"><Select value={u.staffRole ?? "manager"} aria-label="Role" onChange={(e) => run(() => patch("users", u.id, { staffRole: e.target.value }, false), `${u.name} is now ${e.target.value}`, ["Changed staff role", `${u.name} → ${e.target.value}`])}>
                        {STAFF_ROLES.filter((r) => r.key !== "owner").map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                      </Select></div>)}</Td>
                    <Td>{u.isActive ? <Badge tone="solid" dot>Active</Badge> : <Badge tone="dashed">Deactivated</Badge>}</Td>
                    <Td className="text-right">{!owner && !self && (u.isActive
                      ? <Button size="sm" variant="ghost" onClick={async () => { const r = await confirm({ title: `Deactivate ${u.name}?`, desc: "They’ll be signed out and can’t log in until reactivated.", confirm: "Deactivate", danger: true }); if (r.ok) run(() => patch("users", u.id, { isActive: false }, false), "Access removed", ["Deactivated staff", u.name]); }}>Deactivate</Button>
                      : <Button size="sm" onClick={() => run(() => patch("users", u.id, { isActive: true }, false), "Access restored", ["Reactivated staff", u.name])}>Reactivate</Button>)}</Td>
                  </Tr>
                );
              })}</tbody>
            </Table>
          </Card>

          {invites.length > 0 && (
            <Card>
              <CardHeader title="Pending invitations" desc="They join by registering on this dashboard with the invited email." />
              <ul className="divide-y divide-line">{invites.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-wash"><Mail className="h-4 w-4 text-muted" /></span>
                  <div className="flex-1"><p className="text-sm font-medium text-ink">{i.name || i.id}</p><p className="text-xs text-muted">{i.id} · {i.staffRole} · invited {fmtDate(i.createdAt)}</p></div>
                  <Button size="sm" variant="ghost" icon={<X className="h-3.5 w-3.5" />} onClick={() => run(() => remove("invites", i.id), "Invitation withdrawn")}>Withdraw</Button>
                </li>
              ))}</ul>
            </Card>
          )}

          <Card>
            <CardHeader title="Staff activity" desc="Every change made in this dashboard, by whom" />
            {!activity.length ? <EmptyState title="No activity yet" /> : (
              <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">{activity.slice(0, 50).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm"><span className="min-w-0 truncate"><b className="font-medium text-ink">{a.actorName}</b> {a.action.toLowerCase()}{a.target && <span className="text-muted"> · {a.target}</span>}</span><span className="shrink-0 text-xs text-faint">{ago(a.createdAt)}</span></li>
              ))}</ul>
            )}
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader title="What each role can access" />
          <div className="overflow-x-auto p-2">
            <table className="w-full text-sm">
              <thead><tr><th className="px-3 py-2 text-left text-xs font-medium text-muted">Area</th>{STAFF_ROLES.map((r) => <th key={r.key} className="px-1 py-2 text-center text-xs font-medium text-muted">{r.label}</th>)}</tr></thead>
              <tbody>{MODULES.map(([m, roles]) => (
                <tr key={m} className="border-t border-line"><td className="px-3 py-2.5 text-body">{m}</td>
                  {STAFF_ROLES.map((r) => <td key={r.key} className="text-center"><span className={cx("inline-block h-2.5 w-2.5 rounded-full", roles.includes(r.key) ? "bg-ink" : "border border-line-2")} aria-label={roles.includes(r.key) ? "Yes" : "No"} /></td>)}</tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      </div>

      <InviteModal open={invite} onClose={() => setInvite(false)} agencyId={agency.id} agencyName={agency.name} />
    </>
  );
}

function InviteModal({ open, onClose, agencyId, agencyName }: { open: boolean; onClose: () => void; agencyId: string; agencyName: string }) {
  const { run, profile } = useActor();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRole>("bookings");
  const valid = /^\S+@\S+\.\S+$/.test(email);
  return (
    <Modal open={open} onClose={onClose} title="Invite a staff member" desc="Share the dashboard link with them. They register with this email and join your agency automatically."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!valid} onClick={async () => {
        const ok = await run(() => put("invites", email.trim().toLowerCase(), { agencyId, agencyName, staffRole: role, name: name.trim(), invitedBy: profile.name, createdAt: serverTimestamp() }), `Invitation created for ${email}`, ["Invited staff", `${email} as ${role}`]);
        if (ok) { setEmail(""); setName(""); onClose(); }
      }}>Create invitation</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email" required><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-[13px] font-medium text-ink">Role</legend>
          {STAFF_ROLES.filter((r) => r.key !== "owner").map((r) => (
            <label key={r.key} className={cx("flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition", role === r.key ? "border-ink bg-wash" : "border-line hover:border-line-2")}>
              <input type="radio" name="role" checked={role === r.key} onChange={() => setRole(r.key)} className="mt-0.5 accent-ink" />
              <div><p className="text-sm font-medium text-ink">{r.label}</p><p className="text-xs text-muted">{r.desc}</p></div>
            </label>
          ))}
        </fieldset>
      </div>
    </Modal>
  );
}
