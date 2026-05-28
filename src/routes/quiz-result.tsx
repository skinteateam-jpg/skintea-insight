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

// ---------- Brand tokens ----------
const C = { espresso: "#1C0A00", crimson: "#A8001C", bg: "#FFFCF8", surface: "#FFFFFF", border: "#E8DDD4", borderStrong: "#E8DDD4", textMid: "#1C0A00", textLight: "#999999", imageBg: "#FFFCF8", good: "#2D7A3A", goodBg: "#F0FAF1", warn: "#A87400", warnBg: "#FFFBEB", bad: "#A8001C", badBg: "#FFF5F5" };

const HASHTAGS_BY_SKIN: Record<string, string[]> = {
  oily: ["#butterface", "#glossynotgreasy", "#oilygirlswin", "#blotterqueen", "#myskinismoisturized"],
  dry: ["#perpetuallythirsty", "#dryskingang", "#moisturizeordie", "#creameverything", "#flakingbutmakingit"],
  combination: ["#skintypecontradiction", "#tzonechaos", "#itsgivingbothsides", "#combogirlproblems", "#skinmoodswings"],
  normal: ["#lowmaintenance", "#skinjustworks", "#cleangirlaesthetic", "#normalbutmakeittrendy", "#dontfixwhatsnotbroken"],
  sensitive: ["#sensitivequeeen", "#gentleornothanks", "#myskinhasopinions", "#fragrancefreelife", "#everythingbreaksmeout"],
};

const PRODUCT_TABS = ["Cleanser", "Toner", "Serum", "Moisturizer", "SPF", "Mask"];

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
        const parsed = JSON.parse(raw);
        setStored(parsed);
        setSaved(true);
        if (parsed.skinTypeLabel) {
          localStorage.setItem("skintea_skin_type", parsed.skinTypeLabel.toLowerCase());
        }
      } else {
        localStorage.setItem("skintea_skin_type", defaultResult.skinType.toLowerCase());
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

  const [activeTab, setActiveTab] = useState(1);
  const hashtags = HASHTAGS_BY_SKIN[result.skinType.toLowerCase()] ?? HASHTAGS_BY_SKIN.oily;

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
          <div>
            <Link to="/" style={{ textDecoration: "none" }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 20, color: "#FFFCF8" }}>Skin</span>
              <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 20, color: "#A8001C" }}>tea</span>
            </Link>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,252,248,0.4)", marginTop: 2 }}>
              GOT SKINTEA? SPILL IT
            </div>
          </div>
          <nav style={{ display: "flex", gap: 18, fontSize: 13 }}>
            <Link to="/products" style={{ color: "#fff", textDecoration: "none", opacity: 0.85 }}>Products</Link>
            <Link to="/quiz" style={{ color: "#fff", textDecoration: "none", opacity: 0.85 }}>Quiz</Link>
            <span style={{ color: "#fff", opacity: 0.6, display: "inline-flex", alignItems: "center", gap: 4 }}>
              Tea <Lock size={12} />
            </span>
          </nav>
        </div>
      </header>

      {/* Character hero */}
      <div style={{ background: "#1C0A00", padding: "22px 18px 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", color: "#A8001C", textTransform: "uppercase", marginBottom: 18, textAlign: "center" }}>
          HERE'S YOUR TEA
        </div>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <div style={{ position: "absolute", inset: -10, borderRadius: 32, background: "radial-gradient(ellipse at center, rgba(168,0,28,0.2), transparent 70%)", pointerEvents: "none" }} />
          <div style={{ width: 120, height: 120, borderRadius: 28, background: "linear-gradient(145deg, #2a1200, #3d1a00)", border: "1.5px solid rgba(168,0,28,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 62 }}>
            {result.persona.emoji}
          </div>
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 28, color: "#FFFCF8", textAlign: "center", lineHeight: 1.1, marginBottom: 4 }}>
          {result.persona.name}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,252,248,0.45)", textAlign: "center", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
          {result.skinType} Skin
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", padding: "0 12px 22px" }}>
          {hashtags.map((tag, i) => {
            const accent = i % 2 === 0;
            return (
              <span
                key={tag}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 99,
                  padding: "5px 11px",
                  color: accent ? "#A8001C" : "rgba(255,252,248,0.65)",
                  background: accent ? "rgba(168,0,28,0.1)" : "rgba(255,252,248,0.06)",
                  border: accent ? "0.5px solid rgba(168,0,28,0.25)" : "0.5px solid rgba(255,252,248,0.1)",
                }}
              >
                {tag}
              </span>
            );
          })}
        </div>
      </div>

      {/* Tagline strip */}
      <div style={{ background: "#FFFCF8", borderRadius: "16px 16px 0 0", padding: "18px 18px 0" }}>
        <div style={{ fontSize: 13, color: "#1C0A00", lineHeight: 1.65, fontStyle: "italic", textAlign: "center", paddingBottom: 16, borderBottom: "0.5px solid #E8DDD4" }}>
          "{result.persona.tagline}"
        </div>
      </div>

      {/* Profile sync banner */}
      <div style={{ margin: "14px 16px 0", background: "#F0FAF1", border: "0.5px solid #2D7A3A", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 8, height: 8, background: "#2D7A3A", borderRadius: "50%", flexShrink: 0 }} />
        <div style={{ fontSize: 11, color: "#2D7A3A", fontWeight: 600, lineHeight: 1.4 }}>
          <strong>Saved to your profile.</strong> Your skin type, concerns, and recommendations are now on your Skintea page.
        </div>
      </div>

      {/* Content */}
      <main
        style={{
          background: C.bg,
          borderRadius: 0,
          marginTop: 0,
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
          <div>
            <SectionLabel>RECOMMENDED FOR YOU</SectionLabel>
            <div style={{ overflowX: "auto", scrollbarWidth: "none", margin: "0 -16px", padding: "0 16px" }}>
              <div style={{ display: "flex", gap: 6, width: "max-content", paddingBottom: 10 }}>
                {PRODUCT_TABS.map((label, idx) => {
                  const id = idx + 1;
                  const isActive = activeTab === id;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setActiveTab(id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "6px 12px",
                        borderRadius: 99,
                        fontSize: 11,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                        background: isActive ? "#1C0A00" : "#fff",
                        color: isActive ? "#FFFCF8" : "#999",
                        border: isActive ? "0.5px solid #1C0A00" : "0.5px solid #E8DDD4",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(() => {
                const activeLabel = PRODUCT_TABS[activeTab - 1];
                const matched = result.categories.filter(
                  (c) => c.category.toLowerCase() === activeLabel.toLowerCase()
                );
                const items = (matched.length ? matched : result.categories).slice(0, 2);
                while (items.length < 2 && result.categories.length) {
                  items.push(result.categories[items.length % result.categories.length]);
                }
                return items.map((item, idx) => (
                  <div key={`${item.category}-${idx}`} style={{ background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ height: 90, background: "#FFFCF8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, borderBottom: "0.5px solid #E8DDD4", position: "relative" }}>
                      <div style={{ position: "absolute", top: 6, left: 6, width: 18, height: 18, background: "#1C0A00", color: "#FFFCF8", borderRadius: 99, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {idx + 1}
                      </div>
                      {item.emoji}
                    </div>
                    <div style={{ padding: "8px 10px 10px" }}>
                      <div style={{ fontSize: 9, color: "#999", fontWeight: 600 }}>{item.brand}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#1C0A00", lineHeight: 1.3, marginBottom: 5 }}>{item.name}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 5 }}>
                        {item.good.map((g) => (
                          <span key={g} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 99, background: "#F0FAF1", color: "#2D7A3A", fontWeight: 700 }}>
                            ✓ {g}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: "#A8001C", fontWeight: 700 }}>
                        {68 + ((idx * 7) % 25)}% match
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
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

          {/* SHARE AND GIFT */}
          <SectionLabel>SHARE AND GIFT</SectionLabel>
          <div style={{ background: "#1C0A00", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,252,248,0.6)", marginBottom: 2 }}>Your public profile</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#FFFCF8" }}>skintea.com/u/username</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#A8001C", background: "rgba(168,0,28,0.12)", border: "0.5px solid rgba(168,0,28,0.3)", borderRadius: 99, padding: "5px 12px" }}>
              Copy link
            </span>
          </div>
          <div style={{ background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#FFF5F5", border: "0.5px solid #A8001C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                🎁
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1C0A00", marginBottom: 3 }}>Send as a gift</div>
                <div style={{ fontSize: 11, color: "#999", lineHeight: 1.5 }}>
                  Share your skin profile so friends and family can pick the perfect products for you — matched to your actual skin type.
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <button type="button" style={{ flex: 1, background: "#A8001C", color: "#FFFCF8", border: "none", borderRadius: 99, padding: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Share my profile
              </button>
              <button type="button" style={{ flex: 1, background: "transparent", color: "#1C0A00", border: "0.5px solid #E8DDD4", borderRadius: 99, padding: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Add to wishlist
              </button>
            </div>
          </div>

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
              to="/quiz"
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
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: "0.14em",
        color: "#A8001C",
        textTransform: "uppercase",
        marginTop: 18,
        marginBottom: 10,
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
        background: "#FFFFFF",
        border: "0.5px solid #E8DDD4",
        borderRadius: 12,
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