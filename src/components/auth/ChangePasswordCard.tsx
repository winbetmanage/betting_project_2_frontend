"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared change-password form for the agent dashboard, user profile and
 * sub-admin profile. Asks for the current password, a new password and a
 * confirmation, then calls POST /auth/change-password (which verifies the
 * old password server-side). `variant="dark"` matches the forced-dark user
 * pages; the default theme-aware card fits agent/sub-admin consoles.
 */
export function ChangePasswordCard({ variant = "card" }: { variant?: "card" | "dark" }) {
  const t = useTranslations("password");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);

  const dark = variant === "dark";

  const save = async () => {
    if (!current || !next || !confirm) {
      toast.error(t("fillAll"));
      return;
    }
    if (next.length < 6) {
      toast.error(t("tooShort"));
      return;
    }
    if (next !== confirm) {
      toast.error(t("mismatch"));
      return;
    }
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    try {
      await api.post("/auth/change-password", { currentPassword: current, newPassword: next }, token);
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success(t("success"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("failed"));
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: "current" as const, label: t("currentPassword"), value: current, set: setCurrent },
    { key: "next" as const, label: t("newPassword"), value: next, set: setNext },
    { key: "confirm" as const, label: t("confirmPassword"), value: confirm, set: setConfirm },
  ];

  const form = (
    <div className="grid gap-3 sm:grid-cols-3">
      {fields.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label>{f.label}</Label>
          <div className="relative">
            <Input
              type={show[f.key] ? "text" : "password"}
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              autoComplete="off"
              className={cn(dark && "bg-white/5 pr-10", !dark && "pr-10")}
            />
            <button
              type="button"
              onClick={() => setShow((s) => ({ ...s, [f.key]: !s[f.key] }))}
              aria-label={show[f.key] ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show[f.key] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const submit = (
    <Button onClick={save} disabled={saving} className={cn(!dark && "bg-primary")}>
      {saving ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
      {saving ? t("changing") : t("changePassword")}
    </Button>
  );

  if (dark) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <KeyRound className="size-4 text-secondary" /> {t("title")}
        </div>
        <p className="mt-1 text-xs text-white/50">{t("description")}</p>
        <div className="mt-3">{form}</div>
        <div className="mt-3">{submit}</div>
      </div>
    );
  }

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-5 text-primary" /> {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {form}
        {submit}
      </CardContent>
    </Card>
  );
}

export default ChangePasswordCard;
