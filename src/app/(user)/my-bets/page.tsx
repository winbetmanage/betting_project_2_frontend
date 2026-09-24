"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BetReceiptDialog, type ReceiptData } from "@/components/bets/BetReceipt";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Ticket,
  Clock,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Wallet,
  RefreshCw,
  TrendingUp,
  ReceiptText,
} from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";

type BetSelection = {
  id: string;
  oddsAtPlacement: string | number;
  result: string;
  selection: {
    id: string;
    name: string;
    odds: string | number;
    isWinning: boolean | null;
    market: {
      name: string;
      type: string;
      game: {
        id: string;
        homeTeam: string;
        awayTeam: string;
        startTime: string;
        status: string;
      } | null;
    } | null;
  };
};

type Bet = {
  id: string;
  type: string;
  stake: string | number;
  totalOdds: string | number;
  potentialPayout: string | number;
  settledPayout?: string | number;
  status: string;
  placedAt: string;
  settledAt: string | null;
  selections: BetSelection[];
};

const statusConfig: Record<string, { key: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { key: "pendingF", cls: "bg-yellow-400/15 text-yellow-300 border-yellow-400/20", icon: Clock },
  WON: { key: "wonF", cls: "bg-green-500/15 text-green-400 border-green-500/20", icon: CheckCircle2 },
  LOST: { key: "lostF", cls: "bg-destructive/15 text-destructive border-destructive/20", icon: XCircle },
  VOID: { key: "voidF", cls: "bg-white/10 text-white/60 border-white/10", icon: MinusCircle },
  CASHED_OUT: { key: "cashedOut", cls: "bg-sky-500/15 text-sky-300 border-sky-500/20", icon: RefreshCw },
};

export default function MyBetsPage() {
  const t = useTranslations("bets");
  const [token, setToken] = useState<string | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [receiptBet, setReceiptBet] = useState<ReceiptData | null>(null);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api
      .get<{ data: Bet[] }>("/bets/mine", token)
      .then((r) => setBets(r.data ?? []))
      .catch((e) => toast.error(e instanceof ApiError ? e.message : t("loadFailed")))
      .finally(() => setLoading(false));
  }, [token, t]);

  const visible = bets
    .filter((b) => filter === "ALL" || b.status === filter)
    .filter((b) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return b.selections.some((s) =>
        `${s.selection.market?.game?.homeTeam ?? ""} ${s.selection.market?.game?.awayTeam ?? ""}`
          .toLowerCase()
          .includes(q)
      );
    });

  const stats = {
    total: bets.length,
    pending: bets.filter((b) => b.status === "PENDING").length,
    won: bets.filter((b) => b.status === "WON").length,
    lost: bets.filter((b) => b.status === "LOST").length,
  };

  const staked = bets.reduce((sum, b) => sum + Number(b.stake), 0);
  const returned = bets.filter((b) => b.status === "WON").reduce((sum, b) => sum + Number(b.potentialPayout), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("myBets")}</h1>
        <p className="mt-1 text-sm text-white/60">{t("myBetsSub")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-1.5 text-xs text-white/50"><Ticket className="size-4" /> {t("totalBets")}</div>
          <div className="mt-1 text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4">
          <div className="flex items-center gap-1.5 text-xs text-yellow-300"><Clock className="size-4" /> {t("pending")}</div>
          <div className="mt-1 text-2xl font-bold">{stats.pending}</div>
        </div>
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4">
          <div className="flex items-center gap-1.5 text-xs text-green-400"><CheckCircle2 className="size-4" /> {t("won")}</div>
          <div className="mt-1 text-2xl font-bold">{stats.won}</div>
        </div>
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-center gap-1.5 text-xs text-destructive"><XCircle className="size-4" /> {t("lost")}</div>
          <div className="mt-1 text-2xl font-bold">{stats.lost}</div>
        </div>
      </div>

      {/* Total staked / returned */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-primary/15 to-transparent p-4 text-sm">
        <span className="flex items-center gap-1.5 text-white/60">
          <Wallet className="size-4" /> {t("totalStaked")}: <span className="font-bold text-white">ETB {staked.toFixed(2)}</span>
        </span>
        <span className="flex items-center gap-1.5 text-white/60">
          <TrendingUp className="size-4" /> {t("totalReturned")}: <span className="font-bold text-secondary">ETB {returned.toFixed(2)}</span>
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={filter} onValueChange={(v) => setFilter(v ?? "ALL")}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
            <SelectItem value="PENDING">{t("pendingF")}</SelectItem>
            <SelectItem value="WON">{t("wonF")}</SelectItem>
            <SelectItem value="LOST">{t("lostF")}</SelectItem>
            <SelectItem value="VOID">{t("voidF")}</SelectItem>
            <SelectItem value="CASHED_OUT">{t("cashedOut")}</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder={t("searchTeams")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs"
        />
      </div>

      {/* Bet list */}
      {loading ? (
        <div className="grid place-items-center py-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
        </div>
      ) : visible.length === 0 ? (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <Ticket className="size-10 text-white/20" />
            <p className="mt-3 text-sm font-medium">{t("noBets")}</p>
            <p className="text-xs text-muted-foreground">{t("noBetsSub")}</p>
            <Button render={<Link href="/games" />} className="mt-4" nativeButton={false}>
              {t("browseGames")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((bet) => {
            const st = statusConfig[bet.status] ?? statusConfig.PENDING;
            const StIcon = st.icon;
            const receipt: ReceiptData = {
              id: bet.id,
              type: bet.type === "SINGLE" ? "SINGLE" : "MULTIPLE",
              legs: bet.selections.map((s) => ({
                gameLabel: s.selection.market?.game ? `${s.selection.market.game.homeTeam} vs ${s.selection.market.game.awayTeam}` : "Game removed",
                marketName: s.selection.market?.name ?? "Market",
                selectionName: s.selection.name,
                odds: Number(s.oddsAtPlacement),
                result: s.result,
              })),
              stake: Number(bet.stake),
              totalOdds: Number(bet.totalOdds),
              potentialPayout: Number(bet.potentialPayout),
              status: bet.status,
              settledPayout: bet.settledPayout != null ? Number(bet.settledPayout) : null,
              placedAt: bet.placedAt,
              settledAt: bet.settledAt,
            };
            return (
              <div
                key={bet.id}
                role="button"
                tabIndex={0}
                onClick={() => setReceiptBet(receipt)}
                onKeyDown={(e) => { if (e.key === "Enter") setReceiptBet(receipt); }}
                className="cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:border-primary/40"
              >
                {/* Bet header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Badge className={`gap-1 border ${st.cls}`}>
                        <StIcon className="size-3" /> {t(st.key)}
                      </Badge>
                      <span className="text-xs text-white/50">
                        {bet.type === "SINGLE" ? t("single") : t("multipleLegs", { n: bet.selections.length })} · {new Date(bet.placedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="hidden text-[11px] text-white/40 sm:inline">{t("viewReceipt")}</span>
                    <ReceiptText className="size-4 text-white/40" />
                    <span className="font-mono text-[11px] text-white/30">#{bet.id.slice(0, 8)}</span>
                  </div>
                </div>

                {/* Selections */}
                <div className="divide-y divide-white/5">
                  {bet.selections.map((s) => {
                    const game = s.selection.market?.game;
                    const legWon = s.result === "WON";
                    const legLost = s.result === "LOST";
                    return (
                      <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          {game ? (
                            <div className="flex items-center gap-2">
                              <TeamLogo name={game.homeTeam} className="size-5" />
                              <span className="truncate text-xs text-white/70">
                                {game.homeTeam} vs {game.awayTeam}
                              </span>
                              <TeamLogo name={game.awayTeam} className="size-5" />
                            </div>
                          ) : (
                            <span className="text-xs text-white/40">{t("gameRemoved")}</span>
                          )}
                          <div className="mt-1 flex items-center gap-2 text-[11px]">
                            <span className="font-medium text-white/90">{s.selection.name}</span>
                            <span className="text-white/40">• {s.selection.market?.name ?? "Market"}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold ${legWon ? "text-green-400" : legLost ? "text-destructive" : "text-white/80"}`}>
                            {Number(s.oddsAtPlacement).toFixed(2)}
                          </div>
                          <div className="text-[10px] text-white/40">{legWon ? t("wonLeg") : legLost ? t("lostLeg") : t("pendingLeg")}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bet footer: stake / odds / payout */}
                <div className="grid grid-cols-3 gap-2 border-t border-white/10 bg-black/20 px-4 py-2.5 text-center">
                  <div>
                    <div className="text-[10px] tracking-wide text-white/40">{t("stake")}</div>
                    <div className="text-sm font-bold">ETB {Number(bet.stake).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-wide text-white/40">{t("totalOdds")}</div>
                    <div className="text-sm font-bold text-primary-light">{Number(bet.totalOdds).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-wide text-white/40">{bet.status === "WON" ? t("paidOut") : t("potential")}</div>
                    <div className={`text-sm font-bold ${bet.status === "WON" ? "text-green-400" : "text-secondary"}`}>
                      ETB {Number(bet.potentialPayout).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BetReceiptDialog
        open={!!receiptBet}
        onOpenChange={(o) => { if (!o) setReceiptBet(null); }}
        data={receiptBet}
        confirmLabel={t("close")}
        cancelLabel=""
        onConfirm={() => setReceiptBet(null)}
      />
    </div>
  );
}
