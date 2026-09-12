"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, RefreshCw, Trophy, Star, Download } from "lucide-react";

const SPINNER = "/assets/custom/infinite-spinner.svg";

export type GameApiDetails = {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: string;
  sportKey: string;
  competition: { id: string; name: string; country: string | null } | null;
  oddsApi: {
    present: boolean;
    eventId: string | null;
    sportKey: string;
    lastFetchedAt: string | null;
    file: { exists: boolean; fileName: string | null; bookmakerCount: number; marketCount: number; updatedAt: string | null };
    rawEvent: unknown;
  };
  footballData: {
    present: boolean;
    matchId: number | null;
    startTime: string | null;
    matchStatus: string | null;
    raw: unknown;
    score: { homeScoreHT: number; awayScoreHT: number; homeScoreFT: number; awayScoreFT: number; winner: string | null; status: string } | null;
  };
  staged: { id: string; status: string; footballDataStatus: string | null } | null;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="break-all text-right font-medium">{children}</span>
    </div>
  );
}

function RawToggle({ label, value }: { label: string; value: unknown }) {
  if (value == null) return null;
  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">{label} (raw)</summary>
      <pre className="mt-1 max-h-52 overflow-auto rounded-md bg-black/40 p-2 text-[10px] leading-relaxed text-white/80">{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

export function GameApiInfo({ gameId, showFetch = true, onFetched }: { gameId: string; showFetch?: boolean; onFetched?: () => void }) {
  const [data, setData] = useState<GameApiDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: GameApiDetails }>(`/games/${gameId}/api-details`, getAccessToken());
      setData(res.data);
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Failed to load API details");
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  const handleFetchOdds = async () => {
    setFetching(true);
    try {
      const res = await api.post<{ message: string }>(`/games/${gameId}/fetch-odds`, {}, getAccessToken());
      toast.success(res.message || "Odds fetched and saved to this game's JSON file");
      await load();
      onFetched?.();
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Odds fetch failed");
    } finally {
      setFetching(false);
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center gap-2 py-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SPINNER} alt="Loading" className="size-9" />
        <p className="text-xs text-muted-foreground">Loading API data…</p>
      </div>
    );
  }

  if (!data) return <div className="py-6 text-center text-sm text-muted-foreground">No data.</div>;

  const o = data.oddsApi;
  const f = data.footballData;

  return (
    <div className="space-y-4 text-sm">
      {showFetch && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {o.file.exists
              ? `Saved to ${o.file.fileName} • ${o.file.bookmakerCount} bookmakers • ${o.file.marketCount} market types`
              : "No odds file saved for this game yet"}
          </div>
          <Button size="sm" className="h-8 gap-1.5 bg-primary hover:bg-primary/90" disabled={fetching || !o.present} onClick={handleFetchOdds}
            title={o.present ? "Fetch every market from The Odds API and save to this game's JSON file" : "Game has no externalEventId"}>
            {fetching ? <><RefreshCw className="size-4 animate-spin" /> Fetching…</> : <><Download className="size-4" /> Fetch all-market odds</>}
          </Button>
        </div>
      )}

      <Separator className="bg-white/10" />

      {/* Odds API */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {o.present ? <CheckCircle2 className="size-5 text-secondary" /> : <XCircle className="size-5 text-muted-foreground/60" />}
          <span className="flex items-center gap-1.5 font-semibold"><Trophy className="size-4 text-primary" /> The Odds API</span>
          <Badge variant="outline" className="ml-auto text-[10px]">{o.present ? "connected" : "not connected"}</Badge>
        </div>
        {o.present ? (
          <div className="space-y-1 rounded-lg border border-white/10 bg-white/5 p-3">
            <Row label="Event id"><span className="font-mono">{o.eventId}</span></Row>
            <Row label="Sport key"><span className="font-mono">{o.sportKey}</span></Row>
            <Row label="Markets file">{o.file.exists ? "present" : "not fetched yet"}</Row>
            {o.file.exists && <Row label="Bookmakers">{o.file.bookmakerCount}</Row>}
            {o.file.exists && <Row label="Market types">{o.file.marketCount}</Row>}
            {o.file.updatedAt && <Row label="File updated">{new Date(o.file.updatedAt).toLocaleString()}</Row>}
            {o.lastFetchedAt && <Row label="Last fetched (app)">{new Date(o.lastFetchedAt).toLocaleString()}</Row>}
            <RawToggle label="oddsApiRaw" value={o.rawEvent} />
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-white/15 p-3 text-muted-foreground">This game has no odds-api event id.</p>
        )}
      </div>

      {/* football-data.org */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {f.present ? <CheckCircle2 className="size-5 text-emerald-500" /> : <XCircle className="size-5 text-muted-foreground/60" />}
          <span className="flex items-center gap-1.5 font-semibold"><Star className="size-4 text-primary" /> football-data.org</span>
          <Badge variant="outline" className="ml-auto text-[10px]">{f.present ? "connected" : "not connected"}</Badge>
        </div>
        {f.present ? (
          <div className="space-y-1 rounded-lg border border-white/10 bg-white/5 p-3">
            <Row label="Match id"><span className="font-mono">{f.matchId}</span></Row>
            <Row label="Kickoff">{f.startTime ? new Date(f.startTime).toLocaleString() : "—"}</Row>
            <Row label="Match status">{f.matchStatus ?? "—"}</Row>
            {f.score && <Row label="Score (FT)">{f.score.homeScoreFT} : {f.score.awayScoreFT}</Row>}
            {f.score && <Row label="Score (HT)">{f.score.homeScoreHT} : {f.score.awayScoreHT}</Row>}
            {f.score && <Row label="Result">{f.score.status}{f.score.winner ? ` • ${f.score.winner}` : ""}</Row>}
            <RawToggle label="footballDataRaw" value={f.raw} />
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-white/15 p-3 text-muted-foreground">No football-data match linked to this game.</p>
        )}
      </div>
    </div>
  );
}
