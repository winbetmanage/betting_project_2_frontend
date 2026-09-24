"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken, getUser } from "@/lib/auth";
import { toast } from "sonner";

export type SlipLeg = {
  selectionId: string;
  gameId: string;
  gameLabel: string;
  marketId: string;
  marketName: string;
  selectionName: string;
  odds: number;
};

export const MAX_SLIP_LEGS = 15;

const STORAGE_KEY = "betSlip.v1";

type SlipContextValue = {
  legs: SlipLeg[];
  stake: string;
  setStake: (v: string) => void;
  has: (selectionId: string) => boolean;
  add: (leg: SlipLeg) => boolean;
  remove: (selectionId: string) => void;
  toggle: (leg: SlipLeg) => void;
  clear: () => void;
  count: number;
  totalOdds: number;
  potentialPayout: number;
  placing: boolean;
  /** Places the whole slip as one ticket (server derives SINGLE vs MULTIPLE). */
  place: () => Promise<{ betId?: string; error?: string }>;
};

const SlipContext = createContext<SlipContextValue | null>(null);

export function useBetSlip(): SlipContextValue {
  const ctx = useContext(SlipContext);
  if (!ctx) throw new Error("useBetSlip must be used inside <BetSlipProvider>");
  return ctx;
}

export function BetSlipProvider({ children }: { children: React.ReactNode }) {
  const [legs, setLegs] = useState<SlipLeg[]>([]);
  const [stake, setStake] = useState("10");
  const [placing, setPlacing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { legs?: SlipLeg[]; stake?: string };
        if (Array.isArray(parsed.legs)) {
          setLegs(parsed.legs.filter((l) => l && typeof l.selectionId === "string" && typeof l.marketId === "string" && Number(l.odds) > 1));
        }
        if (typeof parsed.stake === "string") setStake(parsed.stake);
      }
    } catch {
      // corrupted storage — start fresh
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ legs, stake }));
    } catch {
      // storage unavailable (private mode) — slip still works in-memory
    }
  }, [legs, stake, loaded]);

  const has = useCallback((selectionId: string) => legs.some((l) => l.selectionId === selectionId), [legs]);

  const add = useCallback(
    (leg: SlipLeg) => {
      if (legs.some((l) => l.selectionId === leg.selectionId)) return true;
      if (legs.length >= MAX_SLIP_LEGS) {
        toast.error(`A bet slip can contain at most ${MAX_SLIP_LEGS} selections`);
        return false;
      }
      const sameMarket = legs.find((l) => l.marketId === leg.marketId);
      if (sameMarket) {
        toast.error(`Only one pick per market — "${leg.marketName}" is already on your slip`);
        return false;
      }
      setLegs((prev) => [...prev, leg]);
      return true;
    },
    [legs]
  );

  const remove = useCallback((selectionId: string) => setLegs((prev) => prev.filter((l) => l.selectionId !== selectionId)), []);

  const toggle = useCallback(
    (leg: SlipLeg) => {
      if (legs.some((l) => l.selectionId === leg.selectionId)) {
        remove(leg.selectionId);
        return;
      }
      add(leg);
    },
    [legs, add, remove]
  );

  const clear = useCallback(() => setLegs([]), []);

  const totalOdds = useMemo(() => legs.reduce((acc, l) => acc * (Number(l.odds) || 1), 1), [legs]);
  const potentialPayout = useMemo(() => Math.round(Number(stake || 0) * totalOdds * 100) / 100, [stake, totalOdds]);

  const place = useCallback(async (): Promise<{ betId?: string; error?: string }> => {
    const token = getAccessToken();
    if (!token) return { error: "Please sign in to place a bet" };
    if (getUser()?.role === "AGENT") {
      toast.error("You need a user account to bet.");
      return { error: "You need a user account to bet." };
    }
    if (legs.length === 0) return { error: "Add at least one selection first" };
    if (Number(stake) <= 0) return { error: "Stake must be positive" };
    setPlacing(true);
    try {
      const res = await api.post<{ data: { id: string } }>(
        "/bets",
        { stake: Number(stake), selections: legs.map((l) => ({ selectionId: l.selectionId, odds: l.odds })) },
        token
      );
      clear();
      return { betId: res.data.id };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Could not place bet" };
    } finally {
      setPlacing(false);
    }
  }, [legs, stake, clear]);

  const value = useMemo<SlipContextValue>(
    () => ({ legs, stake, setStake, has, add, remove, toggle, clear, count: legs.length, totalOdds, potentialPayout, placing, place }),
    [legs, stake, has, add, remove, toggle, clear, totalOdds, potentialPayout, placing, place]
  );

  return <SlipContext.Provider value={value}>{children}</SlipContext.Provider>;
}
