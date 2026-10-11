"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BetReceiptDialog, type ReceiptData } from "@/components/bets/BetReceipt";
import { ReceiptText, Search, X, ChevronDown, ChevronUp } from "lucide-react";

export type TicketLeg = {
  oddsAtPlacement: string | number;
  result: string;
  selection: {
    name: string;
    market?: {
      name: string;
      game?: { homeTeam: string; awayTeam: string; status?: string } | null;
    } | null;
  };
};

export type Ticket = {
  id: string;
  type: string;
  stake: string | number;
  totalOdds: string | number;
  potentialPayout: string | number;
  status: string;
  payoutStatus?: string;
  settledPayout?: string | number | null;
  settledAt?: string | null;
  placedAt: string;
  user: { id: string; name: string | null; email: string } | null;
  selections?: TicketLeg[];
};

export type TicketFilter = "ALL" | "WON" | "LOST" | "PENDING";

const ticketStatusStyle: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
  WON: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  LOST: "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400",
  VOID: "bg-muted text-muted-foreground border-border",
  CASHED_OUT: "bg-primary/10 text-primary border-primary/30",
};

const payoutStyle: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground border-border",
  SUBMITTED: "bg-sky-500/15 text-sky-600 border-sky-500/30 dark:text-sky-400",
  PAID: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
};

/**
 * Derive ticket status from its legs (parlay rule requested):
 * - if any leg LOST -> LOST
 * - else if all legs WON -> WON
 * - else if no LOST and at least one leg still PENDING -> PENDING
 * - VOID legs are ignored for win detection (treated as 1.0)
 * Falls back to stored Bet.status when legs are missing.
 */
export function deriveTicketStatus(ticket: Ticket): string {
  const legs = ticket.selections ?? [];
  if (legs.length === 0) return ticket.status ?? "PENDING";
  const results = legs.map((l) => (l.result ?? "PENDING").toUpperCase());
  if (results.some((r) => r === "LOST")) return "LOST";
  const nonVoid = results.filter((r) => r !== "VOID");
  if (nonVoid.length > 0 && nonVoid.every((r) => r === "WON")) return "WON";
  if (results.every((r) => r === "VOID")) return "VOID";
  // No lost leg, but games still remaining / legs not all won
  return "PENDING";
}

function isBalanceSettled(t: Ticket): boolean {
  // A ticket is settled once its outcome is final (not PENDING).
  // WON tickets additionally track payout flow via payoutStatus.
  return (t.status ?? deriveTicketStatus(t)) !== "PENDING" && t.settledAt != null
    ? true
    : (t.status ?? "").toUpperCase() !== "PENDING" && deriveTicketStatus(t) !== "PENDING";
}

export function TicketsList({
  filter,
  title,
  description,
}: {
  filter: TicketFilter;
  title: string;
  description: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [receiptLoading, setReceiptLoading] = useState<string | null>(null);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  useEffect(() => {
    const query = filter === "ALL" ? "" : `?status=${filter}`;
    setLoading(true);
    api
      .get<{ data: Ticket[] }>(`/bets${query}`, token)
      .then((res) => setTickets(res.data ?? []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, [token, filter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = tickets;
    // Client-side safety: enforce filter using derived status too
    if (filter !== "ALL") {
      list = list.filter((t) => deriveTicketStatus(t) === filter || t.status === filter);
    }
    if (!q) return list;
    return list.filter((t) =>
      `${t.user?.name ?? ""} ${t.user?.email ?? ""} ${t.id}`
        .toLowerCase()
        .includes(q)
    );
  }, [tickets, search, filter]);

  const counts = useMemo(() => {
    let won = 0, lost = 0, pending = 0;
    for (const t of tickets) {
      const s = deriveTicketStatus(t);
      if (s === "WON") won++;
      else if (s === "LOST") lost++;
      else if (s === "PENDING") pending++;
    }
    return { total: tickets.length, won, lost, pending };
  }, [tickets]);

  const openReceipt = async (ticketId: string) => {
    const t = getAccessToken() ?? token;
    setReceiptLoading(ticketId);
    try {
      const res = await api.get<{ data: Ticket }>(`/bets/${ticketId}`, t);
      const b = res.data;
      setReceipt({
        id: b.id,
        type: b.type,
        legs: (b.selections ?? []).map((s) => ({
          gameLabel: s.selection.market?.game
            ? `${s.selection.market.game.homeTeam} vs ${s.selection.market.game.awayTeam}`
            : "Game removed",
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
    } catch {
      setReceipt(null);
    } finally {
      setReceiptLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ReceiptText className="size-6 text-primary" /> {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            {counts.total} total
          </Badge>
          <Badge variant="outline" className={ticketStatusStyle.WON}>WON {counts.won}</Badge>
          <Badge variant="outline" className={ticketStatusStyle.LOST}>LOST {counts.lost}</Badge>
          <Badge variant="outline" className={ticketStatusStyle.PENDING}>PENDING {counts.pending}</Badge>
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">Tickets</CardTitle>
          <CardDescription>User → ticket legs → ticket status → balance settlement.</CardDescription>
          <div className="relative mt-3 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search user name, email, ticket id..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-8"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-muted p-1 hover:bg-muted/80">
                <X className="size-3" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center py-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No tickets found.</p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((t) => {
                const derived = deriveTicketStatus(t);
                const settled = isBalanceSettled(t);
                const isOpen = !!expanded[t.id];
                const legs = t.selections ?? [];
                return (
                  <div key={t.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                      {/* User */}
                      <div className="min-w-[180px] max-w-[240px]">
                        <div className="truncate font-semibold text-foreground">
                          {t.user?.name ?? "Unknown user"}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{t.user?.email ?? t.id.slice(0, 8)}</div>
                        <div className="text-[11px] text-muted-foreground">{new Date(t.placedAt).toLocaleString()}</div>
                      </div>
                      {/* Ticket summary */}
                      <div className="min-w-0 flex-1">
                        <button
                          onClick={() => setExpanded((p) => ({ ...p, [t.id]: !p[t.id] }))}
                          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          {isOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                          {t.type} · {legs.length} pick{legs.length === 1 ? "" : "s"} · Stake ETB {Number(t.stake).toFixed(2)} · Odds {Number(t.totalOdds).toFixed(2)}
                        </button>
                        {!isOpen && legs.length > 0 && (
                          <div className="mt-1 truncate text-xs text-muted-foreground">
                            {legs.slice(0, 2).map((l) =>
                              l.selection.market?.game
                                ? `${l.selection.market.game.homeTeam} vs ${l.selection.market.game.awayTeam} (${l.selection.name})`
                                : l.selection.name
                            ).join("  •  ")}
                            {legs.length > 2 ? `  +${legs.length - 2} more` : ""}
                          </div>
                        )}
                      </div>
                      {/* Status + settlement */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={ticketStatusStyle[derived] ?? ticketStatusStyle.PENDING}>
                          {derived}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={settled ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400"}
                        >
                          {settled ? "SETTLED" : "UNSETTLED"}
                        </Badge>
                        {t.payoutStatus && (
                          <Badge variant="outline" className={payoutStyle[t.payoutStatus] ?? payoutStyle.PENDING}>
                            {t.payoutStatus}
                          </Badge>
                        )}
                        <Button size="sm" variant="outline" className="h-8" onClick={() => openReceipt(t.id)} disabled={receiptLoading === t.id}>
                          <ReceiptText className="size-3.5" /> {receiptLoading === t.id ? "Loading..." : "Receipt"}
                        </Button>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-muted/30">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-muted-foreground">
                              <th className="px-3 py-2 font-medium">#</th>
                              <th className="px-3 py-2 font-medium">GAME</th>
                              <th className="px-3 py-2 font-medium">MARKET</th>
                              <th className="px-3 py-2 font-medium">PICK</th>
                              <th className="px-3 py-2 font-medium">ODDS</th>
                              <th className="px-3 py-2 font-medium">LEG</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {legs.length === 0 && (
                              <tr><td colSpan={6} className="px-3 py-3 text-center text-muted-foreground">No legs loaded.</td></tr>
                            )}
                            {legs.map((l, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2">{i + 1}</td>
                                <td className="px-3 py-2 font-medium">
                                  {l.selection.market?.game
                                    ? `${l.selection.market.game.homeTeam} vs ${l.selection.market.game.awayTeam}`
                                    : "Game removed"}
                                </td>
                                <td className="px-3 py-2">{l.selection.market?.name ?? "—"}</td>
                                <td className="px-3 py-2">{l.selection.name}</td>
                                <td className="px-3 py-2 font-mono">{Number(l.oddsAtPlacement).toFixed(2)}</td>
                                <td className="px-3 py-2">
                                  <Badge variant="outline" className={ticketStatusStyle[(l.result ?? "PENDING").toUpperCase()] ?? ticketStatusStyle.PENDING}>
                                    {l.result}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-3 py-2 text-xs text-muted-foreground">
                          <span>Potential payout: <span className="font-semibold text-foreground">ETB {Number(t.potentialPayout).toFixed(2)}</span></span>
                          {t.settledPayout != null && (
                            <span>Settled payout: <span className="font-semibold text-foreground">ETB {Number(t.settledPayout).toFixed(2)}</span></span>
                          )}
                          {t.settledAt && <span>Settled at: {new Date(t.settledAt).toLocaleString()}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
