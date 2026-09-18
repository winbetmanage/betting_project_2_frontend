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
  reviewedAt: string | null;
  transactionId: string | null;
  completedAt: string | null;
  createdAt: string;
};

type ProfilePayout = { payoutAccountType?: string | null; payoutAccountNumber?: string | null; payoutAccountUsername?: string | null };

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
  const [hasPayoutAccount, setHasPayoutAccount] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [minDeposit, setMinDeposit] = useState(100);

  const maxWithdrawable = Math.max(0, Math.floor((balance.available - 100) * 100) / 100);

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
      api.get<{ data: ProfilePayout }>("/users/me", t).then((r) => r.data).catch(() => null),
      api.get<{ data: { minDeposit: number } }>("/settings/public", t).then((r) => r.data).catch(() => ({ minDeposit: 100 })),
    ])
      .then(([acc, bal, reqs, me, limits]) => {
        setAccounts(acc.filter((a) => a.status));
        setBalance(bal);
        setRequests(reqs);
        if (limits && Number(limits.minDeposit) > 0) setMinDeposit(Number(limits.minDeposit));
        const ready = Boolean(me?.payoutAccountType && me?.payoutAccountNumber && me?.payoutAccountUsername);
        setHasPayoutAccount(ready);
        if (ready) {
          setWithdraw((w) => ({
            ...w,
            payoutAccountName: w.payoutAccountName || me!.payoutAccountUsername || "",
            payoutAccountNumber: w.payoutAccountNumber || me!.payoutAccountNumber || "",
            payoutBankName: w.payoutBankName || me!.payoutAccountType || "",
          }));
        }
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

  const openWithdrawConfirm = (e: FormEvent) => {
    e.preventDefault();
    const amount = Number(withdraw.amount);
    if (!(amount > 0)) return toast.error("Enter an amount");
    if (amount < 100) return toast.error("Minimum withdrawal is ETB 100");
    if (balance.available - amount < 100) return toast.error(`ETB 100 must remain — max you can request is ETB ${maxWithdrawable.toFixed(2)}`);
    if (!withdraw.payoutAccountName.trim() || !withdraw.payoutAccountNumber.trim() || !withdraw.payoutBankName.trim()) {
      return toast.error("Fill all payout account fields (or set them up in your profile)");
    }
    setConfirmOpen(true);
  };

  const handleWithdraw = async () => {
    const t = getAccessToken() ?? token;
    setWithdrawing(true);
    try {
      await api.post("/funds/withdraw", { ...withdraw, amount: Number(withdraw.amount) }, t);
      toast.success("Withdrawal request submitted");
      setWithdraw({ amount: "", payoutAccountName: withdraw.payoutAccountName, payoutAccountNumber: withdraw.payoutAccountNumber, payoutBankName: withdraw.payoutBankName });
      setConfirmOpen(false);
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
              <Label>Amount (min {minDeposit})</Label>
              <Input type="number" min={minDeposit} step="0.01" value={deposit.amount} onChange={(e) => setDeposit({ ...deposit, amount: e.target.value })} placeholder="100.00" className="bg-white/5" />
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
          {!hasPayoutAccount ? (
            <div className="space-y-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5 text-sm">
              <div className="flex items-center gap-2 font-medium text-amber-300"><ArrowUpFromLine className="size-4" /> Set up your payout account first</div>
              <p className="text-white/70">Withdrawals are sent to the payout account on your profile. Add it once, then come back here.</p>
              <Button render={<a href="/profile" />} nativeButton={false} className="bg-secondary">Go to profile setup</Button>
            </div>
          ) : (
          <form onSubmit={openWithdrawConfirm} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-2 text-sm font-medium">
              <span className="flex items-center gap-2"><ArrowUpFromLine className="size-4 text-secondary" /> Withdraw Funds</span>
              <span className="text-xs text-white/50">Max: ETB {maxWithdrawable.toFixed(2)} (ETB 100 stays)</span>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (min 100)</Label>
              <Input type="number" min="100" step="0.01" value={withdraw.amount} onChange={(e) => setWithdraw({ ...withdraw, amount: e.target.value })} placeholder="100.00" className="bg-white/5" />
            </div>
            <div className="space-y-1.5">
              <Label>Destination account (from your profile)</Label>
              <div className="space-y-1 rounded-xl border border-white/10 bg-black/20 p-3 font-mono text-xs">
                <div className="flex justify-between gap-3"><span className="text-white/50">HOLDER</span><span className="text-right text-white">{withdraw.payoutAccountName || "—"}</span></div>
                <div className="flex justify-between gap-3"><span className="text-white/50">ACCOUNT</span><span className="text-right text-white">{withdraw.payoutAccountNumber || "—"}</span></div>
                <div className="flex justify-between gap-3"><span className="text-white/50">BANK</span><span className="text-right text-white">{withdraw.payoutBankName || "—"}</span></div>
              </div>
              <a href="/profile" className="inline-block text-xs text-primary-light hover:underline">Change payout account in profile</a>
            </div>
            <Button type="submit" disabled={withdrawing || !withdraw.amount} className="bg-primary">
              {withdrawing ? <Loader2 className="size-4 animate-spin" /> : <ArrowUpFromLine className="size-4" />} Review withdrawal
            </Button>
          </form>
          )}

          {confirmOpen && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => !withdrawing && setConfirmOpen(false)}>
              <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0a0f2e] p-5 text-sm" onClick={(e) => e.stopPropagation()}>
                <div className="text-base font-bold">Confirm withdrawal</div>
                <p className="mt-1 text-xs text-white/50">Check the amount and destination before submitting. Funds are held immediately.</p>
                <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-white/5 p-4 font-mono text-xs">
                  <div className="flex justify-between"><span className="text-white/50">AMOUNT</span><span className="font-bold text-white">ETB {Number(withdraw.amount || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-white/50">TO</span><span className="text-right text-white">{withdraw.payoutAccountName}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-white/50">ACCOUNT</span><span className="text-right text-white">{withdraw.payoutAccountNumber}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-white/50">BANK</span><span className="text-right text-white">{withdraw.payoutBankName}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">REMAINING</span><span className="text-white">ETB {(balance.available - Number(withdraw.amount || 0)).toFixed(2)}</span></div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" className="flex-1" disabled={withdrawing} onClick={() => setConfirmOpen(false)}>Back</Button>
                  <Button className="flex-1 bg-secondary" disabled={withdrawing} onClick={handleWithdraw}>
                    {withdrawing ? <Loader2 className="size-4 animate-spin" /> : "Confirm & submit"}
                  </Button>
                </div>
              </div>
            </div>
          )}
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
                    {r.type === "WITHDRAWAL" && r.status === "APPROVED" && (
                      <div className="mt-2 space-y-0.5 text-xs text-white/50">
                        {r.reviewedAt && <div>Reviewed: {new Date(r.reviewedAt).toLocaleString()}</div>}
                        {r.completedAt && <div>Paid: {new Date(r.completedAt).toLocaleString()}</div>}
                        {r.transactionId && <div>Ref: <span className="font-mono text-white/70">{r.transactionId}</span></div>}
                      </div>
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
