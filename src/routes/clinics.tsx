import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, LayoutGrid, List as ListIcon, Star } from "lucide-react";
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
const CREAM = "#FAF7F2";
const WARM_WHITE = "#FFFCF8";
const BORDER = "#E8E0D8";
const MUTED = "#8A7E76";
const AMBER = "#E8A000";
const TAG_BG = "#F5EDE0";
const TAG_FG = "#5C3D2E";
const QUOTE_BG = "#F7F0E8";
const WARM_BADGE_BG = "#F5EDE0";
const WARM_BADGE_FG = "#7A4A1C";

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
};

const FILTERS: { id: string; label: string; match?: (c: Clinic) => boolean }[] = [
  { id: "all", label: "All" },
  {
    id: "botox",
    label: "Botox / filler",
    match: (c) => (c.best_for ?? []).some((t) => /botox|filler|dysport|xeomin|lip/i.test(t)),
  },
  {
    id: "laser",
    label: "Laser / IPL",
    match: (c) => (c.best_for ?? []).some((t) => /laser|ipl/i.test(t)),
  },
  {
    id: "korean",
    label: "Korean aesthetics",
    match: (c) => (c.badges ?? []).some((b) => /korean/i.test(b)) || /koreatown/i.test(c.neighborhood ?? ""),
  },
  {
    id: "prp",
    label: "PRP / microneedling",
    match: (c) => (c.best_for ?? []).some((t) => /prp|microneedling/i.test(t)),
  },
  {
    id: "cheap",
    label: "$ under $200",
    match: (c) => (c.price_from ?? 9999) < 200,
  },
  {
    id: "oily",
    label: "Oily skin",
    match: (c) => /oily/i.test(c.tea_skin_type ?? "") || (c.badges ?? []).some((b) => /oily/i.test(b)),
  },
  {
    id: "sensitive",
    label: "Sensitive skin",
    match: (c) => /sensitive/i.test(c.tea_skin_type ?? "") || (c.badges ?? []).some((b) => /sensitive/i.test(b)),
  },
];

function ClinicsPage() {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [treatmentQ, setTreatmentQ] = useState("");
  const [locationQ, setLocationQ] = useState("");

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

  const filtered = useMemo(() => {
    let out = clinics;
    const f = FILTERS.find((x) => x.id === activeFilter);
    if (f?.match) out = out.filter(f.match);
    if (treatmentQ.trim()) {
      const q = treatmentQ.toLowerCase();
      out = out.filter(
        (c) =>
          (c.best_for ?? []).some((t) => t.toLowerCase().includes(q)) ||
          c.name.toLowerCase().includes(q),
      );
    }
    if (locationQ.trim()) {
      const q = locationQ.toLowerCase();
      out = out.filter(
        (c) =>
          (c.neighborhood ?? "").toLowerCase().includes(q) ||
          (c.address ?? "").toLowerCase().includes(q),
      );
    }
    return out;
  }, [clinics, activeFilter, treatmentQ, locationQ]);

  return (
    <div style={{ background: CREAM, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{ background: ESPRESSO, color: CREAM, padding: "20px 16px 28px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <Link to="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: CREAM, textDecoration: "none", fontWeight: 600 }}>
              skintea
            </Link>
            <nav style={{ display: "flex", gap: 18, fontSize: 13, color: CREAM }}>
              <Link to="/clinics" style={{ color: CREAM, textDecoration: "none", opacity: 1 }}>clinics</Link>
              <Link to="/products" style={{ color: CREAM, textDecoration: "none", opacity: 0.7 }}>products</Link>
              <Link to="/skin-profile" style={{ color: CREAM, textDecoration: "none", opacity: 0.7 }}>my skin</Link>
            </nav>
          </div>

          <div style={{ color: CRIMSON, fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>
            Find your clinic · Los Angeles
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", color: CREAM, fontSize: 30, lineHeight: 1.15, fontWeight: 600, margin: 0, marginBottom: 8 }}>
            Real places. Real results. No fluff.
          </h1>
          <p style={{ color: "#B8AAA0", fontSize: 13, margin: 0, marginBottom: 18 }}>
            Ranked by Skintea trust score — not sponsored
          </p>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              value={treatmentQ}
              onChange={(e) => setTreatmentQ(e.target.value)}
              placeholder="Search treatment…"
              style={{
                flex: "1 1 180px", background: WARM_WHITE, color: ESPRESSO, border: "none",
                padding: "10px 12px", borderRadius: 6, fontSize: 13, outline: "none",
              }}
            />
            <input
              value={locationQ}
              onChange={(e) => setLocationQ(e.target.value)}
              placeholder="Neighborhood…"
              style={{
                flex: "1 1 140px", background: WARM_WHITE, color: ESPRESSO, border: "none",
                padding: "10px 12px", borderRadius: 6, fontSize: 13, outline: "none",
              }}
            />
            <button
              type="button"
              style={{
                background: CRIMSON, color: CREAM, border: "none", padding: "10px 18px",
                borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              <Search size={14} /> Search
            </button>
          </div>
        </div>
      </header>

      {/* Filter chips */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, background: CREAM }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "12px 16px", overflowX: "auto", whiteSpace: "nowrap", display: "flex", gap: 8 }}>
          {FILTERS.map((f) => {
            const active = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  border: `1px solid ${active ? ESPRESSO : BORDER}`,
                  background: active ? ESPRESSO : WARM_WHITE,
                  color: active ? CREAM : ESPRESSO,
                  cursor: "pointer",
                  flexShrink: 0,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results bar */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 16px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ color: MUTED, fontSize: 12 }}>
          {filtered.length} {filtered.length === 1 ? "clinic" : "clinics"} in Los Angeles · sorted by trust score
        </div>
        <div style={{ display: "flex", gap: 4, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 2, background: WARM_WHITE }}>
          <button
            onClick={() => setView("grid")}
            aria-label="Grid view"
            style={{
              border: "none", background: view === "grid" ? ESPRESSO : "transparent",
              color: view === "grid" ? CREAM : ESPRESSO, padding: "6px 8px", borderRadius: 4, cursor: "pointer",
              display: "inline-flex", alignItems: "center",
            }}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setView("list")}
            aria-label="List view"
            style={{
              border: "none", background: view === "list" ? ESPRESSO : "transparent",
              color: view === "list" ? CREAM : ESPRESSO, padding: "6px 8px", borderRadius: 4, cursor: "pointer",
              display: "inline-flex", alignItems: "center",
            }}
          >
            <ListIcon size={14} />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 16px 60px" }}>
        {loading ? (
          <div style={{ color: MUTED, fontSize: 13, padding: 40, textAlign: "center" }}>Loading clinics…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: MUTED, fontSize: 13, padding: 40, textAlign: "center" }}>No clinics match this filter.</div>
        ) : (
          <div
            style={
              view === "grid"
                ? { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 13 }
                : { display: "flex", flexDirection: "column", gap: 13 }
            }
          >
            {filtered.map((c) => (
              <ClinicCard
                key={c.id}
                clinic={c}
                view={view}
                onOpen={() => navigate({ to: "/clinics/$id" as any, params: { id: c.id } as any }).catch(() => {})}
              />
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function ClinicCard({ clinic, view, onOpen }: { clinic: Clinic; view: "grid" | "list"; onOpen: () => void }) {
  const isList = view === "list";
  return (
    <div
      onClick={onOpen}
      style={{
        background: WARM_WHITE,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        overflow: "hidden",
        cursor: "pointer",
        display: "flex",
        flexDirection: isList ? "row" : "column",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = ESPRESSO)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = BORDER)}
    >
      {/* Photo */}
      <div
        style={{
          width: isList ? 160 : "100%",
          height: isList ? "auto" : 128,
          minHeight: isList ? 140 : undefined,
          flexShrink: 0,
          background: clinic.image_url
            ? `url(${clinic.image_url}) center/cover no-repeat`
            : `linear-gradient(135deg, ${ESPRESSO}, #3a1a08)`,
        }}
      />

      <div style={{ padding: 10, flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Badges */}
        {(clinic.badges ?? []).length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {(clinic.badges ?? []).map((b, i) => {
              const isVerified = /verified/i.test(b);
              const isCrimson = /top for|#1|top rated/i.test(b);
              const style = isVerified
                ? { background: CREAM, color: ESPRESSO, border: `1px solid ${ESPRESSO}` }
                : isCrimson
                ? { background: CRIMSON, color: CREAM, border: "none" }
                : { background: WARM_BADGE_BG, color: WARM_BADGE_FG, border: "none" };
              return (
                <span
                  key={i}
                  style={{
                    ...style,
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: 3,
                    whiteSpace: "nowrap",
                  }}
                >
                  {isVerified && !b.includes("✓") ? `✓ Skintea ${b}` : b}
                </span>
              );
            })}
          </div>
        )}

        {/* Name + trust score */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, color: ESPRESSO, fontWeight: 600, lineHeight: 1.2 }}>
            {clinic.name}
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: CRIMSON, lineHeight: 1 }}>
              {clinic.trust_score ?? "—"}%
            </div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>
              trust score
            </div>
          </div>
        </div>

        {/* Location */}
        <div style={{ fontSize: 11, color: MUTED }}>
          {clinic.neighborhood}
          {clinic.address ? ` · ${clinic.address}` : ""}
        </div>

        {/* Yelp */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ background: "#D32323", color: "white", fontSize: 9, fontWeight: 700, padding: "1px 4px", borderRadius: 2 }}>
            YELP
          </span>
          <Star size={11} fill={AMBER} color={AMBER} />
          <span style={{ fontSize: 11, color: ESPRESSO, fontWeight: 600 }}>{clinic.yelp_rating?.toFixed(1)}</span>
          <span style={{ fontSize: 10, color: MUTED }}>({clinic.yelp_review_count} reviews)</span>
        </div>

        {/* Treatment tags */}
        {(clinic.best_for ?? []).length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {(clinic.best_for ?? []).map((t, i) => (
              <span
                key={i}
                style={{
                  background: TAG_BG,
                  color: TAG_FG,
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 3,
                  fontWeight: 500,
                }}
              >
                {i === 0 ? `Best for: ${t}` : t}
              </span>
            ))}
          </div>
        )}

        {/* Tea quote */}
        {clinic.tea_quote && (
          <div style={{ background: QUOTE_BG, borderLeft: `2.5px solid ${CRIMSON}`, padding: "6px 8px", borderRadius: 2 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 11, color: ESPRESSO, lineHeight: 1.4 }}>
              "{clinic.tea_quote}"
            </div>
            {clinic.tea_skin_type && (
              <div style={{ fontSize: 10, color: MUTED, marginTop: 3 }}>
                — community member · {clinic.tea_skin_type}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 4 }}>
          <div style={{ fontSize: 11, color: MUTED }}>
            <span style={{ color: ESPRESSO, fontWeight: 600 }}>{clinic.price_tier}</span>
            {clinic.price_from ? ` · from $${clinic.price_from}` : ""}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (clinic.booking_url) window.open(clinic.booking_url, "_blank", "noopener,noreferrer");
            }}
            style={{
              background: ESPRESSO,
              color: CREAM,
              border: "none",
              fontSize: 11,
              fontWeight: 600,
              padding: "5px 10px",
              borderRadius: 5,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Book →
          </button>
        </div>
      </div>
    </div>
  );
}