import RoleGate from "@/components/auth/RoleGate";
import { SubadminSidebar } from "@/components/nav/SubadminSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/admin/ThemeToggle";
import { ResponsiveTables } from "@/components/admin/ResponsiveTables";

export const metadata = { title: "Subadmin · Tana Betting" };

export default function SubadminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate roles={["SUBADMIN", "ADMIN"]} fallbackTo="/" loading="Checking subadmin access...">
      <SidebarProvider
        style={
          {
            "--sidebar-width": "16rem",
            "--sidebar-width-icon": "3.2rem",
          } as React.CSSProperties
        }
      >
        <SubadminSidebar />
        <SidebarInset className="bg-background">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-white/10 bg-[#0a0f2e] px-4">
            <SidebarTrigger className="-ml-1 text-white/70 hover:bg-white/10 hover:text-white" />
            <Separator orientation="vertical" className="mr-2 h-4 bg-white/10" />
            <div className="flex items-center gap-2 text-sm">
              <span className="hidden font-medium text-white/90 sm:inline">Tana Betting</span>
              <span className="hidden text-white/20 sm:inline">/</span>
              <span className="rounded-md bg-sky-500 px-2 py-0.5 text-xs font-semibold tracking-wide text-white">SUBADMIN</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <span className="hidden text-xs text-white/40 sm:inline">Press ⌘B to toggle</span>
            </div>
          </header>
          <div className="flex flex-1 flex-col">
            <ResponsiveTables>
              <div className="subadmin-shell mx-auto w-full max-w-6xl p-3 sm:p-5 lg:p-8">{children}</div>
            </ResponsiveTables>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </RoleGate>
  );
}
