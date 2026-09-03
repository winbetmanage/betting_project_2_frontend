"use client";

import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { api } from "@/lib/api";
import { getAccessToken, type AuthUser } from "@/lib/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, User as UserIcon, Mail, Calendar, KeyRound, Save, Loader2, Crown } from "lucide-react";

const profileSchema = z.object({
  name: z.string().max(100).optional().or(z.literal("")),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm the new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Profile edit
  const [name, setName] = useState("");
  const [nameErrors, setNameErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    const t = getAccessToken();
    setToken(t);
    setLoading(true);
    api
      .get<{ data: AuthUser }>("/users/me", t)
      .then((res) => {
        setProfile(res.data);
        setName(res.data.name ?? "");
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = profileSchema.safeParse({ name });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const iss of parsed.error.issues) {
        const k = iss.path[0] as string;
        if (!errs[k]) errs[k] = iss.message;
      }
      setNameErrors(errs);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSavingProfile(true);
    try {
      const t = getAccessToken() ?? token;
      await api.patch("/users/me", { name: name.trim() || null }, t);
      const res = await api.get<{ data: AuthUser }>("/users/me", t);
      setProfile(res.data);
      setName(res.data.name ?? "");
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = passwordSchema.safeParse(pw);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const iss of parsed.error.issues) {
        const k = iss.path[0] as string;
        if (!errs[k]) errs[k] = iss.message;
      }
      setPwErrors(errs);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSavingPw(true);
    try {
      const t = getAccessToken() ?? token;
      await api.post("/auth/change-password", { currentPassword: pw.currentPassword, newPassword: pw.newPassword }, t);
      toast.success("Password changed — you will be signed out of other sessions");
      setPw({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPwErrors({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSavingPw(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const initial = profile?.name?.[0]?.toUpperCase() ?? profile?.email?.[0]?.toUpperCase() ?? "A";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="size-3.5" /> Admin Profile
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">My Profile</h1>
          <p className="text-sm text-muted-foreground">View and edit your admin account details, and change your password.</p>
        </div>
      </div>

      {/* Profile card */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary via-primary to-brand-dark p-0 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <CardContent className="relative flex flex-wrap items-center gap-4 p-6">
          <div className="grid size-16 place-items-center rounded-2xl bg-white/20 text-2xl font-black backdrop-blur">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold">{profile?.name || "Administrator"}</h2>
              <Badge className="bg-secondary text-white gap-1">
                <Crown className="size-3" /> {profile?.role ?? "ADMIN"}
              </Badge>
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/80">
              <Mail className="size-4" /> {profile?.email}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/70">
              <span className="flex items-center gap-1">
                <UserIcon className="size-3.5" /> Balance: ${Number(profile?.balance ?? 0).toFixed(2)}
              </span>
            </div>
          </div>
          <div className="text-right text-xs text-white/60">
            <Calendar className="inline size-3.5" /> Signed in as admin
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Edit profile */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="size-5 text-primary" /> Account Settings
            </CardTitle>
            <CardDescription>Update your display name</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className={nameErrors.name ? "border-destructive" : ""} placeholder="Your name" />
                {nameErrors.name && <p className="text-xs text-destructive">{nameErrors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={profile?.email ?? ""} disabled className="opacity-60" />
                <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
              </div>
              <Button type="submit" disabled={savingProfile} className="bg-primary gap-1">
                {savingProfile ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change password */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" /> Change Password
            </CardTitle>
            <CardDescription>You&apos;ll stay signed in on this device, other sessions are revoked.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={pw.currentPassword}
                  onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
                  className={pwErrors.currentPassword ? "border-destructive" : ""}
                />
                {pwErrors.currentPassword && <p className="text-xs text-destructive">{pwErrors.currentPassword}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={pw.newPassword}
                  onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
                  className={pwErrors.newPassword ? "border-destructive" : ""}
                />
                {pwErrors.newPassword && <p className="text-xs text-destructive">{pwErrors.newPassword}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={pw.confirmPassword}
                  onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })}
                  className={pwErrors.confirmPassword ? "border-destructive" : ""}
                />
                {pwErrors.confirmPassword && <p className="text-xs text-destructive">{pwErrors.confirmPassword}</p>}
              </div>
              <Separator />
              <Button type="submit" disabled={savingPw} className="bg-secondary text-white gap-1">
                {savingPw ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Change Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
