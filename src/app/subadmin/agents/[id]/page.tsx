"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
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
import { ArrowLeft, Mail, Wallet, Calendar, UserCog, Users, Sparkles, TrendingUp, Search, Ticket, ExternalLink, ArrowLeftRight, Loader2 } from "lucide-react";

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
  stats: {
    referred: number;
    referred7: number;
    referred15: number;
    referred30: number;
    funded100: number;
    depositTotal: number;
  };
};

type Referred = {
  id: string;
  codeUsed: string;
  status: string;
  createdAt: string;
  referee: { id: string; email: string; name: string | null; isActive: boolean };
  stats: { depositTotal: number; betCount: number; wonTotal: number; lostTotal: number; lastBetAt: string | null };
};

const SPINNER = "/assets/custom/infinite-spinner.svg";

export default function SubadminAgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [referred, setReferred] = useState<Referred[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleOpen, setRoleOpen] = useState(false);
  const [changingRole, setChangingRole] = useState(false);

  useEffect(() => {
    const t = getAccessToken();
    if (!t) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get<{ data: AgentProfile }>(`/users/agents/${id}/stats`, t).then((r) => r.data),
      api.get<{ data: Referred[] }>(`/users/${id}/referred-users`, t).then((r) => r.data ?? []),
    ])
      .then(([a, refs]) => {
        if (cancelled) return;
        if (!a) {
          toast.error("Agent not found");
          return;
        }
        setAgent(a);
        setReferred(refs);
      })
      .catch((e) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load agent");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const q = search.trim().toLowerCase();
  const rows = useMemo(
    () => (q ? referred.filter((r) => `${r.referee.name ?? ""} ${r.referee.email}`.toLowerCase().includes(q)) : referred),
    [referred, q]
  );

  const convertToUser = async () => {
    const t = getAccessToken();
    if (!t) return;
    setChangingRole(true);
    try {
      await api.patch(`/users/${id}`, { role: "USER" }, t);
      toast.success("Account converted to user");
      setRoleOpen(false);
      router.replace(`/subadmin/users/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setChangingRole(false);
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

  if (!agent) {
    return (
      <div className="space-y-4">
        <Button variant="outline" render={<Link href="/subadmin/agents" />} nativeButton={false}>
          <ArrowLeft className="size-4" /> Back to agents
        </Button>
        <p className="text-sm text-muted-foreground">Agent not found.</p>
      </div>
    );
  }

  const s = agent.stats;

  return (
    <div className="space-y-6">
      <Button variant="outline" render={<Link href="/subadmin/agents" />} nativeButton={false}>
        <ArrowLeft className="size-4" /> Back to agents
      </Button>

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div className="grid size-16 place-items-center rounded-full bg-amber-500 text-xl font-bold text-white">
            {agent.name?.[0]?.toUpperCase() ?? agent.email[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{agent.name || "—"}</h1>
              <Badge variant="outline" className="border-amber-500/40 text-amber-600">
                AGENT
              </Badge>
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
              <Wallet className="size-4 text-muted-foreground" /> ETB {Number(agent.balance).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              {agent._count.bets} bets • {agent._count.transactions} transactions
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-500/30 bg-card shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <ArrowLeftRight className="size-5 shrink-0 text-amber-500" />
            <div className="min-w-0">
              <div className="text-sm font-semibold">
                Account type:{" "}
                <Badge variant="outline" className="ml-1 border-amber-500/40 text-amber-600">
                  AGENT
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                You may only switch this account between agent and user. Balances, status and all other settings stay with the main admin.
              </p>
            </div>
          </div>
          <Button variant="outline" className="h-9 shrink-0 border-amber-500/40 text-amber-600 hover:bg-amber-500/10" onClick={() => setRoleOpen(true)}>
            <Users className="size-4" /> Convert to user
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "All time", value: s.referred, icon: Users, tone: "text-foreground" },
          { label: "Last 7 days", value: s.referred7, icon: TrendingUp, tone: "text-sky-600" },
          { label: "Last 15 days", value: s.referred15, icon: TrendingUp, tone: "text-amber-600" },
          { label: "Last 30 days", value: s.referred30, icon: TrendingUp, tone: "text-violet-600" },
          { label: "Spent 100+ ETB", value: s.funded100, icon: Sparkles, tone: "text-emerald-600" },
        ].map((card) => (
          <Card key={card.label} className="border-border bg-card shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <card.icon className="size-3.5" /> {card.label}
              </div>
              <div className={`mt-1 font-mono text-2xl font-bold ${card.tone}`}>{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCog className="size-5 text-primary" /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 p-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Email verified</div>
              <div>{agent.emailVerified ? "Yes" : "No"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Referral code</div>
              <div className="font-mono text-xs">{agent.referralCode ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Agent code (2nd)</div>
              <div className="font-mono text-xs">{agent.second_referralCode ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Joined</div>
              <div className="flex items-center gap-1 text-xs">
                <Calendar className="size-3 text-muted-foreground" /> {new Date(agent.createdAt).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Last login</div>
              <div className="text-xs">{agent.lastLoginAt ? new Date(agent.lastLoginAt).toLocaleString() : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Approved deposits from players</div>
              <div className="font-mono text-xs">ETB {s.depositTotal.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-base">
              <Ticket className="size-5 text-primary" /> How to read this
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 text-xs text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Players added</span> counts everyone registered through this
              agent&apos;s link or agent code.
            </p>
            <p>
              <span className="font-semibold text-foreground">7 / 15 / 30 days</span> counts only those players whose referral
              was created inside each window.
            </p>
            <p>
              <span className="font-semibold text-foreground">Spent 100+ ETB</span> counts players whose total approved deposits
              across their entire stay reach 100 ETB.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-5 text-primary" /> Players added
            <Badge variant="secondary" className="ml-1 bg-primary/15 text-primary border-primary/20">{rows.length}</Badge>
          </CardTitle>
          <CardDescription>Newest first. Open a player for their full detail.</CardDescription>
          <div className="relative mt-3 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search player name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">This agent has not added any players yet.</div>
          ) : (
            <>
              {/* Mobile: two-line player rows. No table and no sideways scroll on phones. */}
              <div className="space-y-3 p-3 md:hidden">
                {rows.map((r, i) => (
                  <div
                    key={r.id}
                    className={`min-w-0 rounded-xl border border-border p-3 ${i % 2 ? "bg-muted/30" : "bg-card"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="break-words text-sm font-semibold">{r.referee.name || "—"}</div>
                        <div className="break-all text-xs text-muted-foreground">{r.referee.email}</div>
                      </div>
                      {r.stats.depositTotal >= 100 ? (
                        <Badge className="shrink-0 bg-emerald-500 text-white">100+ ETB</Badge>
                      ) : (
                        <span className="shrink-0 text-[11px] text-muted-foreground">joined {new Date(r.createdAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono">ETB {r.stats.depositTotal.toFixed(2)} deposited</span>
                      <span className="text-muted-foreground">
                        {r.stats.betCount} bets • joined {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2 h-9 w-full border border-border"
                      render={<Link href={`/subadmin/users/${r.referee.id}`} />}
                      nativeButton={false}
                    >
                      <ExternalLink className="size-3.5" /> Open player
                    </Button>
                  </div>
                ))}
              </div>
              {/* Desktop: striped table. */}
              <div className="hidden md:block">
              <Table className="stripe-table">
              <TableHeader className="bg-primary">
                <TableRow className="border-primary hover:bg-primary">
                  <TableHead className="w-[30%] text-white text-xs tracking-widest">PLAYER</TableHead>
                  <TableHead className="w-[16%] text-white text-xs tracking-widest">JOINED</TableHead>
                  <TableHead className="w-[18%] text-white text-xs tracking-widest text-right">DEPOSITED</TableHead>
                  <TableHead className="w-[12%] text-white text-xs tracking-widest text-right">BETS</TableHead>
                  <TableHead className="w-[12%] text-white text-xs tracking-widest text-right">100+ ETB</TableHead>
                  <TableHead className="w-[12%] text-right text-white text-xs tracking-widest">DETAIL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className="border-border">
                    <TableCell>
                      <div className="break-words font-medium text-sm">{r.referee.name || "—"}</div>
                      <div className="break-all text-xs text-muted-foreground">{r.referee.email}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right font-mono text-xs">ETB {r.stats.depositTotal.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.stats.betCount}</TableCell>
                    <TableCell className="text-right">
                      {r.stats.depositTotal >= 100 ? (
                        <Badge className="bg-emerald-500 text-white">yes</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">no</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-8" render={<Link href={`/subadmin/users/${r.referee.id}`} />} nativeButton={false}>
                        <ExternalLink className="size-3.5" /> Open
                      </Button>
                    </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent className="sm:max-w-[420px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5 text-amber-500" /> Convert to user?
            </DialogTitle>
            <DialogDescription className="break-words">
              <span className="font-semibold">{agent.name || agent.email}</span> will leave the agents list and appear
              under users. Their {referred.length} referred player{referred.length === 1 ? "" : "s"} keep{referred.length === 1 ? "s" : ""} pointing
              at this account, and balances, bets and history stay untouched. This is logged under your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleOpen(false)} disabled={changingRole}>Cancel</Button>
            <Button onClick={convertToUser} disabled={changingRole} className="bg-amber-500 text-white hover:bg-amber-600">
              {changingRole ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />} Convert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
