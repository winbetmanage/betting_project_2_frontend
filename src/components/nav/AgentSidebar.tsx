"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Link2,
  Users,
  Bell,
  Briefcase,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

import { getUser } from "@/lib/auth";
import SignOutButton from "@/components/auth/SignOutButton";

const mainItems = [
  { key: "dashboard", title: "Dashboard", url: "/agent", icon: LayoutDashboard },
  { key: "referral-link", title: "Referral Link", url: "/agent#referral-link", icon: Link2 },
  { key: "referred-users", title: "Referred Users", url: "/agent#referred-users", icon: Users },
  { key: "activity", title: "Activity", url: "/agent/activity", icon: Bell },
];

export function AgentSidebar() {
  const pathname = usePathname();
  const user = getUser();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const sync = () => setHash(window.location.hash.replace("#", ""));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  const activeKey =
    pathname === "/agent" || pathname === "/agent/"
      ? (hash && hash !== "dashboard" ? hash : "dashboard")
      : pathname.startsWith("/agent/activity")
        ? "activity"
        : "dashboard";

  const itemClass = (key: string) =>
    activeKey === key
      ? "bg-amber-500 text-white hover:bg-amber-500 hover:text-white shadow-md shadow-amber-500/20"
      : "text-white/70 hover:bg-white/5 hover:text-white";

  return (
    <Sidebar collapsible="icon" className="border-white/10">
      <SidebarHeader className="gap-0 p-0">
        <div className="flex items-center gap-3 px-3 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/website_images/logoone.png"
            alt="Tana Betting"
            className="h-9 w-9 rounded-xl bg-white p-1.5 shadow-md object-contain"
          />
          <div className="flex flex-1 flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold tracking-wide leading-none">TANA BETTING</span>
            <span className="text-[10px] font-semibold tracking-[0.15em] text-amber-400">AGENT CONSOLE</span>
          </div>
          <Briefcase className="size-5 text-amber-400 shrink-0 group-data-[collapsible=icon]:hidden" />
        </div>

        {/* Agent profile card */}
        <div className="mx-3 mb-3 block rounded-xl bg-gradient-to-br from-amber-500 to-amber-500/70 p-3 text-white shadow-lg shadow-amber-500/20 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-white/20 text-sm font-black backdrop-blur">
              {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{user?.name ?? "Agent"}</div>
              <div className="truncate text-xs text-white/70">{user?.email}</div>
            </div>
          </div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold backdrop-blur">
            <span className="size-1.5 rounded-full bg-white animate-pulse" />
            Agent • Tana Betting
          </div>
        </div>
        <SidebarSeparator className="mb-2 bg-white/10" />
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-widest text-white/40">OVERVIEW</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={activeKey === item.key}
                    tooltip={item.title}
                    className={itemClass(item.key)}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 p-3 gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1.5">
          <div className="grid size-8 place-items-center rounded-full bg-amber-500 text-xs font-bold text-white group-data-[collapsible=icon]:size-7">
            {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
            <div className="truncate text-xs font-medium">{user?.name ?? "Agent"}</div>
            <div className="truncate text-[10px] text-white/50">{user?.email}</div>
          </div>
        </div>
        <div className="group-data-[collapsible=icon]:hidden">
          <SignOutButton />
        </div>
        <div className="hidden group-data-[collapsible=icon]:flex justify-center">
          <SignOutButton />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
