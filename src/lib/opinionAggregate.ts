// Shared opinion aggregation for tagged social review rows. Pure functions:
// no supabase, no React — rows in, numbers out. Used by the product page and
// the quiz result logic so the 10-tag floor and the rounding live in one place.

export const MIN_TAGGED = 10;

export const SENTIMENTS = ["positive", "negative", "mixed"] as const;

// 母数 rule: only positive, negative and mixed rows count; everything else is excluded.
export function isOpinionRow(row: any): boolean {
  return (SENTIMENTS as readonly string[]).includes(row?.sentiment);
}

// Recommend / Don't recommend / Mixed shares of one set of opinion rows. Each comes from its own count and the
// three are rounded with the largest-remainder method, so what the page shows always adds up to 100 and no
// figure is "the rest" of another.
export function opinionShares(pos: number, neg: number, mix: number): { pos: number; neg: number; mix: number } {
  const total = pos + neg + mix;
  if (total === 0) return { pos: 0, neg: 0, mix: 0 };
  const raw = [pos, neg, mix].map((n) => (n / total) * 100);
  const floor = raw.map(Math.floor);
  let left = 100 - floor.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => ({ i, r: v - Math.floor(v) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    floor[i] += 1;
    left -= 1;
  }
  return { pos: floor[0], neg: floor[1], mix: floor[2] };
}

export type OpinionAggregate = {
  pos: number;
  neg: number;
  mix: number;
  total: number;
  recommendPct: number | null;
  confidence: "High" | "Medium" | "Low";
};

export function aggregate(rows: any[]): OpinionAggregate {
  const pos = rows.filter((r) => r.sentiment === "positive").length;
  const neg = rows.filter((r) => r.sentiment === "negative").length;
  const mix = rows.length - pos - neg;
  const total = rows.length;
  return {
    pos,
    neg,
    mix,
    total,
    recommendPct: total > 0 ? opinionShares(pos, neg, mix).pos : null,
    confidence: total >= 50 ? "High" : total >= 10 ? "Medium" : "Low",
  };
}

// The 10-tag floor lives here and only here: pct is null below MIN_TAGGED.
export function bySkinType(rows: any[], skinType: string): { pct: number | null; n: number } {
  const matching = rows.filter((r) => isOpinionRow(r) && String(r.skin_type).toLowerCase() === skinType);
  const n = matching.length;
  return { pct: n >= MIN_TAGGED ? aggregate(matching).recommendPct : null, n };
}

export function byAgeBracket(rows: any[], ageKey: string): { pct: number | null; n: number } {
  const matching = rows.filter((r) => isOpinionRow(r) && String(r.age_bracket).toLowerCase() === ageKey);
  const n = matching.length;
  return { pct: n >= MIN_TAGGED ? aggregate(matching).recommendPct : null, n };
}

export const SKIN_TYPES = ["oily", "dry", "combination", "sensitive", "normal"] as const;
