"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Wallet,
  Search,
  ChevronLeft,
  ChevronRight,
  Mail,
  ArrowDownToLine,
  Users,
  CheckCircle2,
  Calendar,
} from "lucide-react";

type Deposit = {
  id: string;
  userId: string;
  amount: string | number;
  senderReference: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string | null };
};

type Payload = {
  deposits: Deposit[];
  total: number;
  count: number;
  depositors: number;
};

const PAGE_SIZE = 15;

const formatETB = (n: number | string) =>
  `ETB ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AgentTransactionsPage() {
  const [payload, setPayload] = useState<Payload>({ deposits: [], total: 0, count: 0, depositors: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = getAccessToken();
    if (!t) return;
    setLoading(true);
    api
      .get<{ data: Payload }>("/users/me/referred-deposits", t)
      .then((r) =>
        setPayload(
          r.data ?? { deposits: [], total: 0, count: 0, depositors: 0 }
        )
      )
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load transactions");
        setPayload({ deposits: [], total: 0, count: 0, depositors: 0 });
      })
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const list = [...payload.deposits].sort((a, b) => {
      const at = new Date(a.reviewedAt ?? a.createdAt).getTime();
      const bt = new Date(b.reviewedAt ?? b.createdAt).getTime();
      return bt - at;
    });
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((d) =>
      `${d.user.name ?? ""} ${d.user.email} ${d.senderReference ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [payload.deposits, search]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const tiles = [
    {
      icon: ArrowDownToLine,
      label: "Total approved deposits",
      value: formatETB(payload.total),
      sub: "from users you referred",
      bg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
    {
      icon: CheckCircle2,
      label: "Approved deposits",
      value: String(payload.count),
      sub: "confirmed by admin",
      bg: "bg-primary/15 text-primary",
    },
    {
      icon: Users,
      label: "Depositing users",
      value: String(payload.depositors),
      sub: "unique referred users",
      bg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
          <Wallet className="size-3.5" /> Transactions
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Referral Deposits</h1>
        <p className="text-sm text-muted-foreground">
          Approved deposits from users who signed up with your referral code. Pending,
          rejected and cancelled deposits are not shown.
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="size-5 text-primary" /> Approved Deposit History
            <Badge variant="secondary" className="ml-2 bg-emerald-500/15 text-emerald-600 border-emerald-500/20">
              {visible.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Newest first — only deposits approved by the admin are listed
          </CardDescription>
          <div className="mt-3 max-w-sm">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, email or reference..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center py-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
            </div>
          ) : visible.length === 0 ? (
            <div className="py-16 text-center">
              <Wallet className="mx-auto size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">No approved deposits yet</p>
              <p className="text-xs text-muted-foreground">
                Deposits from users you referred will appear here once approved by the admin
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader className="bg-primary">
                    <TableRow className="hover:bg-primary border-primary">
                      <TableHead className="text-white text-xs tracking-widest">USER</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">AMOUNT</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">REFERENCE</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">APPROVED</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">STATUS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((d, i) => (
                      <TableRow key={d.id} className={`border-border hover:bg-muted/50 ${i % 2 === 1 ? "bg-muted/40" : ""}`}>
                        <TableCell>
                          <div className="font-medium text-sm">{d.user.name || "—"}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="size-3" /> {d.user.email}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatETB(d.amount)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {d.senderReference || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {new Date(d.reviewedAt ?? d.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(d.reviewedAt ?? d.createdAt).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">
                            <CheckCircle2 className="mr-1 size-3" /> Approved
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-2 p-3 md:hidden">
                {paged.map((d, i) => (
                  <div key={d.id} className={`rounded-xl border border-border p-3 ${i % 2 === 1 ? "bg-muted/40" : "bg-card"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-sm">{d.user.name || "—"}</div>
                        <div className="truncate text-xs text-muted-foreground">{d.user.email}</div>
                      </div>
                      <Badge className="shrink-0 bg-emerald-500/15 text-emerald-600 border-emerald-500/20">
                        <CheckCircle2 className="mr-1 size-3" /> Approved
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                      <span className="text-base font-bold">{formatETB(d.amount)}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="size-3" />
                        {new Date(d.reviewedAt ?? d.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {d.senderReference && (
                      <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                        Ref: {d.senderReference}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                <span>
                  Showing{" "}
                  {visible.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, visible.length)} of {visible.length}
                </span>
                <span className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="px-1">
                    {safePage} / {totalPages}
                  </span>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                    <ChevronRight className="size-4" />
                  </Button>
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
