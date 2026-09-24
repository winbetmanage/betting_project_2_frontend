"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ReceiptText,
  Search,
  X,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

const SPINNER = "/assets/custom/infinite-spinner.svg";
const PAGE_SIZE = 10;

type BetGame = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: string;
  isPublished: boolean;
  externalEventId: string | null;
  footballDataMatchId: number | null;
  score: { home: number | null; away: number | null } | null;
  competition: { name: string; sport: string | null } | null;
  betCount: number;
  totalStaked: number;
  totalPayout: number;
  settledCount: number;
};

function money(n: number | null | undefined): string {
  return (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const statusStyle: Record<string, string> = {
  SCHEDULED: "bg-primary/10 text-primary border-primary/20",
  LIVE: "bg-secondary/15 text-secondary border-secondary/30",
  SUSPENDED: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
  FINISHED: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  CANCELLED: "bg-muted text-muted-foreground border-border",
  POSTPONED: "bg-muted text-muted-foreground border-border",
};

export default function BetGamesPage() {
  const [games, setGames] = useState<BetGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: BetGame[] }>("/games/settlement-list", getAccessToken() ?? token);
      setGames(res.data ?? []);
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Failed to load bet games");
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const q = search.trim().toLowerCase();
  // Recent on top, older at the bottom (by kickoff time, newest first)
  const filtered = (q
    ? games.filter((g) => `${g.homeTeam} ${g.awayTeam} ${g.competition?.name ?? ""}`.toLowerCase().includes(q))
    : games
  ).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ReceiptText className="size-3.5" /> Bet Games
          </div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ReceiptText className="size-6 text-primary" /> Bet Games
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Published games and their betting activity — open a game to review bets and settle payouts.</p>
        </div>
        <Button onClick={load} disabled={loading} variant="outline" className="border-primary/20 text-primary hover:bg-primary/10">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <ReceiptText className="size-5 text-primary" /> Published games
            <Badge variant="secondary" className="ml-1 border-primary/20 bg-primary/15 text-primary">{games.length}</Badge>
          </CardTitle>
          <CardDescription>Football-data tick = match result available for settlement.</CardDescription>
          <div className="relative mt-3 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search teams, competition..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-8 pr-8" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-muted p-1 hover:bg-muted/80">
                <X className="size-3" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center py-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SPINNER} alt="Loading" className="size-10" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <ReceiptText className="mx-auto size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">No published games</p>
              <p className="text-xs text-muted-foreground">Publish a game to see its betting activity here.</p>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <Table className="admin-cards">
                <TableHeader className="bg-primary">
                  <TableRow className="hover:bg-primary border-primary">
                    <TableHead className="text-white text-xs tracking-widest">MATCH</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">COMPETITION</TableHead>
                    <TableHead className="text-white text-xs tracking-widest"><span className="flex items-center gap-1"><Clock className="size-3" /> START</span></TableHead>
                    <TableHead className="text-white text-xs tracking-widest">STATUS</TableHead>
                    <TableHead className="text-center text-white text-xs tracking-widest">RESULT</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">BETS</TableHead>
                    <TableHead className="text-right text-white text-xs tracking-widest">STAKED</TableHead>
                    <TableHead className="text-right text-white text-xs tracking-widest">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((g) => (
                    <TableRow key={g.id} className="border-border hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TeamLogo name={g.homeTeam} className="size-5" />
                          <span className="text-sm font-semibold">{g.homeTeam}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <TeamLogo name={g.awayTeam} className="size-5" />
                          <span className="text-sm font-semibold">{g.awayTeam}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm"><span className="flex items-center gap-1.5"><LeagueLogo league={g.competition?.name} className="size-4" /><span>{g.competition?.name ?? "—"}</span></span></TableCell>
                      <TableCell className="text-xs font-mono">{new Date(g.startTime).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusStyle[g.status] ?? "bg-muted text-muted-foreground border-border"}>{g.status}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {g.score ? (
                          <span className="font-mono text-sm font-semibold">{g.score.home} - {g.score.away}</span>
                        ) : g.footballDataMatchId != null ? (
                          <CheckCircle2 className="mx-auto size-5 text-emerald-500" />
                        ) : (
                          <XCircle className="mx-auto size-5 text-muted-foreground/40" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="font-semibold">{g.betCount}</span>
                        {g.settledCount > 0 && <span className="ml-1 text-xs text-muted-foreground">({g.settledCount} settled)</span>}
                      </TableCell>
                      <TableCell className="text-right text-sm">ETB {money(g.totalStaked)}</TableCell>
                      <TableCell className="text-right">
                        <Button render={<Link href={`/admin/bet-games/${g.id}`} />} size="sm" variant="outline" className="h-8" nativeButton={false}>
                          <Eye className="size-3.5" /> Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col gap-2 border-t border-border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </div>
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage(Math.max(1, safePage - 1)); }} className={safePage === 1 ? "pointer-events-none opacity-50" : ""} />
                  </PaginationItem>
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                    const p = i + 1;
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
