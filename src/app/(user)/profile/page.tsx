"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAccessToken, type AuthUser } from "@/lib/auth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Wallet, User, Mail, Calendar, ShieldCheck, ArrowDownCircle, ArrowUpCircle, Activity, Gift, Copy, Users, Landmark, Loader2 } from "lucide-react";

type Transaction = {
  id: string;
  type: string;
  amount: string | number;
  balanceAfter: string | number;
  reference: string | null;
  createdAt: string;
};

const txLabel: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  BET_PLACED: "Bet placed",
  BET_WON: "Bet won",
  BET_REFUND: "Bet refund",
  ADJUSTMENT: "Adjustment",
  REFERRAL_BONUS: "Referral bonus",
};

type ProfileUser = AuthUser & {
  payoutAccountType?: string | null;
  payoutAccountNumber?: string | null;
  payoutAccountUsername?: string | null;
};

export default function UserProfilePage() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [payout, setPayout] = useState({ type: "", number: "", username: "" });
  const [savingPayout, setSavingPayout] = useState(false);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  useEffect(() => {
    const t = token;
    if (!t) return;
    setLoading(true);
    Promise.all([
      api.get<{ data: AuthUser }>("/users/me", t).then((r) => r.data).catch(() => null),
      api.get<{ data: { balance: number | string } }>("/wallet/balance", t).then((r) => Number(r.data.balance)).catch(() => null),
    ])
      .then(([u, b]) => {
        setUser(u);
        setBalance(b);
        if (u) {
          setPayout({
            type: (u as ProfileUser).payoutAccountType ?? "",
            number: (u as ProfileUser).payoutAccountNumber ?? "",
            username: (u as ProfileUser).payoutAccountUsername ?? "",
          });
        }
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    const t = token;
    if (!t) return;
    setTxLoading(true);
    api
      .get<{ data: Transaction[] }>("/wallet/transactions", t)
      .then((r) => setTransactions(r.data ?? []))
      .catch(() => setTransactions([]))
      .finally(() => setTxLoading(false));
  }, [token]);

  const initial = user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "T";
  const payoutReady = Boolean(user?.payoutAccountType && user?.payoutAccountNumber && user?.payoutAccountUsername);

  const savePayout = async () => {
    const t = getAccessToken() ?? token;
    if (!payout.type.trim() || !payout.number.trim() || !payout.username.trim()) {
      toast.error("Fill account type, number and holder name");
      return;
    }
    setSavingPayout(true);
    try {
      const res = await api.patch<{ data: ProfileUser }>(
        "/users/me",
        { payoutAccountType: payout.type.trim(), payoutAccountNumber: payout.number.trim(), payoutAccountUsername: payout.username.trim() },
        t
      );
      setUser(res.data);
      toast.success("Payout account saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save payout account");
    } finally {
      setSavingPayout(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="mt-1 text-sm text-white/60">Your account details and wallet activity.</p>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
        </div>
      ) : (
        <>
          {/* Profile header */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid size-16 place-items-center rounded-2xl bg-primary text-2xl font-black text-white">{initial}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold">{user?.name || "Player"}</h2>
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-light">{user?.role ?? "USER"}</span>
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/60">
                  <Mail className="size-4" /> {user?.email}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-white/50">
                  <ShieldCheck className="size-3.5" /> Verified account
                </p>
              </div>
            </div>
          </div>

          {/* Balance + info grid */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-secondary/30 bg-secondary/10 p-5">
              <div className="flex items-center gap-1.5 text-xs text-secondary">
                <Wallet className="size-4" /> BALANCE
              </div>
              <div className="mt-1 text-3xl font-bold text-white">ETB {(balance ?? 0).toFixed(2)}</div>
              <div className="mt-1 text-xs text-white/50">Available for betting</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-1.5 text-xs text-white/50">
                <User className="size-4" /> NAME
              </div>
              <div className="mt-1 text-lg font-semibold">{user?.name || "—"}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-1.5 text-xs text-white/50">
                <Calendar className="size-4" /> ROLE
              </div>
              <div className="mt-1 text-lg font-semibold">{user?.role || "—"}</div>
            </div>
          </div>

          {/* Payout account */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <Landmark className="size-4 text-secondary" /> Payout account
              </div>
              {payoutReady ? (
                <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-green-400">Ready for withdrawals</span>
              ) : (
                <span className="rounded-full bg-amber-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">Required before withdrawals</span>
              )}
            </div>
            <p className="mt-1 text-xs text-white/50">Where your winnings are sent. Editable anytime — each withdrawal snapshots these details.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Account type</Label>
                <select
                  value={payout.type}
                  onChange={(e) => setPayout({ ...payout, type: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-secondary"
                >
                  <option value="" className="bg-black">Select type</option>
                  {["TELEBIRR", "CBE_BIRR", "AMOLE", "BANK"].map((o) => (
                    <option key={o} value={o} className="bg-black">{o}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Account number</Label>
                <Input value={payout.number} onChange={(e) => setPayout({ ...payout, number: e.target.value })} placeholder="09xxxxxxxx" className="bg-white/5" />
              </div>
              <div className="space-y-1.5">
                <Label>Holder name</Label>
                <Input value={payout.username} onChange={(e) => setPayout({ ...payout, username: e.target.value })} placeholder="Full name on the account" className="bg-white/5" />
              </div>
            </div>
            <Button onClick={savePayout} disabled={savingPayout} className="mt-3 bg-secondary">
              {savingPayout ? <Loader2 className="size-4 animate-spin" /> : null} Save payout account
            </Button>
          </div>

          {/* Referral card */}
          <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-5">
            <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary-light">
              <Gift className="size-4" /> REFER &amp; EARN
            </div>
            <p className="mt-2 text-sm text-white/70">
              Share your link — when a friend signs up and makes their first deposit of <span className="font-semibold text-white">ETB 100+</span>, you get a <span className="font-semibold text-secondary">ETB 50</span> bonus.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                <Users className="size-4 shrink-0 text-white/40" />
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-white/80">
                  {typeof window !== "undefined" && user?.referralCode
                    ? `${window.location.origin}/signup?ref=${user.referralCode}`
                    : user?.referralCode ?? "—"}
                </span>
                <button
                  onClick={() => {
                    if (!user?.referralCode) return;
                    const link = `${window.location.origin}/signup?ref=${user.referralCode}`;
                    navigator.clipboard
                      .writeText(link)
                      .then(() => toast.success("Referral link copied!"))
                      .catch(() => toast.error("Could not copy link"));
                  }}
                  disabled={!user?.referralCode}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:opacity-40"
                >
                  <Copy className="size-3.5" /> Copy
                </button>
              </div>
            </div>
          </div>

          {/* Transactions */}
          <div className="rounded-2xl border border-white/10 bg-white/5">
            <div className="border-b border-white/10 px-5 py-3 text-sm font-semibold">Recent transactions</div>
            {txLoading ? (
              <div className="space-y-2 p-5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-white/40">No transactions yet.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {transactions.slice(0, 10).map((tx) => {
                  const isIn = ["DEPOSIT", "BET_WON", "BET_REFUND", "REFERRAL_BONUS"].includes(tx.type);
                  return (
                    <div key={tx.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                      <div className="flex items-center gap-2.5">
                        {isIn ? (
                          <ArrowDownCircle className="size-4 text-secondary" />
                        ) : (
                          <ArrowUpCircle className="size-4 text-red-400" />
                        )}
                        <div>
                          <div className="font-medium">{txLabel[tx.type] ?? tx.type}</div>
                          <div className="text-xs text-white/40">{new Date(tx.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${isIn ? "text-secondary" : "text-red-400"}`}>
                          {isIn ? "+" : "-"}ETB {Number(tx.amount).toFixed(2)}
                        </div>
                        <div className="text-xs text-white/40">ETB {Number(tx.balanceAfter).toFixed(2)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Link href="/games" className="inline-flex items-center gap-1.5 text-sm text-primary-light hover:underline">
            <Activity className="size-4" /> Browse games to place bets
          </Link>
        </>
      )}
    </div>
  );
}
