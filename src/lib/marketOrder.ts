/**
 * Fixed display ordering for betting markets. Featured markets always float to
 * the top of a game's market list, in this order, on both the admin and user
 * sides:
 *   1. Match Winner (plain 1X2, then 3-way, then the lay variant)
 *   2. Both Teams to Score
 *   3. Double Chance
 *   4. Correct Score
 *   5. everything else (kept in its original relative order)
 *
 * Matching is done on the market label (preferred) with a fallback to the
 * market type and the raw odds-api marketKey, so it works for recorded markets
 * (name + type) and for fetched bookmaker groups (label + marketKey).
 */

type MarketLike = {
  name?: string | null;
  type?: string | null;
  label?: string | null;
  marketKey?: string | null;
  status?: string | null;
  selections?: unknown[] | null;
  parameters?: { marketKey?: string | null; line?: number | null } | null;
};

/** Rank buckets — spaced so sub-ranks inside a bucket stay ordered. */
const RANK_H2H = 0;
const RANK_H2H_3WAY = 1;
const RANK_H2H_LAY = 2;
const RANK_UNLABELLED_MATCH_WINNER = 3;
const RANK_BTTS = 10;
const RANK_DOUBLE_CHANCE = 20;
const RANK_CORRECT_SCORE = 30;
const RANK_OTHER = 40;

const marketKeyOf = (m: MarketLike): string => (m.parameters?.marketKey ?? m.marketKey ?? "").toLowerCase();

function rankOf(m: MarketLike): number {
  const label = (m.name ?? m.label ?? "").toLowerCase();
  const type = (m.type ?? "").toUpperCase();
  const key = marketKeyOf(m);

  // The plain 1X2 market leads, so a game's first block is always the market a
  // card's 1/X/2 grid is showing (see findMatchWinnerMarket).
  if (key === "h2h") return RANK_H2H;
  if (key === "h2h_3_way") return RANK_H2H_3WAY;
  if (key === "h2h_lay") return RANK_H2H_LAY;
  if (label.includes("match winner")) return label.includes("lay") ? RANK_H2H_LAY : RANK_H2H;

  // Double chance is stored as MATCH_WINNER too, so the label has to be
  // checked before the type or it would be mistaken for a 1X2 market.
  if (label.includes("double chance") || key.startsWith("double_chance")) return RANK_DOUBLE_CHANCE;
  if (label.includes("both teams to score") || key === "btts" || type === "BOTH_TEAMS_TO_SCORE") return RANK_BTTS;
  if (label.includes("correct score") || key.startsWith("correct_score") || type === "CORRECT_SCORE") return RANK_CORRECT_SCORE;

  // Hand-made market, no key and no recognisable label — fall back on the type.
  if (!key && type === "MATCH_WINNER") return RANK_UNLABELLED_MATCH_WINNER;
  return RANK_OTHER;
}

/** Stable-sort markets so featured ones come first, preserving ties' original order. */
export function orderMarkets<T extends MarketLike>(markets: T[]): T[] {
  return markets
    .map((m, i) => ({ m, i, r: rankOf(m) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.m);
}

/**
 * The one market a 1/X/2 grid should render.
 *
 * A game can hold several markets typed MATCH_WINNER — the plain 1X2, its lay
 * variant, and Double Chance all share that type — so picking by type alone
 * picks an arbitrary one and the numbers on a card stop matching the market at
 * the top of the game's detail page. This resolves to the same market
 * `orderMarkets` puts first: plain 1X2, then 3-way, then lay. Double Chance is
 * never returned — it is a different market, not a 1X2 result.
 */
export function findMatchWinnerMarket<T extends MarketLike>(markets: T[]): T | null {
  const usable = markets.filter((m) => (m.status === undefined || m.status === null || m.status === "OPEN") && (m.selections?.length ?? 0) > 0);
  return orderMarkets(usable).find((m) => rankOf(m) < RANK_BTTS) ?? null;
}