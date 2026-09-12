"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle, Trash2, Loader2, ShieldAlert, Database, CheckCircle2 } from "lucide-react";

const CONFIRM_PHRASE = "DELETE ALL GAMES";

type ClearResult = {
  games: number;
  markets: number;
  selections: number;
  oddsHistories: number;
  scores: number;
  checkpoints: number;
  bets: number;
  betSelections: number;
};

export default function ClearGameDataPage() {
  const [token, setToken] = useState<string | null>(null);
  const [gameCount, setGameCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(true);

  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [result, setResult] = useState<ClearResult | null>(null);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  const loadCount = async () => {
    const t = getAccessToken() ?? token;
    setCountLoading(true);
    try {
      const res = await api.get<{ data: unknown[] }>("/games", t);
      setGameCount(Array.isArray(res.data) ? res.data.length : 0);
    } catch {
      setGameCount(null);
    } finally {
      setCountLoading(false);
    }
  };

  useEffect(() => {
    loadCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const trimmed = confirmText.trim();
  const matches = trimmed === CONFIRM_PHRASE;
  const canClear = acknowledged && matches && !clearing;

  const handleClear = async () => {
    if (!canClear) return;
    setDialogOpen(false);
    setClearing(true);
    setResult(null);
    try {
      const t = getAccessToken() ?? token;
      const res = await api.post<{ message: string; data: ClearResult }>("/games/clear-all", { confirm: CONFIRM_PHRASE }, t);
      setResult(res.data);
      toast.success(res.message || "All game data cleared");
      setAcknowledged(false);
      setConfirmText("");
      loadCount();
    } catch (e) {
      const msg = e instanceof ApiError || e instanceof Error ? e.message : "Failed to clear game data";
      toast.error(msg);
    } finally {
      setClearing(false);
    }
  };

  const resetForm = () => {
    setResult(null);
    setAcknowledged(false);
    setConfirmText("");
    loadCount();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
            <ShieldAlert className="size-3.5" /> Sensitive Area
          </div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Trash2 className="size-6 text-destructive" /> Clear Game Data
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Permanently remove all games and their dependent records. Intended for resets — use with extreme caution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-white/10 text-muted-foreground">
            <Database className="mr-1 size-3.5" />
            {countLoading ? "Counting…" : gameCount === null ? "Unknown count" : `${gameCount} games currently`}
          </Badge>
        </div>
      </div>

      {/* Warning */}
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" /> This action is not reversible
          </CardTitle>
          <CardDescription className="text-foreground/80">
            Clearing all game data permanently deletes every game and could lose useful information that cannot be
            recovered afterwards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <div className="mb-1 font-semibold text-destructive">Will be deleted</div>
              <ul className="list-inside list-disc space-y-0.5 text-foreground/80">
                <li>All games</li>
                <li>Markets, selections &amp; odds history</li>
                <li>Game scores &amp; odds checkpoints</li>
                <li>All bets placed on those games</li>
              </ul>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="mb-1 font-semibold text-secondary">Will be kept</div>
              <ul className="list-inside list-disc space-y-0.5 text-foreground/80">
                <li>Users, balances &amp; wallet</li>
                <li>Transaction ledger</li>
                <li>Teams, sports &amp; competitions</li>
                <li>Staged games (links to cleared games removed)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="size-5 text-destructive" /> Confirm to continue
          </CardTitle>
          <CardDescription>Acknowledge the warning, then type the exact phrase to enable the clear button.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 py-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 size-4 rounded border-input"
            />
            <span className="text-sm">
              I understand this is <span className="font-semibold text-destructive">permanent</span> and that all game
              data will be irreversibly deleted.
            </span>
          </label>

          {acknowledged && (
            <div className="space-y-1.5">
              <Label htmlFor="confirm-text">
                Type <span className="font-mono font-semibold text-destructive">{CONFIRM_PHRASE}</span> to confirm
              </Label>
              <Input
                id="confirm-text"
                autoComplete="off"
                spellCheck={false}
                placeholder={CONFIRM_PHRASE}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className={matches ? "border-secondary" : trimmed.length > 0 ? "border-destructive" : ""}
              />
              {trimmed.length > 0 && !matches && (
                <p className="text-xs text-destructive">Text does not match exactly.</p>
              )}
            </div>
          )}

          <Button
            variant="destructive"
            disabled={!canClear}
            onClick={() => setDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            {clearing ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Clear all game data
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className="border-secondary/30 bg-secondary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-secondary">
              <CheckCircle2 className="size-5" /> Game data cleared
            </CardTitle>
            <CardDescription>The following number of records were permanently deleted:</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[
                ["Games", result.games],
                ["Markets", result.markets],
                ["Selections", result.selections],
                ["Odds history", result.oddsHistories],
                ["Scores", result.scores],
                ["Checkpoints", result.checkpoints],
                ["Bets", result.bets],
                ["Bet selections", result.betSelections],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-lg font-bold">{value as number}</div>
                  <div className="text-xs text-muted-foreground">{label as string}</div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="mt-4 border-white/10" onClick={resetForm}>
              Done
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Final confirmation dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px] bg-card border-destructive/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" /> Delete ALL game data?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete every game and its related markets, selections, odds history, scores and bets.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="border-white/10" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClear} disabled={clearing}>
              {clearing ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Yes, delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
