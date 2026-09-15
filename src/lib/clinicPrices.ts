// Clinic-listed treatment prices (clinic_treatments.price_from / price_unit). Pure functions.
//
// Every price comes from the clinic's own website (field_provenance.price_from.source =
// clinic_website_crawl, with the page URL and the price string as quoted). Reddit supplies quotes and
// regret reasons, never these prices; what Reddit users said they paid is a separate figure
// (treatment_reviews.cost_paid_usd) and is never merged with this one.
//
// A range is shown per price_unit, never mixing units, and only when at least MIN_PRICED_CLINICS
// listed clinics state a price in that unit.

export const MIN_PRICED_CLINICS = 3;

export const PRICE_UNIT_LABELS: Record<string, string> = {
  per_session: "per session",
  per_unit: "per unit",
  per_syringe: "per syringe",
  per_area: "per area",
};

function usd(n: number) {
  return `$${n.toLocaleString("en-US")}`;
}

// One clinic's price, e.g. "$450 per session", "$12 per unit", "From $500".
export function formatClinicPrice(price: number, unit: string | null): string {
  if (unit === "starting_from") return `From ${usd(price)}`;
  const label = unit ? PRICE_UNIT_LABELS[unit] : undefined;
  return label ? `${usd(price)} ${label}` : usd(price);
}

export type PricedLink = { clinicId: string; price_from: number | null; price_unit: string | null };

export type PriceRange = { unit: string; min: number; max: number; clinics: number };

// Ranges across the given links (callers pass listed clinics only), grouped by unit.
export function clinicPriceRanges(links: PricedLink[]): PriceRange[] {
  const byUnit = new Map<string, Map<string, number>>();
  for (const l of links) {
    if (l.price_from == null || !l.price_unit) continue;
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
