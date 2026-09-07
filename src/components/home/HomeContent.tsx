"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { getUser, getUserRole, isAuthenticated, getAccessToken } from "@/lib/auth";
import { toast } from "sonner";
import PromoSlider from "./PromoSlider";
import {
  Monitor,
  Trophy,
  Volleyball,
  Dumbbell,
  Gamepad2,
  Swords,
  Bike,
  Flag,
  CircleDot,
  Timer,
  TrendingUp,
  Shield,
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
  const [selected, setSelected] = useState<(Selection & { marketName: string; gameId: string }) | null>(null);
  const [stake, setStake] = useState("10");
  const [placing, setPlacing] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [activeSport, setActiveSport] = useState<string | null>(null);
  const [activeLeague, setActiveLeague] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    Promise.all([
      api.get<{ data: Sport[] }>("/sports").then((r) => r.data).catch(() => []),
      api.get<{ data: Game[] }>("/games?include=markets&isPublished=true", token).then((r) => r.data).catch(() => []),
    ])
      .then(([s, g]) => {
        setSports(s ?? []);
        // Only show published, upcoming games that have markets to bet on
        setGames((g ?? []).filter((gm) => ["SCHEDULED", "LIVE", "SUSPENDED"].includes(gm.status) && gm.markets?.length > 0).slice(0, 6));
      })
      .finally(() => setLoading(false));
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

  const placeBet = async () => {
    if (isGuest) {
      router.push("/login");
      return;
    }
    if (!selected) return;
    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }
    setPlacing(true);
    setNotice(null);
    try {
      const res = await api.post<{ data: { id: string } }>(
        "/bets",
        { stake: Number(stake), selections: [{ selectionId: selected.id, odds: Number(selected.odds) }] },
        token
      );
      toast.success(`Bet placed! ID: ${res.data.id.slice(0, 8)}`);
      setNotice({ kind: "ok", text: `Bet placed! ID: ${res.data.id.slice(0, 8)}` });
      setSelected(null);
    } catch (err) {
      const msg = err instanceof ApiError || err instanceof Error ? err.message : "Could not place bet";
      toast.error(msg);
      setNotice({ kind: "err", text: msg });
    } finally {
      setPlacing(false);
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
      <div className="flex-1 min-w-0 bg-[#eef2f7] p-0 sm:p-4">
        <div className="mx-auto max-w-[1100px] space-y-4">
          {activeLeague && activeLeague !== "epl" ? (
            <LeagueEmpty
              league={topLeagues.find((l) => l.id === activeLeague) ?? topLeagues[0]}
              onBack={() => setActiveLeague(null)}
            />
          ) : (
            <>
          {/* Top Banner - BETLAB style */}
          <PromoSlider />

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

          {/* League Tabs - like BWC, BWFWT etc */}
          <div className="rounded-xl bg-white p-2 shadow-sm border border-[#e2e8f0]">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {[
                { label: "BWC", active: true },
                { label: "BWFWT", active: false },
                { label: "CO", active: false },
                { label: "FO", active: false },
                { label: "JO", active: false },
                { label: "MO", active: false },
              ].map((tab) => (
                <button
                  key={tab.label}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                    tab.active ? "bg-[#e0f2ff] text-[#0a0f2e] border border-[#3b82f6]/20" : "text-[#64748b] hover:bg-[#f1f5f9]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              <span className="ml-auto hidden text-xs text-[#64748b] sm:inline">All Markets</span>
            </div>
          </div>

          {/* Games */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-xl bg-white" />
              ))}
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
              {filteredGames.map((game) => (
                <div key={game.id} className="overflow-hidden rounded-xl bg-white shadow-sm border border-[#e2e8f0]">
                  {/* Game header */}
                  <div className="flex items-center justify-between bg-[#f8fafc] px-3 py-2 border-b border-[#e2e8f0]">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-[#ef4444]">
                        <span className="size-1.5 rounded-full bg-[#ef4444] animate-pulse" /> Live Now
                      </span>
                      <span className="hidden text-[10px] text-[#64748b] sm:inline">• {game.competition?.name ?? "Friendly"}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-[#64748b]">
                      <span className="hidden sm:inline">{new Date(game.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${game.status === "LIVE" ? "bg-red-50 text-red-600" : "bg-[#f1f5f9] text-[#64748b]"}`}>
                        {game.status}
                      </span>
                    </div>
                  </div>

                  {/* Teams + Odds grid - BETLAB style */}
                  <div className="grid grid-cols-12 gap-0">
                    {/* Teams col */}
                    <div className="col-span-12 sm:col-span-3 border-b sm:border-b-0 sm:border-r border-[#e2e8f0] p-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="grid size-6 place-items-center rounded-full bg-[#f1f5f9] text-[10px] font-bold">H</div>
                          <span className="text-sm font-semibold text-[#0f172a] truncate">{game.homeTeam}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="grid size-6 place-items-center rounded-full bg-[#f1f5f9] text-[10px] font-bold">A</div>
                          <span className="text-sm font-semibold text-[#0f172a] truncate">{game.awayTeam}</span>
                        </div>
                        <Link href="/games" className="text-[11px] text-[#3b82f6] hover:underline">
                          All Markets ({game.markets.length})
                        </Link>
                      </div>
                    </div>

                    {/* Odds grid */}
                    <div className="col-span-12 sm:col-span-9">
                      {(game.markets ?? []).length === 0 ? (
                        <div className="grid place-items-center p-6 text-xs text-[#94a3b8]">No markets</div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-[#e2e8f0] divide-y sm:divide-y-0">
                          {/* Header row for odds types */}
                          {game.markets.slice(0, 1).map((market) => (
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
                                const isSelected = selected?.id === sel.id;
                                return (
                                  <button
                                    key={sel.id}
                                    onClick={() => setSelected({ ...sel, marketName: market.name, gameId: game.id })}
                                    className={`p-2 text-center transition ${
                                      isSelected
                                        ? "bg-[#3b82f6] text-white"
                                        : "bg-white hover:bg-[#eff6ff] text-[#0f172a]"
                                    }`}
                                  >
                                    <div className="text-xs font-bold">{Number(sel.odds).toFixed(2)}</div>
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
                          {/* Additional markets as spread/total */}
                          {game.markets.slice(1, 2).map((market) => (
                            <div key={market.id} className="contents">
                              <div className="col-span-3 sm:col-span-6 grid grid-cols-3 bg-[#f8fafc] text-[10px] font-medium tracking-wider text-[#64748b] border-t border-[#e2e8f0]">
                                <div className="px-2 py-1 text-center">Spreads</div>
                                <div className="px-2 py-1 text-center">Total</div>
                                <div className="px-2 py-1 text-center">-</div>
                              </div>
                              {market.selections.slice(0, 3).map((sel) => {
                                const isSelected = selected?.id === sel.id;
                                return (
                                  <button
                                    key={sel.id}
                                    onClick={() => setSelected({ ...sel, marketName: market.name, gameId: game.id })}
                                    className={`p-2 text-center border-t border-[#e2e8f0] ${isSelected ? "bg-[#3b82f6] text-white" : "bg-white hover:bg-[#eff6ff]"}`}
                                  >
                                    <div className="text-xs font-bold">{Number(sel.odds).toFixed(2)}</div>
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      )}
                      {game.markets.length > 2 && (
                        <div className="border-t border-[#e2e8f0] bg-[#f8fafc] px-3 py-1 text-right">
                          <span className="text-[11px] text-[#64748b]">+{game.markets.length - 2} more markets</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
            </>
          )}

          {/* Footer - BETLAB style */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-[#e2e8f0]">
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <h4 className="text-sm font-bold text-[#0f172a]">About Us</h4>
                <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
                  Welcome to Tana Betting. Explore a wide array of thrilling sports events and bet on your favorite teams to win big. Our user-friendly interface ensures a seamless experience, with secure transactions.
                </p>
                <div className="mt-3 flex gap-2">
                  <span className="grid size-7 place-items-center rounded-full bg-[#3b82f6] text-white text-xs">f</span>
                  <span className="grid size-7 place-items-center rounded-full bg-[#0ea5e9] text-white text-xs">t</span>
                  <span className="grid size-7 place-items-center rounded-full bg-[#0077b5] text-white text-xs">in</span>
                  <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-purple-500 to-orange-400 text-white text-xs">ig</span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0f172a]">Usefull Link</h4>
                <ul className="mt-2 space-y-1 text-xs text-[#64748b]">
                  <li>
                    <Link href="/" className="hover:text-[#3b82f6]">
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-[#3b82f6]">
                      News & Updates
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-[#3b82f6]">
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0f172a]">Company Policy</h4>
                <ul className="mt-2 space-y-1 text-xs text-[#64748b]">
                  <li>Privacy Policy</li>
                  <li>Terms of Service</li>
                  <li>Refund Policy</li>
                </ul>
              </div>
            </div>
            <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-[#e2e8f0] pt-4 text-[11px] text-[#94a3b8] sm:flex-row">
              <span>Copyright © 2025 Tana Betting All right reserved</span>
              <div className="flex items-center gap-2">
                <span className="rounded bg-[#f1f5f9] px-2 py-1 text-[10px]">VISA</span>
                <span className="rounded bg-[#f1f5f9] px-2 py-1 text-[10px]">PayPal</span>
                <span className="rounded bg-[#f1f5f9] px-2 py-1 text-[10px]">Mastercard</span>
              </div>
            </div>
          </div>
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
            {!selected ? (
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
                <div className="flex items-start justify-between gap-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3">
                  <div>
                    <div className="text-xs font-semibold text-[#0f172a]">{selected.name}</div>
                    <div className="text-[11px] text-[#64748b]">{selected.marketName}</div>
                    <div className="text-xs font-bold text-[#3b82f6]">@{Number(selected.odds).toFixed(2)}</div>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-[#94a3b8] hover:text-[#ef4444]">
                    ×
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-[#64748b]">Odds</span>
                  <span className="font-bold">{Number(selected.odds).toFixed(2)}</span>
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
                  <span className="text-xs text-[#64748b]">USD</span>
                  <input
                    type="number"
                    value={stake}
                    onChange={(e) => setStake(e.target.value)}
                    className="w-full bg-transparent text-right text-sm outline-none"
                    placeholder="0.0"
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs text-[#64748b]">
                <span>Singles (x0)</span>
                <span>Returns: $0.00</span>
              </div>
              {selected && (
                <div className="flex justify-between text-xs font-medium">
                  <span>Potential Returns</span>
                  <span className="text-[#0f172a]">${(Number(stake || 0) * Number(selected.odds)).toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setSelected(null)}
                className="grid size-9 place-items-center rounded-md border border-[#e2e8f0] bg-white text-[#64748b] hover:bg-[#f8fafc]"
              >
                🗑️
              </button>
              <button
                onClick={placeBet}
                disabled={!selected || placing}
                className="flex-1 rounded-md bg-[#3b82f6] py-2 text-xs font-bold tracking-wide text-white shadow-sm hover:bg-[#2563eb] disabled:opacity-50"
              >
                {placing ? "PLACING..." : "PLACE BET"}
              </button>
            </div>
          </div>
        </div>
      </aside>
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
    return <div className="grid min-h-[60vh] place-items-center bg-[#eef2f7] text-sm text-[#64748b]">Loading Tana Betting...</div>;
  }

  if (authed && role === "ADMIN") {
    return <div className="grid min-h-[60vh] place-items-center bg-[#eef2f7] text-sm text-[#64748b]">Redirecting to admin dashboard...</div>;
  }

  if (!authed) {
    return <PublicHome />;
  }

  return <UserHome />;
}
