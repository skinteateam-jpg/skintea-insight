import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { Search, Bookmark, ChevronRight, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import AppFrame from "@/components/AppFrame";

export const Route = createFileRoute("/products")({
  component: ProductsPage,
  head: () => ({
    meta: [
      { title: "Skintea — Real reviews. Bold decisions." },
      {
        name: "description",
        content:
          "Browse trending skincare and makeup. Real reviews from TikTok, Reddit and Sephora, ranked and structured.",
      },
      { property: "og:title", content: "Skintea — Real reviews. Bold decisions." },
      {
        property: "og:description",
        content: "Trending skincare and makeup ranked by real user reviews.",
      },
    ],
  }),
});

// ---------- Brand tokens (literal per spec) ----------
const C = {
  espresso: "#1C0A00",
  crimson: "#A8001C",
  bg: "#FFFCF8",
  surface: "#FFFFFF",
  border: "#E8DDD4",
  borderStrong: "#E8DDD4",
  textMid: "#1C0A00",
  textLight: "#999999",
  imageBg: "#FFFCF8",
  hoverTint: "#FDF8F5",
};

// ---------- Data ----------
type DbProduct = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  product_url: string | null;
  description: string | null;
  is_active: boolean | null;
  is_top_pick: boolean | null;
  skintea_score: number | null;
  source: string | null;
  created_at: string | null;
  product_family_name: string | null;
  shade_name: string | null;
  size_variant: string | null;
};

type Product = {
  id: string;
  brand: string;
  name: string;
  price: string;
  source: string;
  recommend?: number;
  emoji: string;
  image_url?: string | null;
  subcategory: string | null;
};

function emojiFor(subcategory: string | null | undefined): string {
  const c = (subcategory ?? "").toLowerCase();
  if (c.includes("serum")) return "🧪";
  if (c.includes("moistur") || c.includes("cream") || c.includes("balm") || c.includes("mask")) return "🫙";
  if (c.includes("cleans")) return "🧼";
  if (c.includes("toner") || c.includes("mist")) return "💦";
  if (c.includes("spf") || c.includes("sun")) return "☀️";
  if (c.includes("tint")) return "💋";
  if (c.includes("gloss")) return "✨";
  if (c.includes("liner")) return "✏️";
  if (c.includes("lipstick")) return "💄";
  if (c.includes("foundation") || c.includes("cushion")) return "🧴";
  if (c.includes("primer")) return "🎨";
  if (c.includes("powder") || c.includes("setting")) return "💨";
  if (c.includes("blush")) return "🌸";
  if (c.includes("bronzer")) return "🟫";
  if (c.includes("highlighter")) return "✨";
  if (c.includes("mascara")) return "👀";
  if (c.includes("perfume") || c.includes("fragrance")) return "🌹";
  if (c.includes("brush") || c.includes("device") || c.includes("accessory") || c.includes("spatula") || c.includes("bag") || c.includes("apparel")) return "🛠️";
  if (c.includes("body")) return "🧴";
  if (c.includes("eye cream") || c.includes("eye patch")) return "👁️";
  return "🧴";
}

function toProduct(p: DbProduct, opts?: { recommend?: boolean }): Product {
  return {
    id: p.id,
    brand: p.brand ?? "",
    name: p.product_family_name ?? p.name,
    price: p.price != null ? `$${p.price}` : "",
    source: p.source ?? "",
    emoji: emojiFor(p.subcategory),
    image_url: p.image_url,
    recommend: opts?.recommend && p.skintea_score != null ? Math.round(p.skintea_score) : undefined,
    subcategory: p.subcategory ?? null,
  };
}

function dedupByFamily(rows: DbProduct[]): DbProduct[] {
  const groups = new Map<string, DbProduct[]>();
  for (const row of rows) {
    const key = row.product_family_name ?? row.id;
    const arr = groups.get(key);
    if (arr) arr.push(row);
    else groups.set(key, [row]);
  }
  return Array.from(groups.values()).map((group) => {
    if (group.length === 1) return group[0];
    const candidates = group.some((r) => r.shade_name)
      ? group.filter((r) => r.shade_name)
      : group;
    return candidates.sort((a, b) => {
      const aFull = a.size_variant === "Full" ? 0 : 1;
      const bFull = b.size_variant === "Full" ? 0 : 1;
      if (aFull !== bFull) return aFull - bFull;
      return (a.shade_name ?? "").localeCompare(b.shade_name ?? "");
    })[0];
  });
}

const CATEGORIES = ["All", "Skincare", "Lip", "Face", "Sunscreen", "Cheek", "Bodycare", "Eye", "Tool", "Fragrance"] as const;
type Category = (typeof CATEGORIES)[number];

const FILTERS = ["Filters", "Price", "Skin type", "Concern"];

function ProductsPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();

  const [items, setItems] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [categorySubs, setCategorySubs] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setActiveSubcategory(null);
  }, [activeCategory]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DbProduct[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Randomised server-side (ORDER BY random()) so a bulk import of a single
      // brand can never dominate the ranking pool.
      const { data } = await supabase.rpc("random_active_products", {
        p_category: activeCategory === "All" ? undefined : activeCategory,
        p_subcategory: activeSubcategory ?? undefined,
        p_limit: 60,
      });
      if (!cancelled) {
        const pool = dedupByFamily((data ?? []) as DbProduct[]);
        setItems(pool.slice(0, 9));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeCategory, activeSubcategory]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("distinct_product_subcategories");
      if (cancelled) return;
      const groups = new Map<string, Set<string>>();
      for (const row of (data ?? []) as { category: string | null; subcategory: string | null }[]) {
        if (!row.category || !row.subcategory) continue;
        if (!groups.has(row.category)) groups.set(row.category, new Set());
        groups.get(row.category)!.add(row.subcategory);
      }
      const sorted: Record<string, string[]> = {};
      for (const [cat, set] of groups) {
        sorted[cat] = Array.from(set).sort((a, b) => a.localeCompare(b));
      }
      setCategorySubs(sorted);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.trim();
    const t = window.setTimeout(async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
        .limit(20);
      setSearchResults(dedupByFamily((data ?? []) as DbProduct[]));
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const soaring = items.slice(0, 3).map((p) => toProduct(p));
  const tiktokRanking = items.slice(3, 6).map((p) => toProduct(p));
  const highestRecommended = items.slice(6, 9).map((p) => toProduct(p, { recommend: true }));
  // Narrow subcategories can return fewer than 9 products; showing three ranking
  // headings with empty grids underneath is worse than one plain grid.
  const thinResult = !loading && !!activeSubcategory && items.length < 9;
  const flatItems = items.map((p) => toProduct(p));
  const showDropdown = searchQuery.trim().length >= 2 && searchResults.length > 0;

  const visibleSubCategories = useMemo(() => {
    if (activeCategory === "All") {
      return CATEGORIES.slice(1)
        .filter((cat) => (categorySubs[cat] ?? []).length > 0)
        .map((cat) => ({ label: cat, items: categorySubs[cat] ?? [] }));
    }
    return (categorySubs[activeCategory] ?? []).length > 0
      ? [{ label: activeCategory, items: categorySubs[activeCategory] }]
      : [];
  }, [activeCategory, categorySubs]);

  return (
    <AppFrame>
    <div style={{ background: C.bg, minHeight: "100vh", color: C.espresso }}>
      <div style={{ maxWidth: 390, margin: "0 auto", background: C.bg }}>
        {/* 1. Top bar */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            background: C.surface,
            borderBottom: `0.5px solid ${C.border}`,
          }}
        >
          <Link to="/products" style={{ textDecoration: "none", display: "block" }}>
            <div style={{ lineHeight: 1 }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 22, color: "#1C0A00" }}>Skin</span>
              <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 22, color: "#A8001C" }}>tea</span>
            </div>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#999999", marginTop: 2 }}>Got Skintea? Spill it.</div>
          </Link>
          <div style={{ flex: 1, position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: `1.5px solid ${C.espresso}`,
              borderRadius: 4,
              padding: "6px 10px",
              background: C.surface,
            }}
          >
            <Search size={14} color={C.espresso} strokeWidth={2.5} />
            <input
              type="text"
              placeholder="Search products, brands"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 12,
                color: C.espresso,
                fontWeight: 500,
              }}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
                aria-label="Clear search"
              >
                <X size={14} color={C.espresso} />
              </button>
            )}
          </div>
          {showDropdown && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: C.surface,
                border: `1.5px solid ${C.espresso}`,
                borderRadius: 4,
                maxHeight: 320,
                overflowY: "auto",
                zIndex: 100,
              }}
            >
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    navigate({ to: "/product-detail/$id", params: { id: r.id } });
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    background: "transparent",
                    border: "none",
                    borderBottom: `0.5px solid ${C.border}`,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: C.textLight, letterSpacing: "0.04em" }}>
                    {r.brand}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.espresso }}>{r.product_family_name ?? r.name}</div>
                  {r.price != null && (
                    <div style={{ fontSize: 12, fontWeight: 800, color: C.espresso, marginTop: 2 }}>${r.price}</div>
                  )}
                </button>
              ))}
            </div>
          )}
          </div>
        </header>

        {/* 2. Category tabs */}
        <nav
          style={{
            display: "flex",
            gap: 0,
            overflowX: "auto",
            background: C.surface,
            borderBottom: `0.5px solid ${C.border}`,
            scrollbarWidth: "none",
          }}
        >
          {CATEGORIES.map((cat) => {
            const active = cat === activeCategory;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  flexShrink: 0,
                  padding: "12px 14px",
                  background: "transparent",
                  border: "none",
                  borderBottom: active ? `3px solid ${C.crimson}` : "3px solid transparent",
                  color: active ? C.crimson : C.espresso,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {cat}
              </button>
            );
          })}
        </nav>

        {/* 3. Filter row */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "12px 16px",
            overflowX: "auto",
            scrollbarWidth: "none",
            background: C.bg,
          }}
        >
          {FILTERS.map((f) => (
            <button
              key={f}
              style={{
                flexShrink: 0,
                padding: "6px 12px",
                border: `0.5px solid ${C.border}`,
                borderRadius: 99,
                background: "transparent",
                color: C.espresso,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* 4. Ranking sections */}
        {thinResult ? (
          flatItems.length > 0 && (
            <section style={{ padding: "16px 16px 8px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {flatItems.map((p, idx) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    rank={idx + 1}
                    onSave={() => setShowLogin(true)}
                  />
                ))}
              </div>
            </section>
          )
        ) : (
          <>
            {(loading || soaring.length > 0) && (
              <RankingSection
                title="Soaring"
                icon="🔥"
                products={soaring}
                onSave={() => setShowLogin(true)}
                trendingBadge
                loading={loading}
              />
            )}
            {(loading || tiktokRanking.length > 0) && (
              <RankingSection
                title="TikTok Ranking"
                products={tiktokRanking}
                onSave={() => setShowLogin(true)}
                loading={loading}
              />
            )}
            {(loading || highestRecommended.length > 0) && (
              <RankingSection
                title="Highest Recommended"
                products={highestRecommended}
                onSave={() => setShowLogin(true)}
                showRecommend
                loading={loading}
              />
            )}
          </>
        )}

        {/* 5. Category sub-sections */}
        <div style={{ padding: "8px 16px 32px" }}>
          {visibleSubCategories.map((section) => (
            <div key={section.label} style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: "inline-block",
                  background: C.espresso,
                  color: C.surface,
                  padding: "5px 12px",
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                {section.label}
              </div>
              <div
                style={{
                  border: `0.5px solid ${C.border}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  background: C.surface,
                }}
              >
                {section.items.map((name, idx) => {
                  const col = idx % 2;
                  const row = Math.floor(idx / 2);
                  const totalRows = Math.ceil(section.items.length / 2);
                  return (
                    <SubCategoryCell
                      key={name}
                      name={name}
                      hasRightBorder={col === 0}
                      hasBottomBorder={row < totalRows - 1}
                      active={activeSubcategory === name}
                      onClick={() =>
                        setActiveSubcategory((prev) => (prev === name ? null : name))
                      }
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Login modal */}
      {showLogin && (
        <div
          onClick={() => setShowLogin(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(28,10,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.surface,
              borderRadius: 8,
              padding: 24,
              width: "100%",
              maxWidth: 320,
              border: `1.5px solid ${C.espresso}`,
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowLogin(false)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: C.espresso,
              }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <div
              style={{
                fontWeight: 900,
                fontSize: 18,
                color: C.espresso,
                marginBottom: 6,
                letterSpacing: "-0.02em",
              }}
            >
              Sign in to save products
            </div>
            <div style={{ color: C.textMid, fontSize: 13, marginBottom: 16 }}>
              Build your watchlist and get notified when reviews shift.
            </div>
            <button
              style={{
                width: "100%",
                background: C.crimson,
                color: C.surface,
                padding: "12px",
                border: "none",
                borderRadius: 4,
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Sign in
            </button>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  </AppFrame>
  );
}

// ---------- Components ----------

function RankingSection({
  title,
  icon,
  products,
  onSave,
  showRecommend,
  trendingBadge,
  loading,
}: {
  title: string;
  icon?: string;
  products: Product[];
  onSave: () => void;
  showRecommend?: boolean;
  trendingBadge?: boolean;
  loading?: boolean;
}) {
  return (
    <section style={{ padding: "16px 16px 8px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 4, height: 18, background: C.crimson, borderRadius: 1 }} />
          <h2
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: C.espresso,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            {icon && <span style={{ marginRight: 4 }}>{icon}</span>}
            {title}
          </h2>
        </div>
        <a
          href="#"
          style={{
            color: C.crimson,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            textDecoration: "underline",
          }}
        >
          See all ›
        </a>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {loading
          ? [0, 1, 2].map((i) => (
              <div
                key={`sk-${title}-${i}`}
                style={{
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 6,
                  background: C.surface,
                  aspectRatio: "1 / 1.6",
                  opacity: 0.5,
                }}
              />
            ))
          : products.map((p, idx) => (
              <ProductCard
                key={`${title}-${p.id}`}
                product={p}
                rank={idx + 1}
                onSave={onSave}
                showRecommend={showRecommend}
                trendingBadge={trendingBadge}
              />
            ))}
      </div>
    </section>
  );
}

function ProductCard({
  product,
  rank,
  onSave,
  showRecommend,
  trendingBadge,
}: {
  product: Product;
  rank: number;
  onSave: () => void;
  showRecommend?: boolean;
  trendingBadge?: boolean;
}) {
  return (
    <Link
      to="/product-detail/$id"
      params={{ id: product.id }}
      style={{
        border: `1.5px solid ${C.border}`,
        borderRadius: 6,
        background: C.surface,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {/* Image */}
      <div
        style={{
          position: "relative",
          aspectRatio: "1 / 1",
          background: C.imageBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 36,
        }}
      >
        {trendingBadge ? (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              padding: "3px 5px",
              fontSize: 14,
              lineHeight: 1,
            }}
            aria-label="Trending"
          >
            📈
          </div>
        ) : (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              background: rank === 1 ? C.crimson : C.espresso,
              color: C.surface,
              padding: "3px 7px",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.02em",
              borderRadius: 0,
            }}
          >
            {String(rank).padStart(2, "0")}
          </div>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            onSave();
          }}
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: C.surface,
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
          }}
          aria-label="Save"
        >
          <Bookmark size={12} color={C.textLight} strokeWidth={2} />
        </button>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span aria-hidden>{product.emoji}</span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "8px 8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            color: C.textLight,
            letterSpacing: "0.04em",
          }}
        >
          {product.brand}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.espresso,
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: 32,
          }}
        >
          {product.name}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: C.espresso }}>{product.price}</span>
          <span style={{ fontSize: 10, color: C.textLight }}>{product.source}</span>
        </div>
        {showRecommend && product.recommend !== undefined ? (
          <div style={{ fontSize: 12, color: C.crimson, fontWeight: 800 }}>
            {product.recommend}% recommend
          </div>
        ) : null}
        <span
          style={{
            marginTop: 4,
            color: C.crimson,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "-0.01em",
          }}
        >
          What's the tea? →
        </span>
      </div>
    </Link>
  );
}

function SubCategoryCell({
  name,
  hasRightBorder,
  hasBottomBorder,
  active,
  onClick,
}: {
  name: string;
  hasRightBorder: boolean;
  hasBottomBorder: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 12px",
        background: active ? C.hoverTint : hover ? C.hoverTint : C.surface,
        border: "none",
        borderRight: hasRightBorder ? `0.5px solid ${C.border}` : "none",
        borderBottom: hasBottomBorder ? `0.5px solid ${C.border}` : "none",
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.15s",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: C.imageBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          flexShrink: 0,
        }}
        aria-hidden
      >
        {emojiFor(name)}
      </div>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: active ? C.crimson : C.espresso }}>{name}</span>
      <ChevronRight size={14} color={active ? C.crimson : C.textLight} />
    </button>
  );
}
