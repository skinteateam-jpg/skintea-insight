import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

export const Route = createFileRoute("/quiz")({
  component: QuizPage,
  head: () => ({
    meta: [
      { title: "Skin Quiz — Skintea" },
      { name: "description", content: "Take the 8-question Skintea skin quiz to decode your skin type, sensitivity, and concerns." },
      { property: "og:title", content: "Skin Quiz — Skintea" },
      { property: "og:description", content: "Find your skin character in 8 questions." },
    ],
  }),
});

// ---------- Brand tokens ----------
const C = { espresso: "#1C0A00", crimson: "#A8001C", bg: "#FFFCF8", surface: "#FFFFFF", border: "#E8DDD4", borderStrong: "#E8DDD4", textMid: "#1C0A00", textLight: "#999999", imageBg: "#FFFCF8" };

// ---------- Question definitions ----------
type OptionDef = { value: string; emoji?: string; label: string };
type QDef = { id: string; eyebrow: string; title: string; options: OptionDef[] };

const QUESTIONS: QDef[] = [
  {
    id: "morning",
    eyebrow: "MORNING CHECK",
    title: "You wake up, haven't touched your face yet. How does it feel?",
    options: [
      { value: "shiny", emoji: "✨", label: "Shiny and slick, like it's already sweating" },
      { value: "tight", emoji: "🪨", label: "Tight and rough, needs water immediately" },
      { value: "mixed", emoji: "🤷", label: "Shiny in some spots, tight in others" },
      { value: "normal", emoji: "😌", label: "Pretty normal, no drama" },
    ],
  },
  {
    id: "afternoon",
    eyebrow: "AFTERNOON CHECK",
    title: "By 2pm, what does your skin actually look like?",
    options: [
      { value: "full-shine", emoji: "💦", label: "Full shine, foundation has slid off" },
      { value: "dry-patches", emoji: "🏜️", label: "Dry patches, maybe some flaking" },
      { value: "tzone", emoji: "🎭", label: "T-zone oily, cheeks dry or normal" },
      { value: "same", emoji: "😶", label: "Looks the same as the morning" },
    ],
  },
  {
    id: "reaction",
    eyebrow: "REACTION TEST",
    title: "You try a new product. What usually happens?",
    options: [
      { value: "freaks-out", emoji: "🔴", label: "My skin freaks out — redness, itching, or breakouts" },
      { value: "sometimes", emoji: "😐", label: "Sometimes a small reaction, usually fine" },
      { value: "never", emoji: "💪", label: "Almost never reacts" },
    ],
  },
  {
    id: "pores",
    eyebrow: "PORE CHECK",
    title: "Look at your nose and cheeks. What do you see?",
    options: [
      { value: "big", emoji: "👀", label: "Big pores, some blackheads" },
      { value: "small", emoji: "🔍", label: "Barely visible pores" },
      { value: "tzone-pores", emoji: "🧩", label: "Pores only visible in the T-zone" },
    ],
  },
  {
    id: "concern",
    eyebrow: "MAIN CONCERN",
    title: "If you could fix ONE thing about your skin, what is it?",
    options: [
      { value: "pores-oil", emoji: "🕳️", label: "Pores and oiliness" },
      { value: "dryness", emoji: "💧", label: "Dryness and dullness" },
      { value: "redness", emoji: "🔴", label: "Redness and sensitivity" },
      { value: "dark-spots", emoji: "🌑", label: "Dark spots and uneven tone" },
      { value: "aging", emoji: "📅", label: "Fine lines and texture" },
      { value: "acne", emoji: "🫧", label: "Breakouts and acne" },
    ],
  },
  {
    id: "breakouts",
    eyebrow: "BREAKOUT PATTERN",
    title: "Do you break out? If yes, where?",
    options: [
      { value: "rarely", label: "Rarely or never" },
      { value: "tzone", label: "Mostly forehead and nose" },
      { value: "hormonal", label: "Mostly cheeks and jawline" },
      { value: "all-over", label: "Randomly all over" },
    ],
  },
  {
    id: "routine",
    eyebrow: "ROUTINE REALITY",
    title: "What does your current routine actually look like?",
    options: [
      { value: "minimal", emoji: "🫧", label: "Just wash my face" },
      { value: "basic", emoji: "🧴", label: "Cleanser + moisturizer" },
      { value: "full", emoji: "💊", label: "Full routine, multiple steps" },
      { value: "actives", emoji: "🧪", label: "I use actives (retinol, AHA, BHA, etc.)" },
    ],
  },
  {
    id: "treatment",
    eyebrow: "TREATMENT INTEREST",
    title: "Are you open to treatment info? (Botox, lasers, etc.)",
    options: [
      { value: "yes", label: "Yes, I'm curious" },
      { value: "maybe", label: "Maybe later" },
      { value: "no", label: "No, skincare only" },
    ],
  },
];

// ---------- Result logic ----------
type Answers = Record<string, string>;

type SkinTypeKey = "oily" | "dry" | "combination" | "normal";
type CharacterKey = "glazed-donut" | "desert-girl" | "mood-board" | "unbothered" | "main-character";

function deriveSkinType(a: Answers): SkinTypeKey {
  const m = a.morning, n = a.afternoon, p = a.pores;
  // Score each type
  let oily = 0, dry = 0, combo = 0, normal = 0;
  if (m === "shiny") oily += 2;
  if (m === "tight") dry += 2;
  if (m === "mixed") combo += 2;
  if (m === "normal") normal += 2;
  if (n === "full-shine") oily += 2;
  if (n === "dry-patches") dry += 2;
  if (n === "tzone") combo += 2;
  if (n === "same") normal += 2;
  if (p === "big") oily += 1;
  if (p === "small") { dry += 1; normal += 1; }
  if (p === "tzone-pores") combo += 1;

  const scores: Array<[SkinTypeKey, number]> = [
    ["oily", oily], ["dry", dry], ["combination", combo], ["normal", normal],
  ];
  scores.sort((x, y) => y[1] - x[1]);
  return scores[0][0];
}

function deriveCharacter(skinType: SkinTypeKey, sensitivity: boolean): CharacterKey {
  if (sensitivity) return "main-character";
  if (skinType === "oily") return "glazed-donut";
  if (skinType === "dry") return "desert-girl";
  if (skinType === "combination") return "mood-board";
  return "unbothered";
}

const CHARACTER_META: Record<CharacterKey, { name: string; emoji: string; tagline: string }> = {
  "glazed-donut":   { name: "The Glazed Donut",   emoji: "🍩",   tagline: "Shiny by 2pm, glowing by accident. We work with it, not against it." },
  "desert-girl":    { name: "The Desert Girl",    emoji: "🏜️",  tagline: "Thirsty skin, big personality. Hydration is your love language." },
  "mood-board":     { name: "The Mood Board",     emoji: "🎭",   tagline: "Oily here, dry there. Your skin contains multitudes." },
  "unbothered":     { name: "The Unbothered",     emoji: "😮‍💨", tagline: "Balanced, calm, low maintenance. Don't break what isn't broken." },
  "main-character": { name: "The Main Character", emoji: "🌸",   tagline: "Reactive, expressive, never boring. Gentle wins every time." },
};

function deriveIngredients(skinType: SkinTypeKey, sensitivity: boolean, concern: string) {
  const good = new Set<string>();
  const watch = new Set<string>();
  const avoid = new Set<string>();

  if (skinType === "oily") {
    ["Niacinamide", "Salicylic acid", "Zinc PCA"].forEach(i => good.add(i));
    ["Coconut oil", "Heavy butters"].forEach(i => watch.add(i));
    ["Mineral oil", "Occlusive oils"].forEach(i => avoid.add(i));
  } else if (skinType === "dry") {
    ["Hyaluronic acid", "Ceramides", "Squalane"].forEach(i => good.add(i));
    ["Retinol", "AHA (Glycolic)"].forEach(i => watch.add(i));
    ["High-% alcohol", "Clay masks"].forEach(i => avoid.add(i));
  } else if (skinType === "combination") {
    ["Niacinamide", "Light AHA", "Hyaluronic acid"].forEach(i => good.add(i));
    ["Heavy serums"].forEach(i => watch.add(i));
    ["Over-stripping cleansers"].forEach(i => avoid.add(i));
  } else {
    ["Niacinamide", "Hyaluronic acid", "Vitamin C", "Retinol"].forEach(i => good.add(i));
  }

  if (sensitivity) {
    ["Centella asiatica", "Allantoin", "Azelaic acid"].forEach(i => good.add(i));
    ["Fragrance", "Essential oils", "Pure Vitamin C (L-AA)"].forEach(i => watch.add(i));
    ["Synthetic fragrance", "Denatured alcohol", "Harsh exfoliants"].forEach(i => avoid.add(i));
  }

  if (concern === "dark-spots") {
    good.add("Vitamin C"); good.add("Kojic acid");
  }
  if (concern === "acne") {
    good.add("Zinc PCA"); good.add("Salicylic acid");
  }
  if (concern === "aging") {
    if (sensitivity) {
      watch.add("Retinol");
      good.add("Peptides");
    } else {
      good.add("Retinol"); good.add("Peptides");
    }
  }

  return {
    good: Array.from(good),
    watch: Array.from(watch),
    avoid: Array.from(avoid),
  };
}

const SKIN_TYPE_LABEL: Record<SkinTypeKey, string> = {
  oily: "Oily", dry: "Dry", combination: "Combination", normal: "Normal",
};

const CONCERN_LABEL: Record<string, string> = {
  "pores-oil": "Pores and oiliness",
  "dryness": "Dryness and dullness",
  "redness": "Redness and sensitivity",
  "dark-spots": "Dark spots and uneven tone",
  "aging": "Fine lines and texture",
  "acne": "Breakouts and acne",
};

function buildResultPayload(answers: Answers) {
  const skinType = deriveSkinType(answers);
  const sensitivity = answers.reaction === "freaks-out";
  const character = deriveCharacter(skinType, sensitivity);
  const ingredients = deriveIngredients(skinType, sensitivity, answers.concern);
  const meta = CHARACTER_META[character];

  // Top concerns array — primary + sensitivity tag if applicable
  const concerns: string[] = [];
  if (answers.concern && CONCERN_LABEL[answers.concern]) concerns.push(CONCERN_LABEL[answers.concern]);
  if (sensitivity) concerns.push("Sensitivity");
  if (answers.breakouts && answers.breakouts !== "rarely") {
    if (answers.breakouts === "hormonal") concerns.push("Hormonal breakouts");
    else if (answers.breakouts === "tzone") concerns.push("T-zone breakouts");
    else if (answers.breakouts === "all-over") concerns.push("Frequent breakouts");
  }

  return {
    // Spec output object
    skinType,
    sensitivityModifier: sensitivity,
    character,
    topConcern: answers.concern,
    breakoutPattern: answers.breakouts,
    routineLevel: answers.routine,
    treatmentInterest: answers.treatment,
    // Display-friendly fields used by /quiz-result and /skin-profile
    skinTypeLabel: SKIN_TYPE_LABEL[skinType],
    persona: { name: meta.name, emoji: meta.emoji, tagline: meta.tagline },
    concerns,
    ingredients,
    rawAnswers: answers,
    savedAt: new Date().toISOString(),
  };
}

// ---------- Page component ----------
function QuizPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);

  const total = QUESTIONS.length;
  const q = QUESTIONS[step];
  const isLast = step === total - 1;
  const currentValue = answers[q.id];
  const progressPct = ((step + (currentValue ? 1 : 0)) / total) * 100;

  const choose = (value: string) => {
    setAnswers((a) => ({ ...a, [q.id]: value }));
  };

  const next = () => {
    if (!currentValue) return;
    if (isLast) {
      setSubmitting(true);
      const payload = buildResultPayload({ ...answers, [q.id]: currentValue });
      try {
        localStorage.setItem("skintea.quizResult", JSON.stringify(payload));
      } catch {
        // ignore
      }
      // small delay so user sees the loading state
      setTimeout(() => navigate({ to: "/quiz-result" }), 250);
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div style={{ background: C.bg, color: C.espresso, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header / progress */}
      <header style={{ padding: "16px 20px 8px", background: C.bg, position: "sticky", top: 0, zIndex: 5 }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <Link to="/product-detail" style={{ textDecoration: "none", display: "block", lineHeight: 1 }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 18, color: "#1C0A00" }}>Skin</span>
                <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 18, color: "#A8001C" }}>tea</span>
              </Link>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#999", marginTop: 2 }}>GOT SKINTEA? SPILL IT</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, letterSpacing: "0.14em" }}>
              {step + 1} / {total}
            </div>
          </div>
          <div style={{ height: 4, background: "#F0E8E0", borderRadius: 999, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                background: C.crimson,
                transition: "width 250ms ease",
              }}
            />
          </div>
        </div>
      </header>

      {/* Question card */}
      <main style={{ flex: 1, padding: "20px 16px 32px", display: "flex", justifyContent: "center" }}>
        <div
          key={q.id}
          style={{
            maxWidth: 560,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            animation: "stq-fade 280ms ease",
          }}
        >
          <style>{`
            @keyframes stq-fade {
              from { opacity: 0; transform: translateY(6px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          <div style={{ color: C.crimson, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em" }}>
            {q.eyebrow}
          </div>
          <h1 style={{ fontSize: 24, lineHeight: 1.25, fontWeight: 800, margin: 0 }}>
            {q.title}
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
            {q.options.map((opt) => {
              const selected = currentValue === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => choose(opt.value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: selected ? C.espresso : C.surface,
                    color: selected ? "#fff" : C.espresso,
                    border: `0.5px solid ${selected ? C.espresso : C.border}`,
                    textAlign: "left",
                    fontSize: 13,
                    fontWeight: 600,
                    lineHeight: 1.35,
                    cursor: "pointer",
                    transition: "background 150ms ease, color 150ms ease, border-color 150ms ease",
                    width: "100%",
                  }}
                >
                  {opt.emoji && (
                    <span
                      aria-hidden
                      style={{
                        width: 28, height: 28, borderRadius: 10,
                        background: selected ? "rgba(255,255,255,0.12)" : C.imageBg,
                        display: "grid", placeItems: "center",
                        fontSize: 16, flexShrink: 0,
                      }}
                    >
                      {opt.emoji}
                    </span>
                  )}
                  <span style={{ flex: 1 }}>{opt.label}</span>
                  {selected && (
                    <Check size={18} style={{ flexShrink: 0, opacity: 0.9 }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Sticky CTA */}
      <footer
        style={{
          position: "sticky", bottom: 0,
          background: "#FFFCF8",
          borderTop: "0.5px solid #E8DDD4",
          padding: "12px 16px 20px",
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <button
            type="button"
            onClick={next}
            disabled={!currentValue || submitting}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: 10,
              border: "none",
              background: currentValue ? C.crimson : "#E8DDD4",
              color: currentValue ? "#fff" : "#999",
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: "0.02em",
              cursor: currentValue && !submitting ? "pointer" : "not-allowed",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "background 150ms ease",
            }}
          >
            {submitting
              ? "Building your profile…"
              : isLast
                ? <>See My Skin Profile <ArrowRight size={16} /></>
                : <>Next <ArrowRight size={16} /></>}
          </button>
          <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: C.textLight }}>
            No account needed. Your answers stay on this device.
          </div>
        </div>
      </footer>
    </div>
  );
}
