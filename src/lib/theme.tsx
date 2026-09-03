"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useTheme as useNextTheme } from "next-themes";
import { getUser, getAccessToken } from "@/lib/auth";
import { api } from "@/lib/api";

type ThemeMode = "LIGHT" | "DARK" | "SYSTEM";

const THEME_COLORS: Record<string, { light: string; dark: string; label: string }> = {
  blue: { light: "#4338ca", dark: "#3730a3", label: "Indigo" },
  indigo: { light: "#4338ca", dark: "#3730a3", label: "Indigo" },
  purple: { light: "#9333ea", dark: "#7e22ce", label: "Purple" },
  green: { light: "#22c55e", dark: "#15803d", label: "Green" },
  orange: { light: "#f59e0b", dark: "#b45309", label: "Orange" },
  red: { light: "#ef4444", dark: "#b91c1c", label: "Red" },
  teal: { light: "#06b6d4", dark: "#0e7490", label: "Teal" },
  pink: { light: "#ec4899", dark: "#be185d", label: "Pink" },
  "#4338ca": { light: "#4338ca", dark: "#3730a3", label: "Indigo" },
  "#30AFFF": { light: "#30AFFF", dark: "#0284c7", label: "Sky" },
  "#22c55e": { light: "#22c55e", dark: "#15803d", label: "Green" },
  "#f59e0b": { light: "#f59e0b", dark: "#b45309", label: "Orange" },
};

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function darken(hex: string, amount = 0.2): string {
  try {
    const { r, g, b } = hexToRgb(hex);
    const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 - amount))));
    return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
  } catch {
    return hex;
  }
}

function resolveColor(input: string, isDark: boolean): string {
  const key = input.toLowerCase();
  const preset = THEME_COLORS[key] || THEME_COLORS[input];
  if (preset) return isDark ? preset.dark : preset.light;
  // if hex
  if (input.startsWith("#")) return isDark ? darken(input, 0.15) : input;
  return isDark ? darken(input, 0.15) : input;
}

type ThemeContextType = {
  themeMode: ThemeMode;
  themeColor: string;
  setThemeMode: (mode: ThemeMode) => void;
  setThemeColor: (color: string) => void;
  resolvedMode: "light" | "dark";
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useThemeCustom() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeCustom must be used within ThemeCustomProvider");
  return ctx;
}

export function ThemeCustomProvider({ children }: { children: React.ReactNode }) {
  const { setTheme: setNextTheme, resolvedTheme } = useNextTheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("SYSTEM");
  const [themeColor, setThemeColorState] = useState<string>("blue");
  const [mounted, setMounted] = useState(false);

  const getStorageKey = useCallback((key: string) => {
    const user = getUser();
    const uid = user?.id ? `_${user.id}` : "";
    return `tana_theme_${key}${uid}`;
  }, []);

  const applyColor = useCallback((color: string, mode: ThemeMode) => {
    const effectiveDark = mode === "DARK" ? true : mode === "LIGHT" ? false : resolvedTheme === "dark";
    const resolved = resolveColor(color, !!effectiveDark);
    const light = resolveColor(color, false);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.style.setProperty("--primary", resolved);
      root.style.setProperty("--ring", resolved);
      root.style.setProperty("--sidebar-primary", resolved);
      root.style.setProperty("--chart-1", resolved);
      root.style.setProperty("--color-primary", resolved);
      root.style.setProperty("--color-brand-purple", light);
    }
  }, [resolvedTheme]);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    // next-themes expects "light" | "dark" | "system"
    const nextMode = mode.toLowerCase() as "light" | "dark" | "system";
    setNextTheme(nextMode);
    const user = getUser();
    if (user) {
      localStorage.setItem(getStorageKey("mode"), mode);
      localStorage.setItem(`tana_theme_mode_${user.id}`, mode);
      localStorage.setItem("tana_theme_mode", mode);
    } else {
      localStorage.setItem("tana_theme_mode", mode);
    }
    // save to DB
    const token = getAccessToken();
    if (token) {
      try {
        await api.patch("/users/me", { themeMode: mode }, token);
        // update cached user
        const u = getUser();
        if (u) {
          u.themeMode = mode;
          localStorage.setItem("user", JSON.stringify(u));
        }
      } catch {}
    }
    // re-apply color with new mode
    applyColor(themeColor, mode);
  }, [getStorageKey, themeColor, applyColor, setNextTheme]);

  const setThemeColor = useCallback(async (color: string) => {
    setThemeColorState(color);
    const user = getUser();
    if (user) {
      localStorage.setItem(getStorageKey("color"), color);
      localStorage.setItem(`tana_theme_color_${user.id}`, color);
      localStorage.setItem("tana_theme_color", color);
    } else {
      localStorage.setItem("tana_theme_color", color);
    }
    applyColor(color, themeMode);
    const token = getAccessToken();
    if (token) {
      try {
        await api.patch("/users/me", { themeColor: color }, token);
        const u = getUser();
        if (u) {
          (u as unknown as Record<string, unknown>).themeColor = color;
          localStorage.setItem("user", JSON.stringify(u));
        }
      } catch {}
    }
  }, [getStorageKey, themeMode, applyColor]);

  // Initial load
  useEffect(() => {
    setMounted(true);
    const user = getUser();
    // try per-user, then generic, then DB user, then default
    const storedMode =
      (user && localStorage.getItem(`tana_theme_mode_${user.id}`)) ||
      localStorage.getItem(getStorageKey("mode")) ||
      localStorage.getItem("tana_theme_mode") ||
      (user as unknown as { themeMode?: string })?.themeMode ||
      "SYSTEM";
    const storedColor =
      (user && localStorage.getItem(`tana_theme_color_${user.id}`)) ||
      localStorage.getItem(getStorageKey("color")) ||
      localStorage.getItem("tana_theme_color") ||
      (user as unknown as { themeColor?: string })?.themeColor ||
      "blue";

    const mode = (String(storedMode).toUpperCase() as ThemeMode) || "SYSTEM";
    setThemeModeState(mode);
    setThemeColorState(storedColor);
    setNextTheme(mode.toLowerCase() as never);
    applyColor(storedColor, mode);

    // also fetch from DB to sync
    const token = getAccessToken();
    if (token) {
      api
        .get<{ data: { themeMode?: string; themeColor?: string } }>("/users/me", token)
        .then((res) => {
          const dbMode = res.data.themeMode as ThemeMode | undefined;
          const dbColor = res.data.themeColor as string | undefined;
          if (dbMode && dbMode !== mode) {
            setThemeModeState(dbMode);
            setNextTheme(dbMode.toLowerCase() as never);
            localStorage.setItem(getStorageKey("mode"), dbMode);
            if (user) localStorage.setItem(`tana_theme_mode_${user.id}`, dbMode);
            applyColor(dbColor ?? storedColor, dbMode);
          }
          if (dbColor && dbColor !== storedColor) {
            setThemeColorState(dbColor);
            localStorage.setItem(getStorageKey("color"), dbColor);
            if (user) localStorage.setItem(`tana_theme_color_${user.id}`, dbColor);
            applyColor(dbColor, dbMode ?? mode);
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // re-apply when resolvedTheme changes (for SYSTEM)
  useEffect(() => {
    if (mounted) applyColor(themeColor, themeMode);
  }, [resolvedTheme, themeColor, themeMode, mounted, applyColor]);

  const resolvedMode = (themeMode === "SYSTEM" ? (resolvedTheme as "light" | "dark") ?? "dark" : themeMode === "DARK" ? "dark" : "light") as "light" | "dark";

  return (
    <ThemeContext.Provider value={{ themeMode, themeColor, setThemeMode, setThemeColor, resolvedMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
