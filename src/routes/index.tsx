import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bell, Search } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Skintea — Honest skincare, decoded" },
      { name: "description", content: "Real reviews, treatments, surgery and clinic tea — decoded for your skin." },
    ],
  }),
});

const C = {
  espresso: "#1C0A00",
  crimson: "#A8001C",
  cream: "#FFFCF8",
  warm: "#FFFCF8",
  border: "#E8DDD4",
  muted: "#999999",
};

const CATEGORIES = ["All", "Products", "Treatments", "Surgery", "Clinics", "Ranking"];

function HomePage() {
  const navigate = useNavigate();
  void navigate;

  return (
    <div style={{ background: C.cream, minHeight: "100vh", paddingBottom: 80, overflowX: "hidden" }}>
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{scrollbar-width:none}`}</style>

      {/* HEADER */}
      <header
        style={{
          background: C.cream,
          borderBottom: `1px solid ${C.border}`,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div>
          <div style={{ lineHeight: 1 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 22, color: "#1C0A00" }}>Skin</span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 22, color: "#A8001C" }}>tea</span>
          </div>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#999999", marginTop: 2 }}>Got Skintea? Spill it.</div>
        </div>
        <div style={{ display: "flex", gap: 16, color: C.espresso }}>
          <Bell size={20} />
          <Search size={20} />
        </div>
      </header>

      {/* CATEGORY PILLS */}
      <div className="no-scrollbar" style={{ overflowX: "auto", padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 8, width: "max-content" }}>
          {CATEGORIES.map((c, i) => {
            const active = i === 0;
            return (
              <button
                key={c}
                style={{
                  background: active ? C.espresso : "#fff",
                  color: active ? "#fff" : C.espresso,
                  border: active ? "none" : `1px solid ${C.border}`,
                  borderRadius: 99,
                  padding: "7px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* TRENDING TEA */}
      <SectionHeader title="🔥 Trending Tea" linkTo="/tea" />
      <div className="no-scrollbar" style={{ overflowX: "auto", padding: "0 16px" }}>
        <div style={{ display: "flex", gap: 10, width: "max-content" }}>
          <TrendingCard tag="PRODUCT" pct="78%" sub="recommend · oily skin" name="CeraVe Moisturizing Cream" spills="412 spills" />
          <TrendingCard tag="TREATMENT" pct="64%" sub="would do again · Botox" name="Forehead Botox real talk" spills="189 spills" />
          <TrendingCard tag="SURGERY" pct="71%" sub="no regrets · Rhinoplasty" name="Nose job month 3 update" spills="244 spills" />
        </div>
      </div>

      {/* RANKING */}
      <SectionHeader title="🏆 This Week's Ranking" linkTo="/products" />
      <div
        style={{
          margin: "0 16px",
          background: "#fff",
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {[
          { r: 1, brand: "CeraVe", name: "Moisturizing Cream", pct: "94%" },
          { r: 2, brand: "The Ordinary", name: "Niacinamide 10%", pct: "88%" },
          { r: 3, brand: "Dr. Jart+", name: "Barrier Cream", pct: "82%" },
        ].map((it, i) => (
          <div
            key={it.r}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              borderTop: i === 0 ? "none" : "0.5px solid #F0EAE4",
            }}
          >
            <div style={{ color: C.crimson, fontWeight: 800, width: 16 }}>{it.r}</div>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: C.warm }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: C.muted }}>{it.brand}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.espresso }}>{it.name}</div>
            </div>
            <div style={{ color: C.crimson, fontWeight: 700, fontSize: 14 }}>{it.pct}</div>
          </div>
        ))}
      </div>

      {/* LATEST TEA */}
      <SectionHeader title="Latest Tea" linkTo="/tea" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px" }}>
        <FeedCard
          emoji="🍩"
          avatarBg="#FCE7B3"
          name="Glazed Donut"
          meta="oily skin · 2m ago"
          badge="✨ Review"
          body="This niacinamide is the only thing keeping my t-zone alive. Two weeks in and shine is genuinely down 50%."
          pills={[
            { label: "Oily skin", value: "68% recommend" },
            { label: "Dry skin", value: "41% recommend" },
          ]}
        />
        <FeedCard
          emoji="🏜️"
          avatarBg="#DCE9F5"
          name="Desert Girl"
          meta="dry skin · Botox · 14m ago"
          badge="💉 Treatment"
          body="Took 10 full days to kick in. I almost asked for a touch-up too early. Don't do that."
          pills={[
            { label: "Cost", value: "$520" },
            { label: "Would do again", value: "78%" },
          ]}
        />
        <FeedCard
          emoji="🌸"
          avatarBg="#F8DCE8"
          name="Main Character"
          meta="sensitive · Seoul · 1h ago"
          badge="🔪 Surgery"
          body="I thought fixing my nose would fix my confidence. It did — but I had to grieve my old face first."
          pills={[
            { label: "No regrets", value: "71%" },
            { label: "Recovery", value: "3 weeks" },
          ]}
        />
      </div>

      {/* TREATMENT SPOTLIGHT */}
      <SectionHeader title="💉 Treatment Spotlight" />
      <div style={{ margin: "0 16px", background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 16, padding: 18 }}>
        <div style={{ color: "#A8001C", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          This week · Botox
        </div>
        <div style={{ color: "#1C0A00", fontSize: 20, fontWeight: 700, marginTop: 4 }}>Forehead + 11s</div>
        <div style={{ color: "#999999", fontSize: 12, marginTop: 2 }}>
          412 real experiences · no clinic bias
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {[
            { v: "78%", l: "would do again" },
            { v: "$520", l: "avg cost" },
            { v: "10d", l: "to kick in" },
          ].map((s) => (
            <div
              key={s.l}
              style={{
                flex: 1,
                background: "#FFFCF8",
                border: "0.5px solid #E8DDD4",
                borderRadius: 10,
                padding: "10px 14px",
              }}
            >
              <div style={{ color: "#1C0A00", fontSize: 18, fontWeight: 700 }}>{s.v}</div>
              <div style={{ color: "#999999", fontSize: 10 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CLINICS */}
      <SectionHeader title="🏥 Clinics" linkTo="/clinics" />
      <div className="no-scrollbar" style={{ overflowX: "auto", padding: "0 16px" }}>
        <div style={{ display: "flex", gap: 10, width: "max-content" }}>
          <ClinicCard name="Glow Clinic LA" loc="West Hollywood · 0.8mi" tags={["Botox", "Fillers", "Rejuran"]} />
          <ClinicCard name="SkinBar Beverly" loc="Beverly Hills · 1.2mi" tags={["Laser", "Morpheus8"]} />
        </div>
      </div>

      {/* SAMPLE KIT (locked) */}
      <SectionHeader title="🧴 Sample Kit" />
      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", margin: "0 16px" }}>
        <div
          style={{
            background: "#fff",
            border: `1px solid ${C.border}`,
            padding: 18,
            borderRadius: 16,
            filter: "blur(3px)",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            {["🧴", "💧", "✨", "🌿"].map((e) => (
              <div
                key={e}
                style={{
                  flex: 1,
                  height: 70,
                  background: C.warm,
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 26,
                }}
              >
                {e}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.espresso, marginTop: 14 }}>
            Your Skin-Type Kit
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            Cleanser · Toner · Serum · Moisturizer matched to your skin
          </div>
          <div
            style={{
              marginTop: 14,
              background: C.espresso,
              color: "#fff",
              borderRadius: 99,
              padding: "12px 18px",
              textAlign: "center",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            Get your kit — $50
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,252,248,0.65)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderRadius: 16,
          }}
        >
          <div style={{ fontSize: 28 }}>🔒</div>
          <div
            style={{
              background: C.espresso,
              color: "#fff",
              borderRadius: 99,
              padding: "8px 20px",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Coming Soon
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function SectionHeader({ title, linkTo }: { title: string; linkTo?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 16px 10px",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: C.espresso }}>{title}</div>
      {linkTo && (
        <Link
          to={linkTo}
          style={{ fontSize: 11, color: C.crimson, fontWeight: 600, textDecoration: "none" }}
        >
          See all
        </Link>
      )}
    </div>
  );
}

function TrendingCard({ tag, pct, sub, name, spills }: { tag: string; pct: string; sub: string; name: string; spills: string }) {
  return (
    <div style={{ minWidth: 160, background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 14, padding: 14 }}>
      <div style={{ color: "#A8001C", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>{tag}</div>
      <div style={{ color: "#1C0A00", fontSize: 22, fontWeight: 800, marginTop: 8 }}>{pct}</div>
      <div style={{ color: "#999999", fontSize: 10, marginTop: 2 }}>{sub}</div>
      <div style={{ color: "#1C0A00", fontSize: 13, fontWeight: 700, marginTop: 10, lineHeight: 1.3 }}>{name}</div>
      <div style={{ color: "#999999", fontSize: 10, marginTop: 6 }}>{spills}</div>
    </div>
  );
}

function FeedCard({
  emoji,
  avatarBg,
  name,
  meta,
  badge,
  body,
  pills,
}: {
  emoji: string;
  avatarBg: string;
  name: string;
  meta: string;
  badge: string;
  body: string;
  pills: { label: string; value: string }[];
}) {
  return (
    <div style={{ background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 14, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 99,
              background: avatarBg,
              display: "grid",
              placeItems: "center",
              fontSize: 18,
            }}
          >
            {emoji}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.espresso }}>{name}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{meta}</div>
          </div>
        </div>
        <div
          style={{
            background: C.warm,
            border: `1px solid ${C.border}`,
            borderRadius: 99,
            padding: "4px 10px",
            fontSize: 10,
            fontWeight: 600,
            color: C.espresso,
          }}
        >
          {badge}
        </div>
      </div>
      <div style={{ fontSize: 13, color: "#3A2E28", lineHeight: 1.6, marginTop: 10 }}>{body}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {pills.map((p) => (
          <div
            key={p.label}
            style={{
              background: C.warm,
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 11,
              color: C.espresso,
            }}
          >
            {p.label} <span style={{ color: C.crimson, fontWeight: 700 }}>{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClinicCard({ name, loc, tags }: { name: string; loc: string; tags: string[] }) {
  return (
    <div
      style={{
        minWidth: 200,
        background: "#fff",
        border: `0.5px solid ${C.border}`,
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div style={{ width: "100%", height: 80, background: C.warm, borderRadius: 10 }} />
      <div style={{ fontSize: 13, fontWeight: 700, color: C.espresso, marginTop: 10 }}>{name}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{loc}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        {tags.map((t) => (
          <span
            key={t}
            style={{
              background: C.warm,
              borderRadius: 99,
              padding: "3px 8px",
              fontSize: 10,
              color: C.espresso,
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
