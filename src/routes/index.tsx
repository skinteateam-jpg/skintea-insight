import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Heart, MessageCircle, Play, Share2, ArrowUpCircle, ExternalLink, ChevronDown } from "lucide-react";
import { ProductChat } from "@/components/ProductChat";

export const Route = createFileRoute("/")({
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
  { label: "10代", sub: "Teens", value: 72 },
  { label: "20代", sub: "20s", value: 88 },
  { label: "30代", sub: "30s", value: 94 },
  { label: "40代", sub: "40s", value: 91 },
  { label: "50代+", sub: "50s+", value: 84 },
];

const keyIngredients = [
  "Ceramide NP",
  "Ceramide AP",
  "Ceramide EOP",
  "Hyaluronic Acid",
  "Niacinamide",
  "Cholesterol",
  "Phytosphingosine",
];

const fullIngredients = [
  "Purified Water", "Glycerin", "Caprylic/Capric Triglyceride", "Cetearyl Alcohol",
  "Ceramide NP", "Ceramide AP", "Ceramide EOP", "Carbomer", "Dimethicone",
  "Behentrimonium Methosulfate", "Sodium Hyaluronate", "Cholesterol", "Phenoxyethanol",
  "Disodium EDTA", "Phytosphingosine", "Tocopherol", "Niacinamide", "Xanthan Gum",
  "Polyglyceryl-3 Diisostearate", "Sodium Lauroyl Lactylate", "Ethylhexylglycerin",
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

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-20">
        {/* Header */}
        <header className="mb-14 grid gap-8 sm:grid-cols-[240px_1fr] sm:items-start">
          <div className="aspect-square w-full overflow-hidden rounded-2xl bg-gradient-to-br from-tea-cream via-accent to-tea-sage/40 shadow-sm">
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-32 w-20 rounded-md bg-background/70 shadow-inner sm:h-40 sm:w-24" />
            </div>
          </div>
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium tracking-wide text-tea-leaf">{product.brand}</span>
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
                  className={
                    i === 0
                      ? "rounded-full bg-tea-leaf px-5 text-primary-foreground hover:bg-tea-leaf/90"
                      : "rounded-full border-border px-5 text-foreground hover:bg-secondary"
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
                    <div className="aspect-square bg-gradient-to-br from-tea-cream via-accent to-tea-sage/40" />
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
                      <ArrowUpCircle className="h-4 w-4 text-tea-warning" />
                      <span className="text-xs font-semibold text-foreground">{r.up}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-tea-leaf">{r.sub}</p>
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
              barClass="bg-tea-leaf"
              sentence="Strengthens the skin barrier within a few weeks."
            />
            <OpinionCard
              label="Minority"
              percent={22}
              barClass="bg-tea-danger"
              sentence="Feels heavy and may pill under sunscreen."
            />
          </div>
          <div className="mt-3 rounded-xl bg-secondary px-4 py-3">
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
          <div className="grid grid-cols-2 gap-3">
            <FitCard
              variant="yes"
              title="YES — works well"
              items={[
                { label: "Dry skin", strength: 3 },
                { label: "Sensitive skin", strength: 3 },
                { label: "Compromised barrier", strength: 3 },
                { label: "Eczema-prone", strength: 2 },
                { label: "Cold/dry climates", strength: 2 },
              ]}
            />
            <FitCard
              variant="skip"
              title="SKIP — may not work"
              items={[
                { label: "Very oily skin", strength: 3 },
                { label: "Fungal acne-prone", strength: 3 },
                { label: "Humid climates", strength: 2 },
                { label: "Dislikes rich textures", strength: 2 },
                { label: "Layering under silicone SPF", strength: 1 },
              ]}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
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
                    <span className="text-sm font-medium text-tea-leaf">{a.value}%</span>
                  </div>
                  <Progress value={a.value} className="h-2 bg-secondary" />
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* Key Ingredients */}
        <section className="mb-16">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Key Ingredients
          </h2>
          <div className="flex flex-wrap gap-2">
            {keyIngredients.map((ing) => (
              <Badge
                key={ing}
                variant="secondary"
                className="rounded-full bg-tea-sage/30 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-tea-sage/40"
              >
                {ing}
              </Badge>
            ))}
          </div>
          <Collapsible open={showAllIngredients} onOpenChange={setShowAllIngredients} className="mt-5">
            <CollapsibleTrigger className="flex items-center gap-1.5 text-sm font-medium text-tea-leaf transition hover:opacity-70">
              {showAllIngredients ? "Hide" : "Full ingredient list"}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showAllIngredients ? "rotate-180" : ""}`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <Card className="p-5 shadow-sm">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {fullIngredients.join(", ")}.
                </p>
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
            <Badge className="rounded-full bg-tea-leaf px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-tea-leaf">
              High
            </Badge>
            <p className="text-sm text-muted-foreground">
              Based on 1,200+ posts and consistent sentiment across all three platforms over the past 12 months.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function OpinionCard({
  label,
  percent,
  barClass,
  sentence,
}: {
  label: string;
  percent: number;
  barClass: string;
  sentence: string;
}) {
  return (
    <Card className="border border-border bg-background p-5 shadow-none">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="mt-2 text-4xl font-bold tracking-tight text-foreground">{percent}%</div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className={`h-full ${barClass}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-4 text-sm text-foreground">{sentence}</p>
    </Card>
  );
}

function Dots({ strength, color }: { strength: number; color: "yes" | "skip" }) {
  const filledClass = color === "yes" ? "bg-tea-leaf" : "bg-tea-danger";
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${
            i <= strength ? filledClass : "border border-border bg-transparent"
          }`}
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
  const labelClass =
    variant === "yes"
      ? "bg-tea-sage/40 text-tea-leaf"
      : "bg-tea-danger/15 text-tea-danger";
  return (
    <Card className="border border-border bg-background p-5 shadow-none">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${labelClass}`}
      >
        {title}
      </span>
      <ul className="mt-4 space-y-3">
        {items.map((it) => (
          <li key={it.label} className="flex items-center justify-between gap-3">
            <span className="text-sm text-foreground">{it.label}</span>
            <Dots strength={it.strength} color={variant} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function LegendItem({ strength, label }: { strength: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Dots strength={strength} color="yes" />
      <span>{label}</span>
    </div>
  );
}
