// Aggregation for tagged treatment_reviews. Pure functions: rows in, counts out.
// Treatments break down by verdict, first time vs repeat, regret reason, sensitive skin
// and what people paid, never by the five product skin types.
//
// Rules:
// - Counted rows are tagged (tagged_at not null) with tag_confidence high or medium. Low-confidence
//   rows are quotes only: they never enter a percentage, a count, a median or a floor check.
// - Verdict percentages (overall, first time vs repeat, sensitive skin) are HELD. The first Reddit
//   batch was collected with five query shapes, one of which is "<treatment> regret", so the
//   worth-it / not-worth-it ratio is skewed toward negatives before anything is tagged. The review
//   floor guards volume, not bias. Lift VERDICT_PERCENTAGES_HELD only after a rebalanced batch
//   (regret-seeking shapes at most 20% of runs) has been re-reported; see docs/db-changelog.md,
//   2026-09-15 "treatment review percentages held".
// - Regret reasons are shown as counts, never as shares. Price paid (median and range) needs
//   MIN_COST_VALUES values. Every figure comes from its own counts: nothing is interpolated,
//   estimated, or derived from another figure.
import { MIN_TAGGED, opinionShares } from "./opinionAggregate";

export { MIN_TAGGED };
export const MIN_COST_VALUES = 5;
export const VERDICT_PERCENTAGES_HELD = true;

export type TreatmentReviewRow = {
  verdict: string | null;
  is_first_time: boolean | null;
  sensitive_skin: boolean | null;
  regret_reason: string | null;
  cost_paid_usd: number | null;
  tag_confidence: string | null;
  tagged_at: string | null;
};

// Counted rows: tagged, and tagged with high or medium confidence.
export function isCountedReview(r: TreatmentReviewRow): boolean {
  return r.tagged_at != null && (r.tag_confidence === "high" || r.tag_confidence === "medium");
}

export type VerdictCell = {
  worth: number;
  notWorth: number;
  mixed: number;
  n: number; // worth + notWorth: the bar's denominator (mixed is excluded from the bar)
  worthPct: number | null;
  notWorthPct: number | null;
};

export function verdictCell(rows: TreatmentReviewRow[]): VerdictCell {
  const worth = rows.filter((r) => r.verdict === "worth_it").length;
  const notWorth = rows.filter((r) => r.verdict === "not_worth_it").length;
  const mixed = rows.filter((r) => r.verdict === "mixed").length;
  const n = worth + notWorth;
  // Largest-remainder rounding of two own counts (mix = 0), same as the product page.
  const shares = !VERDICT_PERCENTAGES_HELD && n >= MIN_TAGGED ? opinionShares(worth, notWorth, 0) : null;
  return { worth, notWorth, mixed, n, worthPct: shares ? shares.pos : null, notWorthPct: shares ? shares.neg : null };
}

// Quote rows: every row with text and a source link, low confidence included. Only columns the
// quote card renders are read; author_handle is never selected.
export type TreatmentQuoteRow = {
  id: string;
  content: string | null;
  verdict: string | null;
  subreddit: string | null;
  source_url: string | null;
  age_bracket: string | null;
  cost_paid_usd: number | null;
  created_at: string | null;
};

export const VERDICT_LABELS: Record<string, string> = {
  worth_it: "Worth it",
  not_worth_it: "Not worth it",
  mixed: "Mixed",
};

export const REGRET_LABELS: Record<string, string> = {
  downtime: "Downtime",
  pain: "Pain",
  cost: "Cost",
  sessions_needed: "Needed more sessions",
  no_result: "No visible result",
  side_effect: "Side effect",
  wrong_provider: "Wrong provider",
};

export type RegretSummary = {
  named: number; // counted reviews that name a regret reason other than 'none'
  top: { reason: string; count: number }[];
};

export function regretSummary(rows: TreatmentReviewRow[]): RegretSummary {
  const counts = new Map<string, number>();
  let named = 0;
  for (const r of rows) {
    if (r.regret_reason == null || r.regret_reason === "none") continue;
    named++;
    counts.set(r.regret_reason, (counts.get(r.regret_reason) ?? 0) + 1);
  }
  const top = [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason))
    .slice(0, 3);
  return { named, top };
}

export type CostSummary =
  | { n: number; enough: false }
  | { n: number; enough: true; min: number; max: number; medianLow: number; medianHigh: number };

// Median without interpolation: an odd count has one middle value; an even count reports the two
// middle values that were actually paid instead of inventing their average.
export function costSummary(rows: TreatmentReviewRow[]): CostSummary {
  const values = rows
    .map((r) => r.cost_paid_usd)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    .sort((a, b) => a - b);
  const n = values.length;
  if (n < MIN_COST_VALUES) return { n, enough: false };
  const mid = Math.floor(n / 2);
  const medianLow = n % 2 === 1 ? values[mid] : values[mid - 1];
  const medianHigh = values[mid];
  return { n, enough: true, min: values[0], max: values[n - 1], medianLow, medianHigh };
}

export function breakdown(allRows: TreatmentReviewRow[]) {
  const rows = allRows.filter(isCountedReview);
  return {
    tagged: rows.length,
    overall: verdictCell(rows),
    firstTime: verdictCell(rows.filter((r) => r.is_first_time === true)),
    repeat: verdictCell(rows.filter((r) => r.is_first_time === false)),
    sensitive: verdictCell(rows.filter((r) => r.sensitive_skin === true)),
    regrets: regretSummary(rows),
    cost: costSummary(rows),
  };
}
