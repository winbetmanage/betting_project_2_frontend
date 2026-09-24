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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { UserX, Search, X, Eye, CircleCheck, Loader2, Mail, Hash, Wallet, Calendar } from "lucide-react";

type InactiveUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  balance: string | number;
  createdAt: string;
  lastLoginAt: string | null;
  _count: { bets: number; transactions: number };
};

const PAGE_SIZE = 10;

export default function InactiveUsersPage() {
  const [users, setUsers] = useState<InactiveUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const [selected, setSelected] = useState<InactiveUser | null>(null);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  const load = async (p = page, s = search) => {
    const t = getAccessToken() ?? token;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("isActive", "false");
      params.set("page", String(p));
      params.set("limit", String(PAGE_SIZE));
      if (s.trim()) params.set("search", s.trim());
      const res = await api.get<{ data: InactiveUser[]; total: number; page: number; totalPages: number }>(
        `/users?${params.toString()}`,
        t
      );
      setUsers(res.data ?? []);
      setTotal(res.total ?? 0);
      setTotalPages(Math.max(1, res.totalPages ?? 1));
      if (res.page && res.page !== p) setPage(res.page);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load inactive users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      load(1, search);
    }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    load(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleReactivate = async () => {
    if (!selected) return;
    setReactivating(true);
    try {
      const t = getAccessToken() ?? token;
      await api.patch(`/users/${selected.id}`, { isActive: true }, t);
      toast.success(`${selected.email} reactivated`);
      setReactivateOpen(false);
      setSelected(null);
      load(page, search);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reactivation failed");
    } finally {
      setReactivating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
          <UserX className="size-3.5" /> Banned accounts
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Inactive Users</h1>
        <p className="text-sm text-muted-foreground">
          Accounts that are banned or deactivated — they cannot sign in. Reactivate them with confirmation.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserX className="size-5 text-destructive" /> Inactive accounts
            <Badge variant="secondary" className="ml-1 bg-destructive/10 text-destructive border-destructive/20">
              {total}
            </Badge>
          </CardTitle>
          <CardDescription>Search by name or email, turn accounts back to active when ready.</CardDescription>
          <div className="mt-3 max-w-sm">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-8"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-muted p-1 hover:bg-muted/80"
                >
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
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No inactive accounts.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="admin-cards">
                  <TableHeader className="bg-primary">
                    <TableRow className="hover:bg-primary border-primary">
                      <TableHead className="text-white text-xs tracking-widest">USER</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">ROLE</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">BALANCE</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">JOINED</TableHead>
                      <TableHead className="text-right text-white text-xs tracking-widest">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id} className="border-border hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="grid size-9 place-items-center rounded-full bg-muted text-xs font-bold text-foreground">
                              {u.name?.[0]?.toUpperCase() ?? u.email[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{u.name || "—"}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="size-3" /> {u.email}
                              </div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Hash className="size-3" /> {u.id.slice(0, 8)}…
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{u.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 font-mono text-sm">
                            <Wallet className="size-3 text-muted-foreground" /> ${Number(u.balance).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {u._count.bets} bets • {u._count.transactions} tx
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">{new Date(u.createdAt).toLocaleDateString()}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="size-3" />{" "}
                            {u.lastLoginAt ? `last login ${new Date(u.lastLoginAt).toLocaleDateString()}` : "never logged in"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" className="h-8" render={<Link href={`/admin/users/${u.id}`} />} nativeButton={false}>
                              <Eye className="size-3.5" /> Details
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 bg-secondary"
                              onClick={() => {
                                setSelected(u);
                                setReactivateOpen(true);
                              }}
                            >
                              <CircleCheck className="size-3.5" /> Activate
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col gap-2 border-t border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                  {search && ` for "${search}"`}
                </div>
                <Pagination className="mx-0 w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(Math.max(1, page - 1));
                        }}
                        className={page === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                      const p = i + 1;
                      return (
                        <PaginationItem key={p}>
                          <PaginationLink
                            href="#"
                            isActive={page === p}
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(p);
                            }}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(Math.min(totalPages, page + 1));
                        }}
                        className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Reactivate confirm */}
      <Dialog open={reactivateOpen} onOpenChange={setReactivateOpen}>
        <DialogContent className="sm:max-w-[420px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleCheck className="size-5 text-secondary" /> Reactivate this account?
            </DialogTitle>
            <DialogDescription>
              <span className="font-mono font-semibold">{selected?.email}</span> will become{" "}
              <span className="font-semibold">active again</span> and will be able to sign in and use the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReactivateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReactivate} disabled={reactivating} className="bg-secondary">
              {reactivating ? <Loader2 className="size-4 animate-spin" /> : <CircleCheck className="size-4" />} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
