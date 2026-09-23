import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getLeadSessionId } from "@/lib/leadSession";
import { leadFlushHeld, noteLeadCreated } from "@/lib/leads";
import { sourcedIngredients } from "@/lib/sourcedIngredients";

export const Route = createFileRoute("/quiz")({
  component: QuizPage,
  head: () => ({
    meta: [
      { title: "Skin Quiz — Skintea" },
      { name: "description", content: "Take the 7-question Skintea skin quiz to decode your skin type, sensitivity, and concerns." },
      { property: "og:title", content: "Skin Quiz — Skintea" },
      { property: "og:description", content: "Find your skin character in 7 questions." },
    ],
  }),
});

// ---------- Brand tokens ----------
const C = { espresso: "#1C0A00", crimson: "#A8001C", bg: "#FFFCF8", surface: "#FFFFFF", border: "#E8DDD4", borderStrong: "#E8DDD4", textMid: "#1C0A00", textLight: "#999999", imageBg: "#FFFCF8" };

// ---------- Question definitions ----------
type OptionDef = { value: string; emoji?: string; label: string };
type QDef = { id: string; eyebrow: string; title: string; options: OptionDef[] };

const Q_SKIN_TYPE: QDef = {
  id: "skinType",
  eyebrow: "SKIN TYPE",
  title: "What's your skin type?",
  options: [
    { value: "oily", emoji: "✨", label: "Oily" },
    { value: "dry", emoji: "🪨", label: "Dry" },
    { value: "combination", emoji: "🎭", label: "Combination" },
    { value: "sensitive", emoji: "🔴", label: "Sensitive" },
    { value: "normal", emoji: "😌", label: "Normal" },
    { value: "unsure", emoji: "🤷", label: "I'm not sure" },
  ],
};

const Q_MORNING: QDef = {
  id: "morning",
  eyebrow: "MORNING CHECK",
  title: "You wake up, haven't touched your face yet. How does it feel?",
  options: [
    { value: "shiny", emoji: "✨", label: "Shiny and slick, like it's already sweating" },
    { value: "tight", emoji: "🪨", label: "Tight and rough, needs water immediately" },
    { value: "mixed", emoji: "🤷", label: "Shiny in some spots, tight in others" },
    { value: "normal", emoji: "😌", label: "Pretty normal, no drama" },
  ],
};

const Q_AFTERNOON: QDef = {
  id: "afternoon",
  eyebrow: "AFTERNOON CHECK",
  title: "By 2pm, what does your skin actually look like?",
  options: [
    { value: "full-shine", emoji: "💦", label: "Full shine, foundation has slid off" },
    { value: "dry-patches", emoji: "🏜️", label: "Dry patches, maybe some flaking" },
    { value: "tzone", emoji: "🎭", label: "T-zone oily, cheeks dry or normal" },
    { value: "same", emoji: "😶", label: "Looks the same as the morning" },
  ],
};

const Q_CONCERN: QDef = {
  id: "concern",
  eyebrow: "MAIN CONCERN",
  title: "If you could fix ONE thing about your skin, what is it?",
  options: [
    { value: "acne", emoji: "🫧", label: "Acne and breakouts" },
    { value: "texture", emoji: "🧩", label: "Texture and rough patches" },
    { value: "pigmentation", emoji: "🌑", label: "Pigmentation and dark spots" },
    { value: "redness", emoji: "🔴", label: "Redness and irritation" },
    { value: "aging", emoji: "📅", label: "Fine lines and aging" },
    { value: "barrier", emoji: "💧", label: "Barrier damage" },
  ],
};

const Q_REACTION: QDef = {
  id: "reaction",
  eyebrow: "REACTION HISTORY",
  title: "You try a new product. What usually happens?",
  options: [
    { value: "reacts-most", emoji: "🔴", label: "Reacts to most new products" },
    { value: "sometimes", emoji: "😐", label: "Occasional small reaction" },
    { value: "never", emoji: "💪", label: "Almost never reacts" },
  ],
};

const Q_ROUTINE: QDef = {
  id: "routine",
  eyebrow: "ROUTINE REALITY",
  title: "What does your current routine actually look like?",
  options: [
    { value: "minimal", emoji: "🫧", label: "Just cleanse" },
    { value: "basic", emoji: "🧴", label: "Cleanser and moisturizer" },
    { value: "full", emoji: "💊", label: "Four or more steps" },
    { value: "actives", emoji: "🧪", label: "I use actives (retinol, AHA, BHA)" },
  ],
};

const Q_BUDGET: QDef = {
  id: "budget",
  eyebrow: "BUDGET",
  title: "What do you usually spend on a single product?",
  options: [
    { value: "under-25", label: "Under $25" },
    { value: "25-60", label: "$25 to $60" },
    { value: "60-120", label: "$60 to $120" },
    { value: "120-plus", label: "$120 and up" },
  ],
};

const Q_TREATMENT: QDef = {
  id: "treatment",
  eyebrow: "TREATMENTS",
  title: "Have you considered in-clinic treatments for this?",
  options: [
    { value: "yes", label: "Yes" },
    { value: "not_sure", label: "Not sure" },
    { value: "no", label: "No" },
  ],
};

// ---------- Result logic ----------
type Answers = Record<string, string>;

type SkinTypeKey = "oily" | "dry" | "combination" | "sensitive" | "normal";
type CharacterKey = "glazed-donut" | "desert-girl" | "mood-board" | "unbothered" | "main-character";

function deriveSkinTypeFromChecks(a: Answers): SkinTypeKey {
  if (a.reaction === "reacts-most") return "sensitive";
  const m = a.morning, n = a.afternoon;
  let oily = 0, dry = 0, combo = 0, normal = 0;
  if (m === "shiny") oily += 2;
  if (m === "tight") dry += 2;
  if (m === "mixed") combo += 2;
  if (m === "normal") normal += 2;
  if (n === "full-shine") oily += 2;
  if (n === "dry-patches") dry += 2;
  if (n === "tzone") combo += 2;
  if (n === "same") normal += 2;

  const scores: Array<[SkinTypeKey, number]> = [
    ["oily", oily], ["dry", dry], ["combination", combo], ["normal", normal],
  ];
  scores.sort((x, y) => y[1] - x[1]);
  return scores[0][0];
}

function resolveSkinType(a: Answers): SkinTypeKey {
  const picked = a.skinType;
  if (picked && picked !== "unsure") return picked as SkinTypeKey;
  return deriveSkinTypeFromChecks(a);
}

// oily = The Butter Girl, dry = The Peach, combination = The Everything Bagel,
// sensitive = The Glass of Milk, normal = The Cracker
const SKIN_TYPE_TO_CHARACTER: Record<SkinTypeKey, CharacterKey> = {
  oily: "glazed-donut",
  dry: "main-character",
  combination: "mood-board",
  sensitive: "unbothered",
  normal: "desert-girl",
};

const CHARACTER_META: Record<CharacterKey, { name: string; emoji: string; tagline: string }> = {
  "glazed-donut":   { name: "The Butter Girl",      emoji: "🧈", tagline: "Rich, glossy, and a little too much. Your skin never misses a beat." },
  "main-character": { name: "The Peach",            emoji: "🍑", tagline: "Soft, delicate, and thirsty. Gentle is the only way." },
  "mood-board":     { name: "The Everything Bagel", emoji: "🥯", tagline: "Oily here, dry there. Your skin contains multitudes." },
  "unbothered":     { name: "The Glass of Milk",    emoji: "🥛", tagline: "Reactive and particular. Simple, calm, fragrance-free." },
  "desert-girl":    { name: "The Cracker",          emoji: "🫙", tagline: "Balanced and steady. Don't break what isn't broken." },
};

// Ingredient guidance comes only from American Academy of Dermatology pages (src/lib/sourcedIngredients.ts, 2026-09-16).
// The earlier hard-coded rules had no source and partly contradicted AAD (e.g. mineral oil, which AAD lists for dry skin).
function deriveIngredients(skinType: SkinTypeKey, sensitivity: boolean, concern: string) {
  const g = sourcedIngredients(skinType, sensitivity, concern);
  return { good: g.good.map((i) => i.name), watch: g.watch.map((i) => i.name), avoid: g.avoid.map((i) => i.name), source: "aad" as const };
}

const SKIN_TYPE_LABEL: Record<SkinTypeKey, string> = {
  oily: "Oily", dry: "Dry", combination: "Combination", sensitive: "Sensitive", normal: "Normal",
};

const CONCERN_LABEL: Record<string, string> = {
  acne: "Acne and breakouts",
  texture: "Texture and rough patches",
  pigmentation: "Pigmentation and dark spots",
  redness: "Redness and irritation",
  aging: "Fine lines and aging",
  barrier: "Barrier damage",
};

function buildResultPayload(answers: Answers, extras: { treatmentIds: string[]; isFirstTime: boolean; shareSlug: string | null }) {
  const skinType = resolveSkinType(answers);
  const sensitivity = skinType === "sensitive" || answers.reaction === "reacts-most";
  const character = SKIN_TYPE_TO_CHARACTER[skinType];
  const ingredients = deriveIngredients(skinType, sensitivity, answers.concern ?? "");
  const meta = CHARACTER_META[character];

  const concerns: string[] = [];
  if (answers.concern && CONCERN_LABEL[answers.concern]) concerns.push(CONCERN_LABEL[answers.concern]);
  if (sensitivity && answers.concern !== "redness") concerns.push("Sensitivity");

  return {
    skinType,
    character,
    topConcern: answers.concern,
    routineLevel: answers.routine,
    budgetBand: answers.budget,
    zip: answers.zip || null,
    treatmentInterest: answers.treatment,
    treatmentIds: extras.treatmentIds,
    isFirstTime: extras.isFirstTime,
    shareSlug: extras.shareSlug,
    // Display-friendly fields used by /quiz-result and /skin-profile
    skinTypeLabel: SKIN_TYPE_LABEL[skinType],
    persona: { name: meta.name, emoji: meta.emoji, tagline: meta.tagline },
    concerns,
    ingredients,
    rawAnswers: answers,
    savedAt: new Date().toISOString(),
  };
}

// ---------- Session + lead helpers ----------
// The shared lead session id (src/lib/leadSession.ts), so a clinic view held before the
// quiz belongs to the same session as the quiz answers.
function getSessionId(): string {
  return getLeadSessionId() ?? crypto.randomUUID();
}

type TreatmentRow = { id: string; name: string; subtitle: string | null; what_it_is: string | null };

// ---------- Page component ----------
function QuizPage() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Answers>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [zipInput, setZipInput] = useState("");
  const [zipError, setZipError] = useState<string | null>(null);
  const [treatments, setTreatments] = useState<TreatmentRow[]>([]);
  const [treatmentIds, setTreatmentIds] = useState<string[]>([]);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

  const lead = useCallback(async (args: Record<string, unknown>) => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      const { error } = await supabase.rpc("lead_upsert", { p_session_id: sid, ...args } as never);
      if (error) throw error;
      noteLeadCreated();
    } catch (e) {
      console.error("lead_upsert failed", e);
    }
  }, []);

  // Session id only. Opening the quiz creates no lead row: the first answer does.
  useEffect(() => {
    sessionIdRef.current = getSessionId();
  }, []);

  // Treatment list (only needed for the yes / not_sure branches)
  useEffect(() => {
    if (answers.treatment !== "yes" && answers.treatment !== "not_sure") return;
    if (treatments.length > 0) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("treatments")
          .select("id, name, subtitle, what_it_is")
          .eq("active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true });
        if (error) throw error;
        setTreatments((data ?? []) as TreatmentRow[]);
      } catch (e) {
        console.error("treatments fetch failed", e);
      }
    })();
  }, [answers.treatment, treatments.length]);

  // Adaptive step list
  const unsure = answers.skinType === "unsure";
  const steps = useMemo(() => {
    const s: string[] = ["skinType"];
    if (unsure) s.push("morning", "afternoon");
    s.push("concern", "reaction", "routine", "budget", "zip", "treatment");
    if (answers.treatment === "yes" || answers.treatment === "not_sure") s.push("treatmentPick");
    return s;
  }, [unsure, answers.treatment]);

  const totalQuestions = unsure ? 9 : 7;
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const questionNumber = Math.min(
    steps.slice(0, stepIndex + 1).filter((s) => s !== "treatmentPick").length,
    totalQuestions,
  );
  const isTreatmentPick = currentStep === "treatmentPick";
  const isZip = currentStep === "zip";

  const QUESTION_BY_ID: Record<string, QDef> = {
    skinType: Q_SKIN_TYPE,
    morning: Q_MORNING,
    afternoon: Q_AFTERNOON,
    concern: Q_CONCERN,
    reaction: Q_REACTION,
    routine: Q_ROUTINE,
    budget: Q_BUDGET,
    treatment: Q_TREATMENT,
  };
  const q = QUESTION_BY_ID[currentStep];
  const currentValue = q ? answers[q.id] : undefined;

  const answeredCount = isZip
    ? (answers.zip !== undefined ? questionNumber : questionNumber - 1)
    : isTreatmentPick
      ? totalQuestions
      : (currentValue ? questionNumber : questionNumber - 1);
  const progressPct = Math.min(100, Math.max(0, (answeredCount / totalQuestions) * 100));

  const choose = (value: string) => {
    if (!q) return;
    setAnswers((a) => ({ ...a, [q.id]: value }));
    if (q.id === "skinType" && value !== "unsure") {
      void lead({ p_skin_type: value });
    }
    if (q.id === "budget") {
      void lead({ p_budget_band: value });
    }
    if (q.id === "treatment" && value === "no") {
      setTreatmentIds([]);
      setIsFirstTime(false);
    }
  };

  const toggleTreatment = (id: string) => {
    setTreatmentIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const finish = async (finalAnswers: Answers, ids: string[], firstTime: boolean) => {
    setSubmitting(true);
    const sid = sessionIdRef.current;
    const skinType = resolveSkinType(finalAnswers);
    const interest = (finalAnswers.treatment ?? "no") as "yes" | "not_sure" | "no";
    let shareSlug: string | null = null;

    if (sid) {
      // Held clinic views land before quiz_completed.
      await leadFlushHeld();
      try {
        const { data, error } = await supabase.rpc("quiz_response_save", {
          p_session_id: sid,
          p_answers: finalAnswers as never,
          p_derived_skin_type: skinType,
          p_derived_concerns: finalAnswers.concern ? [finalAnswers.concern] : [],
          p_treatment_interest: interest,
          p_treatment_ids: ids.length > 0 ? ids : undefined,
          p_is_first_time: firstTime,
          p_zip: finalAnswers.zip || undefined,
          p_budget_band: finalAnswers.budget || undefined,
          p_quiz_version: 1,
        });
        if (error) throw error;
        noteLeadCreated();
        if (typeof data === "string") shareSlug = data;
      } catch (e) {
        console.error("quiz_response_save failed", e);
      }
    }

    const payload = buildResultPayload(finalAnswers, { treatmentIds: ids, isFirstTime: firstTime, shareSlug });
    try {
      localStorage.setItem("skintea.quizResult", JSON.stringify(payload));
    } catch {
      // ignore
    }
    setTimeout(() => navigate({ to: "/quiz-result" }), 250);
  };

  const advance = (nextAnswers: Answers) => {
    // Recompute the step list against the answers we're about to commit
    const nextUnsure = nextAnswers.skinType === "unsure";
    const nextSteps: string[] = ["skinType"];
    if (nextUnsure) nextSteps.push("morning", "afternoon");
    nextSteps.push("concern", "reaction", "routine", "budget", "zip", "treatment");
    if (nextAnswers.treatment === "yes" || nextAnswers.treatment === "not_sure") nextSteps.push("treatmentPick");

    const idx = nextSteps.indexOf(currentStep);
    if (idx === -1 || idx >= nextSteps.length - 1) {
      void finish(nextAnswers, treatmentIds, isFirstTime);
      return;
    }
    setStepIndex(idx + 1);
  };

  const next = () => {
    if (submitting) return;

    if (isTreatmentPick) {
      void finish(answers, treatmentIds, isFirstTime);
      return;
    }

    if (isZip) {
      const raw = zipInput.trim();
      if (raw.length > 0 && !/^\d{5}$/.test(raw)) {
        setZipError("Enter a 5-digit ZIP code");
        return;
      }
      setZipError(null);
      const nextAnswers = { ...answers, zip: raw };
      setAnswers(nextAnswers);
      if (raw.length === 5) void lead({ p_zip: raw });
      advance(nextAnswers);
      return;
    }

    if (!q || !currentValue) return;
    advance({ ...answers, [q.id]: currentValue });
  };

  const skipZip = () => {
    setZipError(null);
    setZipInput("");
    const nextAnswers = { ...answers, zip: "" };
    setAnswers(nextAnswers);
    advance(nextAnswers);
  };

  const ctaDisabled = submitting || (!isZip && !isTreatmentPick && !currentValue);
  const ctaEnabledLook = !ctaDisabled;

  return (
    <div style={{ background: C.bg, color: C.espresso, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header / progress */}
      <header style={{ padding: "16px 20px 8px", background: C.bg, position: "sticky", top: 0, zIndex: 5 }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <Link to="/" style={{ textDecoration: "none", display: "block", lineHeight: 1 }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 18, color: "#1C0A00" }}>Skin</span>
                <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 18, color: "#A8001C" }}>tea</span>
              </Link>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.14em", color: "#999", marginTop: 2 }}>Got Skintea? Spill it.</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, letterSpacing: "0.14em" }}>
              {questionNumber} / {totalQuestions}
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
          key={currentStep}
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

          {isZip ? (
            <>
              <div style={{ color: C.crimson, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em" }}>
                LOCATION
              </div>
              <h1 style={{ fontSize: 24, lineHeight: 1.25, fontWeight: 800, margin: 0 }}>
                So we can show Los Angeles clinics for your area
              </h1>
              <input
                inputMode="numeric"
                value={zipInput}
                onChange={(e) => { setZipInput(e.target.value); setZipError(null); }}
                placeholder="ZIP code"
                style={{
                  padding: "12px",
                  borderRadius: 10,
                  border: `0.5px solid ${C.border}`,
                  background: C.surface,
                  color: C.espresso,
                  fontSize: 13,
                  fontWeight: 600,
                  width: "100%",
                  outline: "none",
                }}
              />
              {zipError && (
                <div style={{ color: C.crimson, fontSize: 11, fontWeight: 600 }}>{zipError}</div>
              )}
              <button
                type="button"
                onClick={skipZip}
                style={{
                  alignSelf: "flex-start",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  color: C.textLight,
                  fontSize: 12,
                  fontWeight: 700,
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                Skip
              </button>
            </>
          ) : isTreatmentPick ? (
            <>
              <div style={{ color: C.crimson, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em" }}>
                TREATMENTS
              </div>
              <h1 style={{ fontSize: 24, lineHeight: 1.25, fontWeight: 800, margin: 0 }}>
                {answers.treatment === "not_sure"
                  ? "Here's what these actually are"
                  : "Which of these are you interested in?"}
              </h1>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
                {treatments.map((t) => {
                  const selected = treatmentIds.includes(t.id);
                  const sub = answers.treatment === "not_sure" ? (t.what_it_is || t.subtitle) : t.subtitle;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTreatment(t.id)}
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
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block" }}>{t.name}</span>
                        {sub && (
                          <span
                            style={{
                              display: "block",
                              marginTop: 2,
                              fontSize: 11,
                              fontWeight: 600,
                              color: selected ? "rgba(255,255,255,0.7)" : C.textLight,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {sub}
                          </span>
                        )}
                      </span>
                      {selected && <Check size={18} style={{ flexShrink: 0, opacity: 0.9 }} />}
                    </button>
                  );
                })}
                {treatments.length === 0 && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.textLight }}>
                    Not enough data yet.
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsFirstTime((v) => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: isFirstTime ? C.espresso : C.surface,
                  color: isFirstTime ? "#fff" : C.espresso,
                  border: `0.5px solid ${isFirstTime ? C.espresso : C.border}`,
                  textAlign: "left",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  width: "100%",
                  marginTop: 4,
                }}
              >
                <span style={{ flex: 1 }}>I've never had any of these before</span>
                {isFirstTime && <Check size={18} style={{ flexShrink: 0, opacity: 0.9 }} />}
              </button>
            </>
          ) : q ? (
            <>
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
            </>
          ) : null}
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
            disabled={ctaDisabled}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: 10,
              border: "none",
              background: ctaEnabledLook ? C.crimson : "#E8DDD4",
              color: ctaEnabledLook ? "#fff" : "#999",
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: "0.02em",
              cursor: ctaEnabledLook ? "pointer" : "not-allowed",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "background 150ms ease",
            }}
          >
            {submitting
              ? "Building your profile…"
              : isTreatmentPick || (currentStep === "treatment" && currentValue === "no")
                ? <>See My Skin Profile <ArrowRight size={16} /></>
                : <>Next <ArrowRight size={16} /></>}
          </button>
          <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: C.textLight }}>
            No account needed. Your answers, skin type, ZIP, budget and treatment interest are saved with an anonymous ID so we can build your result and show clinics in the Los Angeles area.{" "}
            <Link to="/privacy" style={{ color: C.textLight, textDecoration: "underline" }}>Privacy policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
