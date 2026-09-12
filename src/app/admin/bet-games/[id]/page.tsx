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
  XCircle,
  Clock,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Calculator,
  ChevronDown,
  Activity,
  Eye,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const SPINNER = "/assets/custom/infinite-spinner.svg";

type Leg = { id: string; selectionName: string; marketName: string; marketType: string; odds: number; result: string };
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

export default function BetGameSettlementPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [marking, setMarking] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [details, setDetails] = useState<FootballDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [settlingBetId, setSettlingBetId] = useState<string | null>(null);

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
    setSettling(true);
    try {
      const res = await api.post<{ message: string; data: Settlement }>(`/games/${id}/settle`, {}, getAccessToken() ?? token);
      toast.success(res.message || "Game settled");
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

  // Re-evaluates the FULL page (result + every bet's win/lose + totals) from the current game score
  // and persists Selection.isWinning for markets that can be resolved from the result.
  const recalculate = async () => {
    setCalculating(true);
    try {
      const res = await api.post<{
        message: string;
        data: Settlement & { meta?: { resultFinished: boolean; marketsResolved: number; selectionsUpdated: number } };
      }>(`/games/${id}/calculate`, {}, getAccessToken() ?? token);
      setData(res.data);
      const c = res.data.counts;
      const m = res.data.meta;
      toast.success(
        m?.resultFinished
          ? `${res.message} • ${c.total} bets: ${c.won} won · ${c.lost} lost · ${c.void} void · pay ETB ${res.data.totals.projectedPayout.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
          : "Calculated — game not finished yet"
      );
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Calculate failed");
    } finally {
      setCalculating(false);
    }
  };

  const toggleDetails = async (open: boolean) => {
    setDetailsOpen(open);
    if (open && !details && !detailsLoading) {
      setDetailsLoading(true);
      try {
        const res = await api.get<{ data: FootballDetails }>(`/games/${id}/football-details`, getAccessToken() ?? token);
        setDetails(res.data);
      } catch (e) {
        toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Failed to load football details");
      } finally {
        setDetailsLoading(false);
      }
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
              ? "Result is in from football-data. Settle to credit winners, then mark payouts as paid."
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
              <Button onClick={handleSettle} disabled={settling} className="gap-2 bg-primary">
                {settling ? <RefreshCw className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Settle &amp; credit winners
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

      {/* Football details — accordion, contracted by default */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="pt-0">
          <Accordion type="single" collapsible>
            <AccordionItem value="details" className="border-0">
              <AccordionTrigger
                className="py-3 text-sm font-medium"
                onClick={() => {
                  const willOpen = !detailsOpen;
                  toggleDetails(willOpen);
                }}
              >
                <span className="flex items-center gap-2"><Eye className="size-4 text-primary" /> Show details — football-data & markets breakdown</span>
              </AccordionTrigger>
              <AccordionContent>
                {detailsLoading ? (
                  <div className="grid place-items-center py-8"><img src={SPINNER} alt="Loading" className="size-8" /></div>
                ) : !details ? (
                  <div className="py-4 text-sm text-muted-foreground">Press Show details to fetch live football-data.</div>
                ) : (
                  <div className="space-y-4">
                    {/* Score snapshot */}
                    {(() => {
                      const isNotStarted = !data.result.finished && data.result.homeFT == null && data.result.awayFT == null && (data.result.matchStatus === "SCHEDULED" || data.result.matchStatus === "TIMED" || details.match?.status === "TIMED" || details.match?.status === "SCHEDULED");
                      if (isNotStarted) return <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">Not started yet — no goals registered.</div>;
                      const htHome = data.result.homeHT ?? details.storedScore?.homeScoreHT ?? details.match?.score?.halfTime?.home ?? null;
                      const htAway = data.result.awayHT ?? details.storedScore?.awayScoreHT ?? details.match?.score?.halfTime?.away ?? null;
                      const ftHome = data.result.homeFT ?? details.storedScore?.homeScoreFT ?? details.match?.score?.fullTime?.home ?? null;
                      const ftAway = data.result.awayFT ?? details.storedScore?.awayScoreFT ?? details.match?.score?.fullTime?.away ?? null;
                      const status = details.match?.status ?? details.storedScore?.status ?? data.result.matchStatus;
                      return (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-border p-3">
                              <div className="text-xs text-muted-foreground">Half-time</div>
                              <div className="mt-1 font-mono text-lg font-bold">{htHome != null && htAway != null ? `${htHome} — ${htAway}` : "—"}</div>
                            </div>
                            <div className="rounded-lg border border-border p-3">
                              <div className="text-xs text-muted-foreground">Full-time {data.result.finished ? "(final)" : "(live)"}</div>
                              <div className="mt-1 font-mono text-lg font-bold">{ftHome != null && ftAway != null ? `${ftHome} — ${ftAway}` : "—"}</div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">Match status: <span className="font-mono text-foreground">{status}</span>{details.fetched ? " • live fetch" : " • stored"} • source: <span className="font-mono">{data.result.source}</span></div>
                        </>
                      );
                    })()}

                    {/* Markets breakdown */}
                    <div>
                      <h4 className="mb-2 text-sm font-semibold">Betting markets — provisional {data.result.finished ? "final" : "live"} result</h4>
                      {data.markets.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No markets added for this game.</div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="w-full text-sm">
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
                                  <td className="p-2"><div className="font-medium">{m.name}</div><div className="text-xs text-muted-foreground">{m.type.replace(/_/g, " ")} • {m.status}</div></td>
                                  <td className="p-2 font-mono text-xs">{m.parameters?.line != null ? String(m.parameters.line) : "—"}</td>
                                  <td className="p-2">
                                    <div className="space-y-1">
                                      {m.selections.map((s) => {
                                        const isPush = s.provisional === null && m.type === "HANDICAP" && s.provisional !== undefined ? false : false;
                                        // provisional: true=winning, false=losing, null=push/void or undecided
                                        const hasScore = data.result.homeFT != null && data.result.awayFT != null;
                                        let badge: React.ReactNode;
                                        let cls = "border-border text-muted-foreground";
                                        if (!hasScore) { badge = "—"; cls="border-border text-muted-foreground"; }
                                        else if (s.provisional === true) { badge = "Winning"; cls="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"; }
                                        else if (s.provisional === false) { badge = "Losing"; cls="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"; }
                                        else if (s.provisional === null) {
                                          // Could be push or not yet decidable
                                          const line = m.parameters?.line;
                                          const isIntPush = line != null && Number.isInteger(line) && data.result.homeFT != null;
                                          badge = isIntPush ? "Push" : "—";
                                          cls = isIntPush ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400" : "border-border text-muted-foreground";
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
                      <div className="mt-2 text-xs text-muted-foreground">Provisional status is based on current {data.result.finished ? "final" : "live"} score only — not yet settled unless the game is finished and you press Settle.</div>
                    </div>
                  </div>
                )}
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
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">+ETB {money(b.status === "WON" ? b.potentialPayout : b.projectedPayout)}</span>
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
              <Table>
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
                          {b.legs.map((l) => (
                            <div key={l.id} className="flex items-center gap-1.5 text-xs">
                              <span className="truncate max-w-[180px]">{l.selectionName}</span>
                              <span className="font-mono text-muted-foreground">{l.odds.toFixed(2)}</span>
                              {l.result !== "PENDING" && (
                                <span className={l.result === "WON" ? "text-emerald-500" : l.result === "LOST" ? "text-red-500" : "text-muted-foreground"}>
                                  {l.result === "WON" ? <CheckCircle2 className="size-3.5" /> : l.result === "LOST" ? <XCircle className="size-3.5" /> : null}
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
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm font-semibold">{b.status === "WON" ? `ETB ${money(b.potentialPayout)}` : b.status === "PENDING" ? <span className="text-muted-foreground">—</span> : b.status === "VOID" ? `ETB ${money(b.stake)}` : <span className="text-muted-foreground">0.00</span>}</div>
                        {b.status === "WON" && <Badge variant="outline" className={`mt-1 ${payoutStyle[b.payoutStatus] ?? ""}`}>{b.payoutStatus}</Badge>}
                        {b.status === "PENDING" && b.projectedResult !== "UNKNOWN" && (
                          <div className="mt-1 text-[10px] text-muted-foreground">Provisional: {b.projectedResult} {b.projectedResult === "WON" ? `ETB ${money(b.projectedPayout)}` : ""}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
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
