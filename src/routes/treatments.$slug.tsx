import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, ExternalLink, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppFrame from "@/components/AppFrame";
import BottomNav from "@/components/BottomNav";
import TreatmentVoices from "@/components/TreatmentVoices";
import {
  breakdown, COUNTED_PLATFORMS, MIN_TREATMENT_REVIEWS, MIN_COST_VALUES, MAX_SENSITIVITY_POINTS, REGRET_LABELS, VERDICT_LABELS,
  type TreatmentQuoteRow, type TreatmentReviewRow, type VerdictCell,
} from "@/lib/treatmentReviews";
import { clinicPriceRanges, formatPriceRange, shownPrice } from "@/lib/clinicPrices";

export const Route = createFileRoute("/treatments/$slug")({
  component: TreatmentPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Skintea treatments` },
      { name: "description", content: "What this treatment is, how it works, and which LA clinics offer it." },
    ],
  }),
});

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const WARM_WHITE = "#FFFCF8";
const BORDER = "#E8DDD4";
const MUTED = "#999999";
const CREAM_TINT = "#F5EFEC";

type Treatment = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  category: string | null;
  what_it_is: string | null;
  how_it_works: string | null;
  who_its_for: string | null;
  downtime: string | null;
  average_cost: string | null;
  sessions_recommended: string | null;
};

type ClinicLink = {
  id: string;
  price_from: number | null;
  price_unit: string | null;
  field_provenance: any;
  clinics: {
    id: string;
    name: string;
    neighborhood: string | null;
  } | null;
};

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 9, fontWeight: 800, letterSpacing: "0.14em",
  textTransform: "uppercase", color: CRIMSON,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ padding: "16px", borderBottom: `0.5px solid ${BORDER}` }}>
      <div style={{ ...SECTION_LABEL, marginBottom: 10 }}>{title}</div>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ padding: "10px 0", borderBottom: `0.5px solid ${BORDER}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 3 }}>{label}</div>
      {value ? (
        <div style={{ fontSize: 13, lineHeight: 1.55, color: ESPRESSO, whiteSpace: "pre-line" }}>{value}</div>
      ) : (
        <div style={{ fontSize: 12, color: MUTED, fontStyle: "italic" }}>Not added yet.</div>
      )}
    </div>
  );
}

// Same card language as the product page's Majority / Minority bars.
function DataPending({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-brand-border rounded-[10px] px-[13px] py-3 bg-brand-cream">
      <div className="text-[10px] font-semibold text-brand-muted mb-[5px]">Not enough data yet</div>
      <div className="text-[11.5px] text-brand-muted leading-[1.55]">{children}</div>
    </div>
  );
}

function mixedNote(mixed: number) {
  return mixed > 0 ? `${mixed} mixed ${mixed === 1 ? "review" : "reviews"} not counted in the split.` : "";
}

function reviewsLabel(n: number) {
  return `based on ${n} ${n === 1 ? "review" : "reviews"}`;
}

// A percentage renders only when its own cell passes the sensitivity test (see treatmentReviews.ts),
// and always with the number of reviews it is based on.
// The count leads and the percentage is secondary (owner, 2026-09-16). The count is the evidence; the percentage is
// shown exactly as computed. Rounding to the nearest 5 was tried and removed: beside "21 of 40" a "55%" contradicted
// the count the reader could see, so it bought no honesty and created an inconsistency.

function VerdictBars({ cell, who }: { cell: VerdictCell; who: string }) {
  if (cell.gate !== "open" || cell.worthPct === null || cell.notWorthPct === null) {
    return (
      <DataPending>
        {cell.gate === "too_few" && (
          <>{cell.n} of {MIN_TREATMENT_REVIEWS} counted worth-it / not-worth-it reviews{who ? ` ${who}` : ""} needed. {mixedNote(cell.mixed)}</>
        )}
        {cell.gate === "no_comparison" && (
          <>Held: every counted review here was found by searching for regrets, so the figure cannot be checked for that bias yet.</>
        )}
        {cell.gate === "unstable" && (
          <>Held: leaving out the reviews found by searching for regrets moves this figure by {Math.round(cell.delta ?? 0)} points (more than {MAX_SENSITIVITY_POINTS}), so it is not stable yet.</>
        )}
      </DataPending>
    );
  }
  const cards = [
    { label: "Worth it", pct: cell.worthPct, count: cell.worth, barCls: "bg-brand-crimson" },
    { label: "Not worth it", pct: cell.notWorthPct, count: cell.notWorth, barCls: "bg-brand-crimson/40" },
  ];
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        {cards.map((c) => (
          <div key={c.label} className="bg-card border border-brand-border rounded-xl p-3.5">
            <div className="text-[11px] text-brand-muted mb-1">{c.label}</div>
            <div className="text-2xl font-semibold text-brand-espresso leading-none">{c.count} of {cell.n}</div>
            <div className="text-[12px] text-brand-muted mt-1">{c.pct}%</div>
            <div className="h-[3px] bg-brand-border rounded-sm mt-2 overflow-hidden">
              <div className={`h-full ${c.barCls}`} style={{ width: `${c.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-brand-muted mt-1.5">
        {reviewsLabel(cell.n).replace(/^b/, "B")}. {mixedNote(cell.mixed) || "No mixed reviews."}
      </div>
    </>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold text-brand-espresso mt-4 mb-2">{children}</div>;
}

function formatUsd(n: number) {
  return `$${n.toLocaleString("en-US")}`;
}

const QUOTE_PREVIEW = 5;
const VERDICT_CLS: Record<string, string> = {
  worth_it: "text-emerald-700",
  not_worth_it: "text-brand-crimson",
  mixed: "text-brand-muted",
};

// Reddit quotes for this treatment. Each card shows the stored text exactly, its verdict, the
// subreddit and a link to the original. Age and price appear only when the row records them;
// no username is read or shown. With no rows the section is not rendered at all.
function QuoteSection({ rows }: { rows: TreatmentQuoteRow[] }) {
  const [expanded, setExpanded] = useState(false);
  if (rows.length === 0) return null;
  const shown = expanded ? rows : rows.slice(0, QUOTE_PREVIEW);
  // Rendered inside "What people say", directly under the Worth it? figure (owner, 2026-09-16): the quotes are the
  // evidence for that figure, so they sit next to it rather than two sections below.
  return (
    <>
      <SubLabel>In their words</SubLabel>
      <div className="flex flex-col gap-2">
        {shown.map((q) => {
          const verdict = q.verdict ? VERDICT_LABELS[q.verdict] : null;
          return (
            <a key={q.id} href={q.source_url!} target="_blank" rel="noopener noreferrer" className="no-underline">
              <div className="bg-card border border-brand-border rounded-[10px] px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  {q.subreddit ? (
                    <span style={SECTION_LABEL}>r/{q.subreddit}</span>
                  ) : <span />}
                  {verdict && (
                    <span className={`flex items-center gap-1 ${VERDICT_CLS[q.verdict!] ?? "text-brand-muted"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
                      <span className="text-[10px]">{verdict}</span>
                    </span>
                  )}
                </div>
                <div className="text-xs text-brand-espresso leading-[1.55] mt-1.5 whitespace-pre-line">{q.content}</div>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <span className="flex flex-wrap items-center gap-1.5">
                    {q.age_bracket != null && (
                      <span className="text-[10px] bg-brand-cream text-brand-muted border border-brand-border rounded-full px-2 py-0.5">
                        Age: {q.age_bracket}
                      </span>
                    )}
                    {q.cost_paid_usd != null && (
                      <span className="text-[10px] bg-brand-cream text-brand-muted border border-brand-border rounded-full px-2 py-0.5">
                        Paid {formatUsd(q.cost_paid_usd)}
                      </span>
                    )}
                    <span className="text-[10px] text-brand-muted">Quoted as written</span>
                  </span>
                  <span className="flex items-center gap-[3px] text-[10px] text-brand-muted shrink-0">
                    Read on Reddit <ExternalLink width={10} height={10} />
                  </span>
                </div>
              </div>
            </a>
          );
        })}
        {rows.length > QUOTE_PREVIEW && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="self-start text-[11px] font-semibold text-brand-crimson bg-transparent border-0 p-0 mt-1 cursor-pointer"
          >
            {expanded ? "Show fewer" : `Show all ${rows.length} quotes`}
          </button>
        )}
        <div className="text-[10px] text-brand-muted mt-0.5 leading-[1.4]">
          {shown.length === rows.length ? rows.length : `${shown.length} of ${rows.length}`} {rows.length === 1 ? "quote" : "quotes"} from Reddit, each copied exactly from part of a post or comment. Tap one to read the original. Quotes are not a vote count.
        </div>
      </div>
    </>
  );
}

function TreatmentPage() {
  const { slug } = Route.useParams();
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [links, setLinks] = useState<ClinicLink[]>([]);
  const [reviewRows, setReviewRows] = useState<TreatmentReviewRow[]>([]);
  const [quoteRows, setQuoteRows] = useState<TreatmentQuoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: t } = await supabase
        .from("treatments")
        .select("id, slug, name, subtitle, category, what_it_is, how_it_works, who_its_for, downtime, average_cost, sessions_recommended")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();
      if (!alive) return;
      setTreatment((t as Treatment | null) ?? null);
      if (t) {
        const { data: ct } = await supabase
          .from("clinic_treatments")
          .select("id, price_from, price_unit, field_provenance, clinics!inner(id, name, neighborhood, listing_filter)")
          .eq("treatment_id", (t as any).id)
          .eq("clinics.listing_filter", "passed");
        if (!alive) return;
        const rows = ((ct as any[]) ?? []).filter((r) => r.clinics) as ClinicLink[];
        rows.sort((a, b) => a.clinics!.name.localeCompare(b.clinics!.name));
        setLinks(rows);
        const { data: tr } = await (supabase as any)
          .from("treatment_reviews")
          .select("verdict, is_first_time, sensitive_skin, regret_reason, cost_paid_usd, tag_confidence, tagged_at, platform, query:field_provenance->detail->>query")
          .eq("treatment_id", (t as any).id)
          .in("platform", [...COUNTED_PLATFORMS]) // allowlist, also enforced row by row in isCountedReview
          .not("tagged_at", "is", null);
        if (!alive) return;
        setReviewRows(((tr as any[]) ?? []) as TreatmentReviewRow[]);
        // Quotes: every Reddit row with text and a link, low confidence included. Newest first.
        const { data: qr } = await (supabase as any)
          .from("treatment_reviews")
          .select("id, content, verdict, subreddit, source_url, age_bracket, cost_paid_usd, created_at")
          .eq("treatment_id", (t as any).id)
          .eq("platform", "reddit")
          .not("content", "is", null)
          .not("source_url", "is", null)
          .order("created_at", { ascending: false });
        if (!alive) return;
        setQuoteRows(((qr as any[]) ?? []) as TreatmentQuoteRow[]);
      } else {
        setLinks([]);
        setReviewRows([]);
        setQuoteRows([]);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [slug]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: MUTED, fontSize: 12, background: WARM_WHITE, minHeight: "100vh" }}>Loading…</div>;
  }
  if (!treatment) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: MUTED, fontSize: 12, background: WARM_WHITE, minHeight: "100vh" }}>
        Treatment not found. <Link to="/treatments" style={{ color: CRIMSON, fontWeight: 700 }}>All treatments →</Link>
      </div>
    );
  }

  return (
    <AppFrame>
      <div style={{ background: WARM_WHITE, minHeight: "100vh", color: ESPRESSO, fontFamily: "system-ui, -apple-system, sans-serif", paddingBottom: 80 }}>
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: WARM_WHITE, borderBottom: `0.5px solid ${BORDER}`, padding: "12px 16px" }}>
          <Link to="/treatments" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: ESPRESSO, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            <ArrowLeft size={16} /> Treatments
          </Link>
        </div>

        <div style={{ padding: "16px", borderBottom: `0.5px solid ${BORDER}` }}>
          {treatment.category && <div style={SECTION_LABEL}>{treatment.category}</div>}
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "4px 0 0" }}>{treatment.name}</h1>
          {treatment.subtitle && <div style={{ fontSize: 13, color: MUTED, marginTop: 4, lineHeight: 1.45 }}>{treatment.subtitle}</div>}
        </div>

        {(() => {
          // Only fields that have a value render; with none, one line says so (owner, 2026-09-16).
          const about = [
            { label: "What it is", value: treatment.what_it_is },
            { label: "How it works", value: treatment.how_it_works },
            { label: "Who it's for", value: treatment.who_its_for },
            { label: "Downtime", value: treatment.downtime },
            { label: "Average cost", value: treatment.average_cost },
            { label: "Sessions recommended", value: treatment.sessions_recommended },
          ].filter((f) => f.value);
          return (
            <Section title="About this treatment">
              {about.length === 0 ? (
                <div style={{ fontSize: 12, color: MUTED, fontStyle: "italic" }}>Details not added yet.</div>
              ) : (
                about.map((f) => <Field key={f.label} label={f.label} value={f.value} />)
              )}
            </Section>
          );
        })()}

        {/*
          Who has talked about it — celebrity / influencer evidence, between "About this
          treatment" and "What people say". Treatment-scoped only: these rows are never
          joined to a clinic and never link to one.
        */}
        <TreatmentVoices treatmentId={treatment.id} />

        {/*
          Opinion figures come only from tagged treatment_reviews rows for this treatment
          (treatments.majority_pct / results_pct / minority_opinion are not read). The axis is
          verdict, first time vs repeat, regret reason, sensitive skin and price paid, because
          people reviewing treatments rarely state a skin type. Only high- and medium-confidence
          rows are counted; low-confidence rows appear as quotes only. Each verdict cell shows a
          percentage only when it passes the sensitivity test (>= 10 counted rows, and removing
          regret-seeking rows moves Worth it by <= 10 points), always with its sample size. Regret
          reasons are counts, not shares. Never hide this section.
        */}
        {(() => {
          const br = breakdown(reviewRows);
          return (
            <Section title="What people say">
              <SubLabel>Worth it?</SubLabel>
              <VerdictBars cell={br.overall} who="" />

              <QuoteSection rows={quoteRows} />

              {(() => {
                // A breakdown that clears its gate renders in full. Every held one is listed in ONE line instead of a
                // dashed card each (owner, 2026-09-16); the counts in the line are the counts the cards showed.
                const cells = [
                  { key: "first", label: "First time", short: "first-timers", cell: br.firstTime, who: "from first-timers" },
                  { key: "repeat", label: "Had it before", short: "repeat patients", cell: br.repeat, who: "from repeat patients" },
                  { key: "sensitive", label: "Sensitive skin", short: "sensitive skin", cell: br.sensitive, who: "from people with sensitive skin" },
                ];
                const heldText = (c: VerdictCell) =>
                  c.gate === "too_few" ? `${c.n}/${MIN_TREATMENT_REVIEWS}` : c.gate === "unstable" ? "held, not stable" : "held";
                const regretsOpen = br.regrets.named >= MIN_TREATMENT_REVIEWS && br.regrets.top.length > 0;
                const held = cells.filter((c) => c.cell.gate !== "open").map((c) => `${c.short} ${heldText(c.cell)}`);
                if (!regretsOpen) held.push(`top regrets ${br.regrets.named}/${MIN_TREATMENT_REVIEWS}`);
                return (
                  <>
                    {cells.filter((c) => c.cell.gate === "open").map((c) => (
                      <div key={c.key}>
                        <SubLabel>{c.label}</SubLabel>
                        <VerdictBars cell={c.cell} who={c.who} />
                      </div>
                    ))}
                    {regretsOpen && (
                      <>
                        <SubLabel>Top regrets</SubLabel>
                        <div className="bg-card border border-brand-border rounded-xl p-3.5">
                          {br.regrets.top.map((r) => (
                            <div key={r.reason} className="flex justify-between text-xs text-brand-espresso py-1">
                              <span>{REGRET_LABELS[r.reason] ?? r.reason}</span>
                              <span className="text-brand-muted">{r.count} {r.count === 1 ? "review" : "reviews"}</span>
                            </div>
                          ))}
                          <div className="text-[10px] text-brand-muted mt-1.5 leading-[1.4]">
                            How many reviews name each reason. A count, not a share: some reviews were found by searching for regrets.
                          </div>
                        </div>
                      </>
                    )}
                    {held.length > 0 && (
                      <div className="text-[11px] text-brand-muted mt-4 leading-[1.5]">
                        Not enough counted reviews yet for: {held.join(" · ")}
                      </div>
                    )}
                  </>
                );
              })()}
            </Section>
          );
        })()}

        {/*
          Price. Two different facts, never merged: what listed clinics state on their own websites
          (clinic_treatments, clinic_website_crawl evidence; a range per unit only with >= 3 listed
          clinics, otherwise nothing), and what Reddit users said they paid (treatment_reviews
          .cost_paid_usd, 5-value floor), shown below it.
        */}
        {(() => {
          const ranges = clinicPriceRanges(links.map((l) => ({ clinicId: l.clinics!.id, price_from: l.price_from, price_unit: l.price_unit, field_provenance: l.field_provenance })));
          const cost = breakdown(reviewRows).cost;
          return (
            <Section title="Price">
              {ranges.length > 0 && (
                <>
                  <SubLabel>Listed by clinics</SubLabel>
                  <div className="bg-card border border-brand-border rounded-xl p-3.5 flex flex-col gap-1.5">
                    {ranges.map((r) => (
                      <div key={r.unit} className="text-xs text-brand-espresso">{formatPriceRange(r)}</div>
                    ))}
                    <div className="text-[10px] text-brand-muted leading-[1.4]">
                      Prices as stated on each clinic's own website, on the date shown with each clinic below. Units are
                      never mixed in one range, and a price older than 120 days is left out until it is checked again.
                    </div>
                  </div>
                </>
              )}
              <SubLabel>What people said they paid</SubLabel>
              {cost.enough ? (
                <div className="bg-card border border-brand-border rounded-xl p-3.5">
                  <div className="text-[11px] text-brand-muted mb-1">Median <span className="text-[10px]">· {cost.n} prices reported on Reddit</span></div>
                  <div className="text-3xl font-semibold text-brand-espresso leading-none">
                    {cost.medianLow === cost.medianHigh ? formatUsd(cost.medianLow) : `${formatUsd(cost.medianLow)}–${formatUsd(cost.medianHigh)}`}
                  </div>
                  <div className="text-xs text-brand-espresso mt-2">Range {formatUsd(cost.min)} to {formatUsd(cost.max)}</div>
                  {cost.medianLow !== cost.medianHigh && (
                    <div className="text-[11px] text-brand-muted mt-1">Even number of prices: the two middle prices are shown, not an average of them.</div>
                  )}
                </div>
              ) : (
                <DataPending>{cost.n} of {MIN_COST_VALUES} prices reported on Reddit needed.</DataPending>
              )}
            </Section>
          );
        })()}

        <Section title={`Clinics offering ${treatment.name}`}>
          {links.length === 0 ? (
            <div style={{ background: CREAM_TINT, borderRadius: 10, padding: "14px 12px" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: ESPRESSO }}>No listed clinics yet</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 4, lineHeight: 1.5 }}>
                No clinic we list is linked to {treatment.name} yet. <Link to="/clinics" style={{ color: CRIMSON, fontWeight: 700 }}>Browse all clinics →</Link>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/*
                Cards link only to the Skintea clinic page. No outbound website or booking
                links here: the visitor would leave before intent is captured, and most
                website_url values come from the Google Maps scrape that is on hold.
                clinic_view is recorded by the clinic page itself, once per mount.
              */}
              {links.map((l) => {
                const c = l.clinics!;
                const price = shownPrice(l.price_from, l.price_unit, l.field_provenance);
                return (
                  <div key={l.id} style={{ background: "#FFFFFF", border: `0.5px solid ${BORDER}`, borderRadius: 10 }}>
                    <Link
                      to="/clinics/$id"
                      params={{ id: c.id }}
                      style={{ padding: 12, display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: ESPRESSO }}>{c.name}</div>
                        {c.neighborhood && (
                          <div style={{ fontSize: 11, color: MUTED, marginTop: 3, display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <MapPin size={11} /> {c.neighborhood}
                          </div>
                        )}
                        {price && (
                          <div style={{ fontSize: 12, fontWeight: 800, color: CRIMSON, marginTop: 4 }}>{price.text}</div>
                        )}
                      </div>
                      <ChevronRight size={16} color={MUTED} />
                    </Link>
                    {/*
                      The price's date and its evidence page. Outside the card Link, because an anchor cannot be nested
                      inside another. A stale price (over 120 days) is not rendered at all, so there is no line here.
                    */}
                    {price && (
                      <div style={{ padding: "0 12px 10px", fontSize: 10, color: MUTED }}>
                        {price.url ? (
                          <a href={price.url} target="_blank" rel="noopener noreferrer" style={{ color: MUTED, display: "inline-flex", alignItems: "center", gap: 3 }}>
                            {price.dateLabel} <ExternalLink width={10} height={10} />
                          </a>
                        ) : (
                          price.dateLabel
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <BottomNav />
      </div>
    </AppFrame>
  );
}
