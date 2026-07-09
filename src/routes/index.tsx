import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Search } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import AppFrame from "@/components/AppFrame";
import { supabase } from "@/integrations/supabase/client";

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

const SUBCATEGORIES = ["Cleanser", "Serum", "Moisturizer", "Sunscreen", "Toner", "Treatment"];

type DbProduct = {
  id: string;
  name: string;
  brand: string | null;
  image_url: string | null;
};

type DbClinic = {
  id: string;
  name: string;
  neighborhood: string | null;
  image_url: string | null;
  best_for: string[] | null;
};

function HomePage() {
  const navigate = useNavigate();
  void navigate;

  const [products, setProducts] = useState<DbProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [clinics, setClinics] = useState<DbClinic[]>([]);
  const [clinicsLoading, setClinicsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase
          .from("products")
          .select("id,name,brand,image_url")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("clinics")
          .select("id,name,neighborhood,image_url,best_for")
          .limit(4),
      ]);
      if (cancelled) return;
      setProducts((p ?? []) as DbProduct[]);
      setProductsLoading(false);
      setClinics((c ?? []) as DbClinic[]);
      setClinicsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppFrame>
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

      {/* NEW ON SKINTEA */}
      <SectionHeader title="✨ New on Skintea" linkTo="/products" />
      <div className="no-scrollbar" style={{ overflowX: "auto", padding: "0 16px" }}>
        <div style={{ display: "flex", gap: 10, width: "max-content" }}>
          {productsLoading ? (
            [0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  minWidth: 150,
                  background: "#fff",
                  border: `0.5px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div style={{ width: "100%", height: 100, background: C.warm, borderRadius: 8 }} />
                <div style={{ height: 10, width: "60%", background: C.warm, borderRadius: 4, marginTop: 10 }} />
                <div style={{ height: 12, width: "90%", background: C.warm, borderRadius: 4, marginTop: 6 }} />
              </div>
            ))
          ) : products.length === 0 ? (
            <EmptyCard />
          ) : (
            products.map((p) => (
              <Link
                key={p.id}
                to="/product-detail/$id"
                params={{ id: p.id }}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    minWidth: 150,
                    background: "#fff",
                    border: `0.5px solid ${C.border}`,
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: 100,
                      background: C.warm,
                      borderRadius: 8,
                      overflow: "hidden",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ fontSize: 28 }}>🧴</span>
                    )}
                  </div>
                  {p.brand && (
                    <div style={{ color: C.muted, fontSize: 10, marginTop: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                      {p.brand}
                    </div>
                  )}
                  <div style={{ color: C.espresso, fontSize: 13, fontWeight: 700, marginTop: 4, lineHeight: 1.3 }}>
                    {p.name}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* BROWSE BY CATEGORY */}
      <SectionHeader title="Browse by category" linkTo="/products" />
      <div className="no-scrollbar" style={{ overflowX: "auto", padding: "0 16px" }}>
        <div style={{ display: "flex", gap: 8, width: "max-content" }}>
          {SUBCATEGORIES.map((sc) => (
            <Link
              key={sc}
              to="/products"
              style={{
                background: "#fff",
                color: C.espresso,
                border: `1px solid ${C.border}`,
                borderRadius: 99,
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: "nowrap",
                textDecoration: "none",
              }}
            >
              {sc}
            </Link>
          ))}
        </div>
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
      <SectionHeader title="🏥 Clinics near LA" linkTo="/clinics" />
      <div className="no-scrollbar" style={{ overflowX: "auto", padding: "0 16px" }}>
        <div style={{ display: "flex", gap: 10, width: "max-content" }}>
          {clinicsLoading ? (
            [0, 1].map((i) => (
              <div
                key={i}
                style={{
                  minWidth: 200,
                  background: "#fff",
                  border: `0.5px solid ${C.border}`,
                  borderRadius: 14,
                  padding: 14,
                }}
              >
                <div style={{ width: "100%", height: 80, background: C.warm, borderRadius: 10 }} />
                <div style={{ height: 12, width: "70%", background: C.warm, borderRadius: 4, marginTop: 10 }} />
                <div style={{ height: 10, width: "50%", background: C.warm, borderRadius: 4, marginTop: 6 }} />
              </div>
            ))
          ) : clinics.length === 0 ? (
            <EmptyCard />
          ) : (
            clinics.map((c) => (
              <Link
                key={c.id}
                to="/clinics/$id"
                params={{ id: c.id }}
                style={{ textDecoration: "none" }}
              >
                <ClinicCard
                  name={c.name}
                  loc={c.neighborhood ?? ""}
                  tags={(c.best_for ?? []).slice(0, 3)}
                  imageUrl={c.image_url}
                />
              </Link>
            ))
          )}
        </div>
      </div>

      {/* HONEST DATA NOTE */}
      <div style={{ padding: "12px 16px 0" }}>
        <div
          style={{
            background: "#fff",
            border: `0.5px solid ${C.border}`,
            borderRadius: 12,
            padding: 12,
            fontSize: 11,
            color: "#999",
            lineHeight: 1.5,
          }}
        >
          Product ratings and majority/minority breakdowns roll out here as real reviews come in from TikTok, Reddit, and community spills.
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

      <Footer />
      <BottomNav />
    </div>
  </AppFrame>
  );
}

function EmptyCard() {
  return (
    <div
      style={{
        minWidth: 200,
        background: "#fff",
        border: `0.5px solid ${C.border}`,
        borderRadius: 12,
        padding: 20,
        color: C.muted,
        fontSize: 12,
        textAlign: "center",
      }}
    >
      More coming soon
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

function ClinicCard({ name, loc, tags, imageUrl }: { name: string; loc: string; tags: string[]; imageUrl?: string | null }) {
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
      <div style={{ width: "100%", height: 80, background: C.warm, borderRadius: 10, overflow: "hidden" }}>
        {imageUrl && (
          <img src={imageUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
      </div>
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
