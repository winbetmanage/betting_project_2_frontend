"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamLogo, LeagueLogo } from "@/components/TeamLogo";
import { Ticket, Wallet, Clock, Trophy, Flag, CheckCircle2, CalendarClock } from "lucide-react";

type Competition = { id: string; name: string; sport: { name: string } | null };
type Game = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: string;
  isPublished: boolean;
  competition: Competition;
};
type BetAgg = {
  betCount: number;
  totalStaked: number | string;
  settledCount: number;
  totalPayout: number | string;
  score: { home: number | null; away: number | null } | null;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function formatTimeLeft(startIso: string, status: string, now: Date): { text: string; live: boolean } {
  if (status === "LIVE") return { text: "Live", live: true };
  if (status === "SUSPENDED") return { text: "Paused", live: true };
  const diff = new Date(startIso).getTime() - now.getTime();
  if (diff <= 0) return { text: "Started", live: true };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (days >= 1) return { text: `${days}d ${hours}h`, live: false };
  if (hours >= 1) return { text: `${hours}h ${minutes}m`, live: false };
  if (minutes >= 1) return { text: `${minutes}m`, live: false };
  return { text: "Soon", live: false };
}

export default function AdminGamesPage() {
  const [token, setToken] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [betAggs, setBetAggs] = useState<Record<string, BetAgg>>({});
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const load = () => {
    const t = getAccessToken() ?? token;
    setLoading(true);
    Promise.all([
      api.get<{ data: Game[] }>("/games", t),
      api.get<{ data: ({ id: string; betCount: number; totalStaked: number | string; settledCount: number; totalPayout: number | string; score: { home: number | null; away: number | null } | null })[] }>("/games/settlement-list", t).then((r) => {
        const map: Record<string, BetAgg> = {};
        for (const g of r.data ?? []) {
          map[g.id] = { betCount: g.betCount, totalStaked: g.totalStaked, settledCount: g.settledCount, totalPayout: g.totalPayout, score: g.score };
        }
        return map;
      }).catch(() => ({})),
    ])
      .then(([g, aggs]) => {
        setGames(g.data ?? []);
        setBetAggs(aggs);
      })
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const published = games.filter((g) => g.isPublished && g.status !== "FINISHED" && g.status !== "CANCELLED");
  const finishedWeek = games.filter(
    (g) => g.isPublished && g.status === "FINISHED" && now.getTime() - new Date(g.startTime).getTime() <= WEEK_MS
  );
  const pubStakes = published.reduce((a, g) => a + (betAggs[g.id]?.betCount ?? 0), 0);
  const pubMoney = published.reduce((a, g) => a + Number(betAggs[g.id]?.totalStaked ?? 0), 0);

  const Fixture = ({ game, score }: { game: Game; score?: { home: number | null; away: number | null } | null }) => (
    <div className="min-w-0 flex-1 basis-56">
      <div className="flex items-center gap-2">
        <TeamLogo name={game.homeTeam} className="size-7" />
        <span className="truncate font-semibold">{game.homeTeam}</span>
        {score ? (
          <span className="rounded-md bg-primary/15 px-2 py-0.5 font-mono text-sm font-bold text-primary">
            {score.home ?? "—"} – {score.away ?? "—"}
          </span>
        ) : (
          <span className="font-normal text-muted-foreground">vs</span>
        )}
        <span className="truncate font-semibold">{game.awayTeam}</span>
        <TeamLogo name={game.awayTeam} className="size-7" />
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <LeagueLogo league={game.competition?.name} className="size-4" />
        <span className="truncate">{game.competition?.name ?? "—"}</span>
      </div>
    </div>
  );

  const StakesMoney = ({ game }: { game: Game }) => {
    const agg = betAggs[game.id];
    return (
      <>
        <span className="flex items-center gap-1.5 text-xs">
          <Ticket className="size-3.5 text-muted-foreground" />
          <span className="font-semibold">{agg?.betCount ?? 0}</span>
          <span className="text-muted-foreground">stakes</span>
        </span>
        <span className="flex items-center gap-1.5 text-xs">
          <Wallet className="size-3.5 text-muted-foreground" />
          <span className="font-mono font-semibold">ETB {Number(agg?.totalStaked ?? 0).toFixed(2)}</span>
        </span>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary via-primary to-brand-dark p-6 text-white shadow-xl shadow-primary/20">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-white/15 backdrop-blur">
              <Trophy className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Games</h1>
              <p className="text-sm text-white/80">Published games in play and recently finished games.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
              {pubStakes} stakes · ETB {pubMoney.toFixed(2)} in play
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
        </div>
      ) : (
        <Tabs defaultValue="published">
          <TabsList className="grid h-auto w-full grid-cols-1 gap-3 bg-transparent p-0 sm:grid-cols-2">
            <TabsTrigger
              value="published"
              className="h-auto flex-col items-start gap-1 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm data-[active=true]:border-secondary data-[active=true]:bg-secondary/10 data-[active=true]:shadow-none"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Trophy className="size-4 text-secondary" /> Published Games
                <Badge variant="secondary" className="bg-secondary/15 text-secondary border-secondary/20">
                  {published.length}
                </Badge>
              </span>
              <span className="text-[11px] font-normal text-muted-foreground">In play now — hours left, stakes, money</span>
            </TabsTrigger>
            <TabsTrigger
              value="finished"
              className="h-auto flex-col items-start gap-1 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm data-[active=true]:border-primary data-[active=true]:bg-primary/10 data-[active=true]:shadow-none"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Flag className="size-4 text-primary" /> Finished Games
                <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/20">
                  {finishedWeek.length}
                </Badge>
              </span>
              <span className="text-[11px] font-normal text-muted-foreground">Finished in the last 1 week — full details</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="published">
            {published.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No published games in play right now.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {published.map((game) => {
                  const time = formatTimeLeft(game.startTime, game.status, now);
                  return (
                    <Link key={game.id} href={`/admin/games/${game.id}`}>
                      <Card className="border-border bg-card shadow-sm transition hover:border-secondary/40 hover:shadow-md">
                        <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-2 p-4 text-sm">
                          <Fixture game={game} />
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarClock className="size-3.5" />
                            {new Date(game.startTime).toLocaleString()}
                          </span>
                          <Badge className="bg-secondary text-white">Published</Badge>
                          <Badge variant="outline">{game.status}</Badge>
                          <StakesMoney game={game} />
                          {time.live ? (
                            <span className="text-xs font-semibold text-secondary animate-pulse">{time.text}</span>
                          ) : (
                            <span className="flex items-center gap-1.5 font-mono text-xs font-semibold">
                              <Clock className="size-3.5 text-muted-foreground" /> {time.text} left
                            </span>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="finished">
            {finishedWeek.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No finished games in the last week.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {finishedWeek.map((game) => {
                  const agg = betAggs[game.id];
                  return (
                    <Link key={game.id} href={`/admin/games/${game.id}`}>
                      <Card className="border-border bg-card shadow-sm transition hover:border-primary/40 hover:shadow-md">
                        <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-2 p-4 text-sm">
                          <Fixture game={game} score={agg?.score} />
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarClock className="size-3.5" />
                            {new Date(game.startTime).toLocaleString()}
                          </span>
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle2 className="size-3" /> Finished
                          </Badge>
                          <StakesMoney game={game} />
                          <span className="text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">{agg?.settledCount ?? 0}</span> settled
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Paid <span className="font-mono font-semibold text-foreground">ETB {Number(agg?.totalPayout ?? 0).toFixed(2)}</span>
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
