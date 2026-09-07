"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type Bet = {
  id: string;
  type: string;
  stake: string | number;
  totalOdds: string | number;
  potentialPayout: string | number;
  status: string;
  placedAt: string;
  user: { id: string; name: string | null; email: string } | null;
};

const statusColor: Record<string, string> = {
  PENDING: "bg-yellow-400/15 text-yellow-300",
  WON: "bg-secondary/15 text-secondary border border-secondary/20",
  LOST: "bg-red-400/15 text-red-300",
  VOID: "bg-white/10 text-white/60",
  CASHED_OUT: "bg-primary/15 text-primary-light border border-primary/20",
};

export default function AdminBetsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  useEffect(() => {
    api
      .get<{ data: Bet[] }>("/bets", token)
      .then((res) => setBets(res.data ?? []))
      .catch(() => setBets([]))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bets</h1>
        <p className="mt-1 text-sm text-white/60">Review all bets placed on the platform.</p>
      </div>

      {loading ? (
        <div className="grid place-items-center py-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
        </div>
      ) : bets.length === 0 ? (
        <p className="text-sm opacity-60">No bets placed yet.</p>
      ) : (
        <div className="space-y-2">
          {bets.map((bet) => (
            <div
              key={bet.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
            >
              <div>
                <div className="font-medium">{bet.user?.email ?? "Unknown user"}</div>
                <div className="text-xs text-white/50">{new Date(bet.placedAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-4 text-white/70">
                <span>{bet.type} bet</span>
                <span>Stake ${Number(bet.stake).toFixed(2)}</span>
                <span>Odds {Number(bet.totalOdds).toFixed(2)}</span>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${statusColor[bet.status] ?? "bg-white/10 text-white/60"}`}
                >
                  {bet.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}