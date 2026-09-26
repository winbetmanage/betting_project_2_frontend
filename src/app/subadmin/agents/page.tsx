"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserCog, Search, Eye, Mail, Hash, Users, TrendingUp, Sparkles } from "lucide-react";

type AgentRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  balance: string | number;
  isActive: boolean;
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

const SPINNER = "/assets/custom/infinite-spinner.svg";

export default function SubadminAgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = getAccessToken();
    if (!t) return;
    let cancelled = false;
    setLoading(true);
    api
      .get<{ data: AgentRow[] }>("/users/agents", t)
      .then((r) => {
        if (!cancelled) setAgents(r.data ?? []);
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : "Failed to load agents");
        setAgents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const q = search.trim().toLowerCase();
  const rows = q
    ? agents.filter((a) => `${a.name ?? ""} ${a.email} ${a.referralCode ?? ""} ${a.second_referralCode ?? ""}`.toLowerCase().includes(q))
    : agents;

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <UserCog className="size-3.5" /> People
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Agents</h1>
        <p className="text-sm text-muted-foreground">
          Referral agents and how many players each one has brought in. Read-only.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total agents</div>
            <div className="mt-1 font-mono text-2xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Players brought in (30d)</div>
            <div className="mt-1 font-mono text-2xl font-bold">{agents.reduce((n, a) => n + a.stats.referred30, 0)}</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Deposited 100+ ETB</div>
            <div className="mt-1 font-mono text-2xl font-bold">{agents.reduce((n, a) => n + a.stats.funded100, 0)}</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Approved deposits (all time)</div>
            <div className="mt-1 font-mono text-2xl font-bold">
              ETB {agents.reduce((n, a) => n + a.stats.depositTotal, 0).toFixed(0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCog className="size-5 text-primary" /> Agent accounts
            <Badge variant="secondary" className="ml-1 bg-primary/15 text-primary border-primary/20">{rows.length}</Badge>
          </CardTitle>
          <CardDescription>Open an agent to see their profile and the full list of players they added.</CardDescription>
          <div className="relative mt-3 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search name, email or code..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center py-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SPINNER} alt="Loading" className="size-10" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No agents found.</div>
          ) : (
            <>
              {/* Mobile: stacked multi-line cards. No table and no sideways scroll on phones. */}
              <div className="space-y-3 p-3 md:hidden">
                {rows.map((a, i) => (
                  <div
                    key={a.id}
                    className={`min-w-0 rounded-xl border border-border p-3 ${i % 2 ? "bg-muted/30" : "bg-card"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="break-words text-sm font-semibold">{a.name || "—"}</div>
                        <div className="break-all text-xs text-muted-foreground">{a.email}</div>
                      </div>
                      <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium">
                        <span className={`size-2.5 rounded-full ${a.isActive ? "bg-green-500" : "bg-red-500"}`} />
                        {a.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                      {a.referralCode ?? "—"}
                      {a.second_referralCode && <> · 2nd: {a.second_referralCode}</>}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                      <div className="min-w-0 rounded-lg bg-muted/40 px-1 py-1.5">
                        <div className="flex items-center justify-center gap-1 font-mono text-sm font-bold">
                          <Users className="size-3.5 text-muted-foreground" /> {a.stats.referred}
                        </div>
                        <div className="text-[10px] leading-tight text-muted-foreground">players</div>
                      </div>
                      <div className="min-w-0 rounded-lg bg-muted/40 px-1 py-1.5">
                        <div className="font-mono text-[11px] font-bold leading-5">
                          {a.stats.referred7}/{a.stats.referred15}/{a.stats.referred30}
                        </div>
                        <div className="text-[10px] leading-tight text-muted-foreground">7 / 15 / 30 days</div>
                      </div>
                      <div className="min-w-0 rounded-lg bg-muted/40 px-1 py-1.5">
                        <div className="flex items-center justify-center gap-1 font-mono text-sm font-bold text-emerald-600">
                          <Sparkles className="size-3.5" /> {a.stats.funded100}
                        </div>
                        <div className="text-[10px] leading-tight text-muted-foreground">spent 100+ ETB</div>
                      </div>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      ETB {a.stats.depositTotal.toFixed(0)} deposited by their players
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 h-9 w-full"
                      render={<Link href={`/subadmin/agents/${a.id}`} />}
                      nativeButton={false}
                    >
                      <Eye className="size-3.5" /> Details
                    </Button>
                  </div>
                ))}
              </div>
              {/* Desktop: striped table. */}
              <div className="hidden md:block">
              <Table className="stripe-table">
              <TableHeader className="bg-primary">
                <TableRow className="border-primary hover:bg-primary">
                  <TableHead className="w-[24%] text-white text-xs tracking-widest">AGENT</TableHead>
                  <TableHead className="w-[16%] text-white text-xs tracking-widest">CODES</TableHead>
                  <TableHead className="w-[16%] text-white text-xs tracking-widest">PLAYERS ADDED</TableHead>
                  <TableHead className="w-[18%] text-white text-xs tracking-widest">7 / 15 / 30 DAYS</TableHead>
                  <TableHead className="w-[12%] text-white text-xs tracking-widest">100+ ETB</TableHead>
                  <TableHead className="w-[14%] text-right text-white text-xs tracking-widest">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id} className="border-border">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="break-words font-medium text-sm">{a.name || "—"}</span>
                        <span className={`size-2 shrink-0 rounded-full ${a.isActive ? "bg-green-500" : "bg-red-500"}`} />
                      </div>
                      <div className="flex items-start gap-1 text-xs text-muted-foreground">
                        <Mail className="mt-0.5 size-3 shrink-0" /> <span className="break-all">{a.email}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Hash className="size-3 shrink-0" /> {a.id.slice(0, 8)}…
                      </div>
                    </TableCell>
                    <TableCell className="break-all font-mono text-[11px]">
                      <div>{a.referralCode ?? "—"}</div>
                      {a.second_referralCode && <div className="text-muted-foreground">2nd: {a.second_referralCode}</div>}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 font-mono text-sm font-semibold">
                        <Users className="size-3.5 text-muted-foreground" /> {a.stats.referred}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">ETB {a.stats.depositTotal.toFixed(0)} deposited</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1 font-mono text-xs">
                        <span className="rounded bg-muted px-1.5 py-0.5">{a.stats.referred7}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="rounded bg-muted px-1.5 py-0.5">{a.stats.referred15}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="rounded bg-muted px-1.5 py-0.5">{a.stats.referred30}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">last 7 / 15 / 30 days</span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 font-mono text-sm font-semibold text-emerald-600">
                        <Sparkles className="size-3.5" /> {a.stats.funded100}
                      </span>
                      <span className="text-[10px] text-muted-foreground">spent 100+ ETB</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="h-8" render={<Link href={`/subadmin/agents/${a.id}`} />} nativeButton={false}>
                        <Eye className="size-3.5" /> Details
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

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <TrendingUp className="size-4" /> Player counts come from referral records; the 100+ ETB figure counts players whose
        approved deposits total 100 ETB or more.
      </p>
    </div>
  );
}
