"use client";

import { usePathname } from "next/navigation";
import UserNav from "@/components/nav/UserNav";
import { BetSlipProvider } from "@/components/bets/BetSlipProvider";
import { BetSlipPanel } from "@/components/bets/BetSlipPanel";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Home page "/" is public BETLAB-style dashboard - full width, light background
  if (pathname === "/") {
    return (
      <BetSlipProvider>
        <div className="min-h-dvh bg-background text-foreground">
          <UserNav />
          <main>{children}</main>
        </div>
        <BetSlipPanel />
      </BetSlipProvider>
    );
  }

  // Guests may browse freely (home, games, terms). Betting and wallet /
  // account pages carry their own RoleGate with an inline sign-in prompt,
  // so visitors are only asked to sign in when they act.
  return (
    <BetSlipProvider>
      <div className="min-h-dvh bg-brand-dark text-white">
        <UserNav />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </div>
      <BetSlipPanel />
    </BetSlipProvider>
  );
}
