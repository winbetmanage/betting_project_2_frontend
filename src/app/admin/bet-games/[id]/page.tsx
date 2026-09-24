"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TeamLogo, LeagueLogo } from "@/components/TeamLogo";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Trophy,
  Users,
  Wallet,
  CircleDollarSign,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Calculator,
  Activity,
  Eye,
  ReceiptText,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BetReceiptDialog, type ReceiptData } from "@/components/bets/BetReceipt";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SPINNER = "/assets/custom/infinite-spinner.svg";

type Leg = { id: string; selectionId: string; selectionName: string; marketName: string; marketType: string; odds: number; result: string };
type SettleBet = {
  id: string;
  type: string;
  stake: number;
  totalOdds: number;
  potentialPayout: number;
  status: string;
  projectedResult: string;
  projectedPayout: number;
  payoutStatus: string;
  settledPayout: number;
  placedAt: string;
  settledAt: string | null;
  user: { id: string; email: string; name: string | null } | null;
  legs: Leg[];
};
type SettlementMarket = {
  id: string;
  name: string;
  type: string;
  status: string;
  parameters: { marketKey?: string; line?: number | null } | null;
  selections: { id: string; name: string; odds: number; isWinning: boolean | null; provisional: boolean | null }[];
};
type Settlement = {
  game: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    startTime: string;
    status: string;
    isPublished: boolean;
    externalEventId: string | null;
    lastOddsFetchAt: string | null;
    competition: { id: string; name: string; country: string | null; sport: string | null } | null;
  };
  result: { finished: boolean; matchStatus: string; homeFT: number | null; awayFT: number | null; homeHT: number | null; awayHT: number | null; winner: string | null; source: string };
  canSettle: boolean;
  settleableMarkets: string[];
  manualMarkets: string[];
  bets: SettleBet[];
  markets: SettlementMarket[];
  totals: { totalStaked: number; projectedPayout: number; paidOut: number; profit: number };
  counts: { total: number; pending: number; won: number; lost: number; void: number };
};
type FootballDetails = {
  game: { id: string; homeTeam: string; awayTeam: string; status: string };
  matchId: number | null;
  fetched: boolean;
  match: { status?: string; score?: { fullTime?: { home: number | null; away: number | null }; halfTime?: { home: number | null; away: number | null }; winner?: string | null } } | null;
  storedScore: { footballDataMatchId: number; winner: string | null; duration: string; homeScoreHT: number; awayScoreHT: number; homeScoreFT: number; awayScoreFT: number; status: string; fetchedAt: string } | null;
};

const betStatusStyle: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
  WON: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  LOST: "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400",
  VOID: "bg-muted text-muted-foreground border-border",
  UNKNOWN: "bg-muted text-muted-foreground border-border",
};
const payoutStyle: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground border-border",
  SUBMITTED: "bg-sky-500/15 text-sky-600 border-sky-500/30 dark:text-sky-400",
  PAID: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
};

function money(n: number): string {
  return (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function BetGameSettlementPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [marking, setMarking] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [settlingBetId, setSettlingBetId] = useState<string | null>(null);
  const [settleConfirmOpen, setSettleConfirmOpen] = useState(false);
  const [ticketBet, setTicketBet] = useState<ReceiptData | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Settlement }>(`/games/${id}/settlement`, getAccessToken() ?? token);
      setData(res.data);
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Failed to load settlement");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSettle = async () => {
    setSettleConfirmOpen(false);
    setSettling(true);
    try {
      const res = await api.post<{ message: string; data: Settlement }>(`/games/${id}/settle-payments`, {}, getAccessToken() ?? token);
      toast.success(res.message || "Winners paid");
      setData(res.data);
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Settle failed");
    } finally {
      setSettling(false);
    }
  };

  const handlePayout = async (payoutStatus: "PAID" | "SUBMITTED") => {
    setMarking(true);
    try {
      const res = await api.post<{ message: string; data: Settlement }>(`/games/${id}/payout`, { payoutStatus }, getAccessToken() ?? token);
      toast.success(res.message || `Payout marked ${payoutStatus}`);
      setData(res.data);
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Payout update failed");
    } finally {
      setMarking(false);
    }
  };

  // Grades this game's legs + marks lost tickets (no money movement).
  const recalculate = async () => {
    setCalculating(true);
    try {
      const res = await api.post<{
        message: string;
        data: Settlement & { meta?: { legsGraded: number; betsMarkedLost: number; profit: number } };
      }>(`/games/${id}/calculate`, {}, getAccessToken() ?? token);
      setData(res.data);
      const m = res.data.meta;
      const c = res.data.counts;
      toast.success(
        `${res.message} • now ${c.total} bets: ${c.won} won · ${c.lost} lost · ${c.void} void (graded ${m?.legsGraded ?? 0} legs)`
      );
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Calculate failed");
    } finally {
      setCalculating(false);
    }
  };

  const handleSettleSingle = async (betId: string) => {
    setSettlingBetId(betId);
    try {
      const res = await api.post<{ message: string; data: Settlement }>(`/games/${id}/bets/${betId}/settle`, {}, getAccessToken() ?? token);
      toast.success(res.message || "Bet settled");
      setData(res.data);
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Settle failed");
    } finally {
      setSettlingBetId(null);
    }
  };

  const [gradingLegId, setGradingLegId] = useState<string | null>(null);

  // Manual per-leg grading for markets with no data feed (corners/cards):
  // declares the selection's outcome; every ticket holding it re-grades at once.
  const handleGradeLeg = async (leg: Leg, isWinning: boolean | null) => {
    setGradingLegId(leg.id);
    try {
      await api.post(`/markets/selections/${leg.selectionId}/settle`, { isWinning }, getAccessToken() ?? token);
      toast.success(`${leg.selectionName} marked ${isWinning === null ? "PUSH" : isWinning ? "WON" : "LOST"}`);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Grading failed");
    } finally {
      setGradingLegId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SPINNER} alt="Loading" className="size-10" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm font-medium">Settlement unavailable</p>
        <Button render={<Link href="/admin/bet-games" />} variant="outline" className="mt-4" nativeButton={false}>
          Back to Bet Games
        </Button>
      </div>
    );
  }

  const g = data.game;
  const pendingToPay = Math.max(0, data.totals.projectedPayout - data.totals.paidOut);
  const winners = data.bets.filter((b) => b.status === "WON" || b.projectedResult === "WON");
  const hasPaidBets = data.bets.some((b) => b.status === "WON" && b.payoutStatus !== "PENDING");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/admin/bet-games" />} nativeButton={false} className="gap-1">
          <ArrowLeft className="size-4" /> Bet Games
        </Button>
        <Badge variant="outline" className="font-mono text-xs">{g.id.slice(0, 8)}…</Badge>
        <Button size="sm" variant="outline" className="ml-auto gap-1.5 border-primary/20 text-primary hover:bg-primary/10" disabled={calculating} onClick={recalculate}>
          {calculating ? <RefreshCw className="size-4 animate-spin" /> : <Calculator className="size-4" />} Calculate
        </Button>
      </div>

      {/* Game header */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary via-primary to-[#0a0f2e] p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-white text-primary border-white/20">{g.competition?.sport ?? "—"}</Badge>
          <Badge variant="outline" className="flex items-center gap-1.5 border-white/20 bg-white/10 text-white">
            <LeagueLogo league={g.competition?.name} className="size-4" /> {g.competition?.name ?? "—"}
          </Badge>
          <Badge className="bg-white/15 text-white border-white/20">{g.status}</Badge>
          {data.result.finished ? (
            <Badge className="bg-white text-emerald-600 border-white/20"><CheckCircle2 className="mr-1 size-3" /> Result available</Badge>
          ) : data.result.homeFT != null && data.result.awayFT != null ? (
            <Badge className="bg-amber-400 text-amber-900 border-white/20"><Activity className="mr-1 size-3" /> Live {data.result.homeFT}-{data.result.awayFT}</Badge>
          ) : null}
        </div>
        <h1 className="mt-3 flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight">
          <span className="flex items-center gap-2"><TeamLogo name={g.homeTeam} className="size-8 rounded-full bg-white/15" />{g.homeTeam}</span>
          <span className="font-normal opacity-60">vs</span>
          <span className="flex items-center gap-2">{g.awayTeam}<TeamLogo name={g.awayTeam} className="size-8 rounded-full bg-white/15" /></span>
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/80">
          <span className="flex items-center gap-1"><Clock className="size-4" /> {new Date(g.startTime).toLocaleString()}</span>
          <span className="flex items-center gap-1 text-xs text-white/70" title={g.lastOddsFetchAt ? new Date(g.lastOddsFetchAt).toLocaleString() : "Odds have never been fetched for this game"}>
            <RefreshCw className="size-3.5" />
            {g.lastOddsFetchAt ? `Odds updated ${new Date(g.lastOddsFetchAt).toLocaleString()} (${timeAgo(g.lastOddsFetchAt)})` : "Odds never fetched"}
          </span>
          {data.result.homeFT != null && data.result.awayFT != null && (
            <span className={`flex items-center gap-2 rounded-lg px-2.5 py-1 font-mono ${data.result.finished ? "bg-white/15" : "bg-amber-400 text-amber-900"}`}>
              {data.result.finished ? <Trophy className="size-4" /> : <Activity className="size-4" />} {data.result.homeFT} - {data.result.awayFT}
              {data.result.winner && <span className="text-xs opacity-80">({data.result.winner})</span>}
              {!data.result.finished && <span className="text-xs">LIVE</span>}
            </span>
          )}
        </div>
      </div>

      {/* Game score — show for finished OR live (when a score is available) */}
      {data.result.homeFT != null && data.result.awayFT != null && (
        <Card className="border-emerald-500/30 bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className={`flex items-center gap-2 ${data.result.finished ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>{data.result.finished ? <Trophy className="size-5" /> : <Activity className="size-5" />} {data.result.finished ? "Final Score" : "Live Score"}</CardTitle>
              <CardDescription>
                {data.result.finished ? "Final result" : "Active result"} • source: <span className="font-mono">{data.result.source}</span> • match status: <span className="font-mono">{data.result.matchStatus}</span>
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 border-primary/20 text-primary hover:bg-primary/10" disabled={calculating} onClick={recalculate}>
              {calculating ? <RefreshCw className="size-4 animate-spin" /> : <Calculator className="size-4" />} Calculate
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-4 sm:gap-10">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <TeamLogo name={g.homeTeam} className="size-12 sm:size-14" />
                <span className="max-w-full truncate text-center text-sm font-bold">{g.homeTeam}</span>
                {data.result.winner === "HOME" && (
                  <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Winner</Badge>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-center gap-1">
                <span className="rounded-xl bg-[#0a0f2e] px-4 py-2 font-mono text-3xl font-black text-white shadow-md sm:text-4xl">
                  {data.result.homeFT}<span className="mx-2 text-white/40">-</span>{data.result.awayFT}
                </span>
                {data.result.homeHT != null && (
                  <span className="text-xs text-muted-foreground">Half-time {data.result.homeHT} - {data.result.awayHT}</span>
                )}
                <Badge variant="outline" className="mt-0.5 border-border text-[10px]">
                  {data.result.winner === "HOME" ? `${g.homeTeam} won` : data.result.winner === "AWAY" ? `${g.awayTeam} won` : data.result.winner === "DRAW" ? "Draw" : data.result.matchStatus}
                </Badge>
              </div>
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <TeamLogo name={g.awayTeam} className="size-12 sm:size-14" />
                <span className="max-w-full truncate text-center text-sm font-bold">{g.awayTeam}</span>
                {data.result.winner === "AWAY" && (
                  <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Winner</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settlement actions + totals */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wallet className="size-5 text-primary" /> Settlement</CardTitle>
          <CardDescription>
            {data.result.finished
              ? "Result is in from football-data. Calculate grades this game's legs and marks lost tickets (other games' legs untouched, no money moved). Settle payment credits the winners and notifies them."
              : "Settlement unlocks once the match is finished. The 10-minute job refreshes status automatically."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total staked" value={`ETB ${money(data.totals.totalStaked)}`} tone="neutral" icon={<CircleDollarSign className="size-4" />} />
            <Stat label="Total to pay" value={`ETB ${money(data.totals.projectedPayout)}`} tone="warn" icon={<Wallet className="size-4" />} />
            <Stat label="Paid out" value={`ETB ${money(data.totals.paidOut)}`} tone="good" icon={<CheckCircle2 className="size-4" />} />
            <Stat label="Profit" value={`ETB ${money(data.totals.profit)}`} tone={data.totals.profit >= 0 ? "good" : "bad"} icon={<Trophy className="size-4" />} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {data.canSettle ? (
              <Button onClick={() => setSettleConfirmOpen(true)} disabled={settling} className="gap-2 bg-primary">
                {settling ? <RefreshCw className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Settle payment
              </Button>
            ) : data.result.finished ? (
              <Badge variant="outline" className="border-secondary/30 text-secondary">
                <CheckCircle2 className="mr-1 size-3" /> All bets settled{data.manualMarkets.length ? " (some markets need manual settle)" : ""}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-muted text-muted-foreground">
                <Clock className="mr-1 size-3" /> Waiting for final result
              </Badge>
            )}

            {data.counts.won > 0 && pendingToPay > 0 && (
              <Button variant="outline" className="gap-1.5 border-sky-500/30 text-sky-600 dark:text-sky-400" disabled={marking} onClick={() => handlePayout("PAID")}>
                {marking ? <RefreshCw className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Mark payouts as paid
              </Button>
            )}
            {data.counts.won > 0 && !hasPaidBets && pendingToPay > 0 && (
              <Button variant="outline" className="gap-1.5 border-white/10 text-muted-foreground" disabled={marking} onClick={() => handlePayout("SUBMITTED")}>
                <Clock className="size-4" /> Mark submitted
              </Button>
            )}
            <Button variant="outline" className="ml-auto border-white/10" disabled={loading} onClick={load}>
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Reload
            </Button>
          </div>

          {data.result.source !== "none" && (
            <div className="text-xs text-muted-foreground">Result source: <span className="font-mono">{data.result.source}</span> • match status: <span className="font-mono">{data.result.matchStatus}</span></div>
          )}
          {data.settleableMarkets.length > 0 && (
            <div className="text-xs text-muted-foreground">Auto-settleable: <span className="text-foreground">{data.settleableMarkets.join(", ")}</span></div>
          )}
          {data.manualMarkets.length > 0 && (
            <div className="text-xs text-amber-600 dark:text-amber-400">Needs manual settlement: {data.manualMarkets.join(", ")}</div>
          )}
        </CardContent>
      </Card>

      {/* Settle-payment confirmation */}
      <Dialog open={settleConfirmOpen} onOpenChange={(o) => { if (!o) setSettleConfirmOpen(false); }}>
        <DialogContent className="sm:max-w-[440px] bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" /> Settle payment?
            </DialogTitle>
            <DialogDescription className="text-sm">
              <span className="block space-y-2">
                <span className="block">
                  This grades every pending ticket on <span className="font-semibold">{data.game.homeTeam} vs {data.game.awayTeam}</span>, credits the winners from the house balance and sends each winner a notification. Losers are notified of nothing.
                </span>
                {(() => {
                  const payable = data.bets.filter((b) => b.status === "PENDING" && (b.projectedResult === "WON" || b.projectedResult === "VOID"));
                  const total = payable.reduce((a, b) => a + b.projectedPayout, 0);
                  return (
                    <span className="block rounded-lg border border-border bg-muted/40 p-3">
                      <span className="flex justify-between"><span className="text-muted-foreground">Tickets to pay</span><span className="font-semibold">{payable.length}</span></span>
                      <span className="flex justify-between"><span className="text-muted-foreground">Total payout</span><span className="font-bold text-emerald-600 dark:text-emerald-400">ETB {money(total)}</span></span>
                    </span>
                  );
                })()}
                <span className="block text-xs text-muted-foreground">Tickets on markets needing manual settlement stay pending. This cannot be undone.</span>
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleConfirmOpen(false)} disabled={settling}>
              Cancel
            </Button>
            <Button onClick={handleSettle} disabled={settling} className="bg-primary">
              {settling ? "Paying..." : "Confirm & pay winners"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Football details — accordion, contracted by default; expands on tap */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="pt-0">
          <Accordion type="single" collapsible>
            <AccordionItem value="details" className="border-0">
              <AccordionTrigger className="py-3 text-sm font-medium">
                <span className="flex items-center gap-2"><Eye className="size-4 text-primary" /> Show details — football-data & markets breakdown</span>
              </AccordionTrigger>
              <AccordionContent>
                <SettlementDetailsPanel gameId={id} data={data} token={token} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Winners */}
      {winners.length > 0 && (
        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400"><Users className="size-5" /> Who wins ({winners.length})</CardTitle>
            <CardDescription>Total payable to winners: ETB {money(data.totals.projectedPayout)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {winners.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/20 bg-card px-3 py-2 text-sm">
                <span className="truncate font-medium">{b.user?.name || b.user?.email || "Unknown"}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">stake {money(b.stake)} @ {b.totalOdds.toFixed(2)}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">+ETB {money(b.status === "WON" ? (b.settledPayout || b.potentialPayout) : b.projectedPayout)}</span>
                  <Badge variant="outline" className={payoutStyle[b.payoutStatus]}>{b.payoutStatus}</Badge>
                </div>
              </div>
            ))}
            <Separator className="bg-emerald-500/20" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pending to pay</span>
              <span className="font-semibold text-foreground">ETB {money(pendingToPay)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All bets */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-5 text-primary" /> Bets placed
            <Badge variant="secondary" className="ml-1 border-primary/20 bg-primary/15 text-primary">{data.counts.total}</Badge>
          </CardTitle>
          <CardDescription>
            {data.counts.pending} pending • {data.counts.won} won • {data.counts.lost} lost • {data.counts.void} void
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {data.bets.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No bets placed on this game yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="admin-cards">
                <TableHeader className="bg-primary">
                  <TableRow className="hover:bg-primary border-primary">
                    <TableHead className="text-white text-xs tracking-widest">USER</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">SELECTIONS</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">MARKET TYPE</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">STAKE</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">ODDS</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">STATUS</TableHead>
                    <TableHead className="text-right text-white text-xs tracking-widest">PAYOUT</TableHead>
                    <TableHead className="text-right text-white text-xs tracking-widest">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.bets.map((b) => (
                    <TableRow key={b.id} className="border-border hover:bg-muted/50">
                      <TableCell>
                        <div className="text-sm font-medium truncate max-w-[160px]">{b.user?.name || b.user?.email || "Unknown"}</div>
                        <div className="text-[11px] text-muted-foreground">{new Date(b.placedAt).toLocaleString()}</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          {b.legs.length > 1 && (
                            <Badge variant="secondary" className="mb-1 w-fit border-primary/30 bg-primary/15 text-[10px] text-primary">
                              PARLAY · {b.legs.length} legs
                            </Badge>
                          )}
                          {b.legs.map((l) => (
                            <div key={l.id} className="flex items-center gap-1.5 text-xs">
                              <span className="truncate max-w-[150px]">{l.selectionName}</span>
                              <span className="font-mono text-muted-foreground">{l.odds.toFixed(2)}</span>
                              <Badge
                                variant="outline"
                                className={`shrink-0 text-[9px] ${
                                  l.result === "WON"
                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : l.result === "LOST"
                                      ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"
                                      : l.result === "VOID"
                                        ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                        : "border-border text-muted-foreground"
                                }`}
                              >
                                {l.result === "WON" ? "WON" : l.result === "LOST" ? "LOST" : l.result === "VOID" ? "PUSH" : "PENDING"}
                              </Badge>
                              {l.result === "PENDING" && (
                                <span className="flex shrink-0 items-center gap-0.5" title="Grade this leg manually (for markets with no data feed)">
                                  <button
                                    disabled={gradingLegId === l.id}
                                    onClick={() => handleGradeLeg(l, true)}
                                    className="grid size-5 place-items-center rounded border border-emerald-500/40 text-[9px] font-bold text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-50 dark:text-emerald-400"
                                  >
                                    W
                                  </button>
                                  <button
                                    disabled={gradingLegId === l.id}
                                    onClick={() => handleGradeLeg(l, false)}
                                    className="grid size-5 place-items-center rounded border border-red-500/40 text-[9px] font-bold text-red-600 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
                                  >
                                    L
                                  </button>
                                  <button
                                    disabled={gradingLegId === l.id}
                                    onClick={() => handleGradeLeg(l, null)}
                                    className="grid size-5 place-items-center rounded border border-amber-500/40 text-[9px] font-bold text-amber-600 hover:bg-amber-500/10 disabled:opacity-50 dark:text-amber-400"
                                  >
                                    V
                                  </button>
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {b.legs.map((l) => (
                            <Badge key={l.id} variant="outline" className="w-fit border-border text-[10px] text-muted-foreground" title={l.marketName}>
                              {l.marketType.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">ETB {money(b.stake)}</TableCell>
                      <TableCell className="font-mono text-sm">{b.totalOdds.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={betStatusStyle[b.status] ?? betStatusStyle.PENDING}>{b.status}</Badge>
                        {b.legs.length > 1 && (() => {
                          const w = b.legs.filter((l) => l.result === "WON").length;
                          const l = b.legs.filter((l) => l.result === "LOST").length;
                          const v = b.legs.filter((l) => l.result === "VOID").length;
                          const p = b.legs.length - w - l - v;
                          return (
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              {w > 0 && <span className="text-emerald-600 dark:text-emerald-400">{w} won</span>}
                              {w > 0 && (l + v + p > 0) && " · "}
                              {l > 0 && <span className="font-semibold text-red-600 dark:text-red-400">{l} lost</span>}
                              {l > 0 && (v + p > 0) && " · "}
                              {v > 0 && <span className="text-amber-600 dark:text-amber-400">{v} push</span>}
                              {v > 0 && p > 0 && " · "}
                              {p > 0 && <span>{p} pending</span>}
                              {l > 0 && <div className="text-red-600 dark:text-red-400">a lost leg kills the ticket</div>}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm font-semibold">{b.status === "WON" ? `ETB ${money(b.settledPayout || b.potentialPayout)}` : b.status === "PENDING" ? <span className="text-muted-foreground">—</span> : b.status === "VOID" ? `ETB ${money(b.settledPayout || b.stake)}` : <span className="text-muted-foreground">0.00</span>}</div>
                        {b.status === "WON" && <Badge variant="outline" className={`mt-1 ${payoutStyle[b.payoutStatus] ?? ""}`}>{b.payoutStatus}</Badge>}
                        {b.status === "PENDING" && b.projectedResult !== "UNKNOWN" && (
                          <div className="mt-1 text-[10px] text-muted-foreground">Provisional: {b.projectedResult} {b.projectedResult === "WON" ? `ETB ${money(b.projectedPayout)}` : ""}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1"
                            onClick={() => {
                              const g = data.game;
                              setTicketBet({
                                id: b.id,
                                type: b.legs.length > 1 ? "MULTIPLE" : "SINGLE",
                                legs: b.legs.map((l) => ({
                                  gameLabel: `${g.homeTeam} vs ${g.awayTeam}`,
                                  marketName: l.marketName,
                                  selectionName: l.selectionName,
                                  odds: Number(l.odds),
                                  result: l.result,
                                })),
                                stake: Number(b.stake),
                                totalOdds: Number(b.totalOdds),
                                potentialPayout: Number(b.potentialPayout),
                                status: b.status,
                                settledPayout: Number(b.settledPayout ?? 0) || null,
                                placedAt: b.placedAt,
                                settledAt: b.settledAt,
                              });
                            }}
                          >
                            <ReceiptText className="size-3.5" /> Ticket
                          </Button>
                        {b.status === "PENDING" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                            disabled={!!settlingBetId || !data.result.finished}
                            title={!data.result.finished ? "Game not finished yet" : b.projectedResult === "UNKNOWN" ? "Market needs manual settlement" : "Settle this bet only"}
                            onClick={() => handleSettleSingle(b.id)}
                          >
                            {settlingBetId === b.id ? <RefreshCw className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
                            Settle
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {!data.result.finished && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>Settlement is calculated from the football-data match result once the game is finished. This page updates after the 10-minute status sync or when you press Reload.</span>
        </div>
      )}

      <BetReceiptDialog
        open={!!ticketBet}
        onOpenChange={(o) => { if (!o) setTicketBet(null); }}
        data={ticketBet}
        confirmLabel="Close"
        cancelLabel=""
        showPrint
        onConfirm={() => setTicketBet(null)}
      />
    </div>
  );
}

function Stat({ label, value, tone, icon }: { label: string; value: string; tone: "neutral" | "good" | "bad" | "warn"; icon: React.ReactNode }) {
  const toneClass =
    tone === "good" ? "text-emerald-600 dark:text-emerald-400" :
    tone === "bad" ? "text-red-600 dark:text-red-400" :
    tone === "warn" ? "text-amber-600 dark:text-amber-400" : "text-foreground";
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className={`mt-1 text-lg font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

function SettlementDetailsPanel({ gameId, data, token }: { gameId: string; data: Settlement; token: string | null }) {
  const [details, setDetails] = useState<FootballDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<{ data: FootballDetails }>(`/games/${gameId}/football-details`, getAccessToken() ?? token)
      .then((res) => {
        if (!cancelled) setDetails(res.data);
      })
      .catch((e) => {
        if (!cancelled) toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Failed to load football details");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, token]);

  if (loading) {
    return (
      <div className="grid place-items-center py-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SPINNER} alt="Loading" className="size-8" />
      </div>
    );
  }
  if (!details) return <div className="py-4 text-sm text-muted-foreground">Football-data details unavailable.</div>;

  const hasScore = data.result.homeFT != null && data.result.awayFT != null;
  const htHome = data.result.homeHT ?? details.storedScore?.homeScoreHT ?? details.match?.score?.halfTime?.home ?? null;
  const htAway = data.result.awayHT ?? details.storedScore?.awayScoreHT ?? details.match?.score?.halfTime?.away ?? null;
  const ftHome = data.result.homeFT ?? details.storedScore?.homeScoreFT ?? details.match?.score?.fullTime?.home ?? null;
  const ftAway = data.result.awayFT ?? details.storedScore?.awayScoreFT ?? details.match?.score?.fullTime?.away ?? null;
  const status = details.match?.status ?? details.storedScore?.status ?? data.result.matchStatus;

  return (
    <div className="space-y-4">
      {hasScore ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Half-time</div>
              <div className="mt-1 font-mono text-lg font-bold">{htHome != null && htAway != null ? `${htHome} — ${htAway}` : "—"}</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Full-time {data.result.finished ? "(final)" : "(current)"}</div>
              <div className="mt-1 font-mono text-lg font-bold">{ftHome != null && ftAway != null ? `${ftHome} — ${ftAway}` : "—"}</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">Match status: <span className="font-mono text-foreground">{status}</span>{details.fetched ? " • live fetch" : " • stored"} • source: <span className="font-mono">{data.result.source}</span></div>
        </>
      ) : (
        <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><Clock className="size-4" /> Not started yet — no goals registered. Winning/losing status will appear once the game starts.</span>
          <div className="mt-1 text-xs">Match status: <span className="font-mono">{status}</span></div>
        </div>
      )}

      {/* Markets breakdown */}
      <div>
        <h4 className="mb-2 text-sm font-semibold">
          Betting markets {hasScore ? `— ${data.result.finished ? "final" : "live"} result breakdown` : "— added markets and points"}
        </h4>
        {data.markets.length === 0 ? (
          <div className="text-sm text-muted-foreground">No markets added for this game.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm admin-cards">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left text-xs">Market</th>
                  <th className="p-2 text-left text-xs">Point</th>
                  <th className="p-2 text-left text-xs">Selections</th>
                </tr>
              </thead>
              <tbody>
                {data.markets.map((m) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="p-2">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.type.replace(/_/g, " ")} • {m.status}</div>
                    </td>
                    <td className="p-2 font-mono text-xs">{m.parameters?.line != null ? String(m.parameters.line) : "—"}</td>
                    <td className="p-2">
                      <div className="space-y-1">
                        {m.selections.map((s) => {
                          let badge: React.ReactNode = "—";
                          let cls = "border-border text-muted-foreground";
                          if (s.isWinning === true) {
                            badge = "Winning";
                            cls = "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
                          } else if (s.isWinning === false) {
                            badge = "Losing";
                            cls = "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400";
                          } else if (hasScore && s.provisional === true) {
                            badge = "Winning";
                            cls = "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
                          } else if (hasScore && s.provisional === false) {
                            badge = "Losing";
                            cls = "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400";
                          } else if (hasScore && s.provisional === null && (m.type === "HANDICAP" || m.type === "OVER_UNDER") && m.parameters?.line != null && Number.isInteger(m.parameters.line)) {
                            badge = "Push";
                            cls = "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
                          }
                          return (
                            <div key={s.id} className="flex items-center gap-2 text-xs">
                              <span className="min-w-0 flex-1">{s.name} <span className="font-mono text-muted-foreground">@ {s.odds.toFixed(2)}</span></span>
                              <Badge variant="outline" className={`text-[10px] ${cls}`}>{badge}</Badge>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {hasScore && (
          <div className="mt-2 text-xs text-muted-foreground">
            Status is based on the current {data.result.finished ? "final" : "live"} score only {data.result.finished ? "— press Settle to move the money." : "— it updates with the score sync and is not settled yet."}
          </div>
        )}
      </div>
    </div>
  );
}
