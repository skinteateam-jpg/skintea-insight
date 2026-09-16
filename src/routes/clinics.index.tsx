import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import AppFrame from "@/components/AppFrame";
import { Search, SlidersHorizontal, Map, Bell, MapPin, Sparkles, X } from "lucide-react";
import { IconBookmark } from "@tabler/icons-react";
import { ClinicImage } from "@/components/ClinicImage";
import { displayImages, useCategoryImages } from "@/lib/clinicPhotos";
import { MIN_TAGGED } from "@/lib/opinionAggregate";

export const Route = createFileRoute("/clinics/")({
  head: () => ({
    meta: [
      { title: "Find your clinic — Skintea" },
      { name: "description", content: "LA skin clinics, med spas, laser clinics and dermatologists. No sponsored placements." },
      { property: "og:title", content: "Find your clinic — Skintea" },
      { property: "og:description", content: "LA skin clinics, med spas, laser clinics and dermatologists. No sponsored placements." },
    ],
  }),
  component: ClinicsPage,
});

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const WARM_WHITE = "#FFFCF8";
const BORDER = "#E8DDD4";
const MUTED = "#999999";
const TAG_BG = "#F5EFEC";
const QUOTE_BG = "#F9F5F0";
const SKIN_BG = "#FEE8EC";
const CHIP_BORDER = "#F5C0CC";
const OPEN_GREEN = "#2D7A3A";
const DIVIDER = "#F5EFEC";

type Clinic = {
  id: string;
  name: string;
  neighborhood: string | null;
  address: string | null;
  yelp_rating: number | null;
  yelp_review_count: number | null;
  trust_score: number | null;
  price_tier: string | null;
  price_from: number | null;
  best_for: string[] | null;
  known_for: string | null;
  tea_quote: string | null;
  tea_skin_type: string | null;
  badges: string[] | null;
  image_url: string | null;
  photos: unknown;
  category: string | null;
  booking_url: string | null;
  is_verified: boolean;
  is_featured: boolean | null;
  is_open_now: boolean | null;
  travel_minutes: number | null;
  distance_miles: number | null;
  skintea_score: number | null;
  parking_available: boolean | null;
  has_private_room: boolean | null;
  women_only_staff: boolean | null;
  has_makeup_room: boolean | null;
  has_kids_space: boolean | null;
  has_drink_service: boolean | null;
  has_changing_room: boolean | null;
  first_time_discount: boolean | null;
  walk_in_ok: boolean | null;
  same_day_ok: boolean | null;
  korean_aesthetics: boolean | null;
  membership_available: boolean | null;
};

type TrendingTreatment = {
  id: string;
  emoji: string;
  label: string;
  keywords: string[];
  month: string;
  sort_order: number;
};

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: CRIMSON,
};

const noScrollbar: React.CSSProperties = {
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

// A sort tab is enabled only when the column it orders by carries data today.
// "Nearest" was renamed "A–Z": no distance is known because no location is ever collected from
// the user. Top Rated / Most Reviewed / Price: Low / Verified order by skintea_score,
// trust_score, yelp_review_count, price_from and is_verified, which are empty on every listed
// clinic, so they render as disabled controls. Flip `enabled` once the column is filled from a
// recorded source. Google's rating and review count are NOT a substitute — they must never be
// displayed or sorted on.
const SORT_TABS: { key: string; label: string; enabled: boolean }[] = [
  { key: "name", label: "A–Z", enabled: true },
  { key: "rating", label: "Top Rated", enabled: false },
  { key: "reviews", label: "Most Reviewed", enabled: false },
  { key: "price", label: "Price: Low", enabled: false },
  { key: "verified", label: "Verified", enabled: false },
];

const DEFAULT_SORT = "name";

const SORT_DISABLED_HINT = "Top Rated, Most Reviewed, Price and Verified need clinic-submitted data — not collected yet.";

// Comparators are kept for every tab so a sort works the moment its column is populated and its
// `enabled` flag flips; only an enabled tab's comparator is ever applied.
const SORT_COMPARATORS: Record<string, (a: Clinic, b: Clinic) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  rating: (a, b) => (b.skintea_score ?? b.trust_score ?? 0) - (a.skintea_score ?? a.trust_score ?? 0),
  reviews: (a, b) => (b.yelp_review_count ?? 0) - (a.yelp_review_count ?? 0),
  price: (a, b) => (a.price_from ?? 9999) - (b.price_from ?? 9999),
  verified: (a, b) => (b.is_verified ? 1 : 0) - (a.is_verified ? 1 : 0),
};

// Which drawer filter groups actually narrow the list today. A group is `true` only when every
// chip in it filters on a populated column; anything else renders disabled and can never enter
// the applied-filter chip row.
//  - area:      clinics.neighborhood is populated on most listed clinics → works.
//  - hours:     is_open_now / same_day_ok / walk_in_ok are null on every row (and the
//               "null = unknown → keep" rule returns the whole list); Open Weekends and
//               Open Late have no filter logic at all.
//  - keywords:  keywordsFilter was never read by `filtered` — it filtered nothing, ever.
//  - price:     clinics.price_from is null on every row.
//  - prefs:     parking_available / women_only_staff / has_private_room / first_time_discount
//               are null on every row; the rest of the chips have no logic.
//  - facility:  has_makeup_room / has_kids_space / has_drink_service / korean_aesthetics are
//               null on every row; the rest of the chips have no logic.
//  - treatment: these chips read clinics.best_for, which is null on every row, so every chip
//               returns zero clinics. Real mappings live in clinic_treatments, which this list
//               query does not join.
const FILTERS_ENABLED: Record<"area" | "hours" | "keywords" | "price" | "prefs" | "facility" | "treatment", boolean> = {
  area: true,
  hours: false,
  keywords: false,
  price: false,
  prefs: false,
  facility: false,
  treatment: false,
};

const HOURS_DISABLED_HINT = "Opening hours and walk-in policy aren't collected yet — these can't filter anything.";
const KEYWORDS_DISABLED_HINT = "No clinic is tagged with these keywords yet.";
const PRICE_DISABLED_HINT = "No listed clinic has a recorded starting price yet.";
const PREFS_DISABLED_HINT = "Amenities aren't collected yet — these can't filter anything.";
const FACILITY_DISABLED_HINT = "Facility details aren't collected yet — these can't filter anything.";
const TREATMENT_DISABLED_HINT = "Treatment filtering isn't wired to this list yet.";

const AREA_OPTIONS = ["West Hollywood", "Beverly Hills", "Koreatown", "Silver Lake", "Santa Monica", "Downtown LA", "Culver City", "Studio City"];
const HOURS_OPTIONS = ["Open Now", "Open Weekends", "Open Late (after 8pm)", "Same-day OK", "Walk-in Friendly"];
const KEYWORD_OPTIONS = ["Pore Care", "Herb Peeling", "Potenza", "Indiba", "Glass Skin", "Chin Line", "Aqua Peel", "Korean Facial", "Slugging", "LED Therapy", "Small Face", "Lifting"];
const PREF_OPTIONS = ["Walk-in Friendly", "Same-day OK", "Groups (2+)", "Women-Only Staff", "Private Room", "First-Time Discount", "Card Payment OK", "Free Parking", "Near Transit", "2nd Visit Perks"];
const FACILITY_OPTIONS = ["Makeup Room", "Changing Room", "Drink Service", "Kids Space", "Small Salon (under 3 beds)", "Large Salon (10+ beds)", "Korean Aesthetics", "Membership Available", "In Shopping Mall", "Amex Friendly"];

const TREATMENT_CATEGORIES: { title: string; items: string[] }[] = [
  { title: "Facial & Skin", items: ["Pore Care", "Glass Skin", "Lifting", "Brightening", "Hydrafacial", "Chemical Peel", "Herb Peeling", "Aqua Peel", "Deep Cleansing"] },
  { title: "Injectables & Medical", items: ["Botox", "Filler", "PRF", "PRP", "Potenza", "Indiba", "Skinbooster"] },
  // "Laser" removed: the owner deactivated it as a treatment ("a category, not a treatment").
  { title: "Laser & Energy", items: ["IPL", "LED Therapy", "Microneedling", "RF Therapy", "HIFU"] },
  { title: "Face Surgery & Contouring", items: ["Chin Line", "Jaw Slimming", "Nose", "Eyes", "Face Lifting Surgery", "Thread Lift"] },
  { title: "Body", items: ["Body Contouring", "Slimming", "Waist", "Bust", "Back", "Hip Lift"] },
  { title: "Hair Removal", items: ["Underarm", "Arms", "Legs", "Full Body", "VIO", "Face"] },
];

/* ---------------------------------------------------------------------------
   CARD DISPLAY RULES
   Every badge and stat below is kept as a feature. What changed is the rule that
   lets it render, so none of them can state something the data does not support.
   --------------------------------------------------------------------------- */

// A recommend percentage is a measured aggregate, so it renders only next to the sample size it
// was computed from, and only at or above the app-wide floor of MIN_TAGGED (10) — the same floor
// opinionAggregate.ts applies to product opinion rows.
// clinics.skintea_score / trust_score are NOT a valid source: they carry no sample size, so a
// figure taken from them could never be shown with one. The figure has to come from a measured
// aggregate (clinic_skin_scores, source = skintea_measured, n >= 10), which this list query does
// not fetch — so this returns null for every row today and the badge stays unreachable.
// To switch it on: join the measured aggregate into the list query and return { pct, n } here.
type RecommendStat = { pct: number; n: number };

function recommendFor(_clinic: Clinic, measured?: RecommendStat | null): RecommendStat | null {
  // Nothing is passed today: the measured aggregate is not joined into this list query.
  if (!measured) return null;
  return measured.n >= MIN_TAGGED ? measured : null;
}

// "Verified" means a recorded verification event, never a score. clinics.is_verified is a bare
// boolean with no provenance behind it, so it is not sufficient on its own.
// To switch it on: require a provenance-bearing verification field
// (e.g. field_provenance.is_verified = {source: 'clinic_submission' | 'skintea_verified',
// recorded_at}) and return true when that record exists.
const HAS_VERIFICATION_PROVENANCE: boolean = false;

function isVerified(clinic: Clinic): boolean {
  return HAS_VERIFICATION_PROVENANCE && clinic.is_verified === true;
}

// "Skintea Pick" is an editorial decision, never a numeric threshold. It used to be awarded by
// skintea_score >= 90 || is_featured, which made a score into an award.
// To switch it on: record the decision (who picked it, when, why) on the clinic row and return
// true from that recorded field.
const HAS_EDITORIAL_PICK_RECORD: boolean = false;

function isEditorialPick(clinic: Clinic): boolean {
  return HAS_EDITORIAL_PICK_RECORD && clinic.is_featured === true;
}

// Distance needs an origin point. No location is ever collected from the user and none is
// derived, so clinics.distance_miles cannot be displayed.
// To switch it on: obtain an origin (explicit user consent) and compute against the Census
// coordinates already stored on the clinic.
const HAS_DISTANCE_ORIGIN: boolean = false;

function distanceSuffix(clinic: Clinic): string {
  return HAS_DISTANCE_ORIGIN && clinic.distance_miles != null ? ` · ${clinic.distance_miles} mi` : "";
}

// A review count renders only with its source named. yelp_review_count is Yelp's, so it is
// labelled as Yelp's. Google-derived ratings and review counts (clinics.google_rating,
// clinics.google_review_count) are deliberately absent from the Clinic type and must never be
// rendered anywhere on this page.
function reviewCountLabel(clinic: Clinic): string | null {
  return clinic.yelp_review_count != null ? `${clinic.yelp_review_count} reviews on Yelp` : null;
}

function ClinicsPage() {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);

  const [skinType, setSkinType] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [locationQ, setLocationQ] = useState("");
  const [sortBy, setSortBy] = useState(DEFAULT_SORT);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTreatment, setActiveTreatment] = useState<string | null>(null);
  const [trending, setTrending] = useState<TrendingTreatment[]>([]);
  // The month label comes from the trending rows themselves; there is no default string, so the
  // strip cannot claim a month it did not read from data.
  const [trendingMonth, setTrendingMonth] = useState("");

  const [areaFilter, setAreaFilter] = useState<string[]>([]);
  const [hoursFilter, setHoursFilter] = useState<string[]>([]);
  const [keywordsFilter, setKeywordsFilter] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState(1000);
  const [prefFilter, setPrefFilter] = useState<string[]>([]);
  const [facilityFilter, setFacilityFilter] = useState<string[]>([]);
  const [treatmentFilter, setTreatmentFilter] = useState<string[]>([]);
  const [, setSavedFilters] = useState<any>(null);
  const [savedConfirm, setSavedConfirm] = useState(false);
  const [savedClinics, setSavedClinics] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Only places that pass the strict clinic filter are listed; unsure / dropped places stay in the table, unlisted.
      const { data } = await supabase.from("clinics").select("*").eq("listing_filter", "passed").order("name", { ascending: true });
      if (!alive) return;
      setClinics((data as unknown as Clinic[]) ?? []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("trending_treatments")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!alive) return;
      if (data && data.length > 0) {
        setTrending(data as TrendingTreatment[]);
        setTrendingMonth((data[0] as TrendingTreatment).month ?? "");
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const st = localStorage.getItem("skintea_skin_type");
    const qr = localStorage.getItem("skintea.quizResult");
    if (st) setSkinType(st.toLowerCase());
    else if (qr) {
      try { setSkinType(JSON.parse(qr)?.skinTypeLabel?.toLowerCase() || ""); }
      catch {}
    }
    const saved = localStorage.getItem("skintea.savedFilters");
    if (saved) { try { setSavedFilters(JSON.parse(saved)); } catch {} }
    const sc = localStorage.getItem("skintea.savedClinics");
    if (sc) { try { const arr = JSON.parse(sc); if (Array.isArray(arr)) setSavedClinics(arr); } catch {} }
  }, []);

  const toggleSaveClinic = (id: string) => {
    setSavedClinics(prev => {
      const next = prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id];
      try { localStorage.setItem("skintea.savedClinics", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Only a filter that actually narrows the list may show as an applied chip. Each group is
  // gated on the same flag that enables its chips in the drawer, so a disabled group can never
  // put a chip here — including if someone re-enables one without wiring the filter.
  const allActiveFilters: string[] = [
    ...(FILTERS_ENABLED.area ? areaFilter : []),
    ...(FILTERS_ENABLED.hours ? hoursFilter : []),
    ...(FILTERS_ENABLED.keywords ? keywordsFilter : []),
    ...(FILTERS_ENABLED.prefs ? prefFilter : []),
    ...(FILTERS_ENABLED.facility ? facilityFilter : []),
    ...(FILTERS_ENABLED.treatment ? treatmentFilter : []),
    ...(FILTERS_ENABLED.price && priceMax < 1000 ? [`Under $${priceMax}`] : []),
  ];

  const filtered = useMemo(() => {
    let out = clinics;
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      out = out.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.best_for ?? []).some(t => t.toLowerCase().includes(q)) ||
        (c.neighborhood ?? "").toLowerCase().includes(q) ||
        (c.address ?? "").toLowerCase().includes(q) ||
        (c.known_for ?? "").toLowerCase().includes(q)
      );
    }
    if (locationQ.trim()) {
      const q = locationQ.toLowerCase();
      out = out.filter(c =>
        (c.neighborhood ?? "").toLowerCase().includes(q) ||
        (c.address ?? "").toLowerCase().includes(q)
      );
    }
    // Unreachable today: the trending strip renders nothing while no trending row is active.
    // If rows are activated, note this matches on clinics.best_for, which is unpopulated.
    if (activeTreatment) {
      const chip = trending.find(c => c.label === activeTreatment);
      if (chip) {
        out = out.filter(c => (c.best_for ?? []).some(b => {
          const bl = b.toLowerCase();
          return chip.keywords.some(k => bl.includes(k));
        }));
      }
    }
    // AREA is the one drawer group that filters for real: neighborhood is populated.
    if (FILTERS_ENABLED.area && areaFilter.length) {
      out = out.filter(c => areaFilter.some(a => (c.neighborhood ?? "").toLowerCase().includes(a.toLowerCase())));
    }
    // Every group below is gated off (see FILTERS_ENABLED). The predicates are kept so each one
    // works the moment its column is populated and its flag flips. Note the hours / prefs /
    // facility predicates use "null = unknown → keep", which on today's all-null columns returns
    // the entire list — which is exactly why the chips are disabled rather than left clickable.
    if (FILTERS_ENABLED.hours) {
      if (hoursFilter.includes("Open Now")) out = out.filter(c => c.is_open_now !== false);
      if (hoursFilter.includes("Same-day OK")) out = out.filter(c => c.same_day_ok !== false);
      if (hoursFilter.includes("Walk-in Friendly")) out = out.filter(c => c.walk_in_ok !== false);
    }
    if (FILTERS_ENABLED.treatment && treatmentFilter.length) {
      out = out.filter(c => treatmentFilter.some(t => (c.best_for ?? []).some(b => b.toLowerCase().includes(t.toLowerCase()))));
    }
    if (FILTERS_ENABLED.prefs) {
      if (prefFilter.includes("Free Parking")) out = out.filter(c => c.parking_available !== false);
      if (prefFilter.includes("Women-Only Staff")) out = out.filter(c => c.women_only_staff !== false);
      if (prefFilter.includes("Private Room")) out = out.filter(c => c.has_private_room !== false);
      if (prefFilter.includes("First-Time Discount")) out = out.filter(c => c.first_time_discount !== false);
    }
    if (FILTERS_ENABLED.facility) {
      if (facilityFilter.includes("Makeup Room")) out = out.filter(c => c.has_makeup_room !== false);
      if (facilityFilter.includes("Kids Space")) out = out.filter(c => c.has_kids_space !== false);
      if (facilityFilter.includes("Drink Service")) out = out.filter(c => c.has_drink_service !== false);
      if (facilityFilter.includes("Korean Aesthetics")) out = out.filter(c => c.korean_aesthetics !== false);
    }
    if (FILTERS_ENABLED.price && priceMax < 1000) out = out.filter(c => (c.price_from ?? 9999) <= priceMax);
    // Only an enabled tab's comparator is applied; anything else falls back to the A–Z default.
    const activeTab = SORT_TABS.find(t => t.key === sortBy && t.enabled);
    const cmp = (activeTab ? SORT_COMPARATORS[activeTab.key] : undefined) ?? SORT_COMPARATORS[DEFAULT_SORT];
    out = [...out].sort(cmp);
    return out;
  }, [clinics, searchQ, locationQ, activeTreatment, trending, areaFilter, hoursFilter, treatmentFilter, prefFilter, facilityFilter, priceMax, sortBy]);

  // "Skintea Pick" is an editorial decision, not a score threshold — see isEditorialPick.
  // No clinic qualifies until that decision is recorded, so no hero card renders today.
  const heroPickIds = useMemo(() => {
    return new Set(filtered.filter(isEditorialPick).map(c => c.id));
  }, [filtered]);

  const removeFilter = (val: string) => {
    setAreaFilter(prev => prev.filter(v => v !== val));
    setHoursFilter(prev => prev.filter(v => v !== val));
    setKeywordsFilter(prev => prev.filter(v => v !== val));
    setPrefFilter(prev => prev.filter(v => v !== val));
    setFacilityFilter(prev => prev.filter(v => v !== val));
    setTreatmentFilter(prev => prev.filter(v => v !== val));
    if (val.startsWith("Under $")) setPriceMax(1000);
  };

  const clearAll = () => {
    setAreaFilter([]); setHoursFilter([]); setKeywordsFilter([]);
    setPrefFilter([]); setFacilityFilter([]); setTreatmentFilter([]);
    setPriceMax(1000); setSortBy(DEFAULT_SORT);
  };

  // Kept, but not wired to the button: saving wrote skintea.savedFilters and nothing ever read it
  // back, so "Saved!" promised something that never happened. To switch the control on, restore
  // this write AND re-apply the stored object in the mount effect that already reads the key.
  const saveFilters = () => {
    localStorage.setItem("skintea.savedFilters", JSON.stringify({
      areaFilter, hoursFilter, keywordsFilter, priceMax, prefFilter, facilityFilter, treatmentFilter, sortBy
    }));
    setSavedConfirm(true);
    setTimeout(() => setSavedConfirm(false), 2000);
  };
  const SAVE_FILTERS_ENABLED: boolean = false;
  void saveFilters; void savedConfirm;

  const skinTypeDisplay = skinType ? skinType.charAt(0).toUpperCase() + skinType.slice(1) : "";

  return (
    <AppFrame>
    <div style={{ background: WARM_WHITE, minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", paddingBottom: 80 }}>
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,700&display=swap" rel="stylesheet" />

      {/* 1. Header */}
      <header style={{ background: WARM_WHITE, borderBottom: `0.5px solid ${BORDER}`, padding: "14px 16px 10px", position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 22, lineHeight: 1 }}>
            <span style={{ color: ESPRESSO }}>Skin</span><span style={{ color: CRIMSON }}>tea</span>
          </div>
          <div style={{ ...SECTION_LABEL, color: MUTED, marginTop: 3 }}>Got Skintea? Spill it.</div>
        </div>
        {/* Map view and alerts are kept as controls but have no handler behind them, so they
            render disabled rather than looking tappable and doing nothing. */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            disabled
            aria-disabled="true"
            aria-label="Map view — not available yet"
            title="Map view isn't available yet"
            style={{ background: "transparent", border: "none", padding: 0, cursor: "default", opacity: 0.35, display: "inline-flex" }}
          >
            <Map size={20} color={ESPRESSO} />
          </button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            aria-label="Alerts — not available yet"
            title="Alerts aren't available yet"
            style={{ background: "transparent", border: "none", padding: 0, cursor: "default", opacity: 0.35, display: "inline-flex" }}
          >
            <Bell size={20} color={ESPRESSO} />
          </button>
        </div>
      </header>

      {/* 2. Search row — Yelp style */}
      <div style={{ padding: "10px 16px", borderBottom: `0.5px solid ${BORDER}`, display: "flex", gap: 8, alignItems: "center", background: WARM_WHITE }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", background: "#F5EFEC", borderRadius: 8, overflow: "hidden", height: 36 }}>
          <div style={{ position: "relative", flex: 1.6, display: "flex", alignItems: "center" }}>
            <Search size={16} color={MUTED} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Botox, facial, laser..."
              style={{ width: "100%", background: "transparent", border: "none", padding: "9px 8px 9px 32px", fontSize: 13, color: ESPRESSO, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ width: 0.5, alignSelf: "stretch", background: BORDER, margin: "6px 0" }} />
          <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
            <MapPin size={14} color={MUTED} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={locationQ}
              onChange={(e) => setLocationQ(e.target.value)}
              placeholder="Los Angeles, CA"
              style={{ width: "100%", background: "transparent", border: "none", padding: "9px 10px 9px 30px", fontSize: 13, color: ESPRESSO, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>
        </div>
        <button
          type="button"
          aria-label="Filters"
          onClick={() => setDrawerOpen(true)}
          style={{ position: "relative", width: 36, height: 36, borderRadius: 8, border: `0.5px solid ${BORDER}`, background: WARM_WHITE, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
        >
          <SlidersHorizontal size={16} color={ESPRESSO} />
          {allActiveFilters.length > 0 && (
            <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: 999, background: CRIMSON }} />
          )}
        </button>
      </div>

      {/* 3. Skin match bar */}
      <div
        style={{ background: SKIN_BG, borderBottom: `0.5px solid ${BORDER}`, padding: "9px 16px", display: "flex", alignItems: "center", gap: 8, cursor: skinType ? "default" : "pointer" }}
        onClick={() => { if (!skinType) navigate({ to: "/quiz" as any }).catch(() => {}); }}
      >
        {skinType ? (
          <>
            <Sparkles size={14} color={CRIMSON} />
            <span style={{ fontSize: 12, color: ESPRESSO }}>
              Matched to your skin — <span style={{ color: CRIMSON, fontWeight: 800 }}>{skinTypeDisplay}</span>
            </span>
          </>
        ) : (
          <span style={{ fontSize: 12, color: MUTED }}>Take the quiz to get matched →</span>
        )}
      </div>

      {/* 3b. Trending This Month — the whole section (heading and month label included) renders
           only when trending_treatments has active rows. With none, it renders nothing at all
           rather than an empty strip under a "Trending" heading. */}
      {trending.length > 0 && (
      <div style={{ borderBottom: `0.5px solid ${BORDER}`, padding: "10px 16px 12px", background: WARM_WHITE }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ ...SECTION_LABEL }}>🔥 Trending</div>
          {trendingMonth && <div style={{ fontSize: 9, color: MUTED, fontWeight: 600 }}>{trendingMonth}</div>}
        </div>
        <div className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", ...noScrollbar }}>
          {trending.map((c) => {
            const active = activeTreatment === c.label;
            return (
              <button
                key={c.label}
                onClick={() => setActiveTreatment(prev => prev === c.label ? null : c.label)}
                style={{
                  flexShrink: 0,
                  width: 64,
                  height: 58,
                  borderRadius: 10,
                  background: active ? SKIN_BG : TAG_BG,
                  border: active ? `1.5px solid ${CRIMSON}` : `0.5px solid ${BORDER}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: "4px 2px",
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1 }}>{c.emoji}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: active ? CRIMSON : ESPRESSO, lineHeight: 1.2, textAlign: "center", whiteSpace: "pre-wrap" }}>
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* 4. Active filter chips */}
      {allActiveFilters.length > 0 && (
        <div className="no-scrollbar" style={{ display: "flex", gap: 6, overflowX: "auto", padding: "8px 16px", borderBottom: `0.5px solid ${BORDER}`, ...noScrollbar }}>
          {allActiveFilters.map((f) => (
            <button
              key={f}
              onClick={() => removeFilter(f)}
              style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, background: SKIN_BG, border: `0.5px solid ${CHIP_BORDER}`, borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: CRIMSON, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
            >
              {f} <X size={11} />
            </button>
          ))}
        </div>
      )}

      {/* 5. Sort tab bar — all five tabs kept; the ones with no data behind them are disabled. */}
      <div style={{ borderBottom: `0.5px solid ${BORDER}`, background: WARM_WHITE }}>
        <div className="no-scrollbar" style={{ display: "flex", overflowX: "auto", ...noScrollbar }}>
          {SORT_TABS.map((t) => {
            const active = sortBy === t.key && t.enabled;
            return (
              <button
                key={t.key}
                type="button"
                disabled={!t.enabled}
                aria-disabled={!t.enabled}
                onClick={t.enabled ? () => setSortBy(t.key) : undefined}
                style={{ flexShrink: 0, padding: "10px 14px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", background: "transparent", border: "none", color: active ? ESPRESSO : MUTED, opacity: t.enabled ? 1 : 0.4, borderBottom: active ? `2px solid ${CRIMSON}` : "2px solid transparent", cursor: t.enabled ? "pointer" : "default", fontFamily: "inherit" }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        {SORT_TABS.some(t => !t.enabled) && (
          <div style={{ fontSize: 10, color: MUTED, padding: "0 16px 8px", lineHeight: 1.4 }}>{SORT_DISABLED_HINT}</div>
        )}
      </div>

      {/* 6. Results bar — a plain count, never "near you": no location is collected from the
           user, and the right-hand label is the dataset's scope, not the reader's position. */}
      <div style={{ padding: "10px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={SECTION_LABEL}>
          {loading
            ? "Loading clinics…"
            : activeTreatment
              ? `${filtered.length} ${filtered.length === 1 ? "clinic" : "clinics"} for ${activeTreatment}`
              : `${filtered.length} ${filtered.length === 1 ? "clinic" : "clinics"}`}
        </div>
        <div style={{ fontSize: 10, color: MUTED }}>{locationQ.trim() || "Los Angeles area listings"}</div>
      </div>

      {/* 7. Cards */}
      <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          <div style={{ color: MUTED, fontSize: 13, padding: 40, textAlign: "center" }}>Loading clinics...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ color: MUTED, fontSize: 13 }}>No clinics match this filter.</div>
            <button onClick={clearAll} style={{ marginTop: 10, background: "transparent", border: "none", color: CRIMSON, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Clear filters →
            </button>
          </div>
        ) : (
          filtered.map((c) => {
            const isHero = heroPickIds.has(c.id);
            const open = () => navigate({ to: "/clinics/$id", params: { id: c.id } }).catch(() => {});
            return isHero ? (
              <HeroCard key={c.id} clinic={c} onOpen={open} isSaved={savedClinics.includes(c.id)} onToggleSave={() => toggleSaveClinic(c.id)} />
            ) : (
              <CompactCard key={c.id} clinic={c} onOpen={open} isSaved={savedClinics.includes(c.id)} onToggleSave={() => toggleSaveClinic(c.id)} />
            );
          })
        )}
      </div>

      <BottomNav />

      {/* FILTER DRAWER */}
      {drawerOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(28,10,0,0.5)" }}
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="no-scrollbar"
            onClick={(e) => e.stopPropagation()}
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: WARM_WHITE, borderRadius: "16px 16px 0 0", maxHeight: "92vh", overflowY: "auto", ...noScrollbar }}
          >
            <div style={{ position: "sticky", top: 0, background: WARM_WHITE, zIndex: 2, padding: "16px 16px 12px", borderBottom: `0.5px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: ESPRESSO }}>Filter & Sort</div>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{ width: 32, height: 32, borderRadius: 999, background: TAG_BG, border: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                aria-label="Close"
              >
                <X size={16} color={ESPRESSO} />
              </button>
            </div>

            {allActiveFilters.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "12px 16px" }}>
                {allActiveFilters.map((f) => (
                  <button
                    key={f}
                    onClick={() => removeFilter(f)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, background: SKIN_BG, border: `0.5px solid ${CHIP_BORDER}`, borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: CRIMSON, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    {f} <X size={11} />
                  </button>
                ))}
              </div>
            )}

            <DrawerSection title="Sort By" hint={SORT_TABS.some(t => !t.enabled) ? SORT_DISABLED_HINT : undefined}>
              <PillWrap>
                {SORT_TABS.map((t) => (
                  <Pill key={t.key} label={t.label} active={sortBy === t.key && t.enabled} disabled={!t.enabled} onClick={() => setSortBy(t.key)} />
                ))}
              </PillWrap>
            </DrawerSection>

            {/* Area is the one group that filters for real — neighborhood is populated. */}
            <DrawerSection title="Area">
              <PillWrap>
                {AREA_OPTIONS.map(o => (
                  <Pill key={o} label={o} active={areaFilter.includes(o)} disabled={!FILTERS_ENABLED.area} onClick={() => toggle(setAreaFilter, areaFilter, o)} />
                ))}
              </PillWrap>
            </DrawerSection>

            <DrawerSection title="Date & Hours" hint={FILTERS_ENABLED.hours ? undefined : HOURS_DISABLED_HINT}>
              <PillWrap>
                {HOURS_OPTIONS.map(o => (
                  <Pill key={o} label={o} active={hoursFilter.includes(o)} disabled={!FILTERS_ENABLED.hours} onClick={() => toggle(setHoursFilter, hoursFilter, o)} />
                ))}
              </PillWrap>
            </DrawerSection>

            <DrawerSection title="Trending Keywords" hint={FILTERS_ENABLED.keywords ? undefined : KEYWORDS_DISABLED_HINT}>
              <PillWrap>
                {KEYWORD_OPTIONS.map(o => (
                  <Pill key={o} label={o} active={keywordsFilter.includes(o)} disabled={!FILTERS_ENABLED.keywords} onClick={() => toggle(setKeywordsFilter, keywordsFilter, o)} />
                ))}
              </PillWrap>
            </DrawerSection>

            <DrawerSection title="Price Range" hint={FILTERS_ENABLED.price ? undefined : PRICE_DISABLED_HINT}>
              <div style={{ fontSize: 13, color: FILTERS_ENABLED.price ? ESPRESSO : MUTED, fontWeight: 700, marginBottom: 8, opacity: FILTERS_ENABLED.price ? 1 : 0.6 }}>
                $0 – ${priceMax === 1000 ? "1000+" : priceMax}
              </div>
              <input
                type="range"
                min={0}
                max={1000}
                step={50}
                value={priceMax}
                disabled={!FILTERS_ENABLED.price}
                aria-disabled={!FILTERS_ENABLED.price}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                style={{ width: "100%", accentColor: CRIMSON, opacity: FILTERS_ENABLED.price ? 1 : 0.4, cursor: FILTERS_ENABLED.price ? "pointer" : "default" }}
              />
            </DrawerSection>

            <DrawerSection title="Skintea Preferences" hint={FILTERS_ENABLED.prefs ? undefined : PREFS_DISABLED_HINT}>
              <PillWrap>
                {PREF_OPTIONS.map(o => (
                  <Pill key={o} label={o} active={prefFilter.includes(o)} disabled={!FILTERS_ENABLED.prefs} onClick={() => toggle(setPrefFilter, prefFilter, o)} />
                ))}
              </PillWrap>
            </DrawerSection>

            <DrawerSection title="Facilities & Service" hint={FILTERS_ENABLED.facility ? undefined : FACILITY_DISABLED_HINT}>
              <PillWrap>
                {FACILITY_OPTIONS.map(o => (
                  <Pill key={o} label={o} active={facilityFilter.includes(o)} disabled={!FILTERS_ENABLED.facility} onClick={() => toggle(setFacilityFilter, facilityFilter, o)} />
                ))}
              </PillWrap>
            </DrawerSection>

            {TREATMENT_CATEGORIES.map((cat, idx) => (
              <DrawerSection
                key={cat.title}
                title={cat.title}
                hint={FILTERS_ENABLED.treatment ? undefined : (idx === 0 ? TREATMENT_DISABLED_HINT : undefined)}
                last={idx === TREATMENT_CATEGORIES.length - 1}
              >
                <PillWrap>
                  {cat.items.map(o => (
                    <Pill key={o} label={o} active={treatmentFilter.includes(o)} disabled={!FILTERS_ENABLED.treatment} onClick={() => toggle(setTreatmentFilter, treatmentFilter, o)} />
                  ))}
                </PillWrap>
              </DrawerSection>
            ))}

            <div style={{ position: "sticky", bottom: 0, background: WARM_WHITE, borderTop: `0.5px solid ${BORDER}`, padding: "12px 16px 24px", display: "flex", gap: 8 }}>
              <button
                onClick={clearAll}
                style={{ flex: 1, border: `0.5px solid ${ESPRESSO}`, background: WARM_WHITE, color: ESPRESSO, fontSize: 13, fontWeight: 800, borderRadius: 8, padding: 12, cursor: "pointer", fontFamily: "inherit" }}
              >
                Clear All
              </button>
              {/* Saved filters were written but never re-applied on return, so the control is
                  disabled rather than confirming something that does not happen. */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <button
                  type="button"
                  disabled={!SAVE_FILTERS_ENABLED}
                  aria-disabled={!SAVE_FILTERS_ENABLED}
                  title="Saved filters aren't restored yet"
                  style={{ width: "100%", border: `0.5px solid ${CRIMSON}`, background: WARM_WHITE, color: CRIMSON, fontSize: 13, fontWeight: 800, borderRadius: 8, padding: 12, cursor: "default", fontFamily: "inherit", opacity: 0.4 }}
                >
                  Save Filters
                </button>
                <span style={{ fontSize: 9, color: MUTED, lineHeight: 1.3 }}>Saved filters aren't restored yet.</span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{ flex: 2, border: "none", background: CRIMSON, color: WARM_WHITE, fontSize: 13, fontWeight: 800, borderRadius: 8, padding: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}
              >
                Show {filtered.length} {filtered.length === 1 ? "Clinic" : "Clinics"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </AppFrame>
  );
}

function toggle(setter: React.Dispatch<React.SetStateAction<string[]>>, arr: string[], val: string) {
  if (arr.includes(val)) setter(arr.filter(v => v !== val));
  else setter([...arr, val]);
}

function DrawerSection({ title, children, hint, last }: { title: string; children: React.ReactNode; hint?: string; last?: boolean }) {
  return (
    <div>
      <div style={{ padding: "16px 16px 12px" }}>
        <div style={{ ...SECTION_LABEL, borderLeft: `2px solid ${CRIMSON}`, paddingLeft: 8, marginBottom: 10 }}>{title}</div>
        {children}
        {hint && <div style={{ fontSize: 10, color: MUTED, marginTop: 8, lineHeight: 1.4 }}>{hint}</div>}
      </div>
      {!last && <div style={{ height: 8, background: DIVIDER }} />}
    </div>
  );
}

function PillWrap({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{children}</div>;
}

function Pill({ label, active, onClick, disabled }: { label: string; active: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-disabled={disabled ? true : undefined}
      onClick={disabled ? undefined : onClick}
      style={{
        padding: "7px 14px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        border: `0.5px solid ${active ? ESPRESSO : BORDER}`,
        background: active ? ESPRESSO : "#FFFFFF",
        color: active ? WARM_WHITE : MUTED,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "default" : "pointer",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function KnownForRow({ value }: { value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
      <span style={{ ...SECTION_LABEL }}>Known for</span>
      <span style={{ width: 1, height: 10, background: BORDER }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: ESPRESSO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

function SaveBtn({ isSaved, onToggleSave }: { isSaved: boolean; onToggleSave: () => void }) {
  const [pop, setPop] = useState(false);
  return (
    <button
      type="button"
      aria-label={isSaved ? "Unsave clinic" : "Save clinic"}
      onClick={(e) => { e.stopPropagation(); onToggleSave(); setPop(true); setTimeout(() => setPop(false), 220); }}
      style={{ background: "transparent", border: "none", padding: 0, marginLeft: 4, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", transform: pop ? "scale(1.2)" : "scale(1)", transition: "transform 180ms ease" }}
    >
      <IconBookmark size={20} color={isSaved ? CRIMSON : "#999"} fill={isSaved ? CRIMSON : "none"} />
    </button>
  );
}

function HeroCard({ clinic, onOpen, isSaved, onToggleSave }: { clinic: Clinic; onOpen: () => void; isSaved: boolean; onToggleSave: () => void }) {
  const recommend = recommendFor(clinic);
  const reviews = reviewCountLabel(clinic);
  const tags = clinic.best_for ?? [];
  const visibleTags = tags.slice(0, 3);
  const extra = tags.length - visibleTags.length;
  const images = displayImages(clinic, useCategoryImages());
  return (
    <div
      onClick={onOpen}
      style={{ background: "#FFFFFF", borderRadius: 14, overflow: "hidden", cursor: "pointer", border: `1px solid ${CRIMSON}` }}
    >
      <ClinicImage images={images} height={172} showCount>
        {/* Badge gated on the recorded editorial decision, not on reaching this card shape. */}
        {isEditorialPick(clinic) && (
          <span style={{ position: "absolute", top: 10, left: 10, background: CRIMSON, color: WARM_WHITE, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: 4, padding: "3px 8px" }}>
            ☕ Skintea Pick
          </span>
        )}
        {/* One value, one label: "% recommend" with its sample size, on both card shapes. */}
        {recommend && (
          <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(28,10,0,0.55)", borderRadius: 8, padding: "5px 9px", textAlign: "right" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: WARM_WHITE, lineHeight: 1 }}>{recommend.pct}%</div>
            <div style={{ fontSize: 7.5, color: "rgba(255,252,248,0.75)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>recommend · {recommend.n} reviews</div>
          </div>
        )}
      </ClinicImage>

      <div style={{ padding: "11px 13px 12px" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: ESPRESSO, lineHeight: 1.2 }}>{clinic.name}</div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 2, marginBottom: 8 }}>
          {clinic.neighborhood ?? ""}{distanceSuffix(clinic)}
        </div>
        {clinic.known_for && <KnownForRow value={clinic.known_for} />}

        {visibleTags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
            {visibleTags.map((t, i) => (
              <span key={i} style={{ background: TAG_BG, color: ESPRESSO, fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4 }}>{t}</span>
            ))}
            {extra > 0 && <span style={{ fontSize: 10, color: MUTED, padding: "3px 4px" }}>+{extra} more</span>}
          </div>
        )}

        {clinic.tea_quote && (
          <div style={{ borderLeft: `2px solid ${CRIMSON}`, padding: "5px 8px", background: QUOTE_BG, marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontStyle: "italic", color: ESPRESSO, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>"{clinic.tea_quote}"</div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isVerified(clinic) && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: 999, background: CRIMSON }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: CRIMSON, textTransform: "uppercase", letterSpacing: "0.06em" }}>Verified</span>
              </span>
            )}
            {clinic.is_open_now ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: OPEN_GREEN }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: OPEN_GREEN }}>Open</span>
              </span>
            ) : clinic.is_open_now === false ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, opacity: 0.5 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: MUTED }} />
                <span style={{ fontSize: 10, color: MUTED }}>Closed</span>
              </span>
            ) : null}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {clinic.price_tier && (
              <span style={{ fontSize: 11, fontWeight: 700, color: ESPRESSO }}>{clinic.price_tier}</span>
            )}
            {reviews && (
              <span style={{ fontSize: 10, color: MUTED }}>{reviews}</span>
            )}
            <SaveBtn isSaved={isSaved} onToggleSave={onToggleSave} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactCard({ clinic, onOpen, isSaved, onToggleSave }: { clinic: Clinic; onOpen: () => void; isSaved: boolean; onToggleSave: () => void }) {
  const recommend = recommendFor(clinic);
  const reviews = reviewCountLabel(clinic);
  const images = displayImages(clinic, useCategoryImages(), 240);
  return (
    <div
      onClick={onOpen}
      style={{ background: "#FFFFFF", borderRadius: 12, overflow: "hidden", cursor: "pointer", border: `0.5px solid ${BORDER}`, display: "flex", height: 104 }}
    >
      <ClinicImage images={images} width={88} height={104} compact showCount>
        {/* Same value, same label as the hero card: "% recommend", with its sample size. */}
        {recommend && (
          <div style={{ position: "absolute", bottom: 6, left: 0, right: 0, textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: WARM_WHITE, lineHeight: 1, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>{recommend.pct}%</div>
            <div style={{ fontSize: 7, color: "rgba(255,252,248,0.85)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 1, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>recommend · {recommend.n} reviews</div>
          </div>
        )}
      </ClinicImage>
      <div style={{ flex: 1, padding: "9px 11px", display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: ESPRESSO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clinic.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: MUTED, marginTop: 2 }}>
            <MapPin size={10} color={MUTED} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {clinic.neighborhood ?? ""}{distanceSuffix(clinic)}
            </span>
          </div>
        </div>
        {clinic.known_for && <KnownForRow value={clinic.known_for} />}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: ESPRESSO }}>
            {clinic.price_tier ?? ""}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {reviews && (
              <span style={{ fontSize: 9, color: MUTED }}>{reviews}</span>
            )}
            <SaveBtn isSaved={isSaved} onToggleSave={onToggleSave} />
          </div>
        </div>
      </div>
    </div>
  );
}
