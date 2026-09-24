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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TeamLogo, LeagueLogo } from "@/components/TeamLogo";
import { Activity, Search, X, Trophy, Clock, Eye, AlertTriangle, Trash2, CheckCircle2, XCircle, Flag, RefreshCw } from "lucide-react";
import { GameApiInfo } from "@/components/admin/GameApiInfo";

type GameScoreLite = {
  footballDataMatchId: number | null;
  homeHT: number | null;
  awayHT: number | null;
  homeFT: number | null;
  awayFT: number | null;
  winner: string | null;
  status: string;
};

type Game = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: string;
  externalEventId: string | null;
  isPublished: boolean;
  competition: { name: string; sport: { name: string } | null } | null;
  specifications?: unknown;
  score?: GameScoreLite | null;
  hasOddsApi?: boolean;
  hasFootballData?: boolean;
  footballDataMatchId?: number | null;
  apiSportKey?: string | null;
};

export default function ActiveGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [pendingToggle, setPendingToggle] = useState<Game | null>(null);
  const [toggling, setToggling] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [apiGame, setApiGame] = useState<Game | null>(null);
  const [tab, setTab] = useState<"upcoming" | "passed">("upcoming");
  const [now, setNow] = useState<Date>(() => new Date());
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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
      if (s.trim()) {
        const q = s.toLowerCase();
        all = all.filter((g) => `${g.homeTeam} ${g.awayTeam} ${g.competition?.name ?? ""} ${g.status}`.toLowerCase().includes(q));
      }
      setAllGames(all);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load games");
      setAllGames([]);
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

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  // Upcoming = kickoff still ahead, plus unfinished live games. Anything whose
  // start date has passed (and isn't live) moves to the Passed tab automatically.
  const isUpcoming = (g: Game) =>
    g.status !== "FINISHED" &&
    g.status !== "CANCELLED" &&
    (new Date(g.startTime).getTime() >= now.getTime() || g.status === "LIVE" || g.status === "SUSPENDED");

  const upcomingGames = allGames
    .filter(isUpcoming)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const passedGames = allGames
    .filter((g) => !isUpcoming(g))
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  const tabGames = tab === "upcoming" ? upcomingGames : passedGames;

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(tabGames.length / limit));
    setTotalPages(tp);
    setTotal(tabGames.length);
    const cur = Math.min(page, tp);
    if (cur !== page) setPage(cur);
    setGames(tabGames.slice((cur - 1) * limit, cur * limit));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allGames, tab, page, limit, now]);

  const switchTab = (v: string) => {
    setTab(v as "upcoming" | "passed");
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleRefreshTimes = async () => {
    const t = getAccessToken() ?? token;
    setRefreshing(true);
    try {
      const res = await api.post<{ message: string }>("/games/refresh-times", {}, t);
      toast.success(res.message || "Kickoff times refreshed");
      await load(1, search, limit);
      setPage(1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  // Clear selections whenever the visible list changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, limit, search, games]);

  const deletableIds = games.filter((g) => !g.isPublished).map((g) => g.id);
  const allDeletableSelected = deletableIds.length > 0 && deletableIds.every((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allDeletableSelected) {
        const next = new Set(prev);
        deletableIds.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...prev, ...deletableIds]);
    });
  };

  const handleBulkDelete = async () => {
    const t = getAccessToken() ?? token;
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const res = await api.post<{ message: string; data: { deleted: number } }>(
        "/games/bulk-delete",
        { ids: Array.from(selectedIds) },
        t
      );
      toast.success(res.message ?? `Deleted ${res.data?.deleted ?? selectedIds.size} game(s)`);
      setConfirmDelete(false);
      setSelectedIds(new Set());
      load(page, search, limit);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete games");
    } finally {
      setDeleting(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!pendingToggle) return;
    const t = getAccessToken() ?? token;
    setToggling(true);
    try {
      const newValue = !pendingToggle.isPublished;
      await api.patch(`/games/${pendingToggle.id}`, { isPublished: newValue }, t);
      toast.success(`Game ${newValue ? "published" : "unpublished"} — ${pendingToggle.homeTeam} vs ${pendingToggle.awayTeam}`);
      setPendingToggle(null);
      load(page, search, limit);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update publish status");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Activity className="size-3.5" /> Active Games
        </div>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Trophy className="size-6 text-primary" /> Active Games
        </h1>
        <p className="text-sm text-muted-foreground">Upcoming and passed games from the Game table — kickoff ahead or live vs already gone.</p>
      </div>

      <Tabs value={tab} onValueChange={switchTab}>
        <TabsList className="grid h-auto w-full grid-cols-1 gap-3 bg-transparent p-0 sm:grid-cols-2">
          <TabsTrigger
            value="upcoming"
            className="h-auto flex-col items-start gap-1 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm data-[active=true]:border-secondary data-[active=true]:bg-secondary/10 data-[active=true]:shadow-none"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="size-4 text-secondary" /> Upcoming Games
              <Badge variant="secondary" className="bg-secondary/15 text-secondary border-secondary/20">
                {upcomingGames.length}
              </Badge>
            </span>
            <span className="text-[11px] font-normal text-muted-foreground">Kickoff ahead, plus unfinished live games</span>
          </TabsTrigger>
          <TabsTrigger
            value="passed"
            className="h-auto flex-col items-start gap-1 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm data-[active=true]:border-primary data-[active=true]:bg-primary/10 data-[active=true]:shadow-none"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Flag className="size-4 text-primary" /> Passed Games
              <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/20">
                {passedGames.length}
              </Badge>
            </span>
            <span className="text-[11px] font-normal text-muted-foreground">Start date gone or finished</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            {tab === "upcoming" ? <Clock className="size-5 text-secondary" /> : <Flag className="size-5 text-primary" />}
            {tab === "upcoming" ? "Upcoming" : "Passed"}
            <Badge variant="secondary" className="ml-2 bg-secondary/15 text-secondary border-secondary/20">
              {total} total
            </Badge>
          </CardTitle>
          <CardDescription>
            {tab === "upcoming"
              ? "Kickoff still ahead, plus unfinished live games — Toggle publish and view details."
              : "Start date already passed or finished — Toggle publish and view details."}
          </CardDescription>
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
              {selectedCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="size-4" /> Delete ({selectedCount})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-9 border-primary/20 text-primary hover:bg-primary/10"
                onClick={handleRefreshTimes}
                disabled={refreshing}
                title="Re-check kickoff times from The Odds API and football-data.org and update changed ones"
              >
                <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} /> {refreshing ? "Refreshing..." : "Refresh times"}
              </Button>
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
              <Trophy className="mx-auto size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">{tab === "upcoming" ? "No upcoming games" : "No passed games"}</p>
              <p className="text-xs text-muted-foreground">
                {tab === "upcoming" ? "All kickoffs have passed or none match your search" : "Nothing has finished or passed yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader className="bg-primary">
                    <TableRow className="hover:bg-primary border-primary">
                      <TableHead className="text-white text-xs tracking-widest w-10">
                        <input
                          type="checkbox"
                          checked={allDeletableSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = selectedCount > 0 && !allDeletableSelected;
                          }}
                          onChange={toggleSelectAll}
                          disabled={deletableIds.length === 0}
                          className="size-4 cursor-pointer accent-white disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Select all deletable games"
                        />
                      </TableHead>
                      <TableHead className="text-white text-xs tracking-widest">MATCH</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">COMPETITION</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">START</TableHead>
                      <TableHead className="text-center text-white text-xs tracking-widest">SCORE</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">STATUS</TableHead>
                      <TableHead className="text-center text-white text-xs tracking-widest">APIS</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">PUBLISHED</TableHead>
                      <TableHead className="text-white text-xs tracking-widest text-right">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {games.map((g) => (
                      <TableRow key={g.id} className={`border-border hover:bg-muted/50 ${selectedIds.has(g.id) ? "bg-destructive/5" : ""}`}>
                        <TableCell>
                          {g.isPublished ? (
                            <span title="Published games cannot be removed" className="flex justify-center">
                              <svg className="size-4 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          ) : (
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(g.id)}
                                onChange={() => toggleRow(g.id)}
                                className="size-4 cursor-pointer accent-[#0a0f2e]"
                                aria-label={`Select ${g.homeTeam} vs ${g.awayTeam}`}
                              />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TeamLogo name={g.homeTeam} className="size-6" />
                            <div className="font-medium text-sm truncate max-w-[150px]">{g.homeTeam}</div>
                          </div>
                          <div className="my-0.5 text-[10px] text-muted-foreground pl-8">vs</div>
                          <div className="flex items-center gap-2">
                            <TeamLogo name={g.awayTeam} className="size-6" />
                            <div className="font-medium text-sm truncate max-w-[150px]">{g.awayTeam}</div>
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono mt-1">{g.externalEventId?.slice(0, 8) ?? g.id.slice(0, 8)}…</div>
                        </TableCell>
                        <TableCell className="text-sm"><span className="flex items-center gap-1.5"><LeagueLogo league={g.competition?.name} className="size-4" /><span>{g.competition?.name ?? "—"}</span></span> <span className="text-xs text-muted-foreground">({g.competition?.sport?.name ?? "—"})</span></TableCell>
                        <TableCell className="text-xs font-mono">{new Date(g.startTime).toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const s = g.score;
                            const show = s && (g.status === "LIVE" || g.status === "FINISHED" || g.status === "SUSPENDED") && s.homeFT != null && s.awayFT != null;
                            return show ? (
                              <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-sm font-bold ${g.status === "LIVE" ? "bg-secondary/15 text-secondary" : "bg-muted text-foreground"}`}>
                                {g.status === "LIVE" && <span className="size-1.5 rounded-full bg-[#ef4444] animate-pulse" />}
                                {s!.homeFT} - {s!.awayFT}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">—</span>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge className={g.status === "LIVE" ? "bg-secondary text-white animate-pulse" : g.status === "SUSPENDED" ? "bg-amber-500 text-white" : "bg-primary/15 text-primary border-primary/20"}>
                            {g.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => setApiGame(g)}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 transition hover:bg-muted/60"
                            title={`Odds API: ${g.hasOddsApi ? "connected" : "none"} • Football-Data: ${g.hasFootballData ? "connected" : "none"} — click for details`}
                          >
                            {g.hasOddsApi ? <CheckCircle2 className="size-4 text-secondary" /> : <XCircle className="size-4 text-muted-foreground/40" />}
                            {g.hasFootballData ? <CheckCircle2 className="size-4 text-emerald-500" /> : <XCircle className="size-4 text-muted-foreground/40" />}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch checked={g.isPublished} onCheckedChange={() => setPendingToggle(g)} />
                            <span className="text-xs">{g.isPublished ? "Yes" : "No"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button render={<Link href={`/admin/games/${g.id}`} />} size="sm" variant="outline" className="h-8" nativeButton={false}>
                            <Eye className="size-3.5" /> Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile card view — no horizontal scrolling */}
              <div className="space-y-3 p-3 sm:p-4 md:hidden">
                {games.map((g) => {
                  const s = g.score;
                  const showScore = s && (g.status === "LIVE" || g.status === "FINISHED" || g.status === "SUSPENDED") && s.homeFT != null && s.awayFT != null;
                  return (
                    <div key={g.id} className={`rounded-xl border p-3 ${selectedIds.has(g.id) ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/30"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex items-center gap-2">
                            {g.isPublished ? (
                              <span className="flex size-4 shrink-0 items-center justify-center">
                                <svg className="size-4 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                            ) : (
                              <input
                                type="checkbox"
                                checked={selectedIds.has(g.id)}
                                onChange={() => toggleRow(g.id)}
                                className="size-4 shrink-0 cursor-pointer accent-[#0a0f2e]"
                                aria-label={`Select ${g.homeTeam} vs ${g.awayTeam}`}
                              />
                            )}
                            <TeamLogo name={g.homeTeam} className="size-5 shrink-0" />
                            <span className="truncate text-sm font-semibold">{g.homeTeam}</span>
                          </div>
                          <div className="flex items-center gap-2 pl-6">
                            <TeamLogo name={g.awayTeam} className="size-5 shrink-0" />
                            <span className="truncate text-sm font-semibold">{g.awayTeam}</span>
                          </div>
                        </div>
                        <Badge className={`shrink-0 ${g.status === "LIVE" ? "bg-secondary text-white animate-pulse" : g.status === "SUSPENDED" ? "bg-amber-500 text-white" : "bg-primary/15 text-primary border-primary/20"}`}>
                          {g.status}
                        </Badge>
                      </div>

                      <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5 truncate">
                          <LeagueLogo league={g.competition?.name} className="size-3.5 shrink-0" />
                          <span className="truncate">{g.competition?.name ?? "—"} ({g.competition?.sport?.name ?? "—"})</span>
                        </div>
                        <div className="font-mono">{new Date(g.startTime).toLocaleString()}</div>
                        <div className="font-mono">{g.externalEventId?.slice(0, 8) ?? g.id.slice(0, 8)}…</div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {showScore ? (
                            <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-sm font-bold ${g.status === "LIVE" ? "bg-secondary/15 text-secondary" : "bg-muted text-foreground border border-border"}`}>
                              {g.status === "LIVE" && <span className="size-1.5 rounded-full bg-[#ef4444] animate-pulse" />}
                              {s!.homeFT} - {s!.awayFT}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">— : —</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setApiGame(g)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-1.5 py-1 transition hover:bg-muted/60"
                            title={`Odds API: ${g.hasOddsApi ? "connected" : "none"} • Football-Data: ${g.hasFootballData ? "connected" : "none"} — tap for details`}
                          >
                            <span className="text-[10px] font-medium text-muted-foreground">APIS</span>
                            {g.hasOddsApi ? <CheckCircle2 className="size-3.5 text-secondary" /> : <XCircle className="size-3.5 text-muted-foreground/40" />}
                            {g.hasFootballData ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : <XCircle className="size-3.5 text-muted-foreground/40" />}
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <Switch checked={g.isPublished} onCheckedChange={() => setPendingToggle(g)} />
                            <span className="text-xs text-muted-foreground">{g.isPublished ? "Yes" : "No"}</span>
                          </div>
                          <Button render={<Link href={`/admin/games/${g.id}`} />} size="sm" variant="outline" className="h-8" nativeButton={false}>
                            <Eye className="size-3.5" /> Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
        </TabsContent>
      </Tabs>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-[440px] bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" /> Delete {selectedCount} game(s)?
            </DialogTitle>
            <DialogDescription>
              This permanently removes the selected games along with their markets, odds and scores. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-40 overflow-y-auto rounded-lg bg-muted p-3 text-xs space-y-1">
            {games
              .filter((g) => selectedIds.has(g.id))
              .map((g) => (
                <div key={g.id} className="truncate">
                  {g.homeTeam} vs {g.awayTeam}
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button onClick={handleBulkDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingToggle} onOpenChange={(open) => !open && setPendingToggle(null)}>
        <DialogContent className="sm:max-w-[420px] bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" /> {pendingToggle?.isPublished ? "Unpublish Game?" : "Publish Game?"}
            </DialogTitle>
            <DialogDescription>
              You are about to <span className="font-semibold">{pendingToggle?.isPublished ? "unpublish" : "publish"}</span> <span className="font-medium">{pendingToggle?.homeTeam} vs {pendingToggle?.awayTeam}</span>. This will {pendingToggle?.isPublished ? "hide it from players" : "make it visible to players"}.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted p-3 text-xs">
            <div>Status: <Badge variant="outline">{pendingToggle?.status}</Badge></div>
            <div className="mt-1">Start: {pendingToggle ? new Date(pendingToggle.startTime).toLocaleString() : ""}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingToggle(null)} disabled={toggling}>
              Cancel
            </Button>
            <Button onClick={handleTogglePublish} disabled={toggling} className={pendingToggle?.isPublished ? "bg-destructive hover:bg-destructive/90" : "bg-primary"}>
              {toggling ? "Saving..." : pendingToggle?.isPublished ? "Unpublish" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!apiGame} onOpenChange={(open) => !open && setApiGame(null)}>
        <DialogContent className="sm:max-w-[600px] bg-card border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="size-5 text-primary" /> API Data
              <span className="text-sm font-normal text-muted-foreground">— {apiGame?.homeTeam} vs {apiGame?.awayTeam}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">Data from both external sources for this game. “Fetch all-market odds” pulls every market from The Odds API and saves it to this game&apos;s JSON file.</DialogDescription>
          </DialogHeader>
          {apiGame && <GameApiInfo gameId={apiGame.id} showFetch onFetched={() => load(page, search, limit)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
