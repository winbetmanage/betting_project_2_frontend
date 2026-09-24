"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Layers,
  Search,
  X,
  Calendar,
  Hash,
  RefreshCw,
  Download,
  Trophy,
  Star,
  CheckCircle2,
  XCircle,
  Plus,
  Unlink,
  Link2,
  Lock,
  CheckSquare,
  Square,
  Trash2,
} from "lucide-react";

type StagedStatus = "PENDING" | "MATCH_NOT_FOUND" | "CONFIRMED" | "REJECTED";

type StagedTeam = { id: string; fullName: string; shortName: string | null; iconUrl: string | null };
type TeamFull = StagedTeam & {
  oddsApiName: string | null;
  footballDataName: string | null;
  footballDataTeamId: number | null;
  country: string | null;
};

type StagedRow = {
  id: string;
  oddsApiEventId: string;
  oddsApiStartTime: string;
  oddsApiRaw: Record<string, unknown>;
  footballDataMatchId: number | null;
  footballDataStartTime: string | null;
  footballDataRaw: Record<string, unknown> | null;
  footballDataStatus: string | null;
  status: StagedStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  homeTeam: StagedTeam;
  awayTeam: StagedTeam;
  competition: { id: string; name: string; country: string | null };
  gameId: string | null;
  game: { id: string; status: string; isPublished: boolean } | null;
};

type StagedFull = Omit<StagedRow, "homeTeam" | "awayTeam" | "game"> & {
  homeTeam: TeamFull;
  awayTeam: TeamFull;
  game: { id: string; status: string; isPublished: boolean; homeTeam: string; awayTeam: string; startTime: string } | null;
  reviewedBy: { id: string; name: string | null; email: string } | null;
  stagedBy: { id: string; name: string | null; email: string } | null;
};

type ListResponse = {
  data: StagedRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Record<string, number>;
  hidden?: { finished: number; pastKickoff: number; rescheduled: number };
};

type FdSide = { id: number; name: string; shortName: string | null; tla: string | null } | null;
type FdMatchSummary = {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  season: string | null;
  competition: string | null;
  home: FdSide;
  away: FdSide;
  score: { fullTimeHome: number | null; fullTimeAway: number | null; halfTimeHome: number | null; halfTimeAway: number | null; winner: string | null } | null;
};
type FdFindResult = {
  found: boolean;
  match?: FdMatchSummary;
  searched: { choice: string; day: string; homeTeam: string; awayTeam: string; fixturesThatDay: number };
  reason?: string;
  dayFixtures?: FdMatchSummary[];
};

const SPINNER = "/assets/custom/infinite-spinner.svg";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  MATCH_NOT_FOUND: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  CONFIRMED: "bg-secondary/15 text-secondary border-secondary/30",
  REJECTED: "bg-destructive/15 text-destructive border-destructive/30",
};

const FD_STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "border-white/10 text-muted-foreground",
  TIMED: "border-sky-500/30 text-sky-400",
  IN_PLAY: "border-destructive/30 text-destructive bg-destructive/5",
  PAUSED: "border-amber-500/30 text-amber-500 bg-amber-500/5",
  FINISHED: "border-secondary/30 text-secondary bg-secondary/5",
  POSTPONED: "border-white/10 text-muted-foreground",
  SUSPENDED: "border-destructive/30 text-destructive",
  CANCELLED: "border-white/10 text-muted-foreground line-through",
  AWARDED: "border-purple-500/30 text-purple-400",
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

function errMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError || e instanceof Error ? e.message : fallback;
}

export default function StagedGamesPage() {
  const [token, setToken] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const [rows, setRows] = useState<StagedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [hidden, setHidden] = useState({ finished: 0, pastKickoff: 0, rescheduled: 0 });
  const [showHidden, setShowHidden] = useState(false);
  const limit = 20;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [now, setNow] = useState<Date>(() => new Date());

  // FD finder dialog
  const [fdOpen, setFdOpen] = useState(false);
  const [fdId, setFdId] = useState<string | null>(null);
  const [fdLabel, setFdLabel] = useState({ home: "", away: "", day: "" });
  const [fdLoading, setFdLoading] = useState(false);
  const [fdLinking, setFdLinking] = useState(false);
  const [fdResult, setFdResult] = useState<FdFindResult | null>(null);

  // Full details dialog
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState<StagedFull | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const [refreshingFd, setRefreshingFd] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Bulk selection + delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Clear finished
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async (p: number, s: string, st: string, t: string | null, includeHidden = showHidden) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (s.trim()) params.set("search", s.trim());
      if (st && st !== "ALL") params.set("status", st);
      if (includeHidden) params.set("includeHidden", "true");
      params.set("page", String(p));
      params.set("limit", String(limit));
      const res = await api.get<ListResponse>(`/fetch-games/staged?${params.toString()}`, t);
      setRows(res.data ?? []);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
      setCounts(res.counts ?? {});
      setHidden(res.hidden ?? { finished: 0, pastKickoff: 0, rescheduled: 0 });
      if (res.page && res.page !== p) setPage(res.page);
    } catch (e) {
      toast.error(errMessage(e, "Failed to load staged games"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [showHidden]);

  useEffect(() => {
    load(1, search, status, token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const id = setTimeout(() => load(page, search, status, token), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, page]);

  const reload = () => load(page, search, status, getAccessToken() ?? token);

  const toggleHidden = () => {
    const next = !showHidden;
    setShowHidden(next);
    setPage(1);
    load(1, search, status, getAccessToken() ?? token, next);
  };

  const hiddenTotal = hidden.finished + hidden.pastKickoff + hidden.rescheduled;

  // Rows already promoted into the Games table can never be selected for deletion
  const isAdded = (r: StagedRow) => r.gameId != null || r.game != null;
  const selectableIds = rows.filter((r) => !isAdded(r)).map((r) => r.id);
  const selectedCount = Array.from(selectedIds).filter((id) => selectableIds.includes(id)).length;
  const allSelectableSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  useEffect(() => {
    setSelectedIds(new Set());
  }, [rows]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelectableSelected ? new Set() : new Set(selectableIds));
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds).filter((id) => selectableIds.includes(id));
    if (ids.length === 0) {
      toast.info("No deletable staged games selected");
      return;
    }
    setDeleting(true);
    try {
      const res = await api.post<{ message: string; data: { deleted: number; skipped: number } }>(
        "/fetch-games/staged/delete",
        { ids },
        getAccessToken() ?? token
      );
      toast.success(res.message || `Deleted ${res.data?.deleted ?? ids.length} staged game(s)`);
      setDeleteOpen(false);
      setSelectedIds(new Set());
      await load(page, search, status, getAccessToken() ?? token);
    } catch (e) {
      toast.error(errMessage(e, "Delete failed"));
    } finally {
      setDeleting(false);
    }
  };

  const handleClearFinished = async () => {
    setClearing(true);
    try {
      const res = await api.post<{ message: string; data: { deleted: number } }>(
        "/fetch-games/staged/clear-finished",
        {},
        getAccessToken() ?? token
      );
      toast.success(res.message || `Cleared ${res.data?.deleted ?? 0} finished staged game(s)`);
      setClearOpen(false);
      setSelectedIds(new Set());
      await load(1, search, status, getAccessToken() ?? token);
      setPage(1);
    } catch (e) {
      toast.error(errMessage(e, "Clear finished failed"));
    } finally {
      setClearing(false);
    }
  };

  const fetchFull = async (id: string): Promise<StagedFull | null> => {
    try {
      const t = getAccessToken() ?? token;
      const res = await api.get<{ data: StagedFull }>(`/fetch-games/staged/${id}`, t);
      return res.data ?? null;
    } catch {
      return null;
    }
  };

  const handleRefresh = async () => {
    const t = getAccessToken() ?? token;
    setRefreshing(true);
    try {
      const res = await api.post<{ message: string }>("/fetch-games/staged/refresh", {}, t);
      toast.success(res.message || "Staged games refreshed");
      setPage(1);
      await load(1, search, status, t);
    } catch (e) {
      toast.error(errMessage(e, "Refresh failed"));
    } finally {
      setRefreshing(false);
    }
  };

  const runFind = async (id: string) => {
    setFdLoading(true);
    setFdResult(null);
    try {
      const t = getAccessToken() ?? token;
      const res = await api.post<FdFindResult>(`/fetch-games/staged/${id}/find-fd`, {}, t);
      setFdResult(res);
    } catch (e) {
      toast.error(errMessage(e, "Football-data lookup failed"));
      setFdResult({ found: false, searched: { choice: "", day: "", homeTeam: "", awayTeam: "", fixturesThatDay: 0 }, reason: "error", dayFixtures: [] });
    } finally {
      setFdLoading(false);
    }
  };

  const openFdFinder = (row: { id: string; home: string; away: string; day: string }) => {
    setFdId(row.id);
    setFdLabel({ home: row.home, away: row.away, day: row.day });
    setFdOpen(true);
    runFind(row.id);
  };

  const handleLink = async (matchId: number) => {
    if (!fdId) return;
    const t = getAccessToken() ?? token;
    setFdLinking(true);
    try {
      const res = await api.post<{ message: string }>(`/fetch-games/staged/${fdId}/link-fd`, { matchId }, t);
      toast.success(res.message || "Football-data match linked");
      setFdOpen(false);
      await reload();
      if (details && details.id === fdId) {
        const fresh = await fetchFull(fdId);
        if (fresh) setDetails(fresh);
      }
    } catch (e) {
      toast.error(errMessage(e, "Link failed"));
    } finally {
      setFdLinking(false);
    }
  };

  const handleUnlink = async (id: string) => {
    const t = getAccessToken() ?? token;
    setUnlinking(true);
    try {
      const res = await api.post<{ message: string }>(`/fetch-games/staged/${id}/unlink-fd`, {}, t);
      toast.success(res.message || "Football-data link removed");
      const fresh = await fetchFull(id);
      if (fresh) setDetails(fresh);
      await reload();
    } catch (e) {
      toast.error(errMessage(e, "Remove failed"));
    } finally {
      setUnlinking(false);
    }
  };

  const handleRefreshFd = async (id: string) => {
    const t = getAccessToken() ?? token;
    setRefreshingFd(true);
    try {
      const res = await api.post<{ message: string; data: StagedFull }>(`/fetch-games/staged/${id}/refresh-fd`, {}, t);
      toast.success(res.message || "Status refreshed");
      setDetails(res.data);
      await reload();
    } catch (e) {
      toast.error(errMessage(e, "Refresh failed"));
    } finally {
      setRefreshingFd(false);
    }
  };

  const handleConfirmToGames = async (id: string) => {
    const t = getAccessToken() ?? token;
    setConfirming(true);
    try {
      const res = await api.post<{ message: string; data: StagedFull }>(`/fetch-games/staged/${id}/confirm`, {}, t);
      toast.success(res.message || "Staged game added to the games table");
      setDetails(res.data);
      await reload();
    } catch (e) {
      toast.error(errMessage(e, "Failed to add to games"));
    } finally {
      setConfirming(false);
    }
  };

  const openDetails = async (row: StagedRow) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetails(null);
    const full = await fetchFull(row.id);
    if (full) {
      setDetails(full);
    } else {
      // fall back to the list row shape
      setDetails({ ...(row as unknown as StagedFull), reviewedBy: null, stagedBy: null });
    }
    setDetailsLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Layers className="size-3.5" /> Fetch Games • Staged
          </div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Layers className="size-6 text-primary" /> Staged Games
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bridge between The Odds API and football-data.org. Nothing reaches the Games table until it is confirmed here.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["PENDING", "MATCH_NOT_FOUND", "CONFIRMED", "REJECTED"] as const).map((k) => (
            <Badge key={k} variant="outline" className={STATUS_STYLES[k]}>
              {counts[k] ?? 0} {k.replace("_", " ")}
            </Badge>
          ))}
        </div>
      </div>

      {/* Refresh section */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="size-5 text-primary" /> Refresh staged games
          </CardTitle>
          <CardDescription>
            Re-reads kickoff times and odds data from The Odds API and scores/statuses from football-data.org for every
            staged row. Nothing is added or deleted — add new games from the Premier League and Champions League pages.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Updates times, linked scores and match statuses in place.
          </p>
          <Button onClick={handleRefresh} disabled={refreshing} className="bg-primary hover:bg-primary/90 gap-2">
            {refreshing ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SPINNER} alt="" className="size-4" /> Refreshing…
              </>
            ) : (
              <>
                <RefreshCw className="size-4" /> Refresh from APIs
              </>
            )}
          </Button>
        </CardContent>
        {refreshing && (
          <div className="grid place-items-center gap-2 border-t border-border py-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SPINNER} alt="Refreshing" className="size-9" />
            <p className="text-xs text-muted-foreground">Refreshing staged rows from the APIs…</p>
          </div>
        )}
      </Card>

      {/* Staged list */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="size-5 text-primary" /> Staged queue
            <Badge variant="secondary" className="ml-1 border-primary/20 bg-primary/15 text-primary">
              {total} total
            </Badge>
          </CardTitle>
          <CardDescription>Search by team or event id. Filter by status. Click the football-data cell to find &amp; link a fixture. Finished, past-kickoff and rescheduled rows are auto-hidden.</CardDescription>
          {(hiddenTotal > 0 || showHidden) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                {hiddenTotal} hidden ({hidden.finished} finished • {hidden.pastKickoff} past kickoff • {hidden.rescheduled} rescheduled)
              </span>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={toggleHidden}>
                {showHidden ? "Hide them again" : "Show hidden"}
              </Button>
            </div>
          )}
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search home, away, id..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 pr-8" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-muted p-1 hover:bg-muted/80">
                  <X className="size-3" />
                </button>
              )}
            </div>
            {/* @ts-expect-error Select value string vs null */}
            <Select value={status} onValueChange={(v) => setStatus(v)}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="MATCH_NOT_FOUND">Match not found</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            {selectedCount > 0 && (
              <Button variant="outline" size="sm" className="h-9 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="size-4" /> Delete ({selectedCount})
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setClearOpen(true)}>
              <Trash2 className="size-4" /> Clear finished
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center py-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SPINNER} alt="Loading" className="size-10" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center">
              <Layers className="mx-auto size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">No staged games yet</p>
              <p className="text-xs text-muted-foreground">Choose a competition above and hit Fetch to stage fixtures.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="admin-cards">
                  <TableHeader className="bg-primary">
                    <TableRow className="hover:bg-primary border-primary">
                      <TableHead className="w-[40px] text-white">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          disabled={selectableIds.length === 0}
                          className="grid place-items-center disabled:cursor-not-allowed"
                          title={allSelectableSelected ? "Unselect all deletable" : "Select all deletable (rows already in Games are excluded)"}
                        >
                          {allSelectableSelected ? <CheckSquare className="size-4 text-white" /> : <Square className="size-4 text-white/70" />}
                        </button>
                      </TableHead>
                      <TableHead className="text-white text-xs tracking-widest">
                        <span className="flex items-center gap-1"><Hash className="size-3" /> ID</span>
                      </TableHead>
                      <TableHead className="text-white text-xs tracking-widest">SOURCE</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">HOME vs AWAY</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">
                        <span className="flex items-center gap-1"><Calendar className="size-3" /> KICKOFF</span>
                      </TableHead>
                      <TableHead className="text-center text-white text-xs tracking-widest">FOOTBALL-DATA</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">STATUS</TableHead>
                      <TableHead className="text-right text-white text-xs tracking-widest">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => {
                      const confirmed = r.status === "CONFIRMED";
                      const linked = r.footballDataMatchId != null;
                      const added = r.gameId != null || r.game != null;
                      return (
                        <TableRow key={r.id} className={confirmed ? "border-secondary/20 bg-secondary/10 hover:bg-secondary/15" : "border-border hover:bg-muted/50"}>
                          <TableCell>
                            {added ? (
                              <span className="flex justify-center" title="Already in the games table — cannot be deleted">
                                <Lock className="size-3.5 text-muted-foreground/50" />
                              </span>
                            ) : (
                              <div className="flex justify-center">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(r.id)}
                                  onChange={() => toggleSelect(r.id)}
                                  className="size-4 cursor-pointer accent-primary"
                                  aria-label={`Select ${r.homeTeam.fullName} vs ${r.awayTeam.fullName}`}
                                />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-[120px] truncate" title={r.oddsApiEventId}>
                            {r.oddsApiEventId.slice(0, 8)}…
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="w-fit border-primary/20 text-primary text-[11px]">{r.competition.name}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TeamLogo name={r.homeTeam.fullName} className="size-6" />
                              <span className="text-sm font-semibold truncate max-w-[140px]">{r.homeTeam.fullName}</span>
                            </div>
                            <div className="my-0.5 pl-8 text-[10px] text-muted-foreground">vs</div>
                            <div className="flex items-center gap-2">
                              <TeamLogo name={r.awayTeam.fullName} className="size-6" />
                              <span className="text-sm font-semibold truncate max-w-[140px]">{r.awayTeam.fullName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{formatRemaining(r.oddsApiStartTime, now)}</TableCell>
                          <TableCell className="text-center">
                            <div className="inline-flex flex-col items-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => (added ? openDetails(r) : openFdFinder({ id: r.id, home: r.homeTeam.fullName, away: r.awayTeam.fullName, day: r.oddsApiStartTime.slice(0, 10) }))}
                                  className="inline-flex cursor-pointer items-center justify-center rounded-md p-1 transition hover:bg-muted/60"
                                  title={added ? "Added to games table — click for details" : linked ? `football-data match ${r.footballDataMatchId} — click to change` : "click to find a football-data match"}
                                >
                                  {linked ? <CheckCircle2 className="size-5 text-secondary" /> : <XCircle className="size-5 text-destructive" />}
                                </button>
                                {added && (
                                  <span title="Added to games table" className="inline-flex">
                                    <CheckCircle2 className="size-5 text-emerald-500" />
                                  </span>
                                )}
                              </div>
                              {linked && r.footballDataStatus && (
                                <div className={`mt-0.5 text-[9px] font-semibold uppercase tracking-wide ${r.footballDataStatus === "IN_PLAY" ? "text-destructive" : r.footballDataStatus === "FINISHED" ? "text-secondary" : "text-muted-foreground"}`}>
                                  {r.footballDataStatus.replace("_", " ")}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={STATUS_STYLES[r.status]}>{r.status.replace("_", " ")}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDetails(r)}>Details</Button>
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
                  Showing {total === 0 ? 0 : (page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}{search ? ` for "${search}"` : ""}
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
                          <PaginationLink href="#" isActive={page === p} onClick={(e) => { e.preventDefault(); setPage(p); }}>{p}</PaginationLink>
                        </PaginationItem>
                      );
                    })}
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

      {/* Football-data finder dialog */}
      <Dialog open={fdOpen} onOpenChange={setFdOpen}>
        <DialogContent className="sm:max-w-[560px] bg-card border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="size-5 text-primary" /> Find football-data match
            </DialogTitle>
            <DialogDescription>
              {fdLabel.home} vs {fdLabel.away} • {fdLabel.day} (matched by date + teams via the Team table)
            </DialogDescription>
          </DialogHeader>

          {fdLoading ? (
            <div className="grid place-items-center gap-2 py-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SPINNER} alt="Searching" className="size-10" />
              <p className="text-xs text-muted-foreground">Searching football-data.org fixtures…</p>
            </div>
          ) : fdResult?.found && fdResult.match ? (
            <div className="space-y-4 py-1">
              <div className="rounded-lg border border-secondary/30 bg-secondary/5 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-secondary">
                  <CheckCircle2 className="size-4" /> Fixture found
                </div>
                <FdMatchView m={fdResult.match} />
              </div>
              <DialogFooter>
                <Button variant="outline" className="border-white/10" onClick={() => setFdOpen(false)}>Cancel</Button>
                <Button className="bg-secondary hover:bg-secondary/90" disabled={fdLinking} onClick={() => handleLink(fdResult.match!.id)}>
                  {fdLinking ? <RefreshCw className="size-4 animate-spin" /> : <Plus className="size-4" />} Add to staged game
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3 py-1">
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <XCircle className="size-5 shrink-0 text-destructive" />
                <span>
                  {fdResult?.reason === "teams_not_mapped"
                    ? "These teams are not mapped to football-data. Add footballDataTeamId / footballDataName to the Team rows to enable auto-matching."
                    : fdResult?.reason === "error"
                      ? "The lookup failed. Try again."
                      : `No football-data fixture found on ${fdResult?.searched.day ?? fdLabel.day} for these teams.`}
                </span>
              </div>

              {fdResult && (fdResult.dayFixtures?.length ?? 0) > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Football-data fixtures on {fdResult.searched.day} ({fdResult.dayFixtures!.length})
                  </Label>
                  <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-white/10 p-1">
                    {fdResult.dayFixtures!.map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-muted/50">
                        <span>
                          <span className="font-medium">{m.home?.name ?? "?"}</span>
                          <span className="text-muted-foreground"> vs </span>
                          <span className="font-medium">{m.away?.name ?? "?"}</span>
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {new Date(m.utcDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })} #{m.id}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" className="border-white/10" onClick={() => setFdOpen(false)}>Close</Button>
                <Button variant="outline" className="border-primary/20 text-primary" onClick={() => fdId && runFind(fdId)}>
                  <RefreshCw className="size-4" /> Retry
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full details dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[720px] bg-card border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="size-5 text-primary" /> Staged Game Details
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">{details?.id ?? ""}</DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="grid place-items-center gap-2 py-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SPINNER} alt="Loading" className="size-10" />
            </div>
          ) : details ? (
            <div className="space-y-4 py-1 text-sm">
              {/* Teams + status header */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-3">
                  <TeamLogo name={details.homeTeam.fullName} className="size-8" />
                  <div className="text-base font-bold">{details.homeTeam.fullName}</div>
                  <span className="text-muted-foreground">vs</span>
                  <div className="text-base font-bold">{details.awayTeam.fullName}</div>
                  <TeamLogo name={details.awayTeam.fullName} className="size-8" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/20 text-primary">{details.competition.name}</Badge>
                  <Badge variant="outline" className={STATUS_STYLES[details.status]}>{details.status.replace("_", " ")}</Badge>
                  {details.gameId != null && (
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
                      <CheckCircle2 className="mr-1 size-3" /> In games table
                    </Badge>
                  )}
                </div>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="Created">{new Date(details.createdAt).toLocaleString()}</Field>
                <Field label="Staged by">{details.stagedBy?.name || details.stagedBy?.email || "—"}</Field>
                <Field label="Reviewed by">{details.reviewedBy?.name || details.reviewedBy?.email || "—"}</Field>
                {details.rejectionReason && <Field label="Rejection reason">{details.rejectionReason}</Field>}
                {details.game && (
                  <Field label="Linked game">
                    <span className="font-mono text-xs">{details.game.id.slice(0, 10)}…</span>
                    <span className="ml-1 text-[11px] text-muted-foreground">({details.game.status}{details.game.isPublished ? ", published" : ""})</span>
                  </Field>
                )}
              </div>

              <Separator className="bg-white/10" />

              {/* Odds API */}
              <Section title="The Odds API" icon={<Trophy className="size-4 text-primary" />}>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Event id"><span className="font-mono text-xs">{details.oddsApiEventId}</span></Field>
                  <Field label="Kickoff (Odds API)">{new Date(details.oddsApiStartTime).toLocaleString()}</Field>
                  <Field label="Time left">{formatRemaining(details.oddsApiStartTime, now)}</Field>
                  <Field label="Sport"><span className="font-mono text-xs">{String(details.oddsApiRaw?.sport_key ?? "—")}</span></Field>
                </div>
                <RawBlock label="oddsApiRaw" value={details.oddsApiRaw} />
              </Section>

              {/* Football-data */}
              <Section
                title="football-data.org"
                icon={<Star className="size-4 text-primary" />}
                action={
                  details.footballDataMatchId != null ? (
                    <div className="flex flex-wrap items-center gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs border-primary/20 text-primary" disabled={refreshingFd}
                        onClick={() => handleRefreshFd(details.id)} title="Re-fetch status & payload from football-data">
                        <RefreshCw className={`size-3 ${refreshingFd ? "animate-spin" : ""}`} /> Refresh
                      </Button>
                      {details.gameId != null ? (
                        <Badge variant="outline" className="h-7 gap-1 border-white/10 text-[11px] text-muted-foreground">
                          <Lock className="size-3" /> Link locked (in games)
                        </Badge>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" className="h-7 text-xs border-primary/20 text-primary"
                            onClick={() => openFdFinder({ id: details.id, home: details.homeTeam.fullName, away: details.awayTeam.fullName, day: details.oddsApiStartTime.slice(0, 10) })}>
                            <Search className="size-3" /> Change
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/30 text-destructive" disabled={unlinking} onClick={() => handleUnlink(details.id)}>
                            {unlinking ? <RefreshCw className="size-3 animate-spin" /> : <Unlink className="size-3" />} Remove
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    <Button size="sm" className="h-7 text-xs bg-secondary hover:bg-secondary/90"
                      onClick={() => openFdFinder({ id: details.id, home: details.homeTeam.fullName, away: details.awayTeam.fullName, day: details.oddsApiStartTime.slice(0, 10) })}>
                      <Link2 className="size-3" /> Find &amp; link
                    </Button>
                  )
                }
              >
                {details.footballDataMatchId != null ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Match id"><span className="font-mono">{details.footballDataMatchId}</span></Field>
                    <Field label="Kickoff (FD)">{details.footballDataStartTime ? new Date(details.footballDataStartTime).toLocaleString() : "—"}</Field>
                    <Field label="Status">
                      <Badge variant="outline" className={FD_STATUS_STYLES[details.footballDataStatus ?? ""] || "border-white/10 text-muted-foreground"}>
                        {(details.footballDataStatus ?? "unknown").replace("_", " ")}
                      </Badge>
                    </Field>
                    {details.footballDataRaw && (
                      <>
                        <Field label="FD raw status"><span className="font-mono text-xs">{String((details.footballDataRaw as { status?: string }).status ?? "—")}</span></Field>
                        <Field label="FD home">{String((details.footballDataRaw as { homeTeam?: { name?: string } }).homeTeam?.name ?? "—")}</Field>
                        <Field label="FD away">{String((details.footballDataRaw as { awayTeam?: { name?: string } }).awayTeam?.name ?? "—")}</Field>
                      </>
                    )}
                    <RawBlock label="footballDataRaw" value={details.footballDataRaw} />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-white/15 p-3 text-muted-foreground">
                    <XCircle className="size-4 text-destructive" /> No football-data fixture linked yet.
                  </div>
                )}
              </Section>

              {/* Team mapping */}
              <Section title="Team name mapping" icon={<Hash className="size-4 text-primary" />}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <MappingCard team={details.homeTeam} side="Home" />
                  <MappingCard team={details.awayTeam} side="Away" />
                </div>
              </Section>

              <DialogFooter className="gap-2 sm:justify-between">
                <Button variant="outline" className="border-white/10" onClick={() => setDetailsOpen(false)}>Close</Button>
                {details.gameId != null ? (
                  <Badge variant="outline" className="h-9 gap-1.5 border-emerald-500/30 bg-emerald-500/10 px-3 text-emerald-500">
                    <CheckCircle2 className="size-4" /> Already added to games table
                  </Badge>
                ) : details.footballDataMatchId != null && details.status !== "REJECTED" ? (
                  <Button className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500" disabled={confirming} onClick={() => handleConfirmToGames(details.id)}>
                    {confirming ? <RefreshCw className="size-4 animate-spin" /> : <Plus className="size-4" />} Add to games table
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Link a football-data match first to enable adding to games.</span>
                )}
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete selected confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[460px] bg-card border-destructive/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" /> Delete {selectedCount} staged game(s)?
            </DialogTitle>
            <DialogDescription>
              Removes the selected rows from the staged table. This cannot be undone. Rows already added to the games table are locked and will never be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-40 overflow-y-auto rounded-lg bg-muted p-3 text-xs space-y-1">
            {rows
              .filter((r) => selectedIds.has(r.id) && !isAdded(r))
              .map((r) => (
                <div key={r.id} className="truncate">
                  {r.homeTeam.fullName} vs {r.awayTeam.fullName}
                  <span className="ml-1 text-muted-foreground">• {new Date(r.oddsApiStartTime).toLocaleDateString()}</span>
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-white/10" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSelected} disabled={deleting}>
              {deleting ? <RefreshCw className="size-4 animate-spin" /> : <Trash2 className="size-4" />} {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear finished confirmation */}
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="sm:max-w-[460px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-primary" /> Clear finished staged games?
            </DialogTitle>
            <DialogDescription>
              Deletes every staged game whose football-data status is FINISHED, across all pages. Games already added
              to the games table are never deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)} disabled={clearing}>
              Cancel
            </Button>
            <Button onClick={handleClearFinished} disabled={clearing} className="bg-primary">
              {clearing ? <RefreshCw className="size-4 animate-spin" /> : <Trash2 className="size-4" />} {clearing ? "Clearing..." : "Clear finished"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{children}</div>
    </div>
  );
}

function Section({ title, icon, action, children }: { title: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold"><span>{icon}</span>{title}</div>
        {action}
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 p-3">{children}</div>
    </div>
  );
}

function RawBlock({ label, value }: { label: string; value: unknown }) {
  if (value == null) return null;
  return (
    <details className="group mt-1">
      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">{label} (raw JSON)</summary>
      <pre className="mt-1 max-h-48 overflow-auto rounded-md bg-black/40 p-2 text-[11px] leading-relaxed text-white/80">{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

function MappingCard({ team, side }: { team: TeamFull; side: string }) {
  const mapped = team.footballDataTeamId != null || !!team.footballDataName;
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs">
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <TeamLogo name={team.fullName} className="size-5" /> {side}: {team.fullName}
        {mapped ? <CheckCircle2 className="size-3.5 text-secondary" /> : <XCircle className="size-3.5 text-destructive" />}
      </div>
      <div className="grid grid-cols-1 gap-0.5 text-muted-foreground">
        <span>Odds API: <span className="font-mono text-foreground">{team.oddsApiName ?? "—"}</span></span>
        <span>FD name: <span className="font-mono text-foreground">{team.footballDataName ?? "—"}</span></span>
        <span>FD id: <span className="font-mono text-foreground">{team.footballDataTeamId ?? "—"}</span></span>
      </div>
    </div>
  );
}

function FdMatchView({ m }: { m: FdMatchSummary }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{m.home?.name ?? "?"} vs {m.away?.name ?? "?"}</div>
        <Badge variant="outline" className="border-white/10 text-[10px]">{m.status}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>Match id: <span className="font-mono text-foreground">#{m.id}</span></span>
        <span>Matchday: <span className="text-foreground">{m.matchday ?? "—"}</span></span>
        <span>Date: <span className="text-foreground">{new Date(m.utcDate).toLocaleString()}</span></span>
        <span>Season: <span className="text-foreground">{m.season ?? "—"}</span></span>
        <span>Home: <span className="text-foreground">{m.home?.name} <span className="font-mono">({m.home?.id})</span></span></span>
        <span>Away: <span className="text-foreground">{m.away?.name} <span className="font-mono">({m.away?.id})</span></span></span>
        {m.score && <span>Score: <span className="text-foreground">{m.score.fullTimeHome ?? "-"} : {m.score.fullTimeAway ?? "-"}</span></span>}
      </div>
    </div>
  );
}
