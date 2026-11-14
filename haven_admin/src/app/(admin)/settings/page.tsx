"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { saveSettings } from "@/lib/actions";
import { errMsg } from "@/lib/format";
import type { AppSettings } from "@/lib/types";
import { Button, Card, Field, Input, Loading, PageHeader } from "@/components/ui";
import { useToast } from "@/components/Toast";

export default function SettingsPage() {
  const toast = useToast();
  const { settings, loading, exists } = useSettings();
  const [form, setForm] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && form === null) setForm(settings);
  }, [loading, settings, form]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      await saveSettings({
        currency: form.currency.trim().toUpperCase() || "PKR",
        commissionPercent: Math.min(100, Math.max(0, Number(form.commissionPercent) || 0)),
        supportEmail: form.supportEmail.trim(),
        supportPhone: form.supportPhone.trim(),
      });
      toast("Settings saved. The app will pick them up right away.");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="App-wide values shared with the Haven mobile app." />
      {loading || !form ? (
        <Loading />
      ) : (
        <Card className="max-w-2xl p-6">
          {!exists && (
            <p className="mb-5 rounded-xl bg-sand-soft px-4 py-3 text-sm text-[#8a6b4f]">
              No settings saved yet. These are the defaults; save once to create <code>settings/app</code>.
            </p>
          )}
          <form onSubmit={save} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Currency code" hint="ISO code, e.g. PKR, USD, AED">
              <Input value={form.currency} maxLength={3} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </Field>
            <Field label="Commission (%)" hint="Informational, shown to bouncers">
              <Input
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={form.commissionPercent}
                onChange={(e) => setForm({ ...form, commissionPercent: Number(e.target.value) })}
              />
            </Field>
            <Field label="Support email">
              <Input type="email" value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} />
            </Field>
            <Field label="Support phone">
              <Input value={form.supportPhone} onChange={(e) => setForm({ ...form, supportPhone: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" loading={saving}>
                Save settings
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}
