import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { ReactNode, CSSProperties } from "react";
import { Heart, MessageCircle, Play, Share2, ArrowUpCircle, ExternalLink, ArrowLeft, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const WARM_WHITE = "#FFFCF8";
const BORDER = "#E8DDD4";
const MUTED = "#999999";
const CRIMSON_TINT = "#FEE8EC";
const CREAM_TINT = "#F5EFEC";
const TRACK = "#F0EAE4";

const SECTION_LABEL: CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: CRIMSON,
};

const SKIN_CHARACTERS: Record<string, { emoji: string; name: string }> = {
  oily: { emoji: "🧈", name: "The Butter Girl" },
  dry: { emoji: "🫙", name: "The Cracker" },
  combination: { emoji: "🥯", name: "The Everything Bagel" },
  normal: { emoji: "🥛", name: "The Glass of Milk" },
  sensitive: { emoji: "🍑", name: "The Peach" },
};

const SKIN_ORDER = ["oily", "sensitive", "combination", "normal", "dry"] as const;
const SKIN_PCT: Record<string, number> = { oily: 92, sensitive: 88, combination: 79, normal: 76, dry: 41 };

const AGE_ORDER: { key: string; label: string; sub: string; pct: number }[] = [
  { key: "teens", label: "Teens", sub: "13–19", pct: 72 },
  { key: "20s", label: "20s", sub: "20–29", pct: 88 },
  { key: "30s", label: "30s", sub: "30–39", pct: 94 },
  { key: "40s", label: "40s", sub: "40–49", pct: 91 },
  { key: "50s+", label: "50s+", sub: "50 and up", pct: 84 },
];

const SKIN_TYPE_LABEL: Record<string, string> = {
  oily: "Oily skin",
  dry: "Dry skin",
  combination: "Combination skin",
  normal: "Normal skin",
  sensitive: "Sensitive skin",
};

function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ padding: 16, borderBottom: `0.5px solid ${BORDER}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={SECTION_LABEL}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

export const Route = createFileRoute("/product-detail/$id")({
  component: ProductPage,
  head: () => ({
    meta: [
      { title: "Product — Skintea" },
      {
        name: "description",
        content:
          "Real opinions from TikTok, Instagram and Reddit, summarized by AI.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" },
    ],
  }),
});



const keyIngredients: { name: string; match: Record<string, "good" | "watch" | "neutral"> }[] = [
  { name: "Ceramide NP", match: { dry: "good", sensitive: "good", oily: "neutral", combination: "neutral" } },
  { name: "Ceramide AP", match: { dry: "good", sensitive: "good", oily: "neutral", combination: "neutral" } },
  { name: "Ceramide EOP", match: { dry: "good", sensitive: "good", oily: "neutral", combination: "neutral" } },
  { name: "Hyaluronic Acid", match: { dry: "good", sensitive: "good", oily: "watch", combination: "watch" } },
  { name: "Niacinamide", match: { oily: "good", combination: "good", dry: "neutral", sensitive: "watch" } },
  { name: "Cholesterol", match: { dry: "good", sensitive: "good", oily: "watch", combination: "neutral" } },
  { name: "Phytosphingosine", match: { sensitive: "good", dry: "good", oily: "neutral", combination: "neutral" } },
];

const fullIngredients: { name: string; match: Record<string, "good" | "watch" | "neutral"> }[] = [
  { name: "Purified Water", match: {} },
  { name: "Glycerin", match: { dry: "good", sensitive: "good", oily: "neutral", combination: "neutral" } },
  { name: "Caprylic/Capric Triglyceride", match: { dry: "good", oily: "watch", combination: "neutral", sensitive: "neutral" } },
  { name: "Cetearyl Alcohol", match: { dry: "good", oily: "watch", sensitive: "neutral", combination: "neutral" } },
  { name: "Ceramide NP", match: { dry: "good", sensitive: "good", oily: "neutral", combination: "neutral" } },
  { name: "Ceramide AP", match: { dry: "good", sensitive: "good", oily: "neutral", combination: "neutral" } },
  { name: "Ceramide EOP", match: { dry: "good", sensitive: "good", oily: "neutral", combination: "neutral" } },
  { name: "Carbomer", match: {} },
  { name: "Dimethicone", match: { dry: "good", sensitive: "good", oily: "watch", combination: "watch" } },
  { name: "Sodium Hyaluronate", match: { dry: "good", sensitive: "good", oily: "watch", combination: "neutral" } },
  { name: "Cholesterol", match: { dry: "good", sensitive: "good", oily: "watch", combination: "neutral" } },
  { name: "Phenoxyethanol", match: {} },
  { name: "Disodium EDTA", match: {} },
  { name: "Phytosphingosine", match: { sensitive: "good", dry: "good", oily: "neutral", combination: "neutral" } },
  { name: "Tocopherol", match: { dry: "good", sensitive: "good", oily: "neutral", combination: "neutral" } },
  { name: "Niacinamide", match: { oily: "good", combination: "good", dry: "neutral", sensitive: "watch" } },
  { name: "Xanthan Gum", match: {} },
  { name: "Ethylhexylglycerin", match: {} },
];

const STORE_LINKS = [
  { name: "Amazon", url: "https://www.amazon.com" },
  { name: "Sephora", url: "https://www.sephora.com" },
  { name: "Ulta", url: "https://www.ulta.com" },
  { name: "YesStyle", url: "https://www.yesstyle.com" },
];

const CONFIDENCE_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

const REDDIT_SENTIMENT_META: Record<string, { color: string; label: string }> = {
  positive: { color: "#2D7A3A", label: "Positive" },
  negative: { color: "#A8001C", label: "Negative" },
  mixed: { color: "#8A7268", label: "Mixed" },
};

const SKIN_TYPE_PILL: Record<string, string> = {
  oily: "🧈",
  dry: "🫙",
  combination: "🥯",
  normal: "🥛",
  sensitive: "🍑",
};

function subredditFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/r\/([^/]+)\//);
  return m ? m[1] : null;
}



function extractTikTokVideoId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}

function ProductPage() {
  const { id } = Route.useParams();
  const [tab, setTab] = useState("tiktok");
  const [pageTab, setPageTab] = useState<"product" | "tea">("product");
  const [teaPosts, setTeaPosts] = useState<any[]>([]);
  const [teaFilter, setTeaFilter] = useState<string>("all");
  const [, setTeaLoading] = useState(false);
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { from?: string; postId?: string } | undefined;
  const fromPost = search?.from === "post";
  const fromPostId = search?.postId;
  const [userSkinType, setUserSkinType] = useState<string | null>(null);
  const [userAgeBracket, setUserAgeBracket] = useState<string | null>(null);
  const [productData, setProductData] = useState<any>(null);
  const [activeProduct, setActiveProduct] = useState<any>(null);
  const [shadeOptions, setShadeOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isInShelf, setIsInShelf] = useState(false);
  const [shelving, setShelving] = useState(false);
  const [isInGift, setIsInGift] = useState(false);
  const [gifting, setGifting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [socialReviews, setSocialReviews] = useState<any[]>([]);
  const [activeTikTokEmbed, setActiveTikTokEmbed] = useState<string | null>(null); // stores source_url
  const [tiktokThumbnails, setTiktokThumbnails] = useState<Record<string, string>>({});
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    if (!productData) return;
    const orFilter = productData.product_family_name
      ? `product_id.eq.${id},product_family_name.eq.${productData.product_family_name}`
      : `product_id.eq.${id}`;
    (supabase as any)
      .from("social_review_tags")
      .select("*")
      .or(orFilter)
      .then(({ data }: any) => setSocialReviews(data ?? []));
  }, [id, productData]);

  useEffect(() => {
    if (!activeTikTokEmbed) return;
    const existing = document.getElementById("tiktok-embed-script");
    if (existing) {
      existing.remove();
    }
    const script = document.createElement("script");
    script.id = "tiktok-embed-script";
    script.async = true;
    script.src = "https://www.tiktok.com/embed.js";
    document.body.appendChild(script);
  }, [activeTikTokEmbed]);

  useEffect(() => {
    const urls = socialReviews.filter((r) => r.platform === "tiktok" && r.source_url).map((r) => r.source_url as string);
    const toFetch = Array.from(new Set(urls)).filter((u) => !(u in tiktokThumbnails));
    if (toFetch.length === 0) return;
    toFetch.forEach(async (u) => {
      try {
        const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(u)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.thumbnail_url) {
          setTiktokThumbnails((prev) => ({ ...prev, [u]: data.thumbnail_url }));
        }
      } catch {
        // silently ignore — card falls back to the dark placeholder
      }
    });
  }, [socialReviews]);

  useEffect(() => {
    setHeroIndex(0);
  }, [activeProduct?.id]);

  useEffect(() => {
    let cancelled = false;
    setTeaLoading(true);
    (supabase as any)
      .from("product_posts")
      .select("*")
      .eq("product_id", id)
      .order("agree_count", { ascending: false })
      .then(({ data }: any) => {
        if (!cancelled) {
          setTeaPosts(data ?? []);
          setTeaLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      (supabase as any).from("saved_products").select("id").eq("user_id", uid).eq("product_id", id).maybeSingle()
        .then(({ data: row }: any) => setIsSaved(!!row));
      (supabase as any).from("shelf_items").select("id").eq("user_id", uid).eq("product_id", id).maybeSingle()
        .then(({ data: row }: any) => setIsInShelf(!!row));
      (supabase as any).from("gift_wishlist").select("id").eq("user_id", uid).eq("product_id", id).maybeSingle()
        .then(({ data: row }: any) => setIsInGift(!!row));
    });
  }, [id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("skintea.quizResult");
      if (raw) {
        const parsed = JSON.parse(raw);
        const st = parsed?.skinType?.toLowerCase() ?? null;
        setUserSkinType(st);
        if (st) localStorage.setItem("skintea_skin_type", st);
      } else {
        setUserSkinType(localStorage.getItem("skintea_skin_type") || null);
      }
    } catch {
      setUserSkinType(localStorage.getItem("skintea_skin_type") || null);
    }
    setUserAgeBracket(localStorage.getItem("skintea_age_bracket") || null);
  }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("products")
        .select("id,name,brand,category,subcategory,description,image_url,image_urls,product_url,price,currency,skintea_score,product_family_name,shade_name")
        .eq("id", id)
        .single();
      if (!cancelled) {
        setProductData(data);
        setActiveProduct(data);
        if (data?.product_family_name && data?.brand) {
          const { data: siblings } = await supabase
            .from("products")
            .select("id,name,brand,category,subcategory,description,image_url,image_urls,product_url,price,currency,skintea_score,product_family_name,shade_name")
            .eq("product_family_name", data.product_family_name)
            .eq("brand", data.brand)
            .order("shade_name", { ascending: true });
          if (!cancelled) {
            setShadeOptions(siblings ?? []);
          }
        } else {
          setShadeOptions([]);
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen" style={{ background: WARM_WHITE, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 12, color: "#999" }}>Loading…</p>
      </main>
    );
  }

  function getIngredientStyle(ing: { name: string; match: Record<string, "good" | "watch" | "neutral"> }) {
    if (!userSkinType) return { background: WARM_WHITE, color: MUTED, border: "none", label: "Neutral" as const, status: "neutral" as const };
    const status = ing.match[userSkinType] || "neutral";
    if (status === "good") return { background: "#F0FAF1", color: "#2D7A3A", border: "0.5px solid #2D7A3A", fontWeight: 600, label: "Great for you" as const, status };
    if (status === "watch") return { background: "#FFF5F5", color: CRIMSON, border: `0.5px solid ${CRIMSON}`, fontWeight: 600, label: "Watch" as const, status };
    return { background: WARM_WHITE, color: MUTED, border: "none", label: "Neutral" as const, status };
  }

  function showToast(msg: string) { setToast(msg); window.setTimeout(() => setToast(null), 2200); }

  async function handleShelfClick() {
    if (!userId) { navigate({ to: "/login" }); return; }
    if (shelving) return;
    setShelving(true);
    if (!isInShelf) {
      const { error } = await (supabase as any).from("shelf_items").insert({
        user_id: userId,
        product_id: id,
        product_name: productData?.name ?? "Product",
        brand: productData?.brand ?? null,
        category: productData?.subcategory ?? "Other",
        image_url: productData?.image_url ?? null,
        is_public: true,
      });
      if (!error) { setIsInShelf(true); showToast("Added to your shelf 🧴"); }
      else { showToast("Couldn't add to shelf"); }
    } else {
      const { error } = await (supabase as any).from("shelf_items").delete().eq("user_id", userId).eq("product_id", id);
      if (!error) { setIsInShelf(false); showToast("Removed from shelf"); }
    }
    setShelving(false);
  }
  async function handleGiftClick() {
    if (!userId) { navigate({ to: "/login" }); return; }
    if (gifting) return;
    setGifting(true);
    if (!isInGift) {
      const cat = (productData?.category ?? "").toLowerCase();
      const type = cat.includes("makeup") ? "makeup" : "skincare";
      const { error } = await (supabase as any).from("gift_wishlist").insert({
        user_id: userId,
        product_id: id,
        product_name: productData?.name ?? "Product",
        brand: productData?.brand ?? null,
        category: productData?.subcategory ?? null,
        emoji: "🎁",
        image_url: productData?.image_url ?? null,
        affiliate_url: productData?.product_url ?? null,
        type,
        is_public: true,
      });
      if (!error) { setIsInGift(true); showToast("Added to Gift Me 🎁"); }
      else { showToast("Couldn't add to Gift Me"); }
    } else {
      const { error } = await (supabase as any).from("gift_wishlist").delete().eq("user_id", userId).eq("product_id", id);
      if (!error) { setIsInGift(false); showToast("Removed from Gift Me"); }
    }
    setGifting(false);
  }

  async function handleSaveToggle() {
    if (!userId) { navigate({ to: "/login" }); return; }
    if (saving) return;
    setSaving(true);
    if (!isSaved) {
      const { error } = await (supabase as any).from("saved_products").insert({ user_id: userId, product_id: id, created_at: new Date().toISOString() });
      if (!error) { setIsSaved(true); showToast("Saved! View in your profile 🔖"); }
    } else {
      const { error } = await (supabase as any).from("saved_products").delete().eq("user_id", userId).eq("product_id", id);
      if (!error) { setIsSaved(false); showToast("Removed from saved"); }
    }
    setSaving(false);
  }

  const reviewCount = socialReviews.length;
  const reviewCountLabel = reviewCount >= 1000 ? `${(reviewCount / 1000).toFixed(1)}k` : `${reviewCount || "2.4k"}`;
  const recommendPct = productData?.skintea_score ?? 78;
  const confidence = reviewCount > 500 ? "High" : reviewCount >= 100 ? "Medium" : "Low";
  const skintea = productData?.skintea_score ?? "—";

  const backTo = () => {
    if (fromPost && fromPostId) navigate({ to: "/tea-products/$postId", params: { postId: fromPostId } });
    else navigate({ to: "/products" });
  };

  const taggedReviews = socialReviews.filter((r) => r.sentiment === "positive" || r.sentiment === "negative" || r.sentiment === "mixed");
  const posCount = taggedReviews.filter((r) => r.sentiment === "positive").length;
  const negCount = taggedReviews.filter((r) => r.sentiment === "negative").length;
  const mixedCount = taggedReviews.filter((r) => r.sentiment === "mixed").length;
  const sentimentTotal = posCount + negCount + mixedCount;
  const hasEnoughSentimentData = sentimentTotal >= 10;
  const majorityIsPositive = posCount >= negCount;
  const majorityCount = majorityIsPositive ? posCount : negCount;
  const minorityCount = majorityIsPositive ? negCount : posCount;
  const majorityPct = sentimentTotal > 0 ? Math.round((majorityCount / sentimentTotal) * 100) : 0;
  const minorityPct = 100 - majorityPct;
  function topQuote(sentiment: string) {
    const matches = taggedReviews.filter((r) => r.sentiment === sentiment).sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    return matches[0]?.content ?? null;
  }
  const majorityQuote = topQuote(majorityIsPositive ? "positive" : "negative");
  const minorityQuote = topQuote(majorityIsPositive ? "negative" : "positive");

  return (
    <main className="min-h-screen" style={{ paddingTop: 52, paddingBottom: 120, background: WARM_WHITE, fontFamily: "'DM Sans', sans-serif" }}>
      {/* 1. Sticky top bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: WARM_WHITE, borderBottom: `0.5px solid ${BORDER}`, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={backTo} aria-label="Back" style={{ background: "transparent", border: "none", color: ESPRESSO, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, padding: 0 }}>
          <ArrowLeft size={16} />
          <span>{fromPost ? "Back" : "Products"}</span>
        </button>
        <Link to="/" style={{ textDecoration: "none", lineHeight: 1 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 20, color: ESPRESSO }}>Skin</span>
          <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 20, color: CRIMSON }}>tea</span>
        </Link>
        <div style={{ width: 40 }} />
      </div>

      {/* 2. Product hero */}
      <div style={{ width: "100%", position: "relative" }}>
        {(() => {
          const galleryImages = Array.isArray(activeProduct?.image_urls) && activeProduct.image_urls.length > 0
            ? activeProduct.image_urls.filter((u: any) => typeof u === "string" && u)
            : activeProduct?.image_url
            ? [activeProduct.image_url]
            : [];
          const showGallery = galleryImages.length > 1;
          return (
            <>
              <div style={{ width: "100%", background: "#FFFCF8", borderBottom: `0.5px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 260, overflow: "hidden", position: "relative" }}>
                {galleryImages.length === 0 ? (
                  <div style={{ width: 100, height: 140, background: "#F0EAE4", borderRadius: 12 }} />
                ) : showGallery ? (
                  <div
                    key={activeProduct?.id}
                    onScroll={(e) => {
                      const el = e.currentTarget;
                      const idx = Math.round(el.scrollLeft / el.clientWidth);
                      setHeroIndex(idx);
                    }}
                    style={{ display: "flex", width: "100%", minHeight: 260, overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
                  >
                    {galleryImages.map((src: string, idx: number) => (
                      <div key={idx} style={{ width: "100%", flex: "0 0 100%", scrollSnapAlign: "start", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 260 }}>
                        <img src={src} alt={`${activeProduct?.name ?? ""} ${idx + 1}`} style={{ maxHeight: 240, maxWidth: "80%", objectFit: "contain", display: "block" }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <img src={galleryImages[0]} alt={activeProduct?.name ?? ""} style={{ maxHeight: 240, maxWidth: "80%", objectFit: "contain", display: "block" }} />
                )}
                {showGallery && (
                  <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6, zIndex: 10 }}>
                    {galleryImages.map((_: string, idx: number) => (
                      <div key={idx} style={{ width: 6, height: 6, borderRadius: "50%", background: idx === heroIndex ? CRIMSON : "rgba(28,10,0,0.25)" }} />
                    ))}
                  </div>
                )}
              </div>
            </>
          );
        })()}
        <div style={{ background: "#FFFCF8", padding: "14px 16px 16px", borderBottom: `0.5px solid ${BORDER}` }}>
          <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: CRIMSON, fontWeight: 700, marginBottom: 4 }}>
            {activeProduct?.brand}{activeProduct?.category ? ` · ${activeProduct.category}` : ""}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: ESPRESSO, lineHeight: 1.25, marginBottom: activeProduct?.subcategory ? 3 : 0 }}>
            {activeProduct?.name}
          </div>
          {activeProduct?.subcategory && (
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{activeProduct.subcategory}</div>
          )}
          {shadeOptions.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, overflowX: "auto", paddingBottom: 2 }}>
              {shadeOptions.map((shade) => {
                const selected = shade.id === activeProduct?.id;
                return (
                  <button
                    key={shade.id}
                    onClick={() => setActiveProduct(shade)}
                    style={{
                      flex: "0 0 auto",
                      background: "transparent",
                      border: `1px solid ${selected ? CRIMSON : ESPRESSO}`,
                      color: selected ? CRIMSON : ESPRESSO,
                      borderRadius: 20,
                      padding: "5px 12px",
                      fontSize: 11,
                      fontWeight: selected ? 700 : 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {shade.shade_name ?? shade.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", borderBottom: `0.5px solid ${BORDER}`, background: WARM_WHITE }}>
        {(["product", "tea"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setPageTab(t)}
            style={{
              flex: 1, padding: "11px 0", background: "transparent", border: "none",
              borderBottom: pageTab === t ? `2px solid ${CRIMSON}` : "2px solid transparent",
              fontSize: 13, fontWeight: pageTab === t ? 700 : 500,
              color: pageTab === t ? ESPRESSO : MUTED,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {t === "product" ? "Product" : (
              <span>Tea {teaPosts.length > 0 && <span style={{ fontSize: 10, color: CRIMSON, fontWeight: 700, marginLeft: 3 }}>{teaPosts.length}</span>}</span>
            )}
          </button>
        ))}
      </div>

      {pageTab === "tea" && (
        <TeaTab
          posts={teaPosts}
          filter={teaFilter}
          setFilter={setTeaFilter}
          userSkinType={userSkinType}
          userId={userId}
          productId={id}
          onPostAdded={() => {
            (supabase as any)
              .from("product_posts")
              .select("*")
              .eq("product_id", id)
              .order("agree_count", { ascending: false })
              .then(({ data }: any) => setTeaPosts(data ?? []));
          }}
          navigate={navigate}
        />
      )}

      {pageTab === "product" && (
      <>
      {/* 3. Stats row */}
      <div style={{ display: "flex", borderBottom: `0.5px solid ${BORDER}` }}>
        {[
          { val: `${recommendPct}%`, label: "Recommend", color: ESPRESSO },
          { val: reviewCountLabel, label: "Reviews", color: ESPRESSO },
          { val: confidence, label: "Confidence", color: ESPRESSO },
          { val: `${skintea}`, label: "Skintea", color: CRIMSON },
        ].map((s, i, arr) => (
          <div key={s.label} style={{ flex: 1, padding: "13px 0", textAlign: "center", borderRight: i < arr.length - 1 ? `0.5px solid ${BORDER}` : "none" }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 9, textTransform: "uppercase", color: MUTED, letterSpacing: "0.08em", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 4. Price + buy links */}
      <div style={{ padding: "10px 14px", borderBottom: `0.5px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 8, overflowX: "auto" }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: ESPRESSO, flex: "none" }}>
          {activeProduct?.price ? `$${activeProduct.price}` : "—"}
        </span>
        <span style={{ color: MUTED, flex: "none" }}>·</span>
        {activeProduct?.product_url && (
          <a href={activeProduct.product_url} target="_blank" rel="noopener noreferrer" style={{ flex: "none", background: ESPRESSO, color: WARM_WHITE, borderRadius: 20, padding: "6px 13px", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
            Shop <ExternalLink width={10} height={10} />
          </a>
        )}
        {STORE_LINKS.map((s) => (
          <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" style={{ flex: "none", background: "transparent", color: ESPRESSO, border: `0.5px solid ${BORDER}`, borderRadius: 20, padding: "6px 13px", fontSize: 11, display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
            {s.name} <ExternalLink width={10} height={10} />
          </a>
        ))}
      </div>

      {/* 5. What people say */}
      <Section title="What people say">
        {hasEnoughSentimentData ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              {[
                { label: majorityIsPositive ? "Recommend" : "Don't recommend", pct: majorityPct, color: CRIMSON, sentence: majorityQuote ?? "Based on tagged social posts." },
                { label: majorityIsPositive ? "Don't recommend" : "Recommend", pct: minorityPct, color: "#C8BDB8", sentence: minorityQuote ?? "Based on tagged social posts." },
              ].map((c) => (
                <div key={c.label} style={{ background: "white", border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 30, fontWeight: 700, color: ESPRESSO, lineHeight: 1 }}>{c.pct}%</div>
                  <div style={{ height: 3, background: BORDER, borderRadius: 2, margin: "8px 0", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${c.pct}%`, background: c.color }} />
                  </div>
                  <div style={{ fontSize: 12, color: ESPRESSO, lineHeight: 1.5 }}>{c.sentence}</div>
                </div>
              ))}
            </div>
            <div style={{ background: WARM_WHITE, border: `0.5px solid ${BORDER}`, borderRadius: 10, padding: "10px 13px", marginTop: 10 }}>
              <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Sample size</div>
              <div style={{ fontSize: 12, color: ESPRESSO, lineHeight: 1.55, marginTop: 4 }}>Based on {sentimentTotal} tagged social posts{mixedCount > 0 ? ` (${mixedCount} mixed)` : ""}. Early data — treat as directional, not definitive.</div>
            </div>
          </>
        ) : (
          <div style={{ background: WARM_WHITE, border: `0.5px solid ${BORDER}`, borderRadius: 10, padding: "14px 13px" }}>
            <div style={{ fontSize: 12, color: ESPRESSO, lineHeight: 1.55 }}>Not enough tagged social data yet for this product. Check back soon — we're actively collecting real reviews from TikTok, Instagram, and Reddit.</div>
          </div>
        )}
      </Section>

      {/* 6. Works for you */}
      <Section title="Works for you">
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 12, paddingLeft: 11 }}>Skin type</div>
        {SKIN_ORDER.map((key) => {
          const c = SKIN_CHARACTERS[key];
          const pct = SKIN_PCT[key];
          const me = userSkinType === key;
          if (me) {
            return (
              <div key={key} style={{ background: "#FFF5F7", border: `1px solid ${CRIMSON}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: CRIMSON, fontWeight: 700, fontSize: 13 }}>
                    <span>{c.emoji}</span><span>{c.name} <span style={{ fontWeight: 400, fontSize: 11, color: "rgba(168,0,28,0.7)" }}>({SKIN_TYPE_LABEL[key]})</span></span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ background: CRIMSON, color: WARM_WHITE, fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>You</span>
                    <span style={{ color: CRIMSON, fontWeight: 700, fontSize: 13 }}>{pct}%</span>
                  </div>
                </div>
                <div style={{ height: 4, background: "rgba(168,0,28,0.12)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: CRIMSON }} />
                </div>
              </div>
            );
          }
          return (
            <div key={key} style={{ padding: "8px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#555", fontSize: 12 }}>
                  <span>{c.emoji}</span><span>{c.name} <span style={{ fontWeight: 400, fontSize: 11, color: "#aaa" }}>({SKIN_TYPE_LABEL[key]})</span></span>
                </div>
                <span style={{ color: "#888", fontSize: 12 }}>{pct}%</span>
              </div>
              <div style={{ height: 4, background: BORDER, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "#D4C8C2" }} />
              </div>
            </div>
          );
        })}
        <div style={{ height: "0.5px", background: BORDER, margin: "4px 0 16px" }} />
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 12 }}>Age group</div>
        {AGE_ORDER.map((a) => {
          const me = userAgeBracket === a.key;
          if (me) {
            return (
              <div key={a.key} style={{ background: "#FFF5F7", border: `1px solid ${CRIMSON}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ color: CRIMSON, fontWeight: 700, fontSize: 13 }}>{a.label} <span style={{ color: CRIMSON, fontWeight: 400, fontSize: 11, marginLeft: 4 }}>{a.sub}</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ background: CRIMSON, color: WARM_WHITE, fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>You</span>
                    <span style={{ color: CRIMSON, fontWeight: 700, fontSize: 13 }}>{a.pct}%</span>
                  </div>
                </div>
                <div style={{ height: 4, background: "rgba(168,0,28,0.12)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${a.pct}%`, background: CRIMSON }} />
                </div>
              </div>
            );
          }
          return (
            <div key={a.key} style={{ padding: "8px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ color: "#555", fontSize: 12 }}>{a.label} <span style={{ color: "#888", fontSize: 11, marginLeft: 4 }}>{a.sub}</span></div>
                <span style={{ color: "#888", fontSize: 12 }}>{a.pct}%</span>
              </div>
              <div style={{ height: 4, background: BORDER, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${a.pct}%`, background: "#D4C8C2" }} />
              </div>
            </div>
          );
        })}
        {!userAgeBracket && (
          <div style={{ background: WARM_WHITE, border: `0.5px solid ${BORDER}`, borderRadius: 10, padding: "10px 13px", display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <Info size={15} color={MUTED} />
            <div style={{ fontSize: 11, color: MUTED }}>
              Age highlight comes from your profile.{" "}
              <span onClick={() => navigate({ to: "/skin-profile" })} style={{ color: CRIMSON, fontWeight: 600, cursor: "pointer" }}>Add your age →</span>
            </div>
          </div>
        )}
      </Section>

      {/* 7. Is it for you? */}
      <Section title="Is it for you?">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          {([
            { variant: "yes" as const, header: "Yes — works well", items: [
              { label: "Dry skin", strength: 3 },
              { label: "Sensitive skin", strength: 3 },
              { label: "Compromised barrier", strength: 2 },
              { label: "Eczema-prone", strength: 2 },
            ] },
            { variant: "skip" as const, header: "Skip — may not work", items: [
              { label: "Very oily skin", strength: 3 },
              { label: "Acne-prone (fungal)", strength: 3 },
              { label: "Humid climates", strength: 1 },
              { label: "Rich textures", strength: 2 },
            ] },
          ]).map((card) => {
            const dotColor = card.variant === "yes" ? "#2D7A3A" : CRIMSON;
            return (
              <div key={card.variant} style={{ background: "white", border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 10, color: dotColor, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>{card.header}</div>
                {card.items.map((it) => (
                  <div key={it.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: ESPRESSO }}>{it.label}</span>
                    <div style={{ display: "flex", gap: 3 }}>
                      {[1, 2, 3].map((i) => (
                        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: i <= it.strength ? dotColor : BORDER }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </Section>

      {/* 8. Key ingredients */}
      <Section title="Key ingredients">
        {userSkinType && (
          <div style={{ fontSize: 11, color: "#555", marginBottom: 10 }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#2D7A3A", marginRight: 5, verticalAlign: "middle" }} />Good for you
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#A8001C", marginRight: 5, marginLeft: 12, verticalAlign: "middle" }} />Watch
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#E8DDD4", marginRight: 5, marginLeft: 12, verticalAlign: "middle" }} />Neutral
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {keyIngredients.map((ing) => {
            const st = getIngredientStyle(ing);
            return (
              <span
                key={ing.name}
                style={{
                  background: st.background,
                  color: st.color,
                  border: st.border ?? `0.5px solid ${BORDER}`,
                  fontSize: 12,
                  fontWeight: st.status === "good" ? 600 : 400,
                  padding: "5px 12px",
                  borderRadius: 20,
                  display: "inline-block",
                }}
              >
                {ing.name}
              </span>
            );
          })}
        </div>
        <button onClick={() => setShowAllIngredients((v) => !v)} style={{ background: "transparent", border: "none", color: CRIMSON, fontSize: 12, fontWeight: 600, marginTop: 12, padding: 0, cursor: "pointer" }}>
          Full ingredient list {showAllIngredients ? "▴" : "▾"}
        </button>
        {showAllIngredients && (
          <div style={{ marginTop: 10, fontSize: 12, color: ESPRESSO, lineHeight: 1.7 }}>
            {fullIngredients.map((i) => i.name).join(", ")}
          </div>
        )}
      </Section>

      {/* 9. What people are saying */}
      {availableSocialTabs.length > 0 && (
      <Section title="What people are saying">
        <div style={{ display: "flex", borderBottom: `0.5px solid ${BORDER}`, marginBottom: 12 }}>
          {availableSocialTabs.map((v) => {
            const active = effectiveTab === v;
            return (
              <button key={v} onClick={() => setTab(v)} style={{ flex: 1, background: "transparent", border: "none", borderBottom: active ? `2px solid ${CRIMSON}` : "2px solid transparent", padding: "8px 4px", color: active ? ESPRESSO : MUTED, fontWeight: active ? 700 : 500, fontSize: 12, cursor: "pointer" }}>
                {v === "tiktok" ? "TikTok" : v === "instagram" ? "Instagram" : "Reddit"}
              </button>
            );
          })}
        </div>
        {effectiveTab === "tiktok" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            {(() => {
              const tiktokRows = socialReviews.filter((r) => r.platform === "tiktok");
              const bestPerVideo = new Map<string, typeof tiktokRows[number]>();
              for (const r of tiktokRows) {
                const key = r.source_url ?? r.id;
                const existing = bestPerVideo.get(key);
                if (!existing || (r.likes ?? 0) > (existing.likes ?? 0)) {
                  bestPerVideo.set(key, r);
                }
              }
              const list = Array.from(bestPerVideo.values()).map((r) => ({
                user: r.author_handle ?? "@user",
                views: r.views ? `${r.views}` : "—",
                likes: r.likes ? `${r.likes}` : "—",
                caption: r.content ?? "",
                source_url: (r.source_url ?? null) as string | null,
              }));
              return list.map((t, i) => {
                const thumb = t.source_url ? tiktokThumbnails[t.source_url] : undefined;
                const card = (
                  <div style={{ background: thumb ? `#1a2620 url(${thumb}) center/cover no-repeat` : "#1a2620", borderRadius: 12, overflow: "hidden", aspectRatio: "9/16", position: "relative" }}>
                    <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%, -50%)", width: 36, height: 36, background: "rgba(255,255,255,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Play width={14} height={14} color="#fff" fill="#fff" />
                    </div>
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 10px", background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{t.user}</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", marginTop: 2, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{t.caption}</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>{t.views} views</div>
                    </div>
                  </div>
                );
                return t.source_url ? (
                  <button
                    key={`${t.user}-${i}`}
                    onClick={() => setActiveTikTokEmbed(t.source_url)}
                    style={{ textDecoration: "none", border: "none", padding: 0, background: "none", cursor: "pointer", display: "block", width: "100%" }}
                  >
                    {card}
                  </button>
                ) : (
                  <div key={`${t.user}-${i}`}>{card}</div>
                );
              });
            })()}
          </div>
        )}
        {effectiveTab === "instagram" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(() => {
              const list = socialReviews.filter((r) => r.platform === "instagram").map((r) => ({
                user: r.author_handle ?? "user",
                likes: r.likes ? `${r.likes}` : "—",
                caption: r.content ?? "",
                source_url: (r.source_url ?? null) as string | null,
              }));
              return list.map((p, i) => {
                const card = (
                  <div style={{ background: "white", border: `0.5px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: ESPRESSO }}>@{p.user}</div>
                    <div style={{ fontSize: 11, color: "#555", lineHeight: 1.4, marginTop: 3 }}>{p.caption}</div>
                    <div style={{ display: "flex", gap: 12, fontSize: 10, color: "#bbb", marginTop: 6, alignItems: "center" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Heart width={10} height={10} /> {p.likes}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Share2 width={10} height={10} /></span>
                    </div>
                  </div>
                );
                return p.source_url ? (
                  <a key={`${p.user}-${i}`} href={p.source_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                    {card}
                  </a>
                ) : (
                  <div key={`${p.user}-${i}`}>{card}</div>
                );
              });
            })()}
          </div>
        )}
        {effectiveTab === "reddit" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {redditItems.map((rv, i) => {
              const sub = rv.subreddit ?? subredditFromUrl(rv.source_url);
              const meta = REDDIT_SENTIMENT_META[rv.sentiment as string];
              const skinEmoji = rv.skin_type ? SKIN_TYPE_PILL[String(rv.skin_type).toLowerCase()] : undefined;
              const card = (
                <div style={{ background: "white", border: `0.5px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    {sub ? (
                      <span style={{ fontSize: 9, fontWeight: 700, color: CRIMSON, textTransform: "uppercase", letterSpacing: "0.06em" }}>r/{sub}</span>
                    ) : <span />}
                    {meta && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, display: "inline-block" }} />
                        <span style={{ fontSize: 10, color: meta.color }}>{meta.label}</span>
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: ESPRESSO, lineHeight: 1.55, marginTop: 6 }}>{rv.content}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
                    {skinEmoji ? (
                      <span style={{ fontSize: 10, background: "#F5EFEC", color: "#5F5E5A", borderRadius: 999, padding: "2px 8px" }}>
                        {skinEmoji} {String(rv.skin_type).charAt(0).toUpperCase() + String(rv.skin_type).slice(1)}
                      </span>
                    ) : <span />}
                    <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#999" }}>
                      View on Reddit <ExternalLink width={10} height={10} />
                    </span>
                  </div>
                </div>
              );
              return (
                <a key={`${rv.source_url ?? rv.id}-${i}`} href={rv.source_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  {card}
                </a>
              );
            })}
            {redditItems.length > 0 && (
              <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>
                {redditItems.length} {redditItems.length === 1 ? "quote" : "quotes"} pulled from Reddit threads. Unedited.
              </div>
            )}
          </div>
        )}
      </Section>
      )}

      </Section>

      {/* 10. Confidence strip */}
      <div style={{ padding: "14px 16px", background: WARM_WHITE, border: `0.5px solid ${BORDER}`, borderRadius: 10, margin: "12px 16px 8px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ background: CRIMSON, color: WARM_WHITE, fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 20 }}>{confidence}</span>
        <span style={{ fontSize: 11, color: MUTED, lineHeight: 1.4 }}>Based on 1,200+ posts across TikTok, Instagram, and Reddit</span>
      </div>
      </>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", background: ESPRESSO, color: WARM_WHITE, padding: "10px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600, zIndex: 100, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          {toast}
        </div>
      )}

      {activeTikTokEmbed && (
        <div
          onClick={() => setActiveTikTokEmbed(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 340, width: "100%", maxHeight: "85vh", overflowY: "auto", borderRadius: 12, background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 8px 0" }}>
              <button
                onClick={() => setActiveTikTokEmbed(null)}
                style={{ background: "transparent", border: "none", fontSize: 20, color: "#1C0A00", cursor: "pointer", padding: 4, lineHeight: 1 }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <blockquote
              className="tiktok-embed"
              cite={activeTikTokEmbed}
              data-video-id={extractTikTokVideoId(activeTikTokEmbed) ?? undefined}
              style={{ maxWidth: 325, minWidth: 260, margin: "0 auto" }}
            >
              <section></section>
            </blockquote>
          </div>
        </div>
      )}

      {/* 11. Bottom action bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: WARM_WHITE, borderTop: `0.5px solid ${BORDER}`, padding: "12px 16px 24px", zIndex: 60, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <ActionBtn icon="🧴" label={isInShelf ? "On Shelf" : "Add to Shelf"} onClick={handleShelfClick} active={isInShelf} disabled={shelving} />
        <ActionBtn icon="🎁" label={isInGift ? "On Gift Me" : "Gift Me"} onClick={handleGiftClick} active={isInGift} disabled={gifting} />
        <ActionBtn icon="🔖" label={isSaved ? "Saved" : "Save"} onClick={handleSaveToggle} active={isSaved} disabled={saving} />
      </div>
    </main>
  );
}

function ActionBtn({ icon, label, onClick, active, disabled }: { icon: string; label: string; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 4px", background: active ? ESPRESSO : "transparent", color: active ? WARM_WHITE : ESPRESSO, border: active ? "none" : `0.5px solid ${BORDER}`, borderRadius: 10, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1, fontFamily: "inherit" }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function TeaTab({
  posts, filter, setFilter, userSkinType, userId, productId, onPostAdded, navigate,
}: {
  posts: any[];
  filter: string;
  setFilter: (f: string) => void;
  userSkinType: string | null;
  userId: string | null;
  productId: string;
  onPostAdded: () => void;
  navigate: any;
}) {
  const [showForm, setShowForm] = useState(false);
  const [formHeadline, setFormHeadline] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formVerdict, setFormVerdict] = useState("");
  const [formDuration, setFormDuration] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const CHARS: Record<string, { emoji: string; name: string }> = {
    oily: { emoji: "🧈", name: "The Butter Girl" },
    dry: { emoji: "🫙", name: "The Cracker" },
    combination: { emoji: "🥯", name: "The Everything Bagel" },
    normal: { emoji: "🥛", name: "The Glass of Milk" },
    sensitive: { emoji: "🍑", name: "The Peach" },
  };
  const TYPE_LABEL: Record<string, string> = {
    oily: "Oily skin", dry: "Dry skin", combination: "Combination skin",
    normal: "Normal skin", sensitive: "Sensitive skin",
  };
  const VERDICTS = ["Repurchased", "Would buy again", "On the fence", "Wouldn't repurchase"];
  const skinTypes = ["oily", "sensitive", "combination", "normal", "dry"];
  const filtered = filter === "all" ? posts : posts.filter((p) => p.skin_type === filter);

  function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 86400) return "today";
    if (diff < 172800) return "yesterday";
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    if (diff < 2592000) return `${Math.floor(diff / 604800)} weeks ago`;
    return `${Math.floor(diff / 2592000)} months ago`;
  }

  async function handleSubmit() {
    if (!userId) { navigate({ to: "/login" }); return; }
    if (!formBody.trim()) return;
    setSubmitting(true);
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("username, avatar_url, skin_type")
      .eq("user_id", userId)
      .maybeSingle();
    await (supabase as any).from("product_posts").insert({
      product_id: productId,
      user_id: userId,
      username: profile?.username ?? null,
      avatar_url: profile?.avatar_url ?? null,
      skin_type: profile?.skin_type ?? userSkinType ?? null,
      headline: formHeadline.trim() || null,
      body: formBody.trim(),
      verdict: formVerdict || null,
      usage_duration: formDuration.trim() || null,
      photo_urls: [],
      agree_count: 0,
    });
    setSubmitting(false);
    setShowForm(false);
    setFormHeadline(""); setFormBody(""); setFormVerdict(""); setFormDuration("");
    onPostAdded();
  }

  return (
    <div>
      <div style={{ padding: "12px 16px", borderBottom: `0.5px solid #E8DDD4`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "#999999" }}>{posts.length} posts about this product</span>
        <button
          onClick={() => (userId ? setShowForm(true) : navigate({ to: "/login" }))}
          style={{ background: "#1C0A00", color: "#FFFCF8", border: "none", borderRadius: 20, padding: "7px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}
        >
          + Post tea
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, padding: "10px 16px", borderBottom: `0.5px solid #E8DDD4`, overflowX: "auto" }}>
        {["all", ...skinTypes].map((f) => {
          const active = filter === f;
          const ch = f !== "all" ? CHARS[f] : null;
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              flex: "none", background: active ? "#1C0A00" : "transparent",
              color: active ? "#FFFCF8" : "#1C0A00",
              border: `0.5px solid ${active ? "#1C0A00" : "#E8DDD4"}`,
              borderRadius: 20, padding: "6px 12px", fontSize: 11,
              fontWeight: active ? 700 : 400, cursor: "pointer", fontFamily: "inherit",
            }}>
              {f === "all" ? "All" : `${ch?.emoji} ${ch?.name?.split(" ")[1] ?? f}`}
            </button>
          );
        })}
      </div>

      {showForm && (
        <div style={{ padding: 16, borderBottom: `0.5px solid #E8DDD4`, background: "#FFFCF8" }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#A8001C", marginBottom: 12 }}>Post your tea</div>
          <input placeholder="Headline (optional)" value={formHeadline} onChange={(e) => setFormHeadline(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", border: `0.5px solid #E8DDD4`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", marginBottom: 8, boxSizing: "border-box", background: "white", color: "#1C0A00" }} />
          <textarea placeholder="What's the tea? Be honest — the good and the bad." value={formBody} onChange={(e) => setFormBody(e.target.value)} rows={4}
            style={{ width: "100%", padding: "9px 12px", border: `0.5px solid #E8DDD4`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", marginBottom: 8, boxSizing: "border-box", resize: "none", background: "white", color: "#1C0A00" }} />
          <input placeholder="How long have you used it? (e.g. 3 months)" value={formDuration} onChange={(e) => setFormDuration(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", border: `0.5px solid #E8DDD4`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", marginBottom: 8, boxSizing: "border-box", background: "white", color: "#1C0A00" }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {VERDICTS.map((v) => (
              <button key={v} onClick={() => setFormVerdict(v === formVerdict ? "" : v)} style={{
                background: formVerdict === v ? "#FEE8EC" : "transparent",
                color: formVerdict === v ? "#A8001C" : "#555",
                border: `0.5px solid ${formVerdict === v ? "#A8001C" : "#E8DDD4"}`,
                borderRadius: 20, padding: "5px 11px", fontSize: 11, fontWeight: formVerdict === v ? 700 : 400,
                cursor: "pointer", fontFamily: "inherit",
              }}>{v}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: "10px", background: "transparent", border: `0.5px solid #E8DDD4`, borderRadius: 10, fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: "#999999" }}>Cancel</button>
            <button onClick={handleSubmit} disabled={!formBody.trim() || submitting} style={{ flex: 2, padding: "10px", background: "#A8001C", color: "#FFFCF8", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: !formBody.trim() ? 0.5 : 1 }}>
              {submitting ? "Posting…" : "Post tea"}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ padding: "40px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#999999" }}>No posts yet{filter !== "all" ? " for this skin type" : ""}.</div>
          <div style={{ fontSize: 12, color: "#C8BDB8", marginTop: 4 }}>Be the first to post your tea.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {filtered.map((post) => {
            const ch = post.skin_type ? CHARS[post.skin_type] : null;
            const isUserType = userSkinType && post.skin_type === userSkinType;
            const initials = (post.username ?? "U").replace("@", "").slice(0, 2).toUpperCase();
            return (
              <div key={post.id} style={{ padding: "14px 16px", borderBottom: `0.5px solid #E8DDD4` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  {post.avatar_url ? (
                    <img src={post.avatar_url} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#E8DDD4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#999999", flexShrink: 0 }}>{initials}</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1C0A00" }}>
                        {post.username ? `@${post.username}` : "Anonymous"}
                      </span>
                      {ch && (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 3,
                          background: isUserType ? "#FEE8EC" : "#F5EFEC",
                          color: isUserType ? "#A8001C" : "#555555",
                          fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                        }}>
                          {ch.emoji} {ch.name}
                        </span>
                      )}
                      {post.skin_type && (
                        <span style={{ fontSize: 9, color: "#bbbbbb", fontWeight: 400 }}>
                          {TYPE_LABEL[post.skin_type]}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: "#999999", marginTop: 3 }}>
                      {formatDate(post.created_at)}{post.usage_duration ? ` · ${post.usage_duration}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: post.agree_count > 10 ? "#A8001C" : "#999999", fontWeight: post.agree_count > 10 ? 600 : 400, flexShrink: 0 }}>
                    🔥 {post.agree_count}
                  </div>
                </div>
                {post.photo_urls && post.photo_urls.length > 0 && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: post.photo_urls.length === 1 ? "1fr" : "repeat(3, minmax(0, 1fr))",
                    gap: 3, marginBottom: 10, borderRadius: 8, overflow: "hidden",
                  }}>
                    {post.photo_urls.slice(0, 3).map((url: string, i: number) => (
                      <div key={i} style={{ position: "relative", aspectRatio: "1", overflow: "hidden" }}>
                        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        {i === 2 && post.photo_urls.length > 3 && (
                          <div style={{ position: "absolute", inset: 0, background: "rgba(28,10,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ color: "#FFFCF8", fontSize: 13, fontWeight: 700 }}>+{post.photo_urls.length - 3}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {post.headline && (
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1C0A00", marginBottom: 4, lineHeight: 1.3 }}>{post.headline}</div>
                )}
                <div style={{ fontSize: 12, color: "#444444", lineHeight: 1.6 }}>{post.body}</div>
                {post.verdict && (
                  <div style={{ marginTop: 8 }}>
                    <span style={{ fontSize: 10, background: "#FEE8EC", color: "#A8001C", padding: "3px 9px", borderRadius: 20, fontWeight: 600 }}>{post.verdict}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
