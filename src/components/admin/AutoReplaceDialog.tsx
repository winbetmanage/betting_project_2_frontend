"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, ArrowRight, Check, CircleSlash, Info, Loader2, RefreshCw, ShieldCheck, Sparkles, Trash2, Wand2 } from "lucide-react";

type Update = { selectionId: string; fromName: string; toName: string; fromOdds: number; toOdds: number };
type Create = { name: string; odds: number };
type Remove = { selectionId: string; name: string; odds: number };

type FixItem = {
  marketId: string;
  name: string;
  marketKey: string | null;
  fromLine: number | null;
  toLine: number | null;
  lineChanged: boolean;
  fromBookmaker: string | null;
  toBookmaker: string;
  reason: "same-bookmaker" | "first-bookmaker";
  hasChanges: boolean;
  plan: { update: Update[]; create: Create[]; remove: Remove[] };
};

type Preview = {
  gameId: string;
  fixable: FixItem[];
  noReplacement: { id: string; name: string; type: string; marketKey: string | null; sources: string[]; selectionCount: number }[];
  withBets: { id: string; name: string; betCount: number; bettorCount: number }[];
  retired: { id: string; name: string; status: string }[];
  source: { bookmakerCount: number; marketCount: number; updatedAt: string | null } | null;
};

const fmt = (n: number) => n.toFixed(2);
const line = (l: number | null) => (l == null ? "" : ` · line ${l}`);

export default function AutoReplaceDialog({
  open,
  onOpenChange,
  gameId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  gameId: string | null;
  onDone: () => void;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState<"keep" | "remove" | null>(null);

  const load = useCallback(() => {
    if (!gameId) return;
    setLoading(true);
    setDecision(null);
    const token = getAccessToken();
    api
      .get<{ data: Preview }>(`/games/${gameId}/markets/auto-replace`, token)
      .then((res) => setPreview(res.data))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to work out what needs correcting"))
      .finally(() => setLoading(false));
  }, [gameId]);

  useEffect(() => {
    if (!open) return;
    setPreview(null);
    load();
  }, [open, load]);

  const run = async () => {
    if (!gameId || !preview) return;
    if (preview.noReplacement.length > 0 && !decision) return;
    setBusy(true);
    try {
      const token = getAccessToken();
      const res = await api.post<{
        message: string;
        data: {
          marketsCorrected: number;
          marketsRemoved: number;
          marketsKept: number;
          selectionsRenamed: number;
          selectionsAdded: number;
          selectionsRemoved: number;
          oddsChanged: number;
          leftAloneWithBets: number;
          failures: { name: string; message: string }[];
        };
      }>(`/games/${gameId}/markets/auto-replace`, { noReplacement: decision ?? "keep" }, token);
      const d = res.data;
      const done =
        d.marketsCorrected > 0
          ? `${d.selectionsRenamed} renamed, ${d.selectionsAdded} added, ${d.selectionsRemoved} dropped, ${d.oddsChanged} price change(s).`
          : "Every un-bet market already matched the odds.";
      if (d.failures.length) {
        toast.warning(`${res.message}`, {
          description: `${done} ${d.failures.length} market(s) could not be written: ${d.failures
            .map((f) => f.name)
            .join(", ")}. Press Run again to finish them.`,
          duration: 12000,
        });
      } else {
        toast.success(res.message, { description: done });
      }
      onDone();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Auto replace failed");
    } finally {
      setBusy(false);
    }
  };

  const toFix = preview?.fixable.filter((f) => f.hasChanges) ?? [];
  const alreadyFine = preview?.fixable.filter((f) => !f.hasChanges) ?? [];
  const needsDecision = (preview?.noReplacement.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-card sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="size-5 text-primary" /> Auto Replace Un-Bet Markets
          </DialogTitle>
          <DialogDescription>
            Rebuilds every market on this game that nobody has bet on straight from the fetched odds — same bookmaker when
            it still offers the market, otherwise the first bookmaker of the list. Markets a player is holding are never
            touched.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Checking every market…
          </div>
        ) : !preview ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Could not work out what needs correcting.</div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-xs">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Will correct</div>
                <div className="text-lg font-bold text-primary">{toFix.length}</div>
              </div>
              <div className={`rounded-lg border p-2.5 text-xs ${needsDecision ? "border-amber-500/40 bg-amber-500/10" : "border-border"}`}>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">No replacement</div>
                <div className={`text-lg font-bold ${needsDecision ? "text-amber-600 dark:text-amber-400" : ""}`}>{preview.noReplacement.length}</div>
              </div>
              <div className="rounded-lg border border-border p-2.5 text-xs">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Left alone (has bets)</div>
                <div className="text-lg font-bold">{preview.withBets.length}</div>
              </div>
            </div>

            {preview.source && (
              <div className="text-[11px] text-muted-foreground">
                Odds file: {preview.source.bookmakerCount} bookmakers · {preview.source.marketCount} markets
                {preview.source.updatedAt ? ` · fetched ${new Date(preview.source.updatedAt).toLocaleString()}` : ""}
              </div>
            )}

            {toFix.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="size-4 text-primary" /> Will be corrected
                </div>
                <div className="space-y-2">
                  {toFix.map((item) => {
                    const renames = item.plan.update.filter((u) => u.fromName !== u.toName);
                    const oddsOnly = item.plan.update.filter((u) => u.fromName === u.toName && Math.abs(u.fromOdds - u.toOdds) > 0.0005);
                    return (
                      <div key={item.marketId} className="rounded-lg border border-border p-3 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{item.name}</span>
                          {item.fromBookmaker !== item.toBookmaker && (
                            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-600">
                              different bookmaker
                            </Badge>
                          )}
                          {item.lineChanged && (
                            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-600">
                              line {item.fromLine ?? "—"} → {item.toLine ?? "—"}
                            </Badge>
                          )}
                          {item.reason === "first-bookmaker" && item.fromBookmaker !== item.toBookmaker && (
                            <span className="text-[10px] text-muted-foreground">
                              {item.fromBookmaker ?? "no source"} no longer offers it — used the first book of the list
                            </span>
                          )}
                        </div>

                        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                          <div className="rounded border border-border bg-muted/40 p-2">
                            <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                              now <span className="font-mono normal-case text-foreground">{item.fromBookmaker ?? "—"}</span>
                              <span>{line(item.fromLine)}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {item.plan.update.map((u) => (
                                <span key={u.selectionId} className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                  {u.fromName} {fmt(u.fromOdds)}
                                </span>
                              ))}
                              {item.plan.remove.map((r) => (
                                <span key={r.selectionId} className="rounded border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 font-mono text-[10px] text-destructive line-through">
                                  {r.name} {fmt(r.odds)}
                                </span>
                              ))}
                            </div>
                          </div>
                          <ArrowRight className="hidden size-4 text-muted-foreground sm:block" />
                          <div className="rounded border border-primary/30 bg-primary/5 p-2">
                            <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                              becomes <span className="font-mono normal-case text-primary">{item.toBookmaker}</span>
                              <span>{line(item.toLine)}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {item.plan.update.map((u) => (
                                <span key={u.selectionId} className="rounded border border-primary/30 bg-background px-1.5 py-0.5 font-mono text-[10px]">
                                  {u.toName} <span className="font-bold">{fmt(u.toOdds)}</span>
                                </span>
                              ))}
                              {item.plan.create.map((c) => (
                                <span key={c.name} className="rounded border border-primary/30 bg-background px-1.5 py-0.5 font-mono text-[10px]">
                                  {c.name} <span className="font-bold text-secondary">{fmt(c.odds)} +</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {(renames.length > 0 || oddsOnly.length > 0 || item.plan.create.length > 0 || item.plan.remove.length > 0) && (
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                            {renames.map((u) => (
                              <Badge key={u.selectionId} variant="outline" className="gap-1">
                                <RefreshCw className="size-2.5" /> {u.fromName} → {u.toName}
                              </Badge>
                            ))}
                            {oddsOnly.map((u) => (
                              <Badge key={u.selectionId} variant="outline">
                                {u.toName} {fmt(u.fromOdds)} → {fmt(u.toOdds)}
                              </Badge>
                            ))}
                            {item.plan.create.map((c) => (
                              <Badge key={c.name} variant="outline" className="border-secondary/40 text-secondary">
                                + {c.name} {fmt(c.odds)}
                              </Badge>
                            ))}
                            {item.plan.remove.map((r) => (
                              <Badge key={r.selectionId} variant="outline" className="border-destructive/40 text-destructive">
                                − {r.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {needsDecision && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle className="size-4 text-amber-500" /> No replacement found — you decide
                </div>
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
                  <p className="text-muted-foreground">
                    Nobody has bet on these, and the fetched odds no longer offer them. Choose what happens before running:
                  </p>
                  <div className="mt-2.5 space-y-1.5">
                    <label
                      className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition ${
                        decision === "keep" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <input type="radio" name="no-replacement" checked={decision === "keep"} onChange={() => setDecision("keep")} className="mt-0.5 size-4 accent-primary" />
                      <div>
                        <div className="font-semibold">Keep them</div>
                        <div className="text-[11px] text-muted-foreground">
                          Leave the current prices in place. Players can still bet them.
                        </div>
                      </div>
                    </label>
                    <label
                      className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition ${
                        decision === "remove" ? "border-destructive bg-destructive/5" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="no-replacement"
                        checked={decision === "remove"}
                        onChange={() => setDecision("remove")}
                        className="mt-0.5 size-4 accent-destructive"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 font-semibold text-destructive">
                          <Trash2 className="size-3.5" /> Remove them permanently
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Deletes the market, its selections and their odds history. Nothing can bring them back — only a new
                          fetch and approval will.
                        </div>
                      </div>
                    </label>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {preview.noReplacement.map((nr) => (
                      <Badge key={nr.id} variant="outline" className="text-[10px]">
                        {nr.name} · {nr.selectionCount} selections{nr.sources[0] ? ` · ${nr.sources[0]}` : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {preview.withBets.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="size-4 text-muted-foreground" /> Left alone — players have bets here
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {preview.withBets.map((b) => (
                    <Badge key={b.id} variant="outline" className="text-[10px]">
                      {b.name} · {b.betCount} ticket{b.betCount === 1 ? "" : "s"} from {b.bettorCount}
                    </Badge>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Use <span className="font-semibold">Replace</span> on any of these to move those bets onto a corrected
                  market.
                </p>
              </div>
            )}

            {alreadyFine.length > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Check className="size-3.5" /> {alreadyFine.length} market{alreadyFine.length === 1 ? "" : "s"} already match the
                fetched odds exactly — left untouched.
              </div>
            )}
            {preview.retired.length > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <CircleSlash className="size-3.5" /> {preview.retired.length} retired market
                {preview.retired.length === 1 ? "" : "s"} (already replaced, settled or cancelled) skipped.
              </div>
            )}

            {toFix.length === 0 && !needsDecision && (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0" /> Nothing to correct — every un-bet market already matches the
                fetched odds.
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={run}
            disabled={busy || loading || !preview || (needsDecision && !decision) || (toFix.length === 0 && !needsDecision)}
            className="bg-primary gap-1"
            title="Each market is written in its own short transaction and retried if the database is busy, so a large game finishes instead of timing out halfway"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            {busy ? "Running — this can take a moment…" : "Run auto replace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}