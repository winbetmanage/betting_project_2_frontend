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

export function teamLogoPath(name: string | null | undefined, ext: "png" | "svg" = "svg"): string {
  if (!name) return "";
  return `/assets/team_logos/${normalizeName(name)}.${ext}`;
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