"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Slugs actually present in public/assets/team_logos
const KNOWN_LOGO_SLUGS = [
  "arsenal",
  "aston-villa",
  "bournemouth",
  "brentford",
  "brighton-and-hove-albion",
  "chelsea",
  "coventry-city",
  "crystal-palace",
  "everton",
  "fulham",
  "hull-city",
  "ipswich-town",
  "leeds-united",
  "liverpool",
  "manchester-city",
  "manchester-united",
  "newcastle-united",
  "nottingham-forest",
  "sunderland",
  "tottenham-hotspur",
];

// Odds-api / football-data short names → logo file slug
const LOGO_ALIASES: Record<string, string> = {
  "man-city": "manchester-city",
  "man-cu": "manchester-city",
  "mancity": "manchester-city",
  "man-utd": "manchester-united",
  "man-united": "manchester-united",
  "manutd": "manchester-united",
  "man-united-fc": "manchester-united",
  "tottenham": "tottenham-hotspur",
  "spurs": "tottenham-hotspur",
  "newcastle": "newcastle-united",
  "nottingham": "nottingham-forest",
  "notts-forest": "nottingham-forest",
  "nottm-forest": "nottingham-forest",
  "brighton": "brighton-and-hove-albion",
  "brighton-hove": "brighton-and-hove-albion",
  "brighton-and-hove": "brighton-and-hove-albion",
  "brighton-hove-albion": "brighton-and-hove-albion",
  "brighton-albion": "brighton-and-hove-albion",
  "hove-albion": "brighton-and-hove-albion",
};

/** Resolve a team name (any source) to the logo file slug, or null when no file matches. */
export function resolveTeamLogoSlug(name: string): string | null {
  let n = normalizeName(name);
  if (!n) return null;
  n = n.replace(/-(fc|afc|cfc|cf|sc|fk)$/, "");
  if (KNOWN_LOGO_SLUGS.includes(n)) return n;
  if (LOGO_ALIASES[n] && KNOWN_LOGO_SLUGS.includes(LOGO_ALIASES[n])) return LOGO_ALIASES[n];
  // unique prefix match: "nottingham" → nottingham-forest, "ipswich" → ipswich-town
  const hits = KNOWN_LOGO_SLUGS.filter((slug) => slug.startsWith(`${n}-`) || n.startsWith(`${slug}-`));
  if (hits.length === 1) return hits[0];
  return null;
}

export function teamLogoPath(name: string | null | undefined, ext: "png" | "svg" = "svg"): string {
  if (!name) return "";
  const slug = resolveTeamLogoSlug(name);
  return `/assets/team_logos/${slug ?? normalizeName(name)}.${ext}`;
}

export function countryFlagPath(country: string | null | undefined): string {
  if (!country) return "";
  return `/assets/country_flags/${normalizeName(country)}.png`;
}

export function LeagueLogo({
  league,
  className,
}: {
  league: string | null | undefined;
  className?: string;
}) {
  const [error, setError] = useState(false);
  const name = league ?? "";
  const isEpl = name.toLowerCase().includes("premier") || name.toLowerCase().includes("epl");
  if (!isEpl || error) return null;
  return (
    <div className={cn("relative shrink-0", className)}>
      <img
        src="/assets/genenral_logos/premier-league.svg"
        alt={league ?? "Premier League"}
        onError={() => setError(true)}
        className="size-full object-contain"
      />
    </div>
  );
}

export function TeamLogo({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const normalized = normalizeName(name ?? "");
  // Prefer SVG (we ship .svg crests), fall back to PNG then to a letter badge
  const [fallback, setFallback] = useState<"svg" | "png" | "letter">("svg");

  const onError = useCallback(() => {
    setFallback((prev) => (prev === "svg" ? "png" : "letter"));
  }, []);

  if (!name || fallback === "letter") {
    const initials = (() => {
      if (!name) return "?";
      const parts = name.split(/[\s-]+/);
      if (parts.length >= 2 && parts[0].length <= 3) return (parts[0][0] + parts[1][0]).toUpperCase();
      return name.substring(0, 2).toUpperCase();
    })();
    return (
      <div
        className={cn(
          "grid shrink-0 place-items-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground",
          className
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <div className={cn("relative shrink-0", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${teamLogoPath(name, fallback as "png" | "svg")}?v=2`}
        alt={name}
        onError={onError}
        className="size-full rounded-full bg-white object-contain p-0.5"
      />
    </div>
  );
}