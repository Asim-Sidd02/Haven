"use client";

import { useState } from "react";
import { AlertTriangle, Pencil, ShieldCheck } from "lucide-react";
import { useActor } from "@/lib/useActor";
import { useData } from "@/components/DataProvider";
import { patch } from "@/lib/actions";
import { fmtMoney, splitList } from "@/lib/format";
import { Badge, Button, Callout, Card, Drawer, Field, Input, PageHeader, Switch, Textarea, cx } from "@/components/ui";
import { SERVICES, type Service, type ServiceKey } from "@/lib/types";

const blank = (): Service => ({ enabled: false, description: "", hourlyRate: 0, minHours: 4, requirements: "", locations: [] });

export default function ServicesPage() {
  const { agency, run } = useActor();
  const { settings } = useData();
  const [edit, setEdit] = useState<ServiceKey | null>(null);
  const svc = (k: ServiceKey) => ({ ...blank(), ...(agency.services?.[k] ?? {}) });
  const enabledCount = SERVICES.filter((s) => agency.services?.[s.key]?.enabled).length;

  const toggle = (k: ServiceKey, on: boolean) => {
    const s = svc(k);
    if (on && !s.hourlyRate) { setEdit(k); return; } // set a price before going live
    run(() => patch("agencies", agency.id, { [`services.${k}`]: { ...s, enabled: on } }), on ? `${SERVICES.find((x) => x.key === k)?.label} is now offered` : "Service turned off", [on ? "Enabled service" : "Disabled service", k]);
  };

  return (
    <>
      <PageHeader title="Services & pricing" desc={`Choose what you offer and set your rates. Clients see the per-person hourly rate. ${enabledCount} of ${SERVICES.length} services on.`} />
      <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SERVICES.map(({ key, label, hint, licensed }) => {
          const s = svc(key);
          return (
            <Card key={key} className={cx("flex flex-col p-5 transition", s.enabled ? "border-ink/30" : "")}>
              <div className="flex items-start justify-between gap-3">
                <span className={cx("grid h-10 w-10 place-items-center rounded-lg transition", s.enabled ? "bg-ink text-white" : "bg-wash text-muted")}><ShieldCheck className="h-5 w-5" /></span>
                <Switch label={`Offer ${label}`} checked={s.enabled} onChange={(v) => toggle(key, v)} />
              </div>
              <h3 className="mt-4 font-semibold text-ink">{label}</h3>
              <p className="mt-1 text-[13px] text-muted">{s.description || hint}</p>
              {licensed && <Badge tone="outline" className="mt-3 w-fit"><AlertTriangle className="h-3 w-3" />Licence required</Badge>}
              <div className="mt-auto flex items-end justify-between pt-5">
                <div>{s.hourlyRate ? <><p className="tnum text-lg font-semibold text-ink">{fmtMoney(s.hourlyRate, settings.currency)}<span className="text-sm font-normal text-muted">/h per person</span></p><p className="text-xs text-muted">Min {s.minHours}h{s.locations.length ? ` · ${s.locations.join(", ")}` : ""}</p></>
                  : <p className="text-sm text-muted">No price set</p>}</div>
                <Button size="sm" variant="ghost" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEdit(key)}>Edit</Button>
              </div>
            </Card>
          );
        })}
      </div>
      {edit && <EditService k={edit} initial={svc(edit)} onClose={() => setEdit(null)} />}
    </>
  );
}

function EditService({ k, initial, onClose }: { k: ServiceKey; initial: Service; onClose: () => void }) {
  const { agency, run } = useActor();
  const meta = SERVICES.find((s) => s.key === k)!;
  const [s, setS] = useState({ ...initial, locations: initial.locations.join(", ") });
  const [busy, setBusy] = useState(false);
  const invalid = !(Number(s.hourlyRate) > 0) || !(Number(s.minHours) >= 1);
  const save = async (enable: boolean) => {
    setBusy(true);
    const ok = await run(() => patch("agencies", agency.id, {
      [`services.${k}`]: { ...s, hourlyRate: Number(s.hourlyRate), minHours: Number(s.minHours), locations: splitList(s.locations), enabled: enable || s.enabled },
    }), "Service saved", ["Updated service", meta.label]);
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Drawer open onClose={onClose} title={meta.label} subtitle={meta.hint}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button>
        {!s.enabled && <Button disabled={invalid} loading={busy} onClick={() => save(false)}>Save</Button>}
        <Button variant="primary" disabled={invalid} loading={busy} onClick={() => save(true)}>{s.enabled ? "Save" : "Save & offer"}</Button></>}>
      <div className="space-y-4">
        {meta.licensed && <Callout tone="warn" title="Only offer this if you hold the required licences">Armed personnel must carry valid arms licences and authorisations, uploaded under Verification.</Callout>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hourly rate per person" required><Input type="number" min={0} value={s.hourlyRate || ""} onChange={(e) => setS({ ...s, hourlyRate: Number(e.target.value) })} /></Field>
          <Field label="Minimum booking (hours)" required><Input type="number" min={1} value={s.minHours} onChange={(e) => setS({ ...s, minHours: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Description" hint="Shown to clients"><Textarea value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} placeholder={meta.hint} /></Field>
        <Field label="Requirements" hint="What clients should know"><Textarea className="min-h-[72px]" value={s.requirements} onChange={(e) => setS({ ...s, requirements: e.target.value })} placeholder="e.g. Book at least 24 hours ahead. Meals provided by client for shifts over 8 hours." /></Field>
        <Field label="Service locations" hint="Comma separated; empty = all your areas"><Input value={s.locations} onChange={(e) => setS({ ...s, locations: e.target.value })} /></Field>
      </div>
    </Drawer>
  );
}
