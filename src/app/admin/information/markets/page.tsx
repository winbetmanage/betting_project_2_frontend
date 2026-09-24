"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  LayoutGrid,
  Search,
  Layers,
  Zap,
  Hand,
  FileJson,
} from "lucide-react";

type CatalogMarket = {
  marketKey: string;
  label: string;
  settle: string | null;
  period: string | null;
  autoSettle: boolean;
  note: string | null;
};

type CatalogGroup = {
  type: string;
  markets: CatalogMarket[];
};

const PERIOD_LABEL: Record<string, string> = {
  FT: "Full-time",
  HT: "Half-time",
  H2: "Second half",
  HT_FT: "Half-time + Full-time",
};

export default function MarketsInfoPage() {
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [totalKeys, setTotalKeys] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = getAccessToken();
    if (!t) return;
    setLoading(true);
    api
      .get<{ data: CatalogGroup[]; totalKeys: number }>("/info/market-types", t)
      .then((r) => {
        setGroups(r.data ?? []);
        setTotalKeys(r.totalKeys ?? 0);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load market types");
        setGroups([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        markets: g.markets.filter((m) =>
          `${m.marketKey} ${m.label} ${g.type} ${m.settle ?? ""} ${m.period ?? ""}`.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.markets.length > 0);
  }, [groups, search]);

  const autoCount = useMemo(
    () => groups.reduce((a, g) => a + g.markets.filter((m) => m.autoSettle).length, 0),
    [groups]
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <LayoutGrid className="size-3.5" /> Information
        </div>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Layers className="size-6 text-primary" /> Markets
        </h1>
        <p className="text-sm text-muted-foreground">
          Market types the system supports — from{" "}
          <span className="font-mono">marketTypes.json</span> (type + label) and{" "}
          <span className="font-mono">marketSettlement.json</span> (grading rule). Used at approval and settlement time.
        </p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[
          { label: "Market types", value: groups.length },
          { label: "Supported odds keys", value: totalKeys },
          { label: "Auto-settle keys", value: autoCount },
        ].map((s) => (
          <Card key={s.label} className="border-border bg-card shadow-sm">
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileJson className="size-5 text-primary" /> Supported market types
            <Badge variant="secondary" className="ml-1 bg-primary/15 text-primary border-primary/20">
              {visible.length} types
            </Badge>
          </CardTitle>
          <CardDescription>Grouped by system type — each row is one odds-api market key with its grading details.</CardDescription>
          <div className="mt-3 max-w-sm">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search type, key, label..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-4">
          {loading ? (
            <div className="grid place-items-center py-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
            </div>
          ) : visible.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No market types match.</div>
          ) : (
            visible.map((g) => (
              <div key={g.type}>
                <div className="mb-2 flex items-center gap-2">
                  <Badge className="bg-primary text-white">{g.type}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {g.markets.length} key{g.markets.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">MARKET KEY</TableHead>
                        <TableHead className="text-xs">LABEL</TableHead>
                        <TableHead className="text-xs">SETTLE RULE</TableHead>
                        <TableHead className="text-xs">PERIOD</TableHead>
                        <TableHead className="text-xs">GRADING</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {g.markets.map((m) => (
                        <TableRow key={m.marketKey}>
                          <TableCell className="font-mono text-xs font-semibold">{m.marketKey}</TableCell>
                          <TableCell className="text-sm">{m.label}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{m.settle ?? "—"}</TableCell>
                          <TableCell className="text-xs">
                            {m.period ? (PERIOD_LABEL[m.period] ?? m.period) : "—"}
                          </TableCell>
                          <TableCell>
                            {m.autoSettle ? (
                              <Badge className="bg-secondary text-white gap-1 text-[10px]">
                                <Zap className="size-3" /> Auto
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 border-amber-500/30 text-amber-600 text-[10px]" title={m.note ?? ""}>
                                <Hand className="size-3" /> Manual{m.note ? ` — ${m.note}` : ""}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
