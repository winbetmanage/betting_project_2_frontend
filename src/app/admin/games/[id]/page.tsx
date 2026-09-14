"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Trophy, Clock, Calendar, Hash, Globe, Building, Check, X, Activity, Download, AlertTriangle, Shield, Trash2, Wand2, RefreshCw, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TeamLogo, LeagueLogo } from "@/components/TeamLogo";
import { GameApiInfo } from "@/components/admin/GameApiInfo";
import { GameApiLinkEditor } from "@/components/admin/GameApiLinkEditor";

type Selection = { id: string; name: string; odds: number | string; isWinning: boolean | null };
type Market = { id: string; name: string; type: string; status: string; selections: Selection[]; sourceBookmakerKeys?: string[] | null };
type Game = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: string;
  externalEventId: string | null;
  isPublished: boolean;
  competition: { id: string; name: string; country: string | null; sport: { id: string; name: string; slug: string; gameType: string } | null } | null;
  specifications?: Record<string, unknown> | null;
  markets: Market[];
  score?: {
    footballDataMatchId: number | null;
    homeScoreHT: number;
    awayScoreHT: number;
    homeScoreFT: number | null;
    awayScoreFT: number | null;
    winner: string | null;
    status: string;
  } | null;
  createdAt: string;
  updatedAt: string;
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

function SpecsDetails({ specs }: { specs: Record<string, unknown> | null | undefined }) {
  if (!specs) return null;

  const formatValue = (v: unknown): string => {
    if (v === null) return "—";
    if (v === undefined) return "—";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  const formatKey = (k: string) =>
    k
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase())
      .replace(/_/g, " ");

  const entries = Object.entries(specs).map(([k, v]) => {
    const display = formatValue(v);
    const isLong = display.length > 40 || typeof v === "object";
    return { k, display, isLong };
  });

  return (
    <div className="mt-2 space-y-1.5">
      {entries.map(({ k, display, isLong }) => (
        <div key={k} className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs">
          <span className="shrink-0 font-medium text-muted-foreground">{formatKey(k)}</span>
          {isLong ? (
            <span className="break-all text-right font-mono text-[11px] text-foreground">{display}</span>
          ) : (
            <span className="truncate text-right font-medium text-foreground">{display}</span>
          )}
        </div>
      ))}
    </div>
  );
}

type BookmakerGroup = {
  marketKey: string;
  label: string;
  point: number | null;
  bookmakers: { bookmakerKey: string; last_update: string; outcomes: { name: string; price: number; point?: number | null }[] }[];
  count: number;
  warning: boolean;
};

function BookmakerMarketsSection({ gameId, externalEventId, onApproved }: { gameId: string; externalEventId: string | null; onApproved: () => void }) {
  const [groups, setGroups] = useState<BookmakerGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});
  const [approving, setApproving] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [hasJson, setHasJson] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [savedKeys, setSavedKeys] = useState<string[]>([]);
  const [autoFillOpen, setAutoFillOpen] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);

  const groupKey = (g: BookmakerGroup) => `${g.marketKey}::${g.point ?? "null"}`;

  const load = async () => {
    if (!externalEventId) return;
    setLoading(true);
    try {
      const token = getAccessToken();
      const res = await api.get<{ data: BookmakerGroup[]; hasJson: boolean; hasSelection: boolean; savedKeys: string[] }>(`/games/${gameId}/bookmaker-odds`, token);
      setGroups(res.data ?? []);
      setHasJson(!!res.hasJson);
      setHasSelection(!!res.hasSelection);
      setSavedKeys(res.savedKeys ?? []);
      // preselect first bookmaker for each group if not already selected
      setSelected((prev) => {
        const next = { ...prev };
        for (const g of res.data ?? []) {
          const k = groupKey(g);
          if (!next[k] && g.bookmakers[0]) next[k] = g.bookmakers[0].bookmakerKey;
        }
        return next;
      });
    } catch (e) {
      // No data yet is not an error - just empty
      if ((e as ApiError).status !== 404) toast.error(e instanceof Error ? e.message : "Failed to load bookmaker odds");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const handleFetch = async () => {
    if (!externalEventId) {
      toast.error("Game has no externalEventId — cannot fetch");
      return;
    }
    setFetching(true);
    try {
      const token = getAccessToken();
      const res = await api.post<{ data: { stored: number } }>(`/games/${gameId}/fetch-odds`, {}, token);
      toast.success(`Fetched ${res.data.stored} bookmakers (all market types)`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setFetching(false);
    }
  };

  const buildSelections = (group: BookmakerGroup) => {
    const k = groupKey(group);
    const bookmakerKey = selected[k];
    if (!bookmakerKey) return null;
    const bm = group.bookmakers.find((b) => b.bookmakerKey === bookmakerKey);
    if (!bm) return null;
    const edited = edits[k] ?? {};
    const selections = bm.outcomes.map((o) => {
      const editKey = `${o.name}:${o.point ?? "null"}`;
      return {
        name: o.name,
        point: o.point ?? undefined,
        odds: edited[editKey] ? Number(edited[editKey]) : Number(o.price),
      };
    });
    return selections;
  };

  const handleApprove = async (group: BookmakerGroup) => {
    const k = groupKey(group);
    const bookmakerKey = selected[k];
    if (!bookmakerKey) {
      toast.error("Select a bookmaker for this market");
      return;
    }
    const selections = buildSelections(group);
    if (!selections) return;
    for (const s of selections) {
      if (!s.odds || s.odds <= 1) {
        toast.error(`Invalid odds for ${s.name}`);
        return;
      }
    }
    setApproving(k);
    try {
      const token = getAccessToken();
      await api.post(
        `/games/${gameId}/markets/approve`,
        {
          marketKey: group.marketKey,
          point: group.point,
          bookmakerKey,
          selections,
        },
        token
      );
      toast.success(`${group.label} approved from ${bookmakerKey}`);
      onApproved();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setApproving(null);
    }
  };

  const handleRecordSelected = async () => {
    const savedSet = new Set(savedKeys);
    const approvals = groups
      .filter((g) => checked[groupKey(g)] && !savedSet.has(groupKey(g)))
      .map((g) => {
        const selections = buildSelections(g);
        return { marketKey: g.marketKey, point: g.point, bookmakerKey: selected[groupKey(g)] ?? "", selections: selections ?? [] };
      })
      .filter((a) => a.bookmakerKey && a.selections.length > 0);
    if (approvals.length === 0) {
      toast.error("Select at least one market and ensure a bookmaker is chosen");
      return;
    }
    setRecording(true);
    try {
      const token = getAccessToken();
      const res = await api.post<{ message: string; data: { success: boolean; message: string }[] }>(`/games/${gameId}/markets/approve-bulk`, { approvals }, token);
      const results = res.data ?? [];
      const ok = results.filter((r) => r.success).length;
      const fail = results.filter((r) => !r.success).length;
      if (fail > 0) {
        toast.success(`Recorded ${ok}/${results.length} markets (${fail} failed — ${results.find((r) => !r.success)?.message ?? ""})`);
      } else {
        toast.success(res.message || "Markets recorded");
      }
      setChecked({});
      onApproved();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record markets");
    } finally {
      setRecording(false);
    }
  };

  const handleAutoFill = async () => {
    setAutoFillOpen(false);
    setAutoFilling(true);
    try {
      const savedSet = new Set(savedKeys);
      // Select all unsaved groups, use first bookmaker for each
      const newSelected: Record<string, string> = {};
      const approvals = [];
      for (const g of groups) {
        const k = groupKey(g);
        if (savedSet.has(k)) continue; // skip already saved
        const bk = g.bookmakers[0]?.bookmakerKey;
        if (!bk) continue;
        newSelected[k] = bk;
        const bm = g.bookmakers.find((b) => b.bookmakerKey === bk);
        if (!bm) continue;
        const selections = bm.outcomes.map((o) => ({
          name: o.name,
          point: o.point ?? undefined,
          odds: Number(o.price),
        }));
        approvals.push({ marketKey: g.marketKey, point: g.point, bookmakerKey: bk, selections });
      }
      if (approvals.length === 0) {
        toast.error("No unsaved markets to auto-fill");
        return;
      }
      const token = getAccessToken();
      const res = await api.post<{ message: string; data: { success: boolean; message: string }[] }>(`/games/${gameId}/markets/approve-bulk`, { approvals }, token);
      const results = res.data ?? [];
      const ok = results.filter((r) => r.success).length;
      const fail = results.filter((r) => !r.success).length;
      if (fail > 0) {
        toast.success(`Auto-filled ${ok}/${approvals.length} markets (${fail} failed — ${results.find((r) => !r.success)?.message ?? ""})`);
      } else {
        toast.success(`Auto-filled ${ok} markets`);
      }
      setChecked({});
      setSelected(newSelected);
      onApproved();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Auto-fill failed");
    } finally {
      setAutoFilling(false);
    }
  };

  if (!externalEventId) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
        <CardContent className="py-6 text-center text-sm text-amber-800 dark:text-amber-200">
          This game has no <span className="font-mono">externalEventId</span> — cannot fetch bookmaker odds. Create the game via the Premier League / Champions League fetch flow to get an external id.
        </CardContent>
      </Card>
    );
  }

  const selectedCount = groups.filter((g) => checked[groupKey(g)] && !savedKeys.includes(groupKey(g))).length;

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Download className="size-5 text-primary" /> Fetch Available Markets
            </CardTitle>
            <CardDescription>All market types via getAllMarketsOddsUrl — grouped by market → bookmaker.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setAutoFillOpen(true)} disabled={autoFilling || groups.length === 0} variant="outline" className="border-secondary/30 text-secondary hover:bg-secondary/10" title="Select all markets, pick first bookmaker, and record all at once">
              {autoFilling ? <RefreshCw className="size-4 animate-spin" /> : <Wand2 className="size-4" />} Auto Fill
            </Button>
            {selectedCount > 0 && (
              <Button onClick={handleRecordSelected} disabled={recording} className="bg-secondary gap-1">
                {recording ? "Recording..." : "Record Selected"} ({selectedCount})
              </Button>
            )}
            <Button onClick={handleFetch} disabled={fetching} className="bg-primary">
              {fetching ? "Fetching..." : "Fetch Available Markets"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasJson && !hasSelection && (
          <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Market data is available for this game but no market has been recorded yet. Check the markets below, choose a bookmaker source, and press{" "}
              <span className="font-semibold">Record Selected</span>.
            </span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No bookmaker odds yet — click Fetch</div>
        ) : (
          groups.map((group) => {
            const k = groupKey(group);
            const chosen = selected[k];
            const bm = group.bookmakers.find((b) => b.bookmakerKey === chosen) ?? group.bookmakers[0];
            const previewEdits = edits[k] ?? {};
            const isChecked = !!checked[k];
            const isSaved = savedKeys.includes(k);
            return (
              <Accordion key={k} type="multiple" className={`rounded-xl border overflow-hidden ${isSaved ? "border-secondary/40 bg-secondary/5" : "border-border"}`}>
                <AccordionItem value={k}>
                  <AccordionTrigger className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b ${isSaved ? "bg-secondary/10" : "bg-muted/50"}`}>
                    <div className="flex items-center gap-2">
                      {isSaved ? (
                        <span className="grid size-4 place-items-center rounded border border-secondary bg-secondary text-white">
                          <Check className="size-3" />
                        </span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setChecked((prev) => ({ ...prev, [k]: e.target.checked }))}
                          className="size-4 rounded border-input accent-primary"
                        />
                      )}
                      <span className="font-semibold text-sm">{group.label}</span>
                      {isSaved && (
                        <Badge className="bg-secondary text-white gap-1">
                          <Check className="size-3" /> Saved
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {group.count} bookmaker{group.count > 1 ? "s" : ""}
                      </Badge>
                      {group.warning && (
                        <Badge className="bg-amber-500 text-white gap-1">
                          <AlertTriangle className="size-3" /> Only 1 bookmaker
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground hidden sm:inline">Source:</span>
                      <select
                        value={chosen ?? ""}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setSelected((prev) => ({ ...prev, [k]: e.target.value }))}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        {group.bookmakers.map((b) => (
                          <option key={b.bookmakerKey} value={b.bookmakerKey}>
                            {b.bookmakerKey}
                          </option>
                        ))}
                      </select>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="divide-y divide-border">
                      {group.bookmakers.map((b) => {
                        const isChosen = b.bookmakerKey === chosen;
                        return (
                          <div key={b.bookmakerKey} className={`px-4 py-2 flex flex-wrap items-center gap-3 text-xs ${isChosen ? "bg-primary/5" : "bg-card"}`}>
                            <span className={`font-mono font-semibold min-w-[90px] ${isChosen ? "text-primary" : "text-foreground"}`}>{b.bookmakerKey}</span>
                            <span className="text-muted-foreground">last_update: {new Date(b.last_update).toLocaleString()}</span>
                            <div className="ml-auto flex flex-wrap gap-2">
                              {b.outcomes.map((o, oi) => (
                                <span key={`${b.bookmakerKey}-${o.name}-${o.point ?? "null"}-${oi}`} className={`rounded-full border px-2 py-0.5 ${isChosen ? "bg-primary text-white border-primary" : "bg-muted border-border"}`}>
                                  {o.name} {Number(o.price).toFixed(2)}
                                  {o.point != null ? ` (pt ${o.point})` : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {bm && (
                      <div className="p-4 bg-card border-t border-border">
                        <div className="text-xs font-semibold tracking-widest text-muted-foreground mb-2">PREVIEW — Selection rows from {bm.bookmakerKey} (editable)</div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {bm.outcomes.map((o, oi) => {
                            const editKey = `${o.name}:${o.point ?? "null"}`;
                            return (
                              <div key={`${o.name}-${o.point ?? "null"}-${oi}`} className="flex items-center gap-2">
                                <Label className="shrink-0 text-xs whitespace-nowrap">{o.name}{o.point != null ? ` ${o.point}` : ""}</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="1.01"
                                  value={previewEdits[editKey] ?? String(o.price)}
                                  onChange={(e) => setEdits((prev) => ({ ...prev, [k]: { ...(prev[k] ?? {}), [editKey]: e.target.value } }))}
                                  className="h-8 min-w-0 flex-1 font-mono text-xs"
                                />
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-3 flex justify-end">
                          <Button size="sm" onClick={() => handleApprove(group)} disabled={approving === k} className="bg-secondary gap-1">
                            {approving === k ? "Approving..." : "Approve"} <Shield className="size-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            );
          })
        )}
      </CardContent>
      <Dialog open={autoFillOpen} onOpenChange={setAutoFillOpen}>
        <DialogContent className="sm:max-w-[480px] bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="size-5 text-primary" /> Auto Fill All Markets?
            </DialogTitle>
            <DialogDescription>
              This will select all {groups.length} available markets, pick the first bookmaker for each, and record them immediately. Existing selections will be updated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAutoFillOpen(false)} disabled={autoFilling}>
              Cancel
            </Button>
            <Button onClick={handleAutoFill} disabled={autoFilling} className="bg-secondary gap-1">
              {autoFilling ? "Filling..." : "Auto Fill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function GameDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date>(() => new Date());
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Market | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    setLoading(true);
    api
      .get<{ data: Game }>(`/games/${id}`, token)
      .then((res) => setGame(res.data))
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load game");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handlePublishToggle = async () => {
    if (!game) return;
    const token = getAccessToken();
    setPublishBusy(true);
    try {
      await api.patch(`/games/${game.id}`, { isPublished: !game.isPublished }, token);
      toast.success(`Game ${!game.isPublished ? "published" : "unpublished"}`);
      setPublishOpen(false);
      const res = await api.get<{ data: Game }>(`/games/${id}`, token);
      setGame(res.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to toggle publish");
    } finally {
      setPublishBusy(false);
    }
  };

  const handleRemoveMarket = async () => {
    if (!removeTarget) return;
    const token = getAccessToken();
    setRemoveBusy(true);
    try {
      await api.delete(`/markets/${removeTarget.id}`, token);
      toast.success("Market removed");
      setRemoveOpen(false);
      setRemoveTarget(null);
      const res = await api.get<{ data: Game }>(`/games/${id}`, token);
      setGame(res.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove market");
    } finally {
      setRemoveBusy(false);
    }
  };

  const reloadGame = () => {
    const token = getAccessToken();
    api.get<{ data: Game }>(`/games/${id}`, token).then((res) => setGame(res.data)).catch(() => {});
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm font-medium">Game not found</p>
        <Button render={<Link href="/admin/games/active" />} variant="outline" className="mt-4" nativeButton={false}>
          Back to Active Games
        </Button>
      </div>
    );
  }

  const timeLeft = formatWithRemaining(game.startTime, now);
  const isLive = game.status === "LIVE";
  const isUpcoming = game.status === "SCHEDULED";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/admin/games/active" />} nativeButton={false} className="gap-1">
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Badge variant="outline" className="font-mono text-xs">
          {game.id.slice(0, 8)}…
        </Badge>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary via-primary to-[#0a0f2e] p-6 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-white text-primary border-white/20">{game.competition?.sport?.name ?? "—"}</Badge>
            <Badge variant="outline" className="flex items-center gap-1.5 border-white/20 bg-white/10 text-white">
              <LeagueLogo league={game.competition?.name} className="size-4" />
              {game.competition?.name ?? "—"}
            </Badge>
            <Badge className={game.isPublished ? "bg-secondary text-white" : "bg-white/10 text-white border-white/20"}>
              {game.isPublished ? "Published" : "Unpublished"}
            </Badge>
            <Badge className={isLive ? "bg-secondary animate-pulse text-white" : isUpcoming ? "bg-white/15 text-white" : "bg-white/10 text-white"}>{game.status}</Badge>
            <div className="ml-auto flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5">
              <span className="text-xs font-medium text-white/80">Published</span>
              <Switch checked={game.isPublished} onCheckedChange={() => setPublishOpen(true)} />
            </div>
          </div>
          <h1 className="mt-3 flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight sm:text-3xl">
            <span className="flex items-center gap-2">
              <TeamLogo name={game.homeTeam} className="size-8 rounded-full bg-white/15" />
              <span>{game.homeTeam}</span>
            </span>
            <span className="font-normal opacity-60">vs</span>
            <span className="flex items-center gap-2">
              <span>{game.awayTeam}</span>
              <TeamLogo name={game.awayTeam} className="size-8 rounded-full bg-white/15" />
            </span>
          </h1>
          {(game.status === "LIVE" || game.status === "FINISHED") && game.score && game.score.homeScoreFT != null && game.score.awayScoreFT != null && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-3 rounded-xl bg-white/15 px-4 py-2 shadow-sm">
                {game.status === "LIVE" && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#fecaca]">
                    <span className="size-2 rounded-full bg-[#ef4444] animate-pulse" /> Live
                  </span>
                )}
                <span className="font-mono text-3xl font-black text-white">
                  {game.score.homeScoreFT}<span className="mx-2 text-white/50">-</span>{game.score.awayScoreFT}
                </span>
                {game.score.homeScoreHT != null && game.score.awayScoreHT != null && (
                  <span className="text-xs text-white/60">HT {game.score.homeScoreHT}-{game.score.awayScoreHT}</span>
                )}
              </div>
              <span className="text-xs uppercase tracking-wider text-white/60">{game.status === "LIVE" ? "In play" : "Full time"}</span>
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/80">
            <span className="flex items-center gap-1">
              <Calendar className="size-4" /> {new Date(game.startTime).toLocaleString()}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1 font-mono">
              <Clock className="size-4" /> {timeLeft}
            </span>
          </div>
          {game.externalEventId && (
            <div className="mt-2 flex items-center gap-2 text-xs text-white/60">
              <Hash className="size-3" /> External: <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded">{game.externalEventId}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="size-5 text-primary" /> Basic Details
            </CardTitle>
            <CardDescription>Core game information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Home Team</div>
                <div className="font-semibold">{game.homeTeam}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Away Team</div>
                <div className="font-semibold">{game.awayTeam}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Competition</div>
                <div>{game.competition?.name ?? "—"} <span className="text-xs text-muted-foreground">({game.competition?.sport?.name ?? "—"})</span></div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Start Time</div>
                <div className="font-mono text-xs">{new Date(game.startTime).toLocaleString()}</div>
                <div className="text-xs text-primary font-medium">{timeLeft}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <Badge className={game.status === "LIVE" ? "bg-secondary" : "bg-primary/15 text-primary"}>{game.status}</Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Published</div>
                {game.isPublished ? (
                  <Badge className="bg-secondary text-white gap-1">
                    <Check className="size-3" /> Yes
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/20 text-amber-600 gap-1">
                    <X className="size-3" /> No
                  </Badge>
                )}
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Created</div>
                <div className="text-xs">{new Date(game.createdAt).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Updated</div>
                <div className="text-xs">{new Date(game.updatedAt).toLocaleString()}</div>
              </div>
            </div>
            {game.specifications && (
              <>
                <Separator />
                <div>
                  <Tabs defaultValue="details">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold tracking-widest text-muted-foreground">SPECIFICATIONS</div>
                      <TabsList>
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="json">JSON</TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="details">
                      <SpecsDetails specs={game.specifications} />
                    </TabsContent>
                    <TabsContent value="json">
                      <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs font-mono">{JSON.stringify(game.specifications, null, 2)}</pre>
                    </TabsContent>
                  </Tabs>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="size-4 text-primary" /> Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Markets</span>
              <span className="font-semibold">{game.markets.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Selections</span>
              <span className="font-semibold">{game.markets.reduce((a, m) => a + m.selections.length, 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time Left</span>
              <span className="font-mono text-xs">{timeLeft}</span>
            </div>
            <Separator />
            <div className="flex gap-2">
              <Button render={<Link href="/admin/games/active" />} variant="outline" className="flex-1" size="sm" nativeButton={false}>
                <Trophy className="size-4" /> Active Games
              </Button>
              <Button render={<Link href={`/admin/games/${game.id}`} />} size="sm" className="flex-1 bg-primary" nativeButton={false}>
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-5 text-primary" /> External APIs
          </CardTitle>
          <CardDescription>The Odds API and football-data.org data for this game. Fetch all-market odds saves to this game&apos;s JSON file.</CardDescription>
        </CardHeader>
        <CardContent>
          <GameApiInfo gameId={game.id} showFetch onFetched={reloadGame} />
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="size-5 text-primary" /> Edit API links
          </CardTitle>
          <CardDescription>
            Connect this game to The Odds API event id and football-data match id — search and confirm, or type the id directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GameApiLinkEditor gameId={game.id} onUpdated={reloadGame} />
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-5 text-primary" /> Markets
            <Badge variant="secondary" className="ml-2 bg-primary/15 text-primary">
              {game.markets.length}
            </Badge>
          </CardTitle>
          <CardDescription>Odds markets for this game — fetch from bookmakers, select source, approve</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {game.markets.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No markets yet — fetch from bookmakers below</div>
          ) : (
            <Accordion type="multiple" className="divide-y divide-border">
              {game.markets.map((m) => {
                const sources = Array.isArray(m.sourceBookmakerKeys) ? m.sourceBookmakerKeys.filter((k): k is string => typeof k === "string") : [];
                return (
                <AccordionItem key={m.id} value={m.id}>
                  <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                    <div className="flex w-full flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{m.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {m.type}
                        </Badge>
                        <Badge className={m.status === "OPEN" ? "bg-secondary text-white" : "bg-muted"}>{m.status}</Badge>
                        {sources.length > 0 && (
                          <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-[10px] text-primary" title={sources.join(", ")}>
                            <BookOpen className="size-3" /> {sources[0]}
                            {sources.length > 1 ? ` +${sources.length - 1}` : ""}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{m.selections.length} selections</span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); setRemoveTarget(m); setRemoveOpen(true); }}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setRemoveTarget(m); setRemoveOpen(true); } }}
                          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-destructive border border-destructive/30 hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3" /> Remove
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {sources.length > 0 && (
                      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <BookOpen className="size-3.5" /> Source bookmaker{sources.length > 1 ? "s" : ""}: <span className="font-mono text-foreground">{sources.join(", ")}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {m.selections.map((s) => (
                        <span
                          key={s.id}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${s.isWinning ? "bg-secondary text-white border-secondary" : "bg-muted border-border"}`}
                        >
                          {s.name} <span className="font-mono font-bold">{Number(s.odds).toFixed(2)}</span>
                        </span>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <BookmakerMarketsSection gameId={game.id} externalEventId={game.externalEventId} onApproved={() => {
        const token = getAccessToken();
        api.get<{ data: Game }>(`/games/${id}`, token).then((res) => setGame(res.data)).catch(()=>{});
      }} />

      {/* Publish toggle warning dialog */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="sm:max-w-[420px] bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" /> {game.isPublished ? "Unpublish Game?" : "Publish Game?"}
            </DialogTitle>
            <DialogDescription>
              You are about to <span className="font-semibold">{game.isPublished ? "unpublish" : "publish"}</span>{" "}
              <span className="font-medium">{game.homeTeam} vs {game.awayTeam}</span>.{" "}
              {game.isPublished ? "It will no longer be visible to players." : "It will become visible to players."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)} disabled={publishBusy}>
              Cancel
            </Button>
            <Button onClick={handlePublishToggle} disabled={publishBusy} className={game.isPublished ? "bg-destructive hover:bg-destructive/90" : "bg-primary"}>
              {publishBusy ? "Saving..." : game.isPublished ? "Unpublish" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove market warning dialog */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="sm:max-w-[420px] bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-destructive" /> Remove Market?
            </DialogTitle>
            <DialogDescription>
              Remove <span className="font-mono font-semibold">{removeTarget?.name}</span>? Its selections and odds history will be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveOpen(false)} disabled={removeBusy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveMarket} disabled={removeBusy}>
              {removeBusy ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
