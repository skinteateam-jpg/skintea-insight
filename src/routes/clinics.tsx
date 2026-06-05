import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, SlidersHorizontal, Map, Bell, MapPin, Sparkles, ChevronDown } from "lucide-react";
import BottomNav from "@/components/BottomNav";

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
const OPEN_GREEN = "#2D7A3A";

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
  booking_url: string | null;
  is_verified: boolean;
  photos?: string[] | null;
  travel_minutes?: number | null;
  is_open_now?: boolean | null;
  skintea_score?: number | null;
  distance_miles?: number | null;
  tea_handle?: string | null;
};

const TREATMENT_PILLS = ["all", "Botox", "PRF", "Laser", "Hydrafacial", "Microneedling", "LED", "Chemical Peel", "Facial"];
const SKIN_PILLS = ["all", "Oily", "Dry", "Combination", "Normal", "Sensitive"];
const SORT_LABELS: Record<string, string> = { nearest: "Nearest", rating: "Highest Rated", reviews: "Most Reviewed" };

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

function ClinicsPage() {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [skinType, setSkinType] = useState<string>("");
  const [treatmentFilter, setTreatmentFilter] = useState("all");
  const [skinFilter, setSkinFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"nearest" | "rating" | "reviews">("nearest");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("clinics")
        .select("*")
        .order("trust_score", { ascending: false });
      if (!alive) return;
      setClinics((data as Clinic[]) ?? []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const st = localStorage.getItem("skintea_skin_type") || localStorage.getItem("skintea.quizResult");
    if (st) {
      try {
        const parsed = JSON.parse(st);
        setSkinType((parsed?.skinTypeLabel || st).toString().toLowerCase());
      } catch {
        setSkinType(st.toLowerCase());
      }
    }
  }, []);

  // Pre-select skin pill once skinType is known
  useEffect(() => {
    if (!skinType) return;
    const match = SKIN_PILLS.find((p) => p !== "all" && skinType.includes(p.toLowerCase()));
    if (match) setSkinFilter(match);
  }, [skinType]);

  const filtered = useMemo(() => {
    let out = clinics;
    if (treatmentFilter !== "all") {
      out = out.filter((c) =>
        (c.best_for ?? []).some((t) => t.toLowerCase().includes(treatmentFilter.toLowerCase())),
      );
    }
    if (skinFilter !== "all") {
      out = out.filter(
        (c) =>
          (c.tea_skin_type ?? "").toLowerCase().includes(skinFilter.toLowerCase()) ||
          (c.badges ?? []).some((b) => b.toLowerCase().includes(skinFilter.toLowerCase())),
      );
    }
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      out = out.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.best_for ?? []).some((t) => t.toLowerCase().includes(q)) ||
          (c.neighborhood ?? "").toLowerCase().includes(q),
      );
    }
    if (sortBy === "rating") out = [...out].sort((a, b) => (b.skintea_score ?? b.trust_score ?? 0) - (a.skintea_score ?? a.trust_score ?? 0));
    if (sortBy === "reviews") out = [...out].sort((a, b) => (b.yelp_review_count ?? 0) - (a.yelp_review_count ?? 0));
    return out;
  }, [clinics, treatmentFilter, skinFilter, searchQ, sortBy]);

  const cycleSort = () => {
    setSortBy((s) => (s === "nearest" ? "rating" : s === "rating" ? "reviews" : "nearest"));
  };

  const skinTypeDisplay = skinType ? skinType.charAt(0).toUpperCase() + skinType.slice(1) : "";

  return (
    <div style={{ background: WARM_WHITE, minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", paddingBottom: 80 }}>
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,700&display=swap" rel="stylesheet" />

      {/* 1. Sticky Header */}
      <header
        style={{
          background: WARM_WHITE,
          borderBottom: `0.5px solid ${BORDER}`,
          padding: "14px 16px 10px",
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link to="/" style={{ textDecoration: "none" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 22, lineHeight: 1 }}>
            <span style={{ color: ESPRESSO }}>Skin</span>
            <span style={{ color: CRIMSON }}>tea</span>
          </div>
          <div style={{ ...SECTION_LABEL, color: MUTED, marginTop: 3 }}>Got Skintea? Spill it.</div>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Map size={20} color={ESPRESSO} />
          <Bell size={20} color={ESPRESSO} />
        </div>
      </header>

      {/* 2. Search bar */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: `0.5px solid ${BORDER}`,
          display: "flex",
          gap: 8,
          background: WARM_WHITE,
        }}
      >
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={16} color={MUTED} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search treatments, clinics..."
            style={{
              width: "100%",
              background: "#F5EFEC",
              border: "none",
              borderRadius: 8,
              padding: "9px 12px 9px 34px",
              fontSize: 13,
              color: ESPRESSO,
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>
        <button
          type="button"
          aria-label="Filters"
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: `0.5px solid ${BORDER}`,
            background: WARM_WHITE,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <SlidersHorizontal size={16} color={ESPRESSO} />
        </button>
      </div>

      {/* 3. Skin match bar */}
      <div
        style={{
          background: SKIN_BG,
          borderBottom: `0.5px solid ${BORDER}`,
          padding: "9px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: skinType ? "default" : "pointer",
        }}
        onClick={() => {
          if (!skinType) navigate({ to: "/quiz" as any }).catch(() => {});
        }}
      >
        {skinType ? (
          <>
            <Sparkles size={14} color={CRIMSON} />
            <span style={{ fontSize: 12, color: ESPRESSO }}>
              Matched to your skin —{" "}
              <span style={{ color: CRIMSON, fontWeight: 800 }}>{skinTypeDisplay}</span>
            </span>
          </>
        ) : (
          <span style={{ fontSize: 12, color: MUTED }}>Take the quiz to get matched →</span>
        )}
      </div>

      {/* 4. Filter section */}
      <div style={{ padding: "10px 16px 0", borderBottom: `0.5px solid ${BORDER}` }}>
        <div style={SECTION_LABEL}>Treatment</div>
        <div
          className="no-scrollbar"
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            paddingTop: 8,
            paddingBottom: 10,
            ...noScrollbar,
          }}
        >
          {TREATMENT_PILLS.map((p) => (
            <Pill key={p} label={p === "all" ? "All" : p} active={treatmentFilter === p} onClick={() => setTreatmentFilter(p)} />
          ))}
        </div>
        <div style={SECTION_LABEL}>Skin Type</div>
        <div
          className="no-scrollbar"
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            paddingTop: 8,
            paddingBottom: 10,
            ...noScrollbar,
          }}
        >
          {SKIN_PILLS.map((p) => (
            <Pill key={p} label={p === "all" ? "All" : p} active={skinFilter === p} onClick={() => setSkinFilter(p)} />
          ))}
        </div>
      </div>

      {/* 5. Results bar */}
      <div
        style={{
          padding: "12px 16px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={SECTION_LABEL}>{filtered.length} Clinics Near You</div>
        <button
          onClick={cycleSort}
          style={{
            background: "transparent",
            border: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            color: MUTED,
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "inherit",
            padding: 0,
          }}
        >
          Sort: {SORT_LABELS[sortBy]} <ChevronDown size={12} />
        </button>
      </div>

      {/* 6. Cards */}
      <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          <div style={{ color: MUTED, fontSize: 13, padding: 40, textAlign: "center" }}>Loading clinics...</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: MUTED, fontSize: 13, padding: 40, textAlign: "center" }}>No clinics match this filter.</div>
        ) : (
          filtered.map((c) => (
            <ClinicCard
              key={c.id}
              clinic={c}
              skinType={skinType}
              onOpen={() => navigate({ to: "/clinics/$id" as any, params: { id: c.id } as any }).catch(() => {})}
            />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
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

function ClinicCard({ clinic, skinType, onOpen }: { clinic: Clinic; skinType: string; onOpen: () => void }) {
  const [activeThumb, setActiveThumb] = useState(0);
  const photos = clinic.photos ?? [];
  const isFeatured = (clinic.badges ?? []).some((b) => /featured/i.test(b));
  const isSkinMatch = !!skinType && (clinic.tea_skin_type ?? "").toLowerCase().includes(skinType.toLowerCase());

  const mainPhoto = photos.length > 0 ? photos[activeThumb] ?? clinic.image_url : clinic.image_url;
  const tags = clinic.best_for ?? [];
  const visibleTags = tags.slice(0, 3);
  const extraTags = tags.length - visibleTags.length;

  const score = clinic.trust_score ?? clinic.skintea_score;

  // thumbnails: show photos + a "+N Photos" tile if there are more or always show last tile when there are extras
  const MAX_THUMBS = 4;
  const visibleThumbs = photos.slice(0, MAX_THUMBS);
  const remainingPhotos = Math.max(0, photos.length - visibleThumbs.length);

  return (
    <div
      onClick={onOpen}
      style={{
        background: "#FFFFFF",
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        border: isFeatured ? `1px solid ${CRIMSON}` : `0.5px solid ${BORDER}`,
      }}
    >
      {/* A. Main photo */}
      <div
        style={{
          height: 160,
          position: "relative",
          overflow: "hidden",
          background: mainPhoto ? `url(${mainPhoto}) center/cover no-repeat` : ESPRESSO,
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "rgba(28,10,0,0.32)" }} />
        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", flexDirection: "column", gap: 5, zIndex: 2 }}>
          {isFeatured && (
            <span style={{ background: CRIMSON, color: WARM_WHITE, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: 3, padding: "3px 8px" }}>
              Featured
            </span>
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
            <div style={{ fontSize: 9, color: "rgba(255,252,248,0.75)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>
              Recommend
            </div>
          </div>
        )}
      </div>

      {/* B. Thumbnail strip */}
      {photos.length > 0 && (
        <div
          className="no-scrollbar"
          style={{
            display: "flex",
            gap: 4,
            padding: "6px 10px",
            background: WARM_WHITE,
            borderBottom: `0.5px solid ${BORDER}`,
            overflowX: "auto",
            ...noScrollbar,
          }}
        >
          {visibleThumbs.map((p, i) => (
            <div
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setActiveThumb(i);
              }}
              style={{
                width: 56,
                height: 44,
                borderRadius: 6,
                flexShrink: 0,
                background: `url(${p}) center/cover no-repeat`,
                border: `1.5px solid ${i === activeThumb ? CRIMSON : "transparent"}`,
                cursor: "pointer",
              }}
            />
          ))}
          {remainingPhotos > 0 && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onOpen();
              }}
              style={{
                width: 56,
                height: 44,
                borderRadius: 6,
                background: "#F5EFEC",
                border: `0.5px solid ${BORDER}`,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: ESPRESSO, lineHeight: 1 }}>+{remainingPhotos}</div>
              <div style={{ fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>Photos</div>
            </div>
          )}
        </div>
      )}

      {/* C. Card body */}
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
              <span
                key={i}
                style={{
                  background: TAG_BG,
                  color: ESPRESSO,
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: 4,
                }}
              >
                {t}
              </span>
            ))}
            {extraTags > 0 && (
              <span style={{ fontSize: 10, color: MUTED, padding: "3px 4px" }}>+{extraTags} more</span>
            )}
          </div>
        )}

        {clinic.tea_quote && (
          <div
            style={{
              borderLeft: `2px solid ${CRIMSON}`,
              padding: "5px 8px",
              background: QUOTE_BG,
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 11, fontStyle: "italic", color: ESPRESSO, lineHeight: 1.5 }}>
              "{clinic.tea_quote}"
            </div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 3 }}>
              {clinic.tea_handle ? `— @${clinic.tea_handle}` : "— anon"}
              {clinic.tea_skin_type ? ` · ${clinic.tea_skin_type}` : ""}
            </div>
          </div>
        )}

        {/* D. Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {clinic.is_verified ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: 999, background: CRIMSON }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: CRIMSON, textTransform: "uppercase", letterSpacing: "0.06em" }}>Verified</span>
              </span>
            ) : (
              <span style={{ fontSize: 10, color: MUTED }}>Not verified</span>
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
                {clinic.price_tier}
                {clinic.price_from != null ? ` · from $${clinic.price_from}` : ""}
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