"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartColumn, Search, X, TrendingUp, TrendingDown, Wallet, ReceiptText } from "lucide-react";
import { deriveTicketStatus, type Ticket } from "@/components/admin/TicketsList";
import { BetReceiptDialog, type ReceiptData } from "@/components/bets/BetReceipt";

type RangeKey =
  | "today"
  | "yesterday"
  | "day-before-yesterday"
  | "last-7-days"
  | "last-15-days"
  | "last-month"
  | "last-2-months"
  | "last-3-months"
  | "last-6-months"
  | "last-year";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "day-before-yesterday", label: "Day before yesterday" },
  { key: "last-7-days", label: "Last 7 days" },
  { key: "last-15-days", label: "Last 15 days" },
  { key: "last-month", label: "Last month" },
  { key: "last-2-months", label: "Last 2 months" },
  { key: "last-3-months", label: "Last 3 months" },
  { key: "last-6-months", label: "Last 6 months" },
  { key: "last-year", label: "Last year" },
];

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
function endOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}

export function rangeToDates(key: RangeKey): { from: Date; to: Date; label: string } {
  const now = new Date();
  if (key === "today") return { from: startOfDay(now), to: now, label: "Today" };
  if (key === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { from: startOfDay(y), to: endOfDay(y), label: "Yesterday" };
  }
  if (key === "day-before-yesterday") {
    const d = new Date(now);
    d.setDate(d.getDate() - 2);
    return { from: startOfDay(d), to: endOfDay(d), label: "Day before yesterday" };
  }
  const daysMap: Record<string, number> = {
    "last-7-days": 7,
    "last-15-days": 15,
    "last-month": 30,
    "last-2-months": 60,
    "last-3-months": 90,
    "last-6-months": 180,
    "last-year": 365,
  };
  const days = daysMap[key] ?? 7;
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  return { from: startOfDay(from), to: now, label: RANGES.find((r) => r.key === key)?.label ?? key };
}

function money(n: number): string {
  return `ETB ${(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const statusStyle: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
  WON: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  LOST: "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400",
  VOID: "bg-muted text-muted-foreground border-border",
  CASHED_OUT: "bg-primary/10 text-primary border-primary/30",
};

export function TicketsReport() {
  const [range, setRange] = useState<RangeKey>("today");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "WON" | "LOST" | "PENDING">("ALL");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The report's date window is built from `new Date()`, so the server renders it
  // in the server timezone. Formatting it only after mount keeps the first client
  // render identical to the server HTML (no hydration mismatch).
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const { from, to, label } = useMemo(() => rangeToDates(range), [range]);
  const rangeText = mounted ? `${from.toLocaleString()} → ${to.toLocaleString()}` : "—";

  useEffect(() => {
    const token = getAccessToken();
    setLoading(true);
    setError(null);
    const q = `?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
    api
      .get<{ data: Ticket[] }>(`/bets${q}`, token)
      .then((res) => setTickets(res.data ?? []))
      .catch((e) => {
        // Show the real reason (e.g. 403) rather than an empty report.
        setTickets([]);
        setError(e instanceof Error && e.message ? e.message : "Could not load tickets.");
      })
      .finally(() => setLoading(false));
  }, [from, to]);

  const rows = useMemo(() => {
    return tickets.map((t) => {
      const status = deriveTicketStatus(t);
      const stake = Number(t.stake) || 0;
      const payout = t.settledPayout != null ? Number(t.settledPayout) : Number(t.potentialPayout) || 0;
      // Winners: bet = stake, win = payout, system lost = payout - stake (net outflow)
      // Lost: lost = stake, system made = stake
      const userWin = status === "WON" ? payout : 0;
      const systemLost = status === "WON" ? Math.max(0, payout - stake) : 0;
      const userLost = status === "LOST" ? stake : 0;
      const systemMade = status === "LOST" ? stake : 0;
      return { ticket: t, status, stake, payout, userWin, systemLost, userLost, systemMade };
    });
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (!q) return true;
      return `${r.ticket.user?.name ?? ""} ${r.ticket.user?.email ?? ""} ${r.ticket.id}`.toLowerCase().includes(q);
    });
  }, [rows, search, statusFilter]);

  const summary = useMemo(() => {
    let wonCount = 0, lostCount = 0, pendingCount = 0, voidCount = 0;
    let wonStaked = 0, wonPayout = 0, systemLostTotal = 0;
    let lostStaked = 0; // = system profit
    let totalStaked = 0;
    for (const r of rows) {
      totalStaked += r.stake;
      if (r.status === "WON") { wonCount++; wonStaked += r.stake; wonPayout += r.payout; systemLostTotal += r.systemLost; }
      else if (r.status === "LOST") { lostCount++; lostStaked += r.stake; }
      else if (r.status === "PENDING") pendingCount++;
      else voidCount++;
    }
    const net = lostStaked - systemLostTotal; // >0 profit, <0 loss
    return { total: rows.length, wonCount, lostCount, pendingCount, voidCount, totalStaked, wonStaked, wonPayout, systemLostTotal, systemProfit: lostStaked, net };
  }, [rows]);

  const openReceipt = async (id: string) => {
    try {
      const res = await api.get<{ data: Ticket }>(`/bets/${id}`, getAccessToken());
      const b = res.data;
      setReceipt({
        id: b.id,
        type: b.type,
        legs: (b.selections ?? []).map((s) => ({
          gameLabel: s.selection.market?.game ? `${s.selection.market.game.homeTeam} vs ${s.selection.market.game.awayTeam}` : "Game removed",
          marketName: s.selection.market?.name ?? "Market",
          selectionName: s.selection.name,
          odds: Number(s.oddsAtPlacement),
          result: s.result,
        })),
        stake: Number(b.stake),
        totalOdds: Number(b.totalOdds),
        potentialPayout: Number(b.potentialPayout),
        status: deriveTicketStatus(b),
        settledPayout: b.settledPayout != null ? Number(b.settledPayout) : null,
        placedAt: b.placedAt,
        settledAt: b.settledAt ?? null,
      });
    } catch { setReceipt(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ChartColumn className="size-6 text-primary" /> Tickets Report
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Profit &amp; loss per time frame — winners show bet / win / system loss, lost tickets show lost / system profit.
        </p>
      </div>

      {/* Time-frame tabs */}
      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <Button
            key={r.key}
            size="sm"
            variant={range === r.key ? "default" : "outline"}
            onClick={() => setRange(r.key)}
            className={range === r.key ? "" : "hover:bg-primary/5"}
          >
            {r.label}
          </Button>
        ))}
      </div>

      {/* Summary for selected frame */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wallet className="size-4" /> {label} — tickets
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{summary.total}</div>
            <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
              <Badge variant="outline" className={statusStyle.WON}>WON {summary.wonCount}</Badge>
              <Badge variant="outline" className={statusStyle.LOST}>LOST {summary.lostCount}</Badge>
              <Badge variant="outline" className={statusStyle.PENDING}>PENDING {summary.pendingCount}</Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Total staked: <span className="font-semibold text-foreground">{money(summary.totalStaked)}</span></div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="size-4 text-emerald-500" /> System profit (from lost)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-emerald-600">{money(summary.systemProfit)}</div>
            <div className="mt-1 text-xs text-muted-foreground">Stakes kept from {summary.lostCount} lost ticket(s).</div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingDown className="size-4 text-red-500" /> System loss (to winners)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-red-600">{money(summary.systemLostTotal)}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Paid out {money(summary.wonPayout)} on {money(summary.wonStaked)} staked.
            </div>
          </CardContent>
        </Card>

        <Card className={`border-border ${summary.net >= 0 ? "bg-emerald-500/5" : "bg-red-500/5"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net {summary.net >= 0 ? "profit" : "loss"} — {label}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={`text-2xl font-bold ${summary.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {summary.net >= 0 ? "+" : "−"}{money(Math.abs(summary.net)).replace("ETB ", "ETB ")}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {summary.net >= 0 ? "Profit made in this frame." : "Loss in total for this frame."} (profit − loss)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + table */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">Tickets — {label}</CardTitle>
          <CardDescription>
            {rangeText}
          </CardDescription>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative max-w-sm flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search user, email, ticket id..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 pr-8" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-muted p-1 hover:bg-muted/80">
                  <X className="size-3" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["ALL", "WON", "LOST", "PENDING"] as const).map((s) => (
                <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)}>
                  {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center py-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
            </div>
          ) : error ? (
            <p className="px-4 py-10 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No tickets in this time frame.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-cards w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">USER</th>
                    <th className="px-4 py-2.5 font-medium">TICKET</th>
                    <th className="px-4 py-2.5 font-medium">STATUS</th>
                    <th className="px-4 py-2.5 font-medium text-right">BET / LOST</th>
                    <th className="px-4 py-2.5 font-medium text-right">WIN / PAYOUT</th>
                    <th className="px-4 py-2.5 font-medium text-right">SYSTEM</th>
                    <th className="px-4 py-2.5 font-medium text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((r) => (
                    <tr key={r.ticket.id} className="hover:bg-muted/40">
                      <td className="px-4 py-2.5">
                        <div className="font-semibold">{r.ticket.user?.name ?? "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{r.ticket.user?.email}</div>
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        <div className="font-mono">{r.ticket.id.slice(0, 8)} · {r.ticket.type} · {(r.ticket.selections ?? []).length} picks</div>
                        <div className="text-muted-foreground">{new Date(r.ticket.placedAt).toLocaleString()}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={statusStyle[r.status] ?? statusStyle.PENDING}>{r.status}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {r.status === "WON" ? (
                          <span>Bet <span className="font-semibold">{money(r.stake)}</span></span>
                        ) : r.status === "LOST" ? (
                          <span>Lost <span className="font-semibold text-red-600">{money(r.userLost)}</span></span>
                        ) : (
                          <span className="text-muted-foreground">{money(r.stake)}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {r.status === "WON" ? (
                          <span>Win <span className="font-semibold text-emerald-600">{money(r.userWin)}</span></span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs">
                        {r.status === "WON" ? (
                          <span className="font-semibold text-red-600">Lost {money(r.systemLost)}</span>
                        ) : r.status === "LOST" ? (
                          <span className="font-semibold text-emerald-600">Made {money(r.systemMade)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button size="sm" variant="outline" className="h-8" onClick={() => openReceipt(r.ticket.id)}>
                          <ReceiptText className="size-3.5" /> Receipt
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <BetReceiptDialog
        open={!!receipt}
        onOpenChange={(o) => { if (!o) setReceipt(null); }}
        data={receipt}
        confirmLabel="Close"
        cancelLabel=""
        showPrint
        onConfirm={() => setReceipt(null)}
      />
    </div>
  );
}
