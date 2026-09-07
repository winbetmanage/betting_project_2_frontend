"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Gift, Search, ArrowRight, Receipt } from "lucide-react";

type ReferralRow = {
  id: string;
  referrer: { id: string; email: string; name: string | null };
  referee: { id: string; email: string; name: string | null };
  codeUsed: string;
  bonusAmount: string | number;
  qualifiedAt: string | null;
  rewardedAt: string | null;
  createdAt: string;
  transaction: { id: string; amount: string | number; createdAt: string } | null;
};

export default function ReferralBonusPage() {
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = getAccessToken();
    if (!t) return;
    setLoading(true);
    api
      .get<{ data: ReferralRow[] }>("/users/referral-bonuses", t)
      .then((r) => setRows(r.data ?? []))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load referral bonuses"))
      .finally(() => setLoading(false));
  }, []);

  const visible = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return `${r.referrer.name ?? ""} ${r.referrer.email} ${r.referee.name ?? ""} ${r.referee.email} ${r.codeUsed}`
      .toLowerCase()
      .includes(q);
  });

  const totalPaid = rows.reduce((sum, r) => sum + Number(r.bonusAmount), 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Gift className="size-3.5" /> Referral Bonus
        </div>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Gift className="size-6 text-primary" /> Referral Bonuses Paid
        </h1>
        <p className="text-sm text-muted-foreground">
          Users who received the referral bonus — who registered with whose code and when they were rewarded.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="size-5 text-primary" /> Paid Referrals
            <Badge variant="secondary" className="ml-2 bg-secondary/15 text-secondary border-secondary/20">
              {visible.length} payout{visible.length === 1 ? "" : "s"}
            </Badge>
          </CardTitle>
          <CardDescription>
            Total paid out: <span className="font-bold text-foreground">ETB {totalPaid.toFixed(2)}</span>
          </CardDescription>
          <div className="mt-3 max-w-sm">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search referrer, referee, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center py-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
            </div>
          ) : visible.length === 0 ? (
            <div className="py-16 text-center">
              <Gift className="mx-auto size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">No referral bonuses paid yet</p>
              <p className="text-xs text-muted-foreground">
                Bonuses appear here when a referred user&apos;s first deposit of ETB 100+ is approved
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-primary">
                  <TableRow className="hover:bg-primary border-primary">
                    <TableHead className="text-white text-xs tracking-widest">REFERRER (RECEIVED BONUS)</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">REFERRED USER</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">CODE USED</TableHead>
                    <TableHead className="text-white text-xs tracking-widest text-right">BONUS</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">STATUS</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">REWARDED AT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((r) => (
                    <TableRow key={r.id} className="border-border hover:bg-muted/50">
                      <TableCell>
                        <div className="text-sm font-medium truncate max-w-[200px]">{r.referrer.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{r.referrer.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          {r.referee.name ?? "—"}
                          <ArrowRight className="size-3.5 text-muted-foreground/50" />
                          <span className="text-xs text-muted-foreground">registered {new Date(r.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{r.referee.email}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.codeUsed}</TableCell>
                      <TableCell className="text-right">
                        <span className="rounded-md bg-green-500/10 px-2 py-0.5 font-mono text-xs font-bold text-green-600">
                          +ETB {Number(r.bonusAmount).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className="border border-green-500/20 bg-green-500/10 text-green-600">
                          {r.rewardedAt ? "REWARDED" : "QUALIFIED"}
                        </Badge>
                        {r.transaction && (
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            ledger: {new Date(r.transaction.createdAt).toLocaleDateString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.rewardedAt ? new Date(r.rewardedAt).toLocaleString() : "—"}
                        {r.qualifiedAt && (
                          <div className="text-[10px] text-muted-foreground">
                            qualified: {new Date(r.qualifiedAt).toLocaleDateString()}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
