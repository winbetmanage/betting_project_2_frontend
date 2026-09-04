"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  isAuthenticated,
  getUser,
  getUserRole,
  isTokenExpired,
  getAccessToken,
  getRefreshToken,
  clearSession,
  type Role,
} from "@/lib/auth";
import { API_URL } from "@/lib/api";

export type { Role };

function Loading({ label }: { label: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-brand-dark text-sm text-white/60">
      {label}
    </div>
  );
}

async function tryRefreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  const accessToken = getAccessToken();
  // If no refresh token, can't refresh
  if (!refreshToken) return false;
  // If access token not expired, no need
  if (accessToken && !isTokenExpired(accessToken)) return true;
  try {
    const base = API_URL;
    const res = await fetch(`${base}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error();
    const data = (json as { data: { accessToken: string; refreshToken: string; user: unknown } }).data;
    if (!data?.accessToken) throw new Error();
    if (typeof window !== "undefined") {
      window.localStorage.setItem("accessToken", data.accessToken);
      window.localStorage.setItem("refreshToken", data.refreshToken);
      window.localStorage.setItem("user", JSON.stringify(data.user));
    }
    return true;
  } catch {
    clearSession();
    return false;
  }
}

export default function RoleGate({
  roles,
  children,
  fallbackTo = "/",
  loading = "Loading...",
}: {
  roles: Role[];
  children: ReactNode;
  fallbackTo?: string;
  loading?: string;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isAuthenticated()) {
        router.replace("/login");
        return;
      }

      // If access token expired, try to refresh silently
      const token = getAccessToken();
      if (isTokenExpired(token)) {
        const ok = await tryRefreshSession();
        if (!ok) {
          router.replace("/login");
          return;
        }
      }

      if (cancelled) return;
      const user = getUser();
      const role = user?.role ?? getUserRole();
      if (role && roles.includes(role)) {
        setAllowed(true);
      } else if (!role) {
        // Token invalid after refresh - force login
        clearSession();
        router.replace("/login");
      } else {
        router.replace(fallbackTo);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, roles, fallbackTo]);

  if (!allowed) return <Loading label={loading} />;
  return <>{children}</>;
}