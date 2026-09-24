"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { getAccessToken, getUser } from "@/lib/auth";
import { useTranslations } from "next-intl";
import { marketHelpText, type HelpSelection } from "@/lib/marketHelp";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TeamLogo } from "@/components/TeamLogo";
import { useBetSlip } from "@/components/bets/BetSlipProvider";
import { isBettingWindowOpen, timeRemaining } from "@/lib/timeRemaining";
import { ArrowLeft, Clock, Calendar, CheckCircle2, ShieldAlert, Info } from "lucide-react";

type Selection = { id: string; name: string; odds: number | string; isWinning: boolean | null };
type Market = { id: string; name: string; type: string; status: string; selections: Selection[] };
type Game = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: string;
  isPublished: boolean;
  markets: Market[];
  competition: { name: string } | null;
};

export default function GameDetailPage() {
  const t = useTranslations("games");
  const tHelp = useTranslations("marketHelp");
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [placed, setPlaced] = useState<string | null>(null);
  const [helpSel, setHelpSel] = useState<HelpSelection | null>(null);
  const slip = useBetSlip();

  useEffect(() => {
    const tok = getAccessToken();
    setLoading(true);
    api
      .get<{ data: Game }>(`/games/${id}`, tok)
      .then((res) => {
        const g = res.data;
        // Only allow betting on published, upcoming games
        if (!g.isPublished || !["SCHEDULED", "LIVE", "SUSPENDED"].includes(g.status)) {
          setGame({ ...g, markets: [] });
        } else {
          setGame(g);
        }
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : t("loadGameFailed")))
      .finally(() => setLoading(false));
  }, [id, t]);

  useEffect(() => {
    const onPlaced = (e: Event) => setPlaced((e as CustomEvent).detail as string);
    window.addEventListener("tana:bet-placed", onPlaced);
    return () => window.removeEventListener("tana:bet-placed", onPlaced);
  }, []);

  const togglePick = (sel: Selection, market: Market) => {
    if (!game) return;
    if (!isBettingWindowOpen(game.startTime, game.status)) {
      toast.error(t("windowClosedToast"));
      return;
    }
    slip.toggle({
      selectionId: sel.id,
      gameId: game.id,
      gameLabel: `${game.homeTeam} vs ${game.awayTeam}`,
      marketId: market.id,
      marketName: market.name,
      selectionName: sel.name,
      odds: Number(sel.odds),
    });
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm font-medium">{t("gameNotFound")}</p>
        <Link href="/games" className="mt-4 inline-block text-sm text-primary-light hover:underline">
          {t("backToGames")}
        </Link>
      </div>
    );
  }

  const unavailable = !game.isPublished || !["SCHEDULED", "LIVE", "SUSPENDED"].includes(game.status);
  const windowClosed = !unavailable && !isBettingWindowOpen(game.startTime, game.status);
  const countdown = timeRemaining(game.startTime);
  const openMarkets = game.markets?.filter((m) => m.status === "OPEN" && m.selections?.length > 0) ?? [];
  const slipLegsHere = slip.legs.filter((l) => l.gameId === game.id);

  return (
    <div className="space-y-6">
      <Link href="/games" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="size-4" /> {t("allGames")}
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <TeamLogo name={game.homeTeam} className="size-11" />
            <div>
              <div className="text-xl font-bold">{game.homeTeam}</div>
              <div className="text-xs text-white/50">{game.competition?.name ?? ""}</div>
            </div>
            <span className="text-white/40">{t("vs")}</span>
            <div>
              <div className="text-xl font-bold">{game.awayTeam}</div>
              <div className="text-xs text-white/50">{game.competition?.name ?? ""}</div>
            </div>
            <TeamLogo name={game.awayTeam} className="size-11" />
          </div>
          <div className="flex flex-col items-end gap-1.5 text-sm">
            <span className="flex items-center gap-1.5 text-white/70">
              <Calendar className="size-4" /> {new Date(game.startTime).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1.5 text-white/70">
              <Clock className="size-4" /> {new Date(game.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="rounded-full bg-secondary/20 px-2.5 py-0.5 text-xs font-semibold text-secondary">{game.status}</span>
          </div>
        </div>
      </div>

      {placed && (
        <div className="flex items-start gap-3 rounded-xl border border-secondary/30 bg-secondary/10 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-secondary" />
          <div>
            <p className="font-semibold">{t("betPlacedOk")}</p>
            <p className="mt-0.5 text-xs text-white/70">{t("reference")}: {placed}</p>
          </div>
        </div>
      )}

      {unavailable ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-300">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" />
          <span>{t("notAccepting")}</span>
        </div>
      ) : windowClosed ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-300">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" />
          <span>{t("windowClosedNote", { when: countdown.text })}</span>
        </div>
      ) : openMarkets.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
          {t("noOddsYet")}
        </div>
      ) : (
        <>
          {/* Markets */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t("marketsOdds")}</h2>
            {openMarkets.map((market) => (
              <div key={market.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <div className="border-b border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80">{market.name}</div>
                <div className="grid gap-px bg-white/5 sm:grid-cols-3">
                  {market.selections.map((sel) => {
                    const active = slip.has(sel.id);
                    return (
                      <div key={sel.id} className="flex items-stretch">
                        <button
                          onClick={() => togglePick(sel, market)}
                          className={`flex min-w-0 flex-1 items-center justify-between px-4 py-3 text-sm transition ${active ? "bg-primary/40 text-white" : "bg-white/5 hover:bg-white/10"}`}
                        >
                          <span className="truncate font-medium">{sel.name}</span>
                          <span className="flex shrink-0 items-center gap-1.5">
                            <span className={`font-bold ${active ? "text-primary-light" : "text-secondary"}`}>{Number(sel.odds).toFixed(2)}</span>
                            {active && <span className="grid size-4 place-items-center rounded-full bg-secondary text-[10px] font-black text-white">✓</span>}
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-label={tHelp("whatDoesThisMean")}
                          title={tHelp("whatDoesThisMean")}
                          onClick={() =>
                            setHelpSel({
                              marketType: market.type,
                              marketName: market.name,
                              selectionName: sel.name,
                              homeTeam: game.homeTeam,
                              awayTeam: game.awayTeam,
                            })
                          }
                          className="grid w-9 shrink-0 place-items-center border-l border-white/10 bg-white/5 text-white/40 transition hover:bg-white/10 hover:text-white"
                        >
                          <Info className="size-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Bet slip summary (placement happens in the slip panel, bottom-right / bottom bar) */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold tracking-widest text-white/50">{t("betSlipTitle")}</div>
              {slip.count > 0 && (
                <span className="min-w-0 text-xs text-white/60">
                  {t("slipSummary", { count: slip.count, odds: slip.totalOdds.toFixed(2), ret: slip.potentialPayout.toFixed(2) })}
                </span>
              )}
            </div>
            {slipLegsHere.length > 0 ? (
              <div className="mt-3 space-y-2">
                {slipLegsHere.map((l) => (
                  <div key={l.selectionId} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{l.selectionName}</div>
                      <div className="text-xs text-white/50">{l.marketName}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-bold text-secondary">@ {l.odds.toFixed(2)}</span>
                      <button onClick={() => slip.remove(l.selectionId)} className="text-xs text-white/40 hover:text-white">
                        {t("remove")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-white/40">{t("tapToAdd")}</p>
            )}
          </div>
        </>
      )}

      {/* Balance hint */}
      <p className="flex items-center gap-1.5 text-xs text-white/40">
        <ShieldAlert className="size-3.5" /> {t("balanceHint", { bal: Number(getUser()?.balance ?? 0).toFixed(2) })}
      </p>

      {/* What-does-this-mean dialog */}
      <Dialog open={!!helpSel} onOpenChange={(o) => { if (!o) setHelpSel(null); }}>
        <DialogContent className="sm:max-w-[440px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="size-5 text-primary" />
              {helpSel ? marketHelpText(tHelp, helpSel).title : ""}
            </DialogTitle>
            <DialogDescription className="pt-1 text-sm leading-relaxed">
              {helpSel ? marketHelpText(tHelp, helpSel).body : ""}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
