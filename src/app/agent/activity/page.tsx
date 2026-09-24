"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Search, ChevronLeft, ChevronRight } from "lucide-react";

type Note = {
  id: string;
  title: string;
  message?: string | null;
  isRead: boolean;
  createdAt: string;
};

const PAGE_SIZE = 15;

export default function AgentActivityPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = getAccessToken();
    if (!t) return;
    setLoading(true);
    api
      .get<{ data: Note[] }>("/notifications/mine?limit=200", t)
      .then((r) => setNotes(r.data ?? []))
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load activity");
        setNotes([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const list = [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((n) => `${n.title} ${n.message ?? ""}`.toLowerCase().includes(q));
  }, [notes, search]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const unread = notes.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
          <Bell className="size-3.5" /> Activity history
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">All Activity</h1>
        <p className="text-sm text-muted-foreground">
          Every notification on your account, newest first
          {unread > 0 && (
            <Badge variant="secondary" className="ml-2 bg-secondary/15 text-secondary border-secondary/20">
              {unread} unread
            </Badge>
          )}
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <div className="max-w-sm">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search activity..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8"
              />
            </div>
          </div>
          <CardDescription className="mt-2">
            Showing {visible.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, visible.length)} of {visible.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center py-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
            </div>
          ) : paged.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No activity yet.</div>
          ) : (
            <>
              <div className="divide-y divide-border">
                {paged.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3">
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.isRead ? "bg-muted-foreground/30" : "bg-secondary"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{n.title}</div>
                      {n.message && <div className="mt-0.5 text-xs text-muted-foreground">{n.message}</div>}
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                <span>Page {safePage} of {totalPages}</span>
                <span className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                    <ChevronRight className="size-4" />
                  </Button>
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
