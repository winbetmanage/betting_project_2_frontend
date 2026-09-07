"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";
import { TeamLogo } from "@/components/TeamLogo";
import { ChevronRight, Clock, Calendar, Trophy } from "lucide-react";

type Game = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: string;
};

export default function GamesPage() {
  const [token, setToken] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  useEffect(() => {
    const t = token;
    api
      .get<{ data: Game[] }>("/games?isPublished=true", t)
      .then((res) => setGames((res.data ?? []).filter((g) => ["SCHEDULED", "LIVE", "SUSPENDED"].includes(g.status))))
      .catch(() => {
        toast.error("Failed to load games");
        setGames([]);
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upcoming games</h1>
        <p className="mt-1 text-sm text-white/60">Published matches available now. Tap a game to view odds and place your bet.</p>
      </div>

      {loading ? (
        <div className="grid place-items-center py-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
        </div>
      ) : games.length === 0 ? (
        <div className="py-16 text-center">
          <Trophy className="mx-auto size-10 text-white/20" />
          <p className="mt-3 text-sm font-medium">No upcoming games</p>
          <p className="text-xs text-white/50">Check back soon — new matches are added regularly.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {games.map((game) => (
            <li key={game.id}>
              <Link
                href={`/games/${game.id}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-primary/40 hover:bg-white/10"
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="flex items-center gap-2">
                    <TeamLogo name={game.homeTeam} className="size-8" />
                    <span className="font-semibold">{game.homeTeam}</span>
                  </span>
                  <span className="text-white/40">vs</span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">{game.awayTeam}</span>
                    <TeamLogo name={game.awayTeam} className="size-8" />
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/60">
                  <span className="hidden items-center gap-1 sm:flex">
                    <Calendar className="size-3.5" />
                    {new Date(game.startTime).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" />
                    {new Date(game.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary-light">{game.status}</span>
                  <ChevronRight className="size-4 text-white/30 transition group-hover:text-white/70" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
