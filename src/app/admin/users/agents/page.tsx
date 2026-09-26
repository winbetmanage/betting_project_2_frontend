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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Briefcase, Search, X, Eye, Mail, Hash, Calendar, Users, Wallet } from "lucide-react";

type AgentRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  referralCode: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  _count: { bets: number; transactions: number };
  stats: { referred: number; funded100: number };
};

const PAGE_SIZE = 10;

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = getAccessToken();
    if (!t) return;
    setLoading(true);
    api
      .get<{ data: AgentRow[] }>("/users/agents", t)
      .then((r) => setAgents(r.data ?? []))
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load agents");
        setAgents([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    if (!search.trim()) return agents;
    const q = search.toLowerCase();
    return agents.filter((a) =>
      `${a.name ?? ""} ${a.email} ${a.referralCode ?? ""}`.toLowerCase().includes(q)
    );
  }, [agents, search]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
          <Briefcase className="size-3.5" /> Agent accounts
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Agents</h1>
        <p className="text-sm text-muted-foreground">
          Every account registered as an agent — status, referral reach and funded referrals.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-5 text-primary" /> All agents
            <Badge variant="secondary" className="ml-1 bg-amber-500/15 text-amber-600 border-amber-500/20 dark:text-amber-400">
              {visible.length}
            </Badge>
          </CardTitle>
          <CardDescription>Green dot = active, red dot = inactive. Open details for the full referral picture.</CardDescription>
          <div className="mt-3 max-w-sm">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, email or code..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 pr-8"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-muted p-1 hover:bg-muted/80">
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center py-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
            </div>
          ) : paged.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No agent accounts yet.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="admin-cards">
                  <TableHeader className="bg-primary">
                    <TableRow className="hover:bg-primary border-primary">
                      <TableHead className="text-white text-xs tracking-widest">AGENT</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">STATUS</TableHead>
                      <TableHead className="text-white text-xs tracking-widest text-right">REFERRED</TableHead>
                      <TableHead className="text-white text-xs tracking-widest text-right">FUNDED 100+</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">JOINED</TableHead>
                      <TableHead className="text-right text-white text-xs tracking-widest">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((a) => (
                      <TableRow key={a.id} className="border-border hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="grid size-9 place-items-center rounded-full bg-amber-500 text-xs font-bold text-white">
                              {a.name?.[0]?.toUpperCase() ?? a.email[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{a.name || "—"}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="size-3" /> {a.email}
                              </div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Hash className="size-3" /> {a.id.slice(0, 8)}…
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5 text-xs font-medium">
                            <span className={`size-2.5 rounded-full ${a.isActive ? "bg-green-500" : "bg-red-500"}`} />
                            {a.isActive ? "Active" : "Inactive"}
                          </span>
                          {a.emailVerified && <Badge variant="outline" className="mt-1 text-[10px]">Verified</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="flex items-center justify-end gap-1 font-semibold text-sm">
                            <Users className="size-3.5 text-muted-foreground" /> {a.stats.referred}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="flex items-center justify-end gap-1 font-mono text-sm">
                            <Wallet className="size-3.5 text-muted-foreground" /> {a.stats.funded100}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">{new Date(a.createdAt).toLocaleDateString()}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="size-3" />{" "}
                            {a.lastLoginAt ? `last login ${new Date(a.lastLoginAt).toLocaleDateString()}` : "never logged in"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="h-8" render={<Link href={`/admin/users/agents/${a.id}`} />} nativeButton={false}>
                            <Eye className="size-3.5" /> Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col gap-2 border-t border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  Showing {visible.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, visible.length)} of {visible.length}
                </div>
                <Pagination className="mx-0 w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage(Math.max(1, safePage - 1)); }} className={safePage === 1 ? "pointer-events-none opacity-50" : ""} />
                    </PaginationItem>
                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                      <PaginationItem key={i + 1}>
                        <PaginationLink href="#" isActive={safePage === i + 1} onClick={(e) => { e.preventDefault(); setPage(i + 1); }}>
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage(Math.min(totalPages, safePage + 1)); }} className={safePage === totalPages ? "pointer-events-none opacity-50" : ""} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
