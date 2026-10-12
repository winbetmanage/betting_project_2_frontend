"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Trophy, RefreshCw, Calendar, CheckCircle2, XCircle, Minus } from "lucide-react";
import { TeamLogo, LeagueLogo } from "@/components/TeamLogo";

const PAGE_SIZE = 10;

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

type LeagueChoice = {
  code: string;
  label: string;
  logoName: string;
  fdCode: string;
};

const LEAGUES: LeagueChoice[] = [
  { code: "PL", label: "English Premier League", logoName: "Premier League", fdCode: "PL" },
  { code: "PD", label: "Spain LaLiga", logoName: "La Liga", fdCode: "PD" },
  { code: "SA", label: "Serie A", logoName: "Serie A", fdCode: "SA" },
  { code: "FL1", label: "Ligue 1", logoName: "Ligue 1", fdCode: "FL1" },
  { code: "BL1", label: "Bundesliga", logoName: "Bundesliga", fdCode: "BL1" },
  { code: "CL", label: "Champions League", logoName: "UEFA Champions League", fdCode: "CL" },
];

function WinnerIcon({ winner }: { winner: string | null }) {
  if (winner === "HOME_TEAM") return <CheckCircle2 className="size-4 text-secondary" />;
  if (winner === "AWAY_TEAM") return <XCircle className="size-4 text-destructive" />;
  if (winner === "DRAW") return <Minus className="size-4 text-muted-foreground" />;
  return null;
}

export default function ResultsPage() {
  const [league, setLeague] = useState<string>("PL");
  const [rows, setRows] = useState<GameScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const active = LEAGUES.find((l) => l.code === league) ?? LEAGUES[0];

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  const load = useCallback(async () => {
    const t = getAccessToken() ?? token;
    setLoading(true);
    try {
      const res = await api.get<{ data: GameScoreRow[] }>(`/fetch-games/results?league=${league}`, t);
      setRows(res.data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load results");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [league, token]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [league, token]);

  const handleFetch = async () => {
    const t = getAccessToken() ?? token;
    setFetching(true);
    try {
      const res = await api.post<{ message: string; data: GameScoreRow[]; stats: { added: number; updated: number; total: number; played: number } }>(
        "/fetch-games/results/fetch",
        { league },
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
            <Trophy className="size-3.5" /> Results • {active.label}
          </div>
          <h1 className="mt-2 flex items-center gap-3 text-2xl font-bold tracking-tight">
            <LeagueLogo league={active.logoName} className="size-8" />
            <span>{active.label} Results</span>
          </h1>
          <p className="text-sm text-muted-foreground">Scores from Football-Data.org — HT/FT, winner and match status.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={league} onValueChange={(v) => { setLeague(v ?? "PL"); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Select league" /></SelectTrigger>
            <SelectContent>
              {LEAGUES.map((l) => (
                <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <CardDescription>Fetched from <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">GET /competitions/{active.fdCode}/matches</span> with <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">X-Auth-Token</span> header.</CardDescription>
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
              <p className="text-xs text-muted-foreground">Click Fetch Results to pull the latest {active.label} scores.</p>
            </div>
          ) : (
            <>
              {/* Desktop table (unchanged design) */}
              <div className="hidden overflow-x-auto md:block">
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
                  {paged.map((r) => (
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

              {/* Mobile: stacked multi-line cards, never scrolls sideways */}
              <div className="space-y-2 p-3 md:hidden">
                {paged.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <TeamLogo name={r.game.homeTeam} className="size-6 shrink-0" />
                      <span className="text-sm font-semibold break-words">{r.game.homeTeam}</span>
                      <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-bold text-primary">
                        {r.homeScoreFT}-{r.awayScoreFT}
                      </span>
                      <span className="text-sm font-semibold break-words">{r.game.awayTeam}</span>
                      <TeamLogo name={r.game.awayTeam} className="size-6 shrink-0" />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>HT <span className="font-mono font-semibold text-foreground">{r.homeScoreHT}-{r.awayScoreHT}</span></span>
                      <span>FT <span className="font-mono font-semibold text-foreground">{r.homeScoreFT}-{r.awayScoreFT}</span></span>
                      <span className="flex items-center gap-1">
                        <WinnerIcon winner={r.winner} />
                        <span>{r.winner?.replace("_", " ") ?? "—"}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Badge className={r.status === "FINISHED" ? "bg-secondary text-white" : r.status === "LIVE" ? "bg-amber-500 text-white" : "bg-primary/15 text-primary border-primary/20"}>
                        {r.status}
                      </Badge>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Calendar className="size-3" />
                        <span className="font-mono">{new Date(r.game.startTime).toLocaleString()}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 border-t border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  Showing {rows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, rows.length)} of {rows.length}
                </div>
                <Pagination className="mx-0 w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage(Math.max(1, safePage - 1)); }} className={safePage === 1 ? "pointer-events-none opacity-50" : ""} />
                    </PaginationItem>
                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                      let p: number;
                      if (totalPages <= 5) p = i + 1;
                      else if (safePage <= 3) p = i + 1;
                      else if (safePage >= totalPages - 2) p = totalPages - 4 + i;
                      else p = safePage - 2 + i;
                      return (
                        <PaginationItem key={p}>
                          <PaginationLink href="#" isActive={safePage === p} onClick={(e) => { e.preventDefault(); setPage(p); }}>
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage(Math.min(totalPages, safePage + 1)); }} className={safePage === totalPages ? "pointer-events-none opacity-50" : ""} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
