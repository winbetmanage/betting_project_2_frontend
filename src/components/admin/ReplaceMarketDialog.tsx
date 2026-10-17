"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, ArrowRightLeft, Ban, Check, CircleSlash, Copy, Info, Loader2, RefreshCw, ShieldAlert } from "lucide-react";

type Outcome = { name: string; odds: number };

type Candidate = {
  key: string;
  marketKey: string;
  point: number | null;
  label: string;
  bookmakerKey: string;
  lastUpdate: string | null;
  outcomes: Outcome[];
  /** A different market key than the one being replaced (lay <-> standard). */
  siblingKey: boolean;
  /** A recorded market already covers this key + line, so bets merge into it. */
  mergeInto: { id: string; name: string; status: string } | null;
};

type Options = {
  market: {
    id: string;
    name: string;
    type: string;
    status: string;
    marketKey: string | null;
    line: number | null;
    betCount: number;
    bettorCount: number;
    sourceBookmakerKeys: string[];
    selections: { id: string; name: string; odds: number; betLegs: number }[];
  };
  candidates: Candidate[];
  refreshed: boolean;
  source: { bookmakerCount: number; marketCount: number; updatedAt: string | null } | null;
  noSource: boolean;
};

type PreviewRow = {
  oldSelectionId: string;
  oldName: string;
  oldOdds: number;
  betLegs: number;
  bettors: number;
  suggestion: { outcomeName: string; score: number; reason: string } | null;
  candidates: { outcomeName: string; score: number; reason: string }[];
};

type Preview = {
  candidate: Candidate;
  outcomes: Outcome[];
  anchors: string[];
  rows: PreviewRow[];
  totals: { bets: number; bettors: number; pendingBets: number; settledBets: number; voidable: boolean; voidBlockedBy: number };
};

type Plan =
  | { mode: "match"; outcomeName: string; oddsMode: "new" | "keep" }
  | { mode: "keep" }
  | { mode: "void" }
  | { mode: "block" };

const fmt = (n: number) => n.toFixed(2);

/**
 * Group candidates by market key so a substitutable variant (Match Winner (Lay)
 * <-> Match Winner) reads as its own labelled block rather than being buried in
 * one long list. The market's own key always comes first.
 */
function optionGroups(candidates: Candidate[]) {
  const byKey = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const list = byKey.get(c.marketKey) ?? [];
    list.push(c);
    byKey.set(c.marketKey, list);
  }
  return [...byKey.entries()].map(([marketKey, items]) => ({
    marketKey,
    label: items[0].label,
    sibling: items[0].siblingKey,
    items,
  }));
}

export default function ReplaceMarketDialog({
  open,
  onOpenChange,
  marketId,
  onReplaced,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  marketId: string | null;
  onReplaced: () => void;
}) {
  const [options, setOptions] = useState<Options | null>(null);
  const [loading, setLoading] = useState(false);
  const [candidateKey, setCandidateKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    setOptions(null);
    setCandidateKey(null);
    setPreview(null);
    setPlans({});
  }, []);

  useEffect(() => {
    if (!open || !marketId) return;
    reset();
    let cancelled = false;
    setLoading(true);
    const token = getAccessToken();
    api
      .get<{ data: Options }>(`/markets/${marketId}/replace-options`, token)
      .then((res) => {
        if (cancelled) return;
        setOptions(res.data);
      })
      .catch((e) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load replacement options");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, marketId, reset]);

  const selectCandidate = async (key: string) => {
    if (!marketId) return;
    setCandidateKey(key);
    setPreview(null);
    setPlans({});
    setPreviewing(true);
    try {
      const token = getAccessToken();
      const res = await api.post<{ data: Preview }>(`/markets/${marketId}/replace-preview`, { candidateKey: key }, token);
      setPreview(res.data);
      // Pre-fill: exact/strong suggestions are matched on the new odds, anything
      // left over stays "unassigned" so the admin has to decide about it.
      const used = new Set<string>();
      const next: Record<string, Plan> = {};
      for (const row of res.data.rows) {
        if (row.suggestion && !used.has(row.suggestion.outcomeName)) {
          used.add(row.suggestion.outcomeName);
          next[row.oldSelectionId] = { mode: "match", outcomeName: row.suggestion.outcomeName, oddsMode: "new" };
        } else {
          next[row.oldSelectionId] = { mode: "match", outcomeName: "", oddsMode: "new" };
        }
      }
      setPlans(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to build the match preview");
      setCandidateKey(null);
    } finally {
      setPreviewing(false);
    }
  };

  const unassigned = useMemo(() => {
    if (!preview) return [];
    return preview.rows.filter((r) => {
      const plan = plans[r.oldSelectionId];
      return plan?.mode === "match" && !plan.outcomeName;
    });
  }, [preview, plans]);

  const blocked = useMemo(() => {
    if (!preview) return [];
    return preview.rows.filter((r) => plans[r.oldSelectionId]?.mode === "block");
  }, [preview, plans]);

  /** outcome name -> the first old selection mapped onto it. */
  const takenOutcomes = useMemo(() => {
    const map = new Map<string, string>();
    if (!preview) return map;
    for (const row of preview.rows) {
      const plan = plans[row.oldSelectionId];
      if (plan?.mode === "match" && plan.outcomeName && !map.has(plan.outcomeName)) map.set(plan.outcomeName, row.oldName);
    }
    return map;
  }, [preview, plans]);

  const duplicateOutcome = useMemo(() => {
    const seen = new Set<string>();
    for (const name of takenOutcomes.keys()) {
      const owners = Object.values(plans).filter((p) => p.mode === "match" && p.outcomeName === name).length;
      if (owners > 1) seen.add(name);
    }
    return [...seen];
  }, [plans, takenOutcomes]);

  const submit = async () => {
    if (!marketId || !preview || !options) return;
    if (unassigned.length) {
      toast.error(`Choose what to do with: ${unassigned.map((r) => `"${r.oldName}"`).join(", ")}`);
      return;
    }
    if (duplicateOutcome.length) {
      toast.error(`"${duplicateOutcome[0]}" is mapped from two selections — pick a different outcome for one of them`);
      return;
    }

    const payloadPlans = preview.rows.map((row) => {
      const plan = plans[row.oldSelectionId];
      if (plan.mode === "match") return { oldSelectionId: row.oldSelectionId, mode: "match" as const, outcomeName: plan.outcomeName, oddsMode: plan.oddsMode };
      return { oldSelectionId: row.oldSelectionId, mode: plan.mode };
    });

    setBusy(true);
    try {
      const token = getAccessToken();
      const res = await api.post<{ message: string; data: { betsUpdated: number; legsRewritten: number; legsVoided: number; bettorsAffected: number } }>(
        `/markets/${marketId}/replace`,
        { candidateKey, plans: payloadPlans },
        token
      );
      toast.success(res.message, {
        description:
          res.data.betsUpdated > 0
            ? `${res.data.bettorsAffected} player(s) updated — names and odds on their tickets now follow the new market.`
            : "No tickets were touched.",
      });
      onReplaced();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Replacement failed");
    } finally {
      setBusy(false);
    }
  };

  const currentSource = options?.market.sourceBookmakerKeys[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-card sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="size-5 text-primary" /> Replace Market
          </DialogTitle>
          <DialogDescription>
            Swap a market the odds API got wrong for the same market from another bookmaker or line. Every ticket that
            already holds a leg on it is rewritten to the new names and odds.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading replacement options…
          </div>
        ) : !options ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Could not load this market.</div>
        ) : (
          <div className="space-y-5">
            {/* Current market */}
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Replacing</span>
                <span className="font-semibold">{options.market.name}</span>
                <Badge variant="outline" className="text-xs">
                  {options.market.type}
                </Badge>
                <Badge className="bg-muted text-foreground text-xs">{options.market.status}</Badge>
                {currentSource && (
                  <Badge variant="outline" className="text-xs">
                    from {currentSource}
                  </Badge>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {options.market.selections.length} selections ·{" "}
                  <span className="font-mono">{options.market.selections.map((s) => `${s.name} ${fmt(s.odds)}`).join(" · ")}</span>
                </span>
                <span className={options.market.betCount > 0 ? "font-semibold text-amber-600 dark:text-amber-400" : ""}>
                  {options.market.betCount} ticket{options.market.betCount === 1 ? "" : "s"} from {options.market.bettorCount} player
                  {options.market.bettorCount === 1 ? "" : "s"}
                </span>
              </div>
              {options.source && (
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Odds file: {options.source.bookmakerCount} bookmakers · {options.source.marketCount} markets
                  {options.source.updatedAt ? ` · fetched ${new Date(options.source.updatedAt).toLocaleString()}` : ""}
                </div>
              )}
            </div>

            {/* Step 1 — pick the replacement */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-white">1</span>
                <span className="text-sm font-semibold">Pick the correct market</span>
              </div>
              {options.noSource ? (
                <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  No replacement found in the fetched odds for this market key{options.market.marketKey ? ` (${options.market.marketKey})` : ""}.
                  {options.refreshed
                    ? " Odds were refetched just now and it is still not offered — the bookmakers have dropped it."
                    : " Fetch this game's markets again, or use Remove if nobody has bet on it."}
                </div>
              ) : options.candidates.length === 0 ? (
                <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  Every available option for this market is already recorded on the game. Fetch fresh odds first.
                </div>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {optionGroups(options.candidates).map((group) => (
                    <div key={group.marketKey} className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{group.label}</span>
                        {group.sibling && (
                          <Badge variant="outline" className="border-secondary/40 bg-secondary/10 text-[10px] text-secondary">
                            substitutable market
                          </Badge>
                        )}
                      </div>
                      {group.items.map((c) => {
                        const active = c.key === candidateKey;
                        return (
                          <label
                            key={c.key}
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-2.5 text-xs transition ${
                              active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="replace-candidate"
                              checked={active}
                              onChange={() => selectCandidate(c.key)}
                              className="mt-0.5 size-4 accent-primary"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono font-semibold text-foreground">{c.label}</span>
                                <Badge variant="outline" className="font-mono text-[10px]">
                                  {c.bookmakerKey}
                                </Badge>
                                {currentSource === c.bookmakerKey && (
                                  <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-600">
                                    same book as now
                                  </Badge>
                                )}
                                {c.mergeInto && (
                                  <Badge
                                    variant="outline"
                                    className="border-primary/40 bg-primary/10 text-[10px] text-primary"
                                    title={`"${c.mergeInto.name}" is already recorded for this market and line — the bets will move into it rather than creating a second copy`}
                                  >
                                    merges into &ldquo;{c.mergeInto.name}&rdquo;
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {c.outcomes.map((o) => (
                                  <span key={o.name} className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                                    {o.name} {fmt(o.odds)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2 — match selections */}
            {previewing && (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Working out the club matching…
              </div>
            )}

            {preview && !previewing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-white">2</span>
                  <span className="text-sm font-semibold">Match the selections and set the odds</span>
                  <span className="text-xs text-muted-foreground">
                    {preview.totals.bets} ticket{preview.totals.bets === 1 ? "" : "s"} / {preview.totals.bettors} player
                    {preview.totals.bettors === 1 ? "" : "s"} will be updated ({preview.totals.pendingBets} open,{" "}
                    {preview.totals.settledBets} settled)
                  </span>
                </div>

                {preview.candidate.mergeInto && (
                  <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-xs">
                    <ArrowRightLeft className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>
                      <span className="font-semibold">&ldquo;{preview.candidate.mergeInto.name}&rdquo; is already recorded on this
                      game</span> for this market and line, so the bets move into it instead of a second copy being created. Its
                      own prices are kept — they are the ones the scheduled refresh maintains.
                    </span>
                  </div>
                )}

                {unassigned.length > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                    <span>
                      Decide what happens to {unassigned.map((r) => `"${r.oldName}"`).join(", ")} — pick the club it belongs to,
                      keep the old name, void the bets on it, or block the whole replacement.
                    </span>
                  </div>
                )}

                <div className="divide-y divide-border rounded-lg border border-border">
                  {preview.rows.map((row) => {
                    const plan = plans[row.oldSelectionId];
                    const matchedOutcome = preview.outcomes.find((o) => plan?.mode === "match" && o.name === plan.outcomeName) ?? null;
                    const owners = plan?.mode === "match" && plan.outcomeName ? takenOutcomes.get(plan.outcomeName) : undefined;
                    const isDuplicate = !!owners && owners !== row.oldName;
                    const oddsChanged = matchedOutcome ? Math.abs(matchedOutcome.odds - row.oldOdds) > 0.001 : false;
                    const suggestion = row.suggestion;

                    return (
                      <div key={row.oldSelectionId} className="space-y-2 p-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold">{row.oldName}</span>
                          <span className="font-mono text-muted-foreground">{fmt(row.oldOdds)}</span>
                          {row.betLegs > 0 ? (
                            <Badge variant="outline" className="text-[10px]">
                              {row.betLegs} leg{row.betLegs === 1 ? "" : "s"} · {row.bettors} player{row.bettors === 1 ? "" : "s"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              no bets
                            </Badge>
                          )}
                          {suggestion && (
                            <span className="text-[10px] text-muted-foreground">
                              suggested from &quot;{suggestion.reason}&quot; ({Math.round(suggestion.score * 100)}% sure)
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={plan?.mode === "match" ? plan.outcomeName : plan?.mode ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "keep") setPlans((p) => ({ ...p, [row.oldSelectionId]: { mode: "keep" } }));
                              else if (v === "void") setPlans((p) => ({ ...p, [row.oldSelectionId]: { mode: "void" } }));
                              else if (v === "block") setPlans((p) => ({ ...p, [row.oldSelectionId]: { mode: "block" } }));
                              else setPlans((p) => ({ ...p, [row.oldSelectionId]: { mode: "match", outcomeName: v, oddsMode: "new" } }));
                            }}
                            className={`h-8 rounded-md border bg-background px-2 text-xs ${
                              isDuplicate ? "border-destructive text-destructive" : "border-input"
                            }`}
                          >
                            <option value="">Choose what to do…</option>
                            {preview.outcomes.map((o) => (
                              <option key={o.name} value={o.name}>
                                Replace with &ldquo;{o.name}&rdquo; {fmt(o.odds)}
                              </option>
                            ))}
                            <option value="keep">Keep &ldquo;{row.oldName}&rdquo; at {fmt(row.oldOdds)}</option>
                            <option value="void" disabled={!preview.totals.voidable}>
                              Void the bets on it {preview.totals.voidable ? "" : "(already settled)"}
                            </option>
                            <option value="block">Block the replacement</option>
                          </select>

                          {plan?.mode === "match" && matchedOutcome && preview.candidate.mergeInto && (
                            <span className="text-[11px] text-muted-foreground">
                              takes the price already on &ldquo;{preview.candidate.mergeInto.name}&rdquo;
                            </span>
                          )}

                          {plan?.mode === "match" && matchedOutcome && !preview.candidate.mergeInto && (
                            <div className="flex overflow-hidden rounded-md border border-border text-xs font-medium">
                              <button
                                type="button"
                                onClick={() =>
                                  setPlans((p) => ({
                                    ...p,
                                    [row.oldSelectionId]: { mode: "match", outcomeName: plan.outcomeName, oddsMode: "new" },
                                  }))
                                }
                                className={`flex items-center gap-1 px-2 py-1.5 transition ${
                                  plan.oddsMode === "new" ? "bg-primary text-white" : "bg-muted/40 text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                Use new {fmt(matchedOutcome.odds)}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setPlans((p) => ({
                                    ...p,
                                    [row.oldSelectionId]: { mode: "match", outcomeName: plan.outcomeName, oddsMode: "keep" },
                                  }))
                                }
                                className={`flex items-center gap-1 px-2 py-1.5 transition ${
                                  plan.oddsMode === "keep" ? "bg-primary text-white" : "bg-muted/40 text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                Keep {fmt(row.oldOdds)}
                              </button>
                            </div>
                          )}

                          {plan?.mode === "void" && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <CircleSlash className="size-3" /> legs become VOID and the ticket odds are recalculated
                            </span>
                          )}
                          {plan?.mode === "keep" && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Copy className="size-3" /> carried across unchanged
                            </span>
                          )}
                          {isDuplicate && <span className="text-[11px] text-destructive">already used by &ldquo;{owners}&rdquo;</span>}
                          {plan?.mode === "match" && plan.outcomeName && !oddsChanged && (
                            <span className="text-[11px] text-muted-foreground">same odds either way</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!preview.totals.voidable && (
                  <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                    <Info className="mt-0.5 size-3.5 shrink-0" />
                    {preview.totals.voidBlockedBy} selection{preview.totals.voidBlockedBy === 1 ? " holds" : "s hold"} bet legs on
                    tickets that already settled, so voiding is unavailable for them — match the club or keep it.
                  </div>
                )}

                {blocked.length > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
                    <Ban className="mt-0.5 size-4 shrink-0" />
                    Blocked on {blocked.map((r) => `"${r.oldName}"`).join(", ")} — nothing will be written.
                  </div>
                )}

                <div className="rounded-lg border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
                  <div className="mb-1 font-semibold text-foreground">What happens on confirm</div>
                  <ul className="list-inside list-disc space-y-0.5">
                    <li>
                      {preview.candidate.mergeInto
                        ? `The bets move into the recorded "${preview.candidate.mergeInto.name}" market — no second copy is created.`
                        : `A new market is recorded from ${preview.candidate.bookmakerKey} and stays open for betting.`}
                    </li>
                    <li>
                      Every ticket leg on this market moves to the new selection with the chosen name and odds, then{" "}
                      <span className="font-mono">totalOdds</span> and <span className="font-mono">potentialPayout</span> are
                      recalculated.
                    </li>
                    <li>The old market is cancelled and kept for the audit trail — it stops accepting bets.</li>
                    <li>Everything is written to the admin activity log.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-wrap items-center gap-2">
          {options && options.market.betCount > 0 && (
            <span className="mr-auto flex items-center gap-1 text-[11px] text-muted-foreground">
              <RefreshCw className="size-3" /> {options.market.betCount} ticket{options.market.betCount === 1 ? "" : "s"} will be
              rewritten
            </span>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={busy || !preview || previewing || unassigned.length > 0 || blocked.length > 0}
            className="bg-primary gap-1"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {busy ? "Replacing…" : "Replace market"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}