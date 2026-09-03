"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAccessToken, getUser, type AuthUser } from "@/lib/auth";
import { toast } from "sonner";
import { Wallet, User, Mail, Calendar, ShieldCheck, ArrowDownCircle, ArrowUpCircle, Activity } from "lucide-react";

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
};

export default function UserProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="mt-1 text-sm text-white/60">Your account details and wallet activity.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
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
              <div className="mt-1 text-3xl font-bold text-white">${(balance ?? 0).toFixed(2)}</div>
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
                  const isIn = ["DEPOSIT", "BET_WON", "BET_REFUND"].includes(tx.type);
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
                          {isIn ? "+" : "-"}${Number(tx.amount).toFixed(2)}
                        </div>
                        <div className="text-xs text-white/40">${Number(tx.balanceAfter).toFixed(2)}</div>
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
