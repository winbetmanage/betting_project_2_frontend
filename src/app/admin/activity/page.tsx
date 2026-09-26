"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollText, Search, X, Eye } from "lucide-react";

type AdminAction = {
  id: string;
  userId: string;
  user: { id: string; email: string; name: string | null; role: string } | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
};

const PAGE_SIZE = 15;

export default function AdminActivityPage() {
  const [rows, setRows] = useState<AdminAction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [metaRow, setMetaRow] = useState<AdminAction | null>(null);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  const load = async (p = page, s = search) => {
    const t = getAccessToken() ?? token;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", String(PAGE_SIZE));
      if (s.trim()) params.set("search", s.trim());
      const res = await api.get<{ data: AdminAction[]; total: number; page: number; totalPages: number }>(
        `/users/admin-actions?${params.toString()}`,
        t
      );
      setRows(res.data ?? []);
      setTotal(res.total ?? 0);
      setTotalPages(Math.max(1, res.totalPages ?? 1));
      if (res.page && res.page !== p) setPage(res.page);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load activity");
      setRows([]);
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

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <ScrollText className="size-3.5" /> Staff oversight
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Admin Activity</h1>
        <p className="text-sm text-muted-foreground">
          Every staff action with the account behind it — admins, subadmins and managers, newest first.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="size-5 text-primary" /> Activity log
            <Badge variant="secondary" className="ml-1 bg-primary/15 text-primary border-primary/20">{total}</Badge>
          </CardTitle>
          <CardDescription>Search by action, target, or staff name/email.</CardDescription>
          <div className="mt-3 max-w-sm">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search action, target, staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No recorded actions yet.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="admin-cards">
                  <TableHeader className="bg-primary">
                    <TableRow className="hover:bg-primary border-primary">
                      <TableHead className="text-white text-xs tracking-widest">WHO</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">ACTION</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">TARGET</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">WHEN</TableHead>
                      <TableHead className="text-right text-white text-xs tracking-widest">DETAIL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id} className="border-border hover:bg-muted/50">
                        <TableCell>
                          <div className="font-medium text-sm">{r.user?.name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{r.user?.email ?? "unknown account"}</div>
                          {r.user && <Badge variant="outline" className="mt-1 text-[10px]">{r.user.role}</Badge>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[11px]">{r.action}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>{r.targetType ?? "—"}</div>
                          {r.targetId && <div className="font-mono text-[10px] text-muted-foreground">{r.targetId.slice(0, 12)}…</div>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={() => setMetaRow(r)}
                            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                          >
                            <Eye className="size-3.5" /> Metadata
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col gap-2 border-t border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                </div>
                <Pagination className="mx-0 w-auto">
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

      <Dialog open={!!metaRow} onOpenChange={(o) => { if (!o) setMetaRow(null); }}>
        <DialogContent className="sm:max-w-[520px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">{metaRow?.action}</DialogTitle>
            <DialogDescription>
              {metaRow?.user?.email} • {metaRow ? new Date(metaRow.createdAt).toLocaleString() : ""}
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs font-mono">
            {JSON.stringify(metaRow?.metadata ?? null, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
