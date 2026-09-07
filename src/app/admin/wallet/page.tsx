"use client";

import { useEffect, useState } from "react";
import { api, API_URL } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, XCircle, Eye, Loader2 } from "lucide-react";

type TransferAccount = { id: string; accountName: string | null; accountNumber: string; bankName: string | null };
type FundRequest = {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: string | number;
  status: string;
  transferAccount: TransferAccount | null;
  proofImagePath: string | null;
  senderReference: string | null;
  payoutAccountName: string | null;
  payoutAccountNumber: string | null;
  payoutBankName: string | null;
  rejectionReason: string | null;
  reviewedBy: { email: string } | null;
  createdAt: string;
  user: { id: string; email: string; name: string | null };
};

const statusBadge: Record<string, { c: string; t: string }> = {
  PENDING: { c: "bg-yellow-400/15 text-yellow-300 border-yellow-400/20", t: "Pending" },
  APPROVED: { c: "bg-green-500/15 text-green-400 border-green-500/20", t: "Approved" },
  REJECTED: { c: "bg-destructive/15 text-destructive border-destructive/20", t: "Rejected" },
  CANCELLED: { c: "bg-white/10 text-white/60 border-white/10", t: "Cancelled" },
};

export default function AdminWalletPage() {
  const [token, setToken] = useState<string | null>(null);
  const [requests, setRequests] = useState<FundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<FundRequest | null>(null);
  const [proofOpen, setProofOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofLoading, setProofLoading] = useState(false);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  const load = async () => {
    const t = getAccessToken() ?? token;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await api.get<{ data: FundRequest[] }>(`/funds/admin/requests?${params.toString()}`, t);
      setRequests(res.data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, typeFilter, statusFilter]);

  const approve = async (id: string) => {
    const t = getAccessToken() ?? token;
    setBusy(true);
    try {
      await api.post(`/funds/admin/requests/${id}/approve`, {}, t);
      toast.success("Request approved");
      setSelected(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!selected) return;
    const t = getAccessToken() ?? token;
    setBusy(true);
    try {
      await api.post(`/funds/admin/requests/${selected.id}/reject`, { reason: rejectReason }, t);
      toast.success("Request rejected");
      setRejectOpen(false);
      setSelected(null);
      setRejectReason("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy(false);
    }
  };

  const openProof = async (r: FundRequest) => {
    setSelected(r);
    setProofOpen(true);
    setProofUrl(null);
    setProofLoading(true);
    const t = getAccessToken() ?? token;
    try {
      const base = API_URL;
      const res = await fetch(`${base}/api/v1/funds/requests/${r.id}/proof`, {
        headers: { Authorization: `Bearer ${t}` },
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

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Wallet className="size-3.5" /> Wallet
        </div>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Wallet className="size-6 text-primary" /> Fund Requests
        </h1>
        <p className="text-sm text-muted-foreground">Review deposit and withdrawal requests. Approve or reject with a reason.</p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">Requests</CardTitle>
          <CardDescription>Filter by type and status</CardDescription>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter((v as string) ?? "all")}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="DEPOSIT">Deposits</SelectItem>
                <SelectItem value="WITHDRAWAL">Withdrawals</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v as string) ?? "all")}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="border-primary/20 text-primary ml-auto">{requests.length} shown</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center py-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
            </div>
          ) : requests.length === 0 ? (
            <div className="py-14 text-center text-sm text-muted-foreground">No fund requests found.</div>
          ) : (
            <div className="divide-y divide-border">
              {requests.map((r) => {
                const b = statusBadge[r.status] ?? statusBadge.PENDING;
                return (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-medium">
                        {r.type === "DEPOSIT" ? <ArrowDownToLine className="size-4 text-secondary" /> : <ArrowUpFromLine className="size-4 text-secondary" />}
                        {r.type === "DEPOSIT" ? "Deposit" : "Withdrawal"} — <span className="font-bold">${Number(r.amount).toFixed(2)}</span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {r.user.email} • {new Date(r.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={b.c}>{b.t}</Badge>
                      {r.type === "DEPOSIT" && r.proofImagePath && (
                        <Button size="sm" variant="outline" className="h-8" onClick={() => openProof(r)}>
                          <Eye className="size-3.5" /> Proof
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-8" onClick={() => setSelected(r)}>
                        Review
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review dialog */}
      <Dialog open={!!selected && !proofOpen} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-[520px] bg-card">
          <DialogHeader>
            <DialogTitle>Review Fund Request</DialogTitle>
            <DialogDescription>Approve or reject this {selected?.type === "DEPOSIT" ? "deposit" : "withdrawal"}.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">User</span><span>{selected.user.email}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold">${Number(selected.amount).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{selected.type}</span></div>
              {selected.type === "DEPOSIT" ? (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Transfer account</span><span>{selected.transferAccount?.bankName} • {selected.transferAccount?.accountNumber}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Sender reference</span><span>{selected.senderReference ?? "—"}</span></div>
                  {selected.proofImagePath && (
                    <div>
                      <Button size="sm" variant="outline" onClick={() => openProof(selected)}><Eye className="size-3.5" /> View proof image</Button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Payout name</span><span>{selected.payoutAccountName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Payout number</span><span>{selected.payoutAccountNumber}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Payout bank</span><span>{selected.payoutBankName}</span></div>
                </>
              )}
              {selected.status !== "PENDING" && (
                <div className="rounded-lg bg-muted p-3 text-xs">
                  {selected.status === "APPROVED" ? "Already approved." : selected.status === "REJECTED" ? `Rejected: ${selected.rejectionReason ?? "no reason"}` : "Cancelled."}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            {selected?.status === "PENDING" && (
              <>
                <Button variant="destructive" onClick={() => { setRejectOpen(true); setSelected(selected); }} disabled={busy}>
                  <XCircle className="size-4" /> Reject
                </Button>
                <Button onClick={() => approve(selected.id)} disabled={busy} className="bg-secondary">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-[420px] bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><XCircle className="size-5 text-destructive" /> Reject Request?</DialogTitle>
            <DialogDescription>Provide a reason the user will see.</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection..." rows={3} className="bg-muted" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="destructive" onClick={reject} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : "Reject"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proof image dialog */}
      <Dialog open={proofOpen} onOpenChange={setProofOpen}>
        <DialogContent className="sm:max-w-[560px] bg-card">
          <DialogHeader>
            <DialogTitle>Proof of payment</DialogTitle>
            <DialogDescription>Deposit receipt uploaded by the user.</DialogDescription>
          </DialogHeader>
          {selected?.proofImagePath ? (
            proofLoading ? (
              <div className="flex h-64 items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
              </div>
            ) : proofUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={proofUrl} alt="Proof" className="w-full rounded-lg border border-border bg-muted object-contain" />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Could not load proof.</p>
            )
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No proof image.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setProofOpen(false); setSelected(null); setProofUrl(null); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
