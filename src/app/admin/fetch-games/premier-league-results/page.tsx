"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, RefreshCw, Calendar, CheckCircle2, XCircle, Minus } from "lucide-react";
import { TeamLogo, LeagueLogo } from "@/components/TeamLogo";

type GameScoreRow = {
  id: string;
  footballDataMatchId: number;
  homeScoreHT: number;
  awayScoreHT: number;
  homeScoreFT: number;
  awayScoreFT: number;
  winner: string | null;
  status: string;
  fetchedAt: string;
  rawJsonPath: string;
  game: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    startTime: string;
    competition: { name: string } | null;
  };
};

function WinnerIcon({ winner }: { winner: string | null }) {
  if (winner === "HOME_TEAM") return <CheckCircle2 className="size-4 text-secondary" />;
  if (winner === "AWAY_TEAM") return <XCircle className="size-4 text-destructive" />;
  if (winner === "DRAW") return <Minus className="size-4 text-muted-foreground" />;
  return null;
}

export default function PremierLeagueResultsPage() {
  const [rows, setRows] = useState<GameScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  const load = async () => {
    const t = getAccessToken() ?? token;
    setLoading(true);
    try {
      const res = await api.get<{ data: GameScoreRow[] }>("/fetch-games/premier-league-results", t);
      setRows(res.data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load results");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleFetch = async () => {
    const t = getAccessToken() ?? token;
    setFetching(true);
    try {
      const res = await api.post<{ message: string; data: GameScoreRow[]; stats: { added: number; updated: number; total: number; played: number } }>(
        "/fetch-games/premier-league-results/fetch",
        {},
        t
      );
      toast.success(res.message);
      setRows(res.data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Trophy className="size-3.5" /> Fetch Games • Premier League Results
          </div>
          <h1 className="mt-2 flex items-center gap-3 text-2xl font-bold tracking-tight">
            <LeagueLogo league="Premier League" className="size-8" />
            <span>Premier League Results</span>
          </h1>
          <p className="text-sm text-muted-foreground">Scores from Football-Data.org — HT/FT, winner and match status.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleFetch} disabled={fetching} className="bg-primary gap-2">
            <RefreshCw className={`size-4 ${fetching ? "animate-spin" : ""}`} />
            {fetching ? "Fetching..." : "Fetch Results"}
          </Button>
          <Badge variant="outline" className="border-primary/20 text-primary whitespace-nowrap">
            {rows.length} matches
          </Badge>
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="size-5 text-primary" /> Match Results
          </CardTitle>
          <CardDescription>Fetched from <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">GET /competitions/PL/matches</span> with <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">X-Auth-Token</span> header.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center py-14">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
          </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center">
              <Trophy className="mx-auto size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">No results yet</p>
              <p className="text-xs text-muted-foreground">Click Fetch Results to pull the latest Premier League scores.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="admin-cards">
                <TableHeader className="bg-primary">
                  <TableRow className="hover:bg-primary border-primary">
                    <TableHead className="text-white text-xs tracking-widest">MATCH</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">HALF TIME</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">FULL TIME</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">WINNER</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">STATUS</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">KICKOFF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id} className="border-border hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TeamLogo name={r.game.homeTeam} className="size-6" />
                          <span className="text-sm font-semibold">{r.game.homeTeam}</span>
                          <span className="text-xs font-bold text-primary">{r.homeScoreFT}-{r.awayScoreFT}</span>
                          <span className="text-sm font-semibold">{r.game.awayTeam}</span>
                          <TeamLogo name={r.game.awayTeam} className="size-6" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{r.homeScoreHT}-{r.awayScoreHT}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm font-semibold">{r.homeScoreFT}-{r.awayScoreFT}</span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-xs">
                          <WinnerIcon winner={r.winner} />
                          <span className="text-muted-foreground">{r.winner?.replace("_", " ") ?? "—"}</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={r.status === "FINISHED" ? "bg-secondary text-white" : r.status === "LIVE" ? "bg-amber-500 text-white" : "bg-primary/15 text-primary border-primary/20"}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="size-3.5" />
                          <span className="font-mono">{new Date(r.game.startTime).toLocaleString()}</span>
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
