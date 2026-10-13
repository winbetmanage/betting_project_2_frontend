"use client";

import { Search, X } from "lucide-react";

/**
 * The five big leagues + Champions League, with logos. Used to filter the game
 * lists on the user side by category (EPL, La Liga, Serie A, Ligue 1,
 * Bundesliga, Champions League). `match` tokens are compared against the
 * competition name (case-insensitive substring).
 */
export type LeagueCategory = {
  id: string;
  label: string;
  short: string;
  logo: string;
  match: string[];
};

export const LEAGUE_CATEGORIES: LeagueCategory[] = [
  { id: "epl", label: "English Premier League", short: "EPL", logo: "/assets/genenral_logos/premier-league.svg", match: ["premier", "epl"] },
  { id: "champions", label: "UEFA Champions League", short: "Champions", logo: "/assets/genenral_logos/champions-league.svg", match: ["champions"] },
  { id: "fa-cup", label: "FA Cup", short: "FA Cup", logo: "/assets/genenral_logos/fa-cup.svg", match: ["fa cup"] },
  { id: "efl-cup", label: "EFL Cup", short: "EFL Cup", logo: "/assets/genenral_logos/efl-cup.svg", match: ["efl cup", "league cup"] },
  { id: "laliga", label: "Spain LaLiga", short: "LaLiga", logo: "/assets/team_logos/league-la-liga.svg", match: ["la liga", "laliga"] },
  { id: "serie-a", label: "Italian Serie A", short: "Serie A", logo: "/assets/team_logos/league-serie-a.svg", match: ["serie a", "serie-a"] },
  { id: "bundesliga", label: "Bundesliga", short: "Bundesliga", logo: "/assets/team_logos/league-bundesliga.svg", match: ["bundesliga"] },
  { id: "ligue-1", label: "France Ligue 1", short: "Ligue 1", logo: "/assets/team_logos/league-ligue-1.svg", match: ["ligue 1", "ligue-1", "ligue"] },
];

/** True when a competition name belongs to the given league category. */
export function competitionInCategory(competitionName: string | null | undefined, categoryId: string): boolean {
  const cat = LEAGUE_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return true;
  const name = (competitionName ?? "").toLowerCase();
  return cat.match.some((m) => name.includes(m));
}

export type LeagueFilterBarProps = {
  /** Currently selected category id, or null for "All". */
  active: string | null;
  onActiveChange: (id: string | null) => void;
  /** Free-text search string (club/team name). */
  search: string;
  onSearchChange: (value: string) => void;
  /** Optional counts per category id, and total for "All". */
  counts?: Record<string, number>;
  allCount?: number;
  /** Which leagues to show (defaults to all). */
  categories?: LeagueCategory[];
  /** Hide categories that currently have 0 games (needs `counts`). */
  hideEmpty?: boolean;
  className?: string;
};

/**
 * Reusable category (league logo) + club-name search bar for the user side.
 */
export function LeagueFilterBar({
  active,
  onActiveChange,
  search,
  onSearchChange,
  counts,
  allCount,
  categories = LEAGUE_CATEGORIES,
  hideEmpty = false,
  className,
}: LeagueFilterBarProps) {
  const visible = hideEmpty && counts ? categories.filter((c) => c.id === active || (counts[c.id] ?? 0) > 0) : categories;
  return (
    <div className={className}>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by club name (e.g. Arsenal, Bayern, Sporting)…"
          className="w-full rounded-xl border border-[#e2e8f0] bg-white py-2.5 pl-9 pr-9 text-sm text-[#0f172a] shadow-sm outline-none transition focus:border-[#3b82f6]"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-[#eef2f7] text-[#64748b] hover:bg-[#e2e8f0]"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* League chips — centred, wrapping onto as many lines as needed, never scroll sideways */}
      <div className="mt-2.5 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => onActiveChange(null)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition active:scale-95 ${
            active === null ? "border-[#3b82f6] bg-[#3b82f6] text-white shadow-sm" : "border-[#e2e8f0] bg-white text-[#334155] hover:border-[#cbd5e1]"
          }`}
        >
          All games
          {typeof allCount === "number" && (
            <span className={`rounded-full px-1.5 text-[10px] ${active === null ? "bg-white/25" : "bg-[#eef2f7] text-[#64748b]"}`}>{allCount}</span>
          )}
        </button>
        {visible.map((cat) => {
          const isActive = active === cat.id;
          const count = counts?.[cat.id];
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onActiveChange(isActive ? null : cat.id)}
              title={cat.label}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border py-1.5 pl-1.5 pr-3.5 text-xs font-semibold transition active:scale-95 ${
                isActive ? "border-[#3b82f6] bg-[#eff6ff] text-[#1d4ed8] shadow-sm" : "border-[#e2e8f0] bg-white text-[#334155] hover:border-[#cbd5e1]"
              }`}
            >
              <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-[#e2e8f0]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cat.logo} alt={cat.label} className="size-4 object-contain" />
              </span>
              <span className="whitespace-nowrap">{cat.short}</span>
              {typeof count === "number" && (
                <span className={`rounded-full px-1.5 text-[10px] ${isActive ? "bg-[#dbeafe] text-[#1d4ed8]" : "bg-[#eef2f7] text-[#64748b]"}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}