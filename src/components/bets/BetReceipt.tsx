"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";

export type ReceiptLeg = {
  gameLabel: string;
  marketName: string;
  selectionName: string;
  odds: number;
  result?: "WON" | "LOST" | "VOID" | "PENDING" | string | null;
};

export type ReceiptData = {
  id?: string | null;
  type: string;
  legs: ReceiptLeg[];
  stake: number;
  totalOdds: number;
  potentialPayout: number;
  status?: string;
  settledPayout?: number | null;
  placedAt?: string | null;
  settledAt?: string | null;
};

function Barcode({ seed }: { seed: string }) {
  const bars = Array.from({ length: 42 }, (_, i) => {
    const code = (seed.charCodeAt(i % Math.max(1, seed.length)) + i * 7) % 4;
    return code === 0 ? 3 : code === 1 ? 2 : 1;
  });
  return (
    <div className="flex h-8 items-end gap-[2px]" aria-hidden>
      {bars.map((w, i) => (
        <span key={i} className="bg-[#0f172a]" style={{ width: `${w}px`, height: `${18 + ((i * 13) % 12)}px` }} />
      ))}
    </div>
  );
}

function legMark(result?: string | null, won = "WON", lost = "LOST", push = "PUSH") {
  if (result === "WON") return <span className="font-bold text-green-600">✓ {won}</span>;
  if (result === "LOST") return <span className="font-bold text-red-600">✗ {lost}</span>;
  if (result === "VOID") return <span className="font-bold text-amber-600">● {push}</span>;
  if (result) return <span className="text-slate-400">· {result}</span>;
  return null;
}

/** Build a pre-place receipt from slip legs (used by the panel and the home sidebar). */
export function buildReceipt(
  legs: { gameLabel: string; marketName: string; selectionName: string; odds: number }[],
  stake: number,
  opts?: { existingOddsTotal?: number }
): ReceiptData {
  const totalOdds = opts?.existingOddsTotal ?? legs.reduce((a, l) => a * (Number(l.odds) || 1), 1);
  return {
    id: null,
    type: legs.length > 1 ? "MULTIPLE" : "SINGLE",
    legs: legs.map((l) => ({ ...l, result: "PENDING" })),
    stake,
    totalOdds,
    potentialPayout: Math.round(stake * totalOdds * 100) / 100,
    status: "PENDING",
  };
}

/** Paper-receipt presentation of a ticket — used for pre-place confirmation and My Bets detail. */
export function BetReceipt({ data, stamp }: { data: ReceiptData; stamp?: string }) {
  const t = useTranslations("home");
  const status = data.status ?? "PENDING";
  const stampColor = status === "WON" ? "border-green-600 text-green-700" : status === "LOST" ? "border-red-600 text-red-600" : status === "VOID" ? "border-amber-600 text-amber-700" : "border-slate-400 text-slate-500";
  return (
    <div className="mx-auto w-full max-w-sm select-none bg-white font-mono text-[11px] leading-relaxed text-[#0f172a] shadow-2xl">
      {/* perforated top */}
      <div className="h-2 bg-[radial-gradient(circle_at_5px_0,transparent_5px,#fff_5.5px)] bg-[length:12px_12px]" />
      <div className="px-5 pb-5 pt-1">
        <div className="text-center bet-print-block">
          <div className="text-sm font-black tracking-[0.25em]">TANA BETTING</div>
          <div className="mt-0.5 text-[10px] tracking-[0.3em] text-slate-500">{stamp ?? (data.id ? t("receiptTitle") : t("slipConfirmTitle"))}</div>
          {data.id && <div className="mt-1 text-[10px] text-slate-400">#{data.id}</div>}
          {data.placedAt && <div className="text-[10px] text-slate-400">{new Date(data.placedAt).toLocaleString()}</div>}
        </div>

        <div className="my-3 border-t border-dashed border-slate-300" />

        <div className="flex items-center justify-between bet-print-block">
          <span className="uppercase tracking-widest text-slate-500">{t("ticketWord")}</span>
          <span className="font-bold">{data.type === "SINGLE" ? t("single") : t("multipleLegs", { count: data.legs.length })}</span>
        </div>

        <div className="mt-2 space-y-2">
          {data.legs.map((l, i) => (
            <div key={i} className="bet-print-row">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-bold uppercase">{l.selectionName}</span>
                <span className="font-bold">@ {l.odds.toFixed(2)}</span>
              </div>
              <div className="truncate text-slate-500">{i + 1}. {l.marketName}</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-slate-400">{l.gameLabel}</span>
                  {l.result ? legMark(l.result, t("wonShort"), t("lostShort"), t("pushShort")) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="my-3 border-t border-dashed border-slate-300" />

        <div className="space-y-1 bet-print-block">
          <div className="flex justify-between"><span className="text-slate-500">{t("stake")}</span><span className="font-bold">ETB {data.stake.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">{t("totalOdds").toUpperCase()}</span><span className="font-bold">{data.totalOdds.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span className="font-black uppercase">{t("potentialReturns")}</span><span className="font-black">ETB {data.potentialPayout.toFixed(2)}</span></div>
          {data.settledPayout != null && status !== "PENDING" && (
            <div className="flex justify-between text-sm">
              <span className="font-black uppercase">{status === "VOID" ? t("refunded") : status === "WON" ? t("paidOut") : t("payoutWord")}</span>
              <span className="font-black">ETB {Number(data.settledPayout).toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="my-3 border-t border-dashed border-slate-300" />

        <div className="flex items-end justify-between gap-3 bet-print-block">
          <div className="min-w-0 flex-1">
            <Barcode seed={data.id ?? `${data.legs.length}${data.stake}`} />
            <div className="mt-1 truncate text-center text-[9px] tracking-[0.3em] text-slate-400">{(data.id ?? "DRAFT").replace(/-/g, "").slice(0, 24).toUpperCase()}</div>
          </div>
          <div className={`shrink-0 -rotate-12 rounded border-4 px-2 py-1 text-[10px] font-black tracking-widest ${stampColor}`}>
            {status}
          </div>
        </div>

        <div className="mt-3 text-center text-[9px] text-slate-400">
          {t("receiptFinePrint")}
        </div>
      </div>
      {/* perforated bottom */}
      <div className="h-2 rotate-180 bg-[radial-gradient(circle_at_5px_0,transparent_5px,#fff_5.5px)] bg-[length:12px_12px]" />
    </div>
  );
}

export function BetReceiptDialog({
  open,
  onOpenChange,
  data,
  confirmLabel,
  cancelLabel,
  busy,
  onConfirm,
  showPrint = false,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  data: ReceiptData | null;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm?: () => void;
  showPrint?: boolean;
}) {
  const t = useTranslations("home");
  const confirmText = confirmLabel ?? t("confirmPlace");
  const cancelText = cancelLabel ?? t("backToSlip");
  if (!data) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-0 bg-[#f1f5f9] p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{t("receiptDialogTitle")}</DialogTitle>
          <DialogDescription>{t("receiptDialogDesc")}</DialogDescription>
        </DialogHeader>
        <div id="bet-receipt-print" className="max-h-[70vh] overflow-y-auto px-4 py-5">
          <BetReceipt data={data} />
        </div>
        {onConfirm && (
          <DialogFooter className="border-t border-slate-200 bg-white px-4 py-3 sm:justify-between">
            <span className="text-xs text-slate-500">{data.id ? t("receiptSavedNote") : t("receiptReviewNote")}</span>
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              {showPrint && (
                <Button variant="outline" onClick={() => window.print()} className="w-full sm:w-auto">
                  <Printer className="size-4" /> {t("print")}
                </Button>
              )}
              {cancelText !== "" && (
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy} className="w-full sm:w-auto">
                  {cancelText}
                </Button>
              )}
              <Button onClick={onConfirm} disabled={busy} className="w-full bg-secondary text-white hover:bg-secondary/90 sm:w-auto">
                {busy ? t("placing") : confirmText}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
