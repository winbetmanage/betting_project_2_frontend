"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Ticket, Globe, ArrowUpRight, TrendingUp, Activity, Sparkles, Clock, Check, Layers } from "lucide-react";
import { ApiStatus } from "@/components/admin/ApiStatus";
import { TeamLogo, LeagueLogo } from "@/components/TeamLogo";

type MarketRow = { id: string; name: string; type: string; status: string; selections: { id: string; name: string; odds: number | string }[] };
type GameRow = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: string;
  isPublished: boolean;
  competition: { name: string; sport: { name: string } | null } | null;
  markets: MarketRow[];
};

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

export default function AdminDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState({ sports: 0, games: 0, bets: 0 });
  const [activeGames, setActiveGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const t = token;
    setLoading(true);
    Promise.all([
      api.get<{ data: unknown[] }>("/sports", t).then((r) => r.data.length).catch(() => 0),
      api.get<{ data: unknown[] }>("/games", t).then((r) => r.data.length).catch(() => 0),
      api.get<{ data: unknown[] }>("/bets", t).then((r) => r.data.length).catch(() => 0),
      api.get<{ data: GameRow[] }>("/games?limit=100&include=markets", t).then((r) => r.data?.filter((g) => ["SCHEDULED", "LIVE", "SUSPENDED"].includes(g.status)) ?? []).catch(() => []),
    ])
      .then(([sports, games, bets, active]) => {
        setStats({ sports, games, bets });
        setActiveGames(active);
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary via-primary to-brand-dark p-6 text-white shadow-xl shadow-primary/20">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-secondary/20 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                <Sparkles className="size-3.5" /> Tana Betting Admin
              </div>
              <ApiStatus variant="nav" />
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Adminx dashboard</h1>
            <p className="mt-1 max-w-lg text-sm text-white/80">Manage games, markets and monitor bets. Real-time oversight for your betting platform.</p>
          </div>
          <div className="flex gap-2">
            <Button nativeButton={false} render={<Link href="/admin/games" />} variant="secondary" className="bg-white text-primary hover:bg-white/90 shadow-lg">
              <Trophy className="size-4" /> Manage games
            </Button>
            <Button nativeButton={false} render={<Link href="/admin/bets" />} variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur">
              <Ticket className="size-4" /> Review bets
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="h-4 w-20 rounded bg-white/10" />
                <div className="mt-3 h-8 w-12 rounded bg-white/10" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/admin/games" className="group">
            <Card className="relative overflow-hidden border-primary/20 bg-card hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5">
              <div className="absolute left-0 top-0 h-full w-1 bg-primary" />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="flex items-center gap-1.5 text-xs tracking-widest">
                    <Globe className="size-3.5 text-primary" /> SPORTS
                  </CardDescription>
                  <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/20 text-[10px]">
                    <Activity className="size-3" /> Live
                  </Badge>
                </div>
                <CardTitle className="text-3xl font-bold">{stats.sports}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Total sports configured</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
                  View all <ArrowUpRight className="size-3" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/games" className="group">
            <Card className="relative overflow-hidden border-primary/20 bg-card hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5">
              <div className="absolute left-0 top-0 h-full w-1 bg-primary" />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="flex items-center gap-1.5 text-xs tracking-widest">
                    <Trophy className="size-3.5 text-primary" /> GAMES
                  </CardDescription>
                  <Badge className="bg-secondary/15 text-secondary border-secondary/20 text-[10px]">
                    <TrendingUp className="size-3" /> Active
                  </Badge>
                </div>
                <CardTitle className="text-3xl font-bold">{stats.games}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Matches created</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
                  Manage <ArrowUpRight className="size-3" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/bets" className="group">
            <Card className="relative overflow-hidden border-secondary/20 bg-card hover:border-secondary/40 transition-all hover:shadow-lg hover:shadow-secondary/10 hover:-translate-y-0.5">
              <div className="absolute left-0 top-0 h-full w-1 bg-secondary" />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="flex items-center gap-1.5 text-xs tracking-widest">
                    <Ticket className="size-3.5 text-secondary" /> BETS
                  </CardDescription>
                  <Badge variant="outline" className="border-secondary/30 text-secondary text-[10px]">All time</Badge>
                </div>
                <CardTitle className="text-3xl font-bold">{stats.bets}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Total bets placed</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-secondary">
                  Review <ArrowUpRight className="size-3" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Active Games */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-5 text-primary" /> Active Games
              <Badge variant="secondary" className="ml-1 bg-primary/15 text-primary border-primary/20">
                {activeGames.length}
              </Badge>
            </CardTitle>
            <Button nativeButton={false} render={<Link href="/admin/games/active" />} variant="outline" size="sm" className="h-8">
              View all <ArrowUpRight className="size-3" />
            </Button>
          </div>
          <CardDescription>Upcoming, live or paused games — with publish status, market count and time left.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {activeGames.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No active games right now.</div>
          ) : (
            <div className="divide-y divide-border">
              {activeGames.map((g) => {
                const totalOptions = g.markets?.reduce((a, m) => a + (m.selections?.length ?? 0), 0) ?? 0;
                const time = formatTimeLeft(g.startTime, g.status, now);
                return (
                  <Link
                    key={g.id}
                    href={`/admin/games/${g.id}`}
                    className="group flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm transition hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <TeamLogo name={g.homeTeam} className="size-6" />
                        <span className="font-semibold truncate">{g.homeTeam}</span>
                        <span className="font-normal text-muted-foreground">vs</span>
                        <span className="font-semibold truncate">{g.awayTeam}</span>
                        <TeamLogo name={g.awayTeam} className="size-6" />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <LeagueLogo league={g.competition?.name} className="size-3.5" />
                        <span>{g.competition?.sport?.name ?? "—"} • {g.competition?.name ?? "—"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {g.isPublished ? (
                        <Badge className="bg-secondary text-white gap-1">
                          <Check className="size-3" /> Published
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-500/30 text-amber-600">Unpublished</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      <Layers className="size-3.5 text-muted-foreground" />
                      <span className="font-semibold">{g.markets?.length ?? 0}</span>
                      <span className="text-muted-foreground">markets</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      <Activity className="size-3.5 text-muted-foreground" />
                      <span className="font-semibold">{totalOptions}</span>
                      <span className="text-muted-foreground">options</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      <Clock className="size-3.5 text-muted-foreground" />
                      {time.live ? (
                        <span className="font-semibold text-secondary animate-pulse">{time.text}</span>
                      ) : (
                        <span className="font-mono font-semibold">{time.text}</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <Card className="border-white/10 bg-white/[0.03] backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Quick actions</CardTitle>
          <CardDescription>Jump to the most used admin tools</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button nativeButton={false} render={<Link href="/admin/games" />} className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/20">
            <Trophy className="size-4" /> Manage games
          </Button>
          <Button nativeButton={false} render={<Link href="/admin/bets" />} variant="outline" className="border-white/10 hover:bg-white/5">
            <Ticket className="size-4" /> Review bets
          </Button>
          <Button nativeButton={false} render={<Link href="/" />} variant="secondary" className="bg-secondary hover:bg-secondary/90">
            <Globe className="size-4" /> View site as user
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
