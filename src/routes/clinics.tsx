import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Search, SlidersHorizontal, Map, Bell, MapPin, Sparkles, X } from "lucide-react";

export const Route = createFileRoute("/clinics")({
  head: () => ({
    meta: [
      { title: "Find your clinic — Skintea" },
      { name: "description", content: "Real LA clinics, ranked by Skintea trust score. No sponsored placements." },
      { property: "og:title", content: "Find your clinic — Skintea" },
      { property: "og:description", content: "Real LA clinics, ranked by Skintea trust score. No sponsored placements." },
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
  tea_quote: string | null;
  tea_skin_type: string | null;
  badges: string[] | null;
  image_url: string | null;
  photos: string[] | null;
  booking_url: string | null;
  is_verified: boolean;
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

const SORT_TABS: { key: string; label: string }[] = [
  { key: "nearest", label: "Nearest" },
  { key: "rating", label: "Top Rated" },
  { key: "reviews", label: "Most Reviewed" },
  { key: "price", label: "Price: Low" },
  { key: "trending", label: "Trending" },
  { key: "verified", label: "Verified" },
];

const AREA_OPTIONS = ["West Hollywood", "Beverly Hills", "Koreatown", "Silver Lake", "Santa Monica", "Downtown LA", "Culver City", "Studio City"];
const HOURS_OPTIONS = ["Open Now", "Open Weekends", "Open Late (after 8pm)", "Same-day OK", "Walk-in Friendly"];
const KEYWORD_OPTIONS = ["Pore Care", "Herb Peeling", "Potenza", "Indiba", "Glass Skin", "Chin Line", "Aqua Peel", "Korean Facial", "Slugging", "LED Therapy", "Small Face", "Lifting"];
const PREF_OPTIONS = ["Walk-in Friendly", "Same-day OK", "Groups (2+)", "Women-Only Staff", "Private Room", "First-Time Discount", "Card Payment OK", "Free Parking", "Near Transit", "2nd Visit Perks"];
const FACILITY_OPTIONS = ["Makeup Room", "Changing Room", "Drink Service", "Kids Space", "Small Salon (under 3 beds)", "Large Salon (10+ beds)", "Korean Aesthetics", "Membership Available", "In Shopping Mall", "Amex Friendly"];
const TREATMENT_OPTIONS = ["Facial", "Laser", "IPL", "Botox", "Filler", "PRF", "Microneedling", "Hydrafacial", "LED Therapy", "Chemical Peel", "Hair Removal", "Body"];

function ClinicsPage() {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);

  const [skinType, setSkinType] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [sortBy, setSortBy] = useState("nearest");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeThumbMap, setActiveThumbMap] = useState<Record<string, number>>({});

  const [areaFilter, setAreaFilter] = useState<string[]>([]);
  const [hoursFilter, setHoursFilter] = useState<string[]>([]);
  const [keywordsFilter, setKeywordsFilter] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState(1000);
  const [prefFilter, setPrefFilter] = useState<string[]>([]);
  const [facilityFilter, setFacilityFilter] = useState<string[]>([]);
  const [treatmentFilter, setTreatmentFilter] = useState<string[]>([]);
  const [, setSavedFilters] = useState<any>(null);
  const [savedConfirm, setSavedConfirm] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from("clinics").select("*").order("trust_score", { ascending: false });
      if (!alive) return;
      setClinics((data as unknown as Clinic[]) ?? []);
      setLoading(false);
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
  }, []);

  const allActiveFilters: string[] = [
    ...areaFilter,
    ...hoursFilter,
    ...keywordsFilter,
    ...prefFilter,
    ...facilityFilter,
    ...treatmentFilter,
    ...(priceMax < 1000 ? [`Under $${priceMax}`] : []),
  ];

  const filtered = useMemo(() => {
    let out = clinics;
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      out = out.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.best_for ?? []).some(t => t.toLowerCase().includes(q)) ||
        (c.neighborhood ?? "").toLowerCase().includes(q)
      );
    }
    if (areaFilter.length) out = out.filter(c => areaFilter.some(a => (c.neighborhood ?? "").toLowerCase().includes(a.toLowerCase())));
    if (hoursFilter.includes("Open Now")) out = out.filter(c => c.is_open_now);
    if (hoursFilter.includes("Same-day OK")) out = out.filter(c => c.same_day_ok);
    if (hoursFilter.includes("Walk-in Friendly")) out = out.filter(c => c.walk_in_ok);
    if (treatmentFilter.length) out = out.filter(c => treatmentFilter.some(t => (c.best_for ?? []).some(b => b.toLowerCase().includes(t.toLowerCase()))));
    if (prefFilter.includes("Free Parking")) out = out.filter(c => c.parking_available);
    if (prefFilter.includes("Women-Only Staff")) out = out.filter(c => c.women_only_staff);
    if (prefFilter.includes("Private Room")) out = out.filter(c => c.has_private_room);
    if (prefFilter.includes("First-Time Discount")) out = out.filter(c => c.first_time_discount);
    if (facilityFilter.includes("Makeup Room")) out = out.filter(c => c.has_makeup_room);
    if (facilityFilter.includes("Kids Space")) out = out.filter(c => c.has_kids_space);
    if (facilityFilter.includes("Drink Service")) out = out.filter(c => c.has_drink_service);
    if (facilityFilter.includes("Korean Aesthetics")) out = out.filter(c => c.korean_aesthetics);
    if (priceMax < 1000) out = out.filter(c => (c.price_from ?? 9999) <= priceMax);
    if (sortBy === "rating") out = [...out].sort((a, b) => (b.skintea_score ?? b.trust_score ?? 0) - (a.skintea_score ?? a.trust_score ?? 0));
    if (sortBy === "reviews") out = [...out].sort((a, b) => (b.yelp_review_count ?? 0) - (a.yelp_review_count ?? 0));
    if (sortBy === "price") out = [...out].sort((a, b) => (a.price_from ?? 9999) - (b.price_from ?? 9999));
    if (sortBy === "trending") out = [...out].filter(c => (c.badges ?? []).some(b => /trending|korean|viral/i.test(b))).concat(out.filter(c => !(c.badges ?? []).some(b => /trending|korean|viral/i.test(b))));
    if (sortBy === "verified") out = [...out].sort((a, b) => (b.is_verified ? 1 : 0) - (a.is_verified ? 1 : 0));
    return out;
  }, [clinics, searchQ, areaFilter, hoursFilter, treatmentFilter, prefFilter, facilityFilter, priceMax, sortBy]);

  const handleThumbChange = (clinicId: string, index: number) => {
    setActiveThumbMap(prev => ({ ...prev, [clinicId]: index }));
  };

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
    setPriceMax(1000); setSortBy("nearest");
  };

  const saveFilters = () => {
    localStorage.setItem("skintea.savedFilters", JSON.stringify({
      areaFilter, hoursFilter, keywordsFilter, priceMax, prefFilter, facilityFilter, treatmentFilter, sortBy
    }));
    setSavedConfirm(true);
    setTimeout(() => setSavedConfirm(false), 2000);
  };

  const skinTypeDisplay = skinType ? skinType.charAt(0).toUpperCase() + skinType.slice(1) : "";

  return (
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
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Map size={20} color={ESPRESSO} />
          <Bell size={20} color={ESPRESSO} />
        </div>
      </header>

      {/* 2. Search */}
      <div style={{ padding: "10px 16px", borderBottom: `0.5px solid ${BORDER}`, display: "flex", gap: 8, background: WARM_WHITE }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={16} color={MUTED} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search treatments, clinics..."
            style={{ width: "100%", background: "#F5EFEC", border: "none", borderRadius: 8, padding: "9px 12px 9px 34px", fontSize: 13, color: ESPRESSO, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
          />
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

      {/* 5. Sort tab bar */}
      <div className="no-scrollbar" style={{ display: "flex", overflowX: "auto", borderBottom: `0.5px solid ${BORDER}`, background: WARM_WHITE, ...noScrollbar }}>
        {SORT_TABS.map((t) => {
          const active = sortBy === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setSortBy(t.key)}
              style={{ flexShrink: 0, padding: "10px 14px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", background: "transparent", border: "none", color: active ? ESPRESSO : MUTED, borderBottom: active ? `2px solid ${CRIMSON}` : "2px solid transparent", cursor: "pointer", fontFamily: "inherit" }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 6. Results bar */}
      <div style={{ padding: "10px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={SECTION_LABEL}>{filtered.length} Clinics Near You</div>
        <div style={{ fontSize: 10, color: MUTED }}>Los Angeles</div>
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
          filtered.map((c) => (
            <ClinicCard
              key={c.id}
              clinic={c}
              skinType={skinType}
              activeThumb={activeThumbMap[c.id] ?? 0}
              onThumbChange={(i) => handleThumbChange(c.id, i)}
              onOpen={() => navigate({ to: "/clinics/$id", params: { id: c.id } }).catch(() => {})}
            />
          ))
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
            {/* Drawer header */}
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

            <DrawerSection title="Sort By">
              <PillWrap>
                {SORT_TABS.map((t) => (
                  <Pill key={t.key} label={t.label} active={sortBy === t.key} onClick={() => setSortBy(t.key)} />
                ))}
              </PillWrap>
            </DrawerSection>

            <DrawerSection title="Area">
              <PillWrap>
                {AREA_OPTIONS.map(o => (
                  <Pill key={o} label={o} active={areaFilter.includes(o)} onClick={() => toggle(setAreaFilter, areaFilter, o)} />
                ))}
              </PillWrap>
            </DrawerSection>

            <DrawerSection title="Date & Hours">
              <PillWrap>
                {HOURS_OPTIONS.map(o => (
                  <Pill key={o} label={o} active={hoursFilter.includes(o)} onClick={() => toggle(setHoursFilter, hoursFilter, o)} />
                ))}
              </PillWrap>
            </DrawerSection>

            <DrawerSection title="Trending Keywords">
              <PillWrap>
                {KEYWORD_OPTIONS.map(o => (
                  <Pill key={o} label={o} active={keywordsFilter.includes(o)} onClick={() => toggle(setKeywordsFilter, keywordsFilter, o)} />
                ))}
              </PillWrap>
            </DrawerSection>

            <DrawerSection title="Price Range">
              <div style={{ fontSize: 13, color: ESPRESSO, fontWeight: 700, marginBottom: 8 }}>
                $0 – ${priceMax === 1000 ? "1000+" : priceMax}
              </div>
              <input
                type="range"
                min={0}
                max={1000}
                step={50}
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                style={{ width: "100%", accentColor: CRIMSON }}
              />
            </DrawerSection>

            <DrawerSection title="Skintea Preferences">
              <PillWrap>
                {PREF_OPTIONS.map(o => (
                  <Pill key={o} label={o} active={prefFilter.includes(o)} onClick={() => toggle(setPrefFilter, prefFilter, o)} />
                ))}
              </PillWrap>
            </DrawerSection>

            <DrawerSection title="Facilities & Service">
              <PillWrap>
                {FACILITY_OPTIONS.map(o => (
                  <Pill key={o} label={o} active={facilityFilter.includes(o)} onClick={() => toggle(setFacilityFilter, facilityFilter, o)} />
                ))}
              </PillWrap>
            </DrawerSection>

            <DrawerSection title="Treatment Type" last>
              <PillWrap>
                {TREATMENT_OPTIONS.map(o => (
                  <Pill key={o} label={o} active={treatmentFilter.includes(o)} onClick={() => toggle(setTreatmentFilter, treatmentFilter, o)} />
                ))}
              </PillWrap>
            </DrawerSection>

            {/* Footer */}
            <div style={{ position: "sticky", bottom: 0, background: WARM_WHITE, borderTop: `0.5px solid ${BORDER}`, padding: "12px 16px 24px", display: "flex", gap: 8 }}>
              <button
                onClick={clearAll}
                style={{ flex: 1, border: `0.5px solid ${ESPRESSO}`, background: WARM_WHITE, color: ESPRESSO, fontSize: 13, fontWeight: 800, borderRadius: 8, padding: 12, cursor: "pointer", fontFamily: "inherit" }}
              >
                Clear All
              </button>
              <button
                onClick={saveFilters}
                style={{ flex: 1, border: `0.5px solid ${CRIMSON}`, background: WARM_WHITE, color: CRIMSON, fontSize: 13, fontWeight: 800, borderRadius: 8, padding: 12, cursor: "pointer", fontFamily: "inherit" }}
              >
                {savedConfirm ? "Saved!" : "Save Filters"}
              </button>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{ flex: 2, border: "none", background: CRIMSON, color: WARM_WHITE, fontSize: 13, fontWeight: 800, borderRadius: 8, padding: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}
              >
                Show {filtered.length} Clinics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function toggle(setter: React.Dispatch<React.SetStateAction<string[]>>, arr: string[], val: string) {
  if (arr.includes(val)) setter(arr.filter(v => v !== val));
  else setter([...arr, val]);
}

function DrawerSection({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div>
      <div style={{ padding: "16px 16px 12px" }}>
        <div style={{ ...SECTION_LABEL, borderLeft: `2px solid ${CRIMSON}`, paddingLeft: 8, marginBottom: 10 }}>{title}</div>
        {children}
      </div>
      {!last && <div style={{ height: 8, background: DIVIDER }} />}
    </div>
  );
}

function PillWrap({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{children}</div>;
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 14px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        border: `0.5px solid ${active ? ESPRESSO : BORDER}`,
        background: active ? ESPRESSO : "#FFFFFF",
        color: active ? WARM_WHITE : MUTED,
        cursor: "pointer",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function ClinicCard({
  clinic, skinType, activeThumb, onThumbChange, onOpen,
}: {
  clinic: Clinic;
  skinType: string;
  activeThumb: number;
  onThumbChange: (i: number) => void;
  onOpen: () => void;
}) {
  const photos = Array.isArray(clinic.photos) ? clinic.photos : [];
  const isFeatured = (clinic.badges ?? []).some((b) => /featured/i.test(b));
  const isSkinMatch = !!skinType && (clinic.tea_skin_type ?? "").toLowerCase().includes(skinType.toLowerCase());

  const mainPhoto = photos.length > 0 ? photos[activeThumb] ?? clinic.image_url : clinic.image_url;
  const tags = clinic.best_for ?? [];
  const visibleTags = tags.slice(0, 3);
  const extraTags = tags.length - visibleTags.length;

  const score = clinic.skintea_score ?? clinic.trust_score;

  const MAX_THUMBS = 4;
  const visibleThumbs = photos.slice(0, MAX_THUMBS);
  const remainingPhotos = Math.max(0, photos.length - visibleThumbs.length);

  return (
    <div
      onClick={onOpen}
      style={{ background: "#FFFFFF", borderRadius: 12, overflow: "hidden", cursor: "pointer", border: isFeatured ? `1px solid ${CRIMSON}` : `0.5px solid ${BORDER}` }}
    >
      <div style={{ height: 160, position: "relative", overflow: "hidden", background: mainPhoto ? `url(${mainPhoto}) center/cover no-repeat` : ESPRESSO }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(28,10,0,0.32)" }} />
        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", flexDirection: "column", gap: 5, zIndex: 2 }}>
          {isFeatured && (
            <span style={{ background: CRIMSON, color: WARM_WHITE, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: 3, padding: "3px 8px" }}>Featured</span>
          )}
          {isSkinMatch && (
            <span style={{ background: SKIN_BG, color: CRIMSON, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: 3, padding: "3px 8px" }}>
              {skinType.charAt(0).toUpperCase() + skinType.slice(1)} Match
            </span>
          )}
        </div>
        {score != null && (
          <div style={{ position: "absolute", bottom: 10, right: 10, zIndex: 2, textAlign: "right" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: WARM_WHITE, lineHeight: 1 }}>{score}%</div>
            <div style={{ fontSize: 9, color: "rgba(255,252,248,0.75)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>Recommend</div>
          </div>
        )}
      </div>

      {photos.length > 0 && (
        <div className="no-scrollbar" style={{ display: "flex", gap: 4, padding: "6px 10px", background: WARM_WHITE, borderBottom: `0.5px solid ${BORDER}`, overflowX: "auto", ...noScrollbar }}>
          {visibleThumbs.map((p, i) => (
            <div
              key={i}
              onClick={(e) => { e.stopPropagation(); onThumbChange(i); }}
              style={{ width: 56, height: 44, borderRadius: 6, flexShrink: 0, background: `url(${p}) center/cover no-repeat`, border: `1.5px solid ${i === activeThumb ? CRIMSON : "transparent"}`, cursor: "pointer" }}
            />
          ))}
          <div
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            style={{ width: 56, height: 44, borderRadius: 6, background: TAG_BG, border: `0.5px solid ${BORDER}`, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: ESPRESSO, lineHeight: 1 }}>+{remainingPhotos}</div>
            <div style={{ fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>Photos</div>
          </div>
        </div>
      )}

      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: ESPRESSO, marginBottom: 3 }}>{clinic.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: MUTED, marginBottom: 8 }}>
          <MapPin size={11} color={MUTED} />
          <span>
            {clinic.neighborhood ?? ""}
            {clinic.distance_miles != null ? ` · ${clinic.distance_miles} mi` : ""}
            {clinic.travel_minutes != null ? ` · ${clinic.travel_minutes} min` : ""}
          </span>
        </div>

        {tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
            {visibleTags.map((t, i) => (
              <span key={i} style={{ background: TAG_BG, color: ESPRESSO, fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4 }}>{t}</span>
            ))}
            {extraTags > 0 && (
              <span style={{ fontSize: 10, color: MUTED, padding: "3px 4px" }}>+{extraTags} more</span>
            )}
          </div>
        )}

        {clinic.tea_quote && (
          <div style={{ borderLeft: `2px solid ${CRIMSON}`, padding: "5px 8px", background: QUOTE_BG, marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontStyle: "italic", color: ESPRESSO, lineHeight: 1.5 }}>"{clinic.tea_quote}"</div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 3 }}>
              — anon{clinic.tea_skin_type ? ` · ${clinic.tea_skin_type}` : ""}
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {clinic.is_verified && (
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
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, opacity: 0.5 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: MUTED }} />
                <span style={{ fontSize: 10, color: MUTED }}>Closed</span>
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {clinic.price_tier && (
              <span style={{ fontSize: 11, fontWeight: 700, color: ESPRESSO }}>
                {clinic.price_tier}{clinic.price_from != null ? ` · from $${clinic.price_from}` : ""}
              </span>
            )}
            {clinic.yelp_review_count != null && (
              <span style={{ fontSize: 10, color: MUTED }}>{clinic.yelp_review_count} reviews</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}