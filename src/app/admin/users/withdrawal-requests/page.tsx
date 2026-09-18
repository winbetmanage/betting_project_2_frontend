"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Banknote,
  Search,
  X,
  Eye,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  ImageIcon,
  Paperclip,
} from "lucide-react";

const SPINNER = "/assets/custom/infinite-spinner.svg";

type LedgerTx = { id: string; type: string; amount: string | number; balanceAfter: string | number; createdAt: string } | null;

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
  reviewedById: string | null;
  reviewedBy: { id: string; email: string; name: string | null } | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  completionProofImagePath: string | null;
  transactionId: string | null;
  completedAt: string | null;
  transaction?: LedgerTx;
  createdAt: string;
  updatedAt: string;
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

function money(n: string | number | null | undefined): string {
  return (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function WithdrawalRequestsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | EffectiveStatus>("ALL");

  // Details dialog
  const [detail, setDetail] = useState<WithdrawalRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState<"" | "approve" | "reject" | "complete">("");
  const [rejectReason, setRejectReason] = useState("");
  const [txId, setTxId] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [showProof, setShowProof] = useState(false);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: WithdrawalRequest[] }>("/funds/admin/requests?type=WITHDRAWAL", getAccessToken() ?? token);
      setRequests(res.data ?? []);
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Failed to load withdrawal requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshDetail = async (id: string) => {
    try {
      const res = await api.get<{ data: WithdrawalRequest }>(`/funds/admin/requests/${id}`, getAccessToken() ?? token);
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
    setShowProof(false);
    setProofUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setDetailLoading(true);
    await refreshDetail(r.id);
    setDetailLoading(false);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetail(null);
    setShowProof(false);
    setProofUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const handleApprove = async (id: string) => {
    if (!txId.trim()) {
      toast.error("Transaction ID is required to approve");
      return;
    }
    if (!proofFile) {
      toast.error("Completion proof image is required to approve");
      return;
    }
    setBusy("approve");
    try {
      const fd = new FormData();
      fd.append("transactionId", txId.trim());
      fd.append("completionProof", proofFile);
      const t = getAccessToken() ?? token;
      const res = await fetch(`/api/v1/funds/admin/requests/${id}/approve`, {
        method: "POST",
        headers: t ? { Authorization: `Bearer ${t}` } : undefined,
        body: fd,
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new ApiError(res.status, json.message || "Approve failed");
      toast.success(json.message || "Request approved and payment recorded");
      setProofFile(null);
      await refreshDetail(id);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy("");
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      toast.error("A rejection reason is required");
      return;
    }
    setBusy("reject");
    try {
      const res = await api.post<{ message: string }>(`/funds/admin/requests/${id}/reject`, { reason: rejectReason.trim() }, getAccessToken() ?? token);
      toast.success(res.message || "Request rejected");
      setRejectReason("");
      await refreshDetail(id);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy("");
    }
  };

  const handleComplete = async (id: string) => {
    if (!txId.trim()) {
      toast.error("Transaction ID is required");
      return;
    }
    setBusy("complete");
    try {
      const fd = new FormData();
      fd.append("transactionId", txId.trim());
      if (proofFile) fd.append("completionProof", proofFile);
      const t = getAccessToken() ?? token;
      const res = await fetch(`/api/v1/funds/admin/requests/${id}/complete`, {
        method: "PATCH",
        headers: t ? { Authorization: `Bearer ${t}` } : undefined,
        body: fd,
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new ApiError(res.status, json.message || "Failed to mark completed");
      toast.success(json.message || "Withdrawal marked completed");
      setProofFile(null);
      setShowProof(false);
      await refreshDetail(id);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Complete failed");
    } finally {
      setBusy("");
    }
  };

  const viewProof = async (id: string) => {
    try {
      const t = getAccessToken() ?? token;
      const res = await fetch(`/api/v1/funds/requests/${id}/completion-proof`, {
        headers: t ? { Authorization: `Bearer ${t}` } : undefined,
      });
      if (!res.ok) throw new Error("No proof image available");
      const blob = await res.blob();
      setProofUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setShowProof(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load proof image");
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = requests.filter((r) => {
    if (statusFilter !== "ALL" && effectiveStatus(r) !== statusFilter) return false;
    if (!q) return true;
    return `${r.user?.email ?? ""} ${r.user?.name ?? ""} ${r.payoutAccountName ?? ""} ${r.payoutAccountNumber ?? ""} ${r.payoutBankName ?? ""} ${r.transactionId ?? ""}`.toLowerCase().includes(q);
  });

  const counts = {
    PENDING: requests.filter((r) => effectiveStatus(r) === "PENDING").length,
    APPROVED: requests.filter((r) => effectiveStatus(r) === "APPROVED").length,
    COMPLETED: requests.filter((r) => effectiveStatus(r) === "COMPLETED").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Banknote className="size-3.5" /> Users • Finance
          </div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Banknote className="size-6 text-primary" /> Withdrawal Requests
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Review, approve/reject withdrawals, and record the payment with a transaction ID and proof.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={statusStyle.PENDING}>{counts.PENDING} pending</Badge>
          <Badge variant="outline" className={statusStyle.APPROVED}>{counts.APPROVED} awaiting payment</Badge>
          <Badge variant="outline" className={statusStyle.COMPLETED}>{counts.COMPLETED} completed</Badge>
          <Button onClick={load} disabled={loading} variant="outline" className="border-primary/20 text-primary hover:bg-primary/10">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="size-5 text-primary" /> Requests
            <Badge variant="secondary" className="ml-1 border-primary/20 bg-primary/15 text-primary">{requests.length}</Badge>
          </CardTitle>
          <CardDescription>Search by user, payout account or transaction ID. Click Details to act on a request.</CardDescription>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search email, account, tx id..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 pr-8" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-muted p-1 hover:bg-muted/80">
                  <X className="size-3" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {(["ALL", "PENDING", "APPROVED", "COMPLETED", "REJECTED", "CANCELLED"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center py-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SPINNER} alt="Loading" className="size-10" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Banknote className="mx-auto size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">No withdrawal requests</p>
              <p className="text-xs text-muted-foreground">Nothing matches the current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="admin-cards">
                <TableHeader className="bg-primary">
                  <TableRow className="hover:bg-primary border-primary">
                    <TableHead className="text-white text-xs tracking-widest">USER</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">AMOUNT</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">PAYOUT ACCOUNT</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">STATUS</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">REQUESTED</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">TX ID</TableHead>
                    <TableHead className="text-right text-white text-xs tracking-widest">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const es = effectiveStatus(r);
                    return (
                      <TableRow key={r.id} className="border-border hover:bg-muted/50">
                        <TableCell>
                          <div className="text-sm font-medium">{r.user?.name || r.user?.email || "—"}</div>
                          <div className="text-xs text-muted-foreground">{r.user?.email}</div>
                        </TableCell>
                        <TableCell className="text-sm font-semibold">ETB {money(r.amount)}</TableCell>
                        <TableCell>
                          <div className="text-xs">{r.payoutAccountName || "—"}</div>
                          <div className="font-mono text-xs text-muted-foreground">{r.payoutAccountNumber || "—"}</div>
                          <div className="text-[11px] text-muted-foreground">{r.payoutBankName || ""}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusStyle[es]}>
                            {es === "COMPLETED" && <CheckCircle2 className="mr-1 size-3" />}
                            {es === "PENDING" && <Clock className="mr-1 size-3" />}
                            {es}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{new Date(r.createdAt).toLocaleString()}</TableCell>
                        <TableCell className="font-mono text-xs">{r.transactionId ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDetail(r)}>
                            <Eye className="size-3.5" /> Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details dialog */}
      <Dialog open={detailOpen} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="sm:max-w-[620px] bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="size-5 text-primary" /> Withdrawal Request
              {detail && <Badge variant="outline" className={statusStyle[effectiveStatus(detail)]}>{effectiveStatus(detail)}</Badge>}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">{detail?.id}</DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-4 py-1 text-sm">
              {detailLoading && <div className="text-xs text-muted-foreground">Refreshing latest data…</div>}

              <div className="grid grid-cols-2 gap-3">
                <Field label="User">{detail.user?.name || "—"} <span className="text-xs text-muted-foreground">({detail.user?.email})</span></Field>
                <Field label="Amount"><span className="font-semibold">ETB {money(detail.amount)}</span></Field>
                <Field label="Requested">{new Date(detail.createdAt).toLocaleString()}</Field>
                <Field label="Reviewed">{detail.reviewedBy ? `${detail.reviewedBy.name || detail.reviewedBy.email}${detail.reviewedAt ? ` • ${new Date(detail.reviewedAt).toLocaleString()}` : ""}` : "—"}</Field>
                <Field label="Account holder">{detail.payoutAccountName || "—"}</Field>
                <Field label="Account number"><span className="font-mono">{detail.payoutAccountNumber || "—"}</span></Field>
                <Field label="Bank / provider">{detail.payoutBankName || "—"}</Field>
                <Field label="Ledger entry">{detail.transaction ? <span className="font-mono text-xs">{detail.transaction.id.slice(0, 10)}… ({detail.transaction.type})</span> : "—"}</Field>
                {detail.rejectionReason && <Field label="Rejection reason"><span className="text-destructive">{detail.rejectionReason}</span></Field>}
                {detail.completedAt && <Field label="Completed">{new Date(detail.completedAt).toLocaleString()}</Field>}
                {detail.transactionId && <Field label="Transaction ID"><span className="font-mono">{detail.transactionId}</span></Field>}
              </div>

              <Separator className="bg-border" />

              {/* PENDING → pay out manually, then approve with evidence in one step */}
              {detail.status === "PENDING" && (
                <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">Approve after paying out</div>
                  <p className="text-xs text-muted-foreground">Transfer the money outside the app first. Approving deducts the balance, writes the ledger entry and completes the request — transaction ID and proof screenshot are both required.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="approveTxId">Transaction ID *</Label>
                      <Input id="approveTxId" placeholder="e.g. CBE-8829100" value={txId} onChange={(e) => setTxId(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="approveProof">Completion proof image *</Label>
                      <div className="flex items-center gap-2">
                        <label htmlFor="approveProof" className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 text-xs font-medium text-muted-foreground hover:bg-muted">
                          <Paperclip className="size-3.5" /> {proofFile ? proofFile.name : "Choose image…"}
                        </label>
                        <input
                          id="approveProof"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500" disabled={busy !== "" || !txId.trim() || !proofFile} onClick={() => handleApprove(detail.id)}>
                      {busy === "approve" ? <RefreshCw className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Approve & record payment
                    </Button>
                  </div>
                  <Separator className="bg-border" />
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Rejection reason *</Label>
                    <Textarea placeholder="Reason for rejecting…" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="min-h-16 text-sm" />
                    <Button size="sm" variant="outline" className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10" disabled={busy !== "" || !rejectReason.trim()} onClick={() => handleReject(detail.id)}>
                      {busy === "reject" ? <RefreshCw className="size-4 animate-spin" /> : <XCircle className="size-4" />} Reject & release hold
                    </Button>
                  </div>
                </div>
              )}

              {/* APPROVED → payment record can still be corrected afterwards */}
              {detail.status === "APPROVED" && (
                <div className="space-y-3 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
                  <div className="text-sm font-semibold text-sky-600 dark:text-sky-400">
                    Payment record
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="txId">Transaction ID *</Label>
                      <Input id="txId" placeholder="e.g. CBE-8829100" value={txId} onChange={(e) => setTxId(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="proofFile">Completion proof image (optional)</Label>
                      <div className="flex items-center gap-2">
                        <label htmlFor="proofFile" className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 text-xs font-medium text-muted-foreground hover:bg-muted">
                          <Paperclip className="size-3.5" /> {proofFile ? proofFile.name : "Choose image…"}
                        </label>
                        <input
                          id="proofFile"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500" disabled={busy !== "" || !txId.trim()} onClick={() => handleComplete(detail.id)}>
                      {busy === "complete" ? <RefreshCw className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                      {detail.completedAt ? "Save changes" : "Mark completed"}
                    </Button>
                    {detail.completionProofImagePath && (
                      <Button size="sm" variant="outline" className="gap-1.5 border-border" onClick={() => (showProof ? setShowProof(false) : viewProof(detail.id))}>
                        <ImageIcon className="size-4" /> {showProof ? "Hide proof" : "View payment proof"}
                      </Button>
                    )}
                  </div>
                  {showProof && (
                    proofUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={proofUrl} alt="Completion proof" className="max-h-72 w-full rounded-lg border border-border object-contain" />
                    ) : (
                      <div className="text-xs text-muted-foreground">Loading proof…</div>
                    )
                  )}
                </div>
              )}

              {(detail.status === "REJECTED" || detail.status === "CANCELLED") && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  <XCircle className="size-4" /> This request is {detail.status.toLowerCase()}. No further action available.
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" className="border-border" onClick={closeDetail}>Close</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium text-foreground">{children}</div>
    </div>
  );
}
