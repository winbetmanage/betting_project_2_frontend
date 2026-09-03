"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeCustom } from "@/lib/theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { themeMode, setThemeMode, resolvedMode } = useThemeCustom();

  const currentIcon =
    themeMode === "LIGHT" ? <Sun className="size-4" /> : themeMode === "DARK" ? <Moon className="size-4" /> : <Monitor className="size-4" />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="text-white/70 hover:bg-white/10 hover:text-white border border-white/10">
            {currentIcon}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Theme Mode — {resolvedMode} {resolvedMode === "dark" ? "(darker)" : ""}</div>
        <DropdownMenuItem onClick={() => setThemeMode("LIGHT")} className={themeMode === "LIGHT" ? "bg-primary/10 text-primary" : ""}>
          <Sun className="size-4" /> Day Mode
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setThemeMode("DARK")} className={themeMode === "DARK" ? "bg-primary/10 text-primary" : ""}>
          <Moon className="size-4" /> Night Mode
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setThemeMode("SYSTEM")} className={themeMode === "SYSTEM" ? "bg-primary/10 text-primary" : ""}>
          <Monitor className="size-4" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
