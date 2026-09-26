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
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Users, Search, Eye, Mail, Hash, Wallet, UserCog } from "lucide-react";

type SubUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  balance: string | number;
  isActive: boolean;
  createdAt: string;
  referredAs: { referrer: { id: string; name: string | null } } | null;
  _count: { bets: number; transactions: number };
};

const PAGE_SIZE = 20;

export default function SubadminUsersPage() {
  const [users, setUsers] = useState<SubUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce keystrokes so typing does not fire a request per character.
  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [search]);

  // Search and pagination are handled server-side so oversight is not capped.
  useEffect(() => {
    const t = getAccessToken();
    if (!t) return;
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), role: "USER" });
    if (query) params.set("search", query);
    api
      .get<{ data: SubUser[]; total: number; totalPages: number }>(`/users?${params.toString()}`, t)
      .then((r) => {
        if (cancelled) return;
        setUsers(r.data ?? []);
        setTotal(r.total ?? 0);
        setTotalPages(Math.max(1, r.totalPages ?? 1));
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : "Failed to load users");
        setUsers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, query]);

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Users className="size-3.5" /> People
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          Player accounts only. Open a row to see balances, betting history and their agent. Read-only.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-5 text-primary" /> Accounts
            <Badge variant="secondary" className="ml-1 bg-primary/15 text-primary border-primary/20">{total}</Badge>
          </CardTitle>
          <CardDescription>Read-only — open a row for full details.</CardDescription>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center py-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No accounts found.</div>
          ) : (
            <>
              {/* Mobile: stacked multi-line cards. No table and no sideways scroll on phones. */}
              <div className="space-y-3 p-3 md:hidden">
                {users.map((u, i) => (
                  <div
                    key={u.id}
                    className={`min-w-0 rounded-xl border border-border p-3 ${i % 2 ? "bg-muted/30" : "bg-card"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="break-words text-sm font-semibold">{u.name || "—"}</div>
                        <div className="break-all text-xs text-muted-foreground">{u.email}</div>
                      </div>
                      <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium">
                        <span className={`size-2.5 rounded-full ${u.isActive ? "bg-green-500" : "bg-red-500"}`} />
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-1 font-mono">
                        <Wallet className="size-3 shrink-0 text-muted-foreground" /> ETB {Number(u.balance).toFixed(2)}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {u._count.bets} bets • {u._count.transactions} tx
                      </span>
                    </div>
                    <div className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                      <UserCog className="size-3.5 shrink-0 text-amber-500" />
                      <span className="truncate">
                        Agent: {u.referredAs?.referrer ? u.referredAs.referrer.name || "Agent" : "None"}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 h-9 w-full"
                      render={<Link href={`/subadmin/users/${u.id}`} />}
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
                    <TableHead className="w-[34%] text-white text-xs tracking-widest">USER</TableHead>
                    <TableHead className="w-[20%] text-white text-xs tracking-widest">MY AGENT</TableHead>
                    <TableHead className="w-[20%] text-white text-xs tracking-widest">BALANCE</TableHead>
                    <TableHead className="w-[12%] text-white text-xs tracking-widest">STATUS</TableHead>
                    <TableHead className="w-[14%] text-right text-white text-xs tracking-widest">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="border-border">
                      <TableCell>
                        <div className="break-words font-medium text-sm">{u.name || "—"}</div>
                        <div className="flex items-start gap-1 text-xs text-muted-foreground">
                          <Mail className="mt-0.5 size-3 shrink-0" /> <span className="break-all">{u.email}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Hash className="size-3 shrink-0" /> {u.id.slice(0, 8)}…
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.referredAs?.referrer ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 max-w-full px-1.5 text-xs"
                            render={<Link href={`/subadmin/agents/${u.referredAs.referrer.id}`} />}
                            nativeButton={false}
                          >
                            <UserCog className="size-3.5 shrink-0 text-amber-500" />
                            <span className="truncate">{u.referredAs.referrer.name || "Agent"}</span>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 font-mono text-sm">
                          <Wallet className="size-3 shrink-0 text-muted-foreground" /> ETB {Number(u.balance).toFixed(2)}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">{u._count.bets} bets • {u._count.transactions} tx</span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-xs font-medium">
                          <span className={`size-2.5 shrink-0 rounded-full ${u.isActive ? "bg-green-500" : "bg-red-500"}`} />
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="h-8" render={<Link href={`/subadmin/users/${u.id}`} />} nativeButton={false}>
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
                  {total === 0 ? "No results" : <>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</>}
                </div>
                <Pagination className="mx-0 w-auto overflow-x-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage(Math.max(1, page - 1)); }} className={page === 1 ? "pointer-events-none opacity-50" : ""} />
                    </PaginationItem>
                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                      <PaginationItem key={i + 1}>
                        <PaginationLink href="#" isActive={page === i + 1} onClick={(e) => { e.preventDefault(); setPage(i + 1); }}>
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage(Math.min(totalPages, page + 1)); }} className={page === totalPages ? "pointer-events-none opacity-50" : ""} />
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
