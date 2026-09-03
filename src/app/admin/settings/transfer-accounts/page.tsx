"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CreditCard, Plus, Eye, Pencil, Trash2, Building2, Landmark, Hash, Globe, MoreHorizontal, Loader2, ShieldCheck } from "lucide-react";

// Zod schema for validation
const transferAccountSchema = z.object({
  accountType: z.string().max(50).optional().or(z.literal("")),
  accountName: z.string().max(100).optional().or(z.literal("")),
  accountNumber: z.string().min(4, "Account number must be at least 4 characters").max(50, "Too long"),
  bankName: z.string().max(100).optional().or(z.literal("")),
  bankCode: z.string().max(20).optional().or(z.literal("")),
  branchName: z.string().max(100).optional().or(z.literal("")),
  branchCode: z.string().max(20).optional().or(z.literal("")),
  swiftCode: z.string().max(20).optional().or(z.literal("")),
  status: z.boolean().default(true),
});

type TransferAccount = z.infer<typeof transferAccountSchema> & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

type FormData = z.infer<typeof transferAccountSchema>;
type FormErrors = Partial<Record<keyof FormData, string>>;

const emptyForm: FormData = {
  accountType: "",
  accountName: "",
  accountNumber: "",
  bankName: "",
  bankCode: "",
  branchName: "",
  branchCode: "",
  swiftCode: "",
  status: true,
};

export default function TransferAccountsPage() {
  const [accounts, setAccounts] = useState<TransferAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Details / Edit / Delete
  const [selected, setSelected] = useState<TransferAccount | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<FormData>(emptyForm);
  const [editErrors, setEditErrors] = useState<FormErrors>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  const load = async () => {
    const t = getAccessToken() ?? token;
    setLoading(true);
    try {
      const res = await api.get<{ data: TransferAccount[] }>("/transfer-accounts", t);
      setAccounts(res.data ?? []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const validate = (data: FormData): FormErrors | null => {
    const result = transferAccountSchema.safeParse(data);
    if (result.success) return null;
    const fieldErrors: FormErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof FormData;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return fieldErrors;
  };

  const handleAdd = async () => {
    setNotice(null);
    const v = validate(form);
    if (v) {
      setErrors(v);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const t = getAccessToken() ?? token;
      await api.post("/transfer-accounts", form, t);
      toast.success("Account added successfully");
      setNotice({ kind: "ok", text: "Account added successfully" });
      setForm(emptyForm);
      setAddOpen(false);
      load();
    } catch (e) {
      const msg = e instanceof ApiError || e instanceof Error ? e.message : "Failed to add account";
      toast.error(msg);
      setNotice({ kind: "err", text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const openDetails = (acc: TransferAccount) => {
    setSelected(acc);
    setDetailsOpen(true);
  };

  const openEdit = () => {
    if (!selected) return;
    setEditForm({
      accountType: selected.accountType ?? "",
      accountName: selected.accountName ?? "",
      accountNumber: selected.accountNumber ?? "",
      bankName: selected.bankName ?? "",
      bankCode: selected.bankCode ?? "",
      branchName: selected.branchName ?? "",
      branchCode: selected.branchCode ?? "",
      swiftCode: selected.swiftCode ?? "",
      status: selected.status ?? true,
    });
    setEditErrors({});
    setDetailsOpen(false);
    setTimeout(() => setEditOpen(true), 150);
  };

  const handleEdit = async () => {
    if (!selected) return;
    const v = validate(editForm);
    if (v) {
      setEditErrors(v);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setEditErrors({});
    setEditSubmitting(true);
    try {
      const t = getAccessToken() ?? token;
      await api.patch(`/transfer-accounts/${selected.id}`, editForm, t);
      setEditOpen(false);
      toast.success("Account updated successfully");
      setNotice({ kind: "ok", text: "Account updated" });
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Update failed";
      toast.error(msg);
      setEditErrors({ accountNumber: msg });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      const t = getAccessToken() ?? token;
      await api.delete(`/transfer-accounts/${selected.id}`, t);
      setDeleteConfirmOpen(false);
      setDetailsOpen(false);
      toast.success("Account deleted");
      setNotice({ kind: "ok", text: "Account deleted" });
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      toast.error(msg);
      setNotice({ kind: "err", text: msg });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="size-3.5" /> Settings • Finance
          </div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <CreditCard className="size-6 text-primary" /> Our Transfer Account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage bank accounts used for player deposits and withdrawals. Visible to finance team.</p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"><Plus className="size-4" /> Add Account</Button>} />
          <DialogContent className="sm:max-w-[600px] bg-card border-white/10 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-lg bg-primary text-white">
                  <CreditCard className="size-4" />
                </div>
                Add Transfer Account
              </DialogTitle>
              <DialogDescription>Fill in the bank account details. Account number is required. Validated with Zod.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    placeholder="Tana Betting PLC"
                    value={form.accountName ?? ""}
                    onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                    className={errors.accountName ? "border-destructive" : ""}
                  />
                  {errors.accountName && <p className="text-xs text-destructive">{errors.accountName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="accountType">Account Type</Label>
                  {/* @ts-expect-error Select value type mismatch - nullable to string */}
                  <Select value={form.accountType ?? ""} onValueChange={(v) => setForm({ ...form, accountType: v })}>
                    <SelectTrigger className={errors.accountType ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAVINGS">Savings</SelectItem>
                      <SelectItem value="CURRENT">Current</SelectItem>
                      <SelectItem value="BUSINESS">Business</SelectItem>
                      <SelectItem value="PERSONAL">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.accountType && <p className="text-xs text-destructive">{errors.accountType}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="accountNumber" className="after:content-['*'] after:ml-0.5 after:text-destructive">Account Number</Label>
                <Input
                  id="accountNumber"
                  placeholder="1000123456789"
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                  className={errors.accountNumber ? "border-destructive" : ""}
                />
                {errors.accountNumber && <p className="text-xs text-destructive">{errors.accountNumber}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input id="bankName" placeholder="Commercial Bank of Ethiopia" value={form.bankName ?? ""} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bankCode">Bank Code</Label>
                  <Input id="bankCode" placeholder="CBE001" value={form.bankCode ?? ""} onChange={(e) => setForm({ ...form, bankCode: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="branchName">Branch Name</Label>
                  <Input id="branchName" placeholder="Bole Branch" value={form.branchName ?? ""} onChange={(e) => setForm({ ...form, branchName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="branchCode">Branch Code</Label>
                  <Input id="branchCode" placeholder="BR-009" value={form.branchCode ?? ""} onChange={(e) => setForm({ ...form, branchCode: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="swiftCode">SWIFT Code</Label>
                <Input id="swiftCode" placeholder="CBETETAA" value={form.swiftCode ?? ""} onChange={(e) => setForm({ ...form, swiftCode: e.target.value })} />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="status"
                  checked={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.checked })}
                  className="size-4 rounded border-input"
                />
                <Label htmlFor="status" className="font-normal">Active (visible for transfers)</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={submitting} className="bg-primary hover:bg-primary/90">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {notice && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${notice.kind === "ok" ? "border-secondary/20 bg-secondary/10 text-secondary" : "border-destructive/20 bg-destructive/10 text-destructive"}`}>
          {notice.text}
        </div>
      )}

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="size-5 text-primary" /> Accounts
            <Badge variant="secondary" className="ml-2 bg-primary/15 text-primary border-primary/20">
              {accounts.length} total
            </Badge>
          </CardTitle>
          <CardDescription>All transfer accounts for deposits/withdrawals. Click details to view, edit or delete.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="grid size-12 place-items-center rounded-full bg-muted">
                <CreditCard className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No accounts yet</p>
                <p className="text-sm text-muted-foreground">Add your first bank transfer account to get started.</p>
              </div>
              <Button onClick={() => setAddOpen(true)} className="mt-2 bg-primary">
                <Plus className="size-4" /> Add Account
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-primary">
                  <TableRow className="hover:bg-primary border-primary">
                    <TableHead className="text-white text-xs tracking-widest">ACCOUNT</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">BANK</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">NUMBER</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">TYPE</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">STATUS</TableHead>
                    <TableHead className="text-right text-white text-xs tracking-widest">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((acc) => (
                    <TableRow key={acc.id} className="border-border hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary">
                            <Building2 className="size-4" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{acc.accountName || "—"}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Hash className="size-3" /> {acc.id.slice(0, 8)}…
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{acc.bankName || "—"}</div>
                        <div className="text-xs text-muted-foreground">{acc.branchName || ""}</div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{acc.accountNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-white/10">
                          {acc.accountType || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={acc.status ? "bg-secondary text-white border-secondary/20" : "bg-muted text-muted-foreground"}>
                          {acc.status ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" className="h-8 border-white/10 hover:bg-white/5" onClick={() => openDetails(acc)}>
                            <Eye className="size-3.5" /> Details
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" className="h-8 w-8"><MoreHorizontal className="size-4" /></Button>} />
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuGroup>
                                <DropdownMenuItem onClick={() => openDetails(acc)}>
                                  <Eye className="size-4" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelected(acc);
                                    openEdit();
                                  }}
                                >
                                  <Pencil className="size-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelected(acc);
                                    setDeleteConfirmOpen(true);
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
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[560px] bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-lg bg-primary text-white">
                <CreditCard className="size-4" />
              </div>
              Account Details
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">{selected?.id}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Account Name</div>
                  <div className="font-medium">{selected.accountName || "—"}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Account Type</div>
                  <Badge variant="outline">{selected.accountType || "—"}</Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Hash className="size-3" /> Account Number
                  </div>
                  <div className="font-mono font-semibold">{selected.accountNumber}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <Badge className={selected.status ? "bg-secondary text-white" : "bg-muted"}>{selected.status ? "Active" : "Inactive"}</Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Landmark className="size-3" /> Bank Name
                  </div>
                  <div>{selected.bankName || "—"}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Bank Code</div>
                  <div className="font-mono text-sm">{selected.bankCode || "—"}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Branch Name</div>
                  <div>{selected.branchName || "—"}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Branch Code</div>
                  <div className="font-mono text-sm">{selected.branchCode || "—"}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Globe className="size-3" /> SWIFT Code
                  </div>
                  <div className="font-mono">{selected.swiftCode || "—"}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Created</div>
                  <div className="text-xs">{new Date(selected.createdAt).toLocaleString()}</div>
                </div>
              </div>
              <Separator className="bg-white/10" />
              <div className="flex gap-2">
                <Button onClick={openEdit} className="flex-1 bg-primary hover:bg-primary/90">
                  <Pencil className="size-4" /> Edit
                </Button>
                <Button variant="destructive" onClick={() => setDeleteConfirmOpen(true)} className="flex-1">
                  <Trash2 className="size-4" /> Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-primary" /> Edit Account
            </DialogTitle>
            <DialogDescription>Update the fields and save. Zod validation applies.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Account Name</Label>
                <Input value={editForm.accountName ?? ""} onChange={(e) => setEditForm({ ...editForm, accountName: e.target.value })} className={editErrors.accountName ? "border-destructive" : ""} />
                {editErrors.accountName && <p className="text-xs text-destructive">{editErrors.accountName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Account Type</Label>
                {/* @ts-expect-error Select value type mismatch - nullable to string */}
                <Select value={editForm.accountType ?? ""} onValueChange={(v) => setEditForm({ ...editForm, accountType: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAVINGS">Savings</SelectItem>
                    <SelectItem value="CURRENT">Current</SelectItem>
                    <SelectItem value="BUSINESS">Business</SelectItem>
                    <SelectItem value="PERSONAL">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Account Number *</Label>
              <Input value={editForm.accountNumber} onChange={(e) => setEditForm({ ...editForm, accountNumber: e.target.value })} className={editErrors.accountNumber ? "border-destructive" : ""} />
              {editErrors.accountNumber && <p className="text-xs text-destructive">{editErrors.accountNumber}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Bank Name</Label>
                <Input value={editForm.bankName ?? ""} onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Bank Code</Label>
                <Input value={editForm.bankCode ?? ""} onChange={(e) => setEditForm({ ...editForm, bankCode: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Branch Name</Label>
                <Input value={editForm.branchName ?? ""} onChange={(e) => setEditForm({ ...editForm, branchName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Branch Code</Label>
                <Input value={editForm.branchCode ?? ""} onChange={(e) => setEditForm({ ...editForm, branchCode: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>SWIFT Code</Label>
              <Input value={editForm.swiftCode ?? ""} onChange={(e) => setEditForm({ ...editForm, swiftCode: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.checked })} className="size-4 rounded" />
              <Label className="font-normal">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={editSubmitting} className="bg-primary">
              {editSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />} Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[420px] bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" /> Delete Account?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete <span className="font-mono font-semibold">{selected?.accountNumber}</span>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
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
