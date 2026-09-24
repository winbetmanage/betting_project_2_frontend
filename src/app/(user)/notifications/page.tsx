"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Bell, CheckCheck } from "lucide-react";
import type { UINotification } from "@/components/notifications/NotificationBell";

function timeAgo(iso: string, t: (key: string, vals?: Record<string, string | number>) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return t("justNow");
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return t("minAgo", { n: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("hrAgo", { n: hrs });
  return t("dayAgo", { n: Math.floor(hrs / 24) });
}

export default function UserNotificationsPage() {
  const t = useTranslations("notifications");
  const router = useRouter();
  const [items, setItems] = useState<UINotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: UINotification[] }>(
        `/notifications/mine?limit=100${unreadOnly ? "&unreadOnly=true" : ""}`,
        getAccessToken()
      );
      setItems(res.data ?? []);
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : t("loadFailed"));
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
      await api.post("/notifications/read-all", {}, getAccessToken());
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
      toast.success(t("markedAll"));
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : t("markFailed"));
    } finally {
      setMarking(false);
    }
  };

  const unread = items.filter((x) => !x.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bell className="size-6 text-secondary" /> {t("notifications")}
          </h1>
          <p className="mt-1 text-sm text-white/60">
            {unread > 0 ? t("unreadN", { n: unread }) : t("caughtUp")} {t("notifSub")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUnreadOnly((v) => !v)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${unreadOnly ? "border-secondary bg-secondary/15 text-secondary" : "border-white/15 text-white/60 hover:text-white"}`}
          >
            {t("unreadOnly")}
          </button>
          <button
            onClick={markAll}
            disabled={marking || unread === 0}
            className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-secondary/90 disabled:opacity-50"
          >
            <CheckCheck className="size-4" /> {t("markAllRead")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-sm text-white/50">
          {t("noNotif")}{unreadOnly ? t("matchingFilter") : t("yet")}.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => openItem(n)}
              className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${n.isRead ? "border-white/10 bg-white/5" : "border-secondary/30 bg-secondary/10 hover:bg-secondary/15"}`}
            >
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.isRead ? "bg-white/20" : "bg-secondary"}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{n.title}</span>
                {n.message && <span className="mt-0.5 block text-xs text-white/60">{n.message}</span>}
                <span className="mt-1 block text-[11px] text-white/35">{timeAgo(n.createdAt, t)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
