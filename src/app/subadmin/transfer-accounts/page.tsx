"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
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
import { Landmark, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

type TransferAccount = {
  id: string;
  accountName: string | null;
  accountNumber: string;
  bankName: string | null;
  status: boolean;
  createdAt?: string;
};

export default function SubadminTransferAccountsPage() {
  const [rows, setRows] = useState<TransferAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransferAccount | null>(null);
  const [form, setForm] = useState({ accountName: "", accountNumber: "", bankName: "", status: true });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TransferAccount | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: TransferAccount[] }>("/transfer-accounts", getAccessToken());
      setRows(res.data ?? []);
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Failed to load transfer accounts");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ accountName: "", accountNumber: "", bankName: "", status: true });
    setFormOpen(true);
  };

  const openEdit = (r: TransferAccount) => {
    setEditing(r);
    setForm({
      accountName: r.accountName ?? "",
      accountNumber: r.accountNumber,
      bankName: r.bankName ?? "",
      status: r.status,
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (form.accountNumber.trim().length < 4) {
      toast.error("Account number must be at least 4 characters");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        accountName: form.accountName.trim() || null,
        accountNumber: form.accountNumber.trim(),
        bankName: form.bankName.trim() || null,
        status: form.status,
      };
      if (editing) {
        await api.patch(`/transfer-accounts/${editing.id}`, payload, getAccessToken());
        toast.success("Transfer account updated");
      } else {
        await api.post("/transfer-accounts", payload, getAccessToken());
        toast.success("Transfer account added");
      }
      setFormOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/transfer-accounts/${deleteTarget.id}`, getAccessToken());
      toast.success("Transfer account removed");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Landmark className="size-3.5" /> Money management
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Our Transfer Accounts</h1>
          <p className="text-sm text-muted-foreground">Bank accounts users deposit to. Changes log under your account.</p>
        </div>
        <Button onClick={openCreate} className="bg-primary">
          <Plus className="size-4" /> Add account
        </Button>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="size-5 text-primary" /> Accounts
            <Badge variant="secondary" className="ml-1 bg-primary/15 text-primary border-primary/20">{rows.length}</Badge>
          </CardTitle>
          <CardDescription>Only active accounts are offered on the deposit page.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center py-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No transfer accounts yet.</div>
          ) : (
            <>
              {/* Mobile: stacked multi-line cards. No table and no sideways scroll on phones. */}
              <div className="space-y-3 p-3 md:hidden">
                {rows.map((r, i) => (
                  <div
                    key={r.id}
                    className={`min-w-0 rounded-xl border border-border p-3 ${i % 2 ? "bg-muted/30" : "bg-card"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="break-words text-sm font-semibold">{r.bankName || "—"}</div>
                        <div className="break-words text-xs text-muted-foreground">{r.accountName || "—"}</div>
                      </div>
                      <Badge className={`shrink-0 ${r.status ? "bg-secondary text-white" : "bg-muted text-muted-foreground border-border"}`}>
                        {r.status ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="mt-2 break-all font-mono text-sm">{r.accountNumber}</div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button size="sm" variant="outline" className="h-9 min-w-0" onClick={() => openEdit(r)}>
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 min-w-0 border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(r)}
                      >
                        <Trash2 className="size-3.5" /> Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: striped table. */}
              <div className="hidden md:block">
                <Table className="stripe-table">
              <TableHeader className="bg-primary">
                <TableRow className="border-primary hover:bg-primary">
                  <TableHead className="w-[22%] text-white text-xs tracking-widest">BANK</TableHead>
                  <TableHead className="w-[20%] text-white text-xs tracking-widest">ACCOUNT</TableHead>
                  <TableHead className="w-[22%] text-white text-xs tracking-widest">HOLDER</TableHead>
                  <TableHead className="w-[14%] text-white text-xs tracking-widest">STATUS</TableHead>
                  <TableHead className="w-[22%] text-right text-white text-xs tracking-widest">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className="border-border">
                    <TableCell className="break-words font-medium text-sm">{r.bankName || "—"}</TableCell>
                    <TableCell className="break-all font-mono text-sm">{r.accountNumber}</TableCell>
                    <TableCell className="break-words text-sm">{r.accountName || "—"}</TableCell>
                    <TableCell>
                      <Badge className={r.status ? "bg-secondary text-white" : "bg-muted text-muted-foreground border-border"}>
                        {r.status ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-8" onClick={() => openEdit(r)}>
                          <Pencil className="size-3.5" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(r)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[440px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit transfer account" : "Add transfer account"}</DialogTitle>
            <DialogDescription>Saved under your account in the activity log.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Bank name</Label>
              <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="e.g. CBE" />
            </div>
            <div className="space-y-1.5">
              <Label>Account number</Label>
              <Input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} placeholder="1000..." className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Holder name</Label>
              <Input value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} placeholder="Account holder" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.status} onChange={(e) => setForm({ ...form, status: e.target.checked })} className="size-4" />
              Active (offered on deposit page)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-primary">
              {saving ? <Loader2 className="size-4 animate-spin" /> : null} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-[420px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" /> Remove account?
            </DialogTitle>
            <DialogDescription>
              Remove <span className="font-mono font-semibold">{deleteTarget?.accountNumber}</span> ({deleteTarget?.bankName})? Users will no longer see it on the deposit page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={remove} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
