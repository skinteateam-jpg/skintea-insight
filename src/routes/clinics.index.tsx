import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import AppFrame from "@/components/AppFrame";
import { Search, SlidersHorizontal, Map, Bell, MapPin, Sparkles, X } from "lucide-react";
import { IconBookmark } from "@tabler/icons-react";
import { ClinicImage } from "@/components/ClinicImage";
import { CATEGORY_LABELS, clinicPhotos, type ClinicCategory } from "@/lib/clinicPhotos";
import { MIN_TAGGED } from "@/lib/opinionAggregate";
import { isPriceFresh, priceProvenance, shownPrice } from "@/lib/clinicPrices";

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

/* =============================================================================================
   /clinics — THE SECTIONS DEFINE THE PRODUCT, DATA COMES SECOND (owner, 2026-09-16, binding)
   Every section, sort and filter below ships whether or not data exists for it today. A section
   with no data shows its heading, its frame and a short honest note. A filter with no data ships
   visible and disabled with "not collected yet". Nothing is removed, hidden, merged or substituted
   because it is empty; removing one needs an explicit owner instruction naming it.
   No value is ever invented to fill a slot, and no stock photo ever sits in a clinic's photo slot.
   ============================================================================================= */

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const WARM_WHITE = "#FFFCF8";
const BORDER = "#E8DDD4";
const MUTED = "#999999";
const TAG_BG = "#F5EFEC";
const SKIN_BG = "#FEE8EC";
const CHIP_BORDER = "#F5C0CC";
const OPEN_GREEN = "#2D7A3A";
const DIVIDER = "#F5EFEC";

const NOT_COLLECTED = "not collected yet";

type Clinic = {
  id: string;
  name: string;
  neighborhood: string | null;
  address: string | null;
  best_for: string[] | null;
  known_for: string | null;
  photos: unknown;
  category: string | null;
  is_verified: boolean | null;
  is_featured: boolean | null;
  hours: unknown;
  latitude: number | string | null;
  longitude: number | string | null;
  google_rating: number | string | null;
  google_review_count: number | null;
  parking_is_free: boolean | null;
  field_provenance: any;
};

type TrendingTreatment = { id: string; emoji: string; label: string; keywords: string[]; month: string; sort_order: number };
type Treatment = { id: string; slug: string; name: string; category: string | null; active: boolean };
type Link = { clinic_id: string; treatment_id: string; price_from: number | string | null; price_unit: string | null; field_provenance: any };
type SkinScore = { clinic_id: string; skin_type: string; recommend_pct: number | null; field_provenance: any };
type Origin = { lat: number; lon: number };

/* ---------------------------------------------------------------------------------------------
   GAP INVENTORY — machine-readable. Every control that is disabled today names what it reads and
   the legitimate source that would fill it. `schema` is set where no column exists yet: that is a
   schema change, which is reported, never made from the app side. The same list is in CLAUDE.md
   ("/CLINICS — SECTIONS AND FILTERS INVENTORY"). When a source lands, wire the predicate and move
   the entry to LIVE; do not delete the control.
   --------------------------------------------------------------------------------------------- */
type Gap = { reads: string; fillsFrom: string; schema?: string };

export const CLINICS_PAGE_GAPS: Record<string, Gap> = {
  // Sort
  "sort:trending": { reads: "a per-clinic measured trend", fillsFrom: "skintea_measured counts of Skintea views/saves/intent taps per clinic per month", schema: "no per-clinic trend column or view exists" },
  "sort:rating": { reads: "a Skintea-measured rating", fillsFrom: "skintea_measured aggregate over signed-in clinic_reviews (clinics.avg_score with provenance)", schema: "Google rating is development-only and never orders a published list (2026-09-16)" },
  "sort:reviews": { reads: "a Skintea review count", fillsFrom: "count of signed-in clinic_reviews per clinic", schema: "Google review count is development-only and never orders a published list (2026-09-16)" },
  "sort:verified": { reads: "clinics.is_verified + field_provenance.is_verified", fillsFrom: "a signed /for-clinics submission or a Skintea visit (recorded verification event)" },
  // Hours
  "hours:same_day": { reads: "a same-day booking policy per clinic", fillsFrom: "/for-clinics submission, or the clinic's booking platform availability", schema: "no column (e.g. clinics.same_day_booking)" },
  // Trending keywords (all): need a measured trend AND a clinic-to-keyword mapping read from the clinic's own site
  "keywords:*": { reads: "trending_treatments (is_active, month, keywords) + a clinic-to-keyword mapping", fillsFrom: "skintea_measured trend over site search/social data; clinic_website_crawl read in context for the mapping", schema: "no clinic-to-keyword table exists" },
  // Preferences
  "prefs:walk_in": { reads: "walk-in policy", fillsFrom: "/for-clinics, or clinic_website_crawl read in context", schema: "no column" },
  "prefs:same_day": { reads: "same-day appointments", fillsFrom: "/for-clinics, or clinic_website_crawl read in context", schema: "no column" },
  "prefs:groups": { reads: "group bookings (2+)", fillsFrom: "/for-clinics", schema: "no column" },
  "prefs:women_only": { reads: "women-only staff", fillsFrom: "/for-clinics", schema: "no column" },
  "prefs:private_room": { reads: "private treatment room", fillsFrom: "/for-clinics", schema: "no column" },
  "prefs:first_time": { reads: "first-time discount", fillsFrom: "/for-clinics, or clinic_website_crawl (dated, like prices)", schema: "no column" },
  "prefs:card": { reads: "card payment accepted", fillsFrom: "/for-clinics", schema: "no column" },
  "prefs:free_parking": { reads: "clinics.parking_is_free + field_provenance.parking_is_free", fillsFrom: "/for-clinics, or clinic_website_crawl read in context. The one value present today (Shiny Laser Skin Clinic) has no provenance, so it is not used" },
  "prefs:transit": { reads: "distance to the nearest rail/BRT stop", fillsFrom: "Census coordinates + LA Metro GTFS stops (public data), computed", schema: "no column or view" },
  "prefs:second_visit": { reads: "second-visit perks", fillsFrom: "/for-clinics", schema: "no column" },
  // Facilities
  "facility:makeup_room": { reads: "makeup room", fillsFrom: "/for-clinics", schema: "no column" },
  "facility:changing_room": { reads: "changing room", fillsFrom: "/for-clinics", schema: "no column" },
  "facility:drink": { reads: "drink service", fillsFrom: "/for-clinics", schema: "no column" },
  "facility:kids": { reads: "kids space", fillsFrom: "/for-clinics", schema: "no column" },
  "facility:small": { reads: "bed count (under 3)", fillsFrom: "/for-clinics", schema: "no column (e.g. clinics.bed_count)" },
  "facility:large": { reads: "bed count (10+)", fillsFrom: "/for-clinics", schema: "no column (e.g. clinics.bed_count)" },
  "facility:membership": { reads: "membership offered", fillsFrom: "/for-clinics, or clinic_website_crawl read in context", schema: "no column" },
  "facility:korean": { reads: "Korean aesthetics", fillsFrom: "/for-clinics, or clinic_website_crawl read in context", schema: "no column" },
  "facility:mall": { reads: "located in a shopping mall", fillsFrom: "clinic address read against a sourced mall list, or /for-clinics", schema: "no column" },
  "facility:amex": { reads: "Amex accepted", fillsFrom: "/for-clinics", schema: "no column" },
  // Treatment pills from the design with no treatments row yet
  "treatment:design-only": { reads: "treatments row (slug, category, active) + clinic_treatments mappings", fillsFrom: "clinic_website_crawl read in context, the same pass as the 595 existing mappings" },
  // Page sections
  "section:trending_this_month": { reads: "trending_treatments where is_active (6 rows, all inactive, no measurement)", fillsFrom: "skintea_measured trend with its month in field_provenance" },
  "section:skintea_pick": { reads: "clinics.is_featured + field_provenance.is_featured {editor, recorded_at}", fillsFrom: "a recorded editorial decision, never a score or a paid placement" },
  "card:photos": { reads: "clinics.photos (0 listed clinics)", fillsFrom: "/for-clinics with written permission, or skintea_shot" },
  "card:known_for": { reads: "clinics.known_for (0 listed clinics)", fillsFrom: "clinic_website_crawl read in context (like best_for), or /for-clinics" },
  "card:skin_match": { reads: "clinic_skin_scores for the reader's skin type (0 rows)", fillsFrom: "skintea_measured over >= 10 signed-in clinic_reviews per clinic and skin type" },
};

/* LIVE today (184 listed clinics, 2026-09-16): neighborhood 176 / 31 areas · category 166 · best_for 107 ·
   google_rating 148 (sort only, never displayed) · google_review_count 170 (sort only) · hours 157 (open now /
   weekends / late computed here, never clinics.is_open_now) · coordinates 172 (Nearest + distance, after the reader
   shares a location) · clinic_treatments on 98 clinics · fresh listed prices from clinic_treatments.price_from.
   Google-derived values (rating, review count, most hours, some coordinates) are development-only and are replaced
   before Skintea publishes (CLAUDE.md, 2026-09-14). */

/* ---------------------------------------------------------------------------------------------
   Sorts
   --------------------------------------------------------------------------------------------- */
type SortKey = "nearest" | "rating" | "reviews" | "price_low" | "price_high" | "trending" | "verified";

const SORT_TABS: { key: SortKey; label: string }[] = [
  { key: "nearest", label: "Nearest" },
  { key: "rating", label: "Top Rated" },
  { key: "reviews", label: "Most Reviewed" },
  { key: "price_low", label: "Price: Low" },
  { key: "trending", label: "Trending" },
  { key: "verified", label: "Verified" },
];

const DRAWER_SORTS: { key: SortKey; label: string }[] = [
  { key: "nearest", label: "Nearest" },
  { key: "rating", label: "Highest rated" },
  { key: "reviews", label: "Most reviewed" },
  { key: "price_low", label: "Price low to high" },
  { key: "price_high", label: "Price high to low" },
  { key: "trending", label: "Trending now" },
  { key: "verified", label: "Verified only" },
];

/* ---------------------------------------------------------------------------------------------
   Drawer option lists — the designed lists, in the designed order. Items from the earlier design
   that the 2026-09-16 brief did not list are kept at the end of their list, not dropped.
   --------------------------------------------------------------------------------------------- */
const HOURS_OPTIONS: { id: string; label: string }[] = [
  { id: "open_now", label: "Open now" },
  { id: "weekends", label: "Open weekends" },
  { id: "late", label: "Open late after 8pm" },
  { id: "same_day", label: "Same-day booking" },
];

const KEYWORD_OPTIONS = ["Pore care", "Herb peeling", "Potenza", "Indiba", "Glass skin", "Chin line", "Slugging", "Korean facial", "LED therapy", "Aqua peel", "Small face", "Lifting"];

const PREF_OPTIONS: { id: string; label: string }[] = [
  { id: "walk_in", label: "Walk-in friendly" },
  { id: "same_day", label: "Same day OK" },
  { id: "groups", label: "Groups of 2+" },
  { id: "women_only", label: "Women-only staff" },
  { id: "private_room", label: "Private room" },
  { id: "first_time", label: "First-time discount" },
  { id: "card", label: "Card payment" },
  { id: "free_parking", label: "Free parking" },
  { id: "transit", label: "Near transit" },
  { id: "second_visit", label: "2nd visit perks" },
];

const FACILITY_OPTIONS: { id: string; label: string }[] = [
  { id: "makeup_room", label: "Makeup room" },
  { id: "changing_room", label: "Changing room" },
  { id: "drink", label: "Drink service" },
  { id: "kids", label: "Kids space" },
  { id: "small", label: "Small salon under 3 beds" },
  { id: "large", label: "Large salon 10+ beds" },
  { id: "membership", label: "Membership" },
  { id: "korean", label: "Korean aesthetics" },
  { id: "mall", label: "In shopping mall" },
  { id: "amex", label: "Amex friendly" },
];

// Treatment type groups in the designed order. `dbCategory` is treatments.category; every active treatment in that
// category renders as a live pill. `designOnly` are designed pills with no treatments row yet (disabled).
const TREATMENT_GROUPS: { title: string; dbCategory: string | null; designOnly: string[] }[] = [
  { title: "Facial and skin", dbCategory: "Facial & Skin", designOnly: ["Pore Care", "Glass Skin", "Lifting", "Brightening", "Herb Peeling", "Aqua Peel", "Deep Cleansing"] },
  { title: "Injectables and medical", dbCategory: "Injectables & Medical", designOnly: ["Indiba"] },
  // "Laser" itself is inactive (owner: "a category, not a treatment") and never renders.
  { title: "Laser and energy", dbCategory: "Laser & Energy", designOnly: ["LED Therapy", "Microneedling", "RF Therapy", "HIFU"] },
  { title: "Face surgery", dbCategory: null, designOnly: ["Chin Line", "Jaw Slimming", "Nose", "Eyes", "Face Lifting Surgery", "Thread Lift"] },
  { title: "Body", dbCategory: null, designOnly: ["Body Contouring", "Slimming", "Waist", "Bust", "Back", "Hip Lift"] },
  { title: "Hair removal", dbCategory: null, designOnly: ["Underarm", "Arms", "Legs", "Full Body", "VIO", "Face"] },
];
// Designed pills that ARE live treatments render once, under their treatments.category:
// Hydrafacial, Chemical Peel → Peels, IPL → IPL Photofacial, Botox, Filler → Fillers, PRF → PRF Injection, PRP,
// Potenza, Skinbooster → Skin Boosters.

const PRICE_ANY = 1000;
const DISTANCE_ANY = 25;

/* ---------------------------------------------------------------------------------------------
   Hours — computed from clinics.hours ([{day, hours: "10 AM to 7 PM"}]), in Los Angeles time.
   A day that cannot be read is unknown, and an unknown never matches a filter.
   --------------------------------------------------------------------------------------------- */
const DAY_INDEX: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
type Seg = [number, number];
type Week = (Seg[] | null)[];

function parseTime(t: string, fallbackMer: string | null): { min: number; mer: string | null } | null {
  const m = t.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = m[2] ? Number(m[2]) : 0;
  if (h < 1 || h > 12 || mm > 59) return null;
  const mer = m[3] ? m[3].toUpperCase() : fallbackMer;
  if (!mer) return null;
  return { min: ((h % 12) + (mer === "PM" ? 12 : 0)) * 60 + mm, mer: m[3] ? m[3].toUpperCase() : null };
}

function parseDay(text: string): Seg[] | null {
  const s = text.replace(/[   ]/g, " ").replace(/[–—]/g, " to ").trim();
  if (/^closed$/i.test(s)) return [];
  if (/^open 24 hours$/i.test(s)) return [[0, 1440]];
  const segs: Seg[] = [];
  for (const part of s.split(",")) {
    const [a, b, extra] = part.split(/\s+to\s+/i);
    if (!a || !b || extra !== undefined) return null;
    const end = parseTime(b, null);
    if (!end || !end.mer) return null;
    let start = parseTime(a, end.mer);
    if (!start) return null;
    const startHadMer = /(AM|PM)\s*$/i.test(a.trim());
    if (!startHadMer && start.min > end.min && end.min !== 0) start = parseTime(a, "AM");
    if (!start) return null;
    const e = end.min <= start.min ? end.min + 1440 : end.min;
    segs.push([start.min, e]);
  }
  return segs;
}

function parseWeek(hours: unknown): Week | null {
  if (!Array.isArray(hours) || hours.length === 0) return null;
  const week: Week = [null, null, null, null, null, null, null];
  for (const row of hours as any[]) {
    const d = DAY_INDEX[String(row?.day ?? "").toLowerCase()];
    if (d === undefined || typeof row?.hours !== "string") continue;
    week[d] = parseDay(row.hours);
  }
  return week;
}

function laNow(now: Date = new Date()): { day: number; min: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "long", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { day: DAY_INDEX[get("weekday").toLowerCase()] ?? 0, min: (Number(get("hour")) % 24) * 60 + Number(get("minute")) };
}

function openNow(week: Week | null, now = laNow()): { open: boolean; until: number | null } | null {
  if (!week) return null;
  const today = week[now.day];
  const yesterday = week[(now.day + 6) % 7];
  for (const [, e] of yesterday ?? []) if (e > 1440 && now.min < e - 1440) return { open: true, until: e - 1440 };
  if (today === null) return null;
  for (const [s, e] of today) if (now.min >= s && now.min < e) return { open: true, until: e % 1440 };
  return { open: false, until: null };
}

const opensWeekends = (w: Week | null) => !!w && [0, 6].some((d) => (w[d]?.length ?? 0) > 0);
const opensLate = (w: Week | null) => !!w && w.some((day) => (day ?? []).some(([, e]) => e > 20 * 60));

function clock(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
}

/* ---------------------------------------------------------------------------------------------
   Distance — only against an origin the reader shares in this browser. It is never stored or sent.
   --------------------------------------------------------------------------------------------- */
function milesBetween(o: Origin, lat: number, lon: number): number {
  const R = 3958.8;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat - o.lat);
  const dLon = toRad(lon - o.lon);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(o.lat)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const num = (v: number | string | null | undefined): number | null => (v === null || v === undefined || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);

/* ---------------------------------------------------------------------------------------------
   Recorded decisions. "Verified" and "Skintea Pick" render only from a provenance-bearing record,
   never from a score. The database trigger clinics_enforce_provenance also requires it.
   --------------------------------------------------------------------------------------------- */
const isVerified = (c: Clinic) => c.is_verified === true && !!c.field_provenance?.is_verified?.source;
const isEditorialPick = (c: Clinic) => c.is_featured === true && !!c.field_provenance?.is_featured?.source;

// A skin match figure is measured (source skintea_measured) and shown only with n >= MIN_TAGGED.
function skinMatchFor(scores: SkinScore[], skinType: string): { pct: number; n: number } | null {
  if (!skinType) return null;
  for (const s of scores) {
    if (s.skin_type?.toLowerCase() !== skinType) continue;
    const p = s.field_provenance?.recommend_pct;
    const n = Number(p?.n);
    if (p?.source === "skintea_measured" && Number.isFinite(n) && n >= MIN_TAGGED && s.recommend_pct != null) return { pct: s.recommend_pct, n };
  }
  return null;
}

type LowestPrice = { value: number; text: string; dateLabel: string; url: string | null; treatment: string };

type Enriched = Clinic & {
  week: Week | null;
  open: { open: boolean; until: number | null } | null;
  distance: number | null;
  treatmentSlugs: Set<string>;
  treatmentNames: string[];
  lowest: LowestPrice | null;
  skinMatch: { pct: number; n: number } | null;
};

function ClinicsPage() {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [skinScores, setSkinScores] = useState<SkinScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [skinType, setSkinType] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [locationQ, setLocationQ] = useState("");
  const [sortBy, setSortBy] = useState<SortKey | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTrending, setActiveTrending] = useState<string | null>(null);
  const [trending, setTrending] = useState<TrendingTreatment[]>([]);
  const [trendingMonth, setTrendingMonth] = useState("");

  const [origin, setOrigin] = useState<Origin | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "asking" | "denied" | "unsupported">("idle");

  const [areaFilter, setAreaFilter] = useState<string[]>([]);
  const [maxDistance, setMaxDistance] = useState(DISTANCE_ANY);
  const [hoursFilter, setHoursFilter] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState(PRICE_ANY);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [bestForFilter, setBestForFilter] = useState<string[]>([]);
  const [treatmentFilter, setTreatmentFilter] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showAllBestFor, setShowAllBestFor] = useState(false);
  const [savedConfirm, setSavedConfirm] = useState(false);
  const [savedClinics, setSavedClinics] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Only places that pass the strict clinic filter are listed; unsure / dropped places stay in the table, unlisted.
      const [c, t, s] = await Promise.all([
        supabase.from("clinics").select("*").eq("listing_filter", "passed").order("name", { ascending: true }),
        (supabase as any).from("treatments").select("id, slug, name, category, active"),
        (supabase as any).from("clinic_skin_scores").select("clinic_id, skin_type, recommend_pct, field_provenance"),
      ]);
      // clinic_treatments is paged so a growing table is never cut at the API row cap.
      const all: Link[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await (supabase as any).from("clinic_treatments").select("clinic_id, treatment_id, price_from, price_unit, field_provenance").range(from, from + 999);
        if (error || !data) break;
        all.push(...data);
        if (data.length < 1000) break;
      }
      if (!alive) return;
      if (c.error) setLoadError(true);
      setClinics((c.data as unknown as Clinic[]) ?? []);
      setTreatments(((t.data as Treatment[]) ?? []).filter((x) => x.active));
      setSkinScores((s.data as SkinScore[]) ?? []);
      setLinks(all);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await (supabase as any).from("trending_treatments").select("*").eq("is_active", true).order("sort_order", { ascending: true });
      if (!alive) return;
      if (data && data.length > 0) {
        setTrending(data as TrendingTreatment[]);
        setTrendingMonth((data[0] as TrendingTreatment).month ?? "");
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    try {
      const st = localStorage.getItem("skintea_skin_type");
      const qr = localStorage.getItem("skintea.quizResult");
      if (st) setSkinType(st.toLowerCase());
      else if (qr) setSkinType(JSON.parse(qr)?.skinTypeLabel?.toLowerCase() || "");
    } catch {}
    try {
      const saved = JSON.parse(localStorage.getItem("skintea.savedFilters") || "null");
      if (saved && saved.v === 2) {
        const arr = (x: unknown) => (Array.isArray(x) ? x.filter((v) => typeof v === "string") : []);
        setAreaFilter(arr(saved.areaFilter));
        setHoursFilter(arr(saved.hoursFilter));
        setTypeFilter(arr(saved.typeFilter));
        setBestForFilter(arr(saved.bestForFilter));
        setTreatmentFilter(arr(saved.treatmentFilter));
        if (typeof saved.priceMax === "number") setPriceMax(saved.priceMax);
        if (typeof saved.sortBy === "string" && saved.sortBy !== "nearest") setSortBy(saved.sortBy as SortKey);
      }
    } catch {}
    try {
      const arr = JSON.parse(localStorage.getItem("skintea.savedClinics") || "[]");
      if (Array.isArray(arr)) setSavedClinics(arr);
    } catch {}
  }, []);

  const toggleSaveClinic = (id: string) => {
    setSavedClinics((prev) => {
      const next = prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id];
      try { localStorage.setItem("skintea.savedClinics", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const requestLocation = (thenSort: boolean) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setGeoState("unsupported"); return; }
    setGeoState("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGeoState("idle");
        if (thenSort) setSortBy("nearest");
      },
      () => setGeoState("denied"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  };

  /* ----- derived data ----- */
  const treatmentById = useMemo(() => new globalThis.Map(treatments.map((t) => [t.id, t])), [treatments]);

  const enriched: Enriched[] = useMemo(() => {
    const byClinic = new globalThis.Map<string, Link[]>();
    for (const l of links) {
      const arr = byClinic.get(l.clinic_id) ?? [];
      arr.push(l);
      byClinic.set(l.clinic_id, arr);
    }
    const scoresByClinic = new globalThis.Map<string, SkinScore[]>();
    for (const s of skinScores) {
      const arr = scoresByClinic.get(s.clinic_id) ?? [];
      arr.push(s);
      scoresByClinic.set(s.clinic_id, arr);
    }
    const now = laNow();
    return clinics.map((c) => {
      const week = parseWeek(c.hours);
      const lat = num(c.latitude);
      const lon = num(c.longitude);
      const own = (byClinic.get(c.id) ?? []).filter((l) => treatmentById.has(l.treatment_id));
      let lowest: LowestPrice | null = null;
      for (const l of own) {
        const price = num(l.price_from);
        if (price == null || !isPriceFresh(priceProvenance(l.field_provenance).recordedAt)) continue;
        const shown = shownPrice(price, l.price_unit, l.field_provenance);
        if (!shown) continue;
        if (!lowest || price < lowest.value) lowest = { value: price, text: shown.text, dateLabel: shown.dateLabel, url: shown.url, treatment: treatmentById.get(l.treatment_id)!.name };
      }
      return {
        ...c,
        week,
        open: openNow(week, now),
        distance: origin && lat != null && lon != null ? milesBetween(origin, lat, lon) : null,
        treatmentSlugs: new Set(own.map((l) => treatmentById.get(l.treatment_id)!.slug)),
        treatmentNames: own.map((l) => treatmentById.get(l.treatment_id)!.name),
        lowest,
        skinMatch: skinMatchFor(scoresByClinic.get(c.id) ?? [], skinType),
      };
    });
  }, [clinics, links, skinScores, treatmentById, origin, skinType]);

  // Option lists and counts come from the listed clinics themselves.
  const areaCounts = useMemo(() => countBy(enriched.map((c) => c.neighborhood)), [enriched]);
  const typeCounts = useMemo(() => countBy(enriched.map((c) => c.category)), [enriched]);
  const bestForCounts = useMemo(() => countBy(enriched.flatMap((c) => c.best_for ?? [])), [enriched]);
  const treatmentCounts = useMemo(() => {
    const m = new globalThis.Map<string, number>();
    for (const c of enriched) for (const s of c.treatmentSlugs) m.set(s, (m.get(s) ?? 0) + 1);
    return m;
  }, [enriched]);
  const hoursCounts = useMemo(() => ({
    open_now: enriched.filter((c) => c.open?.open === true).length,
    weekends: enriched.filter((c) => opensWeekends(c.week)).length,
    late: enriched.filter((c) => opensLate(c.week)).length,
  }), [enriched]);
  const pricedCount = useMemo(() => enriched.filter((c) => c.lowest).length, [enriched]);
  const anyVerified = useMemo(() => enriched.some(isVerified), [enriched]);
  const coordCount = useMemo(() => clinics.filter((c) => num(c.latitude) != null && num(c.longitude) != null).length, [clinics]);

  const sortEnabled = (k: SortKey): boolean => {
    if (k === "trending") return false; // CLINICS_PAGE_GAPS["sort:trending"]
    // Top Rated and Most Reviewed ordered by Google rating and review count, which are development-only (CLAUDE.md,
    // 2026-09-14). Disabled until Skintea's own review data can order them (owner, 2026-09-16).
    if (k === "rating" || k === "reviews") return false; // CLINICS_PAGE_GAPS["sort:rating"], ["sort:reviews"]
    if (k === "verified") return anyVerified; // switches on by itself when a recorded verification exists
    return true;
  };

  const chooseSort = (k: SortKey) => {
    if (!sortEnabled(k)) return;
    if (k === "nearest" && !origin) { requestLocation(true); return; }
    if (k === "verified") { setVerifiedOnly(true); }
    setSortBy((prev) => (prev === k ? null : k));
  };

  const filtered = useMemo(() => {
    let out = enriched;
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase().trim();
      out = out.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.best_for ?? []).some((t) => t.toLowerCase().includes(q)) ||
        c.treatmentNames.some((t) => t.toLowerCase().includes(q)) ||
        (c.known_for ?? "").toLowerCase().includes(q));
    }
    if (locationQ.trim()) {
      const q = locationQ.toLowerCase().trim();
      out = out.filter((c) => (c.neighborhood ?? "").toLowerCase().includes(q) || (c.address ?? "").toLowerCase().includes(q));
    }
    if (activeTrending) {
      const chip = trending.find((t) => t.label === activeTrending);
      if (chip) out = out.filter((c) => [...(c.best_for ?? []), ...c.treatmentNames].some((b) => chip.keywords.some((k) => b.toLowerCase().includes(k.toLowerCase()))));
    }
    if (areaFilter.length) out = out.filter((c) => c.neighborhood != null && areaFilter.includes(c.neighborhood));
    if (origin && maxDistance < DISTANCE_ANY) out = out.filter((c) => c.distance != null && c.distance <= maxDistance);
    if (hoursFilter.includes("open_now")) out = out.filter((c) => c.open?.open === true);
    if (hoursFilter.includes("weekends")) out = out.filter((c) => opensWeekends(c.week));
    if (hoursFilter.includes("late")) out = out.filter((c) => opensLate(c.week));
    if (priceMax < PRICE_ANY) out = out.filter((c) => c.lowest != null && c.lowest.value <= priceMax);
    if (typeFilter.length) out = out.filter((c) => c.category != null && typeFilter.includes(c.category));
    if (bestForFilter.length) out = out.filter((c) => (c.best_for ?? []).some((b) => bestForFilter.includes(b)));
    if (treatmentFilter.length) out = out.filter((c) => treatmentFilter.some((s) => c.treatmentSlugs.has(s)));
    if (verifiedOnly && anyVerified) out = out.filter(isVerified);

    const last = (v: number | null, dir: 1 | -1) => (v == null ? Infinity : dir * v);
    const cmp: Record<string, (a: Enriched, b: Enriched) => number> = {
      nearest: (a, b) => last(a.distance, 1) - last(b.distance, 1),
      rating: (a, b) => last(num(a.google_rating), -1) - last(num(b.google_rating), -1) || last(a.google_review_count, -1) - last(b.google_review_count, -1),
      reviews: (a, b) => last(a.google_review_count, -1) - last(b.google_review_count, -1),
      price_low: (a, b) => last(a.lowest?.value ?? null, 1) - last(b.lowest?.value ?? null, 1),
      price_high: (a, b) => last(a.lowest?.value ?? null, -1) - last(b.lowest?.value ?? null, -1),
    };
    const active = sortBy && sortEnabled(sortBy) && !(sortBy === "nearest" && !origin) ? cmp[sortBy] : undefined;
    return [...out].sort((a, b) => (active ? active(a, b) : 0) || a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enriched, searchQ, locationQ, activeTrending, trending, areaFilter, origin, maxDistance, hoursFilter, priceMax, typeFilter, bestForFilter, treatmentFilter, verifiedOnly, anyVerified, sortBy]);

  const picks = useMemo(() => enriched.filter(isEditorialPick), [enriched]);

  /* ----- applied filters (only filters that actually narrow the list) ----- */
  const treatmentName = (slug: string) => treatments.find((t) => t.slug === slug)?.name ?? slug;
  const activeChips: { key: string; label: string; remove: () => void }[] = [
    ...areaFilter.map((a) => ({ key: `area:${a}`, label: a, remove: () => setAreaFilter((p) => p.filter((v) => v !== a)) })),
    ...(origin && maxDistance < DISTANCE_ANY ? [{ key: "distance", label: `Within ${maxDistance} mi`, remove: () => setMaxDistance(DISTANCE_ANY) }] : []),
    ...hoursFilter.map((h) => ({ key: `hours:${h}`, label: HOURS_OPTIONS.find((o) => o.id === h)?.label ?? h, remove: () => setHoursFilter((p) => p.filter((v) => v !== h)) })),
    ...(priceMax < PRICE_ANY ? [{ key: "price", label: `Listed price under $${priceMax}`, remove: () => setPriceMax(PRICE_ANY) }] : []),
    ...typeFilter.map((t) => ({ key: `type:${t}`, label: categoryLabel(t), remove: () => setTypeFilter((p) => p.filter((v) => v !== t)) })),
    ...bestForFilter.map((b) => ({ key: `bf:${b}`, label: b, remove: () => setBestForFilter((p) => p.filter((v) => v !== b)) })),
    ...treatmentFilter.map((s) => ({ key: `tr:${s}`, label: treatmentName(s), remove: () => setTreatmentFilter((p) => p.filter((v) => v !== s)) })),
    ...(verifiedOnly && anyVerified ? [{ key: "verified", label: "Verified only", remove: () => setVerifiedOnly(false) }] : []),
  ];

  const clearAll = () => {
    setAreaFilter([]); setMaxDistance(DISTANCE_ANY); setHoursFilter([]); setPriceMax(PRICE_ANY);
    setTypeFilter([]); setBestForFilter([]); setTreatmentFilter([]); setVerifiedOnly(false); setSortBy(null);
  };

  // Saved filters are written here and re-applied on the next visit (mount effect above). A location is never saved.
  const saveFilters = () => {
    try {
      localStorage.setItem("skintea.savedFilters", JSON.stringify({ v: 2, areaFilter, hoursFilter, priceMax, typeFilter, bestForFilter, treatmentFilter, sortBy }));
      setSavedConfirm(true);
      setTimeout(() => setSavedConfirm(false), 2000);
    } catch {}
  };

  const skinTypeDisplay = skinType ? skinType.charAt(0).toUpperCase() + skinType.slice(1) : "";

  const sortNote = (() => {
    if (sortBy === "nearest" && origin) return "Ordered by straight-line distance from the location you shared. It stays in this browser.";
    if (geoState === "asking") return "Waiting for your location…";
    if (geoState === "denied") return "Location not shared, so Nearest can't order the list.";
    if (geoState === "unsupported") return "This browser can't share a location, so Nearest can't order the list.";
    if (sortBy === "price_low" || sortBy === "price_high") return `Ordered by the lowest price a clinic lists on its own site, in any unit. ${pricedCount} of ${enriched.length} clinics list one; the rest come last.`;
    return null;
  })();

  const bestForOptions = bestForCounts.filter(([, n]) => showAllBestFor || n >= 2);

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
        {/* Map view and alerts have no handler behind them yet, so they render disabled. */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button type="button" disabled aria-disabled="true" aria-label="Map view — not available yet" title="Map view isn't available yet" style={ICON_BTN_DISABLED}>
            <Map size={20} color={ESPRESSO} />
          </button>
          <button type="button" disabled aria-disabled="true" aria-label="Alerts — not available yet" title="Alerts aren't available yet" style={ICON_BTN_DISABLED}>
            <Bell size={20} color={ESPRESSO} />
          </button>
        </div>
      </header>

      {/* 2. Dual search row: treatment field + location field */}
      <div style={{ padding: "10px 16px", borderBottom: `0.5px solid ${BORDER}`, display: "flex", gap: 8, alignItems: "center", background: WARM_WHITE }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", background: TAG_BG, borderRadius: 8, overflow: "hidden", height: 36, minWidth: 0 }}>
          <div style={{ position: "relative", flex: 1.6, display: "flex", alignItems: "center", minWidth: 0 }}>
            <Search size={16} color={MUTED} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Botox, facial, acne scars..." aria-label="Treatment or clinic" style={INPUT} />
          </div>
          <div style={{ width: 0.5, alignSelf: "stretch", background: BORDER, margin: "6px 0" }} />
          <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center", minWidth: 0 }}>
            <MapPin size={14} color={MUTED} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input value={locationQ} onChange={(e) => setLocationQ(e.target.value)} placeholder="Koreatown, LA..." aria-label="Neighborhood or address" style={{ ...INPUT, paddingLeft: 30 }} />
          </div>
        </div>
        <button type="button" aria-label="Filters" onClick={() => setDrawerOpen(true)} style={{ position: "relative", width: 36, height: 36, borderRadius: 8, border: `0.5px solid ${BORDER}`, background: WARM_WHITE, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
          <SlidersHorizontal size={16} color={ESPRESSO} />
          {activeChips.length > 0 && <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: 999, background: CRIMSON }} />}
        </button>
      </div>

      {/* 3. "Matched to your skin" bar */}
      <div
        style={{ background: SKIN_BG, borderBottom: `0.5px solid ${BORDER}`, padding: "9px 16px", display: "flex", alignItems: "center", gap: 8, cursor: skinType ? "default" : "pointer" }}
        onClick={() => { if (!skinType) navigate({ to: "/quiz" as any }).catch(() => {}); }}
      >
        {skinType ? (
          <>
            <Sparkles size={14} color={CRIMSON} />
            <span style={{ fontSize: 12, color: ESPRESSO }}>Matched to your skin — <span style={{ color: CRIMSON, fontWeight: 800 }}>{skinTypeDisplay}</span></span>
          </>
        ) : (
          <span style={{ fontSize: 12, color: MUTED }}>Take the quiz to get matched →</span>
        )}
      </div>

      {/* 4. Trending This Month — always rendered. The month label comes only from the rows. */}
      <div data-section="trending-this-month" style={{ borderBottom: `0.5px solid ${BORDER}`, padding: "10px 16px 12px", background: WARM_WHITE }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={SECTION_LABEL}>🔥 Trending This Month</div>
          {trendingMonth && <div style={{ fontSize: 9, color: MUTED, fontWeight: 600 }}>{trendingMonth}</div>}
        </div>
        {trending.length > 0 ? (
          <div className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", ...noScrollbar }}>
            {trending.map((c) => {
              const active = activeTrending === c.label;
              return (
                <button key={c.id} type="button" onClick={() => setActiveTrending((p) => (p === c.label ? null : c.label))}
                  style={{ flexShrink: 0, width: 64, height: 58, borderRadius: 10, background: active ? SKIN_BG : TAG_BG, border: active ? `1.5px solid ${CRIMSON}` : `0.5px solid ${BORDER}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer", fontFamily: "inherit", padding: "4px 2px" }}>
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{c.emoji}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: active ? CRIMSON : ESPRESSO, lineHeight: 1.2, textAlign: "center" }}>{c.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyFrame text="Trending isn't measured yet. This row fills from a measured count of what people search, save and book on Skintea." />
        )}
      </div>

      {/* 5. Applied filters (removable) */}
      {activeChips.length > 0 && (
        <div className="no-scrollbar" style={{ display: "flex", gap: 6, overflowX: "auto", padding: "8px 16px", borderBottom: `0.5px solid ${BORDER}`, ...noScrollbar }}>
          {activeChips.map((f) => <RemovableChip key={f.key} label={f.label} onRemove={f.remove} />)}
        </div>
      )}

      {/* 6. Sort tabs: Nearest | Top Rated | Most Reviewed | Price: Low | Trending | Verified */}
      <div style={{ borderBottom: `0.5px solid ${BORDER}`, background: WARM_WHITE }}>
        <div className="no-scrollbar" role="tablist" aria-label="Sort clinics" style={{ display: "flex", overflowX: "auto", ...noScrollbar }}>
          {SORT_TABS.map((t) => {
            const enabled = sortEnabled(t.key);
            const active = enabled && sortBy === t.key && !(t.key === "nearest" && !origin);
            return (
              <button key={t.key} type="button" role="tab" aria-selected={active} disabled={!enabled} aria-disabled={!enabled} data-sort={t.key}
                title={enabled ? undefined : `${t.label}: ${NOT_COLLECTED}`}
                onClick={enabled ? () => chooseSort(t.key) : undefined}
                style={{ flexShrink: 0, padding: "10px 14px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", background: "transparent", border: "none", color: active ? ESPRESSO : MUTED, opacity: enabled ? 1 : 0.4, borderBottom: active ? `2px solid ${CRIMSON}` : "2px solid transparent", cursor: enabled ? "pointer" : "default", fontFamily: "inherit" }}>
                {t.label}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 10, color: MUTED, padding: "0 16px 8px", lineHeight: 1.4 }}>
          {sortNote ? `${sortNote} ` : ""}Top Rated, Most Reviewed, Trending{anyVerified ? "" : " and Verified"}: {NOT_COLLECTED}.
        </div>
      </div>

      {/* 7. Skintea Pick — full-width slot, always rendered. Driven only by a recorded editorial decision. */}
      <div data-section="skintea-pick" style={{ padding: "12px 16px 0" }}>
        {picks.length > 0 ? (
          <ClinicCard clinic={picks[0]} hero skinType={skinType} origin={origin}
            onOpen={() => navigate({ to: "/clinics/$id", params: { id: picks[0].id } }).catch(() => {})}
            isSaved={savedClinics.includes(picks[0].id)} onToggleSave={() => toggleSaveClinic(picks[0].id)} />
        ) : (
          <div style={{ border: `1px dashed ${CRIMSON}`, borderRadius: 14, padding: "12px 13px", background: "#FFFFFF" }}>
            <span style={{ display: "inline-block", background: CRIMSON, color: WARM_WHITE, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: 4, padding: "3px 8px" }}>☕ Skintea Pick</span>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 8, lineHeight: 1.45 }}>
              No clinic has been picked yet. A pick is an editor's recorded decision, with who picked it and when. It is never a score and never a paid placement.
            </div>
          </div>
        )}
      </div>

      {/* 8. Results bar — a plain count, never "near you". */}
      <div style={{ padding: "12px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={SECTION_LABEL} data-result-count={loading ? "" : filtered.length}>
          {loading ? "Loading clinics…" : `${filtered.length} ${filtered.length === 1 ? "clinic" : "clinics"}${activeTrending ? ` for ${activeTrending}` : ""}`}
        </div>
        <div style={{ fontSize: 10, color: MUTED }}>{locationQ.trim() || "Los Angeles area listings"}</div>
      </div>

      {/* 9. Cards */}
      <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          <div style={{ color: MUTED, fontSize: 13, padding: 40, textAlign: "center" }}>Loading clinics...</div>
        ) : loadError ? (
          <div style={{ color: MUTED, fontSize: 13, padding: 40, textAlign: "center" }}>Clinics couldn't be loaded. Try again in a moment.</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ color: MUTED, fontSize: 13 }}>No clinics match this filter.</div>
            <button type="button" onClick={clearAll} style={{ marginTop: 10, background: "transparent", border: "none", color: CRIMSON, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Clear filters →</button>
          </div>
        ) : (
          filtered.map((c) => (
            <ClinicCard key={c.id} clinic={c} skinType={skinType} origin={origin}
              onOpen={() => navigate({ to: "/clinics/$id", params: { id: c.id } }).catch(() => {})}
              isSaved={savedClinics.includes(c.id)} onToggleSave={() => toggleSaveClinic(c.id)} />
          ))
        )}
      </div>

      <BottomNav />

      {/* FILTER DRAWER — full-screen sheet */}
      {drawerOpen && (
        <div role="dialog" aria-modal="true" aria-label="Filter and sort clinics" data-drawer="clinics-filters"
          style={{ position: "fixed", inset: 0, zIndex: 50, background: WARM_WHITE, display: "flex", flexDirection: "column" }}>
          <div style={{ background: WARM_WHITE, padding: "16px 16px 12px", borderBottom: `0.5px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: ESPRESSO }}>Filter & Sort</div>
            <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close" style={{ width: 32, height: 32, borderRadius: 999, background: TAG_BG, border: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <X size={16} color={ESPRESSO} />
            </button>
          </div>

          <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto", ...noScrollbar }}>
            {/* 1. Active filters */}
            <DrawerSection n={1} title="Active filters">
              {activeChips.length > 0 ? (
                <PillWrap>{activeChips.map((f) => <RemovableChip key={f.key} label={f.label} onRemove={f.remove} />)}</PillWrap>
              ) : (
                <div style={{ fontSize: 12, color: MUTED }}>No filters applied.</div>
              )}
            </DrawerSection>

            {/* 2. Sort by */}
            <DrawerSection n={2} title="Sort by" hint={sortNote ?? undefined}>
              <PillWrap>
                {DRAWER_SORTS.map((s) => {
                  if (s.key === "verified") {
                    return <Pill key={s.key} label={s.label} active={verifiedOnly && anyVerified} disabled={!anyVerified} note={anyVerified ? undefined : NOT_COLLECTED} gap="sort:verified" onClick={() => setVerifiedOnly((v) => !v)} />;
                  }
                  const enabled = sortEnabled(s.key);
                  return <Pill key={s.key} label={s.label} active={enabled && sortBy === s.key && !(s.key === "nearest" && !origin)} disabled={!enabled} note={enabled ? undefined : NOT_COLLECTED} gap={enabled ? undefined : `sort:${s.key}`} onClick={() => chooseSort(s.key)} />;
                })}
              </PillWrap>
            </DrawerSection>

            {/* 3. Area and distance */}
            <DrawerSection n={3} title="Area and distance" hint={`${enriched.filter((c) => c.neighborhood).length} clinics across ${areaCounts.length} areas.`}>
              <PillWrap>
                {areaCounts.map(([a, n]) => <Pill key={a} label={a} count={n} active={areaFilter.includes(a)} onClick={() => toggleIn(setAreaFilter, a)} />)}
              </PillWrap>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: origin ? ESPRESSO : MUTED }}>Distance: {maxDistance >= DISTANCE_ANY ? "any" : `within ${maxDistance} mi`}</span>
                  {!origin && (
                    <button type="button" onClick={() => requestLocation(false)} style={{ background: "transparent", border: "none", color: CRIMSON, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
                      {geoState === "asking" ? "Waiting…" : "Use my location"}
                    </button>
                  )}
                </div>
                <input type="range" min={1} max={DISTANCE_ANY} step={1} value={maxDistance} disabled={!origin} aria-disabled={!origin} aria-label="Maximum distance in miles"
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                  style={{ width: "100%", accentColor: CRIMSON, opacity: origin ? 1 : 0.4, cursor: origin ? "pointer" : "default" }} />
                <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.4 }}>
                  {origin
                    ? `Straight-line distance to ${coordCount} clinics with coordinates. Your location stays in this browser.`
                    : `Needs your location to measure from (${coordCount} clinics have coordinates). It stays in this browser and is never saved or sent.`}
                </div>
              </div>
            </DrawerSection>

            {/* 4. Date and hours — computed from clinics.hours in Los Angeles time */}
            <DrawerSection n={4} title="Date and hours" hint={`From the hours listed for ${enriched.filter((c) => c.week).length} clinics, in Los Angeles time.`}>
              <PillWrap>
                {HOURS_OPTIONS.map((o) => {
                  if (o.id === "same_day") return <Pill key={o.id} label={o.label} active={false} disabled note={NOT_COLLECTED} gap="hours:same_day" onClick={() => {}} />;
                  return <Pill key={o.id} label={o.label} count={hoursCounts[o.id as "open_now" | "weekends" | "late"]} active={hoursFilter.includes(o.id)} onClick={() => toggleIn(setHoursFilter, o.id)} />;
                })}
              </PillWrap>
            </DrawerSection>

            {/* 5. Trending keywords */}
            <DrawerSection n={5} title="Trending keywords" hint={`Trending keywords: ${NOT_COLLECTED}.`}>
              <PillWrap>
                {KEYWORD_OPTIONS.map((k) => <Pill key={k} label={k} active={false} disabled gap="keywords:*" onClick={() => {}} />)}
              </PillWrap>
            </DrawerSection>

            {/* 6. Price range */}
            <DrawerSection n={6} title="Price range" hint={`Lowest price a clinic lists on its own site, in any unit (per session, per unit, per syringe). ${pricedCount} of ${enriched.length} clinics list a current price; the others are left out while this filter is on.`}>
              <div style={{ fontSize: 13, color: ESPRESSO, fontWeight: 700, marginBottom: 8 }}>$0 – {priceMax >= PRICE_ANY ? "$1000+" : `$${priceMax}`}</div>
              <input type="range" min={0} max={PRICE_ANY} step={50} value={priceMax} aria-label="Maximum listed price"
                onChange={(e) => setPriceMax(Number(e.target.value))} style={{ width: "100%", accentColor: CRIMSON, cursor: "pointer" }} />
            </DrawerSection>

            {/* 7. Skintea preferences */}
            <DrawerSection n={7} title="Skintea preferences" hint={`Preferences: ${NOT_COLLECTED}.`}>
              <PillWrap>
                {PREF_OPTIONS.map((o) => <Pill key={o.id} label={o.label} active={false} disabled gap={`prefs:${o.id}`} onClick={() => {}} />)}
              </PillWrap>
            </DrawerSection>

            {/* 8. Facilities and service */}
            <DrawerSection n={8} title="Facilities and service" hint={`Facilities: ${NOT_COLLECTED}.`}>
              <PillWrap>
                {FACILITY_OPTIONS.map((o) => <Pill key={o.id} label={o.label} active={false} disabled gap={`facility:${o.id}`} onClick={() => {}} />)}
              </PillWrap>
            </DrawerSection>

            {/* 9. Treatment type — clinic_treatments joined to treatments.category; clinic type and best_for alongside */}
            <DrawerSection n={9} title="Treatment type" last hint="Treatments a clinic's own website lists. Greyed pills: not collected yet.">
              {TREATMENT_GROUPS.map((g) => {
                const live = g.dbCategory ? treatments.filter((t) => t.category === g.dbCategory).sort((a, b) => a.name.localeCompare(b.name)) : [];
                return (
                  <SubGroup key={g.title} title={g.title}>
                    {live.map((t) => <Pill key={t.slug} label={t.name} count={treatmentCounts.get(t.slug) ?? 0} active={treatmentFilter.includes(t.slug)} disabled={(treatmentCounts.get(t.slug) ?? 0) === 0} note={(treatmentCounts.get(t.slug) ?? 0) === 0 ? NOT_COLLECTED : undefined} onClick={() => toggleIn(setTreatmentFilter, t.slug)} />)}
                    {g.designOnly.map((d) => <Pill key={d} label={d} active={false} disabled gap="treatment:design-only" onClick={() => {}} />)}
                  </SubGroup>
                );
              })}
              {treatments.filter((t) => !TREATMENT_GROUPS.some((g) => g.dbCategory === t.category)).length > 0 && (
                <SubGroup title="Other treatments">
                  {treatments.filter((t) => !TREATMENT_GROUPS.some((g) => g.dbCategory === t.category)).map((t) => (
                    <Pill key={t.slug} label={t.name} count={treatmentCounts.get(t.slug) ?? 0} active={treatmentFilter.includes(t.slug)} onClick={() => toggleIn(setTreatmentFilter, t.slug)} />
                  ))}
                </SubGroup>
              )}
              <SubGroup title="Clinic type">
                {typeCounts.map(([t, n]) => <Pill key={t} label={categoryLabel(t)} count={n} active={typeFilter.includes(t)} onClick={() => toggleIn(setTypeFilter, t)} />)}
              </SubGroup>
              <SubGroup title="What it's best for" note={`As each clinic's own website states it. ${bestForCounts.length} phrases on ${enriched.filter((c) => (c.best_for ?? []).length > 0).length} clinics.`}>
                {bestForOptions.map(([b, n]) => <Pill key={b} label={b} count={n} active={bestForFilter.includes(b)} onClick={() => toggleIn(setBestForFilter, b)} />)}
                <button type="button" onClick={() => setShowAllBestFor((v) => !v)} style={{ background: "transparent", border: "none", color: CRIMSON, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: "7px 4px" }}>
                  {showAllBestFor ? "Show fewer" : `Show all ${bestForCounts.length}`}
                </button>
              </SubGroup>
            </DrawerSection>
          </div>

          {/* Footer, fixed: Clear all | Save filters | Show X clinics */}
          <div style={{ flexShrink: 0, background: WARM_WHITE, borderTop: `0.5px solid ${BORDER}`, padding: "12px 16px 24px", display: "flex", gap: 8 }}>
            <button type="button" onClick={clearAll} style={{ flex: 1, border: `0.5px solid ${ESPRESSO}`, background: WARM_WHITE, color: ESPRESSO, fontSize: 13, fontWeight: 800, borderRadius: 8, padding: 12, cursor: "pointer", fontFamily: "inherit" }}>
              Clear all
            </button>
            <button type="button" onClick={saveFilters} style={{ flex: 1, border: `0.5px solid ${CRIMSON}`, background: WARM_WHITE, color: CRIMSON, fontSize: 13, fontWeight: 800, borderRadius: 8, padding: 12, cursor: "pointer", fontFamily: "inherit" }}>
              {savedConfirm ? "Saved" : "Save filters"}
            </button>
            <button type="button" data-show-count={filtered.length} onClick={() => setDrawerOpen(false)} style={{ flex: 2, border: "none", background: CRIMSON, color: WARM_WHITE, fontSize: 13, fontWeight: 800, borderRadius: 8, padding: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}>
              Show {filtered.length} {filtered.length === 1 ? "clinic" : "clinics"}
            </button>
          </div>
        </div>
      )}
    </div>
    </AppFrame>
  );
}

/* ---------------------------------------------------------------------------------------------
   Helpers and small components
   --------------------------------------------------------------------------------------------- */
const SECTION_LABEL: React.CSSProperties = { fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: CRIMSON };
const noScrollbar: React.CSSProperties = { scrollbarWidth: "none", msOverflowStyle: "none" };
const ICON_BTN_DISABLED: React.CSSProperties = { background: "transparent", border: "none", padding: 0, cursor: "default", opacity: 0.35, display: "inline-flex" };
const INPUT: React.CSSProperties = { width: "100%", background: "transparent", border: "none", padding: "9px 8px 9px 32px", fontSize: 13, color: ESPRESSO, outline: "none", fontFamily: "inherit", boxSizing: "border-box", minWidth: 0 };

function countBy(values: (string | null | undefined)[]): [string, number][] {
  const m = new globalThis.Map<string, number>();
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function categoryLabel(c: string): string {
  const l = CATEGORY_LABELS[c as ClinicCategory];
  return l ? l.charAt(0).toUpperCase() + l.slice(1) : c;
}

function toggleIn(setter: React.Dispatch<React.SetStateAction<string[]>>, val: string) {
  setter((arr) => (arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]));
}

function EmptyFrame({ text }: { text: string }) {
  return <div style={{ border: `0.5px dashed ${BORDER}`, borderRadius: 10, padding: "10px 12px", fontSize: 11, color: MUTED, lineHeight: 1.45, background: "#FFFFFF" }}>{text}</div>;
}

function RemovableChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button type="button" onClick={onRemove} aria-label={`Remove filter ${label}`}
      style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, background: SKIN_BG, border: `0.5px solid ${CHIP_BORDER}`, borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: CRIMSON, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
      {label} <X size={11} />
    </button>
  );
}

function DrawerSection({ n, title, children, hint, last }: { n: number; title: string; children: React.ReactNode; hint?: string; last?: boolean }) {
  return (
    <div data-drawer-section={n}>
      <div style={{ padding: "16px 16px 12px" }}>
        <div style={{ ...SECTION_LABEL, borderLeft: `2px solid ${CRIMSON}`, paddingLeft: 8, marginBottom: 10 }}>{title}</div>
        {children}
        {hint && <div style={{ fontSize: 10, color: MUTED, marginTop: 8, lineHeight: 1.4 }}>{hint}</div>}
      </div>
      {!last && <div style={{ height: 8, background: DIVIDER }} />}
    </div>
  );
}

function SubGroup({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: ESPRESSO, marginBottom: 8 }}>{title}</div>
      <PillWrap>{children}</PillWrap>
      {note && <div style={{ fontSize: 10, color: MUTED, marginTop: 6, lineHeight: 1.4 }}>{note}</div>}
    </div>
  );
}

function PillWrap({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{children}</div>;
}

// A disabled pill is visible, says "not collected yet" on hover and to screen readers, and carries the
// CLINICS_PAGE_GAPS key of the source that would fill it (data-gap), so the gap is inspectable in the DOM too.
function Pill({ label, active, onClick, disabled, count, note, gap }: { label: string; active: boolean; onClick: () => void; disabled?: boolean; count?: number; note?: string; gap?: string }) {
  const why = disabled ? note ?? NOT_COLLECTED : undefined;
  return (
    <button type="button" disabled={disabled} aria-disabled={disabled ? true : undefined} aria-pressed={disabled ? undefined : active}
      aria-label={why ? `${label} — ${why}` : undefined} title={why ? `${label}: ${why}` : undefined}
      data-gap={gap} onClick={disabled ? undefined : onClick}
      style={{ padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, border: `0.5px solid ${active ? ESPRESSO : BORDER}`, background: active ? ESPRESSO : "#FFFFFF", color: active ? WARM_WHITE : disabled ? MUTED : ESPRESSO, opacity: disabled ? 0.45 : 1, cursor: disabled ? "default" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5 }}>
      {label}
      {count != null && !disabled && <span style={{ fontSize: 10, fontWeight: 700, color: active ? "rgba(255,252,248,0.75)" : MUTED }}>{count}</span>}
    </button>
  );
}

function SaveBtn({ isSaved, onToggleSave }: { isSaved: boolean; onToggleSave: () => void }) {
  const [pop, setPop] = useState(false);
  return (
    <button type="button" aria-label={isSaved ? "Unsave clinic" : "Save clinic"}
      onClick={(e) => { e.stopPropagation(); onToggleSave(); setPop(true); setTimeout(() => setPop(false), 220); }}
      style={{ background: "transparent", border: "none", padding: 0, marginLeft: 4, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", transform: pop ? "scale(1.2)" : "scale(1)", transition: "transform 180ms ease" }}>
      <IconBookmark size={20} color={isSaved ? CRIMSON : MUTED} fill={isSaved ? CRIMSON : "none"} />
    </button>
  );
}

// Horizontal photo strip (HPB pattern). Only the clinic's own photos: never a stock or category image, not even as a
// placeholder. With none, one plain neutral tile says so.
function PhotoStrip({ clinic, height }: { clinic: Clinic; height: number }) {
  const photos = clinicPhotos(clinic.photos);
  if (photos.length === 0) {
    return <ClinicImage images={[]} height={height} radius={8} />;
  }
  return (
    <div className="no-scrollbar" style={{ display: "flex", gap: 4, overflowX: "auto", ...noScrollbar }} onClick={(e) => e.stopPropagation()}>
      {photos.map((p) => (
        <ClinicImage key={p.url} images={[{ url: p.url, kind: "clinic", alt: p.alt || clinic.name }]} width={Math.round(height * 1.33)} height={height} radius={8} />
      ))}
    </div>
  );
}

function ClinicCard({ clinic, hero, skinType, origin, onOpen, isSaved, onToggleSave }: { clinic: Enriched; hero?: boolean; skinType: string; origin: Origin | null; onOpen: () => void; isSaved: boolean; onToggleSave: () => void }) {
  const tags = clinic.best_for ?? [];
  const visibleTags = tags.slice(0, 3);
  const extra = tags.length - visibleTags.length;
  const place = [clinic.neighborhood, clinic.category ? categoryLabel(clinic.category) : null, origin && clinic.distance != null ? `${clinic.distance.toFixed(1)} mi` : null].filter(Boolean).join(" · ");
  return (
    <div onClick={onOpen} data-clinic-card={clinic.id}
      style={{ background: "#FFFFFF", borderRadius: hero ? 14 : 12, overflow: "hidden", cursor: "pointer", border: hero ? `1px solid ${CRIMSON}` : `0.5px solid ${BORDER}`, padding: 10 }}>
      <PhotoStrip clinic={clinic} height={hero ? 150 : 88} />

      <div style={{ padding: "9px 2px 0" }}>
        {hero && isEditorialPick(clinic) && (
          <span style={{ display: "inline-block", background: CRIMSON, color: WARM_WHITE, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: 4, padding: "3px 8px", marginBottom: 6 }}>☕ Skintea Pick</span>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: hero ? 16 : 14, fontWeight: 800, color: ESPRESSO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{clinic.name}</div>
          {isVerified(clinic) && <span style={{ fontSize: 9, fontWeight: 800, color: CRIMSON, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>● Verified</span>}
        </div>
        {place && (
          <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: MUTED, marginTop: 2 }}>
            <MapPin size={10} color={MUTED} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{place}</span>
          </div>
        )}

        {/* Known for — always rendered */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7 }}>
          <span style={SECTION_LABEL}>Known for</span>
          <span style={{ width: 1, height: 10, background: BORDER }} />
          {clinic.known_for
            ? <span style={{ fontSize: 11, fontWeight: 700, color: ESPRESSO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clinic.known_for}</span>
            : <span style={{ fontSize: 11, color: MUTED }}>{NOT_COLLECTED}</span>}
        </div>

        {visibleTags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
            {visibleTags.map((t) => <span key={t} style={{ background: TAG_BG, color: ESPRESSO, fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4 }}>{t}</span>)}
            {extra > 0 && <span style={{ fontSize: 10, color: MUTED, padding: "3px 4px" }}>+{extra} more</span>}
          </div>
        )}

        {/* Skin match bar — always rendered; a figure only when measured with n >= 10 */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
            <span style={{ color: ESPRESSO, fontWeight: 700 }}>Skin match{skinType ? ` · ${skinType.charAt(0).toUpperCase() + skinType.slice(1)}` : ""}</span>
            <span style={{ color: MUTED }}>
              {clinic.skinMatch ? `${clinic.skinMatch.pct}% recommend · ${clinic.skinMatch.n} reviews` : skinType ? "not enough reviews yet" : "take the quiz to see it"}
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 999, background: TAG_BG, overflow: "hidden" }}>
            {clinic.skinMatch && <div style={{ width: `${clinic.skinMatch.pct}%`, height: "100%", background: CRIMSON }} />}
          </div>
        </div>

        {/* Footer: open status (computed from hours) · listed price · bookmark */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 9, gap: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            {clinic.open ? (
              clinic.open.open ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: OPEN_GREEN }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: OPEN_GREEN }}>Open now{clinic.open.until != null ? ` · until ${clock(clinic.open.until)}` : ""}</span>
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: MUTED }} />
                  <span style={{ fontSize: 10, color: MUTED }}>Closed now</span>
                </span>
              )
            ) : (
              <span style={{ fontSize: 10, color: MUTED }}>Hours {NOT_COLLECTED}</span>
            )}
            {clinic.lowest && (
              <span style={{ fontSize: 10, color: ESPRESSO, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <b>{clinic.lowest.treatment} {clinic.lowest.text}</b>{" "}
                {clinic.lowest.url
                  ? <a href={clinic.lowest.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: MUTED }}>{clinic.lowest.dateLabel}</a>
                  : <span style={{ color: MUTED }}>{clinic.lowest.dateLabel}</span>}
              </span>
            )}
          </div>
          <SaveBtn isSaved={isSaved} onToggleSave={onToggleSave} />
        </div>
      </div>
    </div>
  );
}
