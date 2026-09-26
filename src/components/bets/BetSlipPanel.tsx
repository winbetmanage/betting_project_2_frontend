"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBetSlip } from "./BetSlipProvider";
import { useTranslations } from "next-intl";
import { BetReceiptDialog, buildReceipt, type ReceiptData } from "./BetReceipt";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";
import { X, ChevronDown, ChevronUp, Ticket, Trash2 } from "lucide-react";

/**
 * Global bet slip for the dark user pages. Hidden on "/" (the BETLAB home
 * has its own slip sidebar). Placing shows a paper-receipt confirmation
 * first, then a placed-receipt.
 */
export function BetSlipPanel() {
  const t = useTranslations("home");
  const tNav = useTranslations("nav");
  const pathname = usePathname();
  const slip = useBetSlip();
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmData, setConfirmData] = useState<ReceiptData | null>(null);
  const [placedData, setPlacedData] = useState<ReceiptData | null>(null);
  const [maxStake, setMaxStake] = useState<number | null>(null);
  const [maxPayout, setMaxPayout] = useState<number | null>(null);
  const [minStake, setMinStake] = useState(10);

  useEffect(() => {
    const tok = getAccessToken();
    if (!tok) return;
    api
      .get<{ data: { maxStake?: number | null; maxPayout?: number | null; minStake?: number | null } }>("/settings/public", tok)
      .then((r) => {
        setMaxStake(r.data?.maxStake ?? null);
        setMaxPayout(r.data?.maxPayout ?? null);
        const m = Number(r.data?.minStake);
        if (Number.isFinite(m) && m >= 1) setMinStake(m);
      })
      .catch(() => {
        setMaxStake(null);
        setMaxPayout(null);
      });
  }, []);

  const openConfirm = () => {
    if (Number(slip.stake || 0) < minStake) {
      toast.error(t("minStake", { amount: minStake.toLocaleString("en-US") }));
      return;
    }
    if (maxStake != null && Number(slip.stake || 0) > maxStake) {
      toast.error(t("maxStake", { amount: maxStake.toLocaleString("en-US") }));
      return;
    }
    if (maxPayout != null && slip.potentialPayout > maxPayout) {
      toast.error(t("maxPayout", { amount: maxPayout.toLocaleString("en-US") }));
      return;
    }
    setConfirmData(buildReceipt(slip.legs, Number(slip.stake || 0), { existingOddsTotal: slip.totalOdds }));
  };

  const doPlace = async () => {
    if (!confirmData) return;
    setBusy(true);
    const res = await slip.place();
    setBusy(false);
    if (res.betId) {
      toast.success(t("betPlacedId", { id: res.betId.slice(0, 8) }));
      window.dispatchEvent(new CustomEvent("tana:bet-placed", { detail: res.betId }));
      setPlacedData({ ...confirmData, id: res.betId, placedAt: new Date().toISOString() });
      setConfirmData(null);
    } else {
      toast.error(res.error ?? t("couldNotPlace"));
      setConfirmData(null);
    }
  };

  if (pathname === "/" || (slip.count === 0 && !confirmData && !placedData)) return null;

  return (
    <>
      <div className="fixed right-3 bottom-3 left-3 z-50 pb-[env(safe-area-inset-bottom)] sm:right-3 sm:left-auto sm:w-[340px] sm:pb-0">
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#0a0f2e] text-white shadow-2xl">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-2 bg-primary px-4 py-2.5 text-sm font-bold"
          >
            <span className="flex items-center gap-2">
              <Ticket className="size-4" />
              {t("betSlip")}
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{slip.count}</span>
              {slip.count > 1 && <span className="text-[10px] font-semibold uppercase opacity-80">{t("multiple")} · {slip.totalOdds.toFixed(2)}</span>}
            </span>
            {open ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </button>

          {open && slip.count > 0 && (
            <div className="max-h-[50vh] space-y-2 overflow-y-auto p-3 sm:max-h-[55vh]">
              {slip.legs.map((l) => (
                <div key={l.selectionId} className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{l.selectionName}</div>
                      <div className="truncate text-[11px] text-white/50">
                        {l.marketName} • {l.gameLabel}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-bold text-secondary">@ {l.odds.toFixed(2)}</span>
                      <button onClick={() => slip.remove(l.selectionId)} className="grid size-7 place-items-center text-white/40 hover:text-red-400" aria-label={t("removeSelection")}>
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {open && slip.count > 0 && (
            <div className="space-y-2 border-t border-white/10 bg-[#0a0f2e] p-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold tracking-widest text-white/50">
                    {t("stake")} (ETB){` · MIN ${minStake.toLocaleString("en-US")}`}{maxStake != null && ` · MAX ${maxStake.toLocaleString("en-US")}`}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    inputMode="decimal"
                    value={slip.stake}
                    onChange={(e) => slip.setStake(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-base outline-none focus:border-secondary sm:text-sm"
                  />
                </div>
                <button
                  onClick={() => slip.clear()}
                  className="grid size-10 shrink-0 place-items-center rounded-lg border border-white/15 text-white/50 hover:text-red-400"
                  aria-label={t("clearSlip")}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="space-y-1 rounded-lg bg-white/5 p-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/50">{slip.count > 1 ? t("multipleLegs", { count: slip.count }) : t("single")}</span>
                  <span className="font-mono">{slip.totalOdds.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">{t("potentialReturns")}</span>
                  <span className="font-bold text-secondary">ETB {slip.potentialPayout.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={openConfirm}
                disabled={busy || slip.placing || !(Number(slip.stake) > 0)}
                className="w-full rounded-lg bg-secondary py-3 text-sm font-bold tracking-wide text-white shadow-md transition hover:bg-secondary/90 disabled:opacity-50"
              >
                {busy || slip.placing ? t("placing") : t("reviewBet", { kind: slip.count > 1 ? t("parlay") : t("betWord") })}
              </button>
              <p className="text-center text-[10px] text-white/35">
                {t("confirmReceiptNote")} <Link href="/my-bets" className="underline hover:text-white/70">{tNav("myBets")}</Link>
              </p>
            </div>
          )}
        </div>
      </div>

      <BetReceiptDialog
        open={!!confirmData}
        onOpenChange={(o) => { if (!o) setConfirmData(null); }}
        data={confirmData}
        busy={busy}
        onConfirm={doPlace}
      />
      <BetReceiptDialog
        open={!!placedData}
        onOpenChange={(o) => { if (!o) setPlacedData(null); }}
        data={placedData}
        confirmLabel={t("done")}
        cancelLabel=""
        onConfirm={() => setPlacedData(null)}
      />
    </>
  );
}
