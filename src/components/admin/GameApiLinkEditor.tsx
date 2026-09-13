"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Link2, Search, Unlink, Trophy, Star, AlertTriangle, Radio } from "lucide-react";

type FdSummary = {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  season: string | null;
  competition: string | null;
  home: { id: number; name: string; shortName: string | null; tla: string | null } | null;
  away: { id: number; name: string; shortName: string | null; tla: string | null } | null;
  score: { fullTimeHome: number | null; fullTimeAway: number | null; halfTimeHome: number | null; halfTimeAway: number | null; winner: string | null } | null;
};

type Links = {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  competition: { id: string; name: string; country: string | null } | null;
  externalEventId: string | null;
  sportKey: string | null;
  footballDataMatchId: number | null;
  fromScoreOrStaged: boolean;
};

type FindFdResult = {
  found: boolean;
  match?: FdSummary;
  searched: { choice: string; day: string; homeTeam: string; awayTeam: string; fixturesThatDay: number };
  dayFixtures: FdSummary[];
};

type OddsCandidate = {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  usedByGameId: string | null;
  usedByStagedId: string | null;
};

type FindOddsResult = {
  found: boolean;
  reason?: string;
  searched: { choice: string; day: string; homeTeam: string; awayTeam: string };
  candidates: OddsCandidate[];
};

type PendingConfirm =
  | { kind: "link-fd"; match: FdSummary }
  | { kind: "link-odds"; candidate: { id: string; label: string; sub: string } }
  | { kind: "unlink-fd" }
  | { kind: "unlink-odds" };

function fmtDate(s: string | null | undefined) {
  return s ? new Date(s).toLocaleString() : "—";
}

export function GameApiLinkEditor({ gameId, onUpdated }: { gameId: string; onUpdated?: () => void }) {
  const [links, setLinks] = useState<Links | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [findFdResult, setFindFdResult] = useState<FindFdResult | null>(null);
  const [selectedFd, setSelectedFd] = useState<FdSummary | null>(null);
  const [manualFd, setManualFd] = useState("");

  const [findOddsResult, setFindOddsResult] = useState<FindOddsResult | null>(null);
  const [manualOdds, setManualOdds] = useState("");

  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Links }>(`/games/${gameId}/api-links`, getAccessToken());
      setLinks(res.data);
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Failed to load API links");
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    load();
  }, [load]);

  const afterChange = async () => {
    await load();
    onUpdated?.();
  };

  const runFindFd = async () => {
    setBusy("find-fd");
    try {
      const res = await api.post<{ data: FindFdResult }>(`/games/${gameId}/api-links/find-fd`, {}, getAccessToken());
      setFindOddsResult(null);
      setFindFdResult(res.data);
      setSelectedFd(res.data.match ?? null);
      if (!res.data.found) toast.info(res.data.dayFixtures.length ? `No exact match — ${res.data.dayFixtures.length} fixture(s) that day. Pick one below.` : "No football-data fixtures found for that day.");
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Search failed");
    } finally {
      setBusy(null);
    }
  };

  const runFindOdds = async () => {
    setBusy("find-odds");
    try {
      const res = await api.post<{ data: FindOddsResult }>(`/games/${gameId}/api-links/find-odds`, {}, getAccessToken());
      setFindFdResult(null);
      setSelectedFd(null);
      setFindOddsResult(res.data);
      if (!res.data.found) toast.info("No odds-api events matched — the event may already have started/finished. Type the id manually below.");
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Search failed");
    } finally {
      setBusy(null);
    }
  };

  const doConfirm = async () => {
    if (!confirm) return;
    const token = getAccessToken();
    try {
      if (confirm.kind === "link-fd") {
        setBusy("link-fd");
        const res = await api.post<{ message: string; data: { warnings: string[] } }>(`/games/${gameId}/api-links/link-fd`, { matchId: confirm.match.id }, token);
        toast.success(res.message + (res.data.warnings.length ? ` — ${res.data.warnings.join("; ")}` : ""));
        setFindFdResult(null);
        setSelectedFd(null);
        setManualFd("");
      } else if (confirm.kind === "link-odds") {
        setBusy("link-odds");
        const res = await api.post<{ message: string; data: { warnings: string[] } }>(`/games/${gameId}/api-links/link-odds`, { eventId: confirm.candidate.id }, token);
        toast.success(res.message + (res.data.warnings.length ? ` — ${res.data.warnings.join("; ")}` : ""));
        setFindOddsResult(null);
        setManualOdds("");
      } else if (confirm.kind === "unlink-fd") {
        setBusy("unlink-fd");
        await api.post(`/games/${gameId}/api-links/unlink-fd`, {}, token);
        toast.success("football-data match unlinked");
      } else if (confirm.kind === "unlink-odds") {
        setBusy("unlink-odds");
        await api.post(`/games/${gameId}/api-links/link-odds`, { eventId: "" }, token);
        toast.success("Odds API event id removed");
      }
      setConfirm(null);
      await afterChange();
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const requestLinkFd = (m: FdSummary) => setConfirm({ kind: "link-fd", match: m });
  const requestLinkOdds = (c: { id: string; label: string; sub: string }) => setConfirm({ kind: "link-odds", candidate: c });

  const submitManualFd = () => {
    const n = Number(manualFd.trim());
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter a valid football-data match id (number)");
      return;
    }
    requestLinkFd({ id: n, utcDate: "", status: "unknown", matchday: null, season: null, competition: null, home: null, away: null, score: null });
  };

  const submitManualOdds = () => {
    const id = manualOdds.trim();
    if (!/^[0-9a-zA-Z]{16,64}$/.test(id)) {
      toast.error("Enter a valid odds-api event id (hex hash)");
      return;
    }
    requestLinkOdds({ id, label: "manually typed event id", sub: id });
  };

  if (loading) return <div className="py-4 text-sm text-muted-foreground">Loading API links…</div>;
  if (!links) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Odds API side */}
        <div className="rounded-xl border border-border p-3">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-primary" />
            <span className="text-sm font-semibold">The Odds API — event id</span>
            {links.externalEventId ? <CheckCircle2 className="size-4 text-secondary" /> : <XCircle className="size-4 text-muted-foreground/60" />}
          </div>
          <div className="mt-2 text-xs">
            {links.externalEventId ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono">{links.externalEventId}</Badge>
                {links.sportKey && <span className="text-muted-foreground">{links.sportKey}</span>}
                <Button size="sm" variant="outline" className="h-6 gap-1 text-[11px] border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => setConfirm({ kind: "unlink-odds" })}>
                  <Unlink className="size-3" /> Remove
                </Button>
              </div>
            ) : (
              <span className="text-muted-foreground">Not set — search the feed or type the id.</span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-7 gap-1" disabled={!!busy} onClick={runFindOdds}>
              {busy === "find-odds" ? <Search className="size-3.5 animate-pulse" /> : <Search className="size-3.5" />} Search feed for match
            </Button>
          </div>
          <div className="mt-2 flex gap-2">
            <Input placeholder="paste odds-api event id…" value={manualOdds} onChange={(e) => setManualOdds(e.target.value)} className="h-7 flex-1 font-mono text-[11px]" />
            <Button size="sm" className="h-7 gap-1 bg-primary" disabled={!!busy || !manualOdds.trim()} onClick={submitManualOdds}>
              <Link2 className="size-3.5" /> Connect
            </Button>
          </div>

          {findOddsResult && (
            <div className="mt-3 space-y-2">
              {!findOddsResult.found && <div className="text-xs text-amber-600 dark:text-amber-400">No candidates in the current feed ({findOddsResult.reason ?? "no match"}).</div>}
              {findOddsResult.candidates.map((c) => {
                const blocked = !!c.usedByGameId;
                return (
                  <div key={c.id} className="rounded-lg border border-border bg-muted/40 p-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{c.home_team} vs {c.away_team}</span>
                      <Button size="sm" className="h-6 gap-1 text-[11px] bg-secondary" disabled={blocked || !!busy} onClick={() => requestLinkOdds({ id: c.id, label: `${c.home_team} vs ${c.away_team}`, sub: c.id })}>
                        <Link2 className="size-3" /> Connect
                      </Button>
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{c.id}</div>
                    <div className="text-muted-foreground">{fmtDate(c.commence_time)} • {c.sport_key}
                      {blocked && <span className="ml-1 text-destructive">— already used by game {c.usedByGameId?.slice(0, 8)}…</span>}
                      {!blocked && c.usedByStagedId && <span className="ml-1 text-amber-600 dark:text-amber-400">— also staged ({c.usedByStagedId.slice(0, 8)}…)</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* football-data side */}
        <div className="rounded-xl border border-border p-3">
          <div className="flex items-center gap-2">
            <Star className="size-4 text-primary" />
            <span className="text-sm font-semibold">football-data.org — match id</span>
            {links.footballDataMatchId ? <CheckCircle2 className="size-4 text-emerald-500" /> : <XCircle className="size-4 text-muted-foreground/60" />}
          </div>
          <div className="mt-2 text-xs">
            {links.footballDataMatchId ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono">{links.footballDataMatchId}</Badge>
                {links.fromScoreOrStaged && <span className="text-muted-foreground">(via score/staged link)</span>}
                <Button size="sm" variant="outline" className="h-6 gap-1 text-[11px] border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => setConfirm({ kind: "unlink-fd" })}>
                  <Unlink className="size-3" /> Unlink
                </Button>
              </div>
            ) : (
              <span className="text-muted-foreground">Not linked — search fixtures or type the id.</span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-7 gap-1" disabled={!!busy} onClick={runFindFd}>
              <Search className="size-3.5" /> Search fixtures
            </Button>
          </div>
          <div className="mt-2 flex gap-2">
            <Input inputMode="numeric" placeholder="football-data match id (e.g. 560577)" value={manualFd} onChange={(e) => setManualFd(e.target.value)} className="h-7 flex-1 font-mono text-[11px]" />
            <Button size="sm" className="h-7 gap-1 bg-primary" disabled={!!busy || !manualFd.trim()} onClick={submitManualFd}>
              <Link2 className="size-3.5" /> Connect
            </Button>
          </div>

          {findFdResult && (
            <div className="mt-3 space-y-2">
              {findFdResult.found && findFdResult.match && (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-2 text-xs">
                  <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-3.5" /> Best match</div>
                  <FdSummaryRow m={findFdResult.match} />
                  <Button size="sm" className="mt-2 h-6 gap-1 w-full bg-emerald-600 text-white hover:bg-emerald-600/90" disabled={!!busy} onClick={() => requestLinkFd(findFdResult.match!)}>
                    <Link2 className="size-3" /> Connect best match
                  </Button>
                </div>
              )}
              <div className="text-[11px] text-muted-foreground">All fixtures on {findFdResult.searched.day} ({findFdResult.dayFixtures.length}):</div>
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {findFdResult.dayFixtures.map((m) => (
                  <label key={m.id} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-xs ${selectedFd?.id === m.id ? "border-primary bg-primary/5" : "border-border"}`}>
                    <input type="radio" name="fd-candidate" className="mt-0.5 size-3.5 accent-[var(--primary)]" checked={selectedFd?.id === m.id} onChange={() => setSelectedFd(m)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{m.home?.name ?? "?"} vs {m.away?.name ?? "?"}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">#{m.id}</span>
                      </div>
                      <div className="text-muted-foreground">{fmtDate(m.utcDate)} • {m.status}{m.score?.fullTimeHome != null ? ` • ${m.score.fullTimeHome}-${m.score.fullTimeAway}` : ""}</div>
                    </div>
                  </label>
                ))}
              </div>
              {selectedFd && (
                <Button size="sm" className="h-7 w-full gap-1 bg-primary" disabled={!!busy} onClick={() => requestLinkFd(selectedFd)}>
                  <Link2 className="size-3.5" /> Connect selected ({selectedFd.home?.name ?? "?"} vs {selectedFd.away?.name ?? "?"})
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      <Dialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <DialogContent className="sm:max-w-[460px] bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              {confirm?.kind === "link-fd" && "Confirm football-data link"}
              {confirm?.kind === "link-odds" && "Confirm Odds API link"}
              {confirm?.kind === "unlink-fd" && "Unlink football-data match?"}
              {confirm?.kind === "unlink-odds" && "Remove Odds API event id?"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {confirm && (
                <span className="block space-y-2">
                  <span className="block">Game: <span className="font-semibold">{links.homeTeam} vs {links.awayTeam}</span> <span className="text-muted-foreground">({fmtDate(links.startTime)})</span></span>
                  {confirm.kind === "link-fd" && (
                    <>
                      <span className="block">Link to football-data match <span className="font-mono font-semibold">#{confirm.match.id}</span>:</span>
                      <FdSummaryRow m={confirm.match} />
                      {(confirm.match.id === links.footballDataMatchId) && <span className="block text-amber-600 dark:text-amber-400">This is the same id that is already linked.</span>}
                      {confirm.match.status === "unknown" && <span className="block text-amber-600 dark:text-amber-400">Manually typed id — teams/date are NOT validated against football-data until the score sync runs.</span>}
                    </>
                  )}
                  {confirm.kind === "link-odds" && (
                    <>
                      <span className="block">Set odds-api event <span className="font-mono font-semibold">{confirm.candidate.id}</span></span>
                      {confirm.candidate.sub !== confirm.candidate.id && <span className="block text-muted-foreground">{confirm.candidate.sub}</span>}
                      <span className="block text-muted-foreground">{confirm.candidate.label}</span>
                      {confirm.candidate.id === links.externalEventId && <span className="block text-amber-600 dark:text-amber-400">This is the same id that is already set.</span>}
                    </>
                  )}
                  {confirm.kind === "unlink-fd" && <span className="block">Current match id <span className="font-mono font-semibold">#{links.footballDataMatchId}</span> will be removed from this game&apos;s specifications.</span>}
                  {confirm.kind === "unlink-odds" && <span className="block">Current event id <span className="font-mono font-semibold">{links.externalEventId}</span> will be removed — market fetching will stop working until a new id is set.</span>}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={!!busy}>Cancel</Button>
            <Button
              className={confirm?.kind.startsWith("unlink") ? "bg-destructive hover:bg-destructive/90" : "bg-primary"}
              onClick={doConfirm}
              disabled={!!busy}
            >
              {busy === "link-fd" || busy === "link-odds" ? <Radio className="size-4 animate-pulse" /> : null}
              {confirm?.kind.startsWith("unlink") ? "Unlink" : "Confirm & connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FdSummaryRow({ m }: { m: FdSummary }) {
  return (
    <span className="block text-xs">
      <span className="block font-medium">{m.home?.name ?? "?"} vs {m.away?.name ?? "?"} <span className="font-mono text-muted-foreground">#{m.id}</span></span>
      <span className="block text-muted-foreground">
        {m.utcDate ? fmtDate(m.utcDate) : "no date"} • {m.status}
        {m.score?.fullTimeHome != null ? ` • FT ${m.score.fullTimeHome}-${m.score.fullTimeAway}` : ""}
      </span>
    </span>
  );
}
