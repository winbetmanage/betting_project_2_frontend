"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken, getUser } from "@/lib/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Wallet, Calendar, Clock, ShieldCheck, Save, RefreshCw, Copy, Check, KeyRound } from "lucide-react";
import { displayRole } from "@/lib/roles";

const SPINNER = "/assets/custom/infinite-spinner.svg";

type Profile = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  balance: string | number;
  heldBalance?: string | number | null;
  emailVerified: boolean;
  referralCode: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  _count?: { bets: number; transactions: number };
};

export default function SubadminProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cacheUser, setCacheUser] = useState(getUser());

  const load = async () => {
    const t = getAccessToken();
    if (!t) return;
    setLoading(true);
    try {
      const res = await api.get<{ data: Profile }>("/users/me", t);
      setProfile(res.data);
      setName(res.data.name ?? "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load your profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveName = async () => {
    const t = getAccessToken();
    if (!t) return;
    setSaving(true);
    try {
      const res = await api.patch<{ data: Profile }>("/users/me", { name }, t);
      setProfile(res.data);
      // Keep the cached session in step so the sidebar/header shows the new name.
      const current = getUser();
      if (current) {
        const next = { ...current, name: res.data.name };
        window.localStorage.setItem("user", JSON.stringify(next));
        setCacheUser(next);
      }
      toast.success("Name updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const copyCode = async () => {
    if (!profile?.referralCode) return;
    try {
      await navigator.clipboard.writeText(profile.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SPINNER} alt="Loading" className="size-10" />
      </div>
    );
  }

  if (!profile) {
    return <p className="text-sm text-muted-foreground">Could not load your profile.</p>;
  }

  const held = Number(profile.heldBalance ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <ShieldCheck className="size-3.5" /> My account
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground">Your sub-admin account details.</p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div className="grid size-16 place-items-center rounded-full bg-sky-500 text-xl font-bold text-white">
            {(profile.name ?? cacheUser?.name)?.trim()?.[0]?.toUpperCase() ?? profile.email[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">{profile.name || "—"}</h2>
              <Badge className="bg-sky-500 text-white">{displayRole(profile.role)}</Badge>
            </div>
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Mail className="size-3.5" /> {profile.email}
            </div>
            <div className="mt-0.5 font-mono text-xs text-muted-foreground">{profile.id}</div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 font-mono text-xl font-bold">
              <Wallet className="size-4 text-muted-foreground" /> ETB {Number(profile.balance).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">ETB {held.toFixed(2)} held</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-5 text-primary" /> Details
            </CardTitle>
            <CardDescription>Your name is the only field you can change yourself.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs text-muted-foreground">
                Display name
              </Label>
              <div className="flex gap-2">
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
                <Button size="sm" onClick={saveName} disabled={saving || name === (profile.name ?? "")} className="gap-1.5">
                  {saving ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />} Save
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="text-xs">{profile.email}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Email verified</div>
                <div className="text-xs">{profile.emailVerified ? "Yes" : "No"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Account type</div>
                <div className="text-xs">{displayRole(profile.role)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Joined</div>
                <div className="flex items-center gap-1 text-xs">
                  <Calendar className="size-3 text-muted-foreground" /> {new Date(profile.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Last login</div>
                <div className="flex items-center gap-1 text-xs">
                  <Clock className="size-3 text-muted-foreground" />
                  {profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Permissions</div>
                <div className="text-xs">Money management + read-only people oversight</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-5 text-primary" /> Your referral code
            </CardTitle>
            <CardDescription>Only relevant if you also refer players.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 font-mono text-sm">
                {profile.referralCode ?? "—"}
              </code>
              <Button size="sm" variant="outline" onClick={copyCode} disabled={!profile.referralCode} aria-label="Copy code">
                {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">What this account can do</p>
              <ul className="mt-1.5 space-y-1">
                <li>• Approve or reject deposits and withdrawals</li>
                <li>• Manage the bank transfer accounts shown to players</li>
                <li>• View players and agents, and their betting history</li>
                <li>• Cannot change roles, balances, games or settings</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
