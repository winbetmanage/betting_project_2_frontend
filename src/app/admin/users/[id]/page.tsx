"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { api, ApiError } from "@/lib/api";
import { getAccessToken, getUser } from "@/lib/auth";
import { displayRole, isSubAdminRole } from "@/lib/roles";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  User as UserIcon,
  Mail,
  Wallet,
  Pencil,
  Trash2,
  Loader2,
  ArrowLeft,
  Briefcase,
  ShieldCheck,
  Crown,
  Calendar,
  Ticket,
  TrendingUp,
  TrendingDown,
  Banknote,
  ArrowDownToLine,
  ArrowUpFromLine,
  TriangleAlert,
  Network,
  ChevronLeft,
  ChevronRight,
  Users,
  Ban,
  CircleCheck,
} from "lucide-react";

const ALL_ROLES = ["USER", "ADMIN", "ODDS_MANAGER", "AGENT", "SUBADMIN"] as const;

const editSchema = z.object({
  name: z.string().max(100).optional().or(z.literal("")),
  role: z.enum(ALL_ROLES).optional(),
  isActive: z.boolean().optional(),
  balance: z.coerce.number().min(0).optional(),
});

type EditForm = z.infer<typeof editSchema>;

type UserDetail = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  balance: string | number;
  isActive: boolean;
  emailVerified: boolean;
  referralCode: string | null;
  themeMode?: string | null;
  themeColor?: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  _count: { bets: number; transactions: number };
};

type BetLeg = {
  oddsAtPlacement: string | number;
  result: string;
  selection: {
    name: string;
    market: { name?: string | null; game: { homeTeam: string; awayTeam: string } | null } | null;
  } | null;
};

type UserBet = {
  id: string;
  type: string;
  stake: string | number;
  totalOdds: string | number;
  potentialPayout: string | number;
  settledPayout: string | number;
  status: string;
  placedAt: string;
  selections: BetLeg[];
};

type FundReq = {
  id: string;
  type: string;
  amount: string | number;
  status: string;
  createdAt: string;
  reviewedBy?: { name: string | null; email: string } | null;
};

type Upline = {
  referrer: { id: string; email: string; name: string | null; role: string };
  codeUsed: string;
  codeType?: string | null;
  status: string;
  bonusAmount: string | number;
  createdAt: string;
  rewardedAt: string | null;
} | null;

type ReferredUser = {
  id: string;
  codeUsed: string;
  status: string;
  createdAt: string;
  rewardedAt: string | null;
  referee: { id: string; email: string; name: string | null; isActive: boolean; createdAt: string };
  stats: { depositTotal: number; betCount: number; wonTotal: number; lostTotal: number; lastBetAt: string | null };
};

const REF_PAGE_SIZE = 10;

const roleBadgeClass = (role: string) =>
  role === "ADMIN"
    ? "bg-primary text-white"
    : role === "ODDS_MANAGER"
      ? "bg-secondary text-white"
      : role === "AGENT"
        ? "bg-amber-500 text-white"
        : isSubAdminRole(role)
          ? "bg-sky-500 text-white"
          : "bg-muted text-foreground border-border";

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [bets, setBets] = useState<UserBet[]>([]);
  const [funds, setFunds] = useState<FundReq[]>([]);
  const [upline, setUpline] = useState<Upline>(null);
  const [uplineLoaded, setUplineLoaded] = useState(false);
  const [referred, setReferred] = useState<ReferredUser[]>([]);
  const [refSearch, setRefSearch] = useState("");
  const [refPage, setRefPage] = useState(1);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({});
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof EditForm, string>>>({});
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [roleChangeOpen, setRoleChangeOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<string>("");
  const [changingRole, setChangingRole] = useState(false);

  const [banOpen, setBanOpen] = useState(false);
  const [banning, setBanning] = useState(false);

  const load = async () => {
    const t = getAccessToken();
    if (!t) return;
    setLoading(true);
    try {
      const res = await api.get<{ data: UserDetail }>(`/users/${id}`, t);
      setUser(res.data);
      if (res.data.role === "USER") {
        const [b, f, u] = await Promise.all([
          api.get<{ data: UserBet[] }>(`/users/${id}/bets`, t).then((r) => r.data ?? []).catch(() => []),
          api.get<{ data: FundReq[] }>(`/funds/admin/requests?userId=${id}`, t).then((r) => r.data ?? []).catch(() => []),
          api.get<{ data: Upline }>(`/users/${id}/upline`, t).then((r) => r.data).catch(() => null),
        ]);
        setBets(b);
        setFunds(f);
        setUpline(u);
        setUplineLoaded(true);
      }
      if (res.data.role === "AGENT") {
        const r = await api.get<{ data: ReferredUser[] }>(`/users/${id}/referred-users`, t).then((x) => x.data ?? []).catch(() => []);
        setReferred(r);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load user");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const openEdit = () => {
    if (!user) return;
    setEditForm({
      name: user.name ?? "",
      role: user.role as EditForm["role"],
      isActive: user.isActive,
      balance: Number(user.balance),
    });
    setEditErrors({});
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!user) return;
    const parsed = editSchema.safeParse(editForm);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const iss of parsed.error.issues) {
        const k = iss.path[0] as keyof EditForm;
        if (!errs[k]) errs[k] = iss.message;
      }
      setEditErrors(errs);
      toast.error("Please fix highlighted fields");
      return;
    }
    setSaving(true);
    try {
      const t = getAccessToken();
      const payload: Record<string, unknown> = {};
      if (editForm.name !== undefined) payload.name = editForm.name || null;
      if (editForm.role) payload.role = editForm.role;
      if (editForm.isActive !== undefined) payload.isActive = editForm.isActive;
      if (editForm.balance !== undefined) payload.balance = editForm.balance;
      const res = await api.patch<{ data: UserDetail }>(`/users/${user.id}`, payload, t);
      toast.success("User updated");
      setUser(res.data);
      setEditOpen(false);
    } catch (e) {
      const msg = e instanceof ApiError || e instanceof Error ? e.message : "Update failed";
      toast.error(msg);
      setEditErrors({ name: msg });
    } finally {
      setSaving(false);
    }
  };

  const openRoleChange = (role: string | null) => {
    if (!user || !role || displayRole(role) === displayRole(user.role)) return;
    const me = getUser();
    if (me?.id === user.id && role !== "ADMIN") {
      toast.error("You cannot change your own account away from ADMIN — you would lose access to this page");
      return;
    }
    setPendingRole(role);
    setRoleChangeOpen(true);
  };

  const handleRoleChange = async () => {
    if (!user || !pendingRole || pendingRole === user.role) return;
    setChangingRole(true);
    try {
      const t = getAccessToken();
      const res = await api.patch<{ data: UserDetail }>(`/users/${user.id}`, { role: pendingRole }, t);
      toast.success(`Account type changed to ${pendingRole}`);
      setUser(res.data);
      setRoleChangeOpen(false);
      setPendingRole("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Role change failed");
    } finally {
      setChangingRole(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    const me = getUser();
    if (me?.id === user.id) {
      toast.error("Cannot delete your own account");
      return;
    }
    setDeleting(true);
    try {
      const t = getAccessToken();
      await api.delete(`/users/${user.id}`, t);
      toast.success("User deleted (or deactivated if has transactions)");
      router.replace("/admin/users");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleBanToggle = async () => {
    if (!user) return;
    const me = getUser();
    if (me?.id === user.id) {
      toast.error("You cannot ban your own account");
      return;
    }
    setBanning(true);
    try {
      const t = getAccessToken();
      const res = await api.patch<{ data: UserDetail }>(`/users/${user.id}`, { isActive: !user.isActive }, t);
      toast.success(user.isActive ? "Account banned — it is now inactive" : "Account reactivated");
      setUser(res.data);
      setBanOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update account status");
    } finally {
      setBanning(false);
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <Button variant="outline" render={<Link href="/admin/users" />} nativeButton={false}>
          <ArrowLeft className="size-4" /> Back to users
        </Button>
        <p className="text-sm text-muted-foreground">User not found.</p>
      </div>
    );
  }

  const isPlayer = user.role === "USER";
  const pendingWithdrawals = funds.filter((f) => f.type === "WITHDRAWAL" && f.status === "PENDING");
  const pendingDeposits = funds.filter((f) => f.type === "DEPOSIT" && f.status === "PENDING");
  const totalStaked = bets.reduce((a, b) => a + Number(b.stake), 0);
  const totalWon = bets.filter((b) => b.status === "WON").reduce((a, b) => a + Number(b.settledPayout), 0);
  const totalLost = bets.filter((b) => b.status === "LOST").reduce((a, b) => a + Number(b.stake), 0);
  const depApproved = funds.filter((f) => f.type === "DEPOSIT" && f.status === "APPROVED").reduce((a, f) => a + Number(f.amount), 0);
  const wdApproved = funds.filter((f) => f.type === "WITHDRAWAL" && f.status === "APPROVED").reduce((a, f) => a + Number(f.amount), 0);

  const isAgent = user.role === "AGENT";
  const refFiltered = refSearch.trim()
    ? referred.filter((r) =>
        `${r.referee.name ?? ""} ${r.referee.email} ${r.codeUsed} ${r.status}`.toLowerCase().includes(refSearch.toLowerCase())
      )
    : referred;
  const refTotalPages = Math.max(1, Math.ceil(refFiltered.length / REF_PAGE_SIZE));
  const refPageSafe = Math.min(refPage, refTotalPages);
  const refPaged = refFiltered.slice((refPageSafe - 1) * REF_PAGE_SIZE, refPageSafe * REF_PAGE_SIZE);
  const refStats = (() => {
    const nowMs = Date.now();
    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
    return {
      all: referred.length,
      year: referred.filter((r) => new Date(r.createdAt).getTime() >= yearStart).length,
      d30: referred.filter((r) => nowMs - new Date(r.createdAt).getTime() <= 30 * 86400000).length,
      d7: referred.filter((r) => nowMs - new Date(r.createdAt).getTime() <= 7 * 86400000).length,
      funded100: referred.filter((r) => r.stats.depositTotal >= 100).length,
    };
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" render={<Link href="/admin/users" />} nativeButton={false}>
          <ArrowLeft className="size-4" /> Back to users
        </Button>
        <div className="flex gap-2">
          {user.isActive ? (
            <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => setBanOpen(true)}>
              <Ban className="size-4" /> Ban this account
            </Button>
          ) : (
            <Button variant="outline" className="border-secondary/30 text-secondary hover:bg-secondary/10" onClick={() => setBanOpen(true)}>
              <CircleCheck className="size-4" /> Reactivate account
            </Button>
          )}
          <Button onClick={openEdit} className="bg-primary">
            <Pencil className="size-4" /> Edit
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Profile header */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div className="grid size-16 place-items-center rounded-full bg-primary text-xl font-bold text-white">
            {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{user.name || "—"}</h1>
              {user.role === "ADMIN" && <Crown className="size-4 text-secondary" />}
              <Badge className={roleBadgeClass(user.role)}>{user.role}</Badge>
              <Badge className={user.isActive ? "bg-secondary text-white" : "bg-destructive/10 text-destructive"}>
                {user.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Mail className="size-3.5" /> {user.email}
            </div>
            <div className="mt-0.5 font-mono text-xs text-muted-foreground">{user.id}</div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 font-mono text-xl font-bold">
              <Wallet className="size-4 text-muted-foreground" /> ${Number(user.balance).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              {user._count.bets} bets • {user._count.transactions} transactions
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending alerts + upline (players only) */}
      {isPlayer && (pendingWithdrawals.length > 0 || pendingDeposits.length > 0) && (
        <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-amber-600 dark:text-amber-400">
              <TriangleAlert className="size-5" /> Needs review
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {pendingWithdrawals.length > 0 && (
              <Link href="/admin/users/withdrawal-requests">
                <div className="rounded-xl border border-amber-500/30 p-3 transition hover:bg-amber-500/10">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ArrowUpFromLine className="size-4 text-amber-600" />
                    {pendingWithdrawals.length} unanswered withdrawal{pendingWithdrawals.length === 1 ? "" : "s"}
                  </div>
                  <div className="mt-1 font-mono text-sm font-bold">
                    ETB {pendingWithdrawals.reduce((a, f) => a + Number(f.amount), 0).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    oldest: {new Date(pendingWithdrawals[pendingWithdrawals.length - 1].createdAt).toLocaleString()}
                  </div>
                </div>
              </Link>
            )}
            {pendingDeposits.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ArrowDownToLine className="size-4 text-amber-600" />
                  {pendingDeposits.length} unanswered deposit{pendingDeposits.length === 1 ? "" : "s"}
                </div>
                <div className="mt-1 font-mono text-sm font-bold">
                  ETB {pendingDeposits.reduce((a, f) => a + Number(f.amount), 0).toFixed(2)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  oldest: {new Date(pendingDeposits[pendingDeposits.length - 1].createdAt).toLocaleString()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isPlayer && uplineLoaded && (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <span className="grid size-9 place-items-center rounded-full bg-muted">
              <Network className="size-4 text-muted-foreground" />
            </span>
            {upline ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-muted-foreground">Registered with code</span>
                <span className="font-mono text-xs font-semibold">{upline.codeUsed}</span>
                {upline.codeType && (
                  <Badge variant="outline" className="text-[10px]">
                    {upline.codeType === "SECONDARY" ? "Agent code" : "Referral link"}
                  </Badge>
                )}
                <span className="text-muted-foreground">·</span>
                {upline.referrer ? (
                  <>
                    <span className="text-muted-foreground">by</span>
                    <Link href={`/admin/users/${upline.referrer.id}`} className="font-semibold text-primary hover:underline">
                      {upline.referrer.name || upline.referrer.email}
                    </Link>
                    <Badge className={roleBadgeClass(upline.referrer.role)}>{upline.referrer.role}</Badge>
                  </>
                ) : (
                  <span className="text-muted-foreground">referrer no longer on record</span>
                )}
                <Badge variant="outline" className="text-[10px]">{upline.status}</Badge>
              </div>
            ) : (
              <span className="text-muted-foreground">Registered directly — no referral code used.</span>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Details */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserIcon className="size-5 text-primary" /> Account details
            </CardTitle>
            <CardDescription>Full record for this account</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 p-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Name</div>
              <div className="font-medium">{user.name || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Email</div>
              <div className="font-medium">{user.email}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Role</div>
              <Badge className={roleBadgeClass(user.role)}>{user.role}</Badge>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <Badge className={user.isActive ? "bg-secondary text-white" : "bg-destructive/10 text-destructive"}>
                {user.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Balance</div>
              <div className="font-mono font-semibold">${Number(user.balance).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Email verified</div>
              <div>{user.emailVerified ? "Yes" : "No"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Referral code</div>
              <div className="font-mono text-xs">{user.referralCode ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Bets / Transactions</div>
              <div>
                {user._count.bets} / {user._count.transactions}
              </div>
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

        {/* Account type */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-5 text-primary" /> Account type
            </CardTitle>
            <CardDescription>Move this account between players, agents, managers and admins</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            <div className="space-y-1.5">
              <Label>Current type: {displayRole(user.role)}</Label>
              <Select value={displayRole(user.role)} onValueChange={openRoleChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                USER = player, AGENT = referral agent, ODDS_MANAGER = trading team, SUBADMIN = money management,
                ADMIN = full access. Switching asks for confirmation first.
              </p>
            </div>
            <Separator />
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
              <div className="text-sm font-semibold text-destructive">Danger zone</div>
              <p className="text-xs text-muted-foreground">
                Banning makes the account inactive — it can no longer sign in. Deleting an account with bets/transactions deactivates it instead of removing it.
              </p>
              <div className="mt-2 flex gap-2">
                {user.isActive ? (
                  <Button variant="destructive" size="sm" onClick={() => setBanOpen(true)}>
                    <Ban className="size-4" /> Ban this account
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="border-secondary/30 text-secondary hover:bg-secondary/10" onClick={() => setBanOpen(true)}>
                    <CircleCheck className="size-4" /> Reactivate account
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="size-4" /> Delete this account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Betting + funds history (players only) */}
      {isPlayer && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Ticket className="size-3.5" /> Total staked</div>
                <div className="font-mono text-lg font-bold">ETB {totalStaked.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><TrendingUp className="size-3.5" /> Total won</div>
                <div className="font-mono text-lg font-bold text-secondary">ETB {totalWon.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><TrendingDown className="size-3.5" /> Total lost</div>
                <div className="font-mono text-lg font-bold text-destructive">ETB {totalLost.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Banknote className="size-3.5" /> Net deposits</div>
                <div className="font-mono text-lg font-bold">ETB {(depApproved - wdApproved).toFixed(2)}</div>
                <div className="text-[11px] text-muted-foreground">in {depApproved.toFixed(0)} · out {wdApproved.toFixed(0)}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-base">
                <Ticket className="size-5 text-primary" /> Betting history
                <Badge variant="secondary" className="ml-1 bg-primary/15 text-primary border-primary/20">{bets.length}</Badge>
              </CardTitle>
              <CardDescription>Every bet placed by this account, newest first</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {bets.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">No bets placed yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="admin-cards">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">PLACED</TableHead>
                        <TableHead className="text-xs">SELECTIONS</TableHead>
                        <TableHead className="text-xs text-right">STAKE</TableHead>
                        <TableHead className="text-xs text-right">ODDS</TableHead>
                        <TableHead className="text-xs">STATUS</TableHead>
                        <TableHead className="text-xs text-right">RETURN</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bets.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="whitespace-nowrap text-xs">
                            {new Date(b.placedAt).toLocaleString()}
                            <div className="text-[10px] text-muted-foreground">{b.type}</div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {b.selections.map((leg, i) => (
                                <div key={i} className="text-xs">
                                  <span className="font-medium">{leg.selection?.name ?? "—"}</span>
                                  <span className="text-muted-foreground"> @ {Number(leg.oddsAtPlacement).toFixed(2)}</span>
                                  {leg.selection?.market?.game && (
                                    <div className="text-[11px] text-muted-foreground">
                                      {leg.selection.market.game.homeTeam} vs {leg.selection.market.game.awayTeam}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">ETB {Number(b.stake).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{Number(b.totalOdds).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                b.status === "WON"
                                  ? "bg-secondary text-white"
                                  : b.status === "LOST"
                                    ? "bg-destructive/10 text-destructive border-destructive/20"
                                    : b.status === "VOID"
                                      ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                      : "bg-muted text-foreground border-border"
                              }
                            >
                              {b.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {b.status === "WON" ? `ETB ${Number(b.settledPayout).toFixed(2)}` : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-base">
                <Banknote className="size-5 text-primary" /> Deposits & withdrawals
                <Badge variant="secondary" className="ml-1 bg-primary/15 text-primary border-primary/20">{funds.length}</Badge>
              </CardTitle>
              <CardDescription>Money in and out — newest first</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {funds.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">No deposit or withdrawal requests.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="admin-cards">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">DATE</TableHead>
                        <TableHead className="text-xs">TYPE</TableHead>
                        <TableHead className="text-xs text-right">AMOUNT</TableHead>
                        <TableHead className="text-xs">STATUS</TableHead>
                        <TableHead className="text-xs">REVIEWED BY</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {funds.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="whitespace-nowrap text-xs">{new Date(f.createdAt).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1 text-[11px]">
                              {f.type === "DEPOSIT" ? <ArrowDownToLine className="size-3" /> : <ArrowUpFromLine className="size-3" />}
                              {f.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">ETB {Number(f.amount).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                f.status === "APPROVED"
                                  ? "bg-secondary text-white"
                                  : f.status === "PENDING"
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                    : "bg-destructive/10 text-destructive border-destructive/20"
                              }
                            >
                              {f.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {f.reviewedBy ? f.reviewedBy.name || f.reviewedBy.email : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Agent: referred-users stats + paginated table */}
      {isAgent && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              { label: "Registered · all time", value: refStats.all },
              { label: "Registered · this year", value: refStats.year },
              { label: "Registered · last 30 days", value: refStats.d30 },
              { label: "Registered · last 7 days", value: refStats.d7 },
              { label: "Deposited 100+ ETB", value: refStats.funded100 },
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
                <Users className="size-5 text-primary" /> Registered via this agent
                <Badge variant="secondary" className="ml-1 bg-primary/15 text-primary border-primary/20">
                  {refFiltered.length}
                </Badge>
              </CardTitle>
              <CardDescription>Approved deposits, winnings, losses, bet counts and last bet per user</CardDescription>
              <div className="mt-3 max-w-sm">
                <Input
                  placeholder="Search name or email..."
                  value={refSearch}
                  onChange={(e) => { setRefSearch(e.target.value); setRefPage(1); }}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {refPaged.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">No referred users yet.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table className="admin-cards">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">USER</TableHead>
                          <TableHead className="text-xs">REGISTERED</TableHead>
                          <TableHead className="text-xs text-right">DEPOSITED</TableHead>
                          <TableHead className="text-xs text-right">WON</TableHead>
                          <TableHead className="text-xs text-right">LOST</TableHead>
                          <TableHead className="text-xs text-right">BETS</TableHead>
                          <TableHead className="text-xs">LAST BET</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {refPaged.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <Link href={`/admin/users/${r.referee.id}`} className="font-medium text-sm text-primary hover:underline">
                                {r.referee.name || "—"}
                              </Link>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="size-3" /> {r.referee.email}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              ETB {Number(r.stats.depositTotal).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-secondary">
                              ETB {Number(r.stats.wonTotal).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-destructive">
                              ETB {Number(r.stats.lostTotal).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">{r.stats.betCount}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                              {r.stats.lastBetAt ? new Date(r.stats.lastBetAt).toLocaleString() : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                    <span>
                      Showing {(refPageSafe - 1) * REF_PAGE_SIZE + 1}–{Math.min(refPageSafe * REF_PAGE_SIZE, refFiltered.length)} of {refFiltered.length}
                    </span>
                    <span className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={refPageSafe <= 1} onClick={() => setRefPage(refPageSafe - 1)}>
                        <ChevronLeft className="size-4" />
                      </Button>
                      <span className="px-1">{refPageSafe} / {refTotalPages}</span>
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={refPageSafe >= refTotalPages} onClick={() => setRefPage(refPageSafe + 1)}>
                        <ChevronRight className="size-4" />
                      </Button>
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Ban / reactivate warning confirm */}
      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent className="sm:max-w-[440px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="size-5" /> {user.isActive ? "Ban this account?" : "Reactivate this account?"}
            </DialogTitle>
            <DialogDescription>
              {user.isActive ? (
                <>
                  <span className="font-mono font-semibold">{user.email}</span> will become{" "}
                  <span className="font-semibold">inactive immediately</span> — they will be signed out everywhere
                  and will no longer be able to sign in. Their bets, balance and history are kept. You can reactivate
                  the account later.
                </>
              ) : (
                <>
                  <span className="font-mono font-semibold">{user.email}</span> will become{" "}
                  <span className="font-semibold">active again</span> and will be able to sign in and use the platform.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanOpen(false)}>
              Cancel
            </Button>
            {user.isActive ? (
              <Button variant="destructive" onClick={handleBanToggle} disabled={banning}>
                {banning ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />} Ban account
              </Button>
            ) : (
              <Button onClick={handleBanToggle} disabled={banning} className="bg-secondary">
                {banning ? <Loader2 className="size-4 animate-spin" /> : <CircleCheck className="size-4" />} Reactivate
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role change confirm */}
      <Dialog open={roleChangeOpen} onOpenChange={(open) => { setRoleChangeOpen(open); if (!open) setPendingRole(""); }}>
        <DialogContent className="sm:max-w-[420px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="size-5 text-primary" /> Change account type?
            </DialogTitle>
            <DialogDescription>
              Change <span className="font-mono font-semibold">{user.email}</span> from{" "}
              <Badge className={roleBadgeClass(user.role)}>{user.role}</Badge> to{" "}
              <Badge className={roleBadgeClass(pendingRole)}>{pendingRole || "—"}</Badge>?
              This takes effect immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleChangeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRoleChange} disabled={changingRole} className="bg-primary">
              {changingRole ? <Loader2 className="size-4 animate-spin" /> : <Briefcase className="size-4" />} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[520px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-primary" /> Edit User
            </DialogTitle>
            <DialogDescription>Update role, status or balance. Zod validated.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={editForm.name ?? ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={editErrors.name ? "border-destructive" : ""} />
              {editErrors.name && <p className="text-xs text-destructive">{editErrors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={editForm.role ?? ""} onValueChange={(v) => setEditForm({ ...editForm, role: v as EditForm["role"] })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Balance</Label>
              <Input type="number" value={editForm.balance ?? 0} onChange={(e) => setEditForm({ ...editForm, balance: Number(e.target.value) })} />
              {editErrors.balance && <p className="text-xs text-destructive">{editErrors.balance}</p>}
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} className="size-4" />
                Active
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={saving} className="bg-primary">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[420px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" /> Delete User?
            </DialogTitle>
            <DialogDescription>
              Delete <span className="font-mono font-semibold">{user.email}</span>? If they have bets, they will be deactivated instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
