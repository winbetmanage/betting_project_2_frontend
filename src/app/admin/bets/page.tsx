"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BetReceiptDialog, type ReceiptData } from "@/components/bets/BetReceipt";
import { Ticket, ReceiptText } from "lucide-react";

type Bet = {
  id: string;
  type: string;
  stake: string | number;
  totalOdds: string | number;
  potentialPayout: string | number;
  status: string;
  payoutStatus?: string;
  placedAt: string;
  user: { id: string; name: string | null; email: string } | null;
};

type BetDetail = Bet & {
  settledPayout?: string | number | null;
  settledAt?: string | null;
  selections: {
    oddsAtPlacement: string | number;
    result: string;
    selection: {
      name: string;
      market: { name: string; game: { homeTeam: string; awayTeam: string } | null } | null;
    };
  }[];
};

const statusStyle: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
  WON: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  LOST: "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400",
  VOID: "bg-muted text-muted-foreground border-border",
  CASHED_OUT: "bg-primary/10 text-primary border-primary/30",
};

const payoutStyle: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground border-border",
  SUBMITTED: "bg-sky-500/15 text-sky-600 border-sky-500/30 dark:text-sky-400",
  PAID: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
};

export default function AdminBetsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptBet, setReceiptBet] = useState<ReceiptData | null>(null);
  const [receiptLoading, setReceiptLoading] = useState<string | null>(null);

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

  const openReceipt = async (betId: string) => {
    const t = getAccessToken() ?? token;
    setReceiptLoading(betId);
    try {
      const res = await api.get<{ data: BetDetail }>(`/bets/${betId}`, t);
      const b = res.data;
      setReceiptBet({
        id: b.id,
        type: b.type,
        legs: (b.selections ?? []).map((s) => ({
          gameLabel: s.selection.market?.game
            ? `${s.selection.market.game.homeTeam} vs ${s.selection.market.game.awayTeam}`
            : "Game removed",
          marketName: s.selection.market?.name ?? "Market",
          selectionName: s.selection.name,
          odds: Number(s.oddsAtPlacement),
          result: s.result,
        })),
        stake: Number(b.stake),
        totalOdds: Number(b.totalOdds),
        potentialPayout: Number(b.potentialPayout),
        status: b.status,
        settledPayout: b.settledPayout != null ? Number(b.settledPayout) : null,
        placedAt: b.placedAt,
        settledAt: b.settledAt ?? null,
      });
    } catch {
      setReceiptBet(null);
    } finally {
      setReceiptLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Ticket className="size-6 text-primary" /> Bets
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Review all bets placed on the platform.</p>
        </div>
        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
          {bets.length} total
        </Badge>
      </div>

      {loading ? (
        <div className="grid place-items-center py-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
        </div>
      ) : bets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bets placed yet.</p>
      ) : (
        <div className="space-y-2">
          {bets.map((bet) => (
            <div
              key={bet.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">{bet.user?.email ?? "Unknown user"}</div>
                <div className="text-xs text-muted-foreground">{new Date(bet.placedAt).toLocaleString()}</div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-foreground">
                <span className="text-muted-foreground">{bet.type} bet</span>
                <span>Stake <span className="font-semibold">${Number(bet.stake).toFixed(2)}</span></span>
                <span>Odds <span className="font-mono">{Number(bet.totalOdds).toFixed(2)}</span></span>
                <span>Payout <span className="font-semibold">${Number(bet.potentialPayout).toFixed(2)}</span></span>
                <Badge variant="outline" className={statusStyle[bet.status] ?? "bg-muted text-muted-foreground border-border"}>
                  {bet.status}
                </Badge>
                {bet.payoutStatus && (
                  <Badge variant="outline" className={payoutStyle[bet.payoutStatus] ?? "bg-muted text-muted-foreground border-border"}>
                    {bet.payoutStatus}
                  </Badge>
                )}
                <Button size="sm" variant="outline" className="h-8" onClick={() => openReceipt(bet.id)} disabled={receiptLoading === bet.id}>
                  <ReceiptText className="size-3.5" /> {receiptLoading === bet.id ? "Loading..." : "Receipt"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <BetReceiptDialog
        open={!!receiptBet}
        onOpenChange={(o) => { if (!o) setReceiptBet(null); }}
        data={receiptBet}
        confirmLabel="Close"
        cancelLabel=""
        showPrint
        onConfirm={() => setReceiptBet(null)}
      />
    </div>
  );
}
