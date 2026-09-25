"use client";

// Picks the editable marketHelp template for a market selection and fills it in.
// Texts live in src/i18n/{en,am}.json under "marketHelp" — edit them there.

export type HelpSelection = {
  marketKey?: string | null;
  marketType: string;
  marketName?: string | null;
  selectionName: string;
  homeTeam: string;
  awayTeam: string;
};

const has = (hay: string, ...needles: string[]) => needles.some((n) => hay.includes(n));

export function marketHelpTemplateKey(sel: HelpSelection): string {
  const hay = `${sel.marketKey ?? ""} ${sel.marketName ?? ""} ${sel.marketType}`.toLowerCase();
  const pick = sel.selectionName.trim();
  const isDraw = /^(draw|x)$/i.test(pick);
  // Corner / card markets count corners or bookings - never goals. Check first
  // so they don't fall into the totals/spreads explanations below.
  if (has(hay, "corner")) return "CORNERS";
  if (has(hay, "card")) return "CARDS";
  if (has(hay, "draw_no_bet", "draw no bet")) return "DRAW_NO_BET";
  if (has(hay, "double_chance", "double chance")) return "DOUBLE_CHANCE";
  if (has(hay, "h2h_lay", " lay ", "(lay)")) return "MATCH_WINNER_LAY";
  if (has(hay, "btts")) return has(hay, "h1", "first half") ? "BTTS_H1" : "BTTS";
  if (has(hay, "correct_score", "correct score")) return has(hay, "h1", "first half", "half time") ? "CORRECT_SCORE_H1" : "CORRECT_SCORE";
  if (has(hay, "halftime_fulltime", "half-time/full-time", "half time/full time", "ht/ft", "htft")) return "HTFT";
  if (has(hay, "totals", "over/under", "over under")) {
    if (has(hay, "h1", "first half")) return "OVER_UNDER_H1";
    if (has(hay, "h2", "second half")) return "OVER_UNDER_H2";
    if (has(hay, "team_totals", "team totals")) return "TEAM_TOTALS";
    return "OVER_UNDER";
  }
  if (has(hay, "spread", "handicap")) return "HANDICAP";
  if (has(hay, "h2h_h1", "first half winner")) return "FIRST_HALF_WINNER";
  if (has(hay, "h2h_h2", "second half winner")) return "SECOND_HALF_WINNER";
  if (has(hay, "outright")) return "OUTRIGHT";
  const type = sel.marketType.toUpperCase();
  if (type === "MATCH_WINNER") return isDraw ? "MATCH_WINNER_DRAW" : "MATCH_WINNER";
  if (type === "OVER_UNDER") return "OVER_UNDER";
  if (type === "HANDICAP") return "HANDICAP";
  if (type === "BOTH_TEAMS_TO_SCORE") return "BTTS";
  if (type === "CORRECT_SCORE") return "CORRECT_SCORE";
  if (type === "HALFTIME_FULLTIME") return "HTFT";
  if (type === "OUTRIGHT") return "OUTRIGHT";
  if (type === "PLAYER_PROP") return "PLAYER_PROP";
  if (type === "CUSTOM") return "CUSTOM";
  return "DEFAULT";
}

/** First decimal/integer found in the selection or market name (the goals line), if any. */
export function extractLine(sel: HelpSelection): string {
  const m = `${sel.selectionName} ${sel.marketName ?? ""}`.match(/(\d+(?:\.\d+)?)/);
  return m ? m[1] : "";
}

export type HelpText = { key: string; title: string; body: string };

export function marketHelpText(
  t: (key: string, vars?: Record<string, string | number>) => string,
  sel: HelpSelection
): HelpText {
  const key = marketHelpTemplateKey(sel);
  const line = extractLine(sel);
  const vars = {
    pick: sel.selectionName,
    home: sel.homeTeam,
    away: sel.awayTeam,
    line,
    lineText: line ? ` (${t("lineWord")} ${line})` : "",
  };
  return { key, title: t(`${key}.title`, vars), body: t(`${key}.body`, vars) };
}
