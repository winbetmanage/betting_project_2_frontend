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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Search, X, Calendar, Hash, Globe, Activity, RefreshCw, Eye, Plus, Check, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { TeamLogo, LeagueLogo } from "@/components/TeamLogo";

type EplEvent = {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
};

function formatWithRemaining(commence: string, now: Date) {
  const d = new Date(commence);
  const dateStr = d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const diff = d.getTime() - now.getTime();
  if (diff <= 0) return `${dateStr} (started)`;
  const totalMins = Math.floor(diff / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs > 0) return `${dateStr} (${hrs}hrs and ${mins} rem)`;
  return `${dateStr} (${mins} mins rem)`;
}

export default function PremierLeaguePage() {
  const [events, setEvents] = useState<EplEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());

  // selection & published
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());
  const [detailsEvent, setDetailsEvent] = useState<EplEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [bulkAdding, setBulkAdding] = useState(false);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const fetchPublished = async () => {
    const t = getAccessToken() ?? token;
    try {
      const res = await api.get<{ data: string[] }>("/fetch-games/premier-league/published-ids", t);
      setPublishedIds(new Set(res.data ?? []));
    } catch {}
  };

  const load = async (p = page, s = search) => {
    const t = getAccessToken() ?? token;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (s.trim()) params.set("search", s.trim());
      params.set("page", String(p));
      params.set("limit", String(limit));
      const res = await api.get<{ data: EplEvent[]; total: number; page: number; limit: number; totalPages: number }>(
        `/fetch-games/premier-league?${params.toString()}`,
        t
      );
      setEvents(res.data ?? []);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
      if (res.page && res.page !== p) setPage(res.page);
      // also refresh published ids
      fetchPublished();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load Premier League events");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, search);
    fetchPublished();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const id = setTimeout(() => load(1, search), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    load(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleRefetch = async () => {
    const t = getAccessToken() ?? token;
    setRefetching(true);
    try {
      const res = await api.post<{ message: string; data: { data: EplEvent[]; count: number } }>("/fetch-games/premier-league/refetch", {}, t);
      toast.success(res.message || `Refetched ${res.data?.count ?? 0} events`);
      const r = await api.get<{ data: EplEvent[]; total: number; page: number; totalPages: number }>(`/fetch-games/premier-league?page=1&limit=${limit}&force=true`, t);
      setEvents(r.data ?? []);
      setTotal(r.total ?? 0);
      setTotalPages(r.totalPages ?? 1);
      setPage(1);
      fetchPublished();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refetch failed");
    } finally {
      setRefetching(false);
    }
  };

  const toggleSelect = (id: string) => {
    if (publishedIds.has(id)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const selectable = events.filter((e) => !publishedIds.has(e.id)).map((e) => e.id);
    const allSelected = selectable.length > 0 && selectable.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectable));
    }
  };

  const handleAddOne = async (id: string) => {
    if (publishedIds.has(id)) {
      toast.info("Already added to games table");
      return;
    }
    const t = getAccessToken() ?? token;
    setAddingId(id);
    try {
      await api.post(`/fetch-games/premier-league/${id}/publish`, {}, t);
      toast.success("Game added to games table");
      setPublishedIds((prev) => new Set([...prev, id]));
      // remove from selected if was selected
      setSelectedIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add game");
    } finally {
      setAddingId(null);
    }
  };

  const handleBulkAdd = async () => {
    const ids = Array.from(selectedIds).filter((id) => !publishedIds.has(id));
    if (ids.length === 0) {
      toast.info("No selectable games selected");
      return;
    }
    const t = getAccessToken() ?? token;
    setBulkAdding(true);
    try {
      const res = await api.post<{ message: string; data: { id: string; success: boolean; message: string }[] }>("/fetch-games/premier-league/publish-bulk", { ids }, t);
      const success = (res.data as unknown as { success: boolean }[]).filter((r) => r.success).length;
      toast.success(`${success}/${ids.length} games added`);
      const newIds = (res.data as unknown as { id: string; success: boolean }[]).filter((r) => r.success).map((r) => r.id);
      setPublishedIds((prev) => new Set([...prev, ...newIds]));
      setSelectedIds(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk add failed");
    } finally {
      setBulkAdding(false);
    }
  };

  const openDetails = (e: EplEvent) => {
    setDetailsEvent(e);
    setDetailsOpen(true);
  };

  const selectableCount = events.filter((e) => !publishedIds.has(e.id)).length;
  const selectedCount = Array.from(selectedIds).filter((id) => !publishedIds.has(id)).length;
  const allSelectableSelected = selectableCount > 0 && events.filter((e) => !publishedIds.has(e.id)).every((e) => selectedIds.has(e.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Trophy className="size-3.5" /> Fetch Games • Premier League
          </div>
          <h1 className="mt-2 flex items-center gap-3 text-2xl font-bold tracking-tight">
            <LeagueLogo league="Premier League" className="size-8" />
            <span>Premier League</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Live fixtures from <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">FetchEplEvents</span> — <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">soccer_epl</span> via The Odds API
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRefetch} disabled={refetching} variant="outline" className="border-primary/20 text-primary hover:bg-primary/10">
            <RefreshCw className={`size-4 ${refetching ? "animate-spin" : ""}`} />
            {refetching ? "Refetching..." : "Refetch"}
          </Button>
          <Badge variant="outline" className="border-primary/20 text-primary whitespace-nowrap">
            {total} events • Page {page} of {totalPages}
          </Badge>
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="size-5 text-primary" /> EPL Events
          </CardTitle>
          <CardDescription>Search by team, id or date. 20 per page. Select multiple to bulk add. Green = already in games table.</CardDescription>
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
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {selectedCount > 0 ? `${selectedCount} selected` : `Showing ${(page - 1) * limit + 1}-${Math.min(page * limit, total)} of ${total}`}
              </span>
              <Button onClick={handleBulkAdd} disabled={selectedCount === 0 || bulkAdding} className="bg-secondary hover:bg-secondary/90 gap-1">
                {bulkAdding ? <RefreshCw className="size-4 animate-spin" /> : <CheckSquare className="size-4" />}
                Add Selected ({selectedCount})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="py-16 text-center">
              <Globe className="mx-auto size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">No events found</p>
              <p className="text-xs text-muted-foreground">Try a different search or refetch</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-primary">
                    <TableRow className="hover:bg-primary border-primary">
                      <TableHead className="w-[40px] text-white">
                        <button onClick={toggleSelectAll} disabled={selectableCount === 0} className="grid place-items-center">
                          {allSelectableSelected ? <CheckSquare className="size-4 text-white" /> : <Square className="size-4 text-white/70" />}
                        </button>
                      </TableHead>
                      <TableHead className="text-white text-xs tracking-widest">
                        <span className="flex items-center gap-1">
                          <Hash className="size-3" /> ID
                        </span>
                      </TableHead>
                      <TableHead className="text-white text-xs tracking-widest">SPORT</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">HOME vs AWAY</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" /> COMMENCE
                        </span>
                      </TableHead>
                      <TableHead className="text-white text-xs tracking-widest text-right">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((e) => {
                      const isPublished = publishedIds.has(e.id);
                      const isSelected = selectedIds.has(e.id);
                      return (
                        <TableRow
                          key={e.id}
                          className={
                            isPublished
                              ? "bg-secondary/15 hover:bg-secondary/20 border-secondary/20"
                              : isSelected
                                ? "bg-primary/5 hover:bg-primary/10"
                                : "border-border hover:bg-muted/50"
                          }
                        >
                          <TableCell>
                            <button
                              onClick={() => toggleSelect(e.id)}
                              disabled={isPublished}
                              className={`grid size-5 place-items-center rounded border ${isPublished ? "bg-secondary border-secondary text-white cursor-not-allowed" : isSelected ? "bg-primary border-primary text-white" : "border-border bg-white hover:border-primary/50"}`}
                              title={isPublished ? "Already added" : "Select"}
                            >
                              {isPublished ? <Check className="size-3" /> : isSelected ? <Check className="size-3" /> : null}
                            </button>
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-[160px] truncate" title={e.id}>
                            <span className={isPublished ? "text-secondary font-semibold" : ""}>{e.id.slice(0, 8)}…</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <Badge variant="outline" className="w-fit border-primary/20 text-primary text-xs">
                                {e.sport_key}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground">{e.sport_title}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TeamLogo name={e.home_team} className="size-6" />
                              <div className="text-sm font-semibold truncate max-w-[130px]">{e.home_team}</div>
                            </div>
                            <div className="my-0.5 pl-8 text-[10px] text-muted-foreground">vs</div>
                            <div className="flex items-center gap-2">
                              <TeamLogo name={e.away_team} className="size-6" />
                              <div className="text-sm font-semibold truncate max-w-[130px]">{e.away_team}</div>
                            </div>
                            {isPublished && <Badge className="mt-1 bg-secondary text-white text-[10px]">In games table</Badge>}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-mono">{formatWithRemaining(e.commence_time, now)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDetails(e)}>
                                Details
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-primary hover:bg-primary/90"
                                onClick={() => handleAddOne(e.id)}
                                disabled={isPublished || addingId === e.id}
                                title={isPublished ? "Already added" : "Add to games table"}
                              >
                                {addingId === e.id ? <RefreshCw className="size-3 animate-spin" /> : <Plus className="size-3" />}
                                {isPublished ? "Added" : "Add"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 border-t border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total} {search ? `for "${search}"` : ""}
                </div>
                <Pagination className="mx-0 w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(Math.max(1, page - 1));
                        }}
                        className={page === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                      let p: number;
                      if (totalPages <= 5) p = i + 1;
                      else if (page <= 3) p = i + 1;
                      else if (page >= totalPages - 2) p = totalPages - 4 + i;
                      else p = page - 2 + i;
                      return (
                        <PaginationItem key={p}>
                          <PaginationLink
                            href="#"
                            isActive={page === p}
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(p);
                            }}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    {totalPages > 5 && (
                      <PaginationItem>
                        <span className="px-2 text-muted-foreground">…</span>
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(Math.min(totalPages, page + 1));
                        }}
                        className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!detailsEvent} onOpenChange={(open) => !open && setDetailsEvent(null)}>
        <DialogContent className="sm:max-w-[520px] bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="size-5 text-primary" /> Game Details
            </DialogTitle>
            <DialogDescription>Premier League fixture details</DialogDescription>
          </DialogHeader>
          {detailsEvent && (
            <div className="space-y-4">
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID</span>
                  <span className="font-mono text-xs">{detailsEvent.id}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sport</span>
                  <span>
                    <Badge variant="outline">{detailsEvent.sport_key}</Badge> {detailsEvent.sport_title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Home</span>
                  <span className="font-semibold">{detailsEvent.home_team}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Away</span>
                  <span className="font-semibold">{detailsEvent.away_team}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commence</span>
                  <span className="font-mono text-xs">{formatWithRemaining(detailsEvent.commence_time, now)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {publishedIds.has(detailsEvent.id) ? (
                    <Badge className="bg-secondary text-white">Already in games table</Badge>
                  ) : (
                    <Badge variant="outline">Not added</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setDetailsEvent(null)}>
                  Close
                </Button>
                <Button
                  className="flex-1 bg-primary"
                  disabled={publishedIds.has(detailsEvent.id)}
                  onClick={() => {
                    handleAddOne(detailsEvent.id);
                    setDetailsEvent(null);
                  }}
                >
                  <Plus className="size-4" /> {publishedIds.has(detailsEvent.id) ? "Already Added" : "Add to Games"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Activity className="size-3" /> Source: <span className="font-mono bg-muted px-1.5 py-0.5 rounded">FetchEplEvents</span> • Endpoint <span className="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">GET /api/v1/fetch-games/premier-league</span>
      </div>
    </div>
  );
}
