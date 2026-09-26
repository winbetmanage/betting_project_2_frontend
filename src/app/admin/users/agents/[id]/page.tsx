"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getAccessToken, getUser } from "@/lib/auth";
import { displayRole } from "@/lib/roles";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Briefcase, Users, Mail, Calendar, Wallet, TrendingUp, Clock, Gift, Link2, Search, ChevronLeft, ChevronRight, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const ALL_ROLES = ["USER", "ADMIN", "ODDS_MANAGER", "AGENT", "SUBADMIN"] as const;

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
  _count: { bets: number; transactions: number };
};

type ReferredUser = {
  id: string;
  codeUsed: string;
  status: string;
  createdAt: string;
  rewardedAt: string | null;
  referee: { id: string; email: string; name: string | null; isActive: boolean; createdAt: string };
  stats: { depositTotal: number; betCount: number; wonTotal: number; lostTotal: number; lastBetAt: string | null };
};

const PAGE_SIZE = 10;

export default function AdminAgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [referred, setReferred] = useState<ReferredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [codeDraft, setCodeDraft] = useState<string | null>(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const [savingCode, setSavingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<string>("");
  const [changingRole, setChangingRole] = useState(false);

  useEffect(() => {
    const t = getAccessToken();
    if (!t) return;
    setLoading(true);
    Promise.all([
      api.get<{ data: AgentProfile }>(`/users/${id}`, t).then((r) => r.data).catch(() => null),
      api.get<{ data: ReferredUser[] }>(`/users/${id}/referred-users`, t).then((r) => r.data ?? []).catch(() => []),
    ])
      .then(([a, refs]) => {
        if (!a) toast.error("Agent not found");
        setAgent(a);
        setReferred(refs);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const stats = useMemo(() => {
    const nowMs = Date.now();
    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
    return {
      all: referred.length,
      year: referred.filter((r) => new Date(r.createdAt).getTime() >= yearStart).length,
      d30: referred.filter((r) => nowMs - new Date(r.createdAt).getTime() <= 30 * 86400000).length,
      d7: referred.filter((r) => nowMs - new Date(r.createdAt).getTime() <= 7 * 86400000).length,
      funded100: referred.filter((r) => r.stats.depositTotal >= 100).length,
      deposits: referred.reduce((a, r) => a + r.stats.depositTotal, 0),
    };
  }, [referred]);

  const filtered = useMemo(() => {
    if (!search.trim()) return referred;
    const q = search.toLowerCase();
    return referred.filter((r) =>
      `${r.referee.name ?? ""} ${r.referee.email} ${r.codeUsed} ${r.status}`.toLowerCase().includes(q)
    );
  }, [referred, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const pendingCode = ((codeDraft ?? agent?.second_referralCode ?? "") as string).trim();

  const openRoleChange = (role: string | null) => {
    if (!agent || !role || displayRole(role) === displayRole(agent.role)) return;
    const me = getUser();
    if (me?.id === agent.id && role !== "ADMIN") {
      toast.error("You cannot change your own account away from ADMIN — you would lose access to this page");
      return;
    }
    setPendingRole(role);
    setRoleOpen(true);
  };

  const handleRoleChange = async () => {
    if (!agent || !pendingRole || displayRole(pendingRole) === displayRole(agent.role)) return;
    setChangingRole(true);
    try {
      const t = getAccessToken();
      const res = await api.patch<{ data: AgentProfile }>(`/users/${id}`, { role: pendingRole }, t);
      toast.success(`Account type changed to ${pendingRole}`);
      setRoleOpen(false);
      setPendingRole("");
      if (pendingRole !== "AGENT") {
        // No longer an agent — this page's agent sections don't apply; go to the user detail
        router.replace(`/admin/users/${id}`);
        return;
      }
      setAgent(res.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Role change failed");
    } finally {
      setChangingRole(false);
    }
  };

  const handleSaveCode = async () => {
    setSavingCode(true);
    setCodeError(null);
    try {
      const t = getAccessToken();
      const res = await api.patch<{ data: AgentProfile }>(`/users/${id}`, { second_referralCode: pendingCode }, t);
      setAgent(res.data);
      setCodeDraft(null);
      setCodeOpen(false);
      toast.success(pendingCode ? "Second referral code saved" : "Second referral code removed");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setCodeError(msg);
      toast.error(msg);
    } finally {
      setSavingCode(false);
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="space-y-4">
        <Button variant="outline" render={<Link href="/admin/users/agents" />} nativeButton={false}>
          <ArrowLeft className="size-4" /> Back to agents
        </Button>
        <p className="text-sm text-muted-foreground">Agent not found.</p>
      </div>
    );
  }

  const referralLink =
    typeof window !== "undefined" && agent.referralCode
      ? `${window.location.origin}/signup?ref=${encodeURIComponent(agent.referralCode)}`
      : "";

  return (
    <div className="space-y-6">
      <Button variant="outline" render={<Link href="/admin/users/agents" />} nativeButton={false}>
        <ArrowLeft className="size-4" /> Back to agents
      </Button>

      {/* Profile header — same info the agent sees */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div className="grid size-16 place-items-center rounded-full bg-amber-500 text-xl font-bold text-white">
            {agent.name?.[0]?.toUpperCase() ?? agent.email[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{agent.name || "—"}</h1>
              <Badge className="bg-amber-500 text-white">{agent.role}</Badge>
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <span className={`size-2.5 rounded-full ${agent.isActive ? "bg-green-500" : "bg-red-500"}`} />
                {agent.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Mail className="size-3.5" /> {agent.email}
            </div>
            <div className="mt-0.5 font-mono text-xs text-muted-foreground">{agent.id}</div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 font-mono text-xl font-bold">
              <Wallet className="size-4 text-muted-foreground" /> ${Number(agent.balance).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              {agent._count?.bets ?? 0} bets • {agent._count?.transactions ?? 0} transactions
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account facts */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Referral code", value: agent.referralCode ?? "—", mono: true },
          { label: "Member since", value: new Date(agent.createdAt).toLocaleDateString() },
          { label: "Last login", value: agent.lastLoginAt ? new Date(agent.lastLoginAt).toLocaleString() : "—" },
          { label: "Verified", value: agent.emailVerified ? "Yes" : "No" },
        ].map((f) => (
          <Card key={f.label} className="border-border bg-card shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{f.label}</div>
              <div className={`mt-1 font-semibold ${f.mono ? "font-mono text-sm" : ""}`}>{f.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Referral codes */}
      <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="size-5 text-primary" /> Referral link
          </CardTitle>
          <CardDescription>The link this agent shares — signups through it land in the table below</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="font-mono text-xs break-all rounded-xl border border-border bg-muted/40 p-3">
            {referralLink || "—"}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-5 text-primary" /> Second referral code
          </CardTitle>
          <CardDescription>Manually assigned code users can type on signup — must be unique across all accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 p-4">
          <div className="flex gap-2">
            <Input
              value={codeDraft ?? agent.second_referralCode ?? ""}
              onChange={(e) => { setCodeDraft(e.target.value); setCodeError(null); }}
              placeholder="e.g. ABEBE12"
              autoComplete="off"
              className="font-mono"
            />
            <Button
              disabled={savingCode || (codeDraft ?? agent.second_referralCode ?? "") === (agent.second_referralCode ?? "")}
              onClick={() => { setCodeError(null); setCodeOpen(true); }}
              className="shrink-0 bg-primary"
            >
              Save
            </Button>
          </div>
          {codeError && <p className="text-xs text-destructive">{codeError}</p>}
          {!codeError && (
            <p className="text-xs text-muted-foreground">
              Current: <span className="font-mono font-semibold">{agent.second_referralCode || "—"}</span>
              {" "}· Empty the field and save to remove it.
            </p>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Account type */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-5 text-primary" /> Account type
          </CardTitle>
          <CardDescription>
            Current type: <Badge className="bg-amber-500 text-white">{agent.role}</Badge>
            {" "}— switching away from AGENT moves this account to the matching section
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1.5">
            <Label>Change account type</Label>
            <Select value={displayRole(agent.role)} onValueChange={openRoleChange}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">Switching asks for confirmation first.</p>
        </CardContent>
      </Card>

      {/* Reach stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { icon: Users, label: "Registered · all time", value: stats.all },
          { icon: Calendar, label: "Registered · this year", value: stats.year },
          { icon: Clock, label: "Registered · last 30 days", value: stats.d30 },
          { icon: TrendingUp, label: "Registered · last 7 days", value: stats.d7 },
          { icon: Wallet, label: "Deposited 100+ ETB", value: stats.funded100 },
        ].map((s) => (
          <Card key={s.label} className="border-border bg-card shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <s.icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-xl font-bold leading-tight">{s.value}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{s.label}</span>
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">
        Referred users deposited <span className="font-mono font-semibold text-foreground">ETB {stats.deposits.toFixed(2)}</span> approved in total.
      </p>

      {/* Referred users table */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-5 text-primary" /> People registered via this agent
            <Badge variant="secondary" className="ml-1 bg-primary/15 text-primary border-primary/20">
              {filtered.length}
            </Badge>
          </CardTitle>
          <CardDescription>Same list the agent sees, plus deposits, betting activity and last bet</CardDescription>
          <div className="mt-3 max-w-sm">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name or email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {paged.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No referred users yet.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="admin-cards">
                  <TableHeader className="bg-primary">
                    <TableRow className="hover:bg-primary border-primary">
                      <TableHead className="text-white text-xs tracking-widest">USER</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">REGISTERED</TableHead>
                      <TableHead className="text-white text-xs tracking-widest text-right">DEPOSITED</TableHead>
                      <TableHead className="text-white text-xs tracking-widest text-right">WON / LOST</TableHead>
                      <TableHead className="text-white text-xs tracking-widest text-right">BETS</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">LAST BET</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((r) => (
                      <TableRow key={r.id} className="border-border hover:bg-muted/50">
                        <TableCell>
                          <Link href={`/admin/users/${r.referee.id}`} className="font-medium text-sm text-primary hover:underline">
                            {r.referee.name || "—"}
                          </Link>
                          <div className="text-xs text-muted-foreground">{r.referee.email}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          ETB {Number(r.stats.depositTotal).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          <span className="text-secondary">+{Number(r.stats.wonTotal).toFixed(0)}</span>
                          {" / "}
                          <span className="text-destructive">-{Number(r.stats.lostTotal).toFixed(0)}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{r.stats.betCount}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {r.stats.lastBetAt ? new Date(r.stats.lastBetAt).toLocaleString() : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                <span>
                  Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <span className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="px-1">{safePage} / {totalPages}</span>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                    <ChevronRight className="size-4" />
                  </Button>
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Full account actions live on the user detail page */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" render={<Link href={`/admin/users/${id}`} />} nativeButton={false}>
          <Gift className="size-4" /> Open full user detail (ban, role, edit)
        </Button>
      </div>

      {/* Role change confirm */}
      <Dialog open={roleOpen} onOpenChange={(open) => { if (!open) { setRoleOpen(false); setPendingRole(""); } }}>
        <DialogContent className="sm:max-w-[420px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="size-5 text-primary" /> Change account type?
            </DialogTitle>
            <DialogDescription>
              Change <span className="font-mono font-semibold">{agent.email}</span> from{" "}
              <Badge className="bg-amber-500 text-white">{agent.role}</Badge> to{" "}
              <Badge variant="outline">{pendingRole || "—"}</Badge>?
              {pendingRole && pendingRole !== "AGENT"
                ? " This account will leave the Agents section — you will be taken to its user detail page."
                : " This takes effect immediately."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleOpen(false)} disabled={changingRole}>
              Cancel
            </Button>
            <Button onClick={handleRoleChange} disabled={changingRole} className="bg-primary">
              {changingRole ? <Loader2 className="size-4 animate-spin" /> : <Briefcase className="size-4" />} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Second-code confirm */}
      <Dialog open={codeOpen} onOpenChange={(open) => { if (!open) setCodeOpen(false); }}>
        <DialogContent className="sm:max-w-[440px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" /> {pendingCode ? "Set second referral code?" : "Remove second referral code?"}
            </DialogTitle>
            <DialogDescription>
              {pendingCode ? (
                <>
                  Users typing <span className="font-mono font-semibold">{pendingCode}</span> on signup will be
                  attributed to <span className="font-semibold">{agent.email}</span>. The code must be unique across
                  all accounts — the save is rejected if it is already taken.
                  {agent.second_referralCode && (
                    <> Replaces current code <span className="font-mono font-semibold">{agent.second_referralCode}</span>.</>
                  )}
                </>
              ) : (
                <>The manual signup code for <span className="font-mono font-semibold">{agent.email}</span> will stop working. Their main referral link is unaffected.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCodeOpen(false)} disabled={savingCode}>
              Cancel
            </Button>
            <Button onClick={handleSaveCode} disabled={savingCode} className="bg-primary">
              {savingCode ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
