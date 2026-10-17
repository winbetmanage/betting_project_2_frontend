"use client";

import BetGamesList from "@/components/admin/BetGamesList";

/**
 * Same screen as Bet Games, narrowed to finished games and ordered with the most
 * recently finished at the top. Lives inside /admin/bet-games/[id] links, so the
 * per-game settlement work happens in one place.
 */
export default function FinishedBetGamesPage() {
  return <BetGamesList finishedOnly />;
}