"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, RefreshCw, Gift, ShieldAlert } from "lucide-react";

const SPINNER = "/assets/custom/infinite-spinner.svg";

type AppSetting = {
  key: string;
  label: string;
  description: string;
  kind: "number" | "string" | "boolean";
  group: string;
  unit: string | null;
  /** Value in effect while nothing has been saved for this key yet. */
  defaultValue: number | boolean | null;
  valueNumber: number | null;
  valueString: string | null;
  valueBool: boolean | null;
  updatedBy: { id: string; email: string; name: string | null } | null;
  updatedAt: string | null;
};

const GROUP_ORDER = ["Referral", "Betting", "Deposit", "Registration", "Authentication"];

const groupSettings = (list: AppSetting[]) => {
  const groups = new Map<string, AppSetting[]>();
  for (const s of list) {
    const name = s.group || s.key.split(".")[0] || "Other";
    const bucket = groups.get(name) ?? [];
    bucket.push(s);
    groups.set(name, bucket);
  }
  return Array.from(groups.entries()).sort(
    (a, b) => (GROUP_ORDER.indexOf(a[0]) + 1 || 99) - (GROUP_ORDER.indexOf(b[0]) + 1 || 99)
  );
};

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [boolDrafts, setBoolDrafts] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: AppSetting[] }>("/settings", getAccessToken());
      const list = res.data ?? [];
      setSettings(list);
      // Fall back to the server-side default so a never-saved setting shows what
      // is actually in effect (e.g. auth lockout is on until switched off).
      setDrafts(
        Object.fromEntries(
          list.map((s) => [s.key, s.kind === "number" ? String(s.valueNumber ?? s.defaultValue ?? "") : s.valueString ?? ""])
        )
      );
      setBoolDrafts(
        Object.fromEntries(
          list.filter((s) => s.kind === "boolean").map((s) => [s.key, (s.valueBool ?? s.defaultValue ?? false) as boolean])
        )
      );
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
      const body =
        s.kind === "number"
          ? { valueNumber: Number(raw) }
          : s.kind === "boolean"
            ? { valueBool: !!boolDrafts[s.key] }
            : { valueString: raw };
      await api.patch(`/settings/${encodeURIComponent(s.key)}`, body, getAccessToken());
      toast.success(`${s.label} saved`);
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
          <Gift className="size-6 text-primary" /> General & App Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Operational values editable without a deploy. Changes take effect immediately; already-credited referral bonuses keep their snapshotted amounts.
        </p>
      </div>

      {loading ? (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="grid place-items-center py-14">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SPINNER} alt="Loading" className="size-10" />
          </CardContent>
        </Card>
      ) : settings.length === 0 ? (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">No settings registered.</CardContent>
        </Card>
      ) : (
        groupSettings(settings).map(([group, items]) => (
          <Card key={group} className="border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-base">
                {group === "Authentication" ? <ShieldAlert className="size-5 text-primary" /> : <Settings className="size-5 text-primary" />}
                {group}
              </CardTitle>
              <CardDescription>Every save is audit-logged with your admin identity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {items.map((s) => (
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
                      {s.kind === "boolean" ? (
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={!!boolDrafts[s.key]}
                            onCheckedChange={(v) => setBoolDrafts((d) => ({ ...d, [s.key]: v }))}
                          />
                          <span className="text-sm font-medium">{boolDrafts[s.key] ? "Enabled" : "Disabled"}</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Value{s.unit ? ` (${s.unit})` : ""}
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step={s.unit === "ETB" ? "0.01" : "1"}
                            value={drafts[s.key] ?? ""}
                            onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
                            className="h-9 w-36 font-mono"
                          />
                        </div>
                      )}
                      <Button size="sm" onClick={() => save(s)} disabled={savingKey === s.key} className="gap-1.5 bg-primary">
                        {savingKey === s.key ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />} Save
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
