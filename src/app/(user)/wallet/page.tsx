"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, API_URL } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useTranslations } from "next-intl";
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

const statusBadge: Record<string, { c: string; tKey: string }> = {
  PENDING: { c: "bg-yellow-400/15 text-yellow-300 border-yellow-400/20", tKey: "pending" },
  APPROVED: { c: "bg-green-500/15 text-green-400 border-green-500/20", tKey: "approved" },
  REJECTED: { c: "bg-destructive/15 text-destructive border-destructive/20", tKey: "rejected" },
  CANCELLED: { c: "bg-white/10 text-white/60 border-white/10", tKey: "cancelled" },
};

export default function UserWalletPage() {
  const t = useTranslations("wallet");
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
    const tok = token;
    if (!tok) return;
    setLoading(true);
    Promise.all([
      api.get<{ data: TransferAccount[] }>("/transfer-accounts/active", tok).then((r) => r.data ?? []).catch(() => []),
      api.get<{ data: typeof balance }>("/funds/balance", tok).then((r) => r.data).catch(() => ({ balance: 0, heldBalance: 0, available: 0 })),
      api.get<{ data: FundRequest[] }>("/funds/requests", tok).then((r) => r.data ?? []).catch(() => []),
      api.get<{ data: ProfilePayout }>("/users/me", tok).then((r) => r.data).catch(() => null),
      api.get<{ data: { minDeposit: number } }>("/settings/public", tok).then((r) => r.data).catch(() => ({ minDeposit: 100 })),
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
    if (!deposit.transferAccountId) return toast.error(t("selectAccountErr"));
    const tok = getAccessToken() ?? token;
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
        headers: { Authorization: `Bearer ${tok}` },
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { message?: string }).message || t("depositFailed"));
      toast.success(t("depositSubmitted"));
      setDeposit({ amount: "", transferAccountId: "", senderReference: "" });
      setProofFile(null);
      const r = await api.get<{ data: FundRequest[] }>("/funds/requests", tok);
      setRequests(r.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("depositFailed"));
    } finally {
      setDepositing(false);
    }
  };

  const openWithdrawConfirm = (e: FormEvent) => {
    e.preventDefault();
    const amount = Number(withdraw.amount);
    if (!(amount > 0)) return toast.error(t("enterAmount"));
    if (amount < 100) return toast.error(t("minWithdraw"));
    if (balance.available - amount < 100) return toast.error(t("mustRemain", { max: maxWithdrawable.toFixed(2) }));
    if (!withdraw.payoutAccountName.trim() || !withdraw.payoutAccountNumber.trim() || !withdraw.payoutBankName.trim()) {
      return toast.error(t("fillPayout"));
    }
    setConfirmOpen(true);
  };

  const handleWithdraw = async () => {
    const tok = getAccessToken() ?? token;
    setWithdrawing(true);
    try {
      await api.post("/funds/withdraw", { ...withdraw, amount: Number(withdraw.amount) }, tok);
      toast.success(t("withdrawSubmitted"));
      setWithdraw({ amount: "", payoutAccountName: withdraw.payoutAccountName, payoutAccountNumber: withdraw.payoutAccountNumber, payoutBankName: withdraw.payoutBankName });
      setConfirmOpen(false);
      const [bal, r] = await Promise.all([
        api.get<{ data: typeof balance }>("/funds/balance", tok).then((x) => x.data),
        api.get<{ data: FundRequest[] }>("/funds/requests", tok).then((x) => x.data ?? []),
      ]);
      setBalance(bal);
      setRequests(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("withdrawFailed"));
    } finally {
      setWithdrawing(false);
    }
  };

  const cancelRequest = async (id: string) => {
    const tok = getAccessToken() ?? token;
    try {
      await api.post(`/funds/requests/${id}/cancel`, {}, tok);
      toast.success(t("requestCancelled"));
      const [bal, r] = await Promise.all([
        api.get<{ data: typeof balance }>("/funds/balance", tok).then((x) => x.data),
        api.get<{ data: FundRequest[] }>("/funds/requests", tok).then((x) => x.data ?? []),
      ]);
      setBalance(bal);
      setRequests(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("cancelFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("wallet")}</h1>
        <p className="mt-1 text-sm text-white/60">{t("walletSub")}</p>
      </div>

      {/* Balance */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-secondary/30 bg-secondary/10 p-5">
          <div className="flex items-center gap-1.5 text-xs text-secondary"><Wallet className="size-4" /> {t("available")}</div>
          <div className="mt-1 text-3xl font-bold text-white">ETB {balance.available.toFixed(2)}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs text-white/50">{t("balance")}</div>
          <div className="mt-1 text-2xl font-semibold">ETB {balance.balance.toFixed(2)}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs text-white/50">{t("held")}</div>
          <div className="mt-1 text-2xl font-semibold">ETB {balance.heldBalance.toFixed(2)}</div>
        </div>
      </div>

      <Tabs defaultValue="deposit">
        <TabsList>
          <TabsTrigger value="deposit">{t("deposit")}</TabsTrigger>
          <TabsTrigger value="withdraw">{t("withdraw")}</TabsTrigger>
          <TabsTrigger value="history">{t("history")}</TabsTrigger>
        </TabsList>

        <TabsContent value="deposit">
          <form onSubmit={handleDeposit} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 text-sm font-medium"><ArrowDownToLine className="size-4 text-secondary" /> {t("depositFunds")}</div>
            <div className="space-y-1.5">
              <Label>{t("amountMin", { min: minDeposit })}</Label>
              <Input type="number" min={minDeposit} step="0.01" value={deposit.amount} onChange={(e) => setDeposit({ ...deposit, amount: e.target.value })} placeholder="100.00" className="bg-white/5" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("transferTo")}</Label>
              <select
                value={deposit.transferAccountId}
                onChange={(e) => setDeposit({ ...deposit, transferAccountId: e.target.value })}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-secondary"
              >
                <option value="" className="bg-black">{t("selectAccount")}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} className="bg-black">
                    {a.bankName} • {a.accountNumber} ({a.accountName})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("senderRef")}</Label>
              <Input value={deposit.senderReference} onChange={(e) => setDeposit({ ...deposit, senderReference: e.target.value })} placeholder={t("senderRefPh")} className="bg-white/5" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("proof")}</Label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-white"
              />
            </div>
            <Button type="submit" disabled={depositing || !deposit.amount || !deposit.transferAccountId} className="bg-secondary">
              {depositing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} {t("submitDeposit")}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="withdraw">
          {!hasPayoutAccount ? (
            <div className="space-y-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5 text-sm">
              <div className="flex items-center gap-2 font-medium text-amber-300"><ArrowUpFromLine className="size-4" /> {t("setupPayout")}</div>
              <p className="text-white/70">{t("setupPayoutSub")}</p>
              <Button render={<a href="/profile" />} nativeButton={false} className="bg-secondary">{t("goToProfile")}</Button>
            </div>
          ) : (
          <form onSubmit={openWithdrawConfirm} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-2 text-sm font-medium">
              <span className="flex items-center gap-2"><ArrowUpFromLine className="size-4 text-secondary" /> {t("withdrawFunds")}</span>
              <span className="text-xs text-white/50">{t("maxNote", { max: maxWithdrawable.toFixed(2) })}</span>
            </div>
            <div className="space-y-1.5">
              <Label>{t("amountMin100")}</Label>
              <Input type="number" min="100" step="0.01" value={withdraw.amount} onChange={(e) => setWithdraw({ ...withdraw, amount: e.target.value })} placeholder="100.00" className="bg-white/5" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("destAccount")}</Label>
              <div className="space-y-1 rounded-xl border border-white/10 bg-black/20 p-3 font-mono text-xs">
                <div className="flex justify-between gap-3"><span className="text-white/50">{t("holder")}</span><span className="text-right text-white">{withdraw.payoutAccountName || "—"}</span></div>
                <div className="flex justify-between gap-3"><span className="text-white/50">{t("account")}</span><span className="text-right text-white">{withdraw.payoutAccountNumber || "—"}</span></div>
                <div className="flex justify-between gap-3"><span className="text-white/50">{t("bank")}</span><span className="text-right text-white">{withdraw.payoutBankName || "—"}</span></div>
              </div>
              <a href="/profile" className="inline-block text-xs text-primary-light hover:underline">{t("changePayout")}</a>
            </div>
            <Button type="submit" disabled={withdrawing || !withdraw.amount} className="bg-primary">
              {withdrawing ? <Loader2 className="size-4 animate-spin" /> : <ArrowUpFromLine className="size-4" />} {t("reviewWithdrawal")}
            </Button>
          </form>
          )}

          {confirmOpen && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => !withdrawing && setConfirmOpen(false)}>
              <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0a0f2e] p-5 text-sm" onClick={(e) => e.stopPropagation()}>
                <div className="text-base font-bold">{t("confirmWithdrawal")}</div>
                <p className="mt-1 text-xs text-white/50">{t("confirmSub")}</p>
                <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-white/5 p-4 font-mono text-xs">
                  <div className="flex justify-between"><span className="text-white/50">{t("amount")}</span><span className="font-bold text-white">ETB {Number(withdraw.amount || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-white/50">{t("to")}</span><span className="text-right text-white">{withdraw.payoutAccountName}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-white/50">{t("account")}</span><span className="text-right text-white">{withdraw.payoutAccountNumber}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-white/50">{t("bank")}</span><span className="text-right text-white">{withdraw.payoutBankName}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">{t("remaining")}</span><span className="text-white">ETB {(balance.available - Number(withdraw.amount || 0)).toFixed(2)}</span></div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" className="flex-1" disabled={withdrawing} onClick={() => setConfirmOpen(false)}>{t("back")}</Button>
                  <Button className="flex-1 bg-secondary" disabled={withdrawing} onClick={handleWithdraw}>
                    {withdrawing ? <Loader2 className="size-4 animate-spin" /> : t("confirmSubmit")}
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
                <History className="mx-auto mb-2 size-8" /> {t("noRequests")}
              </div>
            ) : (
              requests.map((r) => {
                const b = statusBadge[r.status] ?? statusBadge.PENDING;
                return (
                  <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-medium">
                        {r.type === "DEPOSIT" ? <ArrowDownToLine className="size-4 text-secondary" /> : <ArrowUpFromLine className="size-4 text-secondary" />}
                        {r.type === "DEPOSIT" ? t("depositWord") : t("withdrawalWord")} — <span className="font-bold">ETB {Number(r.amount).toFixed(2)}</span>
                      </div>
                      <Badge className={b.c}>{t(b.tKey)}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-white/50">
                      {r.type === "DEPOSIT"
                        ? `${r.transferAccount?.bankName ?? ""} • ${r.transferAccount?.accountNumber ?? ""}`
                        : `${r.payoutBankName} • ${r.payoutAccountNumber}`}
                      {" "}— {new Date(r.createdAt).toLocaleString()}
                    </div>
                    {r.status === "PENDING" && r.type === "WITHDRAWAL" && (
                      <button onClick={() => cancelRequest(r.id)} className="mt-2 text-xs text-red-400 hover:text-red-300">
                        {t("cancelRequest")}
                      </button>
                    )}
                    {r.status === "REJECTED" && r.rejectionReason && (
                      <div className="mt-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{t("reason")}: {r.rejectionReason}</div>
                    )}
                    {r.type === "WITHDRAWAL" && r.status === "APPROVED" && (
                      <div className="mt-2 space-y-0.5 text-xs text-white/50">
                        {r.reviewedAt && <div>{t("reviewed")}: {new Date(r.reviewedAt).toLocaleString()}</div>}
                        {r.completedAt && <div>{t("paid")}: {new Date(r.completedAt).toLocaleString()}</div>}
                        {r.transactionId && <div>{t("ref")}: <span className="font-mono text-white/70">{r.transactionId}</span></div>}
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
