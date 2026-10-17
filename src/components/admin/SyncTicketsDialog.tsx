"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, CircleSlash, Info, Loader2, RefreshCw, Tag, Users } from "lucide-react";

type SyncRow = {
  selectionId: string;
  fromName: string;
  toName: string;
  fromOdds: number;
  toOdds: number;
  reason: string;
  betCount: number;
};

type SyncMarket = {
  marketId: string;
  name: string;
  type: string;
  marketKey: string | null;
  line: number | null;
  fromBookmaker: string | null;
  sourceBookmaker: string;
  rows: SyncRow[];
  bets: number;
  bettors: number;
};

type Preview = {
  gameId: string;
  markets: SyncMarket[];
  noSource: { marketId: string; name: string; marketKey: string | null; line: number | null; bets: number }[];
  totals: { bets: number; bettors: number; renames: number; priceChanges: number };
};

const fmt = (n: number) => n.toFixed(2);

export default function SyncTicketsDialog({
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
  const [updateOdds, setUpdateOdds] = useState(false);

  const load = useCallback(() => {
    if (!gameId) return;
    setLoading(true);
    const token = getAccessToken();
    api
      .get<{ data: Preview }>(`/games/${gameId}/markets/ticket-sync`, token)
      .then((res) => setPreview(res.data))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to check the tickets"))
      .finally(() => setLoading(false));
  }, [gameId]);

  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setUpdateOdds(false);
    load();
  }, [open, load]);

  const run = async () => {
    if (!gameId || !preview) return;
    setBusy(true);
    try {
      const token = getAccessToken();
      const res = await api.post<{
        message: string;
        data: { renamed: number; repriced: number; betsUpdated: number; bettorsAffected: number; legsRewritten: number };
      }>(`/games/${gameId}/markets/ticket-sync`, { updateOdds }, token);
      toast.success(res.message, {
        description: res.data.legsRewritten ? `${res.data.legsRewritten} bet leg price(s) rewritten on their tickets.` : "Club names on the tickets now match the corrected markets.",
      });
      onDone();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ticket sync failed");
    } finally {
      setBusy(false);
    }
  };

  const nothing = preview && preview.markets.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-card sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" /> Update Already-Bet Tickets
          </DialogTitle>
          <DialogDescription>
            Push the corrected club names from the fetched odds onto every ticket that was already placed on this game.
            Tickets read their club name from the selection, so one fix rewrites them all at once.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Checking the tickets…
          </div>
        ) : !preview ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Could not read the tickets.</div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-xs">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Tickets affected</div>
                <div className="text-lg font-bold text-primary">{preview.totals.bets}</div>
              </div>
              <div className="rounded-lg border border-border p-2.5 text-xs">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Players</div>
                <div className="text-lg font-bold">{preview.totals.bettors}</div>
              </div>
              <div className="rounded-lg border border-border p-2.5 text-xs">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Names to fix</div>
                <div className="text-lg font-bold">{preview.totals.renames}</div>
              </div>
            </div>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-xs transition ${
                updateOdds ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              }`}
            >
              <input
                type="checkbox"
                checked={updateOdds}
                onChange={(e) => setUpdateOdds(e.target.checked)}
                className="mt-0.5 size-4 accent-primary"
              />
              <div>
                <div className="font-semibold">Also update the odds on those tickets</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  Off by default. Tick it to pull each ticket&apos;s price onto the corrected market price — every
                  <span className="font-mono"> oddsAtPlacement</span> on that selection is rewritten and the ticket&apos;s
                  total odds and potential payout are recalculated. Renaming a club never changes what a ticket is worth, so
                  this stays opt-in.
                </div>
                {updateOdds && preview.totals.priceChanges > 0 && (
                  <div className="mt-1.5 text-[11px] font-semibold text-primary">
                    {preview.totals.priceChanges} price change{preview.totals.priceChanges === 1 ? "" : "s"} will be applied
                  </div>
                )}
                {updateOdds && preview.totals.priceChanges === 0 && (
                  <div className="mt-1.5 text-[11px] text-muted-foreground">No prices differ — only the names will change.</div>
                )}
              </div>
            </label>

            {preview.markets.map((m) => (
              <div key={m.marketId} className="space-y-1.5 rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{m.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {m.type}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {m.bets} ticket{m.bets === 1 ? "" : "s"} · {m.bettors} player{m.bettors === 1 ? "" : "s"}
                  </Badge>
                  {m.fromBookmaker !== m.sourceBookmaker && (
                    <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-600">
                      names from {m.sourceBookmaker}
                    </Badge>
                  )}
                </div>
                <div className="divide-y divide-border">
                  {m.rows.map((r) => {
                    const rename = r.fromName !== r.toName;
                    const reprice = Math.abs(r.fromOdds - r.toOdds) > 0.0005;
                    return (
                      <div key={r.selectionId} className="flex flex-wrap items-center gap-2 py-1.5 text-xs">
                        <span className={`font-medium ${rename ? "text-muted-foreground line-through" : ""}`}>{r.fromName}</span>
                        {rename ? (
                          <>
                            <ArrowRight className="size-3 text-muted-foreground" />
                            <span className="flex items-center gap-1 font-semibold text-primary">
                              <Tag className="size-3" /> {r.toName}
                            </span>
                          </>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">name already correct</span>
                        )}

                        <span className="ml-auto flex flex-wrap items-center gap-1.5">
                          {r.betCount > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              {r.betCount} bet leg{r.betCount === 1 ? "" : "s"}
                            </Badge>
                          )}
                          {reprice ? (
                            updateOdds ? (
                              <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px]">
                                {fmt(r.fromOdds)} <ArrowRight className="inline size-2.5" /> <span className="font-bold">{fmt(r.toOdds)}</span>
                              </span>
                            ) : (
                              <span className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                odds kept at {fmt(r.fromOdds)}
                                <span className="ml-1 text-primary">(source {fmt(r.toOdds)})</span>
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] text-muted-foreground">price unchanged</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {nothing && (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0" /> Every club name players bet on already matches the fetched
                odds. Nothing to sync.
              </div>
            )}

            {preview.noSource.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CircleSlash className="size-4 text-muted-foreground" /> Left alone — no odds source to compare against
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {preview.noSource.map((m) => (
                    <Badge key={m.marketId} variant="outline" className="text-[10px]">
                      {m.name} · {m.bets} ticket{m.bets === 1 ? "" : "s"}
                    </Badge>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  The fetched odds no longer offer these markets, so there is nothing authoritative to rename them from.
                </p>
              </div>
            )}

            {preview.markets.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
                <div className="mb-1 font-semibold text-foreground">What happens on confirm</div>
                <ul className="list-inside list-disc space-y-0.5">
                  <li>Club names are corrected on the market selection, so every ticket holding it shows the new name.</li>
                  {updateOdds ? (
                    <>
                      <li>The selection&apos;s own odds are set to the source price and an odds-history row is written.</li>
                      <li>
                        Each ticket leg gets the new price and <span className="font-mono">totalOdds</span> /{" "}
                        <span className="font-mono">potentialPayout</span> are recalculated.
                      </li>
                      <li>No money moves — only the recorded figures, on open and settled tickets alike.</li>
                    </>
                  ) : (
                    <li>No ticket value changes at all — only the displayed club name.</li>
                  )}
                  <li>Written to the admin activity log as BET_TICKETS_SYNCED.</li>
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {preview && preview.totals.bets > 0 && (
            <span className="mr-auto flex items-center gap-1 text-[11px] text-muted-foreground">
              <RefreshCw className="size-3" /> {preview.totals.bets} ticket{preview.totals.bets === 1 ? "" : "s"} will show the
              corrected names
            </span>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={run} disabled={busy || loading || !preview || preview.markets.length === 0} className="bg-primary gap-1">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />}
            {busy ? "Updating…" : "Update tickets"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}