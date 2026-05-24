import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Heart, MessageCircle, Play, Share2, ArrowUpCircle, ExternalLink, ChevronDown, Pencil, Bookmark, ArrowLeft } from "lucide-react";
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
  const userSkinType = typeof window !== "undefined" ? localStorage.getItem("skintea_skin_type") || null : null;

  function getIngredientStyle(ing: { name: string; match: Record<string, "good" | "watch" | "neutral"> }) {
    if (!userSkinType) return { background: "#FFFCF8", color: "#1C0A00", border: "none" };
    const status = ing.match[userSkinType] || "neutral";
    if (status === "good") return { background: "#FEF2F2", color: "#A8001C", border: "1px solid #A8001C", fontWeight: 600 };
    if (status === "watch") return { background: "#FFFBEB", color: "#92400E", border: "1px solid #D97706", fontWeight: 500 };
    return { background: "#FFFCF8", color: "#1C0A00", border: "none" };
  }

  return (
    <main className="min-h-screen" style={{ paddingBottom: "80px", background: "#FFFCF8" }}>
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-20">
        <button
          onClick={() => {
            if (fromPost && fromPostId) {
              navigate({ to: "/tea-products/$postId", params: { postId: fromPostId } });
            } else {
              navigate({ to: "/products" });
            }
          }}
          aria-label="Back"
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            background: "transparent",
            border: "none",
            color: "#1C0A00",
            cursor: "pointer",
            padding: 8,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={20} />
          <span>{fromPost ? "Back to post" : "Products"}</span>
        </button>
        {/* Header */}
        <header className="mb-14 grid gap-8 sm:grid-cols-[240px_1fr] sm:items-start">
          <div className="aspect-square w-full overflow-hidden rounded-2xl shadow-sm" style={{ background: "#FFFCF8" }}>
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-32 w-20 rounded-md bg-background/70 shadow-inner sm:h-40 sm:w-24" />
            </div>
          </div>
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium tracking-wide" style={{ color: "#A8001C" }}>{product.brand}</span>
              <span>·</span>
              <span>{product.category}</span>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {product.name}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {product.tagline}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {affiliates.map((a, i) => (
                <Button
                  key={a.name}
                  asChild
                  variant={i === 0 ? "default" : "outline"}
                  className="rounded-full px-5"
                  style={
                    i === 0
                      ? { background: "#1C0A00", color: "#FFFFFF", border: "none" }
                      : { background: "transparent", color: "#1C0A00", border: "1px solid #E8DDD4" }
                  }
                >
                  <a href={a.url} target="_blank" rel="noopener noreferrer">
                    {a.name} <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              ))}
            </div>
          </div>
        </header>

        {/* Content Aggregation */}
        <section className="mb-16">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            What people are saying
          </h2>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-6 grid w-full grid-cols-3 rounded-full bg-secondary p-1">
              <TabsTrigger value="tiktok" className="rounded-full">TikTok</TabsTrigger>
              <TabsTrigger value="instagram" className="rounded-full">Instagram</TabsTrigger>
              <TabsTrigger value="reddit" className="rounded-full">Reddit</TabsTrigger>
            </TabsList>

            <TabsContent value="tiktok">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {tiktoks.map((t) => (
                  <Card
                    key={t.user}
                    className="group relative aspect-[9/14] overflow-hidden border-0 bg-gradient-to-br from-foreground to-foreground/70 p-0 shadow-sm"
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background/20 backdrop-blur transition group-hover:scale-110">
                        <Play className="h-5 w-5 fill-background text-background" />
                      </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 space-y-1 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <p className="text-xs font-medium text-white">{t.user}</p>
                      <p className="line-clamp-2 text-[11px] leading-snug text-white/80">{t.caption}</p>
                      <div className="flex items-center gap-3 pt-1 text-[10px] text-white/70">
                        <span className="flex items-center gap-1"><Play className="h-3 w-3" /> {t.views}</span>
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {t.likes}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="instagram">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {instagrams.map((p) => (
                  <Card key={p.user} className="overflow-hidden p-0 shadow-sm">
                    <div className="aspect-square" style={{ background: "#FFFCF8" }} />
                    <div className="space-y-2 p-3">
                      <p className="text-xs font-semibold text-foreground">@{p.user}</p>
                      <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">{p.caption}</p>
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {p.likes}</span>
                        <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /></span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="reddit">
              <div className="space-y-3">
                {reddits.map((r) => (
                  <Card key={r.title} className="flex items-start gap-3 p-4 shadow-sm">
                    <div className="flex flex-col items-center text-muted-foreground">
                      <ArrowUpCircle className="h-4 w-4" style={{ color: "#1C0A00" }} />
                      <span className="text-xs font-semibold text-foreground">{r.up}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium" style={{ color: "#A8001C" }}>{r.sub}</p>
                      <p className="mt-1 text-sm font-medium leading-snug text-foreground">{r.title}</p>
                      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageCircle className="h-3 w-3" /> {r.comments} comments
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* AI Summary */}
        <section className="mb-16">
          <h2 className="mb-5 text-base font-semibold tracking-tight text-foreground">
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
          <h2 className="mb-5 text-base font-semibold tracking-tight text-foreground">
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
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
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
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
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
            <div style={{ marginTop: "12px", background: "#FEF2F2", border: "0.5px solid #FCA5A5", borderRadius: "10px", padding: "10px 14px" }}>
              <p style={{ margin: 0, fontSize: "12px", color: "#7F1D1D" }}>
                <span style={{ color: "#A8001C", fontWeight: 600 }}>Crimson = great for your skin.</span> Amber = worth knowing about.
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
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
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
  const fill = color === "yes" ? "#2D7A3A" : color === "skip" ? "#A8001C" : "#999999";
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
        border: "0.5px solid #e5e5e5",
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
