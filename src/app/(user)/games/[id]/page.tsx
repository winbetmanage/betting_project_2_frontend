"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { getAccessToken, getUser } from "@/lib/auth";
import { toast } from "sonner";
import { TeamLogo } from "@/components/TeamLogo";
import { ArrowLeft, Clock, Calendar, Trophy, CheckCircle2, XCircle, Minus, ShieldAlert } from "lucide-react";

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
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<(Selection & { marketName: string }) | null>(null);
  const [stake, setStake] = useState("10");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);

  useEffect(() => {
    const t = getAccessToken();
    setLoading(true);
    api
      .get<{ data: Game }>(`/games/${id}`, t)
      .then((res) => {
        const g = res.data;
        // Only allow betting on published, upcoming games
        if (!g.isPublished || !["SCHEDULED", "LIVE", "SUSPENDED"].includes(g.status)) {
          setGame({ ...g, markets: [] });
        } else {
          setGame(g);
        }
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load game"))
      .finally(() => setLoading(false));
  }, [id]);

  const placeBet = async () => {
    if (!picked) return;
    const token = getAccessToken();
    if (!token) {
      toast.error("Please sign in to place a bet");
      return;
    }
    setPlacing(true);
    try {
      const res = await api.post<{ data: { id: string } }>(
        "/bets",
        { stake: Number(stake), selections: [{ selectionId: picked.id, odds: Number(picked.odds) }] },
        token
      );
      setPlaced(res.data.id);
      setPicked(null);
      toast.success("Bet placed!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place bet");
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-white/5" />
        <div className="h-64 animate-pulse rounded-xl bg-white/5" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm font-medium">Game not found</p>
        <Link href="/games" className="mt-4 inline-block text-sm text-primary-light hover:underline">
          Back to games
        </Link>
      </div>
    );
  }

  const unavailable = !game.isPublished || !["SCHEDULED", "LIVE", "SUSPENDED"].includes(game.status);
  const openMarkets = game.markets?.filter((m) => m.status === "OPEN" && m.selections?.length > 0) ?? [];
  const potentialReturn = picked ? Number(stake || 0) * Number(picked.odds) : 0;

  return (
    <div className="space-y-6">
      <Link href="/games" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="size-4" /> All games
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
            <span className="text-white/40">vs</span>
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
            <p className="font-semibold">Bet placed successfully!</p>
            <p className="mt-0.5 text-xs text-white/70">Reference: {placed}</p>
          </div>
        </div>
      )}

      {unavailable ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-300">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" />
          <span>This game isn&apos;t accepting bets right now (not published or already finished).</span>
        </div>
      ) : openMarkets.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
          Odds aren&apos;t available yet for this game. Please check back later.
        </div>
      ) : (
        <>
          {/* Markets */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Markets & Odds</h2>
            {openMarkets.map((market) => (
              <div key={market.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <div className="border-b border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80">{market.name}</div>
                <div className="grid gap-px bg-white/5 sm:grid-cols-3">
                  {market.selections.map((sel) => {
                    const active = picked?.id === sel.id;
                    return (
                      <button
                        key={sel.id}
                        onClick={() => setPicked({ ...sel, marketName: market.name })}
                        className={`flex items-center justify-between px-4 py-3 text-sm transition ${active ? "bg-primary/40 text-white" : "bg-white/5 hover:bg-white/10"}`}
                      >
                        <span className="font-medium">{sel.name}</span>
                        <span className={`font-bold ${active ? "text-primary-light" : "text-secondary"}`}>{Number(sel.odds).toFixed(2)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Bet slip */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-semibold tracking-widest text-white/50">BET SLIP</div>
            {picked ? (
              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{picked.name}</div>
                    <div className="text-xs text-white/50">
                      {picked.marketName} • {game.homeTeam} vs {game.awayTeam}
                    </div>
                  </div>
                  <span className="font-bold text-secondary">@ {Number(picked.odds).toFixed(2)}</span>
                </div>
                <button onClick={() => setPicked(null)} className="mt-2 text-xs text-white/40 hover:text-white">
                  Remove
                </button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-white/40">Tap an odds button above to add a pick.</p>
            )}

            {picked && (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="text-xs text-white/50">Stake</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={stake}
                    onChange={(e) => setStake(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-secondary"
                  />
                </div>
                <div className="sm:w-48">
                  <div className="text-xs text-white/50">Potential return</div>
                  <div className="mt-1 text-lg font-bold text-secondary">${potentialReturn.toFixed(2)}</div>
                </div>
                <button
                  onClick={placeBet}
                  disabled={placing || !stake || Number(stake) <= 0}
                  className="rounded-lg bg-secondary px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-secondary/90 disabled:opacity-50"
                >
                  {placing ? "Placing..." : "Place bet"}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Balance hint */}
      <p className="flex items-center gap-1.5 text-xs text-white/40">
        <ShieldAlert className="size-3.5" /> Your balance: ${Number(getUser()?.balance ?? 0).toFixed(2)} — responsible gambling.
      </p>
    </div>
  );
}
