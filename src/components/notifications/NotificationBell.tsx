"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export type UINotification = {
  id: string;
  audience: "USER" | "ADMIN";
  userId: string | null;
  user?: { id: string; email: string; name: string | null } | null;
  type: string;
  title: string;
  message: string | null;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

function timeAgo(iso: string, t: (key: string, vals?: Record<string, string | number>) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return t("justNow");
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return t("minAgo", { n: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("hrAgo", { n: hrs });
  return t("dayAgo", { n: Math.floor(hrs / 24) });
}

/**
 * Bell with unread badge + recent-items dropdown.
 * scope "user" reads the personal feed, "admin" the shared admin feed.
 */
export function NotificationBell({ scope, allHref, className }: { scope: "user" | "admin"; allHref: string; className?: string }) {
  const t = useTranslations("notifications");
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<UINotification[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    const t = getAccessToken();
    if (!t) return;
    try {
      const res = await api.get<{ data: { user: number; admin: number } }>("/notifications/unread-count", t);
      setUnread(scope === "admin" ? res.data.admin : res.data.user);
    } catch {
      /* not authenticated or route unavailable — stay quiet */
    }
  }, [scope]);

  const fetchRecent = useCallback(async () => {
    const t = getAccessToken();
    if (!t) return;
    try {
      const path = scope === "admin" ? "/notifications/admin?limit=8" : "/notifications/mine?limit=8";
      const res = await api.get<{ data: UINotification[] }>(path, t);
      setItems(res.data ?? []);
    } catch {
      /* ignore */
    }
  }, [scope]);

  useEffect(() => {
    fetchCount();
    const i = setInterval(fetchCount, 30000);
    const onFocus = () => fetchCount();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(i);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchCount]);

  useEffect(() => {
    if (!open) return;
    fetchRecent();
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, fetchRecent]);

  const openItem = async (n: UINotification) => {
    setOpen(false);
    try {
      if (!n.isRead) {
        await api.patch(`/notifications/${n.id}/read`, {}, getAccessToken());
        setUnread((u) => Math.max(0, u - 1));
      }
    } catch {
      /* ignore */
    }
    if (n.linkUrl) router.push(n.linkUrl);
  };

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
        aria-label={t("notifications")}
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-5 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-white/10 bg-[#0a0f2e] text-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <span className="text-xs font-semibold">{t("notifications")}{unread > 0 ? ` (${t("unreadN", { n: unread })})` : ""}</span>
            <Link href={allHref} onClick={() => setOpen(false)} className="text-[11px] text-primary-light hover:underline">
              {t("viewAll")}
            </Link>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-white/40">{t("noNotifYet")}</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`flex w-full items-start gap-2 border-b border-white/5 px-3 py-2.5 text-left transition hover:bg-white/5 ${n.isRead ? "opacity-60" : ""}`}
                >
                  <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${n.isRead ? "bg-white/20" : "bg-secondary"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">{n.title}</span>
                    {n.message && <span className="block truncate text-[11px] text-white/50">{n.message}</span>}
                    <span className="mt-0.5 block text-[10px] text-white/30">
                      {n.user?.email ? `${n.user.email} · ` : ""}{timeAgo(n.createdAt, t)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
