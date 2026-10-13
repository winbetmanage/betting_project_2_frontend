"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { api, ApiError } from "@/lib/api";
import { getAccessToken, getUser } from "@/lib/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, ShieldCheck, Crown, Eye, Pencil, Trash2, Hash, Mail, Wallet, Calendar, Activity, Search, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { isSubAdminRole } from "@/lib/roles";

const ALL_ROLES = ["USER", "ADMIN", "ODDS_MANAGER", "AGENT", "SUBADMIN"] as const;

const editSchema = z.object({
  name: z.string().max(100).optional().or(z.literal("")),
  role: z.enum(ALL_ROLES).optional(),
  isActive: z.boolean().optional(),
  balance: z.coerce.number().min(0).optional(),
});

type EditForm = z.infer<typeof editSchema>;

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  balance: string | number;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  referredAs: { referrer: { id: string; name: string | null } } | null;
  _count: { bets: number; transactions: number };
};

const agentFirstName = (u: UserRow): string => {
  const name = u.referredAs?.referrer.name?.trim() ?? "";
  if (!name) return "—";
  return name.split(/\s+/)[0];
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // Server-side pagination, so every account is reachable no matter how many exist.
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [selected, setSelected] = useState<UserRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({});
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof EditForm, string>>>({});
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  const load = async (targetPage?: number) => {
    const t = getAccessToken() ?? token;
    const p = Math.max(1, targetPage ?? page);
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("search", search.trim());
      qs.set("page", String(p));
      qs.set("limit", String(limit));
      const res = await api.get<{ data: UserRow[]; total: number; totalPages: number }>(`/users?${qs.toString()}`, t);
      setUsers(res.data ?? []);
      setTotal(res.total ?? 0);
      setTotalPages(Math.max(1, res.totalPages ?? 1));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load users");
      setUsers([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // One request per page/search/limit. Typing is debounced; paging is immediate.
  useEffect(() => {
    if (!token) return;
    const id = setTimeout(() => { void load(page); }, search.trim() ? 350 : 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, search, page, limit]);

  // Admins & betting managers first, then agents, then players — within each page.
  const sortedUsers = useMemo(() => {
    const rank = (role: string) =>
      role === "ADMIN" ? 0 : role === "ODDS_MANAGER" || isSubAdminRole(role) ? 1 : role === "AGENT" ? 2 : 3;
    return [...users].sort((a, b) => rank(a.role) - rank(b.role));
  }, [users]);

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

  const avatarClass = (role: string) =>
    role === "ADMIN"
      ? "bg-primary"
      : role === "ODDS_MANAGER"
        ? "bg-secondary"
        : role === "AGENT"
          ? "bg-amber-500"
          : isSubAdminRole(role)
            ? "bg-sky-500"
            : "bg-muted text-foreground";

  const openDetails = (u: UserRow) => {
    router.push(`/admin/users/${u.id}`);
  };

  const openEdit = (u?: UserRow) => {
    const target = u ?? selected;
    if (!target) return;
    setSelected(target);
    setEditForm({
      name: target.name ?? "",
      role: target.role as EditForm["role"],
      isActive: target.isActive,
      balance: Number(target.balance),
    });
    setEditErrors({});
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!selected) return;
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
      const t = getAccessToken() ?? token;
      const payload: Record<string, unknown> = {};
      if (editForm.name !== undefined) payload.name = editForm.name || null;
      if (editForm.role) payload.role = editForm.role;
      if (editForm.isActive !== undefined) payload.isActive = editForm.isActive;
      if (editForm.balance !== undefined) payload.balance = editForm.balance;
      await api.patch(`/users/${selected.id}`, payload, t);
      toast.success("User updated");
      setEditOpen(false);
      load();
    } catch (e) {
      const msg = e instanceof ApiError || e instanceof Error ? e.message : "Update failed";
      toast.error(msg);
      setEditErrors({ name: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    // prevent self delete UI hint
    const me = getUser();
    if (me?.id === selected.id) {
      toast.error("Cannot delete your own account");
      return;
    }
    setDeleting(true);
    try {
      const t = getAccessToken() ?? token;
      await api.delete(`/users/${selected.id}`, t);
      toast.success("User deleted (or deactivated if has transactions)");
      setDeleteOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const UserTable = ({ data }: { data: UserRow[] }) => (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-5 text-primary" /> Users
          <Badge variant="secondary" className="ml-2 bg-primary/15 text-primary border-primary/20">
            {data.length} on this page
          </Badge>
        </CardTitle>
        <CardDescription>
          Every account in one list — admins &amp; betting managers on top, then agents, then players.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
            <div className="grid place-items-center py-14">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
          </div>
          ) : data.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No users found</div>
        ) : (
          <>
            {/* Desktop: fixed-width table that fits the screen without sideways scroll */}
            <div className="hidden md:block">
              <Table className="table-fixed">
              <TableHeader className="bg-primary">
                <TableRow className="hover:bg-primary border-primary">
                  <TableHead className="w-[34%] text-white text-xs tracking-widest">USER</TableHead>
                  <TableHead className="w-[14%] text-white text-xs tracking-widest">ROLE</TableHead>
                  <TableHead className="w-[16%] text-white text-xs tracking-widest">BALANCE</TableHead>
                  <TableHead className="w-[14%] text-white text-xs tracking-widest">STATUS</TableHead>
                  <TableHead className="w-[12%] text-white text-xs tracking-widest">JOINED</TableHead>
                  <TableHead className="w-[10%] text-right text-white text-xs tracking-widest">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((u) => (
                  <TableRow key={u.id} className="border-border hover:bg-muted/50">
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`grid size-9 shrink-0 place-items-center rounded-full text-white text-xs font-bold ${avatarClass(u.role)}`}>
                          {u.name?.[0]?.toUpperCase() ?? u.email[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 truncate text-sm font-medium">
                            {u.name || "—"} {u.role === "ADMIN" && <Crown className="size-3 shrink-0 text-secondary" />}
                          </div>
                          <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <Mail className="size-3 shrink-0" /> <span className="truncate">{u.email}</span>
                          </div>
                          <div className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                            <Hash className="size-3 shrink-0" /> {u.id.slice(0, 8)}…
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={roleBadgeClass(u.role)} variant="outline">
                        {u.role}
                      </Badge>
                      {u.role === "USER" && u.referredAs && (
                        <div className="mt-1 truncate text-[10px] text-muted-foreground">Agent: {agentFirstName(u)}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 font-mono text-sm">
                        <Wallet className="size-3 text-muted-foreground" /> ${Number(u.balance).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {u._count.bets} bets • {u._count.transactions} tx
                      </span>
                    </TableCell>
                    <TableCell>
                      <>
                        <Badge className={u.isActive ? "bg-secondary text-white" : "bg-destructive/10 text-destructive border-destructive/20"}>
                          {u.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {u.emailVerified && <Badge variant="outline" className="ml-1 text-[10px] border-secondary/20 text-secondary">Verified</Badge>}
                      </>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">{new Date(u.createdAt).toLocaleDateString()}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="size-3" /> {new Date(u.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-8" onClick={() => openDetails(u)}>
                          <Eye className="size-3.5" /> Details
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" className="h-8 w-8"><Pencil className="size-4" /></Button>} />
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuGroup>
                              <DropdownMenuItem onClick={() => openDetails(u)}>
                                <Eye className="size-4" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelected(u);
                                  openEdit(u);
                                }}
                              >
                                <Pencil className="size-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelected(u);
                                  setDeleteOpen(true);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="size-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>

            {/* Mobile: stacked cards, every field on its own wrapped line — no table, no sideways scroll */}
            <div className="space-y-3 p-3 md:hidden">
              {data.map((u) => (
                <div key={u.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <div className={`grid size-9 shrink-0 place-items-center rounded-full text-white text-xs font-bold ${avatarClass(u.role)}`}>
                        {u.name?.[0]?.toUpperCase() ?? u.email[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-sm font-semibold">
                          <span className="break-words">{u.name || "—"}</span>
                          {u.role === "ADMIN" && <Crown className="size-3 shrink-0 text-secondary" />}
                        </div>
                        <div className="break-all text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                    <Badge className={`${roleBadgeClass(u.role)} shrink-0`} variant="outline">
                      {u.role}
                    </Badge>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Badge className={u.isActive ? "bg-secondary text-white" : "bg-destructive/10 text-destructive border-destructive/20"}>
                      {u.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {u.emailVerified && (
                      <Badge variant="outline" className="border-secondary/20 text-secondary">Verified</Badge>
                    )}
                    <span className="font-mono">
                      {u._count.bets} bets • {u._count.transactions} tx
                    </span>
                  </div>

                  <div className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
                    <div className="font-mono">Balance: ${Number(u.balance).toFixed(2)}</div>
                    <div className="flex items-center gap-1">
                      <Hash className="size-3 shrink-0" /> {u.id.slice(0, 8)}…
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="size-3 shrink-0" /> Joined {new Date(u.createdAt).toLocaleDateString()}
                    </div>
                    {u.role === "USER" && u.referredAs && (
                      <div className="break-words">Agent: {agentFirstName(u)}</div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="h-9 flex-1" onClick={() => openDetails(u)}>
                      <Eye className="size-3.5" /> Details
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 flex-1"
                      onClick={() => { setSelected(u); openEdit(u); }}
                    >
                      <Pencil className="size-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 flex-1 text-destructive hover:bg-destructive/10"
                      onClick={() => { setSelected(u); setDeleteOpen(true); }}
                    >
                      <Trash2 className="size-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Users className="size-3.5" /> Manage Bettors
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">Every registered account in one paginated list — admins &amp; betting managers on top, then agents, then players. Details, edit &amp; delete.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex w-full items-center gap-2 rounded-xl border border-border bg-white px-3 py-1.5 shadow-sm sm:w-auto">
            <Search className="size-4 shrink-0 text-primary" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full border-0 p-0 pl-1 shadow-none focus-visible:ring-0 sm:w-[260px] placeholder:text-muted-foreground"
            />
            {search ? (
              <button onClick={() => { setSearch(""); setPage(1); }} className="shrink-0 rounded-full bg-muted p-1 hover:bg-muted/80">
                <X className="size-3" />
              </button>
            ) : (
              <span className="hidden text-xs text-muted-foreground sm:inline">Name / Email</span>
            )}
          </div>
          <Badge variant="outline" className="whitespace-nowrap border-primary/20 text-primary">
            <Activity className="size-3" /> {total} total
          </Badge>
        </div>
      </div>

      <UserTable data={sortedUsers} />

      {/* Pagination — every account is reachable */}
      {!loading && total > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
            </span>
            <label className="flex items-center gap-1.5">
              Rows
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>
          {totalPages > 1 && (
            <Pagination className="mx-0 w-auto">
              <PaginationContent className="flex-wrap">
                <PaginationItem>
                  <PaginationLink
                    size="icon"
                    aria-disabled={page <= 1}
                    className={page <= 1 ? "pointer-events-none opacity-40" : "cursor-pointer"}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </PaginationLink>
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, i, arr) => (
                    <span key={p} className="flex items-center gap-1">
                      {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1 text-muted-foreground">…</span>}
                      <PaginationItem>
                        <PaginationLink
                          className="cursor-pointer"
                          isActive={p === page}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    </span>
                  ))}
                <PaginationItem>
                  <PaginationLink
                    size="icon"
                    aria-disabled={page >= totalPages}
                    className={page >= totalPages ? "pointer-events-none opacity-40" : "cursor-pointer"}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </PaginationLink>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}

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
                  <SelectItem value="USER">USER</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                  <SelectItem value="ODDS_MANAGER">ODDS_MANAGER</SelectItem>
                  <SelectItem value="AGENT">AGENT</SelectItem>
                  <SelectItem value="SUBADMIN">SUBADMIN</SelectItem>
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
              Delete <span className="font-mono font-semibold">{selected?.email}</span>? If they have bets, they will be deactivated instead.
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
