"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "@/components/auth/SignOutButton";
import { getUser, getUserRole, isAuthenticated, getAccessToken } from "@/lib/auth";
import { homePathForRole, isSubAdminRole } from "@/lib/roles";
import { api } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserCircle, Wallet, ChevronDown } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/admin/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslations } from "next-intl";
import MobileMenu from "./MobileMenu";

export default function UserNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [role, setRole] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  const loadBalance = () => {
    const token = getAccessToken();
    if (!token) return;
    api.get<{ data: { balance: number | string } }>("/wallet/balance", token)
      .then((r) => setBalance(Number(r.data.balance)))
      .catch(() => {});
  };

  useEffect(() => {
    const sync = () => {
      const u = getUser();
      setUser(u);
      setRole(u?.role ?? getUserRole());
      setAuthed(isAuthenticated());
      if (isAuthenticated()) loadBalance();
      else setBalance(null);
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, [pathname]);

  const links = [
    { href: "/", label: t("home") },
    { href: "/games", label: t("games") },
    { href: "/my-bets", label: t("myBets") },
    { href: "/wallet", label: t("wallet") },
    { href: "#", label: t("news") },
    { href: "#", label: t("contact") },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0f2e]">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-2.5">
        <nav className="flex items-center gap-6">
          <MobileMenu user={user} role={role} authed={authed} balance={balance} />
          <Link href={homePathForRole(role)} className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/website_images/logoone.png"
              alt="Tana Betting"
              className="h-8 w-auto object-contain brightness-110"
            />
            <span className="hidden text-sm font-black tracking-wide text-white sm:block">TANA BETTING</span>
          </Link>
          <div className="hidden items-center gap-5 md:flex">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={`text-xs font-medium tracking-wide ${pathname === link.href ? "text-white" : "text-white/60 hover:text-white"}`}
              >
                {link.label}
              </Link>
            ))}
            {role === "ADMIN" && (
              <Link
                href="/admin"
                className={`rounded-md border border-primary/40 px-2.5 py-1 text-xs font-medium ${pathname.startsWith("/admin") ? "bg-primary text-white" : "text-primary-light hover:bg-primary/10"}`}
              >
                {t("admin")}
              </Link>
            )}
            {role === "AGENT" && (
              <Link
                href="/agent"
                className={`rounded-md border border-amber-500/40 px-2.5 py-1 text-xs font-medium ${pathname.startsWith("/agent") ? "bg-amber-500 text-white" : "text-amber-400 hover:bg-amber-500/10"}`}
              >
                {t("agent")}
              </Link>
            )}
            {isSubAdminRole(role) && (
              <Link
                href="/subadmin"
                className={`rounded-md border border-sky-500/40 px-2.5 py-1 text-xs font-medium ${pathname.startsWith("/subadmin") ? "bg-sky-500 text-white" : "text-sky-400 hover:bg-sky-500/10"}`}
              >
                Subadmin
              </Link>
            )}
            {authed && (
              <Link
                href="/profile"
                className={`rounded-md border border-primary/40 px-2.5 py-1 text-xs font-medium ${pathname.startsWith("/profile") ? "bg-primary text-white" : "text-primary-light hover:bg-primary/10"}`}
              >
                {t("profile")}
              </Link>
            )}
          </div>
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <div className="hidden items-center gap-1 text-xs text-white/70 sm:flex">
            <span>{t("decimalOdds")}</span>
            <svg className="size-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
          <div className="hidden sm:flex">
            <LanguageSwitcher />
          </div>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          {authed ? (
            <>
              <NotificationBell scope="user" allHref="/notifications" />
              <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 transition hover:bg-white/10">
                    <div className="grid size-7 place-items-center rounded-full bg-primary text-xs font-bold text-white">
                      {user?.email?.[0]?.toUpperCase() ?? "T"}
                    </div>
                    <span className="hidden text-xs text-white/70 sm:block">{balance !== null ? `ETB ${balance.toFixed(2)}` : "—"}</span>
                    <ChevronDown className="size-3 text-white/40" />
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="w-56 bg-card border-white/10">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex items-center gap-2 text-xs">
                    <UserCircle className="size-4 text-primary" />
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{user?.name || user?.email}</span>
                      <span className="font-normal text-muted-foreground">{user?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-white/10" />
                <div className="flex items-center gap-2 px-3 py-2 text-xs">
                  <Wallet className="size-4 text-secondary" />
                  <span className="text-muted-foreground">{t("balance")}</span>
                  <span className="ml-auto font-bold text-foreground">{balance !== null ? `ETB ${balance.toFixed(2)}` : "—"}</span>
                </div>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem render={<Link href="/profile" className="flex items-center gap-2 w-full" />} className="cursor-pointer">
                  <UserCircle className="size-4" />
                  {t("myProfile")}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <div className="px-2 py-1">
                  <SignOutButton />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                {t("login")}
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90"
              >
                {t("signup")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}