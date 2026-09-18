"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { getUser, getUserRole, isAuthenticated, getAccessToken } from "@/lib/auth";
import { toast } from "sonner";
import PromoSlider from "./PromoSlider";
import MobileHero from "./MobileHero";
import { TeamLogo } from "@/components/TeamLogo";
import { useBetSlip } from "@/components/bets/BetSlipProvider";
import { BetReceiptDialog, buildReceipt, type ReceiptData } from "@/components/bets/BetReceipt";
import { timeRemaining, isBettingWindowOpen } from "@/lib/timeRemaining";
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
} from "lucide-react";

type Sport = {
  id: string;
  name: string;
  slug: string;
  gameType: string;
  _count: { competitions: number };
};

type Selection = { id: string; name: string; odds: number | string; isWinning: boolean | null };
type Market = { id: string; name: string; type: string; status: string; selections: Selection[] };
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
  { label: "LIVE ONLY", icon: Monitor, active: false },
];

// Top leagues shown in the left sidebar. Only EPL has games to bet on for now.
const topLeagues = [
  { id: "epl", name: "English Premier League", short: "EPL", color: "#38003c", logo: "/assets/genenral_logos/premier-league.svg" },
  { id: "serie-a", name: "Italian Serie A", short: "SA", color: "#003791", logo: "/assets/genenral_logos/italy_serie-a.svg" },
  { id: "laliga", name: "Spain LaLiga", short: "LL", color: "#ee8707", logo: "/assets/genenral_logos/la-liga.svg" },
  { id: "bundesliga", name: "Bundesliga", short: "BL", color: "#d20515", logo: "/assets/genenral_logos/bundesliga.svg" },
  { id: "ligue-1", name: "Ligue 1", short: "L1", color: "#091c3e", logo: "/assets/genenral_logos/france_ligue-1.svg" },
];

function LeagueEmpty({ league, onBack }: { league: (typeof topLeagues)[number]; onBack: () => void }) {
  return (
    <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-[#e2e8f0]">
      <span className="mx-auto grid size-16 place-items-center overflow-hidden rounded-full bg-white p-2 shadow-md ring-1 ring-[#e2e8f0]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={league.logo} alt={league.name} className="size-full object-contain" />
      </span>
      <p className="mt-4 text-base font-bold text-[#0f172a]">{league.name}</p>
      <p className="mt-1 text-sm font-semibold text-[#334155]">No games to bet for now</p>
      <p className="mt-1 text-xs text-[#64748b]">Matches for {league.name} will appear here soon. Check back later.</p>
      <button
        onClick={onBack}
        className="mt-5 rounded-md border border-[#e2e8f0] bg-white px-4 py-2 text-xs font-semibold text-[#0a0f2e] transition hover:bg-[#f8fafc]"
      >
        Back to all games
      </button>
    </div>
  );
}

function BetLabDashboard({ isGuest }: { isGuest: boolean }) {
  const [sports, setSports] = useState<Sport[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const slip = useBetSlip();
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirmReceipt, setConfirmReceipt] = useState<ReceiptData | null>(null);
  const [placedReceipt, setPlacedReceipt] = useState<ReceiptData | null>(null);
  const [activeSport, setActiveSport] = useState<string | null>(null);
  const [activeLeague, setActiveLeague] = useState<string | null>(null);
  const [results, setResults] = useState<ResultGame[]>([]);
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
      router.push("/login");
      return;
    }
    if (slip.count === 0) {
      toast.error("Add at least one selection first");
      return;
    }
    if (!(Number(slip.stake) > 0)) {
      toast.error("Enter a stake");
      return;
    }
    setNotice(null);
    setConfirmReceipt(buildReceipt(slip.legs, Number(slip.stake), { existingOddsTotal: slip.totalOdds }));
  };

  const confirmPlace = async () => {
    if (!confirmReceipt) return;
    const res = await slip.place();
    if (res.betId) {
      toast.success(`Bet placed! ID: ${res.betId.slice(0, 8)}`);
      setNotice({ kind: "ok", text: `Bet placed! ID: ${res.betId.slice(0, 8)}` });
      window.dispatchEvent(new CustomEvent("tana:bet-placed", { detail: res.betId }));
      setConfirmReceipt(null);
      setPlacedReceipt({ ...confirmReceipt, id: res.betId, placedAt: new Date().toISOString() });
    } else {
      const msg = res.error ?? "Could not place bet";
      toast.error(msg);
      setNotice({ kind: "err", text: msg });
      setConfirmReceipt(null);
    }
  };

  const filteredGames = activeSport ? games.filter((g) => g.competition?.sport?.name === activeSport) : games;

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      {/* Left Sidebar - BETLAB dark */}
      <aside className="hidden w-[200px] shrink-0 bg-[#0a0f2e] text-white md:block">
        <div className="sticky top-[56px] h-[calc(100vh-56px)] overflow-y-auto">
          <nav className="p-2">
            <div className="space-y-1">
              {leftStaticSports.map((s) => (
                <a key={s.label} href="#" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white">
                  <s.icon className="size-4" />
                  {s.label}
                </a>
              ))}
              <div className="my-2 h-px bg-white/10" />
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
                Top Leagues
              </div>
              {topLeagues.map((lg) => {
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
                Sports
              </div>
              {sports.length === 0 && !loading ? (
                <div className="px-3 py-2 text-xs text-white/30">No sports yet</div>
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
      <div className="flex-1 min-w-0 bg-[#eef2f7] p-4 sm:p-4">
        <div className="mx-auto max-w-[1100px] space-y-4">
          {activeLeague && activeLeague !== "epl" ? (
            <LeagueEmpty
              league={topLeagues.find((l) => l.id === activeLeague) ?? topLeagues[0]}
              onBack={() => setActiveLeague(null)}
            />
          ) : (
            <>
          {/* Mobile hero (hidden on desktop) */}
          <MobileHero isGuest={isGuest} />

          {/* Mobile quick actions — right after the hero (2x2 grid) */}
          <div className="grid grid-cols-2 gap-2.5 sm:hidden">
            {[
              { href: "/games", label: "Games", icon: Gamepad2, desc: "Bet on live & upcoming" },
              { href: "/my-bets", label: "My Bets", icon: Ticket, desc: "Track your tickets" },
              { href: "/wallet", label: "Wallet", icon: Wallet, desc: "Deposit & withdraw" },
              { href: "/profile", label: "Profile", icon: UserCircle, desc: "Account & referral" },
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
                  <span className="block text-xs font-bold text-white">{a.label}</span>
                  <span className="block truncate text-[9px] text-white/40">{a.desc}</span>
                </span>
              </Link>
            ))}
          </div>

          {/* Top Banner - BETLAB style (desktop) */}
          <div className="hidden sm:block">
            <PromoSlider />
          </div>

          {activeLeague === "epl" && (
            <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm border border-[#e2e8f0]">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center overflow-hidden rounded-full bg-white p-1 shadow-sm ring-1 ring-[#e2e8f0]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={topLeagues[0].logo} alt="English Premier League" className="size-full object-contain" />
                </span>
                <div>
                  <div className="text-sm font-bold text-[#0f172a]">English Premier League</div>
                  <div className="text-[11px] text-[#64748b]">Upcoming &amp; live games</div>
                </div>
              </div>
              <button onClick={() => setActiveLeague(null)} className="text-xs font-medium text-[#3b82f6] hover:underline">
                Clear
              </button>
            </div>
          )}

          {/* Games */}
          <div id="tana-games" className="scroll-mt-16">
          {loading ? (
            <div className="grid place-items-center py-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-12" />
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-[#e2e8f0]">
              <Trophy className="mx-auto size-10 text-[#cbd5e1]" />
              <p className="mt-3 text-sm font-medium text-[#0f172a]">No games yet</p>
              <p className="text-xs text-[#64748b]">Check back soon for top matches</p>
              {activeSport && (
                <button onClick={() => { setActiveSport(null); setActiveLeague(null); }} className="mt-3 text-xs text-[#3b82f6] hover:underline">
                  Clear filter
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGames.map((game) => {
                const countdown = timeRemaining(game.startTime);
                return (
                <div key={game.id} className="overflow-hidden rounded-xl bg-white shadow-sm border border-[#e2e8f0]">
                  {/* Game header */}
                  <div className="flex items-center justify-between bg-[#f8fafc] px-3 py-2 border-b border-[#e2e8f0]">
                    <div className="flex items-center gap-2">
                      {game.status === "LIVE" ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-[#ef4444]">
                          <span className="size-1.5 rounded-full bg-[#ef4444] animate-pulse" /> Live Now
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-[#0a0f2e]">
                          <Clock className="size-3" /> Upcoming
                        </span>
                      )}
                      <span className="hidden text-[10px] text-[#64748b] sm:inline">• {game.competition?.name ?? "Friendly"}</span>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${game.status === "LIVE" ? "bg-red-50 text-red-600" : game.status === "SUSPENDED" ? "bg-amber-50 text-amber-600" : "bg-[#f1f5f9] text-[#64748b]"}`}>
                      {game.status}
                    </span>
                  </div>

                  {/* Teams face-off + countdown */}
                  <div className="flex items-center justify-between gap-2 border-b border-[#e2e8f0] bg-gradient-to-b from-white to-[#f8fafc] px-4 py-4">
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
                            {game.status === "LIVE" ? "LIVE" : game.status === "SUSPENDED" ? "Suspended" : "Full time"}
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
                  </div>

                  {/* Odds grid — H2H (match winner) market only */}
                  <div>
                    {!isBettingWindowOpen(game.startTime, game.status) ? (
                        <div className="grid place-items-center gap-1 p-6 text-center">
                          <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-500">Betting closed</span>
                          <span className="text-[11px] text-[#94a3b8]">Kickoff within 15 minutes</span>
                        </div>
                      ) : (game.markets ?? []).filter((m) => m.type === "MATCH_WINNER" && m.status === "OPEN" && m.selections?.length > 0).length === 0 ? (
                        <div className="grid place-items-center p-6 text-xs text-[#94a3b8]">Betting currently unavailable</div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-[#e2e8f0] divide-y sm:divide-y-0">
                          {(game.markets ?? [])
                            .filter((m) => m.type === "MATCH_WINNER" && m.status === "OPEN")
                            .slice(0, 1)
                            .map((market) => (
                              <div key={market.id} className="contents">
                                <div className="col-span-3 sm:col-span-6 grid grid-cols-3 sm:grid-cols-6 bg-[#f8fafc] text-[10px] font-medium tracking-wider text-[#64748b]">
                                  <div className="px-2 py-1 text-center">1</div>
                                  <div className="px-2 py-1 text-center">X</div>
                                  <div className="px-2 py-1 text-center">2</div>
                                  <div className="px-2 py-1 text-center hidden sm:block">1X</div>
                                  <div className="px-2 py-1 text-center hidden sm:block">12</div>
                                  <div className="px-2 py-1 text-center hidden sm:block">X2</div>
                                </div>
                                {market.selections.slice(0, 6).map((sel) => {
                                  const isSelected = slip.has(sel.id);
                                  return (
                                    <button
                                      key={sel.id}
                                      onClick={() =>
                                        slip.toggle({
                                          selectionId: sel.id,
                                          gameId: game.id,
                                          gameLabel: `${game.homeTeam} vs ${game.awayTeam}`,
                                          marketId: market.id,
                                          marketName: market.name,
                                          selectionName: sel.name,
                                          odds: Number(sel.odds),
                                        })
                                      }
                                      className={`px-1 py-3 text-center transition sm:p-2 ${
                                        isSelected
                                          ? "bg-[#3b82f6] text-white"
                                          : "bg-white hover:bg-[#eff6ff] text-[#0f172a]"
                                      }`}
                                    >
                                      <div className="text-sm font-bold sm:text-xs">{Number(sel.odds).toFixed(2)}</div>
                                      <div className={`text-[10px] truncate ${isSelected ? "text-white/80" : "text-[#64748b]"}`}>{sel.name}</div>
                                    </button>
                                  );
                                })}
                                {/* Fill missing cells */}
                                {Array.from({ length: Math.max(0, 6 - market.selections.length) }).map((_, i) => (
                                  <div key={i} className="bg-[#f8fafc] p-2 text-center text-xs text-[#cbd5e1]">
                                    -
                                  </div>
                                ))}
                              </div>
                            ))}
                        </div>
                      )}
                      {game.markets.filter((m) => m.type === "MATCH_WINNER" && m.status === "OPEN").length > 1 && (
                        <div className="border-t border-[#e2e8f0] bg-[#f8fafc] px-3 py-1 text-right">
                          <span className="text-[11px] text-[#64748b]">+{game.markets.filter((m) => m.type === "MATCH_WINNER" && m.status === "OPEN").length - 1} more H2H markets</span>
                        </div>
                      )}
                  </div>

                  {/* Card footer: kickoff time + Details */}
                  <div className="flex items-center justify-between border-t border-[#e2e8f0] bg-white px-3 py-2">
                    <span className="flex items-center gap-1.5 text-[11px] text-[#64748b]">
                      <CalendarDays className="size-3.5" />
                      {new Date(game.startTime).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button
                      onClick={() => router.push(isGuest ? "/login" : `/games/${game.id}`)}
                      className="rounded-md bg-[#0a0f2e] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#1a2456]"
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
              })}
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
                  Recent Results
                </h3>
                <span className="text-[10px] font-medium text-[#64748b]">{results.length} latest</span>
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
                          {r.competition?.name ?? "Friendly"}
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
                            <span className="rounded-full bg-[#f1f5f9] px-1.5 text-[8px] font-bold tracking-wider text-[#64748b]">DRAW</span>
                          ) : (
                            <span className="text-[8px] font-bold tracking-wider text-primary">
                              {homeWin ? "HOME WON" : "AWAY WON"}
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
          )}

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
                  Bet on top leagues with the best odds, fast payouts and 24/7 live action — all in one place.
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
                  <ArrowRight className="size-3.5 text-[#60a5fa]" /> QUICK LINKS
                </h4>
                <ul className="mt-3 space-y-2 text-xs">
                  {[
                    { href: "/", label: "Home" },
                    { href: "/games", label: "Games" },
                    { href: "/my-bets", label: "My Bets" },
                    { href: "/wallet", label: "Wallet" },
                  ].map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="group inline-flex items-center gap-1.5 text-white/50 transition hover:translate-x-0.5 hover:text-white"
                      >
                        <span className="h-px w-3 bg-[#60a5fa]/50 transition-all group-hover:w-4 group-hover:bg-[#60a5fa]" />
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company */}
              <div>
                <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-widest text-white/90">
                  <ArrowRight className="size-3.5 text-[#60a5fa]" /> COMPANY
                </h4>
                <ul className="mt-3 space-y-2 text-xs text-white/50">
                  <li><a href="#" className="transition hover:text-white">News &amp; Updates</a></li>
                  <li><a href="#" className="transition hover:text-white">Contact</a></li>
                  <li><a href="#" className="transition hover:text-white">Privacy Policy</a></li>
                  <li><a href="#" className="transition hover:text-white">Terms of Service</a></li>
                  <li><a href="#" className="transition hover:text-white">Refund Policy</a></li>
                </ul>
              </div>

              {/* Payments / responsible gaming */}
              <div>
                <h4 className="text-xs font-bold tracking-widest text-white/90">PAYMENTS</h4>
                <p className="mt-3 text-xs leading-relaxed text-white/50">
                  We accept any type of payment that is added in the system — deposits and withdrawals are processed securely.
                </p>
                <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                  <div className="text-[10px] font-bold tracking-widest text-[#ffb347]">18+ · PLAY RESPONSIBLY</div>
                  <p className="mt-1 text-[10px] leading-relaxed text-white/40">
                    Betting can be addictive. Only wager what you can afford to lose.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-between gap-2 border-t border-white/10 px-6 py-4 text-[11px] text-white/40 sm:flex-row">
              <span>© {new Date().getFullYear()} Tana Betting. All rights reserved.</span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-green-400 animate-pulse" />
                All systems operational
              </span>
            </div>
          </footer>
        </div>
      </div>

      {/* Right Sidebar - Bet Slip - BETLAB style */}
      <aside className="hidden w-[300px] shrink-0 bg-[#eef2f7] p-3 lg:block">
        <div className="sticky top-[68px] space-y-3">
          <div className="flex overflow-hidden rounded-lg border border-[#e2e8f0] bg-white text-xs font-medium">
            <button className="flex-1 bg-[#3b82f6] py-2 text-white">Bet Slip</button>
            <button className="flex-1 bg-white py-2 text-[#64748b] hover:bg-[#f8fafc]" onClick={() => (isGuest ? null : (window.location.href = "/admin/bets"))}>
              My Bets
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
                <p className="mt-3 text-xs text-[#94a3b8]">Your selections will be displayed here</p>
                {isGuest && (
                  <div className="mt-4 flex gap-2">
                    <Link href="/login" className="rounded-md bg-[#3b82f6] px-4 py-1.5 text-xs font-semibold text-white">
                      Log in
                    </Link>
                    <Link href="/signup" className="rounded-md border border-[#e2e8f0] px-4 py-1.5 text-xs font-medium">
                      Sign up
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0f172a]">{slip.count > 1 ? `Multiple — ${slip.count} legs` : "Single"}</span>
                  <button onClick={() => slip.clear()} className="text-[11px] text-[#94a3b8] hover:text-[#ef4444]">
                    Clear all
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
                  <span className="text-[#64748b]">Total odds</span>
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
              <span className="text-xs font-medium text-[#0f172a]">Single</span>
              <select className="rounded-md border border-[#e2e8f0] bg-white px-2 py-1 text-xs">
                <option>Single</option>
                <option>Multiple</option>
              </select>
            </div>
            <div className="mt-3 space-y-2">
              <div>
                <label className="text-[10px] font-bold tracking-widest text-[#64748b]">STAKE</label>
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
                <span>{slip.count} selection{slip.count === 1 ? "" : "s"}</span>
                <span>Odds: {slip.totalOdds.toFixed(2)}</span>
              </div>
              {slip.count > 0 && (
                <div className="flex justify-between text-xs font-medium">
                  <span>Potential Returns</span>
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
                {slip.placing ? "PLACING..." : "PLACE BET"}
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
                {slip.count > 1 ? `Multiple — ${slip.count} legs` : slip.legs[0].selectionName}
                {slip.count === 1 && <span className="font-normal text-[#64748b]"> • {slip.legs[0].marketName}</span>}
              </div>
              <div className="truncate text-[11px] text-[#64748b]">
                Odds <span className="font-bold text-[#0f172a]">{slip.totalOdds.toFixed(2)}</span>
                {" · "}Stake <span className="font-bold text-[#0f172a]">{slip.stake || 0}</span>
                {" · "}Returns <span className="font-bold text-[#0f172a]">ETB {slip.potentialPayout.toFixed(2)}</span>
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
            {slip.placing ? "PLACING..." : `PLACE BET · ETB ${slip.potentialPayout.toFixed(2)}`}
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
      <BetReceiptDialog
        open={!!placedReceipt}
        onOpenChange={(o) => { if (!o) setPlacedReceipt(null); }}
        data={placedReceipt}
        confirmLabel="Done"
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
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const sync = () => {
      setAuthed(isAuthenticated());
      setRole(getUser()?.role ?? getUserRole());
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (authed && role === "ADMIN") {
      router.replace("/admin");
    }
  }, [mounted, authed, role, router]);

  if (!mounted) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-[#eef2f7]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-14" />
      </div>
    );
  }

  if (authed && role === "ADMIN") {
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
