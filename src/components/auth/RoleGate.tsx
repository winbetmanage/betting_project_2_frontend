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
import { roleMatches } from "@/lib/roles";
import { SignInPromptCard } from "./SignInPrompt";

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
  guestPrompt = false,
}: {
  roles: Role[];
  children: ReactNode;
  fallbackTo?: string;
  loading?: string;
  /**
   * When true, visitors who are not signed in see an inline sign-in prompt
   * instead of being redirected to /login. Used by user pages so guests can
   * keep browsing and only sign in when they act. Defaults to false, so all
   * existing gates (admin, agent, subadmin) behave exactly as before.
   */
  guestPrompt?: boolean;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"checking" | "allowed" | "guest">("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isAuthenticated()) {
        if (guestPrompt) {
          if (!cancelled) setPhase("guest");
          return;
        }
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
      if (role && roleMatches(role, roles)) {
        setPhase("allowed");
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
  }, [router, roles, fallbackTo, guestPrompt]);

  if (phase === "guest") return <SignInPromptCard />;
  if (phase !== "allowed") return <Loading label={loading} />;
  return <>{children}</>;
}