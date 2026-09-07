"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Flag, Search, X, Trophy, Clock } from "lucide-react";
import { TeamLogo, LeagueLogo } from "@/components/TeamLogo";

type Game = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: string;
  externalEventId: string | null;
  isPublished: boolean;
  competition: { name: string; sport: { name: string } | null } | null;
};

export default function EndedGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  const load = async (p = page, s = search, l = limit) => {
    const t = getAccessToken() ?? token;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", "100");
      if (s.trim()) params.set("search", s.trim());
      const res = await api.get<{ data: Game[] }>(`/games?${params.toString()}`, t);
      let all: Game[] = res.data ?? [];
      all = all.filter((g) => ["FINISHED", "CANCELLED", "POSTPONED"].includes(g.status));
      if (s.trim()) {
        const q = s.toLowerCase();
        all = all.filter((g) => `${g.homeTeam} ${g.awayTeam} ${g.competition?.name ?? ""} ${g.status}`.toLowerCase().includes(q));
      }
      const totalFiltered = all.length;
      setTotal(totalFiltered);
      const tp = Math.max(1, Math.ceil(totalFiltered / l));
      setTotalPages(tp);
      const cur = Math.min(p, tp);
      if (cur !== p) setPage(cur);
      setGames(all.slice((cur - 1) * l, cur * l));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load ended games");
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, search, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const id = setTimeout(() => load(1, search, limit), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    load(page, search, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Flag className="size-3.5" /> Ended Games
        </div>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Flag className="size-6 text-primary" /> Ended Games
        </h1>
        <p className="text-sm text-muted-foreground">Finished, cancelled or postponed games from the Game table.</p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-5 text-primary" /> Ended
            <Badge variant="secondary" className="ml-2 bg-primary/15 text-primary border-primary/20">
              {total} total
            </Badge>
          </CardTitle>
          <CardDescription>FINISHED, CANCELLED or POSTPONED</CardDescription>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search teams, competition..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 pr-8" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-muted p-1 hover:bg-muted/80">
                  <X className="size-3" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">Rows</span>
              <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[90px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 / page</SelectItem>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center py-14">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
          </div>
          ) : games.length === 0 ? (
            <div className="py-16 text-center">
              <Flag className="mx-auto size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">No ended games</p>
              <p className="text-xs text-muted-foreground">No finished, cancelled or postponed games yet</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-primary">
                    <TableRow className="hover:bg-primary border-primary">
                      <TableHead className="text-white text-xs tracking-widest">MATCH</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">COMPETITION</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">START</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">STATUS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {games.map((g) => (
                      <TableRow key={g.id} className="border-border hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TeamLogo name={g.homeTeam} className="size-6" />
                            <div className="font-medium text-sm truncate max-w-[150px]">{g.homeTeam}</div>
                          </div>
                          <div className="my-0.5 pl-8 text-[10px] text-muted-foreground">vs</div>
                          <div className="flex items-center gap-2">
                            <TeamLogo name={g.awayTeam} className="size-6" />
                            <div className="font-medium text-sm truncate max-w-[150px]">{g.awayTeam}</div>
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono mt-1">{g.externalEventId?.slice(0, 8) ?? g.id.slice(0, 8)}…</div>
                        </TableCell>
                        <TableCell className="text-sm"><span className="flex items-center gap-1.5"><LeagueLogo league={g.competition?.name} className="size-4" /><span>{g.competition?.name ?? "—"}</span></span> <span className="text-xs text-muted-foreground">({g.competition?.sport?.name ?? "—"})</span></TableCell>
                        <TableCell className="text-xs font-mono">{new Date(g.startTime).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={g.status === "FINISHED" ? "bg-secondary text-white" : g.status === "CANCELLED" ? "bg-destructive text-white" : "bg-amber-500 text-white"}>
                            {g.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col gap-3 border-t border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
                </div>
                <Pagination className="mx-0 w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage(Math.max(1, page - 1)); }} className={page === 1 ? "pointer-events-none opacity-50" : ""} />
                    </PaginationItem>
                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                      let p: number;
                      if (totalPages <= 5) p = i + 1;
                      else if (page <= 3) p = i + 1;
                      else if (page >= totalPages - 2) p = totalPages - 4 + i;
                      else p = page - 2 + i;
                      return (
                        <PaginationItem key={p}>
                          <PaginationLink href="#" isActive={page === p} onClick={(e) => { e.preventDefault(); setPage(p); }}>
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    {totalPages > 5 && <PaginationItem><span className="px-2 text-muted-foreground">…</span></PaginationItem>}
                    <PaginationItem>
                      <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage(Math.min(totalPages, page + 1)); }} className={page === totalPages ? "pointer-events-none opacity-50" : ""} />
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
