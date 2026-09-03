"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "@/components/auth/SignOutButton";
import { getUser, getUserRole } from "@/lib/auth";

export default function AdminNav() {
  const pathname = usePathname();
  const user = getUser();
  const role = user?.role ?? getUserRole();

  const links = [
    { href: "/admin", label: "Dashboard", exact: true },
    { href: "/admin/games", label: "Games", exact: false },
    { href: "/admin/bets", label: "Bets", exact: false },
  ];

  const isActive = (link: { href: string; exact: boolean }) =>
    link.exact ? pathname === link.href : pathname.startsWith(link.href);

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-brand-dark">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <nav className="flex items-center gap-5">
          <Link href="/admin" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/website_images/logoone.png"
              alt="Tana Betting"
              className="h-9 w-auto object-contain drop-shadow-md"
            />
            <span className="hidden text-sm font-bold tracking-wide sm:block">TANA BETTING</span>
            <span className="rounded-md bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-widest text-primary-light">
              ADMIN
            </span>
          </Link>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm ${isActive(link) ? "font-semibold text-primary-light" : "text-white/70 hover:text-white"}`}
            >
              {link.label}
            </Link>
          ))}
          {role === "ADMIN" && (
            <Link
              href="/"
              className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/70 hover:bg-white/10"
            >
              View site
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-primary/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary-light">
            ADMIN
          </span>
          <span className="hidden text-sm text-white/60 sm:block">{user?.email}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}