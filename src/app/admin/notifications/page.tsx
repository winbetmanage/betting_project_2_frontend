"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Search, X, RefreshCw, CheckCheck } from "lucide-react";
import type { UINotification } from "@/components/notifications/NotificationBell";

const SPINNER = "/assets/custom/infinite-spinner.svg";

const typeStyle: Record<string, string> = {
  GAME_FINISHED: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  USER_REGISTERED: "bg-sky-500/15 text-sky-600 border-sky-500/30 dark:text-sky-400",
  DEPOSIT_REQUESTED: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
  WITHDRAWAL_REQUESTED: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
  DEPOSIT_APPROVED: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  WITHDRAWAL_APPROVED: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  REFERRAL_SIGNUP: "bg-violet-500/15 text-violet-600 border-violet-500/30 dark:text-violet-400",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<UINotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: UINotification[] }>(
        `/notifications/admin?limit=200${unreadOnly ? "&unreadOnly=true" : ""}`,
        getAccessToken()
      );
      setItems(res.data ?? []);
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Failed to load notifications");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const openItem = async (n: UINotification) => {
    try {
      if (!n.isRead) {
        await api.patch(`/notifications/${n.id}/read`, {}, getAccessToken());
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      }
    } catch {
      /* ignore */
    }
    if (n.linkUrl) router.push(n.linkUrl);
  };

  const markAll = async () => {
    setMarking(true);
    try {
      await api.post("/notifications/read-all", { scope: "admin" }, getAccessToken());
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
      toast.success("All marked as read");
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : "Failed");
    } finally {
      setMarking(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = items.filter((n) => {
    if (!q) return true;
    return `${n.title} ${n.message ?? ""} ${n.type} ${n.user?.email ?? ""} ${n.user?.name ?? ""}`.toLowerCase().includes(q);
  });
  const unread = items.filter((x) => !x.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Bell className="size-3.5" /> Admin
          </div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Bell className="size-6 text-primary" /> Notifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread — ` : ""}Finished games, signups, deposit and withdrawal requests.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setUnreadOnly((v) => !v)} variant="outline" className={unreadOnly ? "border-secondary/40 text-secondary" : "border-border"}>
            Unread only{unreadOnly ? ` (${unread})` : ""}
          </Button>
          <Button onClick={markAll} disabled={marking || unread === 0} variant="outline" className="gap-1.5 border-primary/20 text-primary hover:bg-primary/10">
            {marking ? <RefreshCw className="size-4 animate-spin" /> : <CheckCheck className="size-4" />} Mark all read
          </Button>
          <Button onClick={load} disabled={loading} variant="outline" className="border-primary/20 text-primary hover:bg-primary/10">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-5 text-primary" /> Feed
            <Badge variant="secondary" className="ml-1 border-primary/20 bg-primary/15 text-primary">{filtered.length}</Badge>
          </CardTitle>
          <CardDescription>Click an item to open its destination — it will be marked as read.</CardDescription>
          <div className="mt-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search title, type, user..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 pr-8" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-muted p-1 hover:bg-muted/80">
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center py-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SPINNER} alt="Loading" className="size-10" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Bell className="mx-auto size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground">Game finishes, signups and fund requests will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-muted/50 ${n.isRead ? "opacity-60" : "bg-primary/[0.04]"}`}
                >
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.isRead ? "bg-muted-foreground/30" : "bg-secondary"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{n.title}</span>
                      <Badge variant="outline" className={`text-[10px] ${typeStyle[n.type] ?? ""}`}>{n.type.replace(/_/g, " ")}</Badge>
                    </span>
                    {n.message && <span className="mt-0.5 block text-xs text-muted-foreground">{n.message}</span>}
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {n.user?.email ? `${n.user.name || n.user.email} · ` : ""}{timeAgo(n.createdAt)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
