"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useThemeCustom } from "@/lib/theme";
import { Palette, Sun, Moon, Monitor, Check, Sparkles, Eye } from "lucide-react";
import { toast } from "sonner";

const PRESET_COLORS = [
  { key: "blue", label: "Indigo", value: "#4338ca" },
  { key: "purple", label: "Purple", value: "#9333ea" },
  { key: "green", label: "Green", value: "#22c55e" },
  { key: "orange", label: "Orange", value: "#f59e0b" },
  { key: "red", label: "Red", value: "#ef4444" },
  { key: "teal", label: "Teal", value: "#06b6d4" },
  { key: "pink", label: "Pink", value: "#ec4899" },
  { key: "sky", label: "Sky", value: "#30AFFF" },
];

export default function ThemeCustomizationPage() {
  const { themeColor, themeMode, setThemeColor, setThemeMode, resolvedMode } = useThemeCustom();
  const [customHex, setCustomHex] = useState(themeColor.startsWith("#") ? themeColor : "#4338ca");

  const handleColor = async (color: string) => {
    try {
      await setThemeColor(color);
      toast.success(`Theme color changed to ${color}`);
    } catch {
      toast.error("Failed to save color");
    }
  };

  const handleMode = async (mode: "LIGHT" | "DARK" | "SYSTEM") => {
    try {
      await setThemeMode(mode);
      toast.success(`Theme mode: ${mode}`);
    } catch {
      toast.error("Failed to save mode");
    }
  };

  const isDark = resolvedMode === "dark";

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Palette className="size-3.5" /> Theme Customization
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Theme Customization</h1>
        <p className="text-sm text-muted-foreground">Personalize Tana Betting for your admin account. Saved per-admin in browser and database.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Mode */}
        <Card className="border-border bg-card shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {isDark ? <Moon className="size-5 text-primary" /> : <Sun className="size-5 text-secondary" />} Theme Mode
            </CardTitle>
            <CardDescription>Light / Dark / System. Dark uses deeper shades.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "LIGHT", label: "Day Mode", desc: "Bright, light background", icon: Sun },
              { key: "DARK", label: "Night Mode", desc: "Darker, eye-friendly", icon: Moon },
              { key: "SYSTEM", label: "System", desc: "Follow OS preference", icon: Monitor },
            ].map((m) => {
              const Icon = m.icon;
              const active = themeMode === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => handleMode(m.key as never)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${active ? "border-primary bg-primary/10 shadow-sm" : "border-border hover:bg-muted/50"}`}
                >
                  <div className={`grid size-9 place-items-center rounded-lg ${active ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold flex items-center gap-1">
                      {m.label} {active && <Check className="size-3 text-primary" />}
                    </div>
                    <div className="text-xs text-muted-foreground">{m.desc}</div>
                  </div>
                </button>
              );
            })}
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              Current: <span className="font-semibold text-foreground">{themeMode}</span> → <span className="font-mono">{resolvedMode}</span> {isDark ? "(darker colors active)" : "(light colors)"}
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card className="border-border bg-card shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-5 text-primary" /> Theme Color
            </CardTitle>
            <CardDescription>Main color of the system (primary buttons, sidebar, charts). Saved per admin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-xs tracking-widest">PRESET COLORS</Label>
              <div className="mt-2 grid grid-cols-4 gap-3 sm:grid-cols-8">
                {PRESET_COLORS.map((c) => {
                  const active = themeColor.toLowerCase() === c.value.toLowerCase() || themeColor.toLowerCase() === c.key;
                  return (
                    <button
                      key={c.key + c.value}
                      onClick={() => handleColor(c.value)}
                      className={`group relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition ${active ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/30 hover:bg-muted/30"}`}
                      title={c.label}
                    >
                      <span className="size-9 rounded-full shadow-inner border border-black/10" style={{ background: c.value }} />
                      <span className="text-[11px] font-medium">{c.label}</span>
                      {active && <Check className="absolute right-1 top-1 size-3 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-xs tracking-widest">CUSTOM HEX</Label>
              <div className="mt-2 flex items-center gap-2">
                <input type="color" value={customHex} onChange={(e) => setCustomHex(e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border border-border p-1" />
                <Input value={customHex} onChange={(e) => setCustomHex(e.target.value)} placeholder="#4338ca" className="flex-1 font-mono" />
                <Button onClick={() => handleColor(customHex)} className="bg-primary">
                  Apply
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Enter any hex like #30AFFF and click Apply. Saved to DB and browser.</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Current:</span>
              <span className="flex items-center gap-2 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-mono">
                <span className="size-3 rounded-full border border-black/10" style={{ background: themeColor }} /> {themeColor}
              </span>
              <Badge variant="outline" className={isDark ? "border-primary/20 bg-primary/10 text-primary" : "border-secondary/20 bg-secondary/10 text-secondary"}>
                {isDark ? "Night (darker)" : "Day"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="size-5 text-primary" /> Live Preview
          </CardTitle>
          <CardDescription>How the system looks with your selected color and mode.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`rounded-xl border p-4 ${isDark ? "bg-[#0a0f2e] border-white/10" : "bg-[#f5f3ff] border-border"}`}>
            <div className="flex flex-wrap gap-2">
              <Button className="bg-primary text-white">Primary Button</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Badge className="bg-primary text-white">Primary Badge</Badge>
              <Badge variant="secondary" className="bg-secondary text-white">Secondary</Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-card border border-border p-3">
                <div className="text-xs text-muted-foreground">Card</div>
                <div className="font-semibold">Sample Card</div>
              </div>
              <div className="rounded-lg bg-primary p-3 text-white">
                <div className="text-xs text-white/80">Primary</div>
                <div className="font-semibold">{themeColor}</div>
              </div>
              <div className={`rounded-lg p-3 ${isDark ? "bg-[#1e293b] text-white border border-white/10" : "bg-white border border-border"}`}>
                <div className="text-xs opacity-70">Mode</div>
                <div className="font-semibold">{resolvedMode} {isDark ? "(darker)" : ""}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
