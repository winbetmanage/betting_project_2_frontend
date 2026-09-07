"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, API_URL } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Upload, ArrowDownToLine, ArrowUpFromLine, History, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type TransferAccount = { id: string; accountName: string | null; accountNumber: string; bankName: string | null; status: boolean };
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
  createdAt: string;
};

const statusBadge: Record<string, { c: string; t: string }> = {
  PENDING: { c: "bg-yellow-400/15 text-yellow-300 border-yellow-400/20", t: "Pending" },
  APPROVED: { c: "bg-green-500/15 text-green-400 border-green-500/20", t: "Approved" },
  REJECTED: { c: "bg-destructive/15 text-destructive border-destructive/20", t: "Rejected" },
  CANCELLED: { c: "bg-white/10 text-white/60 border-white/10", t: "Cancelled" },
};

export default function UserWalletPage() {
  const [token, setToken] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<TransferAccount[]>([]);
  const [balance, setBalance] = useState<{ balance: number; heldBalance: number; available: number }>({ balance: 0, heldBalance: 0, available: 0 });
  const [requests, setRequests] = useState<FundRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Deposit form
  const [deposit, setDeposit] = useState({ amount: "", transferAccountId: "", senderReference: "" });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [depositing, setDepositing] = useState(false);

  // Withdraw form
  const [withdraw, setWithdraw] = useState({ amount: "", payoutAccountName: "", payoutAccountNumber: "", payoutBankName: "" });
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  useEffect(() => {
    const t = token;
    if (!t) return;
    setLoading(true);
    Promise.all([
      api.get<{ data: TransferAccount[] }>("/transfer-accounts/active", t).then((r) => r.data ?? []).catch(() => []),
      api.get<{ data: typeof balance }>("/funds/balance", t).then((r) => r.data).catch(() => ({ balance: 0, heldBalance: 0, available: 0 })),
      api.get<{ data: FundRequest[] }>("/funds/requests", t).then((r) => r.data ?? []).catch(() => []),
    ])
      .then(([acc, bal, reqs]) => {
        setAccounts(acc.filter((a) => a.status));
        setBalance(bal);
        setRequests(reqs);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleDeposit = async (e: FormEvent) => {
    e.preventDefault();
    if (!deposit.transferAccountId) return toast.error("Select a transfer account");
    const t = getAccessToken() ?? token;
    setDepositing(true);
    try {
      const formData = new FormData();
      formData.append("amount", deposit.amount);
      formData.append("transferAccountId", deposit.transferAccountId);
      if (deposit.senderReference) formData.append("senderReference", deposit.senderReference);
      if (proofFile) formData.append("proofImage", proofFile);

      const base = API_URL;
      const res = await fetch(`${base}/api/v1/funds/deposit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { message?: string }).message || "Deposit failed");
      toast.success("Deposit request submitted");
      setDeposit({ amount: "", transferAccountId: "", senderReference: "" });
      setProofFile(null);
      const r = await api.get<{ data: FundRequest[] }>("/funds/requests", t);
      setRequests(r.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setDepositing(false);
    }
  };

  const handleWithdraw = async (e: FormEvent) => {
    e.preventDefault();
    const t = getAccessToken() ?? token;
    setWithdrawing(true);
    try {
      await api.post("/funds/withdraw", { ...withdraw, amount: Number(withdraw.amount) }, t);
      toast.success("Withdrawal request submitted");
      setWithdraw({ amount: "", payoutAccountName: "", payoutAccountNumber: "", payoutBankName: "" });
      const [bal, r] = await Promise.all([
        api.get<{ data: typeof balance }>("/funds/balance", t).then((x) => x.data),
        api.get<{ data: FundRequest[] }>("/funds/requests", t).then((x) => x.data ?? []),
      ]);
      setBalance(bal);
      setRequests(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setWithdrawing(false);
    }
  };

  const cancelRequest = async (id: string) => {
    const t = getAccessToken() ?? token;
    try {
      await api.post(`/funds/requests/${id}/cancel`, {}, t);
      toast.success("Request cancelled");
      const [bal, r] = await Promise.all([
        api.get<{ data: typeof balance }>("/funds/balance", t).then((x) => x.data),
        api.get<{ data: FundRequest[] }>("/funds/requests", t).then((x) => x.data ?? []),
      ]);
      setBalance(bal);
      setRequests(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="mt-1 text-sm text-white/60">Deposit funds, request withdrawals and track your requests.</p>
      </div>

      {/* Balance */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-secondary/30 bg-secondary/10 p-5">
          <div className="flex items-center gap-1.5 text-xs text-secondary"><Wallet className="size-4" /> AVAILABLE</div>
          <div className="mt-1 text-3xl font-bold text-white">ETB {balance.available.toFixed(2)}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs text-white/50">BALANCE</div>
          <div className="mt-1 text-2xl font-semibold">ETB {balance.balance.toFixed(2)}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs text-white/50">HELD (pending withdrawals)</div>
          <div className="mt-1 text-2xl font-semibold">ETB {balance.heldBalance.toFixed(2)}</div>
        </div>
      </div>

      <Tabs defaultValue="deposit">
        <TabsList>
          <TabsTrigger value="deposit">Deposit</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="deposit">
          <form onSubmit={handleDeposit} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 text-sm font-medium"><ArrowDownToLine className="size-4 text-secondary" /> Deposit Funds</div>
            <div className="space-y-1.5">
              <Label>Amount (min 100)</Label>
              <Input type="number" min="100" step="0.01" value={deposit.amount} onChange={(e) => setDeposit({ ...deposit, amount: e.target.value })} placeholder="100.00" className="bg-white/5" />
            </div>
            <div className="space-y-1.5">
              <Label>Transfer to account</Label>
              <select
                value={deposit.transferAccountId}
                onChange={(e) => setDeposit({ ...deposit, transferAccountId: e.target.value })}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-secondary"
              >
                <option value="" className="bg-black">Select account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} className="bg-black">
                    {a.bankName} • {a.accountNumber} ({a.accountName})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Sender reference (optional)</Label>
              <Input value={deposit.senderReference} onChange={(e) => setDeposit({ ...deposit, senderReference: e.target.value })} placeholder="Your bank transaction ref" className="bg-white/5" />
            </div>
            <div className="space-y-1.5">
              <Label>Proof of payment</Label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-white"
              />
            </div>
            <Button type="submit" disabled={depositing || !deposit.amount || !deposit.transferAccountId} className="bg-secondary">
              {depositing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Submit deposit
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="withdraw">
          <form onSubmit={handleWithdraw} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 text-sm font-medium"><ArrowUpFromLine className="size-4 text-secondary" /> Withdraw Funds</div>
            <div className="space-y-1.5">
              <Label>Amount (min 100)</Label>
              <Input type="number" min="100" step="0.01" value={withdraw.amount} onChange={(e) => setWithdraw({ ...withdraw, amount: e.target.value })} placeholder="100.00" className="bg-white/5" />
            </div>
            <div className="space-y-1.5">
              <Label>Payout account name</Label>
              <Input value={withdraw.payoutAccountName} onChange={(e) => setWithdraw({ ...withdraw, payoutAccountName: e.target.value })} className="bg-white/5" />
            </div>
            <div className="space-y-1.5">
              <Label>Payout account number</Label>
              <Input value={withdraw.payoutAccountNumber} onChange={(e) => setWithdraw({ ...withdraw, payoutAccountNumber: e.target.value })} className="bg-white/5" />
            </div>
            <div className="space-y-1.5">
              <Label>Payout bank name</Label>
              <Input value={withdraw.payoutBankName} onChange={(e) => setWithdraw({ ...withdraw, payoutBankName: e.target.value })} className="bg-white/5" />
            </div>
            <Button type="submit" disabled={withdrawing || !withdraw.amount || !withdraw.payoutAccountNumber} className="bg-primary">
              {withdrawing ? <Loader2 className="size-4 animate-spin" /> : <ArrowUpFromLine className="size-4" />} Request withdrawal
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-2">
            {requests.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/50">
                <History className="mx-auto mb-2 size-8" /> No requests yet
              </div>
            ) : (
              requests.map((r) => {
                const b = statusBadge[r.status] ?? statusBadge.PENDING;
                return (
                  <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-medium">
                        {r.type === "DEPOSIT" ? <ArrowDownToLine className="size-4 text-secondary" /> : <ArrowUpFromLine className="size-4 text-secondary" />}
                        {r.type === "DEPOSIT" ? "Deposit" : "Withdrawal"} — <span className="font-bold">ETB {Number(r.amount).toFixed(2)}</span>
                      </div>
                      <Badge className={b.c}>{b.t}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-white/50">
                      {r.type === "DEPOSIT"
                        ? `${r.transferAccount?.bankName ?? ""} • ${r.transferAccount?.accountNumber ?? ""}`
                        : `${r.payoutBankName} • ${r.payoutAccountNumber}`}
                      {" "}— {new Date(r.createdAt).toLocaleString()}
                    </div>
                    {r.status === "PENDING" && r.type === "WITHDRAWAL" && (
                      <button onClick={() => cancelRequest(r.id)} className="mt-2 text-xs text-red-400 hover:text-red-300">
                        Cancel request
                      </button>
                    )}
                    {r.status === "REJECTED" && r.rejectionReason && (
                      <div className="mt-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">Reason: {r.rejectionReason}</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
