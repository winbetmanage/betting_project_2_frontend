"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { getUser } from "@/lib/auth";
import { homePathForRole, isAdminRole, isSubAdminRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ShieldCheck } from "lucide-react";

const DASHBOARD_NAME: Record<string, string> = {
  ADMIN: "Admin Dashboard",
  AGENT: "Agent Dashboard",
};

/**
 * Slim persistent banner on every user-side page, shown only when the signed-in
 * account is staff (admin / agent / sub-admin). Browsing is allowed, but
 * betting and wallet actions are disabled on staff accounts — the banner
 * points each role at its own dashboard.
 */
export function StaffBrowseBanner() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setRole(getUser()?.role ?? null);
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, [pathname]);

  if (!role || role === "USER") return null;
  const href = homePathForRole(role);
  if (href === "/") return null;
  const label = isAdminRole(role) ? DASHBOARD_NAME.ADMIN : role === "AGENT" ? DASHBOARD_NAME.AGENT : "Subadmin Dashboard";
  const shownRole = isSubAdminRole(role) ? "SUBADMIN" : role;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 px-4 py-2">
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-200">
          <ShieldCheck className="size-4 shrink-0" />
          <span className="truncate">{t("staffBrowsingAs", { role: shownRole })}</span>
        </span>
        <Button
          size="sm"
          render={<Link href={href} />}
          nativeButton={false}
          className="ml-auto h-7 bg-amber-500 text-xs font-bold text-black hover:bg-amber-400"
        >
          <LayoutDashboard className="size-3.5" /> {t("openDashboard", { dashboard: label })}
        </Button>
      </div>
    </div>
  );
}

export default StaffBrowseBanner;
