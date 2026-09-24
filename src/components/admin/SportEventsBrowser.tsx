"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeamLogo } from "@/components/TeamLogo";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Trophy, Star, Search, X, Calendar, Hash, RefreshCw, Download, Layers } from "lucide-react";

const SPINNER = "/assets/custom/infinite-spinner.svg";

export type SportChoice = "premier-league" | "champions-league";

type OddsEvent = {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
};

const CONFIG: Record<
  SportChoice,
  { label: string; badge: string; listPath: string; Icon: typeof Trophy; homeWin: string }
> = {
  "premier-league": {
    label: "Premier League",
    badge: "Fetch Games • Premier League",
    listPath: "/fetch-games/premier-league-events",
    Icon: Trophy,
    homeWin: "Premier League fixture from The Odds API",
  },
  "champions-league": {
    label: "UEFA Champions League",
    badge: "Fetch Games • UEFA Champions League",
    listPath: "/fetch-games/champions-league",
    Icon: Star,
    homeWin: "Champions League fixture from The Odds API",
  },
};

function formatRemaining(iso: string, now: Date): string {
  const d = new Date(iso);
  const dateStr = d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  const diff = d.getTime() - now.getTime();
  if (diff <= 0) return `${dateStr} (started)`;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs >= 24) return `${dateStr} (${Math.floor(hrs / 24)}d ${hrs % 24}h rem)`;
  if (hrs > 0) return `${dateStr} (${hrs}h ${mins % 60}m rem)`;
  return `${dateStr} (${mins}m rem)`;
}

export function SportEventsBrowser({ choice }: { choice: SportChoice }) {
  const cfg = CONFIG[choice];
  const [token, setToken] = useState<string | null>(null);
  const [events, setEvents] = useState<OddsEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [staging, setStaging] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const [detailsEvent, setDetailsEvent] = useState<OddsEvent | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const limit = 20;

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async (p: number, s: string, force: boolean, t: string | null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (s.trim()) params.set("search", s.trim());
      params.set("page", String(p));
      params.set("limit", String(limit));
      if (force) params.set("force", "true");
      const res = await api.get<{ data: OddsEvent[]; total: number; page: number; totalPages: number }>(
        `${cfg.listPath}?${params.toString()}`,
        t
      );
      setEvents(res.data ?? []);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
      if (res.page && res.page !== p) setPage(res.page);
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : `Failed to load ${cfg.label} events`);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [cfg.listPath, cfg.label]);

  useEffect(() => {
    load(1, search, false, token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, choice]);

  useEffect(() => {
    const id = setTimeout(() => load(page, search, false, token), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  const handleRefetch = () => load(page, search, true, getAccessToken() ?? token);

  const visibleIds = events.map((e) => e.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(allVisibleSelected ? new Set() : new Set(visibleIds));
  };

  const handleStageSelected = async (ids: string[]) => {
    if (ids.length === 0) {
      toast.info("Select at least one fixture first");
      return;
    }
    const t = getAccessToken() ?? token;
    setStaging(true);
    try {
      const res = await api.post<{ message: string; data: { added: number; alreadyStaged: number; createdTeams: string[]; unresolved: unknown[] } }>(
        "/fetch-games/staged/stage-selected",
        { choice, eventIds: ids },
        t
      );
      const s = res.data;
      const bits = [`${s.added} added`, `${s.alreadyStaged} already staged`];
      if (s.createdTeams.length) bits.push(`${s.createdTeams.length} team(s) auto-added`);
      if (s.unresolved.length) bits.push(`${s.unresolved.length} skipped`);
      toast.success(`${res.message} (${bits.join(", ")})`);
      setSelectedIds(new Set());
      await load(1, search, false, t);
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Stage failed");
    } finally {
      setStaging(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <cfg.Icon className="size-3.5" /> {cfg.badge}
          </div>
          <h1 className="mt-2 flex items-center gap-3 text-2xl font-bold tracking-tight">
            <cfg.Icon className="size-6 text-primary" /> {cfg.label}
          </h1>
          <p className="text-sm text-muted-foreground">
            Live fixtures via{" "}
            <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              {choice === "premier-league" ? "soccer_epl" : "soccer_uefa_champs_league"}
            </span>{" "}
            from The Odds API. Already-staged fixtures are hidden — select rows and add them to the staged queue.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleRefetch} disabled={loading} variant="outline" className="border-primary/20 text-primary hover:bg-primary/10">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> {loading ? "Loading..." : "Refetch"}
          </Button>
          <Button onClick={() => handleStageSelected(Array.from(selectedIds))} disabled={staging || selectedIds.size === 0} className="bg-secondary hover:bg-secondary/90 gap-1.5">
            {staging ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={SPINNER} alt="" className="size-4" />
            ) : (
              <Download className="size-4" />
            )}
            Add selected to staged ({selectedIds.size})
          </Button>
          <Badge variant="outline" className="border-primary/20 text-primary whitespace-nowrap">
            {total} events • Page {page}/{totalPages}
          </Badge>
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <cfg.Icon className="size-5 text-primary" /> {cfg.label} Fixtures
          </CardTitle>
          <CardDescription>Search by team or id. Tick rows, then add them to the staged queue.</CardDescription>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search home, away, id..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 pr-8" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-muted p-1 hover:bg-muted/80">
                  <X className="size-3" />
                </button>
              )}
            </div>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Showing {total === 0 ? 0 : (page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center py-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SPINNER} alt="Loading" className="size-10" />
            </div>
          ) : events.length === 0 ? (
            <div className="py-16 text-center">
              <cfg.Icon className="mx-auto size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">No events found</p>
              <p className="text-xs text-muted-foreground">Try a different search or refetch</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="admin-cards">
                  <TableHeader className="bg-primary">
                    <TableRow className="hover:bg-primary border-primary">
                      <TableHead className="w-[40px]">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAll}
                          className="size-4 accent-white"
                          aria-label="Select all on page"
                        />
                      </TableHead>
                      <TableHead className="text-white text-xs tracking-widest"><span className="flex items-center gap-1"><Hash className="size-3" /> ID</span></TableHead>
                      <TableHead className="text-white text-xs tracking-widest">HOME vs AWAY</TableHead>
                      <TableHead className="text-white text-xs tracking-widest"><span className="flex items-center gap-1"><Calendar className="size-3" /> COMMENCE</span></TableHead>
                      <TableHead className="text-right text-white text-xs tracking-widest">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((e) => (
                        <TableRow key={e.id} className="border-border hover:bg-muted/50">
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(e.id)}
                              onChange={() => toggleSelect(e.id)}
                              className="size-4"
                              aria-label={`Select ${e.home_team} vs ${e.away_team}`}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-[150px] truncate" title={e.id}>{e.id.slice(0, 8)}…</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TeamLogo name={e.home_team} className="size-6" />
                              <span className="text-sm font-semibold truncate max-w-[140px]">{e.home_team}</span>
                            </div>
                            <div className="my-0.5 pl-8 text-[10px] text-muted-foreground">vs</div>
                            <div className="flex items-center gap-2">
                              <TeamLogo name={e.away_team} className="size-6" />
                              <span className="text-sm font-semibold truncate max-w-[140px]">{e.away_team}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{formatRemaining(e.commence_time, now)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDetailsEvent(e)}>Details</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 border-t border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  Showing {total === 0 ? 0 : (page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}{search ? ` for "${search}"` : ""}
                </div>
                <Pagination className="mx-0 w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious href="#" onClick={(ev) => { ev.preventDefault(); setPage(Math.max(1, page - 1)); }} className={page === 1 ? "pointer-events-none opacity-50" : ""} />
                    </PaginationItem>
                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                      let p: number;
                      if (totalPages <= 5) p = i + 1;
                      else if (page <= 3) p = i + 1;
                      else if (page >= totalPages - 2) p = totalPages - 4 + i;
                      else p = page - 2 + i;
                      return (
                        <PaginationItem key={p}>
                          <PaginationLink href="#" isActive={page === p} onClick={(ev) => { ev.preventDefault(); setPage(p); }}>{p}</PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext href="#" onClick={(ev) => { ev.preventDefault(); setPage(Math.min(totalPages, page + 1)); }} className={page === totalPages ? "pointer-events-none opacity-50" : ""} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detailsEvent} onOpenChange={(open) => !open && setDetailsEvent(null)}>
        <DialogContent className="sm:max-w-[480px] bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><cfg.Icon className="size-5 text-primary" /> Fixture Details</DialogTitle>
            <DialogDescription>{cfg.homeWin}</DialogDescription>
          </DialogHeader>
          {detailsEvent && (
            <div className="space-y-3">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Home</span><span className="font-semibold">{detailsEvent.home_team}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Away</span><span className="font-semibold">{detailsEvent.away_team}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Commence</span><span className="font-mono text-xs">{new Date(detailsEvent.commence_time).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Sport</span><span><Badge variant="outline">{detailsEvent.sport_key}</Badge></span></div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="border-white/10" onClick={() => setDetailsEvent(null)}>Close</Button>
                <Button className="bg-secondary" onClick={() => { const id = detailsEvent.id; setDetailsEvent(null); handleStageSelected([id]); }}>
                  <Layers className="size-4" /> Add to staged
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
