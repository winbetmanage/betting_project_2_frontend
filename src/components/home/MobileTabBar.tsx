"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, Gamepad2, Ticket, Wallet } from "lucide-react";

const TABS = [
  { href: "/", labelKey: "home", icon: Home, exact: true },
  { href: "/games", labelKey: "games", icon: Gamepad2, exact: false },
  { href: "/my-bets", labelKey: "myBets", icon: Ticket, exact: false },
  { href: "/wallet", labelKey: "wallet", icon: Wallet, exact: false },
];

/**
 * Fixed bottom navigation for phones — the thumb-reachable pattern native apps
 * use. Desktop keeps the full sidebar + header links instead.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const tNav = useTranslations("nav");

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0a0f2e]/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-4">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className="flex flex-col items-center gap-1 py-2 transition active:scale-95"
            >
              <span
                className={`grid h-7 w-12 place-items-center rounded-full transition ${
                  active ? "bg-primary/20" : ""
                }`}
              >
                <tab.icon className={`size-5 ${active ? "text-primary-light" : "text-white/45"}`} />
              </span>
              <span
                className={`text-[10px] font-semibold leading-none ${
                  active ? "text-primary-light" : "text-white/45"
                }`}
              >
                {tNav(tab.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
