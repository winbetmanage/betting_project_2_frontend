/**
 * Fixed display ordering for betting markets. Featured markets always float to
 * the top of a game's market list, in this order, on both the admin and user
 * sides:
 *   1. Match Winner
 *   2. Both Teams to Score
 *   3. Double Chance
 *   4. Correct Score
 *   5. everything else (kept in its original relative order)
 *
 * Matching is done on the market label (preferred) with a fallback to the
 * market type and the raw odds-api marketKey, so it works for recorded markets
 * (name + type) and for fetched bookmaker groups (label + marketKey).
 */

type MarketLike = { name?: string | null; type?: string | null; label?: string | null; marketKey?: string | null };

function rankOf(m: MarketLike): number {
  const label = (m.name ?? m.label ?? "").toLowerCase();
  const type = (m.type ?? "").toUpperCase();
  const key = (m.marketKey ?? "").toLowerCase();

  if (label.includes("match winner") || key === "h2h" || key === "h2h_3_way" || key === "h2h_lay" || key === "h2h_back") return 0;
  if (label.includes("both teams to score") || type === "BOTH_TEAMS_TO_SCORE" || key === "btts") return 1;
  if (label.includes("double chance") || key.startsWith("double_chance")) return 2;
  if (label.includes("correct score") || type === "CORRECT_SCORE" || key.startsWith("correct_score")) return 3;
  return 4;
}

/** Stable-sort markets so featured ones come first, preserving ties' original order. */
export function orderMarkets<T extends MarketLike>(markets: T[]): T[] {
  return markets
    .map((m, i) => ({ m, i, r: rankOf(m) }))
    .sort((a, b) => (a.r - b.r) || (a.i - b.i))
    .map((x) => x.m);
}