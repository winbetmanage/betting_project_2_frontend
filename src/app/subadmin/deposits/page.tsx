"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, API_URL } from "@/lib/api";
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
import { ArrowDownToLine, Search, CheckCircle2, XCircle, Loader2, Eye } from "lucide-react";

type DepositRequest = {
  id: string;
  userId: string;
  user: { id: string; email: string; name: string | null } | null;
  type: "DEPOSIT";
  amount: string | number;
  status: string;
  transferAccount: { bankName: string | null; accountNumber: string } | null;
  senderReference: string | null;
  proofImagePath: string | null;
  rejectionReason: string | null;
  reviewedBy: { email: string; name: string | null } | null;
  reviewedAt: string | null;
  createdAt: string;
};

const statusStyle = (s: string) =>
  s === "APPROVED"
    ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
    : s === "PENDING"
      ? "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400"
      : s === "REJECTED"
        ? "bg-destructive/15 text-destructive border-destructive/30"
        : "bg-muted text-muted-foreground border-border";

export default function SubadminDepositsPage() {
  const [rows, setRows] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showPendingOnly, setShowPendingOnly] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<DepositRequest | null>(null);
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [proofTarget, setProofTarget] = useState<DepositRequest | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofLoading, setProofLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: DepositRequest[] }>("/funds/admin/requests?type=DEPOSIT", getAccessToken());
      setRows(res.data ?? []);
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Failed to load deposits");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = rows.filter((r) => {
    if (showPendingOnly && r.status !== "PENDING") return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return `${r.user?.name ?? ""} ${r.user?.email ?? ""} ${r.senderReference ?? ""} ${r.amount}`.toLowerCase().includes(q);
  });

  const approve = async (r: DepositRequest) => {
    setBusyId(r.id);
    try {
      await api.post(`/funds/admin/requests/${r.id}/approve`, {}, getAccessToken());
      toast.success(`Deposit approved — ETB ${Number(r.amount).toFixed(2)}`);
      load();
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async () => {
    if (!rejectTarget) return;
    if (!reason.trim()) {
      toast.error("Give a reason for rejection");
      return;
    }
    setRejecting(true);
    try {
      await api.post(`/funds/admin/requests/${rejectTarget.id}/reject`, { reason: reason.trim() }, getAccessToken());
      toast.success("Deposit rejected");
      setRejectTarget(null);
      setReason("");
      load();
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Reject failed");
    } finally {
      setRejecting(false);
    }
  };

  const openProof = async (r: DepositRequest) => {
    setProofTarget(r);
    setProofUrl(null);
    setProofLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/funds/requests/${r.id}/proof`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load proof");
      const blob = await res.blob();
      setProofUrl(URL.createObjectURL(blob));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load proof");
    } finally {
      setProofLoading(false);
    }
  };

  const closeProof = () => {
    setProofTarget(null);
    if (proofUrl) URL.revokeObjectURL(proofUrl);
    setProofUrl(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
          <ArrowDownToLine className="size-3.5" /> Money management
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Deposits</h1>
        <p className="text-sm text-muted-foreground">Approve deposits or reject them with a reason. Actions log under your account.</p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowDownToLine className="size-5 text-secondary" /> Deposit requests
            <Badge variant="secondary" className="ml-1 bg-secondary/15 text-secondary border-secondary/20">
              {visible.length}
            </Badge>
          </CardTitle>
          <CardDescription>Newest first. Approving credits the user instantly.</CardDescription>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search user, ref, amount..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={showPendingOnly} onChange={(e) => setShowPendingOnly(e.target.checked)} className="size-4" />
              Pending only
            </label>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center py-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
            </div>
          ) : visible.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No deposit requests.</div>
          ) : (
            <>
              {/* Mobile: stacked multi-line cards. No table and no sideways scroll on phones. */}
              <div className="space-y-3 p-3 md:hidden">
                {visible.map((r, i) => (
                  <div
                    key={r.id}
                    className={`min-w-0 rounded-xl border border-border p-3 ${i % 2 ? "bg-muted/30" : "bg-card"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="break-words text-sm font-semibold">{r.user?.name || "—"}</div>
                        <div className="break-all text-xs text-muted-foreground">{r.user?.email}</div>
                      </div>
                      <Badge variant="outline" className={`${statusStyle(r.status)} shrink-0`}>
                        {r.status}
                      </Badge>
                    </div>
                    {r.senderReference && (
                      <div className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                        ref: {r.senderReference}
                      </div>
                    )}
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <div className="font-mono text-lg font-bold">ETB {Number(r.amount).toFixed(2)}</div>
                      <div className="shrink-0 text-right text-[11px] leading-tight text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString()}
                        <br />
                        {new Date(r.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="mt-1 break-words text-xs text-muted-foreground">
                      To: {r.transferAccount ? `${r.transferAccount.bankName ?? ""} • ${r.transferAccount.accountNumber}` : "—"}
                    </div>
                    {r.reviewedBy && (
                      <div className="mt-1 break-all text-[11px] text-muted-foreground">
                        by {r.reviewedBy.name || r.reviewedBy.email}
                      </div>
                    )}
                    {r.proofImagePath && (
                      <Button variant="outline" className="mt-2 h-9 w-full" onClick={() => openProof(r)}>
                        <Eye className="size-3.5" /> View proof
                      </Button>
                    )}
                    {r.status === "PENDING" && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button className="h-9 min-w-0 bg-secondary" disabled={busyId === r.id} onClick={() => approve(r)}>
                          {busyId === r.id ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />} Approve
                        </Button>
                        <Button
                          variant="outline"
                          className="h-9 min-w-0 border-destructive/30 text-destructive hover:bg-destructive/10"
                          onClick={() => { setRejectTarget(r); setReason(""); }}
                        >
                          <XCircle className="size-3.5" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Desktop: striped table. */}
              <div className="hidden md:block">
                <Table className="stripe-table">
              <TableHeader className="bg-primary">
                <TableRow className="border-primary hover:bg-primary">
                  <TableHead className="w-[24%] text-white text-xs tracking-widest">USER</TableHead>
                  <TableHead className="w-[14%] text-white text-xs tracking-widest text-right">AMOUNT</TableHead>
                  <TableHead className="w-[18%] text-white text-xs tracking-widest">TO ACCOUNT</TableHead>
                  <TableHead className="w-[14%] text-white text-xs tracking-widest">STATUS</TableHead>
                  <TableHead className="w-[16%] text-white text-xs tracking-widest">DATE</TableHead>
                  <TableHead className="w-[14%] text-right text-white text-xs tracking-widest">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r) => (
                  <TableRow key={r.id} className="border-border">
                    <TableCell>
                      <div className="break-words font-medium text-sm">{r.user?.name || "—"}</div>
                      <div className="break-all text-xs text-muted-foreground">{r.user?.email}</div>
                      {r.senderReference && <div className="break-all font-mono text-[10px] text-muted-foreground">ref: {r.senderReference}</div>}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">ETB {Number(r.amount).toFixed(2)}</TableCell>
                    <TableCell className="break-all text-xs">
                      {r.transferAccount ? `${r.transferAccount.bankName ?? ""} • ${r.transferAccount.accountNumber}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusStyle(r.status)}>{r.status}</Badge>
                      {r.reviewedBy && <div className="mt-1 break-all text-[10px] text-muted-foreground">by {r.reviewedBy.name || r.reviewedBy.email}</div>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {r.proofImagePath || r.status === "PENDING" ? (
                        <div className="flex flex-wrap justify-end gap-1">
                          {r.proofImagePath && (
                            <Button size="sm" variant="outline" className="h-8" onClick={() => openProof(r)}>
                              <Eye className="size-3.5" /> Proof
                            </Button>
                          )}
                          {r.status === "PENDING" && (
                            <>
                              <Button size="sm" className="h-8 bg-secondary" disabled={busyId === r.id} onClick={() => approve(r)}>
                                {busyId === r.id ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />} Approve
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => { setRejectTarget(r); setReason(""); }}>
                                <XCircle className="size-3.5" /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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

      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) setRejectTarget(null); }}>
        <DialogContent className="sm:max-w-[420px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="size-5" /> Reject deposit?
            </DialogTitle>
            <DialogDescription>
              Reject <span className="font-mono font-semibold">ETB {rejectTarget ? Number(rejectTarget.amount).toFixed(2) : ""}</span> from{" "}
              <span className="font-semibold">{rejectTarget?.user?.email}</span>. A reason is required.
            </DialogDescription>
          </DialogHeader>
          <Input placeholder="Reason for rejection..." value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={rejecting}>Cancel</Button>
            <Button variant="destructive" onClick={reject} disabled={rejecting}>
              {rejecting ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />} Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!proofTarget} onOpenChange={(o) => { if (!o) closeProof(); }}>
        <DialogContent className="sm:max-w-[560px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="size-5 text-secondary" /> Proof of payment
            </DialogTitle>
            <DialogDescription className="break-words">
              Receipt uploaded by {proofTarget?.user?.name || proofTarget?.user?.email} for{" "}
              <span className="font-mono font-semibold">ETB {proofTarget ? Number(proofTarget.amount).toFixed(2) : ""}</span>.
            </DialogDescription>
          </DialogHeader>
          {proofLoading ? (
            <div className="grid place-items-center py-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
            </div>
          ) : proofUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={proofUrl} alt="Deposit proof" className="max-h-[70vh] w-full rounded-lg border border-border bg-muted object-contain" />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Could not load proof.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeProof}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
