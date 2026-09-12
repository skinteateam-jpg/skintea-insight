import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ReactNode, ComponentType } from "react";
import { Play, ExternalLink, ArrowLeft, Gift, Bookmark, Layers, ChevronDown, ChevronUp } from "lucide-react";
import AppFrame from "@/components/AppFrame";
import { supabase } from "@/integrations/supabase/client";
import { getFlags, isFungalAcneSafe, hasIngredientData, readSkinType } from "@/lib/ingredientFlags";
import type { SkinType } from "@/lib/ingredientFlags";

const DISCLOSURE_LABELS: Record<string, string> = {
  ad: "#ad",
  sponsored: "Sponsored",
  gifted: "Gifted",
  pr_sample: "PR sample",
  brand_program: "Brand program",
  brand_owned: "Brand account",
  states_no_ad: "States no ad",
};

const MAKEUP_CATEGORIES = new Set(["Face", "Cheek", "Eye", "Lip"]);

const SECTION_LABEL_CLS = "text-[9px] font-bold uppercase tracking-[0.14em] text-brand-crimson";

const SKIN_CHARACTERS: Record<string, { name: string }> = {
  oily: { name: "The Butter Girl" },
  dry: { name: "The Peach" },
  combination: { name: "The Everything Bagel" },
  sensitive: { name: "The Glass of Milk" },
  normal: { name: "The Cracker" },
};

const SKIN_ORDER = ["oily", "sensitive", "combination", "normal", "dry"] as const;

const AGE_ORDER: { key: string; label: string; sub: string }[] = [
  { key: "teens", label: "Teens", sub: "13–19" },
  { key: "20s", label: "20s", sub: "20–29" },
  { key: "30s", label: "30s", sub: "30–39" },
  { key: "40s", label: "40s", sub: "40–49" },
  { key: "50s+", label: "50s+", sub: "50 and up" },
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
    <div className="p-4 border-b border-brand-border">
      <div className="flex items-center justify-between mb-3">
        <div className={SECTION_LABEL_CLS}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function DataPending({ children }: { children: ReactNode }) {
  return (
    <div className="border border-dashed border-brand-border rounded-[10px] px-[13px] py-3 bg-brand-cream">
      <div className="text-[10px] font-semibold text-brand-muted mb-[5px]">Not enough data yet</div>
      <div className="text-[11.5px] text-brand-muted leading-[1.55]">{children}</div>
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

const STORE_LINKS = [
  { name: "Amazon", url: "https://www.amazon.com" },
  { name: "Sephora", url: "https://www.sephora.com" },
  { name: "Ulta", url: "https://www.ulta.com" },
  { name: "YesStyle", url: "https://www.yesstyle.com" },
];

const CONFIDENCE_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

// Carousels show display rows only. Rows with any other source_query_type are tagged
// opinions (Reddit threads, TikTok product searches, Instagram comments) and must never
// render as a video or reel tile.
const isDisplayRow = (r: any) => r.source_query_type === "display_candidate";

const REDDIT_SENTIMENT_META: Record<string, { cls: string; label: string }> = {
  positive: { cls: "text-emerald-700", label: "Positive" },
  negative: { cls: "text-brand-crimson", label: "Negative" },
  mixed: { cls: "text-brand-muted", label: "Mixed" },
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

function formatViewCount(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1_000_000) {
    const formatted = (value / 1_000_000).toFixed(1).replace(/\.0$/, "");
    return `${formatted}M`;
  }
  if (value >= 1_000) {
    const formatted = (value / 1_000).toFixed(1).replace(/\.0$/, "");
    return `${formatted}K`;
  }
  return `${value}`;
}

function ProductPage() {
  const { id } = Route.useParams();
  const [pageTab, setPageTab] = useState<"product" | "tea">("product");
  const [teaPosts, setTeaPosts] = useState<any[]>([]);
  const [teaFilter, setTeaFilter] = useState<string>("all");
  const [, setTeaLoading] = useState(false);

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
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const [tab, setTab] = useState<"tiktok" | "instagram" | "reddit">("tiktok");
  const [skinType, setSkinType] = useState<SkinType | null>(null);

  useEffect(() => {
    setSkinType(readSkinType());
  }, []);

  useEffect(() => {
    if (!productData) return;
    const orFilter = productData.product_family_name
      ? `product_id.eq.${id},product_family_name.eq.${productData.product_family_name}`
      : `product_id.eq.${id}`;
    let query = (supabase as any)
      .from("social_review_tags")
      .select("*");
    if (productData.brand) {
      query = query.eq("brand", productData.brand);
    }
    query.or(orFilter).then(({ data }: any) => setSocialReviews(data ?? []));
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
    const urls = socialReviews.filter((r) => r.platform === "tiktok" && isDisplayRow(r) && r.source_url).map((r) => r.source_url as string);
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
        .select("id,name,brand,category,subcategory,product_type,description,image_url,image_urls,product_url,price,currency,skintea_score,product_family_name,shade_name,ingredients,key_ingredients")
        .eq("id", id)
        .single();
      if (!cancelled) {
        setProductData(data);
        setActiveProduct(data);
        if (data?.product_family_name && data?.brand) {
          const { data: siblings } = await supabase
            .from("products")
            .select("id,name,brand,category,subcategory,product_type,description,image_url,image_urls,product_url,price,currency,skintea_score,product_family_name,shade_name,ingredients,key_ingredients")
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

  const autoTabbedFor = useRef<string | null>(null);
  useEffect(() => {
    if (autoTabbedFor.current === id) return;
    if (socialReviews.length === 0) return;
    autoTabbedFor.current = id;
    const counts = {
      // Auto-tab counts display rows only (approved 2026-09-12; still raw, not deduped).
      tiktok: socialReviews.filter((r) => r.platform === "tiktok" && isDisplayRow(r)).length,
      instagram: socialReviews.filter((r) => r.platform === "instagram" && isDisplayRow(r)).length,
      reddit: socialReviews.filter((r) => r.platform === "reddit" && ["positive", "negative", "mixed"].includes(r.sentiment)).length,
    };
    const best = (["tiktok", "instagram", "reddit"] as const).reduce(
      (a, b) => (counts[b] > counts[a] ? b : a),
      "tiktok" as const,
    );
    if (counts[best] > 0) setTab(best);
  }, [id, socialReviews]);



  if (loading) {
    return (
      <AppFrame fluid>
        <main className="min-h-screen bg-brand-cream flex items-center justify-center">
          <p className="text-xs text-brand-muted">Loading…</p>
        </main>
      </AppFrame>
    );
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
      if (!error) { setIsInShelf(true); showToast("Added to your shelf"); }
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
      const cat = productData?.category ?? "";
      const type = MAKEUP_CATEGORIES.has(cat) ? "makeup" : "skincare";
      const { error } = await (supabase as any).from("gift_wishlist").insert({
        user_id: userId,
        product_id: id,
        product_name: productData?.name ?? "Product",
        brand: productData?.brand ?? null,
        category: productData?.subcategory ?? null,
        emoji: null,
        image_url: productData?.image_url ?? null,
        affiliate_url: productData?.product_url ?? null,
        type,
        is_public: true,
      });
      if (!error) { setIsInGift(true); showToast("Added to Gift Me"); }
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
      if (!error) { setIsSaved(true); showToast("Saved! View in your profile"); }
    } else {
      const { error } = await (supabase as any).from("saved_products").delete().eq("user_id", userId).eq("product_id", id);
      if (!error) { setIsSaved(false); showToast("Removed from saved"); }
    }
    setSaving(false);
  }

  const skinTypePct: Record<string, number | null> = {};
  for (const st of SKIN_ORDER) {
    const rows = socialReviews.filter(
      (r) => String(r.skin_type).toLowerCase() === st && (r.sentiment === "positive" || r.sentiment === "negative")
    );
    if (rows.length < 10) { skinTypePct[st] = null; continue; }
    const pos = rows.filter((r) => r.sentiment === "positive").length;
    skinTypePct[st] = Math.round((pos / rows.length) * 100);
  }
  const anySkinPct = SKIN_ORDER.some((st) => skinTypePct[st] !== null);
  const ageBracketPct: Record<string, number | null> = {};
  for (const a of AGE_ORDER) {
    const rows = socialReviews.filter(
      (r) => String(r.age_bracket).toLowerCase() === a.key && (r.sentiment === "positive" || r.sentiment === "negative")
    );
    if (rows.length < 10) { ageBracketPct[a.key] = null; continue; }
    const pos = rows.filter((r) => r.sentiment === "positive").length;
    ageBracketPct[a.key] = Math.round((pos / rows.length) * 100);
  }
  const anyAgePct = AGE_ORDER.some((a) => ageBracketPct[a.key] !== null);

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
  const majorityPct = sentimentTotal > 0 ? Math.round((majorityCount / sentimentTotal) * 100) : 0;
  const minorityPct = 100 - majorityPct;
  const recommendPct = sentimentTotal > 0 ? Math.round((posCount / sentimentTotal) * 100) : null;
  const confidence = sentimentTotal >= 50 ? "High" : sentimentTotal >= 10 ? "Medium" : "Low";
  function topQuote(sentiment: string) {
    const matches = taggedReviews.filter((r) => r.sentiment === sentiment).sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    return matches[0]?.content ?? null;
  }
  const majorityQuote = topQuote(majorityIsPositive ? "positive" : "negative");
  const minorityQuote = topQuote(majorityIsPositive ? "negative" : "positive");

  const redditItems = (() => {
    const rows = socialReviews.filter(
      (r) => r.platform === "reddit" && ["positive", "negative", "mixed"].includes(r.sentiment),
    );
    const sorted = rows.sort((a, b) => {
      const ra = CONFIDENCE_RANK[String(a.confidence ?? "").toLowerCase()] ?? 0;
      const rb = CONFIDENCE_RANK[String(b.confidence ?? "").toLowerCase()] ?? 0;
      if (rb !== ra) return rb - ra;
      return new Date(b.tagged_at ?? 0).getTime() - new Date(a.tagged_at ?? 0).getTime();
    });
    const byQuote = new Map<string, any>();
    for (const r of sorted) {
      const raw = r.content;
      const key = raw && typeof raw === "string" && raw.trim().length > 0 ? raw.trim().toLowerCase() : r.id;
      if (!byQuote.has(key)) byQuote.set(key, r);
    }
    return Array.from(byQuote.values()).slice(0, 8);
  })();

  const tiktokRows = socialReviews.filter((r) => r.platform === "tiktok" && isDisplayRow(r));
  const instagramRows = socialReviews.filter((r) => r.platform === "instagram" && isDisplayRow(r));
  const instagramRowsDeduped = (() => {
    const map = new Map<string, typeof instagramRows[number]>();
    for (const r of instagramRows) {
      const key = r.source_url ?? r.id;
      const existing = map.get(key);
      if (!existing || (r.views ?? 0) > (existing.views ?? 0)) {
        map.set(key, r);
      }
    }
    return Array.from(map.values()).sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
  })();




  return (
    <AppFrame fluid>
      <main className="min-h-screen bg-brand-cream pt-[52px] pb-[120px]">
        {/* 1. Sticky top bar */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-brand-cream border-b border-brand-border">
          <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8 py-3 flex items-center justify-between">
            <button onClick={backTo} aria-label="Back" className="bg-transparent border-none p-0 text-brand-espresso cursor-pointer flex items-center gap-1.5 text-[13px] font-medium">
              <ArrowLeft size={16} />
              <span>{fromPost ? "Back" : "Products"}</span>
            </button>
            <Link to="/" className="no-underline leading-none">
              <span className="italic font-bold text-xl text-brand-espresso" style={{ fontFamily: "'Playfair Display', serif" }}>Skin</span>
              <span className="italic font-bold text-xl text-brand-crimson" style={{ fontFamily: "'Playfair Display', serif" }}>tea</span>
            </Link>
            <div className="w-10" />
          </div>
        </div>

        {/* 2. Product hero */}
        <div className="w-full relative">
          {(() => {
            const galleryImages = Array.isArray(activeProduct?.image_urls) && activeProduct.image_urls.length > 0
              ? activeProduct.image_urls.filter((u: any) => typeof u === "string" && u)
              : activeProduct?.image_url
              ? [activeProduct.image_url]
              : [];
            const showGallery = galleryImages.length > 1;
            return (
              <div className="w-full bg-brand-cream border-b border-brand-border flex items-center justify-center min-h-[260px] overflow-hidden relative">
                {galleryImages.length === 0 ? (
                  <div className="w-[100px] h-[140px] rounded-xl bg-brand-border" />
                ) : showGallery ? (
                  <div
                    key={activeProduct?.id}
                    onScroll={(e) => {
                      const el = e.currentTarget;
                      const idx = Math.round(el.scrollLeft / el.clientWidth);
                      setHeroIndex(idx);
                    }}
                    className="flex w-full min-h-[260px] overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {galleryImages.map((src: string, idx: number) => (
                      <div key={idx} className="w-full flex-[0_0_100%] snap-start flex items-center justify-center min-h-[260px]">
                        <img src={src} alt={`${activeProduct?.name ?? ""} ${idx + 1}`} className="block max-h-[240px] max-w-[80%] object-contain" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <img src={galleryImages[0]} alt={activeProduct?.name ?? ""} className="block max-h-[240px] max-w-[80%] object-contain" />
                )}
                {showGallery && (
                  <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5 z-10">
                    {galleryImages.map((_: string, idx: number) => (
                      <div
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full ${idx === heroIndex ? "bg-brand-crimson" : "bg-brand-espresso/25"}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
          <div className="bg-brand-cream px-4 pt-3.5 pb-4 border-b border-brand-border">
            <div className="text-[11px] font-medium text-brand-muted mb-1">
              {activeProduct?.brand}{activeProduct?.category ? ` · ${activeProduct.category}` : ""}
            </div>
            <div className="text-xl font-semibold text-brand-espresso leading-[1.25]">
              {activeProduct?.name}
            </div>
            {(activeProduct?.product_type || activeProduct?.subcategory) && (
              <div className="text-xs text-brand-muted mt-1">{activeProduct.product_type || activeProduct.subcategory}</div>
            )}
            {shadeOptions.length > 1 && (
              <div className="flex gap-2 mt-2.5 overflow-x-auto pb-0.5">
                {shadeOptions.map((shade) => {
                  const selected = shade.id === activeProduct?.id;
                  return (
                    <button
                      key={shade.id}
                      onClick={() => setActiveProduct(shade)}
                      className={`flex-none bg-transparent rounded-[20px] px-3 py-[5px] text-[11px] cursor-pointer whitespace-nowrap border font-[inherit] ${
                        selected
                          ? "border-brand-crimson text-brand-crimson font-semibold"
                          : "border-brand-espresso text-brand-espresso font-medium"
                      }`}
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
        <div className="flex border-b border-brand-border bg-brand-cream">
          {(["product", "tea"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setPageTab(t)}
              className={`flex-1 py-[11px] bg-transparent border-none cursor-pointer font-[inherit] text-[13px] border-b-2 ${
                pageTab === t
                  ? "border-brand-crimson text-brand-espresso font-semibold"
                  : "border-transparent text-brand-muted font-medium"
              }`}
            >
              {t === "product" ? "Product" : (
                <span>Tea {teaPosts.length > 0 && <span className="text-[10px] text-brand-crimson font-semibold ml-[3px]">{teaPosts.length}</span>}</span>
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
        <div className="flex border-b border-brand-border">
          {[
            { val: hasEnoughSentimentData && recommendPct !== null ? `${recommendPct}%` : "—", label: "Recommend" },
            { val: `${sentimentTotal}`, label: "Tagged opinions" },
            { val: confidence, label: "Confidence" },
          ].map((s, i, arr) => (
            <div key={s.label} className={`flex-1 py-[13px] text-center ${i < arr.length - 1 ? "border-r border-brand-border" : ""}`}>
              <div className="text-[19px] font-semibold text-brand-espresso">{s.val}</div>
              <div className="text-[10px] text-brand-muted mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 4. Price + buy links */}
        <div className="px-3.5 py-2.5 border-b border-brand-border flex items-center gap-2 overflow-x-auto">
          <span className="text-sm font-semibold text-brand-espresso flex-none">
            {activeProduct?.price ? `$${activeProduct.price}` : "—"}
          </span>
          <span className="text-brand-muted flex-none">·</span>
          {activeProduct?.product_url && (
            <a href={activeProduct.product_url} target="_blank" rel="noopener noreferrer" className="flex-none bg-brand-espresso text-brand-cream rounded-[20px] px-[13px] py-1.5 text-[11px] font-semibold flex items-center gap-1 no-underline">
              Shop <ExternalLink width={10} height={10} />
            </a>
          )}
          {STORE_LINKS.map((s) => (
            <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className="flex-none bg-transparent text-brand-espresso border border-brand-border rounded-[20px] px-[13px] py-1.5 text-[11px] flex items-center gap-1 no-underline">
              {s.name} <ExternalLink width={10} height={10} />
            </a>
          ))}
        </div>

        {/* 5. What people say */}
        <Section title="What people say">
          {hasEnoughSentimentData ? (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: majorityIsPositive ? "Recommend" : "Don't recommend", pct: majorityPct, barCls: "bg-brand-crimson", sentence: majorityQuote ?? "Based on tagged social posts." },
                  { label: majorityIsPositive ? "Don't recommend" : "Recommend", pct: minorityPct, barCls: "bg-brand-border", sentence: minorityQuote ?? "Based on tagged social posts." },
                ].map((c) => (
                  <div key={c.label} className="bg-card border border-brand-border rounded-xl p-3.5">
                    <div className="text-[11px] text-brand-muted mb-1">{c.label}</div>
                    <div className="text-3xl font-semibold text-brand-espresso leading-none">{c.pct}%</div>
                    <div className="h-[3px] bg-brand-border rounded-sm my-2 overflow-hidden">
                      <div className={`h-full ${c.barCls}`} style={{ width: `${c.pct}%` }} />
                    </div>
                    <div className="text-xs text-brand-espresso leading-[1.5]">{c.sentence}</div>
                  </div>
                ))}
              </div>
              <div className="bg-brand-cream border border-brand-border rounded-[10px] px-[13px] py-2.5 mt-2.5">
                <div className="text-[10px] text-brand-muted font-semibold">Sample size</div>
                <div className="text-xs text-brand-espresso leading-[1.55] mt-1">Based on {sentimentTotal} tagged social posts{mixedCount > 0 ? ` (${mixedCount} mixed)` : ""}. Early data — treat as directional, not definitive.</div>
              </div>
            </>
          ) : (
            <div className="bg-brand-cream border border-brand-border rounded-[10px] px-[13px] py-3.5">
              <div className="text-xs text-brand-espresso leading-[1.55]">Not enough tagged social data yet for this product. Check back soon — we're actively collecting real reviews from TikTok, Instagram, and Reddit.</div>
            </div>
          )}
        </Section>

        {/* 6. Works for you */}
        <Section title="Works for you">
          <div className="text-[11px] text-brand-muted mb-3 pl-[11px]">Skin type</div>
          {SKIN_ORDER.map((key) => {
            const c = SKIN_CHARACTERS[key];
            const pct = skinTypePct[key];
            const has = pct !== null && pct !== undefined;
            const me = userSkinType === key;
            if (me) {
              return (
                <div key={key} className={`bg-brand-crimson/5 border border-brand-crimson rounded-[10px] px-3 py-2.5 mb-2 ${has ? "" : "opacity-55"}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 text-brand-crimson font-semibold text-[13px]">
                      <span>{c.name} <span className="font-normal text-[11px] text-brand-crimson/70">({SKIN_TYPE_LABEL[key]})</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-brand-crimson text-brand-cream text-[10px] px-2 py-0.5 rounded-[20px] font-medium">You</span>
                      <span className="text-brand-crimson font-semibold text-[13px]">{has ? `${pct}%` : "—"}</span>
                    </div>
                  </div>
                  <div className="h-1 bg-brand-crimson/10 rounded-[3px] overflow-hidden">
                    <div className="h-full bg-brand-crimson" style={{ width: `${has ? pct : 0}%` }} />
                  </div>
                </div>
              );
            }
            return (
              <div key={key} className={`px-3 py-2 ${has ? "" : "opacity-55"}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-brand-espresso text-xs">
                    <span>{c.name} <span className="font-normal text-[11px] text-brand-muted">({SKIN_TYPE_LABEL[key]})</span></span>
                  </div>
                  <span className="text-brand-muted text-xs">{has ? `${pct}%` : "—"}</span>
                </div>
                <div className="h-1 bg-brand-border rounded-[3px] overflow-hidden">
                  <div className="h-full bg-brand-espresso/25" style={{ width: `${has ? pct : 0}%` }} />
                </div>
              </div>
            );
          })}
          {!anySkinPct && (
            <div className="mt-2.5">
              <DataPending>This will show the % of people with each skin type who recommend this product. Needs at least 10 tagged posts per skin type — we're still collecting.</DataPending>
            </div>
          )}
          <div className="h-px bg-brand-border my-4" />
          <div className="text-[11px] text-brand-muted mb-3">Age group</div>
          {AGE_ORDER.map((a) => {
            const pct = ageBracketPct[a.key];
            const has = pct !== null && pct !== undefined;
            const me = userAgeBracket === a.key;
            if (me) {
              return (
                <div key={a.key} className={`bg-brand-crimson/5 border border-brand-crimson rounded-[10px] px-3 py-2.5 mb-2 ${has ? "" : "opacity-55"}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-brand-crimson font-semibold text-[13px]">{a.label} <span className="text-brand-crimson font-normal text-[11px] ml-1">{a.sub}</span></div>
                    <div className="flex items-center gap-2">
                      <span className="bg-brand-crimson text-brand-cream text-[10px] px-2 py-0.5 rounded-[20px] font-medium">You</span>
                      <span className="text-brand-crimson font-semibold text-[13px]">{has ? `${pct}%` : "—"}</span>
                    </div>
                  </div>
                  <div className="h-1 bg-brand-crimson/10 rounded-[3px] overflow-hidden">
                    <div className="h-full bg-brand-crimson" style={{ width: `${has ? pct : 0}%` }} />
                  </div>
                </div>
              );
            }
            return (
              <div key={a.key} className={`px-3 py-2 ${has ? "" : "opacity-55"}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-brand-espresso text-xs">{a.label} <span className="text-brand-muted text-[11px] ml-1">{a.sub}</span></div>
                  <span className="text-brand-muted text-xs">{has ? `${pct}%` : "—"}</span>
                </div>
                <div className="h-1 bg-brand-border rounded-[3px] overflow-hidden">
                  <div className="h-full bg-brand-espresso/25" style={{ width: `${has ? pct : 0}%` }} />
                </div>
              </div>
            );
          })}
          {!anyAgePct && (
            <div className="mt-2.5">
              <DataPending>This will show recommend rates by age group. Needs at least 10 tagged posts per age group — we're still collecting.</DataPending>
            </div>
          )}
        </Section>

        {/* 7. Is it for you? */}
        <Section title="Is it for you?">
          <div className="grid grid-cols-2 gap-2.5">
            {([
              { variant: "yes" as const, header: "Yes — works well", body: "Who this works for — pending enough tagged reviews." },
              { variant: "skip" as const, header: "Skip — may not work", body: "Who should skip it — pending enough tagged reviews." },
            ]).map((card) => (
              <div key={card.variant} className="bg-card border border-brand-border rounded-xl p-3.5">
                <div className={`text-[11px] font-semibold mb-2.5 ${card.variant === "yes" ? "text-emerald-700" : "text-brand-crimson"}`}>{card.header}</div>
                <div className="text-[11.5px] text-brand-muted leading-[1.55]">{card.body}</div>
              </div>
            ))}
          </div>
          <div className="mt-2.5">
            <DataPending>This will summarize who this product works for and who should skip it, generated from tagged skin-type sentiment.</DataPending>
          </div>
        </Section>

        {/* 7b. For your skin type — ingredient flags */}
        {hasIngredientData(activeProduct?.ingredients) && (() => {
          const ingredients = activeProduct!.ingredients as string[];
          const fungalSafe = isFungalAcneSafe(ingredients);
          const flags = skinType ? getFlags(ingredients, skinType) : [];
          const fungalBadge = fungalSafe === null ? null : (
            <span className={`inline-block text-[11px] font-semibold px-3 py-[5px] rounded-[20px] border ${
              fungalSafe
                ? "bg-emerald-50 text-emerald-700 border-emerald-700"
                : "bg-muted text-brand-muted border-brand-border"
            }`}>
              {fungalSafe ? "Fungal-acne safe" : "Not fungal-acne safe"}
            </span>
          );
          return (
            <Section
              title={skinType ? "For your skin type" : "Ingredients and your skin"}
              right={skinType ? (
                <span className="text-[11px] font-semibold text-brand-espresso">{skinType.charAt(0).toUpperCase() + skinType.slice(1)}</span>
              ) : undefined}
            >
              {!skinType && (
                <Link to="/quiz" className="no-underline">
                  <div className="bg-brand-cream border border-brand-border rounded-[10px] px-[13px] py-3 mb-2.5">
                    <div className="text-xs text-brand-espresso leading-[1.55]">
                      Take the 2-minute quiz to see which of these ingredients suit your skin
                    </div>
                    <div className="text-[11px] font-semibold text-brand-crimson mt-1.5">Take the quiz →</div>
                  </div>
                </Link>
              )}
              {skinType && flags.map((f) => {
                const isRed = f.verdict === "red";
                return (
                  <div key={f.label} className={`rounded-[10px] px-[13px] py-2.5 mb-2 border ${
                    isRed ? "bg-brand-crimson/5 border-brand-crimson" : "bg-emerald-50 border-emerald-700"
                  }`}>
                    <div className={`text-xs font-semibold mb-1.5 ${isRed ? "text-brand-crimson" : "text-emerald-700"}`}>
                      {f.label}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {f.matched.map((ing) => (
                        <span key={ing} className={`bg-brand-cream text-[11px] px-2.5 py-[3px] rounded-[20px] border ${
                          isRed ? "text-brand-crimson border-brand-crimson" : "text-emerald-700 border-emerald-700"
                        }`}>{ing}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
              {fungalBadge && <div className={skinType ? "mt-0.5" : ""}>{fungalBadge}</div>}
              <div className="text-[10px] text-brand-muted italic mt-2.5">
                Based on the ingredient list. Separate from the review percentages above.
              </div>
            </Section>
          );
        })()}

        {/* 8. Key ingredients */}
        <Section title="Key ingredients">
          {(() => {
            const keyList = ((activeProduct?.key_ingredients ?? []).filter((x: any) => typeof x === "string" && x.trim().length > 0) as string[]);
            const fullList = ((activeProduct?.ingredients ?? []).filter((x: any) => typeof x === "string" && x.trim().length > 0) as string[]);
            if (keyList.length === 0 && fullList.length === 0) {
              return <DataPending>This will show the full ingredient list, flagged green or red against your skin type. Ingredient data hasn't been added to the catalog yet.</DataPending>;
            }
            return (
              <div>
                {keyList.length > 0 && (
                  <div className={`flex flex-wrap gap-[7px] ${fullList.length > 0 ? "mb-2.5" : ""}`}>
                    {keyList.map((ing) => (
                      <span key={ing} className="bg-brand-cream text-brand-muted border border-brand-border text-xs px-3 py-[5px] rounded-[20px]">{ing}</span>
                    ))}
                  </div>
                )}
                {fullList.length > 0 && (
                  <>
                    <button
                      onClick={() => setShowAllIngredients((v) => !v)}
                      className="bg-transparent border-none p-0 text-brand-crimson text-xs font-semibold cursor-pointer font-[inherit] inline-flex items-center gap-1"
                    >
                      Full ingredient list {showAllIngredients ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {showAllIngredients && (
                      <div className="text-xs text-brand-espresso leading-[1.7] mt-2">
                        {fullList.join(", ")}
                      </div>
                    )}
                  </>
                )}
                <div className="text-[10px] text-brand-muted mt-2.5">Skin-type flagging coming once ingredient matching is built.</div>
              </div>
            );
          })()}
        </Section>

        {/* 9. What people are saying */}
        <Section title="What people are saying">
          <div className="flex">
            {(["tiktok", "instagram", "reddit"] as const).map((t) => {
              const count = t === "tiktok" ? tiktokRows.length : t === "instagram" ? instagramRowsDeduped.length : redditItems.length;
              const active = tab === t;
              const label = t === "tiktok" ? "TikTok" : t === "instagram" ? "Instagram" : "Reddit";
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 bg-transparent border-none border-b-2 py-2.5 text-xs cursor-pointer font-[inherit] ${
                    active ? "border-brand-crimson text-brand-espresso font-semibold" : "border-transparent text-brand-muted font-medium"
                  }`}
                >
                  <span>{label}</span>
                  {count > 0 && (
                    <span className="text-[10px] text-brand-crimson font-semibold ml-1">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="border-b border-brand-border" />
          <div className="mt-3">
            {tab === "tiktok" && (
              tiktokRows.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {(() => {
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
                      views: formatViewCount(r.views),
                      likes: r.likes ? `${r.likes}` : "—",
                      caption: r.content ?? "",
                      source_url: (r.source_url ?? null) as string | null,
                    }));

                    return list.map((t, i) => {
                      const thumb = t.source_url ? tiktokThumbnails[t.source_url] : undefined;
                      const card = (
                        <div className="rounded-xl overflow-hidden aspect-[9/16] relative" style={{ background: thumb ? `#1a2620 url(${thumb}) center/cover no-repeat` : "#1a2620" }}>
                          <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                            <Play width={14} height={14} color="#fff" fill="#fff" />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2 bg-gradient-to-t from-black/85 to-transparent">
                            <div className="text-[11px] font-semibold text-white">{t.user}</div>
                            <div className="text-[9px] text-white/70 mt-0.5 leading-[1.3] overflow-hidden line-clamp-2">{t.caption}</div>
                            <div className="text-[9px] text-white/50 mt-[3px]">{t.views} views</div>
                          </div>
                        </div>
                      );
                      return t.source_url ? (
                        <button
                          key={`${t.user}-${i}`}
                          onClick={() => setActiveTikTokEmbed(t.source_url)}
                          className="no-underline border-none p-0 bg-none cursor-pointer block w-full"
                        >
                          {card}
                        </button>
                      ) : (
                        <div key={`${t.user}-${i}`}>{card}</div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <DataPending>No TikTok videos collected for this product yet. We're still gathering them.</DataPending>
              )
            )}
            {tab === "instagram" && (
              instagramRowsDeduped.length > 0 ? (
                <div>
                  <div className="flex flex-row gap-2 overflow-x-auto snap-x snap-mandatory pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {instagramRowsDeduped.map((r) => {
                      const thumbUrl = r.thumbnail_path
                        ? supabase.storage.from("social-thumbnails").getPublicUrl(r.thumbnail_path).data.publicUrl
                        : null;
                      const card = (
                        <div className="rounded-xl overflow-hidden aspect-[9/16] relative" style={{ background: thumbUrl ? `#1a2620 url(${thumbUrl}) center/cover no-repeat` : "#1a2620" }}>
                          <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                            <Play width={14} height={14} color="#fff" fill="#fff" />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2 bg-gradient-to-t from-black/85 to-transparent">
                            {Array.isArray(r.disclosure) && r.disclosure.length > 0 && (
                              <div className="flex flex-wrap gap-[3px] mb-1">
                                {r.disclosure.map((d: string) => (
                                  <span key={d} className="text-[8px] font-medium text-white bg-white/20 rounded-[3px] px-[5px] py-0.5 whitespace-nowrap">
                                    {DISCLOSURE_LABELS[d] ?? d}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="text-[11px] font-semibold text-white">{r.author_handle ?? "@user"}</div>
                            <div className="text-[9px] text-white/70 mt-0.5 leading-[1.3] overflow-hidden line-clamp-2">{r.content ?? ""}</div>
                            <div className="text-[9px] text-white/50 mt-[3px]">{formatViewCount(r.views)} views</div>
                          </div>
                        </div>
                      );
                      return r.source_url ? (
                        <a key={r.id} href={r.source_url} target="_blank" rel="noopener noreferrer" className="flex-[0_0_150px] snap-start no-underline">
                          {card}
                        </a>
                      ) : (
                        <div key={r.id} className="flex-[0_0_150px] snap-start">
                          {card}
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-brand-muted mt-2.5 leading-[1.4]">
                    {instagramRowsDeduped.length} reel{instagramRowsDeduped.length === 1 ? "" : "s"} showing this product. Includes brand and creator content.
                  </div>
                </div>
              ) : (
                <DataPending>No Instagram reels collected for this product yet. We're still gathering them.</DataPending>
              )
            )}
            {tab === "reddit" && (
              redditItems.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {redditItems.map((rv) => {
                    const sub = rv.subreddit ?? subredditFromUrl(rv.source_url);
                    const meta = REDDIT_SENTIMENT_META[rv.sentiment as string];
                    const skinLabel = rv.skin_type ? String(rv.skin_type) : null;
                    const card = (
                      <div className="bg-card border border-brand-border rounded-[10px] px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          {sub ? (
                            <span className={SECTION_LABEL_CLS}>r/{sub}</span>
                          ) : <span />}
                          {meta && (
                            <span className={`flex items-center gap-1 ${meta.cls}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
                              <span className="text-[10px]">{meta.label}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-brand-espresso leading-[1.55] mt-1.5">{rv.content}</div>
                        <div className="flex items-center justify-between gap-2 mt-2">
                          {skinLabel ? (
                            <span className="text-[10px] bg-brand-cream text-brand-muted border border-brand-border rounded-full px-2 py-0.5">
                              {skinLabel.charAt(0).toUpperCase() + skinLabel.slice(1)}
                            </span>
                          ) : <span />}
                          <span className="flex items-center gap-[3px] text-[10px] text-brand-muted">
                            View on Reddit <ExternalLink width={10} height={10} />
                          </span>
                        </div>
                      </div>
                    );
                    return (
                      <a key={rv.id} href={rv.source_url} target="_blank" rel="noopener noreferrer" className="no-underline">
                        {card}
                      </a>
                    );
                  })}
                  <div className="text-[10px] text-brand-muted mt-0.5">
                    {redditItems.length} {redditItems.length === 1 ? "quote" : "quotes"} pulled from Reddit threads. Unedited.
                  </div>
                </div>
              ) : (
                <DataPending>No Reddit threads tagged for this product yet. We're still gathering them.</DataPending>
              )
            )}
          </div>
        </Section>

        {/* 10. Confidence strip */}
        {(tiktokRows.length + instagramRowsDeduped.length > 0 || sentimentTotal > 0) && (
        <div className="px-4 py-3.5 bg-brand-cream border border-brand-border rounded-[10px] mx-4 mt-3 mb-2 flex items-center gap-2.5">
          <span className="bg-brand-crimson text-brand-cream text-[11px] font-semibold px-3 py-[3px] rounded-[20px]">{confidence}</span>
          <span className="text-[11px] text-brand-muted leading-[1.4]">
            {tiktokRows.length + instagramRowsDeduped.length} TikTok and Instagram post{tiktokRows.length + instagramRowsDeduped.length === 1 ? "" : "s"} collected; {sentimentTotal} tagged opinion{sentimentTotal === 1 ? "" : "s"} from TikTok, Instagram, and Reddit
          </span>
        </div>
        )}
        </>
        )}

        {toast && (
          <div className="fixed bottom-[90px] left-1/2 -translate-x-1/2 bg-brand-espresso text-brand-cream px-4 py-2.5 rounded-full text-[13px] font-medium z-[100] whitespace-nowrap shadow-lg">
            {toast}
          </div>
        )}

        {activeTikTokEmbed && (
          <div
            onClick={() => setActiveTikTokEmbed(null)}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)" }}
          >
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[340px] max-h-[85vh] overflow-y-auto rounded-xl bg-card">
              <div className="flex justify-end pt-2 px-2">
                <button
                  onClick={() => setActiveTikTokEmbed(null)}
                  className="bg-transparent border-none text-xl text-brand-espresso cursor-pointer p-1 leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <blockquote
                className="tiktok-embed mx-auto"
                cite={activeTikTokEmbed}
                data-video-id={extractTikTokVideoId(activeTikTokEmbed) ?? undefined}
                style={{ maxWidth: 325, minWidth: 260 }}
              >
                <section></section>
              </blockquote>
            </div>
          </div>
        )}

        {/* 11. Bottom action bar */}
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-brand-cream border-t border-brand-border">
          <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8 pt-3 pb-6 grid grid-cols-3 gap-2">
            <ActionBtn Icon={Layers} label={isInShelf ? "On shelf" : "Add to shelf"} onClick={handleShelfClick} active={isInShelf} disabled={shelving} />
            <ActionBtn Icon={Gift} label={isInGift ? "On Gift Me" : "Gift Me"} onClick={handleGiftClick} active={isInGift} disabled={gifting} />
            <ActionBtn Icon={Bookmark} label={isSaved ? "Saved" : "Save"} onClick={handleSaveToggle} active={isSaved} disabled={saving} />
          </div>
        </div>
      </main>
    </AppFrame>
  );
}

function ActionBtn({ Icon, label, onClick, active, disabled }: { Icon: ComponentType<{ size?: number }>; label: string; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-[3px] px-1 py-2.5 rounded-[10px] text-[11px] font-semibold font-[inherit] ${
        active ? "bg-brand-espresso text-brand-cream border-none" : "bg-transparent text-brand-espresso border border-brand-border"
      } ${disabled ? "opacity-60 cursor-default" : "cursor-pointer"}`}
    >
      <Icon size={16} />
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

  const CHARS: Record<string, { name: string }> = {
    oily: { name: "The Butter Girl" },
    dry: { name: "The Peach" },
    combination: { name: "The Everything Bagel" },
    sensitive: { name: "The Glass of Milk" },
    normal: { name: "The Cracker" },
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
      <div className="px-4 py-3 border-b border-brand-border flex items-center justify-between">
        <span className="text-xs text-brand-muted">{posts.length} posts about this product</span>
        <button
          onClick={() => (userId ? setShowForm(true) : navigate({ to: "/login" }))}
          className="bg-brand-espresso text-brand-cream border-none rounded-[20px] px-3.5 py-[7px] text-[11px] font-semibold cursor-pointer font-[inherit] flex items-center gap-1"
        >
          Post tea
        </button>
      </div>

      <div className="flex gap-1.5 px-4 py-2.5 border-b border-brand-border overflow-x-auto">
        {["all", ...skinTypes].map((f) => {
          const active = filter === f;
          const ch = f !== "all" ? CHARS[f] : null;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-none rounded-[20px] px-3 py-1.5 text-[11px] cursor-pointer font-[inherit] border ${
                active
                  ? "bg-brand-espresso text-brand-cream border-brand-espresso font-semibold"
                  : "bg-transparent text-brand-espresso border-brand-border font-normal"
              }`}
            >
              {f === "all" ? "All" : (ch?.name?.split(" ").slice(1).join(" ") ?? f)}
            </button>
          );
        })}
      </div>

      {showForm && (
        <div className="p-4 border-b border-brand-border bg-brand-cream">
          <div className={`${SECTION_LABEL_CLS} mb-3`}>Post your tea</div>
          <input placeholder="Headline (optional)" value={formHeadline} onChange={(e) => setFormHeadline(e.target.value)}
            className="w-full px-3 py-[9px] border border-brand-border rounded-lg text-[13px] font-[inherit] mb-2 box-border bg-card text-brand-espresso" />
          <textarea placeholder="What's the tea? Be honest — the good and the bad." value={formBody} onChange={(e) => setFormBody(e.target.value)} rows={4}
            className="w-full px-3 py-[9px] border border-brand-border rounded-lg text-[13px] font-[inherit] mb-2 box-border resize-none bg-card text-brand-espresso" />
          <input placeholder="How long have you used it? (e.g. 3 months)" value={formDuration} onChange={(e) => setFormDuration(e.target.value)}
            className="w-full px-3 py-[9px] border border-brand-border rounded-lg text-[13px] font-[inherit] mb-2 box-border bg-card text-brand-espresso" />
          <div className="flex gap-1.5 flex-wrap mb-3">
            {VERDICTS.map((v) => (
              <button
                key={v}
                onClick={() => setFormVerdict(v === formVerdict ? "" : v)}
                className={`rounded-[20px] px-[11px] py-[5px] text-[11px] cursor-pointer font-[inherit] border ${
                  formVerdict === v
                    ? "bg-brand-crimson/10 text-brand-crimson border-brand-crimson font-semibold"
                    : "bg-transparent text-brand-espresso border-brand-border font-normal"
                }`}
              >{v}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 p-2.5 bg-transparent border border-brand-border rounded-[10px] text-[13px] cursor-pointer font-[inherit] text-brand-muted">Cancel</button>
            <button onClick={handleSubmit} disabled={!formBody.trim() || submitting} className={`flex-[2] p-2.5 bg-brand-crimson text-brand-cream border-none rounded-[10px] text-[13px] font-semibold cursor-pointer font-[inherit] ${!formBody.trim() ? "opacity-50" : ""}`}>
              {submitting ? "Posting…" : "Post tea"}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <div className="text-[13px] text-brand-muted">No posts yet{filter !== "all" ? " for this skin type" : ""}.</div>
          <div className="text-xs text-brand-muted mt-1">Be the first to post your tea.</div>
        </div>
      ) : (
        <div className="flex flex-col">
          {filtered.map((post) => {
            const ch = post.skin_type ? CHARS[post.skin_type] : null;
            const isUserType = userSkinType && post.skin_type === userSkinType;
            const initials = (post.username ?? "U").replace("@", "").slice(0, 2).toUpperCase();
            return (
              <div key={post.id} className="px-4 py-3.5 border-b border-brand-border">
                <div className="flex items-center gap-2.5 mb-2.5">
                  {post.avatar_url ? (
                    <img src={post.avatar_url} alt="" className="w-[38px] h-[38px] rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-[38px] h-[38px] rounded-full bg-brand-border flex items-center justify-center text-[13px] font-semibold text-brand-muted shrink-0">{initials}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[13px] font-semibold text-brand-espresso">
                        {post.username ? `@${post.username}` : "Anonymous"}
                      </span>
                      {ch && (
                        <span className={`inline-flex items-center gap-[3px] text-[10px] font-semibold px-[7px] py-0.5 rounded-[20px] ${
                          isUserType ? "bg-brand-crimson/10 text-brand-crimson" : "bg-brand-border text-brand-espresso"
                        }`}>
                          {ch.name}
                        </span>
                      )}
                      {post.skin_type && (
                        <span className="text-[9px] text-brand-muted font-normal">
                          {TYPE_LABEL[post.skin_type]}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-brand-muted mt-[3px]">
                      {formatDate(post.created_at)}{post.usage_duration ? ` · ${post.usage_duration}` : ""}
                    </div>
                  </div>
                  <div className={`flex items-center gap-[3px] text-[11px] shrink-0 ${post.agree_count > 10 ? "text-brand-crimson font-medium" : "text-brand-muted"}`}>
                    {post.agree_count} agree
                  </div>
                </div>
                {post.photo_urls && post.photo_urls.length > 0 && (
                  <div
                    className="grid gap-[3px] mb-2.5 rounded-lg overflow-hidden"
                    style={{ gridTemplateColumns: post.photo_urls.length === 1 ? "1fr" : "repeat(3, minmax(0, 1fr))" }}
                  >
                    {post.photo_urls.slice(0, 3).map((url: string, i: number) => (
                      <div key={i} className="relative aspect-square overflow-hidden">
                        <img src={url} alt="" className="w-full h-full object-cover block" />
                        {i === 2 && post.photo_urls.length > 3 && (
                          <div className="absolute inset-0 bg-brand-espresso/45 flex items-center justify-center">
                            <span className="text-brand-cream text-[13px] font-semibold">+{post.photo_urls.length - 3}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {post.headline && (
                  <div className="text-[13px] font-semibold text-brand-espresso mb-1 leading-[1.3]">{post.headline}</div>
                )}
                <div className="text-xs text-brand-espresso leading-[1.6]">{post.body}</div>
                {post.verdict && (
                  <div className="mt-2">
                    <span className="text-[10px] bg-brand-crimson/10 text-brand-crimson px-[9px] py-[3px] rounded-[20px] font-medium">{post.verdict}</span>
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
