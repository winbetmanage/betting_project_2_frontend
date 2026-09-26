"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAccessToken, getUser } from "@/lib/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDownToLine, ArrowUpFromLine, Users, ShieldCheck, ArrowUpRight } from "lucide-react";

type FundRequest = { id: string; type: string; status: string };

export default function SubadminDashboard() {
  const [user] = useState(() => getUser());
  const [counts, setCounts] = useState({ deposits: 0, withdrawals: 0, users: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = getAccessToken();
    if (!t) return;
    setLoading(true);
    Promise.all([
      api.get<{ data: FundRequest[] }>("/funds/admin/requests?status=PENDING", t).then((r) => r.data ?? []).catch(() => []),
      api.get<{ data: unknown[]; total?: number }>("/users?limit=1", t).then((r) => r.total ?? (r.data ?? []).length).catch(() => 0),
    ])
      .then(([reqs, userTotal]) => {
        setCounts({
          deposits: reqs.filter((r) => r.type === "DEPOSIT").length,
          withdrawals: reqs.filter((r) => r.type === "WITHDRAWAL").length,
          users: typeof userTotal === "number" ? userTotal : 0,
        });
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { href: "/subadmin/deposits", label: "Pending deposits", value: counts.deposits, icon: ArrowDownToLine, bg: "bg-secondary/15 text-secondary" },
    { href: "/subadmin/withdrawals", label: "Pending withdrawals", value: counts.withdrawals, icon: ArrowUpFromLine, bg: "bg-sky-500/15 text-sky-500" },
    { href: "/subadmin/users", label: "Users", value: counts.users, icon: Users, bg: "bg-primary/15 text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-600 via-sky-700 to-[#0a0f2e] p-6 text-white shadow-xl">
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <ShieldCheck className="size-3.5" /> Subadmin console
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome{user?.name ? `, ${user.name}` : ""}
            </h1>
            <p className="mt-1 max-w-lg text-sm text-white/80">
              Money management: approve deposits and withdrawals, manage transfer accounts, and view user details. Every action is logged under your account.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.href} href={c.href} className="group">
              <Card className="border-border bg-card transition hover:border-sky-500/40 hover:shadow-lg">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1.5 text-xs tracking-widest">
                    <c.icon className="size-3.5" /> {c.label.toUpperCase()}
                  </CardDescription>
                  <CardTitle className="text-3xl font-bold">{c.value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-xs font-medium text-sky-500">
                    Open <ArrowUpRight className="size-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">What you can do</CardTitle>
          <CardDescription>Actions are attributed to {user?.email ?? "your account"} in the admin activity log.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {[
            { href: "/subadmin/deposits", label: "Review deposits", desc: "Approve or reject with a reason" },
            { href: "/subadmin/withdrawals", label: "Review withdrawals", desc: "Approve with payout proof, or reject" },
            { href: "/subadmin/transfer-accounts", label: "Transfer accounts", desc: "Add, edit or remove bank accounts" },
            { href: "/subadmin/users", label: "Users & agents", desc: "Search accounts and view full details" },
          ].map((a) => (
            <Button key={a.href} variant="outline" render={<Link href={a.href} />} nativeButton={false} className="h-auto justify-start gap-2.5 px-3 py-2.5">
              <span className="min-w-0 text-left">
                <span className="block text-sm font-semibold">{a.label}</span>
                <span className="block truncate text-[10px] text-muted-foreground">{a.desc}</span>
              </span>
            </Button>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">Heads up</Badge>
        Settings, games, bets and role changes stay with the main admin.
      </div>
    </div>
  );
}
