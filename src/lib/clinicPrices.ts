// Clinic-listed treatment prices (clinic_treatments.price_from / price_unit). Pure functions.
//
// Every price comes from the clinic's own website (field_provenance.price_from.source = clinic_website_crawl, with the
// page URL, the crawl date and the price string as quoted) or, in future, from the clinic itself (clinic_supplied, with
// who sent it and when in the detail). Reddit supplies quotes and regret reasons, never these prices; what Reddit users
// said they paid (treatment_reviews.cost_paid_usd) is a separate figure and is never merged with this one.
//
// A price goes stale. A published price that is wrong damages the clinic relationship, so:
//   - every price renders with the date it was recorded and a link to the evidence page;
//   - a price recorded more than MAX_PRICE_AGE_DAYS ago, or with no readable date, is HIDDEN everywhere
//     (per-clinic lines and ranges alike) until it is re-verified. Nothing re-crawls automatically.
//
// A range is shown per price_unit, never mixing units, and only when at least MIN_PRICED_CLINICS listed clinics state a
// fresh price in that unit.

export const MIN_PRICED_CLINICS = 3;
export const MAX_PRICE_AGE_DAYS = 120;

export const PRICE_UNIT_LABELS: Record<string, string> = {
  per_session: "per session",
  per_unit: "per unit",
  per_syringe: "per syringe",
  per_area: "per area",
};

function usd(n: number) {
  // Prices are numeric(10,2): whole dollars show as $450, cents as $12.50.
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

// One clinic's price, e.g. "$450 per session", "$12.50 per unit", "From $500".
export function formatClinicPrice(price: number, unit: string | null): string {
  if (unit === "starting_from") return `From ${usd(price)}`;
  const label = unit ? PRICE_UNIT_LABELS[unit] : undefined;
  return label ? `${usd(price)} ${label}` : usd(price);
}

export type PriceProvenance = { recordedAt: string | null; url: string | null };

// field_provenance.price_from as stored by the price backfill.
export function priceProvenance(fieldProvenance: any): PriceProvenance {
  const p = fieldProvenance?.price_from ?? null;
  return { recordedAt: typeof p?.recorded_at === "string" ? p.recorded_at : null, url: typeof p?.url === "string" ? p.url : null };
}

export function priceAgeDays(recordedAt: string | null, now: Date = new Date()): number | null {
  if (!recordedAt) return null;
  const t = Date.parse(recordedAt);
  if (Number.isNaN(t)) return null;
  return Math.floor((now.getTime() - t) / 86400000);
}

// A price with no readable date is treated as stale: it cannot be shown with a date, so it is not shown.
export function isPriceFresh(recordedAt: string | null, now: Date = new Date()): boolean {
  const age = priceAgeDays(recordedAt, now);
  return age !== null && age >= 0 && age <= MAX_PRICE_AGE_DAYS;
}

// "15 Sep 2026". The month names are fixed here rather than left to the viewer's locale, which renders
// September as "Sept" and other months differently from one browser to the next.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatPriceDate(recordedAt: string | null): string | null {
  if (!recordedAt) return null;
  const t = Date.parse(recordedAt);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export type PricedLink = {
  clinicId: string;
  price_from: number | null;
  price_unit: string | null;
  field_provenance?: any;
};

export type PriceRange = { unit: string; min: number; max: number; clinics: number };

// Ranges across the given links (callers pass listed clinics only), grouped by unit. Stale prices are left out.
export function clinicPriceRanges(links: PricedLink[], now: Date = new Date()): PriceRange[] {
  const byUnit = new Map<string, Map<string, number>>();
  for (const l of links) {
    if (l.price_from == null || !l.price_unit) continue;
    if (!isPriceFresh(priceProvenance(l.field_provenance).recordedAt, now)) continue;
    const m = byUnit.get(l.price_unit) ?? new Map<string, number>();
    // One price per clinic per unit: a clinic has one link per treatment, so this never averages.
    m.set(l.clinicId, Math.min(m.get(l.clinicId) ?? Infinity, l.price_from));
    byUnit.set(l.price_unit, m);
  }
  const out: PriceRange[] = [];
  for (const [unit, m] of byUnit) {
    if (m.size < MIN_PRICED_CLINICS) continue;
    const v = [...m.values()];
    out.push({ unit, min: Math.min(...v), max: Math.max(...v), clinics: m.size });
  }
  return out.sort((a, b) => b.clinics - a.clinics || a.unit.localeCompare(b.unit));
}

// e.g. "From $450 to $900 per session, across 7 listed clinics"; "Starting prices from $325 to $500, across 3 listed clinics".
export function formatPriceRange(r: PriceRange): string {
  const across = `across ${r.clinics} listed clinics`;
  if (r.unit === "starting_from") {
    return r.min === r.max ? `Starting at ${usd(r.min)}, ${across}` : `Starting prices from ${usd(r.min)} to ${usd(r.max)}, ${across}`;
  }
  const label = PRICE_UNIT_LABELS[r.unit] ?? r.unit;
  return r.min === r.max ? `${usd(r.min)} ${label}, ${across}` : `From ${usd(r.min)} to ${usd(r.max)} ${label}, ${across}`;
}

// What one clinic's price line should render, or null when the price must stay hidden.
export type ShownPrice = { text: string; dateLabel: string; url: string | null };

export function shownPrice(
  price_from: number | null,
  price_unit: string | null,
  fieldProvenance: any,
  now: Date = new Date(),
): ShownPrice | null {
  if (price_from == null) return null;
  const { recordedAt, url } = priceProvenance(fieldProvenance);
  if (!isPriceFresh(recordedAt, now)) return null;
  const date = formatPriceDate(recordedAt);
  if (!date) return null;
  return { text: formatClinicPrice(price_from, price_unit), dateLabel: `as listed on their site, ${date}`, url };
}
