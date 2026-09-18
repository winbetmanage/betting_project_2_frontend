"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, RefreshCw, Gift } from "lucide-react";

const SPINNER = "/assets/custom/infinite-spinner.svg";

type AppSetting = {
  key: string;
  label: string;
  description: string;
  kind: "number" | "string" | "boolean";
  valueNumber: number | null;
  valueString: string | null;
  valueBool: boolean | null;
  updatedBy: { id: string; email: string; name: string | null } | null;
  updatedAt: string | null;
};

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: AppSetting[] }>("/settings", getAccessToken());
      const list = res.data ?? [];
      setSettings(list);
      setDrafts(Object.fromEntries(list.map((s) => [s.key, s.kind === "number" ? String(s.valueNumber ?? "") : s.valueString ?? ""])));
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (s: AppSetting) => {
    const raw = (drafts[s.key] ?? "").trim();
    if (s.kind === "number" && !(Number(raw) >= 0)) {
      toast.error(`${s.label} must be a number ≥ 0`);
      return;
    }
    setSavingKey(s.key);
    try {
      const body = s.kind === "number" ? { valueNumber: Number(raw) } : { valueString: raw };
      await api.patch(`/settings/${encodeURIComponent(s.key)}`, body, getAccessToken());
      toast.success(`${s.label} saved — applies to pending referrals immediately`);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Settings className="size-3.5" /> Settings
        </div>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Gift className="size-6 text-primary" /> Referral & App Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Operational values editable without a deploy. Changes apply to pending referrals immediately; already-credited bonuses keep their snapshotted amounts.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="size-5 text-primary" /> Values
          </CardTitle>
          <CardDescription>Numbers must be ≥ 0. Every save is audit-logged with your admin identity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {loading ? (
            <div className="grid place-items-center py-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SPINNER} alt="Loading" className="size-10" />
            </div>
          ) : settings.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No settings registered.</div>
          ) : (
            settings.map((s) => (
              <div key={s.key} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{s.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{s.description}</div>
                    <div className="mt-1 font-mono text-[11px] text-muted-foreground">{s.key}</div>
                    {s.updatedBy && (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        Last changed by {s.updatedBy.name || s.updatedBy.email}
                        {s.updatedAt ? ` • ${new Date(s.updatedAt).toLocaleString()}` : ""}
                      </div>
                    )}
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Value (ETB)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={drafts[s.key] ?? ""}
                        onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
                        className="h-9 w-36 font-mono"
                      />
                    </div>
                    <Button size="sm" onClick={() => save(s)} disabled={savingKey === s.key} className="gap-1.5 bg-primary">
                      {savingKey === s.key ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />} Save
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
