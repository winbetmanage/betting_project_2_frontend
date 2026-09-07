"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

type Competition = { id: string; name: string; sport: { name: string } | null };
type Game = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: string;
  competition: Competition;
};

export default function AdminGamesPage() {
  const [token, setToken] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    competitionId: "",
    homeTeam: "",
    awayTeam: "",
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  });

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  const load = () => {
    const t = getAccessToken() ?? token;
    setLoading(true);
    Promise.all([
      api.get<{ data: Game[] }>("/games", t),
      api.get<{ data: Competition[] }>("/competitions", t),
    ])
      .then(([g, c]) => {
        setGames(g.data ?? []);
        setCompetitions(c.data ?? []);
      })
      .catch(() => {
        setGames([]);
        setCompetitions([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setNotice(null);
    try {
      const liveToken = getAccessToken() ?? token;
      await api.post(
        "/games",
        { ...form, startTime: new Date(form.startTime).toISOString() },
        liveToken
      );
      toast.success("Game created successfully");
      setNotice({ kind: "ok", text: "Game created" });
      setForm((f) => ({ ...f, homeTeam: "", awayTeam: "" }));
      load();
    } catch (err) {
      const msg = err instanceof ApiError || err instanceof Error ? err.message : "Could not create game";
      toast.error(msg);
      setNotice({
        kind: "err",
        text: msg,
      });
    } finally {
      setCreating(false);
    }
  };

  const input = "rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Games</h1>
        <p className="mt-1 text-sm text-white/60">Create matches and assign competitions.</p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-4 font-semibold">Create a game</h2>
        <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2">
          <select
            value={form.competitionId}
            onChange={(e) => setForm({ ...form, competitionId: e.target.value })}
            required
            className={input}
          >
            <option value="" className="bg-black">Select competition</option>
            {competitions.map((c) => (
              <option key={c.id} value={c.id} className="bg-black">
                {c.sport?.name} — {c.name}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            required
            className={input}
          />
          <input
            type="text"
            placeholder="Home team"
            value={form.homeTeam}
            onChange={(e) => setForm({ ...form, homeTeam: e.target.value })}
            required
            className={input}
          />
          <input
            type="text"
            placeholder="Away team"
            value={form.awayTeam}
            onChange={(e) => setForm({ ...form, awayTeam: e.target.value })}
            required
            className={input}
          />
          <button
            type="submit"
            disabled={creating || competitions.length === 0}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold shadow-md shadow-primary/30 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
          >
            {creating ? "Creating..." : "Create game"}
          </button>
        </form>
        {notice && (
          <p className={`mt-3 text-sm ${notice.kind === "ok" ? "text-green-300" : "text-red-300"}`}>
            {notice.text}
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-semibold">All games</h2>
        {loading ? (
          <div className="grid place-items-center py-14">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
          </div>
        ) : games.length === 0 ? (
          <p className="text-sm opacity-60">No games yet.</p>
        ) : (
          <div className="space-y-2">
            {games.map((game) => (
              <div
                key={game.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
              >
                <div className="font-medium">
                  {game.homeTeam} <span className="text-white/40">vs</span> {game.awayTeam}
                </div>
                <div className="flex items-center gap-3 text-white/60">
                  <span>{game.competition?.name ?? "—"}</span>
                  <span>{new Date(game.startTime).toLocaleString()}</span>
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs">{game.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}