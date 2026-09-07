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
import { Trophy, Search, X, Info, Hash, Layers, Activity, Check, Globe, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type StaticGame = {
  key: string;
  group: string;
  title: string;
  description: string;
  active: boolean;
  has_outrights: boolean;
};

export default function GamesListPage() {
  const [games, setGames] = useState<StaticGame[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [groups, setGroups] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [refetching, setRefetching] = useState(false);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  const load = async (p = page, l = limit, s = search, g = groupFilter) => {
    const t = getAccessToken() ?? token;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (s.trim()) params.set("search", s.trim());
      if (g !== "all") params.set("group", g);
      params.set("page", String(p));
      params.set("limit", String(l));
      const res = await api.get<{ data: StaticGame[]; total: number; page: number; limit: number; totalPages: number; groups: string[] }>(
        `/info/games-list?${params.toString()}`,
        t
      );
      setGames(res.data ?? []);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
      setGroups(res.groups ?? []);
      // sync page if backend corrected it
      if (res.page && res.page !== p) setPage(res.page);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load games list");
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefetch = async () => {
    const t = getAccessToken() ?? token;
    setRefetching(true);
    try {
      const res = await api.post<{ data: { count: number; savedTo: string; totalFiles: number } }>("/info/games-list/refetch", {}, t);
      toast.success(`Refetched ${res.data.count} leagues — saved, ${res.data.totalFiles} files now`);
      await load(1, limit, search, groupFilter);
      setPage(1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refetch failed");
    } finally {
      setRefetching(false);
    }
  };

  useEffect(() => {
    load(1, limit, search, groupFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const id = setTimeout(() => load(1, limit, search, groupFilter), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, groupFilter]);

  useEffect(() => {
    load(page, limit, search, groupFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const handleSearchChange = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Info className="size-3.5" /> Information
          </div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Trophy className="size-6 text-primary" /> Games List
          </h1>
          <p className="text-sm text-muted-foreground">Static catalog from <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">json_store/static_data/all_games_list.json</span> — {total} leagues. Previous versions auto-renamed to <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">all_games_list_2.json</span> etc.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefetch}
            disabled={refetching}
            variant="outline"
            className="border-primary/20 text-primary hover:bg-primary/10 gap-2"
            title="Fetch from getAllSportsUrl() and save as all_games_list.json"
          >
            <RefreshCw className={`size-4 ${refetching ? "animate-spin" : ""}`} />
            {refetching ? "Refetching..." : "Refetch"}
          </Button>
          <Badge variant="outline" className="border-primary/20 text-primary whitespace-nowrap">
            {total} total • Page {page} of {totalPages}
          </Badge>
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="size-5 text-primary" /> All Games
          </CardTitle>
          <CardDescription>Search by key, group, title or description. Paginated.</CardDescription>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search key, group, title..." value={search} onChange={(e) => handleSearchChange(e.target.value)} className="pl-8 pr-8" />
              {search && (
                <button onClick={() => handleSearchChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-muted p-1 hover:bg-muted/80">
                  <X className="size-3" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">Group</span>
              <Select value={groupFilter} onValueChange={(v) => { setGroupFilter((v as string) ?? "all"); setPage(1); }}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="All groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All groups</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(limit)} onValueChange={(v) => { setLimit(Number((v as string) ?? 10)); setPage(1); }}>
                <SelectTrigger className="w-[90px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 / page</SelectItem>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
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
              <Globe className="mx-auto size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">No games found</p>
              <p className="text-xs text-muted-foreground">Try a different search or group</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-primary">
                    <TableRow className="hover:bg-primary border-primary">
                      <TableHead className="text-white text-xs tracking-widest">
                        <span className="flex items-center gap-1">
                          <Hash className="size-3" /> KEY
                        </span>
                      </TableHead>
                      <TableHead className="text-white text-xs tracking-widest">GROUP</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">TITLE</TableHead>
                      <TableHead className="text-white text-xs tracking-widest hidden md:table-cell">DESCRIPTION</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">ACTIVE</TableHead>
                      <TableHead className="text-white text-xs tracking-widest">OUTRIGHTS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {games.map((g, idx) => (
                      <TableRow key={g.key ?? `${g.title}-${idx}`} className="border-border hover:bg-muted/50">
                        <TableCell className="font-mono text-xs max-w-[180px] truncate" title={g.key}>
                          {g.key}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-primary/20 text-primary text-xs">
                            {g.group}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{g.title}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[260px] truncate" title={g.description}>
                          {g.description}
                        </TableCell>
                        <TableCell>
                          {g.active ? (
                            <Badge className="bg-secondary text-white gap-1">
                              <Check className="size-3" /> Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-destructive/20 text-destructive">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={g.has_outrights ? "border-secondary/30 text-secondary bg-secondary/10" : "border-border"}>
                            {g.has_outrights ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 border-t border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total} {search || groupFilter !== "all" ? "filtered" : "total"}
                  {search && ` for "${search}"`}
                </div>
                <div className="flex items-center gap-2">
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
                        // simple: show 1..5 or last pages
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
                      {totalPages > 5 && <PaginationItem><span className="px-2 text-muted-foreground">…</span></PaginationItem>}
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
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Activity className="size-3" /> Source: <span className="font-mono bg-muted px-1.5 py-0.5 rounded">json_store/static_data/all_games_list.json</span> • Served via <span className="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">GET /api/v1/info/games-list</span>
      </div>
    </div>
  );
}
