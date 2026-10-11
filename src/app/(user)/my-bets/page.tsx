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
import RoleGate from "@/components/auth/RoleGate";

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

/**
 * Whole-ticket status derived from legs (not per-game):
 * - any leg LOST -> ticket LOST (even if stored status is still PENDING)
 * - all non-void legs WON -> ticket WON
 * - all legs VOID -> VOID
 * - otherwise (no lost leg, games still remaining) -> PENDING
 */
function ticketStatus(bet: Bet): string {
  const results = (bet.selections ?? []).map((s) => (s.result ?? "PENDING").toUpperCase());
  if (results.length === 0) return (bet.status ?? "PENDING").toUpperCase();
  if (results.some((r) => r === "LOST")) return "LOST";
  const nonVoid = results.filter((r) => r !== "VOID");
  if (nonVoid.length > 0 && nonVoid.every((r) => r === "WON")) return "WON";
  if (results.every((r) => r === "VOID")) return "VOID";
  if (results.every((r) => r === "CASHED_OUT")) return "CASHED_OUT";
  return "PENDING";
}

/** Actual amount the user won on a WON ticket (settled payout wins over potential). */
function wonAmount(bet: Bet): number {
  if (bet.settledPayout != null) return Number(bet.settledPayout);
  return Number(bet.potentialPayout);
}

function MyBetsPageInner() {
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
    .filter((b) => filter === "ALL" || ticketStatus(b) === filter)
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
    pending: bets.filter((b) => ticketStatus(b) === "PENDING").length,
    won: bets.filter((b) => ticketStatus(b) === "WON").length,
    lost: bets.filter((b) => ticketStatus(b) === "LOST").length,
  };

  const staked = bets.reduce((sum, b) => sum + Number(b.stake), 0);
  const returned = bets.filter((b) => ticketStatus(b) === "WON").reduce((sum, b) => sum + wonAmount(b), 0);

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

      {/* Ticket list — one row per ticket, tap to open full ticket */}
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
        <div className="space-y-2">
          {visible.map((bet) => {
            const derived = ticketStatus(bet);
            const st = statusConfig[derived] ?? statusConfig.PENDING;
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
              status: derived,
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
                className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-primary/40"
              >
                {/* Left: date + ticket info */}
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15">
                    <Ticket className="size-5 text-primary-light" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {new Date(bet.placedAt).toLocaleString()}
                    </div>
                    <div className="truncate text-xs text-white/50">
                      {bet.type === "SINGLE" ? t("single") : t("multipleLegs", { n: bet.selections.length })} · <span className="font-mono">#{bet.id.slice(0, 8)}</span>
                    </div>
                  </div>
                </div>
                {/* Right: status + money (won only) */}
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                  {derived === "WON" && (
                    <span className="text-sm font-bold text-green-400">
                      ETB {wonAmount(bet).toFixed(2)}
                    </span>
                  )}
                  <Badge className={`gap-1 border ${st.cls}`}>
                    <StIcon className="size-3" /> {t(st.key)}
                  </Badge>
                  <ReceiptText className="size-4 text-white/40" />
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

export default function MyBetsPage() {
  return (
    <RoleGate roles={["USER", "ADMIN", "AGENT"]} guestPrompt loading="Checking your session...">
      <MyBetsPageInner />
    </RoleGate>
  );
}
