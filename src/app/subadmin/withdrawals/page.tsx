"use client";

import { useCallback, useEffect, useState } from "react";
import { api, API_URL, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowUpFromLine, Search, Eye, CheckCircle2, XCircle, Loader2, Flag } from "lucide-react";

type WithdrawalRequest = {
  id: string;
  userId: string;
  user: { id: string; email: string; name: string | null } | null;
  type: "WITHDRAWAL";
  amount: string | number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  payoutAccountName: string | null;
  payoutAccountNumber: string | null;
  payoutBankName: string | null;
  reviewedBy: { email: string; name: string | null } | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  transactionId: string | null;
  completedAt: string | null;
  createdAt: string;
};

type EffectiveStatus = "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED" | "CANCELLED";

function effectiveStatus(r: WithdrawalRequest): EffectiveStatus {
  if (r.status === "APPROVED" && r.completedAt) return "COMPLETED";
  return r.status;
}

const statusStyle: Record<EffectiveStatus, string> = {
  PENDING: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
  APPROVED: "bg-sky-500/15 text-sky-600 border-sky-500/30 dark:text-sky-400",
  COMPLETED: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  REJECTED: "bg-destructive/15 text-destructive border-destructive/30",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

export default function SubadminWithdrawalsPage() {
  const [rows, setRows] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showPendingOnly, setShowPendingOnly] = useState(true);

  const [detail, setDetail] = useState<WithdrawalRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [busy, setBusy] = useState<"" | "approve" | "reject" | "complete">("");
  const [rejectReason, setRejectReason] = useState("");
  const [txId, setTxId] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: WithdrawalRequest[] }>("/funds/admin/requests?type=WITHDRAWAL", getAccessToken());
      setRows(res.data ?? []);
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Failed to load withdrawals");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = rows.filter((r) => {
    if (showPendingOnly && effectiveStatus(r) !== "PENDING") return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return `${r.user?.name ?? ""} ${r.user?.email ?? ""} ${r.payoutAccountNumber ?? ""} ${r.amount}`.toLowerCase().includes(q);
  });

  const refreshDetail = async (id: string) => {
    try {
      const res = await api.get<{ data: WithdrawalRequest }>(`/funds/admin/requests/${id}`, getAccessToken());
      setDetail(res.data);
    } catch {
      /* keep stale */
    }
  };

  const openDetail = async (r: WithdrawalRequest) => {
    setDetail(r);
    setDetailOpen(true);
    setRejectReason("");
    setTxId(r.transactionId ?? "");
    setProofFile(null);
    try {
      const res = await api.get<{ data: WithdrawalRequest }>(`/funds/admin/requests/${r.id}`, getAccessToken());
      setDetail(res.data);
    } catch {
      /* keep list copy */
    }
  };

  const submitApprove = async () => {
    if (!detail) return;
    if (!txId.trim()) {
      toast.error("Transaction ID is required to approve a withdrawal");
      return;
    }
    if (!proofFile) {
      toast.error("Completion proof image is required to approve a withdrawal");
      return;
    }
    setBusy("approve");
    try {
      const form = new FormData();
      form.append("transactionId", txId.trim());
      form.append("completionProof", proofFile);
      const res = await fetch(`${API_URL}/api/v1/funds/admin/requests/${detail.id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { message?: string }).message || "Approve failed");
      toast.success("Withdrawal approved and marked complete");
      setDetailOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy("");
    }
  };

  const submitReject = async () => {
    if (!detail) return;
    if (!rejectReason.trim()) {
      toast.error("Give a reason for rejection");
      return;
    }
    setBusy("reject");
    try {
      await api.post(`/funds/admin/requests/${detail.id}/reject`, { reason: rejectReason.trim() }, getAccessToken());
      toast.success("Withdrawal rejected");
      setDetailOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy("");
    }
  };

  const submitComplete = async () => {
    if (!detail) return;
    if (!txId.trim()) {
      toast.error("Transaction ID is required");
      return;
    }
    setBusy("complete");
    try {
      const form = new FormData();
      form.append("transactionId", txId.trim());
      if (proofFile) form.append("completionProof", proofFile);
      const res = await fetch(`${API_URL}/api/v1/funds/admin/requests/${detail.id}/complete`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { message?: string }).message || "Complete failed");
      toast.success("Withdrawal marked complete");
      await refreshDetail(detail.id);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Complete failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-500">
          <ArrowUpFromLine className="size-3.5" /> Money management
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Withdrawals</h1>
        <p className="text-sm text-muted-foreground">Review payout details, approve with proof, or reject with a reason. Actions log under your account.</p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowUpFromLine className="size-5 text-sky-500" /> Withdrawal requests
            <Badge variant="secondary" className="ml-1 bg-sky-500/15 text-sky-500 border-sky-500/20">
              {visible.length}
            </Badge>
          </CardTitle>
          <CardDescription>Newest first. Approving pays out — double-check the destination.</CardDescription>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search user, account, amount..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
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
            <div className="py-12 text-center text-sm text-muted-foreground">No withdrawal requests.</div>
          ) : (
            <Table className="admin-cards stripe-table">
              <TableHeader className="bg-primary">
                <TableRow className="border-primary hover:bg-primary">
                  <TableHead className="w-[24%] text-white text-xs tracking-widest">USER</TableHead>
                  <TableHead className="w-[14%] text-white text-xs tracking-widest text-right">AMOUNT</TableHead>
                  <TableHead className="w-[20%] text-white text-xs tracking-widest">DESTINATION</TableHead>
                  <TableHead className="w-[14%] text-white text-xs tracking-widest">STATUS</TableHead>
                  <TableHead className="w-[16%] text-white text-xs tracking-widest">DATE</TableHead>
                  <TableHead className="w-[12%] text-right text-white text-xs tracking-widest">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r) => (
                  <TableRow key={r.id} className="border-border">
                    <TableCell>
                      <div className="break-words font-medium text-sm">{r.user?.name || "—"}</div>
                      <div className="break-all text-xs text-muted-foreground">{r.user?.email}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">ETB {Number(r.amount).toFixed(2)}</TableCell>
                    <TableCell className="break-all font-mono text-xs">
                      {r.payoutBankName} • {r.payoutAccountNumber}
                      <div className="break-words text-muted-foreground">{r.payoutAccountName}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusStyle[effectiveStatus(r)]}>{effectiveStatus(r)}</Badge>
                      {r.reviewedBy && <div className="mt-1 break-all text-[10px] text-muted-foreground">by {r.reviewedBy.name || r.reviewedBy.email}</div>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="h-8" onClick={() => openDetail(r)}>
                        <Eye className="size-3.5" /> Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[520px] bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpFromLine className="size-5 text-sky-500" /> Withdrawal review
            </DialogTitle>
            <DialogDescription>
              {detail?.user?.name || detail?.user?.email} — <span className="font-mono font-semibold">ETB {detail ? Number(detail.amount).toFixed(2) : ""}</span>
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Holder</div>
                  <div className="font-medium">{detail.payoutAccountName || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Bank</div>
                  <div className="font-medium">{detail.payoutBankName || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Account</div>
                  <div className="font-mono">{detail.payoutAccountNumber || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <Badge variant="outline" className={statusStyle[effectiveStatus(detail)]}>{effectiveStatus(detail)}</Badge>
                </div>
              </div>

              {detail.status === "PENDING" && (
                <>
                  <div className="space-y-1.5">
                    <Label>Bank transaction ID (required to approve)</Label>
                    <Input value={txId} onChange={(e) => setTxId(e.target.value)} placeholder="e.g. FT123456" className="font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Completion proof image (required to approve)</Label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                      className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-sky-500 file:px-3 file:py-2 file:text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Rejection reason (to reject instead)</Label>
                    <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Why is this rejected?" />
                  </div>
                </>
              )}

              {detail.status === "APPROVED" && !detail.completedAt && (
                <>
                  <div className="space-y-1.5">
                    <Label>Bank transaction ID</Label>
                    <Input value={txId} onChange={(e) => setTxId(e.target.value)} placeholder="e.g. FT123456" className="font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Completion proof (optional if already attached)</Label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                      className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-sky-500 file:px-3 file:py-2 file:text-white"
                    />
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)} disabled={busy !== ""}>
              Close
            </Button>
            {detail?.status === "APPROVED" && !detail?.completedAt && (
              <Button onClick={submitComplete} disabled={busy !== ""} className="bg-sky-500">
                {busy === "complete" ? <Loader2 className="size-4 animate-spin" /> : <Flag className="size-4" />} Mark complete
              </Button>
            )}
            {detail?.status === "PENDING" && (
              <>
                <Button variant="destructive" onClick={submitReject} disabled={busy !== ""}>
                  {busy === "reject" ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />} Reject
                </Button>
                <Button onClick={submitApprove} disabled={busy !== ""} className="bg-secondary">
                  {busy === "approve" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Approve & complete
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
