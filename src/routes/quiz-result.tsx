import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Check, AlertTriangle, X, Sparkles, RotateCcw, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/quiz-result")({
  component: QuizResultPage,
  head: () => ({
    meta: [
      { title: "Your Skin Profile — Skintea" },
      {
        name: "description",
        content:
          "Your personalized skin profile, ingredient list, and product matches based on your Skintea quiz.",
      },
      { property: "og:title", content: "Your Skin Profile — Skintea" },
      {
        property: "og:description",
        content: "Personalized skincare insights powered by real user data.",
      },
    ],
  }),
});

// ---------- Brand tokens (match /products + /products/$id-v2) ----------
const C = {
  espresso: "#1C0A00",
  crimson: "#A8001C",
  bg: "#FAFAF8",
  surface: "#FFFFFF",
  border: "#EDEBE8",
  borderStrong: "#D4CFC8",
  textMid: "#5C4033",
  textLight: "#9E8070",
  imageBg: "#F5F0EB",
  good: "#0F7A4A",
  goodBg: "#E8F5EE",
  warn: "#A87400",
  warnBg: "#FBF1DC",
  bad: "#A8001C",
  badBg: "#FCE8EC",
};

// ---------- Placeholder result data ----------
const defaultResult = {
  skinType: "Oily",
  persona: {
    name: "The Glazed Donut",
    emoji: "🍩",
    tagline: "Shiny by 2pm, glowing by accident. We work with it, not against it.",
  },
  ethnicity: "East Asian", // from quiz; null if not provided
  concerns: ["Enlarged pores", "Occasional breakouts", "Sensitivity on cheeks"],
  summary: "Oily skin with sensitivity around the cheeks.",
  ingredients: {
    good: ["Niacinamide", "Salicylic acid", "Centella asiatica", "Zinc PCA", "Green tea", "Hyaluronic acid"],
    watch: ["Retinol", "AHA (Glycolic)", "Vitamin C (L-AA)", "Witch hazel"],
    avoid: ["Denatured alcohol", "Coconut oil", "Fragrance", "Essential oils"],
  },
  data: {
    headline: "68% of Oily skin users recommend lightweight moisturizers",
    minority: "21% prefer richer creams at night",
    sample: "Based on 14,200 reviews from Reddit, TikTok & Sephora",
  },
  categories: [
    {
      category: "Cleanser",
      emoji: "🧼",
      brand: "CeraVe",
      name: "Foaming Facial Cleanser",
      good: ["Niacinamide", "Ceramides"],
      watch: "Fragrance-free formula — but contains SLS",
      reason: "Cuts oil without stripping your barrier",
    },
    {
      category: "Toner",
      emoji: "💦",
      brand: "COSRX",
      name: "AHA/BHA Clarifying Treatment Toner",
      good: ["Salicylic acid", "Willow bark"],
      watch: "Contains low % AHA — go slow if sensitive",
      reason: "Unclogs pores between cleanses",
    },
    {
      category: "Serum",
      emoji: "🧪",
      brand: "The Ordinary",
      name: "Niacinamide 10% + Zinc 1%",
      good: ["Niacinamide", "Zinc PCA"],
      watch: "Can pill under sunscreen if over-applied",
      reason: "Targets pores + breakouts in one step",
    },
    {
      category: "Moisturizer",
      emoji: "🥛",
      brand: "Beauty of Joseon",
      name: "Dynasty Cream",
      good: ["Centella asiatica", "Hyaluronic acid"],
      watch: "Lightly fragranced with rice extract",
      reason: "Lightweight hydration that won't clog you",
    },
    {
      category: "Face Mask",
      emoji: "🍃",
      brand: "Innisfree",
      name: "Super Volcanic Pore Clay Mask",
      good: ["Volcanic clay", "Green tea"],
      watch: "Don't leave on past 10 min — can over-dry",
      reason: "Weekly pore reset for oily zones",
    },
  ],
  twins: [
    {
      name: "Mei Tanaka",
      handle: "@meiglow",
      avatar: "👩🏻",
      matchLabel: "Oily + Sensitive like you",
      ethnicity: "East Asian",
      swearsBy: "Beauty of Joseon Relief Sun",
    },
    {
      name: "Hana Park",
      handle: "@hanaskin",
      avatar: "🧑🏻‍🦰",
      matchLabel: "Oily skin, breakout-prone",
      ethnicity: "East Asian",
      swearsBy: "Niacinamide 10% serum",
    },
    {
      name: "Yuki R.",
      handle: "@yuki.routine",
      avatar: "👧🏻",
      matchLabel: "Oily + enlarged pores",
      ethnicity: "East Asian",
      swearsBy: "COSRX BHA toner, 3x a week",
    },
  ],
};

function QuizResultPage() {
  const [saved, setSaved] = useState(false);
  const [stored, setStored] = useState<null | {
    skinTypeLabel?: string;
    persona?: { name: string; emoji: string; tagline: string };
    concerns?: string[];
    ingredients?: { good: string[]; watch: string[]; avoid: string[] };
  }>(null);

  // Hydrate from quiz payload written by /quiz
  useEffect(() => {
    try {
      const raw = localStorage.getItem("skintea.quizResult");
      if (raw) {
        setStored(JSON.parse(raw));
        setSaved(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const result = {
    ...defaultResult,
    skinType: stored?.skinTypeLabel ?? defaultResult.skinType,
    persona: stored?.persona ?? defaultResult.persona,
    concerns: stored?.concerns?.length ? stored.concerns : defaultResult.concerns,
    ingredients: stored?.ingredients ?? defaultResult.ingredients,
  };

  return (
    <div style={{ background: C.bg, color: C.espresso, minHeight: "100vh" }}>
      {/* Top nav */}
      <header
        style={{
          background: C.espresso,
          color: "#fff",
          padding: "16px 20px",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to="/product-detail" style={{ color: "#fff", textDecoration: "none", fontWeight: 800, letterSpacing: "0.02em" }}>
            SKIN<span style={{ color: C.crimson }}>TEA</span>
          </Link>
          <nav style={{ display: "flex", gap: 18, fontSize: 13 }}>
            <Link to="/products" style={{ color: "#fff", textDecoration: "none", opacity: 0.85 }}>Products</Link>
            <span style={{ color: "#fff", opacity: 0.85 }}>Quiz</span>
            <span style={{ color: "#fff", opacity: 0.6, display: "inline-flex", alignItems: "center", gap: 4 }}>
              Tea <Lock size={12} />
            </span>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: C.espresso, color: "#fff", padding: "20px 20px 36px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ color: C.crimson, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", marginBottom: 10 }}>
            YOUR RESULTS
          </div>
          <h1 style={{ fontSize: 28, lineHeight: 1.15, fontWeight: 800, margin: 0, maxWidth: 520 }}>
            Your skin profile, decoded.
          </h1>
          <p style={{ color: "#D9CFC8", fontSize: 14, marginTop: 10, maxWidth: 520 }}>
            Built from your answers and 14,200+ real user reviews.
          </p>
        </div>
      </section>

      {/* Content */}
      <main
        style={{
          background: C.bg,
          borderRadius: "20px 20px 0 0",
          marginTop: -16,
          padding: "24px 16px 60px",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* 1. SKIN PROFILE */}
          <SectionLabel>SKIN PROFILE</SectionLabel>
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: C.textLight, fontWeight: 700, letterSpacing: "0.1em" }}>
                  YOU'RE GIVING — {result.skinType.toUpperCase()}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, lineHeight: 1.1 }}>
                  {result.persona.name}
                </div>
                <div style={{ fontSize: 13, color: C.textMid, marginTop: 6, maxWidth: 360, lineHeight: 1.45 }}>
                  {result.persona.tagline}
                </div>
              </div>
              <div
                style={{
                  width: 56, height: 56, borderRadius: 14, background: C.imageBg,
                  display: "grid", placeItems: "center", fontSize: 26,
                }}
                aria-hidden
              >
                {result.persona.emoji}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: C.textLight, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>
                TOP CONCERNS
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.concerns.map((c) => (
                  <span
                    key={c}
                    style={{
                      fontSize: 12,
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: C.imageBg,
                      color: C.espresso,
                      fontWeight: 600,
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <p style={{ marginTop: 16, marginBottom: 0, fontSize: 14, color: C.textMid, lineHeight: 1.5 }}>
              {result.summary}
            </p>
          </Card>

          {/* 2. INGREDIENT LIST */}
          <SectionLabel>YOUR INGREDIENT LIST</SectionLabel>
          <Card>
            <IngredientGroup
              title="Good for you"
              icon={<Check size={14} />}
              fg={C.good}
              bg={C.goodBg}
              items={result.ingredients.good}
            />
            <div style={{ height: 12 }} />
            <IngredientGroup
              title="Watch out"
              icon={<AlertTriangle size={14} />}
              fg={C.warn}
              bg={C.warnBg}
              items={result.ingredients.watch}
            />
            <div style={{ height: 12 }} />
            <IngredientGroup
              title="Avoid"
              icon={<X size={14} />}
              fg={C.bad}
              bg={C.badBg}
              items={result.ingredients.avoid}
            />
            <p style={{ marginTop: 14, marginBottom: 0, fontSize: 12, color: C.textLight, fontStyle: "italic" }}>
              {saved ? "Saved — " : ""}These highlights follow you across the site.
            </p>
          </Card>

          {/* 3. SKINTEA DATA */}
          <SectionLabel>SKINTEA DATA</SectionLabel>
          <Card>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: C.crimson, lineHeight: 1 }}>68%</div>
              <div style={{ fontSize: 13, color: C.textMid }}>majority</div>
            </div>
            <p style={{ marginTop: 10, marginBottom: 0, fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>
              {result.data.headline}
            </p>

            {/* Bar */}
            <div style={{ marginTop: 16, height: 8, background: C.imageBg, borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: "68%", height: "100%", background: C.crimson }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: C.textLight }}>
              <span>68% recommend lightweight</span>
              <span>21% prefer rich creams</span>
            </div>

            <div
              style={{
                marginTop: 16, paddingTop: 14,
                borderTop: `1px solid ${C.border}`,
                fontSize: 12, color: C.textLight,
              }}
            >
              {result.data.sample}
            </div>
          </Card>

          {/* 4. PRODUCTS */}
          <SectionLabel>RECOMMENDED FOR YOU</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {result.categories.map((c) => (
              <CategoryCard key={c.category} item={c} />
            ))}
          </div>

          {/* 4b. SKIN TWIN */}
          <SectionLabel>YOUR SKIN TWIN</SectionLabel>
          <p style={{ margin: "-8px 0 0", fontSize: 14, color: C.textMid }}>
            Same skin type. Same vibe. See what's working for them.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {result.twins
              .filter((t) => !result.ethnicity || t.ethnicity === result.ethnicity)
              .map((t) => (
                <TwinCard key={t.handle} twin={t} />
              ))}
          </div>
          <p style={{ margin: "-4px 0 0", fontSize: 11, color: C.textLight, fontStyle: "italic" }}>
            Matched by skin type and background — not sponsored.
          </p>

          {/* 5. SAMPLE KIT */}
          <SectionLabel>TRY BEFORE YOU COMMIT</SectionLabel>
          <Card>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div
                style={{
                  width: 64, height: 64, borderRadius: 14, background: C.imageBg,
                  display: "grid", placeItems: "center", fontSize: 28, flexShrink: 0,
                }}
                aria-hidden
              >
                🧴
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Your Sample Kit</div>
                <p style={{ marginTop: 6, marginBottom: 0, fontSize: 13, color: C.textMid, lineHeight: 1.5 }}>
                  A full skincare set curated for your skin type. Cleanser, toner, serum, moisturizer.
                </p>
                <div style={{ marginTop: 10, fontSize: 18, fontWeight: 800 }}>$50</div>
              </div>
            </div>
            <button
              type="button"
              style={{
                marginTop: 16, width: "100%",
                background: C.espresso, color: "#fff",
                border: "none", borderRadius: 12,
                padding: "14px 16px", fontWeight: 700, fontSize: 14,
                cursor: "pointer",
              }}
            >
              See Your Kit
            </button>
          </Card>

          {/* 6. TREATMENTS LOCKED */}
          <SectionLabel>TREATMENTS</SectionLabel>
          <div
            style={{
              position: "relative",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 20,
              overflow: "hidden",
            }}
          >
            {/* Blurred preview content */}
            <div style={{ filter: "blur(6px)", opacity: 0.6, userSelect: "none", pointerEvents: "none" }}>
              <div style={{ fontSize: 11, color: C.textLight, fontWeight: 700, letterSpacing: "0.1em" }}>FOR OILY SKIN</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>Botox, peels & in-office treatments</div>
              <p style={{ marginTop: 8, fontSize: 13, color: C.textMid }}>
                Real outcomes from 1,400 verified members. Honest costs. Honest downtime.
              </p>
              <div style={{ marginTop: 14, height: 70, background: C.imageBg, borderRadius: 10 }} />
            </div>

            {/* Lock overlay */}
            <div
              style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 8, padding: 20, textAlign: "center",
                background: "rgba(250,250,248,0.55)",
              }}
            >
              <div
                style={{
                  width: 40, height: 40, borderRadius: 999,
                  background: C.espresso, color: "#fff",
                  display: "grid", placeItems: "center",
                }}
              >
                <Lock size={18} />
              </div>
              <div style={{ fontSize: 11, color: C.crimson, fontWeight: 800, letterSpacing: "0.14em" }}>
                MEMBERS ONLY
              </div>
              <p style={{ margin: 0, fontSize: 13, color: C.espresso, maxWidth: 320 }}>
                Real experiences with Botox, peels, and treatments — for your skin type.
              </p>
              <button
                type="button"
                style={{
                  marginTop: 6,
                  background: C.crimson, color: "#fff",
                  border: "none", borderRadius: 12,
                  padding: "10px 16px", fontWeight: 700, fontSize: 13,
                  cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                <Sparkles size={14} /> Unlock with Skintea membership
              </button>
            </div>
          </div>

          {/* Retake */}
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <Link
              to="/products"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 13, color: C.textMid, textDecoration: "underline",
                textUnderlineOffset: 4,
              }}
            >
              <RotateCcw size={14} /> Retake quiz
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

// ---------- Subcomponents ----------
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.14em",
        color: C.crimson,
        marginTop: 8,
      }}
    >
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: 20,
      }}
    >
      {children}
    </div>
  );
}

function IngredientGroup({
  title, icon, fg, bg, items,
}: {
  title: string;
  icon: React.ReactNode;
  fg: string;
  bg: string;
  items: string[];
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span
          style={{
            width: 22, height: 22, borderRadius: 999,
            background: bg, color: fg,
            display: "grid", placeItems: "center",
          }}
        >
          {icon}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: fg }}>{title}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((i) => (
          <span
            key={i}
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 999,
              background: bg,
              color: fg,
              fontWeight: 600,
              border: `1px solid ${fg}22`,
            }}
          >
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}

function CategoryCard({
  item,
}: {
  item: {
    category: string; emoji: string; brand: string; name: string;
    good: string[]; watch: string; reason: string;
  };
}) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: 14,
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 64, height: 64, borderRadius: 12,
          background: C.imageBg,
          display: "grid", placeItems: "center", fontSize: 28, flexShrink: 0,
        }}
        aria-hidden
      >
        {item.emoji}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 10, color: C.crimson, fontWeight: 800, letterSpacing: "0.14em" }}>
          {item.category.toUpperCase()}
        </div>
        <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600, marginTop: 4 }}>{item.brand}</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 1, lineHeight: 1.3 }}>
          {item.name}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {item.good.map((g) => (
            <span
              key={g}
              style={{
                fontSize: 11, padding: "3px 8px", borderRadius: 999,
                background: C.goodBg, color: C.good, fontWeight: 700,
              }}
            >
              ✓ {g}
            </span>
          ))}
          <span
            style={{
              fontSize: 11, padding: "3px 8px", borderRadius: 999,
              background: C.warnBg, color: C.warn, fontWeight: 700,
            }}
          >
            ⚠ {item.watch}
          </span>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: C.textMid, lineHeight: 1.4 }}>
          {item.reason}
        </p>
      </div>
    </div>
  );
}

function TwinCard({
  twin,
}: {
  twin: { name: string; handle: string; avatar: string; matchLabel: string; ethnicity: string; swearsBy: string };
}) {
  return (
    <div
      style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: 14,
        display: "flex", gap: 12, alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 56, height: 56, borderRadius: 999,
          background: C.imageBg,
          display: "grid", placeItems: "center", fontSize: 28, flexShrink: 0,
        }}
        aria-hidden
      >
        {twin.avatar}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{twin.name}</div>
        <div style={{ fontSize: 12, color: C.textLight, marginTop: 1 }}>{twin.handle}</div>
        <div
          style={{
            display: "inline-block", marginTop: 8,
            fontSize: 11, padding: "3px 8px", borderRadius: 999,
            background: C.badBg, color: C.crimson, fontWeight: 700,
          }}
        >
          {twin.matchLabel}
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: C.textMid, lineHeight: 1.4 }}>
          Swears by: <strong style={{ color: C.espresso }}>{twin.swearsBy}</strong>
        </p>
        <button
          type="button"
          style={{
            marginTop: 10, background: "transparent",
            border: `1px solid ${C.borderStrong}`,
            color: C.espresso, borderRadius: 999,
            padding: "6px 12px", fontSize: 12, fontWeight: 700,
            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
          }}
        >
          See their routine <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}