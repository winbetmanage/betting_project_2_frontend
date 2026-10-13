"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAuthenticated, getAccessToken, getUser } from "@/lib/auth";
import { toast } from "sonner";
import PromoSlider from "./PromoSlider";
import MobileHero from "./MobileHero";
import { MobileTabBar } from "./MobileTabBar";
import { TeamLogo, LeagueLogo } from "@/components/TeamLogo";
import { useBetSlip } from "@/components/bets/BetSlipProvider";
import { useTranslations } from "next-intl";
import { BetReceiptDialog, buildReceipt, type ReceiptData } from "@/components/bets/BetReceipt";
import { SignInPromptDialog } from "@/components/auth/SignInPrompt";
import { timeRemaining, isBettingWindowOpen } from "@/lib/timeRemaining";
import { LeagueFilterBar, competitionInCategory } from "@/components/games/LeagueFilter";
import {
  Monitor,
  Trophy,
  Dumbbell,
  Gamepad2,
  Swords,
  Flag,
  CircleDot,
  Clock,
  CalendarDays,
  History,
  Ticket,
  Wallet,
  UserCircle,
  ArrowRight,
  Gift,
} from "lucide-react";

type Sport = {
  id: string;
  name: string;
  slug: string;
  gameType: string;
  _count: { competitions: number };
};

type Selection = { id: string; name: string; odds: number | string; isWinning: boolean | null };
type Market = { id: string; name: string; type: string; status: string; selections: Selection[]; parameters?: { marketKey?: string; line?: number | null } | null };
type Game = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: string;
  isPublished: boolean;
  markets: Market[];
  competition: { name: string; sport: { name: string } | null } | null;
  score?: {
    footballDataMatchId: number | null;
    homeHT: number | null;
    awayHT: number | null;
    homeFT: number | null;
    awayFT: number | null;
    winner: string | null;
    status: string;
  } | null;
};

type ResultGame = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: string;
  score: {
    homeScoreHT: number | string;
    awayScoreHT: number | string;
    homeScoreFT: number | string;
    awayScoreFT: number | string;
    winner: string | null;
    status: string;
  } | null;
  competition: { name: string; sport: { name: string } | null } | null;
};

// Sport icon mapping
const sportIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  SOCCER: Trophy,
  FOOTBALL: Swords,
  BASKETBALL: Dumbbell,
  TENNIS: CircleDot,
  AMERICAN_FOOTBALL: Flag,
  BOXING_MMA: Swords,
  ESPORTS: Gamepad2,
  OTHER: Trophy,
  LIVE_ONLY: Monitor,
};

const leftStaticSports = [
  { labelKey: "liveOnly", icon: Monitor, active: false },
];

// Top leagues shown in the left sidebar — the five big leagues + Champions League
// + the two English cups.
const topLeagues = [
  { id: "epl", name: "English Premier League", short: "EPL", color: "#38003c", logo: "/assets/genenral_logos/premier-league.svg" },
  { id: "champions", name: "UEFA Champions League", short: "UCL", color: "#00004b", logo: "/assets/genenral_logos/champions-league.svg" },
  { id: "fa-cup", name: "FA Cup", short: "FA", color: "#d0021b", logo: "/assets/genenral_logos/fa-cup.svg" },
  { id: "efl-cup", name: "EFL Cup", short: "EFL", color: "#0b4ea2", logo: "/assets/genenral_logos/efl-cup.svg" },
  { id: "laliga", name: "Spain LaLiga", short: "LL", color: "#ee8707", logo: "/assets/team_logos/league-la-liga.svg" },
  { id: "serie-a", name: "Italian Serie A", short: "SA", color: "#003791", logo: "/assets/team_logos/league-serie-a.svg" },
  { id: "bundesliga", name: "Bundesliga", short: "BL", color: "#d20515", logo: "/assets/team_logos/league-bundesliga.svg" },
  { id: "ligue-1", name: "France Ligue 1", short: "L1", color: "#091c3e", logo: "/assets/team_logos/league-ligue-1.svg" },
];

/** Loose club-name comparison (ignores case, accents, and common club suffixes). */
function teamNameMatches(name: string, team: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\b(fc|afc|cf|sc|sk|ac|as|ss|ssc|rc|club|bsc|sv|vfb|tsg)\b/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const a = norm(name);
  const b = norm(team);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * Order a match-winner market's selections as [home, draw, away] so the grid
 * reads left→right respectively to the two clubs with the draw in the middle.
 */
function orderMatchWinner(selections: Selection[], homeTeam: string, awayTeam: string): (Selection | null)[] {
  let home: Selection | null = null;
  let away: Selection | null = null;
  let draw: Selection | null = null;
  for (const s of selections) {
    const n = s.name.toLowerCase();
    if (!draw && (n === "draw" || n === "x" || n.includes("draw"))) { draw = s; continue; }
    if (!home && teamNameMatches(s.name, homeTeam)) { home = s; continue; }
    if (!away && teamNameMatches(s.name, awayTeam)) { away = s; continue; }
  }
  // Fallbacks: if names were "1"/"X"/"2" or a 2-way market, fill by position.
  const leftover = selections.filter((s) => s !== home && s !== away && s !== draw);
  if (!home && leftover.length) home = leftover.shift()!;
  if (!away && leftover.length) away = leftover.shift()!;
  if (!draw && leftover.length) draw = leftover.shift()!;
  return [home, draw, away];
}

/** How many upcoming games the home list reveals at a time. */
const GAMES_PAGE_SIZE = 10;

function BetLabDashboard({ isGuest }: { isGuest: boolean }) {
  const t = useTranslations("home");
  const tNav = useTranslations("nav");
  const [sports, setSports] = useState<Sport[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const slip = useBetSlip();
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirmReceipt, setConfirmReceipt] = useState<ReceiptData | null>(null);
  const [placedReceipt, setPlacedReceipt] = useState<ReceiptData | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [activeSport, setActiveSport] = useState<string | null>(null);
  const [activeLeague, setActiveLeague] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ResultGame[]>([]);
  const [bonusBanner, setBonusBanner] = useState<{ enabled: boolean; minDeposit: number; flatAmount: number; percent: number; expiryDays: number } | null>(null);
  // Progressive reveal: the first batch renders immediately and each further
  // batch of 10 is appended as the sentinel at the bottom scrolls into view.
  const [visibleCount, setVisibleCount] = useState(GAMES_PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    Promise.all([
      api.get<{ data: Sport[] }>("/sports").then((r) => r.data).catch(() => []),
      api.get<{ data: Game[] }>("/games?include=markets&isPublished=true", token).then((r) => r.data).catch(() => []),
    ])
      .then(([s, g]) => {
        setSports(s ?? []);
        // Only show published games that have an open H2H (match winner) market to bet on
        setGames(
          (g ?? [])
            .filter(
              (gm) =>
                ["SCHEDULED", "LIVE", "SUSPENDED"].includes(gm.status) &&
                (gm.markets ?? []).some((m) => m.type === "MATCH_WINNER" && m.status === "OPEN" && m.selections?.length > 0)
            )
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        );
      })
      .finally(() => setLoading(false));

    api
      .get<{ data: ResultGame[] }>("/games/results?limit=10")
      .then((r) => setResults(r.data ?? []))
      .catch(() => setResults([]));
  }, []);

  // First-deposit bonus banner: only for signed-in accounts that never had an
  // approved deposit (firstTimeDeposit === false), using the live bonus policy.
  useEffect(() => {
    if (isGuest) return;
    const token = getAccessToken();
    if (!token) return;
    let cancelled = false;
    Promise.all([
      api.get<{ data: { firstTimeDeposit?: boolean | null } }>("/users/me", token).then((r) => r.data).catch(() => null),
      api.get<{ data: { bonus?: { enabled: boolean; minDeposit: number; flatAmount: number; percent: number; expiryDays: number } | null } }>("/settings/public", token).then((r) => r.data?.bonus ?? null).catch(() => null),
    ]).then(([me, bonus]) => {
      if (cancelled) return;
      if (!me || me.firstTimeDeposit !== false || !bonus || !bonus.enabled) return;
      if (!(bonus.flatAmount > 0) && !(bonus.percent > 0)) return;
      setBonusBanner(bonus);
    });
    return () => {
      cancelled = true;
    };
  }, [isGuest]);

  // Sync active sport filter from the mobile menu drawer
  useEffect(() => {
    const onSportSelect = (e: Event) => {
      const name = (e as CustomEvent).detail as string;
      setActiveSport(name);
      setActiveLeague(null);
    };
    window.addEventListener("tana:sport-select", onSportSelect);
    return () => window.removeEventListener("tana:sport-select", onSportSelect);
  }, []);

  const openReceipt = () => {
    if (isGuest) {
      setPromptOpen(true);
      return;
    }
    const bettingRole = getUser()?.role;
    if (bettingRole && bettingRole !== "USER") {
      toast.error(t("needUserAccount"));
      return;
    }
    if (slip.count === 0) {
      toast.error(t("addSelectionFirst"));
      return;
    }
    if (!(Number(slip.stake) > 0)) {
      toast.error(t("enterStake"));
      return;
    }
    if (Number(slip.stake) < slip.minStake) {
      toast.error(t("minStake", { amount: slip.minStake.toLocaleString("en-US") }));
      return;
    }
    setNotice(null);
    setConfirmReceipt(buildReceipt(slip.legs, Number(slip.stake), { existingOddsTotal: slip.totalOdds }));
  };

  const confirmPlace = async () => {
    if (!confirmReceipt) return;
    const res = await slip.place();
    if (res.betId) {
      toast.success(t("betPlacedId", { id: res.betId.slice(0, 8) }));
      setNotice({ kind: "ok", text: t("betPlacedId", { id: res.betId.slice(0, 8) }) });
      window.dispatchEvent(new CustomEvent("tana:bet-placed", { detail: res.betId }));
      setConfirmReceipt(null);
      setPlacedReceipt({ ...confirmReceipt, id: res.betId, placedAt: new Date().toISOString() });
    } else {
      const msg = res.error ?? t("couldNotPlace");
      toast.error(msg);
      setNotice({ kind: "err", text: msg });
      setConfirmReceipt(null);
    }
  };

  const filteredGames = games.filter((g) => {
    if (activeSport && g.competition?.sport?.name !== activeSport) return false;
    if (activeLeague && !competitionInCategory(g.competition?.name, activeLeague)) return false;
    const q = search.trim().toLowerCase();
    if (q && !`${g.homeTeam} ${g.awayTeam}`.toLowerCase().includes(q)) return false;
    return true;
  });

  // Closest games to kickoff first (live games still get sorted by start time;
  // games list is already filtered to bettable ones).
  const sortedGames = [...filteredGames].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const hasMore = sortedGames.length > visibleCount;
  const visibleGames = hasMore ? sortedGames.slice(0, visibleCount) : sortedGames;

  // Changing a filter starts the list again from the first batch.
  useEffect(() => {
    setVisibleCount(GAMES_PAGE_SIZE);
  }, [activeSport, activeLeague, search]);

  // Watch the sentinel at the bottom of the list; once it is on screen, flag
  // that another batch should be appended.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setLoadingMore(true);
      },
      { rootMargin: "300px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, visibleCount]);

  // Append the next 10 games, keeping the loader on screen long enough to read.
  useEffect(() => {
    if (!loadingMore) return;
    if (!hasMore) {
      setLoadingMore(false);
      return;
    }
    const id = setTimeout(() => {
      setVisibleCount((c) => Math.min(c + GAMES_PAGE_SIZE, sortedGames.length));
      setLoadingMore(false);
    }, 350);
    return () => clearTimeout(id);
  }, [loadingMore, hasMore, sortedGames.length]);

  const leagueCounts = topLeagues.reduce<Record<string, number>>((acc, lg) => {
    acc[lg.id] = games.filter((g) => competitionInCategory(g.competition?.name, lg.id)).length;
    return acc;
  }, {});

  // Categories with no games left are dropped from both the sidebar and the chip
  // row, so the home page only ever offers leagues that actually have fixtures.
  const visibleTopLeagues = topLeagues.filter((lg) => lg.id === activeLeague || (leagueCounts[lg.id] ?? 0) > 0);

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      {/* Left Sidebar - BETLAB dark */}
      <aside className="hidden w-[200px] shrink-0 bg-[#0a0f2e] text-white md:block">
        <div className="sticky top-[56px] h-[calc(100vh-56px)] overflow-y-auto">
          <nav className="p-2">
            <div className="space-y-1">
              {leftStaticSports.map((s) => (
                <a key={s.labelKey} href="#" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white">
                  <s.icon className="size-4" />
                  {t(s.labelKey)}
                </a>
              ))}
              <div className="my-2 h-px bg-white/10" />
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
                {t("topLeagues")}
              </div>
              {visibleTopLeagues.map((lg) => {
                const active = activeLeague === lg.id;
                return (
                  <button
                    key={lg.id}
                    onClick={() => {
                      setActiveLeague(active ? null : lg.id);
                      setActiveSport(null);
                    }}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs font-medium transition ${
                      active ? "bg-white text-[#0a0f2e]" : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={lg.logo} alt={lg.name} className="size-4 object-contain" />
                    </span>
                    <span className="truncate">{lg.name}</span>
                  </button>
                );
              })}
              <div className="my-2 h-px bg-white/10" />
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
                {t("sports")}
              </div>
              {sports.length === 0 && !loading ? (
                <div className="px-3 py-2 text-xs text-white/30">{t("noSports")}</div>
              ) : (
                sports.map((sport) => {
                  const Icon = sportIcons[sport.gameType] ?? Trophy;
                  const active = activeSport === sport.name;
                  return (
                    <button
                      key={sport.id}
                      onClick={() => {
                      setActiveSport(active ? null : sport.name);
                      setActiveLeague(null);
                    }}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-xs font-medium transition ${
                        active ? "bg-white text-[#0a0f2e]" : "text-white/70 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className={`size-4 ${active ? "text-[#0a0f2e]" : "text-white/60"}`} />
                      <span className="truncate">{sport.name}</span>
                    </button>
                  );
                })
              )}
              {/* Fallback static list like BETLAB image */}
              {sports.length === 0 && loading && (
                <>
                  {["American Football", "Aussie Rules", "Badminton", "Baseball", "Basketball", "Boxing", "Cricket", "Golf", "Ice Hockey"].map((name) => (
                    <a key={name} href="#" className="flex items-center gap-3 rounded-md px-3 py-2 text-xs text-white/40">
                      <Trophy className="size-4 opacity-40" />
                      {name}
                    </a>
                  ))}
                </>
              )}
            </div>
          </nav>
        </div>
      </aside>

      {/* Center Content */}
      <div className="flex-1 min-w-0 overflow-x-hidden bg-[#eef2f7] p-3 pb-28 sm:p-4 sm:pb-28 md:pb-4">
        <div className="mx-auto max-w-[1100px] space-y-4">
          <>
          {/* Mobile hero (hidden on desktop) */}
          <MobileHero isGuest={isGuest} />

          {/* Mobile quick actions — right after the hero (2x2 grid) */}
          <div className="grid grid-cols-2 gap-2.5 sm:hidden">
            {[
              { href: "/games", labelKey: "games", icon: Gamepad2, descKey: "betOnLive" },
              { href: "/my-bets", labelKey: "myBets", icon: Ticket, descKey: "trackTickets" },
              { href: "/wallet", labelKey: "wallet", icon: Wallet, descKey: "depositWithdraw" },
              { href: "/profile", labelKey: "profile", icon: UserCircle, descKey: "accountReferral" },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-[#0a0f2e] p-3.5 shadow-md shadow-blue-950/20 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/20 active:scale-95"
              >
                <span className="absolute -right-4 -top-4 size-12 rounded-full bg-primary/20 blur-xl transition-all duration-300 group-hover:bg-primary/40" />
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary-light transition-all duration-200 group-hover:scale-110 group-hover:bg-primary group-hover:text-white">
                  <a.icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-white">{tNav(a.labelKey)}</span>
                  <span className="block truncate text-[9px] text-white/40">{t(a.descKey)}</span>
                </span>
              </Link>
            ))}
          </div>

          {/* Top Banner - BETLAB style (desktop) */}
          <div className="hidden sm:block">
            <PromoSlider />
          </div>

          {/* First-deposit bonus notice — only for accounts that never deposited */}
          {bonusBanner && (
            <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white shadow-sm">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/20">
                  <Gift className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{t("firstDepositBonusTitle")}</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/90">
                    {t("firstDepositBonusBody", {
                      threshold: bonusBanner.minDeposit.toLocaleString("en-US"),
                      flat: bonusBanner.flatAmount.toLocaleString("en-US"),
                      percent: bonusBanner.percent,
                      days: bonusBanner.expiryDays,
                      dayWord: bonusBanner.expiryDays === 1 ? t("day") : t("days"),
                    })}
                  </p>
                  <Link
                    href="/wallet"
                    className="mt-2 inline-block rounded-md bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
                  >
                    {t("bonusDepositCta")}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* League category + club search filter */}
          <LeagueFilterBar
            active={activeLeague}
            onActiveChange={(id) => { setActiveLeague(id); setActiveSport(null); }}
            search={search}
            onSearchChange={setSearch}
            counts={leagueCounts}
            allCount={games.length}
            hideEmpty
          />

          {/* Games */}
          <div id="tana-games" className="scroll-mt-16">
          {loading ? (
            <div className="grid place-items-center py-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-12" />
            </div>
          ) : sortedGames.length === 0 ? (
            <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-[#e2e8f0]">
              <Trophy className="mx-auto size-10 text-[#cbd5e1]" />
              <p className="mt-3 text-sm font-medium text-[#0f172a]">{t("noGamesYet")}</p>
              <p className="text-xs text-[#64748b]">{t("checkBackSoon")}</p>
              {(activeSport || activeLeague || search) && (
                <button onClick={() => { setActiveSport(null); setActiveLeague(null); setSearch(""); }} className="mt-3 text-xs text-[#3b82f6] hover:underline">
                  {t("clearFilter")}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleGames.map((game, gameIndex) => {
                const countdown = timeRemaining(game.startTime);
                // Zebra rows: white, then a light grey, then white again.
                const zebra = gameIndex % 2 === 1;
                return (
                <div
                  key={game.id}
                  className={`overflow-hidden rounded-2xl shadow-sm transition-shadow active:shadow-none sm:rounded-xl ${zebra ? "border border-[#cbd5e1] bg-[#e2e8f0]" : "border border-[#e2e8f0] bg-white"}`}
                >
                  {/* Game header */}
                  <div className="flex items-center justify-between bg-transparent px-3 py-2 border-b border-[#e2e8f0]">
                    <div className="flex items-center gap-2">
                      {game.status === "LIVE" ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-[#ef4444]">
                          <span className="size-1.5 rounded-full bg-[#ef4444] animate-pulse" /> {t("liveNow")}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-[#0a0f2e]">
                          <Clock className="size-3" /> {t("upcoming")}
                        </span>
                      )}
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-medium text-[#334155]">
                      <LeagueLogo league={game.competition?.name} className="size-4 shrink-0" />
                      <span className="truncate">{game.competition?.name ?? t("friendly")}</span>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${game.status === "LIVE" ? "bg-red-50 text-red-600" : game.status === "SUSPENDED" ? "bg-amber-50 text-amber-600" : "bg-[#f1f5f9] text-[#64748b]"}`}>
                      {game.status}
                    </span>
                  </div>

                  {/* Teams face-off + countdown */}
                  {/* Teams face-off + countdown — tapping the card opens the game */}
                  <button
                    type="button"
                    onClick={() => router.push(`/games/${game.id}`)}
                    className="flex w-full items-center justify-between gap-2 border-b border-[#e2e8f0] bg-transparent px-4 py-4 text-left transition active:bg-black/[0.04]"
                  >
                    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                      <TeamLogo name={game.homeTeam} className="size-14 sm:size-12" />
                      <span className="max-w-full truncate text-center text-xs font-bold text-[#0f172a]">{game.homeTeam}</span>
                    </div>
                    <div className="flex shrink-0 flex-col items-center gap-1 px-1">
                      {game.score && game.score.homeFT != null && game.score.awayFT != null && (game.status === "LIVE" || game.status === "FINISHED" || game.status === "SUSPENDED") ? (
                        <>
                          <span className="rounded-lg bg-[#0a0f2e] px-2.5 py-1 font-mono text-lg font-black tracking-wide text-white shadow-sm">
                            {Number(game.score.homeFT)}<span className="mx-1 text-white/40">-</span>{Number(game.score.awayFT)}
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${game.status === "LIVE" ? "text-[#ef4444]" : "text-[#64748b]"}`}>
                            {game.status === "LIVE" ? t("live") : game.status === "SUSPENDED" ? t("suspended") : t("fullTime")}
                          </span>
                        </>
                      ) : game.status === "LIVE" ? (
                        <span className="text-sm font-black tracking-widest text-[#ef4444]">VS</span>
                      ) : (
                        <>
                          <span className="text-sm font-black tracking-widest text-[#94a3b8]">VS</span>
                          <span
                            className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              countdown.urgent ? "bg-red-50 text-[#ef4444]" : "bg-[#eef2ff] text-[#4338ca]"
                            }`}
                          >
                            {countdown.text}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                      <TeamLogo name={game.awayTeam} className="size-14 sm:size-12" />
                      <span className="max-w-full truncate text-center text-xs font-bold text-[#0f172a]">{game.awayTeam}</span>
                    </div>
                  </button>

                  {/* Odds grid — Match Winner only, laid out home · draw · away */}
                  <div>
                      {!isBettingWindowOpen(game.startTime, game.status) ? (
                        <div className="grid place-items-center gap-1 p-6 text-center">
                          <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-500">{t("bettingClosed")}</span>
                          <span className="text-[11px] text-[#94a3b8]">{t("kickoff15")}</span>
                        </div>
                      ) : (() => {
                        const mw = (game.markets ?? []).find((m) => m.type === "MATCH_WINNER" && m.status === "OPEN" && m.selections?.length > 0);
                        if (!mw) return <div className="grid place-items-center p-6 text-xs text-[#94a3b8]">{t("bettingUnavailable")}</div>;
                        const [home, draw, away] = orderMatchWinner(mw.selections, game.homeTeam, game.awayTeam);
                        const cells: { sel: Selection | null; label: string }[] = [
                          { sel: home, label: game.homeTeam },
                          { sel: draw, label: "Draw" },
                          { sel: away, label: game.awayTeam },
                        ];
                        return (
                          <div>
                            <div className="grid grid-cols-3 border-b border-[#e2e8f0] bg-transparent text-[10px] font-medium tracking-wider text-[#64748b]">
                              <div className="px-2 py-1 text-center">1</div>
                              <div className="px-2 py-1 text-center">X</div>
                              <div className="px-2 py-1 text-center">2</div>
                            </div>
                            <div className="grid grid-cols-3 divide-x divide-[#e2e8f0]">
                              {cells.map(({ sel, label }, i) => {
                                if (!sel) {
                                  return <div key={i} className="bg-transparent p-3 text-center text-xs text-[#cbd5e1]">—</div>;
                                }
                                const isSelected = slip.has(sel.id);
                                return (
                                  <button
                                    key={sel.id}
                                    onClick={() =>
                                      slip.toggle({
                                        selectionId: sel.id,
                                        gameId: game.id,
                                        gameLabel: `${game.homeTeam} vs ${game.awayTeam}`,
                                        marketId: mw.id,
                                        marketName: mw.name,
                                        selectionName: sel.name,
                                        odds: Number(sel.odds),
                                      })
                                    }
                                    className={`px-2 py-3 text-center transition ${
                                      isSelected ? "bg-[#3b82f6] text-white" : "bg-transparent hover:bg-[#eff6ff] text-[#0f172a]"
                                    }`}
                                  >
                                    <div className="text-sm font-bold">{Number(sel.odds).toFixed(2)}</div>
                                    <div className={`truncate text-[10px] ${isSelected ? "text-white/80" : "text-[#64748b]"}`}>{label}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                  </div>

                  {/* Card footer: kickoff time + Details */}
                  <div className="flex items-center justify-between border-t border-[#e2e8f0] bg-transparent px-3 py-2">
                    <span className="flex items-center gap-1.5 text-[11px] text-[#64748b]">
                      <CalendarDays className="size-3.5" />
                      {new Date(game.startTime).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button
                      onClick={() => router.push(`/games/${game.id}`)}
                      className="rounded-md bg-[#0a0f2e] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#1a2456]"
                    >
                      {t("details")}
                    </button>
                  </div>
                </div>
              );
              })}
            </div>
          )}

          {/* Progressive loader — appends the next 10 games, then stops at the end */}
          {sortedGames.length > 0 && (
            <div className="mt-3">
              <div ref={sentinelRef} aria-hidden className="h-px w-full" />
              {loadingMore && (
                <div className="grid place-items-center py-6" role="status" aria-live="polite">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/assets/custom/infinite-spinner.svg" alt="Loading more games" className="size-8" />
                  <span className="mt-2 text-xs text-[#64748b]">Loading more games…</span>
                </div>
              )}
              {!hasMore && visibleGames.length > GAMES_PAGE_SIZE && (
                <p className="py-5 text-center text-xs text-[#94a3b8]">
                  All {visibleGames.length} games loaded
                </p>
              )}
            </div>
          )}
          </div>

          {/* Recent results — last 10 finished games, card grid */}
          {results.length > 0 && (
            <div>
              <div className="mb-2.5 flex items-center justify-between px-1">
                <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-[#0a0f2e]">
                  <span className="grid size-6 place-items-center rounded-md bg-primary text-white">
                    <History className="size-3.5" />
                  </span>
                  {t("recentResults")}
                </h3>
                <span className="text-[10px] font-medium text-[#64748b]">{results.length} {t("latest")}</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {results.map((r) => {
                  const homeWin = r.score?.winner === "HOME_TEAM";
                  const awayWin = r.score?.winner === "AWAY_TEAM";
                  const draw = !homeWin && !awayWin;
                  return (
                    <div
                      key={r.id}
                      className="group relative overflow-hidden rounded-xl border border-[#e2e8f0] bg-white p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/10"
                    >
                      {/* competition + date */}
                      <div className="mb-2.5 flex items-center justify-between text-[10px] text-[#94a3b8]">
                        <span className="flex items-center gap-1 truncate font-medium">
                          <Trophy className="size-3 text-[#f59e0b]" />
                          {r.competition?.name ?? t("friendly")}
                        </span>
                        <span>{new Date(r.startTime).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                      </div>

                      {/* face-off */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                          <TeamLogo name={r.homeTeam} className="size-9 shrink-0" />
                          <span className={`max-w-full truncate text-center text-[11px] leading-tight ${homeWin ? "font-bold text-[#0f172a]" : draw ? "font-medium text-[#334155]" : "text-[#94a3b8]"}`}>
                            {r.homeTeam}
                          </span>
                        </div>

                        <div className="flex shrink-0 flex-col items-center gap-0.5">
                          <span className="rounded-lg bg-[#0a0f2e] px-2.5 py-1 font-mono text-sm font-black tracking-wide text-white shadow-sm">
                            {Number(r.score?.homeScoreFT ?? 0)}<span className="mx-0.5 text-white/40">-</span>{Number(r.score?.awayScoreFT ?? 0)}
                          </span>
                          {draw ? (
                            <span className="rounded-full bg-[#f1f5f9] px-1.5 text-[8px] font-bold tracking-wider text-[#64748b]">{t("draw")}</span>
                          ) : (
                            <span className="text-[8px] font-bold tracking-wider text-primary">
                              {homeWin ? t("homeWon") : t("awayWon")}
                            </span>
                          )}
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                          <TeamLogo name={r.awayTeam} className="size-9 shrink-0" />
                          <span className={`max-w-full truncate text-center text-[11px] leading-tight ${awayWin ? "font-bold text-[#0f172a]" : draw ? "font-medium text-[#334155]" : "text-[#94a3b8]"}`}>
                            {r.awayTeam}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </>

          {/* Footer - dark brand style */}
          <footer className="overflow-hidden rounded-xl bg-[#0a0f2e] shadow-lg">
            <div className="grid gap-8 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
              {/* Brand */}
              <div>
                <div className="flex items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/assets/website_images/logoone.png"
                    alt="Tana Betting"
                    className="h-9 w-9 rounded-lg bg-white object-contain p-1 shadow-md"
                  />
                  <div>
                    <div className="text-sm font-black tracking-wide text-white">TANA BETTING</div>
                    <div className="text-[10px] font-semibold tracking-[0.2em] text-[#60a5fa]">PLAY SMART · WIN BIG</div>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-white/50">
                  {t("brandTagline")}
                </p>
                <div className="mt-4 flex gap-2">
                  {["f", "t", "in", "ig"].map((s) => (
                    <a
                      key={s}
                      href="#"
                      aria-label={`Social ${s}`}
                      className="grid size-8 place-items-center rounded-full bg-white/10 text-[10px] font-bold text-white/80 transition hover:scale-110 hover:bg-primary"
                    >
                      {s}
                    </a>
                  ))}
                </div>
              </div>

              {/* Quick links */}
              <div>
                <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-widest text-white/90">
                  <ArrowRight className="size-3.5 text-[#60a5fa]" /> {t("quickLinks")}
                </h4>
                <ul className="mt-3 space-y-2 text-xs">
                  {[
                    { href: "/", labelKey: "home" },
                    { href: "/games", labelKey: "games" },
                    { href: "/my-bets", labelKey: "myBets" },
                    { href: "/wallet", labelKey: "wallet" },
                  ].map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="group inline-flex items-center gap-1.5 text-white/50 transition hover:translate-x-0.5 hover:text-white"
                      >
                        <span className="h-px w-3 bg-[#60a5fa]/50 transition-all group-hover:w-4 group-hover:bg-[#60a5fa]" />
                        {tNav(l.labelKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company */}
              <div>
                <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-widest text-white/90">
                  <ArrowRight className="size-3.5 text-[#60a5fa]" /> {t("company")}
                </h4>
                <ul className="mt-3 space-y-2 text-xs text-white/50">
                  <li><a href="#" className="transition hover:text-white">{t("news")}</a></li>
                  <li><a href="#" className="transition hover:text-white">{t("contact")}</a></li>
                  <li><a href="#" className="transition hover:text-white">{t("privacy")}</a></li>
                  <li>
                    <Link href="/terms" className="transition hover:text-white">{t("terms")}</Link>
                  </li>
                  <li><a href="#" className="transition hover:text-white">{t("refund")}</a></li>
                </ul>
              </div>

              {/* Payments / responsible gaming */}
              <div>
                <h4 className="text-xs font-bold tracking-widest text-white/90">{t("payments")}</h4>
                <p className="mt-3 text-xs leading-relaxed text-white/50">
                  {t("paymentsText")}
                </p>
                <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                  <div className="text-[10px] font-bold tracking-widest text-[#ffb347]">{t("responsible")}</div>
                  <p className="mt-1 text-[10px] leading-relaxed text-white/40">
                    {t("gambleNote")}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-between gap-2 border-t border-white/10 px-6 py-4 text-[11px] text-white/40 sm:flex-row">
              <span>{t("rights", { year: new Date().getFullYear() })}</span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-green-400 animate-pulse" />
                {t("systemsOk")}
              </span>
            </div>
          </footer>
        </div>
      </div>

      {/* Right Sidebar - Bet Slip - BETLAB style */}
      <aside className="hidden w-[300px] shrink-0 bg-[#eef2f7] p-3 lg:block">
        <div className="sticky top-[68px] space-y-3">
          <div className="flex overflow-hidden rounded-lg border border-[#e2e8f0] bg-white text-xs font-medium">
            <button className="flex-1 bg-[#3b82f6] py-2 text-white">{t("betSlip")}</button>
            <button className="flex-1 bg-white py-2 text-[#64748b] hover:bg-[#f8fafc]" onClick={() => (isGuest ? null : (window.location.href = "/admin/bets"))}>
              {tNav("myBets")}
            </button>
          </div>

          <div className="rounded-xl bg-white shadow-sm border border-[#e2e8f0] min-h-[300px]">
            {slip.count === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="grid size-16 place-items-center rounded-full border-2 border-dashed border-[#e2e8f0] text-[#cbd5e1]">
                  <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="mt-3 text-xs text-[#94a3b8]">{t("selectionsEmpty")}</p>
                {isGuest && (
                  <div className="mt-4 flex gap-2">
                    <Link href="/login" className="rounded-md bg-[#3b82f6] px-4 py-1.5 text-xs font-semibold text-white">
                      {tNav("login")}
                    </Link>
                    <Link href="/signup" className="rounded-md border border-[#e2e8f0] px-4 py-1.5 text-xs font-medium">
                      {tNav("signup")}
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0f172a]">{slip.count > 1 ? t("multipleLegs", { count: slip.count }) : t("single")}</span>
                  <button onClick={() => slip.clear()} className="text-[11px] text-[#94a3b8] hover:text-[#ef4444]">
                    {t("clearAll")}
                  </button>
                </div>
                <div className="space-y-2">
                  {slip.legs.map((l) => (
                    <div key={l.selectionId} className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-[#0f172a]">{l.selectionName}</div>
                          <div className="truncate text-[11px] text-[#64748b]">{l.marketName} • {l.gameLabel}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs font-bold text-[#3b82f6]">@{l.odds.toFixed(2)}</span>
                          <button onClick={() => slip.remove(l.selectionId)} className="text-[#94a3b8] hover:text-[#ef4444]">
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-[#64748b]">{t("totalOdds")}</span>
                  <span className="font-bold">{slip.totalOdds.toFixed(2)}</span>
                </div>
                {notice && (
                  <div className={`mt-2 rounded-md px-2 py-1.5 text-xs ${notice.kind === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    {notice.text}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-white shadow-sm border border-[#e2e8f0] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#0f172a]">{t("single")}</span>
              <select className="rounded-md border border-[#e2e8f0] bg-white px-2 py-1 text-xs">
                <option>{t("single")}</option>
                <option>{t("multiple")}</option>
              </select>
            </div>
            <div className="mt-3 space-y-2">
              <div>
                <label className="text-[10px] font-bold tracking-widest text-[#64748b]">{t("stake")} · MIN {slip.minStake.toLocaleString("en-US")}</label>
                <div className="mt-1 flex items-center gap-2 rounded-md border border-[#e2e8f0] bg-white px-2 py-1.5">
                  <span className="text-xs text-[#64748b]">ETB</span>
                  <input
                    type="number"
                    value={slip.stake}
                    onChange={(e) => slip.setStake(e.target.value)}
                    className="w-full bg-transparent text-right text-sm outline-none"
                    placeholder="0.0"
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs text-[#64748b]">
                <span>{t("selectionsCount", { count: slip.count })}</span>
                <span>{t("oddsLabel")}: {slip.totalOdds.toFixed(2)}</span>
              </div>
              {slip.count > 0 && (
                <div className="flex justify-between text-xs font-medium">
                  <span>{t("potentialReturns")}</span>
                  <span className="text-[#0f172a]">ETB {slip.potentialPayout.toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => slip.clear()}
                className="grid size-9 place-items-center rounded-md border border-[#e2e8f0] bg-white text-[#64748b] hover:bg-[#f8fafc]"
              >
                🗑️
              </button>
              <button
                onClick={openReceipt}
                disabled={slip.count === 0 || slip.placing}
                className="flex-1 rounded-md bg-[#3b82f6] py-2 text-xs font-bold tracking-wide text-white shadow-sm hover:bg-[#2563eb] disabled:opacity-50"
              >
                {slip.placing ? t("placing") : t("placeBet")}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile bet slip bar — fixed at bottom on small screens */}
      {slip.count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e2e8f0] bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] lg:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-[#0f172a]">
                {slip.count > 1 ? t("multipleLegs", { count: slip.count }) : slip.legs[0].selectionName}
                {slip.count === 1 && <span className="font-normal text-[#64748b]"> • {slip.legs[0].marketName}</span>}
              </div>
              <div className="truncate text-[11px] text-[#64748b]">
                {t("oddsLabel")} <span className="font-bold text-[#0f172a]">{slip.totalOdds.toFixed(2)}</span>
                {" · "}{t("stake")} <span className="font-bold text-[#0f172a]">{slip.stake || 0}</span>
                {" · "}{t("potentialReturns")} <span className="font-bold text-[#0f172a]">ETB {slip.potentialPayout.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={() => slip.clear()}
              className="grid size-10 shrink-0 place-items-center rounded-md border border-[#e2e8f0] text-[#64748b]"
              aria-label="Clear selection"
            >
              ×
            </button>
          </div>
          <button
            onClick={openReceipt}
            disabled={slip.placing}
            className="mt-2 w-full rounded-md bg-[#3b82f6] py-3 text-sm font-bold tracking-wide text-white shadow-sm disabled:opacity-50"
          >
            {slip.placing ? t("placing") : `${t("placeBet")} · ETB ${slip.potentialPayout.toFixed(2)}`}
          </button>
        </div>
      )}

      <BetReceiptDialog
        open={!!confirmReceipt}
        onOpenChange={(o) => { if (!o) setConfirmReceipt(null); }}
        data={confirmReceipt}
        busy={slip.placing}
        onConfirm={confirmPlace}
      />
      <SignInPromptDialog open={promptOpen} onOpenChange={setPromptOpen} />
      <MobileTabBar />
      <BetReceiptDialog
        open={!!placedReceipt}
        onOpenChange={(o) => { if (!o) setPlacedReceipt(null); }}
        data={placedReceipt}
        confirmLabel={t("done")}
        cancelLabel=""
        onConfirm={() => setPlacedReceipt(null)}
      />
    </div>
  );
}

function UserHome() {
  return <BetLabDashboard isGuest={false} />;
}

function PublicHome() {
  return <BetLabDashboard isGuest={true} />;
}

export default function HomeContent() {
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const sync = () => {
      setAuthed(isAuthenticated());
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  // Everyone stays on the home page: guests browse freely, signed-in users
  // (players and staff alike) can look around. Betting and wallet actions
  // gate themselves. Role dashboards are reached via the nav, not forced.
  if (!mounted) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-[#eef2f7]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-14" />
      </div>
    );
  }

  if (!authed) {
    return <PublicHome />;
  }

  return <UserHome />;
}
