"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Mail, Wallet, Calendar, Network, Ticket, Banknote, UserCog, Target, Clock, ArrowLeftRight, Loader2, User as UserIcon } from "lucide-react";
import { displayRole } from "@/lib/roles";

const SPINNER = "/assets/custom/infinite-spinner.svg";

type DetailUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  balance: string | number;
  heldBalance?: string | number | null;
  isActive: boolean;
  emailVerified: boolean;
  referralCode: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  _count: { bets: number; transactions: number };
};

type Upline = {
  referrer: { id: string; email: string; name: string | null; role: string } | null;
  codeUsed: string;
  codeType?: string | null;
  status: string;
  bonusAmount?: number | null;
  createdAt?: string;
} | null;

type BetRow = {
  id: string;
  status: string;
  stake: string | number;
  totalOdds: string | number;
  potentialPayout: string | number;
  settledPayout?: string | number | null;
  placedAt: string;
  selections?: { id: string; odds: string | number; isWon?: boolean | null }[];
};

type FundReq = {
  id: string;
  type: string;
  amount: string | number;
  status: string;
  createdAt: string;
};

const statusClass = (status: string) =>
  status === "WON"
    ? "bg-emerald-500 text-white"
    : status === "LOST"
      ? "bg-destructive text-white"
      : "bg-amber-500/10 text-amber-600 border-amber-500/20";

export default function SubadminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<DetailUser | null>(null);
  const [upline, setUpline] = useState<Upline>(null);
  const [bets, setBets] = useState<BetRow[]>([]);
  const [funds, setFunds] = useState<FundReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleOpen, setRoleOpen] = useState(false);
  const [changingRole, setChangingRole] = useState(false);

  useEffect(() => {
    const t = getAccessToken();
    if (!t) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get<{ data: DetailUser }>(`/users/${id}`, t).then((r) => r.data).catch(() => null),
      api.get<{ data: Upline }>(`/users/${id}/upline`, t).then((r) => r.data).catch(() => null),
      api.get<{ data: BetRow[] }>(`/users/${id}/bets`, t).then((r) => r.data ?? []).catch(() => []),
      api.get<{ data: FundReq[] }>(`/funds/admin/requests?userId=${id}`, t).then((r) => r.data ?? []).catch(() => []),
    ])
      .then(([u, up, b, f]) => {
        if (cancelled) return;
        if (!u) toast.error("User not found");
        setUser(u);
        setUpline(up);
        setBets(b);
        setFunds(f);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const summary = useMemo(() => {
    let staked = 0;
    let returned = 0;
    let won = 0;
    let lost = 0;
    let pending = 0;
    for (const b of bets) {
      const stake = Number(b.stake);
      staked += stake;
      if (b.status === "WON") {
        won += 1;
        returned += Number(b.settledPayout ?? 0);
      } else if (b.status === "LOST") {
        lost += 1;
      } else {
        pending += 1;
      }
    }
    const settled = won + lost;
    return { staked, returned, won, lost, pending, net: returned - staked, winRate: settled ? Math.round((won / settled) * 100) : 0 };
  }, [bets]);

  const money = useMemo(() => {
    const deposits = funds.filter((f) => f.type === "DEPOSIT" && f.status === "APPROVED");
    const withdrawals = funds.filter((f) => f.type === "WITHDRAWAL" && f.status === "APPROVED");
    return {
      depositTotal: deposits.reduce((n, f) => n + Number(f.amount), 0),
      withdrawalTotal: withdrawals.reduce((n, f) => n + Number(f.amount), 0),
      pending: funds.filter((f) => f.status === "PENDING").length,
    };
  }, [funds]);

  const convertToAgent = async () => {
    const t = getAccessToken();
    if (!t) return;
    setChangingRole(true);
    try {
      await api.patch(`/users/${id}`, { role: "AGENT" }, t);
      toast.success("Account converted to agent");
      setRoleOpen(false);
      router.replace(`/subadmin/agents/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setChangingRole(false);
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SPINNER} alt="Loading" className="size-10" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <Button variant="outline" render={<Link href="/subadmin/users" />} nativeButton={false}>
          <ArrowLeft className="size-4" /> Back to users
        </Button>
        <p className="text-sm text-muted-foreground">User not found.</p>
      </div>
    );
  }

  const held = Number(user.heldBalance ?? 0);
  const available = Number(user.balance) - held;

  return (
    <div className="space-y-6">
      <Button variant="outline" render={<Link href="/subadmin/users" />} nativeButton={false}>
        <ArrowLeft className="size-4" /> Back to users
      </Button>

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div className="grid size-16 place-items-center rounded-full bg-primary text-xl font-bold text-white">
            {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{user.name || "—"}</h1>
              <Badge variant="outline">{displayRole(user.role)}</Badge>
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <span className={`size-2.5 rounded-full ${user.isActive ? "bg-green-500" : "bg-red-500"}`} />
                {user.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Mail className="size-3.5" /> {user.email}
            </div>
            <div className="mt-0.5 font-mono text-xs text-muted-foreground">{user.id}</div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 font-mono text-xl font-bold">
              <Wallet className="size-4 text-muted-foreground" /> ETB {Number(user.balance).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              {user._count.transactions} transactions • {user._count.bets} bets
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total balance</div>
            <div className="mt-1 font-mono text-2xl font-bold">ETB {Number(user.balance).toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Available / held</div>
            <div className="mt-1 font-mono text-2xl font-bold">ETB {available.toFixed(2)}</div>
            <div className="text-[11px] text-muted-foreground">ETB {held.toFixed(2)} held on pending requests</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Approved deposits</div>
            <div className="mt-1 font-mono text-2xl font-bold text-emerald-600">ETB {money.depositTotal.toFixed(2)}</div>
            <div className="text-[11px] text-muted-foreground">ETB {money.withdrawalTotal.toFixed(2)} withdrawn</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Bet net</div>
            <div className={`mt-1 font-mono text-2xl font-bold ${summary.net >= 0 ? "text-emerald-600" : "text-destructive"}`}>
              ETB {summary.net.toFixed(2)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {summary.winRate}% win rate • {summary.pending} pending
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-500/30 bg-card shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <ArrowLeftRight className="size-5 shrink-0 text-amber-500" />
            <div className="min-w-0">
              <div className="text-sm font-semibold">
                Account type: <Badge variant="outline" className="ml-1">{displayRole(user.role)}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                You may only switch this account between user and agent. Balances, status and all other settings stay with the main admin.
              </p>
            </div>
          </div>
          <Button variant="outline" className="h-9 shrink-0 border-amber-500/40 text-amber-600 hover:bg-amber-500/10" onClick={() => setRoleOpen(true)}>
            <UserCog className="size-4" /> Convert to agent
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-base">
              <Network className="size-5 text-primary" /> My agent
            </CardTitle>
            <CardDescription>The agent this account registered with</CardDescription>
          </CardHeader>
          <CardContent className="p-4 text-sm">
            {upline?.referrer ? (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="h-auto w-full justify-start gap-2 p-3"
                  render={<Link href={`/subadmin/agents/${upline.referrer.id}`} />}
                  nativeButton={false}
                >
                  <span className="grid size-9 place-items-center rounded-full bg-amber-500 text-sm font-bold text-white">
                    {upline.referrer.name?.[0]?.toUpperCase() ?? upline.referrer.email[0].toUpperCase()}
                  </span>
                  <span className="text-left">
                    <span className="block text-sm font-semibold">{upline.referrer.name || upline.referrer.email}</span>
                    <span className="block text-xs text-muted-foreground">{upline.referrer.email}</span>
                  </span>
                  <UserCog className="ml-auto size-4 text-amber-500" />
                </Button>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">Code used</div>
                    <div className="font-mono font-semibold">{upline.codeUsed}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Code type</div>
                    <div>{upline.codeType === "SECONDARY" ? "Agent code" : "Referral link"}</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No agent — this account registered directly.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserIcon className="size-5 text-primary" /> Account facts
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 p-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Email verified</div>
              <div>{user.emailVerified ? "Yes" : "No"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Own referral code</div>
              <div className="font-mono text-xs">{user.referralCode ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Joined</div>
              <div className="flex items-center gap-1 text-xs">
                <Calendar className="size-3 text-muted-foreground" /> {new Date(user.createdAt).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Last login</div>
              <div className="text-xs">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "—"}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="size-5 text-primary" /> Betting history
            <Badge variant="secondary" className="ml-1 bg-primary/15 text-primary border-primary/20">{bets.length}</Badge>
          </CardTitle>
          <CardDescription>Newest first. {summary.won} won • {summary.lost} lost • {summary.pending} pending.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {bets.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">This account has not placed any bets yet.</div>
          ) : (
            <Table className="admin-cards stripe-table">
              <TableHeader className="bg-primary">
                <TableRow className="border-primary hover:bg-primary">
                  <TableHead className="w-[22%] text-white text-xs tracking-widest">PLACED</TableHead>
                  <TableHead className="w-[22%] text-white text-xs tracking-widest">TICKET</TableHead>
                  <TableHead className="w-[16%] text-white text-xs tracking-widest text-right">STAKE</TableHead>
                  <TableHead className="w-[12%] text-white text-xs tracking-widest text-right">ODDS</TableHead>
                  <TableHead className="w-[16%] text-white text-xs tracking-widest text-right">RETURNS</TableHead>
                  <TableHead className="w-[12%] text-white text-xs tracking-widest">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bets.slice(0, 25).map((b) => (
                  <TableRow key={b.id} className="border-border">
                    <TableCell className="text-xs text-muted-foreground">
                      <span className="flex items-start gap-1">
                        <Clock className="mt-0.5 size-3 shrink-0" />
                        <span className="break-words">{new Date(b.placedAt).toLocaleString()}</span>
                      </span>
                    </TableCell>
                    <TableCell className="break-all font-mono text-[11px] text-muted-foreground">
                      {b.id.slice(0, 10)}… • {b.selections?.length ?? 0} sel
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">ETB {Number(b.stake).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{Number(b.totalOdds).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {b.status === "WON" ? `ETB ${Number(b.settledPayout ?? 0).toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusClass(b.status)}>{b.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {bets.length > 25 && (
            <div className="border-t border-border p-3 text-center text-xs text-muted-foreground">
              Showing the 25 most recent of {bets.length} bets.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="size-5 text-primary" /> Fund requests
            <Badge variant="secondary" className="ml-1 bg-primary/15 text-primary border-primary/20">{funds.length}</Badge>
          </CardTitle>
          <CardDescription>
            Manage these under Deposits / Withdrawals{money.pending ? ` — ${money.pending} still pending` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {funds.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No fund requests.</div>
          ) : (
            <Table className="admin-cards stripe-table">
              <TableHeader className="bg-primary">
                <TableRow className="border-primary hover:bg-primary">
                  <TableHead className="w-[30%] text-white text-xs tracking-widest">DATE</TableHead>
                  <TableHead className="w-[20%] text-white text-xs tracking-widest">TYPE</TableHead>
                  <TableHead className="w-[20%] text-white text-xs tracking-widest text-right">AMOUNT</TableHead>
                  <TableHead className="w-[30%] text-white text-xs tracking-widest">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funds.slice(0, 10).map((f) => (
                  <TableRow key={f.id} className="border-border">
                    <TableCell className="text-xs text-muted-foreground">{new Date(f.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px]">{f.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">ETB {Number(f.amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          f.status === "APPROVED"
                            ? "bg-emerald-500 text-white"
                            : f.status === "PENDING"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                        }
                      >
                        {f.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Ticket className="size-4" /> Read-only detail — only the user/agent switch above is available to you.
      </p>

      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent className="sm:max-w-[420px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="size-5 text-amber-500" /> Convert to agent?
            </DialogTitle>
            <DialogDescription className="break-words">
              <span className="font-semibold">{user.name || user.email}</span> will leave the users list and appear
              under agents. Their balances, bets and history stay untouched. This is logged under your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleOpen(false)} disabled={changingRole}>Cancel</Button>
            <Button onClick={convertToAgent} disabled={changingRole} className="bg-amber-500 text-white hover:bg-amber-600">
              {changingRole ? <Loader2 className="size-4 animate-spin" /> : <UserCog className="size-4" />} Convert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
