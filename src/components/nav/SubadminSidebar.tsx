"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Landmark,
  Users,
  UserCog,
  User,
  ShieldCheck,
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
  useSidebar,
} from "@/components/ui/sidebar";

import { getUser } from "@/lib/auth";
import SignOutButton from "@/components/auth/SignOutButton";

const moneyItems = [
  { key: "dashboard", title: "Dashboard", url: "/subadmin", icon: LayoutDashboard },
  { key: "deposits", title: "Deposits", url: "/subadmin/deposits", icon: ArrowDownToLine },
  { key: "withdrawals", title: "Withdrawals", url: "/subadmin/withdrawals", icon: ArrowUpFromLine },
  { key: "transfer-accounts", title: "Transfer Accounts", url: "/subadmin/transfer-accounts", icon: Landmark },
];

const peopleItems = [
  { key: "users", title: "Users", url: "/subadmin/users", icon: Users },
  { key: "agents", title: "Agents", url: "/subadmin/agents", icon: UserCog },
];

const accountItems = [
  { key: "profile", title: "My Profile", url: "/subadmin/profile", icon: User },
];

function activeKeyFor(pathname: string): string {
  if (pathname === "/subadmin" || pathname === "/subadmin/") return "dashboard";
  if (pathname.startsWith("/subadmin/deposits")) return "deposits";
  if (pathname.startsWith("/subadmin/withdrawals")) return "withdrawals";
  if (pathname.startsWith("/subadmin/transfer-accounts")) return "transfer-accounts";
  if (pathname.startsWith("/subadmin/agents")) return "agents";
  if (pathname.startsWith("/subadmin/users")) return "users";
  if (pathname.startsWith("/subadmin/profile")) return "profile";
  return "dashboard";
}

export function SubadminSidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  useEffect(() => {
    setUser(getUser());
  }, [pathname]);
  const activeKey = activeKeyFor(pathname);
  const { isMobile, setOpenMobile } = useSidebar();

  const itemClass = (key: string) =>
    activeKey === key
      ? "bg-sky-500 text-white hover:bg-sky-500 hover:text-white shadow-md shadow-sky-500/20"
      : "text-white/70 hover:bg-white/5 hover:text-white";

  const renderItems = (items: typeof moneyItems) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.key}>
          <SidebarMenuButton
            render={<Link href={item.url} />}
            isActive={activeKey === item.key}
            tooltip={item.title}
            className={itemClass(item.key)}
            onClick={() => {
              if (isMobile) setOpenMobile(false);
            }}
          >
            <item.icon className="size-4" />
            <span>{item.title}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

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
            <span className="text-[10px] font-semibold tracking-[0.15em] text-sky-400">SUBADMIN CONSOLE</span>
          </div>
          <ShieldCheck className="size-5 text-sky-400 shrink-0 group-data-[collapsible=icon]:hidden" />
        </div>
        <SidebarSeparator className="mb-2 bg-white/10" />
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-widest text-white/40">MONEY MANAGEMENT</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(moneyItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-widest text-white/40">PEOPLE</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(peopleItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-widest text-white/40">MY ACCOUNT</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(accountItems)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 p-3 gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1.5">
          <div className="grid size-8 place-items-center rounded-full bg-sky-500 text-xs font-bold text-white group-data-[collapsible=icon]:size-7">
            {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "S"}
          </div>
          <div className="flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
            <div className="truncate text-xs font-medium">{user?.name ?? "Subadmin"}</div>
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
