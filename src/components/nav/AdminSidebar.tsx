"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Trophy,
  Ticket,
  ShieldCheck,
  Users,
  Wallet,
  Settings,
  Globe,
  ArrowUpRight,
  CreditCard,
  Palette,
  Activity,
  Flag,
  UserCircle,
  Smartphone,
  Gift,
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
  { key: "dashboard", title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { key: "games", title: "Games", url: "/admin/games", icon: Trophy },
  { key: "bets", title: "Bets", url: "/admin/bets", icon: Ticket },
];

const manageItems = [
  { key: "active-games", title: "Active Games", url: "/admin/games/active", icon: Activity },
  { key: "ended-games", title: "Ended Games", url: "/admin/games/ended", icon: Flag },
  { key: "wallet", title: "Wallet", url: "/admin/wallet", icon: Wallet },
];

const usersItems = [
  { key: "users", title: "Users", url: "/admin/users", icon: Users },
  { key: "devices", title: "Devices Info", url: "/admin/users/devices", icon: Smartphone },
  { key: "referral-bonus", title: "Referral Bonus", url: "/admin/users/referral-bonus", icon: Gift },
];

// Returns which sidebar key is active given a pathname.
// Detail pages (/admin/games/<id>) count as "active-games".
function activeKeyFor(pathname: string): string {
  if (pathname === "/admin" || pathname === "/admin/") return "dashboard";
  if (pathname.startsWith("/admin/games/active")) return "active-games";
  if (pathname.startsWith("/admin/games/ended")) return "ended-games";
  if (/^\/admin\/games\/[^/]+$/.test(pathname)) return "active-games"; // game detail page
  if (pathname.startsWith("/admin/games")) return "games";
  if (pathname.startsWith("/admin/bets")) return "bets";
  if (pathname.startsWith("/admin/users/devices")) return "devices";
  if (pathname.startsWith("/admin/users/referral-bonus")) return "referral-bonus";
  if (pathname.startsWith("/admin/users")) return "users";
  if (pathname.startsWith("/admin/wallet")) return "wallet";
  if (pathname.startsWith("/admin/fetch-games/premier-league-results")) return "premier-league-results";
  if (pathname.startsWith("/admin/fetch-games/premier-league")) return "premier-league";
  if (pathname.startsWith("/admin/information/games-list")) return "games-list";
  if (pathname.startsWith("/admin/settings/theme")) return "theme";
  if (pathname.startsWith("/admin/settings/transfer-accounts")) return "transfer-accounts";
  if (pathname.startsWith("/admin/profile")) return "profile";
  return "dashboard";
}

export function AdminSidebar() {
  const pathname = usePathname();
  const user = getUser();
  const activeKey = activeKeyFor(pathname);

  const itemClass = (key: string) =>
    activeKey === key
      ? "bg-primary text-white hover:bg-primary hover:text-white shadow-md shadow-primary/20"
      : "text-white/70 hover:bg-white/5 hover:text-white";

  const dimItemClass = (key: string) =>
    activeKey === key
      ? "bg-primary text-white hover:bg-primary hover:text-white shadow-md shadow-primary/20"
      : "text-white/50 hover:bg-white/5 hover:text-white/80";

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
            <span className="text-[10px] font-semibold tracking-[0.15em] text-primary-light">ADMIN CONSOLE</span>
          </div>
          <ShieldCheck className="size-5 text-secondary shrink-0 group-data-[collapsible=icon]:hidden" />
        </div>

        {/* Admin profile card - clickable -> profile page */}
        <Link href="/admin/profile" className="mx-3 mb-3 block rounded-xl bg-gradient-to-br from-primary to-primary/70 p-3 text-white shadow-lg shadow-primary/20 transition hover:from-primary/90 hover:to-primary/60 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-white/20 text-sm font-black backdrop-blur">
              {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{user?.name ?? "Administrator"}</div>
              <div className="truncate text-xs text-white/70">{user?.email}</div>
            </div>
            <ArrowUpRight className="size-4 text-white/60" />
          </div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold backdrop-blur">
            <span className="size-1.5 rounded-full bg-secondary animate-pulse" />
            Live • Tana Betting
          </div>
        </Link>
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

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-widest text-white/40">MANAGEMENT</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {manageItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={activeKey === item.key}
                    tooltip={item.title}
                    className={dimItemClass(item.key)}
                  >
                    <item.icon className="size-4" />
                    <span className="flex-1 truncate">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-widest text-white/40">USER MANAGEMENT</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {usersItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={activeKey === item.key}
                    tooltip={item.title}
                    className={dimItemClass(item.key)}
                  >
                    <item.icon className="size-4" />
                    <span className="flex-1 truncate">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-widest text-white/40">FETCH GAMES</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/admin/fetch-games/premier-league" />}
                  isActive={activeKey === "premier-league"}
                  tooltip="Premier League"
                  className={itemClass("premier-league")}
                >
                  <Trophy className="size-4" />
                  <span>Premier League</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/admin/fetch-games/premier-league-results" />}
                  isActive={activeKey === "premier-league-results"}
                  tooltip="Premier League Results"
                  className={itemClass("premier-league-results")}
                >
                  <Trophy className="size-4" />
                  <span>Premier League Results</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-widest text-white/40">INFORMATION</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/admin/information/games-list" />}
                  isActive={activeKey === "games-list"}
                  tooltip="Games List"
                  className={itemClass("games-list")}
                >
                  <Trophy className="size-4" />
                  <span>Games List</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-widest text-white/40">SETTINGS</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/admin/settings/theme" />}
                  isActive={activeKey === "theme"}
                  tooltip="Theme Customization"
                  className={itemClass("theme")}
                >
                  <Palette className="size-4" />
                  <span>Theme Customization</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/admin/settings/transfer-accounts" />}
                  isActive={activeKey === "transfer-accounts"}
                  tooltip="Our Transfer Account"
                  className={itemClass("transfer-accounts")}
                >
                  <CreditCard className="size-4" />
                  <span>Our Transfer Account</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="General Settings" className="text-white/30 cursor-not-allowed opacity-60">
                  <Settings className="size-4" />
                  <span>General Settings</span>
                  <span className="ml-auto text-[10px] opacity-50 group-data-[collapsible=icon]:hidden">soon</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-widest text-white/40">SYSTEM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/admin/profile" />}
                  isActive={activeKey === "profile"}
                  tooltip="My Profile"
                  className={itemClass("profile")}
                >
                  <UserCircle className="size-4" />
                  <span>My Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/" />} tooltip="View Site" className="text-white/50 hover:bg-white/5 hover:text-white/80">
                  <Globe className="size-4" />
                  <span>View Site</span>
                  <ArrowUpRight className="ml-auto size-3 opacity-60 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 p-3 gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1.5">
          <div className="grid size-8 place-items-center rounded-full bg-primary text-xs font-bold text-white group-data-[collapsible=icon]:size-7">
            {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
            <div className="truncate text-xs font-medium">{user?.name ?? "Admin"}</div>
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
