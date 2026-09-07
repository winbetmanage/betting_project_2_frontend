"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  isAuthenticated,
  getUser,
  getUserRole,
  isTokenExpired,
  getAccessToken,
  clearSession,
  type Role,
} from "@/lib/auth";
import { tryRefreshSession, handleRefreshFailure } from "@/lib/sessionRefresh";

export type { Role };

function Loading({ label }: { label: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-brand-dark">
      <div className="flex flex-col items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-12" />
        {label && <p className="text-sm text-white/60">{label}</p>}
      </div>
    </div>
  );
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

      // If access token expired, try to refresh silently (shared single-flight refresh)
      const token = getAccessToken();
      if (isTokenExpired(token)) {
        const ok = await tryRefreshSession();
        if (!ok) {
          handleRefreshFailure();
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