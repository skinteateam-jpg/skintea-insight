import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Heart, MessageCircle, Play, Share2, ArrowUpCircle, ExternalLink, ChevronDown, Pencil, Bookmark, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ProductChat } from "@/components/ProductChat";
import BottomNav from "@/components/BottomNav";

export const Route = createFileRoute("/product-detail")({
  component: ProductPage,
  head: () => ({
    meta: [
      { title: "CeraVe Moisturizing Cream — Skintea" },
      {
        name: "description",
        content:
          "Real opinions on CeraVe Moisturizing Cream from TikTok, Instagram and Reddit, summarized by AI.",
      },
    ],
  }),
});

const product = {
  name: "Moisturizing Cream",
  brand: "CeraVe",
  category: "Moisturizer",
  tagline: "Daily face and body cream for normal to dry skin, with ceramides and hyaluronic acid.",
};

const tiktoks = [
  { user: "@skinwithliv", views: "1.2M", likes: "184K", caption: "My HG winter moisturizer for 3 years straight 🧴" },
  { user: "@dermdoctor", views: "890K", likes: "92K", caption: "Why dermatologists keep recommending this one." },
  { user: "@glowby.mei", views: "430K", likes: "61K", caption: "Drugstore vs luxury — this beats them all." },
  { user: "@routine.daily", views: "210K", likes: "27K", caption: "Day 30 of using only CeraVe — results." },
];

const instagrams = [
  { user: "skincare.notes", likes: "12.4K", caption: "Texture check: thick but melts in. Zero pilling." },
  { user: "thatcleangirl", likes: "8.9K", caption: "My winter barrier reset routine ✨" },
  { user: "derm.maria", likes: "21.1K", caption: "Ceramides 1, 3 and 6-II — here's why that matters." },
];

const ageRatings = [
  { label: "Teens", sub: "13–19", value: 72 },
  { label: "20s", sub: "20–29", value: 88 },
  { label: "30s", sub: "30–39", value: 94 },
  { label: "40s", sub: "40–49", value: 91 },
  { label: "50s+", sub: "50 and up", value: 84 },
];

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

const affiliates = [
  { name: "Sephora", url: "https://www.sephora.com" },
  { name: "Amazon", url: "https://www.amazon.com" },
  { name: "Ulta", url: "https://www.ulta.com" },
  { name: "LTK", url: "https://www.shopltk.com" },
  { name: "Rakuten", url: "https://www.rakuten.com" },
];

const reddits = [
  { sub: "r/SkincareAddiction", up: "2.4k", title: "CeraVe Moisturizing Cream finally fixed my barrier", comments: 312 },
  { sub: "r/30PlusSkinCare", up: "1.1k", title: "Mature skin review after 6 months of daily use", comments: 184 },
  { sub: "r/AsianBeauty", up: "684", title: "Layering CeraVe under sunscreen — pilling thoughts?", comments: 97 },
  { sub: "r/Skincare_Addiction", up: "512", title: "Unpopular: it broke me out. Anyone else?", comments: 246 },
];

function ProductPage() {
  const [tab, setTab] = useState("tiktok");
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { from?: string; postId?: string } | undefined;
  const fromPost = search?.from === "post";
  const fromPostId = search?.postId;
  const [userSkinType, setUserSkinType] = useState<string | null>(null);
  useEffect(() => {
    setUserSkinType(localStorage.getItem("skintea_skin_type") || null);
  }, []);

  function getIngredientStyle(ing: { name: string; match: Record<string, "good" | "watch" | "neutral"> }) {
    if (!userSkinType) return { background: "#FFFCF8", color: "#1C0A00", border: "none" };
    const status = ing.match[userSkinType] || "neutral";
    if (status === "good") return { background: "#F0FAF1", color: "#2D7A3A", border: "0.5px solid #2D7A3A", fontWeight: 600 };
    if (status === "watch") return { background: "#FFFCF8", color: "#1C0A00", border: "0.5px solid #E8DDD4", fontWeight: 500 };
    return { background: "#FFFCF8", color: "#999999", border: "none" };
  }

  return (
    <main className="min-h-screen" style={{ paddingBottom: "80px", background: "#FFFCF8" }}>
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-20">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <button
            onClick={() => {
              if (fromPost && fromPostId) {
                navigate({ to: "/tea-products/$postId", params: { postId: fromPostId } });
              } else {
                navigate({ to: "/products" });
              }
            }}
            aria-label="Back"
            style={{ background: "transparent", border: "none", color: "#1C0A00", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, padding: 0 }}
          >
            <ArrowLeft size={16} />
            <span>{fromPost ? "Back to post" : "Products"}</span>
          </button>
          <div style={{ textAlign: "right" }}>
            <Link to="/" style={{ textDecoration: "none", display: "block", lineHeight: 1 }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 22, color: "#1C0A00" }}>Skin</span>
              <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 22, color: "#A8001C" }}>tea</span>
            </Link>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#999999", marginTop: 3 }}>
              Got Skintea? Spill it.
            </div>
          </div>
        </div>
        {/* Header */}
        <header style={{ marginBottom: 0, paddingBottom: 20, borderBottom: "0.5px solid #E8DDD4" }}>
          <div style={{ width: "100%", height: 180, background: "#FFFCF8", border: "0.5px solid #E8DDD4", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <div style={{ width: 56, height: 76, background: "#E8DDD4", borderRadius: 8 }} />
          </div>
          <div style={{ fontSize: 10, color: "#A8001C", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>
            <span style={{ color: "#A8001C" }}>{product.brand} · {product.category}</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1C0A00", lineHeight: 1.1, marginBottom: 6, marginTop: 4 }}>
            {product.name}
          </h1>
          <p style={{ fontSize: 12, color: "#999", lineHeight: 1.6, marginBottom: 14 }}>
            {product.tagline}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {affiliates.map((a, i) => (
              <a
                key={a.name}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 13px",
                  borderRadius: 99,
                  fontSize: 11,
                  fontWeight: 700,
                  textDecoration: "none",
                  background: i === 0 ? "#1C0A00" : "transparent",
                  color: i === 0 ? "#FFFCF8" : "#1C0A00",
                  border: i === 0 ? "none" : "0.5px solid #E8DDD4",
                }}
              >
                {a.name} <ExternalLink width={10} height={10} />
              </a>
            ))}
          </div>
        </header>

        {/* Content Aggregation */}
        <section className="mb-16">
          <h2 style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#999", marginBottom: 14 }}>
            What people are saying
          </h2>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-6 grid w-full grid-cols-3 rounded-full bg-secondary p-1">
              <TabsTrigger value="tiktok" className="rounded-full">TikTok</TabsTrigger>
              <TabsTrigger value="instagram" className="rounded-full">Instagram</TabsTrigger>
              <TabsTrigger value="reddit" className="rounded-full">Reddit</TabsTrigger>
            </TabsList>

            <TabsContent value="tiktok">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {tiktoks.map((t) => (
                  <div key={t.user} style={{ background: "#1a2620", borderRadius: 12, overflow: "hidden", aspectRatio: "9/14", position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                    <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%, -50%)", width: 36, height: 36, background: "rgba(255,255,255,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Play width={14} height={14} color="#fff" fill="#fff" />
                    </div>
                    <div style={{ padding: "8px 10px 10px", background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{t.user}</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.75)", lineHeight: 1.35, marginBottom: 5, overflow: "hidden", WebkitLineClamp: 2, display: "-webkit-box", WebkitBoxOrient: "vertical" }}>{t.caption}</div>
                      <div style={{ display: "flex", gap: 10, fontSize: 9, color: "rgba(255,255,255,0.6)" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Play width={9} height={9} /> {t.views}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Heart width={9} height={9} /> {t.likes}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="instagram">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {instagrams.map((p) => (
                  <div key={p.user} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ width: 44, height: 44, background: "#FFFCF8", border: "0.5px solid #E8DDD4", borderRadius: 8, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#1C0A00", marginBottom: 2 }}>@{p.user}</div>
                      <div style={{ fontSize: 11, color: "#999", lineHeight: 1.4, marginBottom: 4, WebkitLineClamp: 2, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.caption}</div>
                      <div style={{ display: "flex", gap: 12, fontSize: 10, color: "#bbb", alignItems: "center" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Heart width={10} height={10} /> {p.likes}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Share2 width={10} height={10} /></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="reddit">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {reddits.map((r) => (
                  <div key={r.title} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
                      <ArrowUpCircle width={14} height={14} color="#A8001C" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#1C0A00" }}>{r.up}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#A8001C", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{r.sub}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1C0A00", lineHeight: 1.4, marginBottom: 4 }}>{r.title}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#bbb" }}>
                        <MessageCircle width={10} height={10} /> {r.comments} comments
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* AI Summary */}
        <section className="mb-16">
          <h2 style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#999", marginBottom: 14 }}>
            Summary
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <OpinionCard
              label="Majority"
              percent={78}
              barColor="#A8001C"
              sentence="Strengthens the skin barrier within a few weeks."
            />
            <OpinionCard
              label="Minority"
              percent={22}
              barColor="#C8BDB8"
              sentence="Feels heavy and may pill under sunscreen."
            />
          </div>
          <div className="mt-3 rounded-xl px-4 py-3" style={{ background: "#FFFCF8" }}>
            <p className="text-xs font-medium text-muted-foreground">Why opinions differ</p>
            <p className="mt-1 text-sm text-foreground">
              Skin type and climate shape the experience more than the formula itself.
            </p>
          </div>
        </section>

        {/* Fit Summary */}
        <section className="mb-16">
          <h2 style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#999", marginBottom: 14 }}>
            Is it for you?
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <FitCard
              variant="yes"
              title="YES — works well"
              items={[
                { label: "Dry skin", strength: 3 },
                { label: "Sensitive skin", strength: 3 },
                { label: "Compromised barrier", strength: 2 },
                { label: "Eczema-prone", strength: 2 },
              ]}
            />
            <FitCard
              variant="skip"
              title="SKIP — may not work"
              items={[
                { label: "Very oily skin", strength: 3 },
                { label: "Acne-prone (fungal)", strength: 3 },
                { label: "Humid climates", strength: 1 },
                { label: "Dislikes rich textures", strength: 2 },
              ]}
            />
          </div>
          <div style={{ display: "flex", gap: "16px", marginTop: "12px", fontSize: "11px", color: "#999" }}>
            <LegendItem strength={3} label="Strong match" />
            <LegendItem strength={2} label="Moderate" />
            <LegendItem strength={1} label="Mild" />
          </div>
        </section>

        <ProductChat />

        {/* Ratings by Age */}
        <section className="mb-16">
          <h2 style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#999", marginBottom: 14 }}>
            Ratings by Age
          </h2>
          <Card className="p-6 shadow-sm">
            <div className="space-y-5">
              {ageRatings.map((a) => (
                <div key={a.label}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-foreground">{a.label}</span>
                      <span className="text-xs text-muted-foreground">{a.sub}</span>
                    </div>
                    <span className="text-sm font-medium" style={{ color: "#A8001C" }}>{a.value}%</span>
                  </div>
                  <Progress value={a.value} className="h-2 [&>div]:bg-[#1C0A00]" style={{ background: "#FFFCF8" }} />
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* Key Ingredients */}
        <section className="mb-16">
          <div className="mb-5 flex items-center justify-between">
            <h2 style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#999", margin: 0 }}>
              Key Ingredients
            </h2>
            {userSkinType && (
              <span style={{ fontSize: "11px", background: "#FEF2F2", border: "0.5px solid #A8001C", color: "#A8001C", borderRadius: "20px", padding: "3px 10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {userSkinType} skin active
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {keyIngredients.map((ing) => (
              <Badge
                key={ing.name}
                variant="secondary"
                className="rounded-full px-3 py-1.5 text-sm font-medium"
                style={getIngredientStyle(ing)}
              >
                {ing.name}
              </Badge>
            ))}
          </div>
          {userSkinType && (
            <div style={{ marginTop: "12px", background: "#F0FAF1", border: "0.5px solid #2D7A3A", borderRadius: "10px", padding: "10px 14px" }}>
              <p style={{ margin: 0, fontSize: "12px", color: "#1C0A00" }}>
                <span style={{ color: "#2D7A3A", fontWeight: 600 }}>Green = great for your skin.</span> <span style={{ color: "#999999" }}>Neutral = worth knowing about.</span>
              </p>
            </div>
          )}
          <Collapsible open={showAllIngredients} onOpenChange={setShowAllIngredients} className="mt-5">
            <CollapsibleTrigger className="flex items-center gap-1.5 text-sm font-medium transition hover:opacity-70" style={{ color: "#A8001C" }}>
              {showAllIngredients ? "Hide" : "Full ingredient list"}
              <ChevronDown className={`h-4 w-4 transition-transform ${showAllIngredients ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <Card className="p-5 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  {fullIngredients.map((ing) => (
                    <span
                      key={ing.name}
                      style={{ ...getIngredientStyle(ing), fontSize: "12px", borderRadius: "4px", padding: "3px 8px", display: "inline-block" }}
                    >
                      {ing.name}
                    </span>
                  ))}
                </div>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </section>

        {/* Confidence */}
        <section className="border-t border-border pt-10">
          <h2 style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#999", marginBottom: 14 }}>
            Confidence Level
          </h2>
          <div className="flex flex-col items-start gap-2">
            <Badge className="rounded-full px-4 py-1.5 text-sm font-medium" style={{ background: "#A8001C", color: "#FFFFFF" }}>
              High
            </Badge>
            <p className="text-sm text-muted-foreground">
              Based on 1,200+ posts and consistent sentiment across all three platforms over the past 12 months.
            </p>
          </div>
        </section>
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#FFFCF8",
          borderTop: "1px solid #E8DDD4",
          padding: "12px 20px",
          display: "flex",
          gap: "12px",
          zIndex: 50,
        }}
      >
        <button
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            background: "#A8001C",
            color: "white",
            borderRadius: "10px",
            fontSize: "15px",
            fontWeight: 700,
            padding: "13px",
            border: "none",
            cursor: "pointer",
          }}
        >
          ✏️ Spill the tea
        </button>
        <button
          aria-label="Save"
          style={{
            width: "46px",
            height: "46px",
            background: "#fff",
            border: "1px solid #E8DDD4",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#1C0A00",
            cursor: "pointer",
          }}
        >
          <Bookmark style={{ width: "20px", height: "20px" }} />
        </button>
      </div>
      <BottomNav />
    </main>
  );
}

function OpinionCard({
  label,
  percent,
  barColor,
  sentence,
}: {
  label: string;
  percent: number;
  barColor: string;
  sentence: string;
}) {
  return (
    <Card className="border border-border bg-background p-5 shadow-none">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="mt-2 text-4xl font-bold tracking-tight text-foreground">{percent}%</div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full" style={{ width: `${percent}%`, background: barColor }} />
      </div>
      <p className="mt-4 text-sm text-foreground">{sentence}</p>
    </Card>
  );
}

function Dots({
  strength,
  color,
}: {
  strength: number;
  color: "yes" | "skip" | "grey";
}) {
  const fill = color === "yes" ? "#2D7A3A" : color === "skip" ? "#A8001C" : "#E8DDD4";
  return (
    <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            display: "inline-block",
            background: i <= strength ? fill : "#E8DDD4",
            border: "none",
          }}
        />
      ))}
    </div>
  );
}

function FitCard({
  variant,
  title,
  items,
}: {
  variant: "yes" | "skip";
  title: string;
  items: { label: string; strength: number }[];
}) {
  const labelColor = variant === "yes" ? "#2D7A3A" : "#A8001C";
  return (
    <div
      style={{
        background: "white",
        border: "0.5px solid #E8DDD4",
        borderRadius: "12px",
        padding: "16px 20px",
      }}
    >
      <div
        style={{
          color: labelColor,
          fontSize: "12px",
          fontWeight: 500,
          marginBottom: "12px",
        }}
      >
        {title}
      </div>
      {items.map((it) => (
        <div
          key={it.label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <span style={{ fontSize: "13px", color: "#333333" }}>{it.label}</span>
          <Dots strength={it.strength} color={variant} />
        </div>
      ))}
    </div>
  );
}

function LegendItem({ strength, label }: { strength: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <Dots strength={strength} color="grey" />
      <span>{label}</span>
    </div>
  );
}
