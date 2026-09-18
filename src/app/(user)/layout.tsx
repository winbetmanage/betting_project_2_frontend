"use client";

import { usePathname } from "next/navigation";
import RoleGate from "@/components/auth/RoleGate";
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

  return (
    <RoleGate roles={["USER", "ADMIN"]} fallbackTo="/" loading="Checking your session...">
      <BetSlipProvider>
        <div className="min-h-dvh bg-brand-dark text-white">
          <UserNav />
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </div>
        <BetSlipPanel />
      </BetSlipProvider>
    </RoleGate>
  );
}
