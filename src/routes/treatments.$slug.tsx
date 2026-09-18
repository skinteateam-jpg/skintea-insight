import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronRight, ExternalLink, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppFrame from "@/components/AppFrame";
import BottomNav from "@/components/BottomNav";
import TreatmentCelebrityLine from "@/components/TreatmentCelebrityLine";
import TreatmentMembers from "@/components/TreatmentMembers";
import TreatmentVideos from "@/components/TreatmentVideos";
import TreatmentTea, { type TeaPostRow } from "@/components/TreatmentTea";
import { useMyUsername, useTalkAuthors } from "@/lib/talkAuthors";
import {
  breakdown, COUNTED_PLATFORMS, MIN_TREATMENT_REVIEWS, MIN_COST_VALUES, MAX_SENSITIVITY_POINTS, REGRET_LABELS, VERDICT_LABELS,
  type TreatmentQuoteRow, type TreatmentReviewRow, type VerdictCell,
} from "@/lib/treatmentReviews";
import { clinicPriceRanges, formatPriceRange, shownPrice } from "@/lib/clinicPrices";
import { excerptStart, excerptTerms } from "@/lib/quoteExcerpt";

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
  who_its_not_for: string | null;
  downtime: string | null;
  results_duration: string | null;
  average_cost: string | null;
  sessions_recommended: string | null;
  field_provenance: Record<string, FieldSource> | null;
};

// Every copy field carries its sources in treatments.field_provenance (enforced by the provenance trigger):
// { source: "published_source", url, recorded_at, sources: [{ url, publisher, title, quote }] }.
type FieldSource = {
  source?: string;
  url?: string;
  sources?: { url: string; publisher?: string; title?: string }[];
};

type SourceLink = { url: string; publisher?: string; title?: string };

function sourcesOf(t: Treatment, field: string): SourceLink[] {
  const p = t.field_provenance?.[field];
  if (!p) return [];
  if (Array.isArray(p.sources) && p.sources.length > 0) {
    // A source backing several sentences is stored once per quote; link it once.
    const seen = new Set<string>();
    return p.sources.filter((x) => typeof x?.url === "string" && !seen.has(x.url) && (seen.add(x.url), true));
  }
  return p.url ? [{ url: p.url }] : [];
}

function sourceName(src: SourceLink): string {
  const named = [src.publisher, src.title].filter(Boolean).join(" — ");
  if (named) return named;
  try {
    return new URL(src.url).hostname.replace(/^www\./, "");
  } catch {
    return "Source";
  }
}

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
  fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
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

// ---------- Restored 2026-09-16 (owner): You might also like, Before & After, Ages ----------

type SimilarTreatment = { id: string; slug: string; name: string; category: string | null; subtitle: string | null; average_cost: string | null };

// A before-and-after pair renders only when it is sourced and consented (owner, 2026-09-16), never padded and never
// behind a paywall:
//   is_active = true, before_url and after_url both set,
//   field_provenance.before_url.source and .after_url.source are "clinic_supplied" or "published_source",
//   field_provenance.consent.recorded_at is set and field_provenance.consent.granted_by is "patient" or
//   "clinic_with_patient_consent".
// The database also refuses photo URLs without that consent record (constraint treatment_before_afters_consent_required).
type BeforeAfterRow = {
  id: string; before_url: string | null; after_url: string | null; skin_type: string | null; age: number | null;
  sessions: string | null; outcome: string | null; is_active: boolean | null; field_provenance: Record<string, any> | null;
};
const BA_SOURCES = ["clinic_supplied", "published_source"];
const BA_CONSENT = ["patient", "clinic_with_patient_consent"];
function isShowableBeforeAfter(r: BeforeAfterRow): boolean {
  const p = r.field_provenance ?? {};
  return r.is_active === true && !!r.before_url && !!r.after_url
    && BA_SOURCES.includes(p.before_url?.source) && BA_SOURCES.includes(p.after_url?.source)
    && typeof p.consent?.recorded_at === "string" && p.consent.recorded_at !== "" && BA_CONSENT.includes(p.consent?.granted_by);
}

// Ages people stated in Reddit reviews of this treatment (treatment_reviews.age_bracket). Shown only once at least
// MIN_TREATMENT_REVIEWS (30) reviews state an age, always with the count. It describes who mentioned an age, not who
// gets the treatment. There is no country chart: no source records where a reviewer lives.
const AGE_ORDER = ["teens", "20s", "30s", "40s", "50s", "60s", "60s+", "70s+"];
function ageRows(rows: { age_bracket: string | null }[]) {
  const counts = new Map<string, number>();
  for (const r of rows) if (r.age_bracket) counts.set(r.age_bracket, (counts.get(r.age_bracket) ?? 0) + 1);
  const n = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  const rank = (k: string) => (AGE_ORDER.indexOf(k) === -1 ? 99 : AGE_ORDER.indexOf(k));
  const buckets = Array.from(counts.entries()).sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]));
  return { n, buckets };
}

// A field with no sourced text is not rendered at all (no "Not added yet."). A field with text always shows
// where it comes from.
function Field({ label, value, sources }: { label: string; value: string | null; sources: SourceLink[] }) {
  // Every field starts collapsed; tapping the row opens that field's text and its source links (owner, 2026-09-17).
  const [open, setOpen] = useState(false);
  if (!value || !value.trim()) return null;
  return (
    <div style={{ padding: "10px 0", borderBottom: `0.5px solid ${BORDER}` }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
      >
        <span style={{ fontSize: 12.5, fontWeight: 600, color: ESPRESSO }}>{label}</span>
        <ChevronDown size={15} color={MUTED} style={{ transform: open ? "rotate(180deg)" : "none", flex: "none" }} />
      </button>
      {open && (
        <div style={{ fontSize: 13, lineHeight: 1.55, color: ESPRESSO, whiteSpace: "pre-line", marginTop: 8 }}>{value}</div>
      )}
      {open && sources.length > 0 && (
        <div style={{ fontSize: 10.5, color: MUTED, marginTop: 5, lineHeight: 1.45 }}>
          {sources.length === 1 ? "Source: " : "Sources: "}
          {sources.map((src, i) => (
            <span key={`${src.url}-${i}`}>
              {i > 0 && " · "}
              <a href={src.url} target="_blank" rel="noopener noreferrer" style={{ color: MUTED, textDecoration: "underline" }}>
                {sourceName(src)}
              </a>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// The product page's quote rule (patch 04): a verbatim quote over 280 characters renders as an excerpt, starting
// where the treatment is discussed, and says so; a shorter one is shown whole. Stored text is never shortened.
const QUOTE_EXCERPT_MAX = 280;
function quoteDisplay(content: string, terms: string[]): { text: string; excerpted: boolean } {
  const raw = content.replace(/\s+/g, " ").trim();
  if (raw.length <= QUOTE_EXCERPT_MAX) return { text: raw, excerpted: false };
  const original = content.trim();
  const start = excerptStart(original, terms);
  const lead = start > 0 ? "… " : "";
  const body = start > 0 ? original.slice(start).replace(/\s+/g, " ").trim() : raw;
  if (body.length <= QUOTE_EXCERPT_MAX) return { text: lead + body, excerpted: true };
  const head = body.slice(0, QUOTE_EXCERPT_MAX);
  const sentenceEnd = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "));
  const cut = sentenceEnd >= QUOTE_EXCERPT_MAX - 120 ? sentenceEnd + 1 : head.lastIndexOf(" ") > 0 ? head.lastIndexOf(" ") : QUOTE_EXCERPT_MAX;
  const kept = head.slice(0, cut).trim();
  return { text: lead + (/[.!?]$/.test(kept) ? kept + " …" : kept + "…"), excerpted: true };
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
function QuoteSection({ rows, treatmentName }: { rows: TreatmentQuoteRow[]; treatmentName: string }) {
  const [expanded, setExpanded] = useState(false);
  if (rows.length === 0) return null;
  const shown = expanded ? rows : rows.slice(0, QUOTE_PREVIEW);
  const terms = excerptTerms([treatmentName], null);
  // Rendered inside "What people say", directly under the Worth it? figure (owner, 2026-09-16): the quotes are the
  // evidence for that figure, so they sit next to it rather than two sections below.
  return (
    <>
      <SubLabel>In their words</SubLabel>
      <div className="flex flex-col gap-2">
        {shown.map((q) => {
          const verdict = q.verdict ? VERDICT_LABELS[q.verdict] : null;
          const shownQuote = quoteDisplay(String(q.content ?? ""), terms);
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
                <div className="text-xs text-brand-espresso leading-[1.55] mt-1.5 whitespace-pre-line">{shownQuote.text}</div>
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
                    <span className="text-[10px] text-brand-muted">{shownQuote.excerpted ? "Excerpt, quoted as written" : "Quoted as written"}</span>
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
          {shown.length === rows.length ? rows.length : `${shown.length} of ${rows.length}`} {rows.length === 1 ? "quote" : "quotes"} from Reddit, copied as written. Not a vote count.
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
  const [similar, setSimilar] = useState<SimilarTreatment[]>([]);
  const [beforeAfters, setBeforeAfters] = useState<BeforeAfterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageTab, setPageTab] = useState<"treatment" | "tea">("treatment");
  const [userId, setUserId] = useState<string | null>(null);
  const [teaPosts, setTeaPosts] = useState<TeaPostRow[]>([]);
  const navigate = useNavigate();


  // Tea posts are members' own words: never counted, never merged into any figure. profiles.name (the sign-up
  // name) is never selected; a member is shown by the username they chose, or not named at all.
  const loadTea = useCallback(async (treatmentId: string) => {
    const { data: rows } = await (supabase as any)
      .from("posts")
      // user_id is never selected: who wrote a post comes from talk_post_authors() (useTalkAuthors below).
      .select("id, is_named, cost, sessions, what_happened, surprised_me, works_for, warn_if, outcome, tags, skin_type, created_at")
      .eq("treatment_id", treatmentId)
      .order("created_at", { ascending: false });
    const posts = ((rows as any[]) ?? []) as TeaPostRow[];
    setTeaPosts(posts);
  }, []);

  // Authorship per post, from talk_post_authors(): isOwn for the reader, and username / avatar only for a named post.
  // Re-read when the posts or the reader change, since isOwn depends on who is reading.
  const { authors: teaAuthors } = useTalkAuthors("treatment", teaPosts.map((p) => p.id), userId);
  // The signed-in member's own username decides whether the form can offer "post under my name".
  const { username: viewerUsername } = useMyUsername(userId);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUserId(session?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: t } = await supabase
        .from("treatments")
        .select("id, slug, name, subtitle, category, what_it_is, how_it_works, who_its_for, who_its_not_for, downtime, results_duration, average_cost, sessions_recommended, field_provenance")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();
      if (!alive) return;
      setTreatment((t as unknown as Treatment | null) ?? null);
      if (t) document.title = `${(t as { name: string }).name} — Skintea treatments`;
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
        void loadTea((t as any).id);
        // You might also like: other active treatments in the same category (as before 2026-09-14).
        const category = (t as any).category as string | null;
        const { data: sim } = category
          ? await supabase.from("treatments").select("id, slug, name, category, subtitle, average_cost")
              .eq("category", category).eq("active", true).neq("slug", slug).order("sort_order", { ascending: true }).limit(3)
          : { data: [] as SimilarTreatment[] };
        if (!alive) return;
        setSimilar(((sim as any[]) ?? []).filter((x) => x.slug) as SimilarTreatment[]);
        const { data: ba } = await (supabase as any)
          .from("treatment_before_afters")
          .select("id, before_url, after_url, skin_type, age, sessions, outcome, is_active, field_provenance")
          .eq("treatment_id", (t as any).id)
          .eq("is_active", true);
        if (!alive) return;
        setBeforeAfters((((ba as any[]) ?? []) as BeforeAfterRow[]).filter(isShowableBeforeAfter));
      } else {
        setLinks([]);
        setReviewRows([]);
        setQuoteRows([]);
        setSimilar([]);
        setBeforeAfters([]);
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
      <div style={{ background: WARM_WHITE, minHeight: "100vh", color: ESPRESSO, paddingBottom: 80 }}>
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: WARM_WHITE, borderBottom: `0.5px solid ${BORDER}`, padding: "12px 16px" }}>
          <Link to="/treatments" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: ESPRESSO, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            <ArrowLeft size={16} /> Treatments
          </Link>
        </div>

        <div style={{ padding: "16px", borderBottom: `0.5px solid ${BORDER}` }}>
          {treatment.category && <div style={SECTION_LABEL}>{treatment.category}</div>}
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: "4px 0 0" }}>{treatment.name}</h1>
          {treatment.subtitle && <div style={{ fontSize: 13, color: MUTED, marginTop: 4, lineHeight: 1.45 }}>{treatment.subtitle}</div>}
          {/*
            The celebrity / influencer layer, as one line (Chi, 2026-09-18): names only, each linking to where the
            person said it. Treatment-scoped, never joined or linked to a clinic; the stored quote is evidence and is
            never displayed. Counted in no figure. Absent entirely when no row qualifies.
          */}
          <TreatmentCelebrityLine treatmentId={treatment.id} />
        </div>

        {/* Shared page tabs, the same pattern as the product and clinic detail pages; local state only. */}
        <div role="tablist" aria-label="Treatment details" style={{ display: "flex", borderBottom: `0.5px solid ${BORDER}` }}>
          {(["treatment", "tea"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={pageTab === t}
              onClick={() => setPageTab(t)}
              style={{
                flex: 1, background: "none", border: "none",
                borderBottom: pageTab === t ? `2px solid ${CRIMSON}` : "2px solid transparent",
                color: pageTab === t ? ESPRESSO : MUTED,
                fontSize: 13, fontWeight: pageTab === t ? 600 : 500, padding: "11px 4px 9px", cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {t === "treatment" ? "Treatment" : (
                <span>Tea{teaPosts.length > 0 && <span style={{ fontSize: 10, color: CRIMSON, fontWeight: 600, marginLeft: 3 }}>{teaPosts.length}</span>}</span>
              )}
            </button>
          ))}
        </div>

        {pageTab === "tea" && (
          <TreatmentTea
            treatmentId={treatment.id}
            posts={teaPosts}
            authors={teaAuthors}
            userId={userId}
            viewerUsername={viewerUsername}
            onPosted={() => void loadTea(treatment.id)}
            onDeleted={() => void loadTea(treatment.id)}
            onLoginNeeded={() => navigate({ to: "/login" })}
          />
        )}

        {pageTab === "treatment" && (
        <>

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
              {treatment.average_cost && (
                <>
                  <SubLabel>US average fee</SubLabel>
                  <div className="bg-card border border-brand-border rounded-xl p-3.5 flex flex-col gap-1.5">
                    <div className="text-xs text-brand-espresso">{treatment.average_cost}</div>
                    <div className="text-[10px] text-brand-muted leading-[1.4]">
                      A national figure from a professional body, not a Los Angeles price and not a quote.{" "}
                      {sourcesOf(treatment, "average_cost").map((src, i) => (
                        <a key={`${src.url}-${i}`} href={src.url} target="_blank" rel="noopener noreferrer" className="underline text-brand-muted">
                          {sourceName(src)}
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {ranges.length > 0 && (
                <>
                  <SubLabel>Listed by Los Angeles clinics</SubLabel>
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

        {(() => {
          const fields: { key: "what_it_is" | "how_it_works" | "who_its_for" | "who_its_not_for" | "downtime" | "results_duration" | "sessions_recommended"; label: string }[] = [
            { key: "what_it_is", label: "What it is" },
            { key: "how_it_works", label: "How it works" },
            { key: "who_its_for", label: "Who it's for" },
            { key: "who_its_not_for", label: "Who should skip it" },
            { key: "downtime", label: "Recovery" },
            { key: "results_duration", label: "How long results last" },
            { key: "sessions_recommended", label: "Sessions" },
          ];
          const filled = fields.filter((f) => (treatment[f.key] ?? "").trim() !== "");
          if (filled.length === 0) return null;
          return (
            <Section title="About this treatment">
              <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5, marginBottom: 2 }}>
                Written by Skintea from published medical sources, each part linked. Not medical advice.
              </div>
              {filled.map((f) => (
                <Field key={f.key} label={f.label} value={treatment[f.key]} sources={sourcesOf(treatment, f.key)} />
              ))}
            </Section>
          );
        })()}

        {/*
          Patient videos: what the treatment looks like (owner-approved, up to 6; see TreatmentVideos).
          Display only, never counted in Worth it. Separate component and query from "Who has talked about it".
        */}
        <TreatmentVideos treatmentId={treatment.id} />

        {/*
          In their words — the same Reddit quotes, now their own section (owner, 2026-09-17). Same rows, same
          component, same labels; only their place on the page changed. Quotes are counted nowhere.
        */}
        {quoteRows.length > 0 && (
          <Section title="In their words">
            <QuoteSection rows={quoteRows} treatmentName={treatment.name} />
          </Section>
        )}

        {(() => {
          const { n, buckets } = ageRows(quoteRows);
          return (
            <Section title="Ages people stated">
              {n >= MIN_TREATMENT_REVIEWS ? (
                <div className="bg-card border border-brand-border rounded-xl p-3.5">
                  {buckets.map(([age, count]) => {
                    const pct = Math.round((count / n) * 100);
                    return (
                      <div key={age} className="py-1">
                        <div className="flex justify-between text-xs text-brand-espresso">
                          <span>{age}</span>
                          <span className="text-brand-muted">{count} of {n}</span>
                        </div>
                        <div className="h-[3px] bg-brand-border rounded-sm mt-1 overflow-hidden">
                          <div className="h-full bg-brand-crimson" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="text-[10px] text-brand-muted mt-1.5 leading-[1.4]">
                    Only Reddit reviewers who mentioned their age. It shows who talked about {treatment.name}, not who gets it.
                  </div>
                </div>
              ) : (
                <DataPending>{n} of {MIN_TREATMENT_REVIEWS} Reddit reviews stating an age needed.</DataPending>
              )}
            </Section>
          );
        })()}

        {/*
          Who has talked about it — the Skintea members who posted Tea about this treatment (Chi, 2026-09-18). The
          name used to carry the celebrity layer, which is now one line under the treatment name above the tabs.
          Named posts only in the row; the count line under it is every post, so anonymous posters are counted
          without being identified. Authorship comes from talk_post_authors(); user_id is never selected. Counted in
          no figure.
        */}
        <Section title="Who has talked about it">
          <TreatmentMembers posts={teaPosts} authors={teaAuthors} onOpenTea={() => setPageTab("tea")} />
        </Section>

        <Section title="Before & After">
          {beforeAfters.length === 0 ? (
            <DataPending>
              No before-and-after photos yet. A pair shows only with the source of each photo and the patient's recorded consent.
            </DataPending>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {beforeAfters.map((r) => {
                const p = r.field_provenance ?? {};
                const sourceUrl: string | undefined = p.before_url?.url ?? p.after_url?.url;
                const details = [r.skin_type ? `${r.skin_type} skin` : null, r.age != null ? `age ${r.age}` : null, r.sessions, r.outcome].filter(Boolean);
                return (
                  <div key={r.id} style={{ background: "#FFFFFF", border: `0.5px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                      {([["Before", r.before_url], ["After", r.after_url]] as const).map(([label, url]) => (
                        <div key={label} style={{ position: "relative", aspectRatio: "1", background: CREAM_TINT }}>
                          <img src={url!} alt={`${label}: ${treatment.name}`} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          <span style={{ position: "absolute", left: 6, top: 6, background: "rgba(28,10,0,0.75)", color: WARM_WHITE, fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 4 }}>{label}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: "8px 10px", fontSize: 11, color: MUTED, lineHeight: 1.5 }}>
                      {details.length > 0 && <div style={{ color: ESPRESSO }}>{details.join(" · ")}</div>}
                      <div>
                        Shared with the patient's consent{p.consent?.granted_by === "clinic_with_patient_consent" ? " by the clinic" : ""}.{" "}
                        {sourceUrl ? (
                          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: MUTED, textDecoration: "underline" }}>Source</a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="You might also like">
          {similar.length === 0 ? (
            <DataPending>No other treatments in this category yet.</DataPending>
          ) : (
            <div className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {similar.map((sim) => (
                <Link
                  key={sim.id}
                  to="/treatments/$slug"
                  params={{ slug: sim.slug }}
                  style={{ background: "#FFFFFF", border: `0.5px solid ${BORDER}`, borderRadius: 10, padding: 10, width: 130, flexShrink: 0, textDecoration: "none" }}
                >
                  {sim.category && (
                    <div style={{ fontSize: 9, fontWeight: 600, color: CRIMSON, textTransform: "uppercase", letterSpacing: "0.08em" }}>{sim.category}</div>
                  )}
                  <div style={{ fontSize: 13, fontWeight: 600, color: ESPRESSO, marginTop: 4, lineHeight: 1.25 }}>{sim.name}</div>
                  {sim.subtitle && (
                    <div style={{ fontSize: 10, color: MUTED, marginTop: 4, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {sim.subtitle}
                    </div>
                  )}
                  {sim.average_cost && (
                    <div style={{ fontSize: 11, color: CRIMSON, marginTop: 6, fontWeight: 700 }}>{sim.average_cost}</div>
                  )}
                  <div style={{ fontSize: 10, fontWeight: 600, color: CRIMSON, marginTop: 6 }}>See treatment →</div>
                </Link>
              ))}
            </div>
          )}
        </Section>

        <Section title={`Clinics offering ${treatment.name}`}>
          {links.length === 0 ? (
            <div style={{ background: CREAM_TINT, borderRadius: 10, padding: "14px 12px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: ESPRESSO }}>No listed clinics yet</div>
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
                        <div style={{ fontSize: 13, fontWeight: 600, color: ESPRESSO }}>{c.name}</div>
                        {c.neighborhood && (
                          <div style={{ fontSize: 11, color: MUTED, marginTop: 3, display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <MapPin size={11} /> {c.neighborhood}
                          </div>
                        )}
                        {price && (
                          <div style={{ fontSize: 12, fontWeight: 600, color: CRIMSON, marginTop: 4 }}>{price.text}</div>
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
        </>
        )}

        <BottomNav />
      </div>
    </AppFrame>
  );
}
