"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { WIKIMEDIA_LOGO_BY_CLUB, GENERIC_CLUB_LOGO } from "@/lib/wikimediaClubLogos";

// Fold common Latin diacritics so "Fenerbahçe" → "fenerbahce", "Bodø/Glimt" → "bodo-glimt",
// "ŠK Slovan Bratislava" → "sk-slovan-bratislava".
const DIACRITICS: Record<string, string> = {
  à: "a", á: "a", â: "a", ã: "a", ä: "a", å: "a", ā: "a", ă: "a", ą: "a",
  è: "e", é: "e", ê: "e", ë: "e", ē: "e", ě: "e", ę: "e",
  ì: "i", í: "i", î: "i", ï: "i", ī: "i", į: "i",
  ò: "o", ó: "o", ô: "o", õ: "o", ö: "o", ø: "o", ō: "o", ő: "o",
  ù: "u", ú: "u", û: "u", ü: "u", ū: "u", ů: "u", ű: "u",
  ñ: "n", ç: "c", ß: "ss", æ: "ae", œ: "oe",
  š: "s", ś: "s", ş: "s", ș: "s",
  ž: "z", ź: "z", ż: "z",
  č: "c", ć: "c",
  ď: "d", đ: "d",
  ř: "r", ĺ: "l", ľ: "l", ł: "l", ń: "n", ť: "t", ý: "y", ÿ: "y", ğ: "g", ı: "i",
};

function foldDiacritics(name: string): string {
  return name
    .toLowerCase()
    .split("")
    .map((c) => DIACRITICS[c] ?? c)
    .join("");
}

function normalizeName(name: string): string {
  return foldDiacritics(name)
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
  // La Liga
  "alaves",
  "athletic-bilbao",
  "atletico-madrid",
  "barcelona",
  "celta-vigo",
  "deportivo-la-coruna",
  "elche",
  "espanyol",
  "getafe",
  "levante",
  "malaga",
  "osasuna",
  "rayo-vallecano",
  "real-betis",
  "real-madrid",
  "real-sociedad",
  "santander",
  "sevilla",
  "valencia",
  "villarreal",
  // Bundesliga
  "augsburg",
  "bayer-leverkusen",
  "bayern-munich",
  "borussia-dortmund",
  "borussia-monchengladbach",
  "eintracht-frankfurt",
  "freiburg",
  "hamburger-sv",
  "tsg-hoffenheim",
  "1-fc-koln",
  "mainz",
  "paderborn",
  "rb-leipzig",
  "schalke",
  "elversberg",
  "union-berlin",
  "stuttgart",
  "werder-bremen",
  // Serie A
  "atalanta",
  "bologna",
  "cagliari",
  "como",
  "fiorentina",
  "frosinone",
  "genoa",
  "inter",
  "juventus",
  "lazio",
  "lecce",
  "milan",
  "monza",
  "napoli",
  "parma",
  "roma",
  "sassuolo",
  "torino",
  "udinese",
  "venezia",
  // Ligue 1
  "angers",
  "as-monaco",
  "auxerre",
  "brest",
  "le-havre",
  "le-mans",
  "lille",
  "lorient",
  "lyon",
  "marseille",
  "nice",
  "paris-fc",
  "paris-saint-germain",
  "rc-lens",
  "strasbourg",
  "rennes",
  "toulouse",
  "troyes",
  // Spain Segunda (extra files, resolve if these clubs ever appear)
  "albacete",
  "almeria",
  "burgos",
  "castellon",
  "ceuta",
  "cordoba",
  "eibar",
  "fc-andorra",
  "granada",
  "leganes",
  "oviedo",
  "sabadell",
  "sporting-gijon",
  "tenerife",
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
  // La Liga (Odds API / football-data / full names → file slug)
  "athletic": "athletic-bilbao",
  "athletic-club": "athletic-bilbao",
  "atl-tico-madrid": "atletico-madrid",
  "club-atl-tico-de-madrid": "atletico-madrid",
  "atleti": "atletico-madrid",
  "ca-osasuna": "osasuna",
  "rcd-espanyol-de-barcelona": "espanyol",
  "fc-barcelona": "barcelona",
  "bar-a": "barcelona",
  "m-laga": "malaga",
  "m-laga-cf": "malaga",
  "alav-s": "alaves",
  "deportivo-alav-s": "alaves",
  "celta": "celta-vigo",
  "rc-celta-de-vigo": "celta-vigo",
  "celta-de-vigo": "celta-vigo",
  "deportivo": "deportivo-la-coruna",
  "deportivo-la-coru-a": "deportivo-la-coruna",
  "rc-deportivo-la-coru-a": "deportivo-la-coruna",
  "real-racing-club-de-santander": "santander",
  "levante-ud": "levante",
  "rayo-vallecano-de-madrid": "rayo-vallecano",
  "real-betis-balompi": "real-betis",
  "real-sociedad-de-futbol": "real-sociedad",
  // Bundesliga
  "fc-schalke-04": "schalke",
  "fsv-mainz-05": "mainz",
  "1-fsv-mainz-05": "mainz",
  "sc-paderborn": "paderborn",
  "sc-paderborn-07": "paderborn",
  "sv-07-elversberg": "elversberg",
  "vfb-stuttgart": "stuttgart",
  "1-fc-k-ln": "1-fc-koln",
  "fc-bayern-m-nchen": "bayern-munich",
  "borussia-m-nchengladbach": "borussia-monchengladbach",
  "tsg-1899-hoffenheim": "tsg-hoffenheim",
  "hoffenheim": "tsg-hoffenheim",
  "bayer-04-leverkusen": "bayer-leverkusen",
  "leverkusen": "bayer-leverkusen",
  "dortmund": "borussia-dortmund",
  "hsv": "hamburger-sv",
  "bremen": "werder-bremen",
  "mgladbach": "borussia-monchengladbach",
  "frankfurt": "eintracht-frankfurt",
  "1-fc-union-berlin": "union-berlin",
  "fc-augsburg": "augsburg",
  "sc-freiburg": "freiburg",
  "sv-werder-bremen": "werder-bremen",
  // Serie A
  "atalanta-bc": "atalanta",
  "ac-milan": "milan",
  "as-roma": "roma",
  "fc-internazionale-milano": "inter",
  "inter-milan": "inter",
  "bologna-fc-1909": "bologna",
  "cagliari-calcio": "cagliari",
  "parma-calcio-1913": "parma",
  "udinese-calcio": "udinese",
  "frosinone-calcio": "frosinone",
  "us-sassuolo-calcio": "sassuolo",
  "us-lecce": "lecce",
  "acf-fiorentina": "fiorentina",
  "ss-lazio": "lazio",
  "como-1907": "como",
  "ssc-napoli": "napoli",
  "ac-monza": "monza",
  // Ligue 1
  "aj-auxerre": "auxerre",
  "es-troyes-ac": "troyes",
  "lille-osc": "lille",
  "ogc-nice": "nice",
  "olympique-lyonnais": "lyon",
  "olympique-lyon": "lyon",
  "psg": "paris-saint-germain",
  "monaco": "as-monaco",
  "olympique-de-marseille": "marseille",
  "fc-lorient": "lorient",
  "stade-rennais": "rennes",
  "stade-rennais-fc-1901": "rennes",
  "stade-brestois-29": "brest",
  "le-havre-ac": "le-havre",
  "racing-club-de-lens": "rc-lens",
  "rc-strasbourg-alsace": "strasbourg",
  "angers-sco": "angers",
  // Spain Segunda extras
  "real-oviedo": "oviedo",
  "ud-almer-a": "almeria",
  "cd-castell-n": "castellon",
  "c-rdoba-cf": "cordoba",
  "granada-cf": "granada",
  "cd-tenerife": "tenerife",
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

/**
 * Resolve a club to a displayable logo URL.
 *  1. Local SVG set — clubs we ship in `public/assets/team_logos`.
 *  2. Wikimedia Commons fallback — a static list of verified hotlinkable SVGs
 *     (see lib/wikimediaClubLogos.ts).
 *  3. Online resolver — `/api/v1/club-logos?name=…` looks the club up on
 *     Wikipedia/Commons at request time (backend, cached). So ANY club without a
 *     local SVG still gets a real crest, and the UI never breaks.
 */
export function getClubLogo(name: string | null | undefined): string {
  if (!name) return GENERIC_CLUB_LOGO;
  if (resolveTeamLogoSlug(name)) return `${teamLogoPath(name)}?v=2`;
  const key = normalizeName(name);
  if (WIKIMEDIA_LOGO_BY_CLUB[key]) return WIKIMEDIA_LOGO_BY_CLUB[key];
  // Unique prefix fallback, e.g. "fk-bodo-glimt" → key "bodo-glimt".
  const hits = Object.keys(WIKIMEDIA_LOGO_BY_CLUB).filter(
    (slug) => slug.startsWith(`${key}-`) || key.startsWith(`${slug}-`)
  );
  if (hits.length === 1) return WIKIMEDIA_LOGO_BY_CLUB[hits[0]];
  // Permanent online fallback: the backend resolves the crest from Wikimedia
  // (302 → verified SVG) and falls back to the generic logo if nothing is found.
  return `/api/v1/club-logos?name=${encodeURIComponent(name)}`;
}

export function countryFlagPath(country: string | null | undefined): string {
  if (!country) return "";
  return `/assets/country_flags/${normalizeName(country)}.png`;
}

const LEAGUE_LOGOS: { match: string[]; src: string; alt: string }[] = [
  { match: ["premier", "epl"], src: "/assets/genenral_logos/premier-league.svg", alt: "Premier League" },
  { match: ["la liga", "laliga"], src: "/assets/team_logos/league-la-liga.svg", alt: "La Liga" },
  { match: ["bundesliga"], src: "/assets/team_logos/league-bundesliga.svg", alt: "Bundesliga" },
  { match: ["serie a", "serie-a"], src: "/assets/team_logos/league-serie-a.svg", alt: "Serie A" },
  { match: ["ligue 1", "ligue-1"], src: "/assets/team_logos/league-ligue-1.svg", alt: "Ligue 1" },
  { match: ["champions"], src: "/assets/genenral_logos/champions-league.svg", alt: "UEFA Champions League" },
  { match: ["fa cup"], src: "/assets/genenral_logos/fa-cup.svg", alt: "FA Cup" },
  { match: ["efl cup", "league cup"], src: "/assets/genenral_logos/efl-cup.svg", alt: "EFL Cup" },
];

export function LeagueLogo({
  league,
  className,
}: {
  league: string | null | undefined;
  className?: string;
}) {
  const [error, setError] = useState(false);
  const name = (league ?? "").toLowerCase();
  const found = LEAGUE_LOGOS.find((l) => l.match.some((m) => name.includes(m)));
  if (!found || error) return null;
  return (
    <div className={cn("relative shrink-0", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={found.src}
        alt={found.alt}
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
  // Local entries ship as .svg (fall back to .png then a letter badge).
  // Remote entries (Wikimedia URL or the backend resolver endpoint) are a single
  // source → letter badge on error.
  const localSlug = name ? resolveTeamLogoSlug(name) : null;
  const remote = name ? getClubLogo(name) : GENERIC_CLUB_LOGO;
  const isRemote = !!name && !localSlug && (remote.startsWith("http") || remote.startsWith("/api/"));
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

  // Local → .svg then .png; remote (Wikimedia / resolver) → the exact URL, no query.
  const src = isRemote ? remote : `${teamLogoPath(name, fallback as "png" | "svg")}?v=2`;

  return (
    <div className={cn("relative shrink-0", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        onError={onError}
        className="size-full rounded-full bg-white object-contain p-0.5"
      />
    </div>
  );
}