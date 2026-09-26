"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Briefcase,
  Copy,
  Check,
  Users,
  Gift,
  Clock,
  Link2,
  Mail,
  Calendar,
  TrendingUp,
  UserPlus,
  Bell,
  CircleHelp,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

type AgentProfile = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  balance: string | number;
  isActive: boolean;
  emailVerified: boolean;
  referralCode: string | null;
  second_referralCode: string | null;
  createdAt: string;
  lastLoginAt: string | null;
};

type MyReferral = {
  id: string;
  codeUsed: string;
  status: string;
  bonusAmount: string | number;
  qualifiedAt: string | null;
  rewardedAt: string | null;
  createdAt: string;
  referee: { id: string; email: string; name: string | null; isActive: boolean; createdAt: string };
};

type Note = {
  id: string;
  title: string;
  message?: string | null;
  isRead: boolean;
  createdAt: string;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function AgentDashboardPage() {
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [referrals, setReferrals] = useState<MyReferral[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refPage, setRefPage] = useState(1);
  const REF_PAGE_SIZE = 8;
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [referralLink, setReferralLink] = useState("");

  useEffect(() => {
    const t = getAccessToken();
    if (!t) return;
    setLoading(true);
    Promise.all([
      api.get<{ data: AgentProfile }>("/users/me", t).then((r) => r.data).catch(() => null),
      api.get<{ data: MyReferral[] }>("/users/me/referrals", t).then((r) => r.data ?? []).catch(() => []),
      api.get<{ data: Note[] }>("/notifications/mine?limit=6", t).then((r) => r.data ?? []).catch(() => []),
    ])
      .then(([me, refs, ns]) => {
        if (!me) {
          toast.error("Failed to load agent profile");
          return;
        }
        setProfile(me);
        setReferrals(refs);
        setNotes(ns);
        if (typeof window !== "undefined" && me.referralCode) {
          setReferralLink(`${window.location.origin}/signup?ref=${encodeURIComponent(me.referralCode)}`);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const rewarded = referrals.filter((r) => r.status === "REWARDED");
    const earned = rewarded.reduce((sum, r) => sum + Number(r.bonusAmount), 0);
    const thisWeek = referrals.filter((r) => Date.now() - new Date(r.createdAt).getTime() <= WEEK_MS).length;
    return {
      total: referrals.length,
      rewarded: rewarded.length,
      pending: referrals.length - rewarded.length,
      earned,
      thisWeek,
      conversion: referrals.length === 0 ? 0 : Math.round((rewarded.length / referrals.length) * 100),
    };
  }, [referrals]);

  const visible = useMemo(() => {
    if (!search.trim()) return referrals;
    const q = search.toLowerCase();
    return referrals.filter((r) =>
      `${r.referee.name ?? ""} ${r.referee.email} ${r.codeUsed} ${r.status}`.toLowerCase().includes(q)
    );
  }, [referrals, search]);

  const refTotalPages = Math.max(1, Math.ceil(visible.length / REF_PAGE_SIZE));
  const refSafePage = Math.min(refPage, refTotalPages);
  const refPaged = visible.slice((refSafePage - 1) * REF_PAGE_SIZE, refSafePage * REF_PAGE_SIZE);

  const statusBadge = (status: string, rewardedAt: string | null) =>
    status === "REWARDED" ? (
      <span>
        <Badge className="bg-secondary text-white">
          <Gift className="mr-1 size-3" /> Rewarded
        </Badge>
        {rewardedAt && (
          <div className="mt-1 text-[10px] text-muted-foreground">
            {new Date(rewardedAt).toLocaleDateString()}
          </div>
        )}
      </span>
    ) : (
      <Badge variant="outline" className="border-amber-500/30 text-amber-600">
        <Clock className="mr-1 size-3" /> Pending
      </Badge>
    );

  const recentSignups = useMemo(() => referrals.slice(0, 5), [referrals]);

  const copyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = referralLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast.success("Referral link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = async () => {
    if (!profile?.second_referralCode) return;
    try {
      await navigator.clipboard.writeText(profile.second_referralCode);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = profile.second_referralCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedCode(true);
    toast.success("Agent code copied");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
      </div>
    );
  }

  const tiles = [
    { icon: Users, label: "Total referred", value: String(stats.total), sub: `${stats.thisWeek} new this week`, bg: "bg-primary/15 text-primary" },
    { icon: TrendingUp, label: "Conversion", value: `${stats.conversion}%`, sub: "referred → rewarded", bg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    { icon: Clock, label: "Awaiting deposit", value: String(stats.pending), sub: "pending referrals", bg: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
          <Briefcase className="size-3.5" /> Agent Dashboard
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Welcome{profile?.name ? `, ${profile.name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Share your referral link and track who registered with it.
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.label} className="border-border bg-card shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${t.bg}`}>
                <t.icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-lg font-bold leading-tight">{t.value}</span>
                <span className="block text-xs font-medium">{t.label}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{t.sub}</span>
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Referral section */}
      <div id="referral-link" className="scroll-mt-20">
        <Card className="border-border bg-card shadow-sm h-full">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="size-5 text-primary" /> My Referral Link
            </CardTitle>
            <CardDescription>Send this to people — anyone who registers with it is counted as your referral</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            <div className="space-y-1.5">
              <Label>Referral link</Label>
              <div className="flex gap-2">
                <Input value={referralLink || "No referral code on this account"} readOnly className="font-mono text-xs" />
                <Button onClick={copyLink} disabled={!referralLink} className="shrink-0 bg-primary">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-center">
              <div className="text-[11px] font-semibold tracking-widest text-amber-600 dark:text-amber-400">
                MY AGENT CODE — users type this on signup
              </div>
              <div className="mt-1 font-mono text-3xl font-black tracking-wider">
                {profile?.second_referralCode ?? "—"}
              </div>
              <Button
                onClick={copyCode}
                disabled={!profile?.second_referralCode}
                size="sm"
                className="mt-2 bg-amber-500 hover:bg-amber-500/90 text-white"
              >
                {copiedCode ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copiedCode ? "Copied" : "Copy code"}
              </Button>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <UserPlus className="size-4 text-primary" /> Recent signups
              </div>
              {recentSignups.length === 0 ? (
                <p className="text-xs text-muted-foreground">No one has registered with your link yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {recentSignups.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 py-1.5 text-xs">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-bold">
                        {(r.referee.name ?? r.referee.email)[0]?.toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{r.referee.name || r.referee.email}</span>
                      <span className="shrink-0 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                      {r.status === "REWARDED" ? (
                        <Badge className="bg-secondary text-white text-[10px]">Rewarded</Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-500/30 text-amber-600 text-[10px]">Pending</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity — latest 10 */}
      <div id="activity" className="scroll-mt-20">
        <Card className="border-border bg-card shadow-sm h-full">
          <CardHeader className="border-b border-border">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="size-5 text-primary" /> Recent Activity
              </CardTitle>
              <Link href="/agent/activity">
                <Button variant="outline" size="sm" className="h-8">
                  Show more <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </div>
            <CardDescription>Latest notifications on your account</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {notes.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No activity yet.</div>
            ) : (
              <div className="divide-y divide-border">
                {notes.slice(0, 10).map((n) => (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-2.5">
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.isRead ? "bg-muted-foreground/30" : "bg-secondary"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{n.title}</div>
                      {n.message && <div className="truncate text-xs text-muted-foreground">{n.message}</div>}
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>

      {/* My Profile */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="grid size-9 place-items-center rounded-full bg-amber-500 text-sm font-bold text-white">
              {profile?.name?.[0]?.toUpperCase() ?? profile?.email?.[0]?.toUpperCase() ?? "A"}
            </span>
            My Profile
            <Badge className="ml-1 bg-amber-500 text-white">{profile?.role}</Badge>
          </CardTitle>
          <CardDescription>Your agent account details</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 p-4 text-sm sm:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground">Name</div>
            <div className="font-medium">{profile?.name || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Email</div>
            <div className="flex items-center gap-1 font-medium">
              <Mail className="size-3 text-muted-foreground" /> {profile?.email}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Status</div>
            <Badge className={profile?.isActive ? "bg-secondary text-white" : "bg-destructive/10 text-destructive"}>
              {profile?.isActive ? "Active" : "Inactive"}
            </Badge>
            {profile?.emailVerified && <Badge variant="outline" className="ml-1 text-[10px]">Verified</Badge>}
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Member since</div>
            <div className="flex items-center gap-1 text-xs">
              <Calendar className="size-3 text-muted-foreground" />{" "}
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Last login</div>
            <div className="text-xs">
              {profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">My referral code</div>
            <div className="font-mono text-xs font-semibold">{profile?.referralCode ?? "—"}</div>
          </div>
        </CardContent>
      </Card>

      {/* Referred users */}
      <div id="referred-users" className="scroll-mt-20">
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-5 text-primary" /> Users Referred By Me
            <Badge variant="secondary" className="ml-2 bg-primary/15 text-primary border-primary/20">
              {visible.length}
            </Badge>
          </CardTitle>
          <CardDescription>Everyone who registered with your referral link, and their status</CardDescription>
          <div className="mt-3 max-w-sm">
            <Input
              placeholder="Search name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setRefPage(1); }}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="mx-auto size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">No referrals yet</p>
              <p className="text-xs text-muted-foreground">Share your referral link above to get started</p>
            </div>
          ) : (
            <>
              {/* Desktop table — striped, no horizontal scroll */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader className="bg-primary">
                    <TableRow className="hover:bg-primary border-primary">
                      <TableHead className="text-white text-xs tracking-widest">USER</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">REGISTERED</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">STATUS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refPaged.map((r, i) => (
                      <TableRow key={r.id} className={`border-border hover:bg-muted/50 ${i % 2 === 1 ? "bg-muted/40" : ""}`}>
                        <TableCell>
                          <div className="font-medium text-sm">{r.referee.name || "—"}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="size-3" /> {r.referee.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">{new Date(r.createdAt).toLocaleDateString()}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(r.createdAt).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>{statusBadge(r.status, r.rewardedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards — stacked lines, never scrolls sideways */}
              <div className="space-y-2 p-3 md:hidden">
                {refPaged.map((r, i) => (
                  <div key={r.id} className={`rounded-xl border border-border p-3 ${i % 2 === 1 ? "bg-muted/40" : "bg-card"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-sm">{r.referee.name || "—"}</div>
                        <div className="truncate text-xs text-muted-foreground">{r.referee.email}</div>
                      </div>
                      {statusBadge(r.status, r.rewardedAt)}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-1 border-t border-border pt-2 text-xs">
                      <span className="text-muted-foreground">
                        Joined {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                <span>
                  Showing {visible.length === 0 ? 0 : (refSafePage - 1) * REF_PAGE_SIZE + 1}–{Math.min(refSafePage * REF_PAGE_SIZE, visible.length)} of {visible.length}
                </span>
                <span className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={refSafePage <= 1} onClick={() => setRefPage(refSafePage - 1)}>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="px-1">{refSafePage} / {refTotalPages}</span>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={refSafePage >= refTotalPages} onClick={() => setRefPage(refSafePage + 1)}>
                    <ChevronRight className="size-4" />
                  </Button>
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      </div>

      {/* How referrals work */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CircleHelp className="size-5 text-primary" /> How referrals work
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          {[
            { step: "1", title: "Share your link", desc: "Send your referral link to friends, groups or followers." },
            { step: "2", title: "They register", desc: "Anyone who signs up with your link is counted as your referral." },
            { step: "3", title: "Track signups", desc: "Watch who joined and qualified from the table above. Bonus rewards are currently paused." },
          ].map((s) => (
            <div key={s.step} className="rounded-xl border border-border p-3">
              <span className="grid size-7 place-items-center rounded-lg bg-primary/15 text-sm font-bold text-primary">{s.step}</span>
              <div className="mt-2 text-sm font-semibold">{s.title}</div>
              <div className="text-xs text-muted-foreground">{s.desc}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
