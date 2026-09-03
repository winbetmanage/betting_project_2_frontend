"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Activity, WifiOff, Loader2 } from "lucide-react";

const RAW_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
const API_URL = RAW_API_URL.replace(/\/$/, "");

type Status = "checking" | "connected" | "unreachable";

export function ApiStatus({ variant = "nav" }: { variant?: "nav" | "card" }) {
  const [status, setStatus] = useState<Status>("checking");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const check = async (): Promise<boolean> => {
    // Use direct backend URL for health check when proxy not available for "/"
    const base = API_URL || (typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:3000" : "");
    const candidates = [
      `${base}/`, // home root as requested {message: "it is working"}
      `${base}/health`,
      // fallback via Next.js proxy if direct fails
      `/api/v1/health`,
    ];
    for (const url of candidates) {
      try {
        const res = await fetch(url, { method: "GET", cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (res.ok && ((json as { message?: string }).message === "it is working" || (json as { status?: string }).status === "ok")) {
          setStatus("connected");
          return true;
        }
      } catch {
        // try next candidate
      }
    }
    setStatus("unreachable");
    return false;
  };

  useEffect(() => {
    check();
  }, []);

  useEffect(() => {
    // Poll every 10s only when unreachable
    if (status === "unreachable" && !intervalRef.current) {
      intervalRef.current = setInterval(check, 10000);
    }
    if (status === "connected" && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current && status === "connected") {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (variant === "card") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${status === "connected" ? "bg-secondary/15 text-secondary border-secondary/20" : status === "unreachable" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-muted text-muted-foreground border-border"}`}
      >
        {status === "checking" && <Loader2 className="size-3 animate-spin" />}
        {status === "connected" && <Activity className="size-3" />}
        {status === "unreachable" && <WifiOff className="size-3" />}
        {status === "checking" ? "API: Checking..." : status === "connected" ? "API: Connected" : "API: Unreachable"}
      </div>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide border ${status === "connected" ? "bg-secondary/15 text-secondary border-secondary/20" : status === "unreachable" ? "bg-destructive/10 text-destructive border-destructive/20 animate-pulse" : "bg-white/10 text-white/60 border-white/10"}`}
    >
      {status === "checking" ? (
        <Loader2 className="size-3 animate-spin" />
      ) : status === "connected" ? (
        <span className="size-1.5 rounded-full bg-secondary animate-pulse" />
      ) : (
        <WifiOff className="size-3" />
      )}
      {status === "checking" ? "API: Checking..." : status === "connected" ? "API: Connected" : "API: Unreachable"}
    </Badge>
  );
}
