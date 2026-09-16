// Aggregation for tagged treatment_reviews. Pure functions: rows in, counts out.
// Treatments break down by verdict, first time vs repeat, regret reason, sensitive skin
// and what people paid, never by the five product skin types.
//
// Rules:
// - Counted rows are tagged (tagged_at not null) with tag_confidence high or medium. Low-confidence
//   rows are quotes only: they never enter a percentage, a count, a median or a floor check.
// - A verdict percentage (overall, first time, repeat, sensitive skin) is shown only when its own
//   cell passes the SENSITIVITY TEST, computed here from the rows at render time:
//     (a) at least MIN_TAGGED counted worth_it / not_worth_it rows, and
//     (b) recomputing Worth it with every regret-seeking row removed (the row's search query
//         contains "regret") moves it by MAX_SENSITIVITY_POINTS or less, and
//     (c) at least MIN_TREATMENT_REVIEWS counted rows in that cell (owner, 2026-09-15). This floor
//         sits underneath the sensitivity test, it does not replace it: treatments are costly and
//         invasive, and (b) cannot see a bias that the whole corpus shares. Neither check detects
//         that this corpus was collected with "regret" / "worth it" / "before and after honest"
//         query shapes, so it is skewed by construction: 30 skewed rows are still skewed. No
//         verdict percentage ships from this corpus until it is re-collected with neutral shapes
//         mixed in ("<treatment> experience", "<treatment> results", "got <treatment>").
//         See a3/reddit/TREATMENT_HANDOFF_2026-09-15.md in the pipeline repo.
//   The figure shown is computed from ALL counted rows; (b) only checks that the suspect rows are
//   not what makes the number. The share of regret-seeking rows is not the test: on 2026-09-15
//   botox had a 32% regret share and moved 4 points, fillers had 33% and moved 21.
//   See docs/db-changelog.md, 2026-09-15 "sensitivity test".
// - Every percentage renders with its sample size. Regret reasons are counts, never shares.
//   Price paid (median and range) needs MIN_COST_VALUES values. Nothing is interpolated,
//   estimated, or derived from another figure.
import { MIN_TAGGED, opinionShares } from "./opinionAggregate";

export { MIN_TAGGED };
export const MIN_COST_VALUES = 5;
export const MAX_SENSITIVITY_POINTS = 10;
// Second check under the sensitivity test, for treatment pages only. The product page keeps MIN_TAGGED.
export const MIN_TREATMENT_REVIEWS = 30;

export type TreatmentReviewRow = {
  verdict: string | null;
  is_first_time: boolean | null;
  sensitive_skin: boolean | null;
  regret_reason: string | null;
  cost_paid_usd: number | null;
  tag_confidence: string | null;
  tagged_at: string | null;
  query: string | null; // field_provenance->'detail'->>'query': the search that found the row
};

// Counted rows: tagged, and tagged with high or medium confidence.
export function isCountedReview(r: TreatmentReviewRow): boolean {
  return r.tagged_at != null && (r.tag_confidence === "high" || r.tag_confidence === "medium");
}

export function isRegretSeeking(r: TreatmentReviewRow): boolean {
  return /regret/i.test(r.query ?? "");
}

export type GateState =
  | "open"
  | "too_few" // fewer than MIN_TAGGED, or fewer than MIN_TREATMENT_REVIEWS, counted worth_it / not_worth_it rows
  | "no_comparison" // every counted row came from a regret-seeking query, so (b) cannot be run
  | "unstable"; // removing regret-seeking rows moves Worth it by more than MAX_SENSITIVITY_POINTS

export type VerdictCell = {
  worth: number;
  notWorth: number;
  mixed: number;
  n: number; // worth + notWorth: the percentage's denominator (mixed is excluded)
  nExRegret: number;
  worthPctAll: number | null; // exact, all counted rows
  worthPctExRegret: number | null; // exact, regret-seeking rows removed
  delta: number | null; // |worthPctAll - worthPctExRegret| in percentage points, exact
  gate: GateState;
  worthPct: number | null; // displayed (largest-remainder rounding of all counted rows), only when open
  notWorthPct: number | null;
};

export function verdictCell(rows: TreatmentReviewRow[]): VerdictCell {
  const vr = rows.filter((r) => r.verdict === "worth_it" || r.verdict === "not_worth_it");
  const worth = vr.filter((r) => r.verdict === "worth_it").length;
  const notWorth = vr.length - worth;
  const mixed = rows.filter((r) => r.verdict === "mixed").length;
  const n = vr.length;
  const ex = vr.filter((r) => !isRegretSeeking(r));
  const nExRegret = ex.length;
  const worthPctAll = n > 0 ? (100 * worth) / n : null;
  const worthPctExRegret = nExRegret > 0 ? (100 * ex.filter((r) => r.verdict === "worth_it").length) / nExRegret : null;
  const delta = worthPctAll !== null && worthPctExRegret !== null ? Math.abs(worthPctAll - worthPctExRegret) : null;
  const gate: GateState =
    n < MIN_TAGGED ? "too_few"
      : delta === null ? "no_comparison"
      : delta > MAX_SENSITIVITY_POINTS ? "unstable"
      : n < MIN_TREATMENT_REVIEWS ? "too_few" // passes the sensitivity test, still under the floor
      : "open";
  // Largest-remainder rounding of two own counts (mix = 0), same as the product page.
  const shares = gate === "open" ? opinionShares(worth, notWorth, 0) : null;
  return {
    worth, notWorth, mixed, n, nExRegret, worthPctAll, worthPctExRegret, delta, gate,
    worthPct: shares ? shares.pos : null, notWorthPct: shares ? shares.neg : null,
  };
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
  named: number; // counted reviews that name a regret reason other than 'none'; needs MIN_TREATMENT_REVIEWS to render
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
