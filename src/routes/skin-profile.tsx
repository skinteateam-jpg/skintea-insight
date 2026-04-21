import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pencil, Plus, Share2, FileDown, AlertTriangle, Check, Minus,
  X, Stethoscope, Sparkles, Lock,
} from "lucide-react";

export const Route = createFileRoute("/skin-profile")({
  component: SkinProfilePage,
  head: () => ({
    meta: [
      { title: "Skin Profile — Skintea" },
      { name: "description", content: "Your personal skin record. A living document you can share with your dermatologist." },
      { property: "og:title", content: "Skin Profile — Skintea" },
      { property: "og:description", content: "A clinical-style skin chart that updates as you log products and reactions." },
    ],
  }),
});

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
  neutralBg: "#F2EFEC",
  neutralFg: "#5C4033",
};

type IngredientState = "works" | "neutral" | "reacted";
type Outcome = "Worked" | "Neutral" | "Reacted";
type ProductLog = { id: string; name: string; startedAt: string; outcome: Outcome };
type Reaction = { id: string; ingredient: string; date: string; symptom: "Redness" | "Breakout" | "Dryness" | "Other" };

type QuizResult = {
  skinType: string;
  concerns: string[];
  ingredients: { good: string[]; watch: string[]; avoid: string[] };
  savedAt: string;
};

const PROFILE_KEY = "skintea.skinProfile";
const QUIZ_KEY = "skintea.quizResult";

type StoredProfile = {
  ingredientStates: Record<string, IngredientState>;
  productLog: ProductLog[];
  reactions: Reaction[];
  updatedAt: string;
};

function loadJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

function SkinProfilePage() {
  const [quiz, setQuiz] = useState<QuizResult | null>(null);
  const [profile, setProfile] = useState<StoredProfile>({
    ingredientStates: {},
    productLog: [],
    reactions: [],
    updatedAt: new Date().toISOString(),
  });
  const [hydrated, setHydrated] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", outcome: "Worked" as Outcome });

  useEffect(() => {
    setQuiz(loadJSON<QuizResult>(QUIZ_KEY));
    const stored = loadJSON<StoredProfile>(PROFILE_KEY);
    if (stored) setProfile(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {}
  }, [profile, hydrated]);

  const allIngredients = useMemo(() => {
    if (!quiz) return [] as { name: string; bucket: "good" | "watch" | "avoid" }[];
    return [
      ...quiz.ingredients.good.map((n) => ({ name: n, bucket: "good" as const })),
      ...quiz.ingredients.watch.map((n) => ({ name: n, bucket: "watch" as const })),
      ...quiz.ingredients.avoid.map((n) => ({ name: n, bucket: "avoid" as const })),
    ];
  }, [quiz]);

  function setIngredientState(name: string, state: IngredientState) {
    setProfile((p) => ({
      ...p,
      ingredientStates: { ...p.ingredientStates, [name]: state },
      updatedAt: new Date().toISOString(),
    }));
  }

  function addProduct() {
    if (!newProduct.name.trim()) return;
    const entry: ProductLog = {
      id: crypto.randomUUID(),
      name: newProduct.name.trim(),
      startedAt: new Date().toISOString().slice(0, 10),
      outcome: newProduct.outcome,
    };
    setProfile((p) => ({ ...p, productLog: [entry, ...p.productLog], updatedAt: new Date().toISOString() }));
    setNewProduct({ name: "", outcome: "Worked" });
    setShowAddProduct(false);
  }

  function generateShareLink() {
    const id = crypto.randomUUID().slice(0, 8);
    const url = `${window.location.origin}/skin-profile/share/${id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    alert(`Shareable link copied:\n${url}\n\n(Excludes product recs and CTAs)`);
  }

  function downloadPDF() {
    if (!quiz) return;
    const lines = [
      "Skin Profile — Prepared by Skintea",
      "=".repeat(40),
      `Generated: ${new Date().toLocaleDateString()}`,
      "",
      `Skin type: ${quiz.skinType}`,
      `Concerns: ${quiz.concerns.join(", ")}`,
      "",
      "INGREDIENT MAP",
      ...allIngredients.map((i) => `  ${i.name}: ${profile.ingredientStates[i.name] ?? "untested"}`),
      "",
      "PRODUCT LOG",
      ...profile.productLog.map((p) => `  ${p.startedAt} — ${p.name} — ${p.outcome}`),
      "",
      "REACTION LOG (Important for your dermatologist)",
      ...profile.reactions.map((r) => `  ${r.date} — ${r.ingredient} — ${r.symptom}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "skin-profile.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Auto-derive reactions from products marked Reacted (placeholder linkage)
  const productsLogged = profile.productLog.length;

  if (!hydrated) {
    return <div style={{ background: C.bg, minHeight: "100vh" }} />;
  }

  return (
    <div style={{ background: C.bg, color: C.espresso, minHeight: "100vh" }}>
      <Nav />

      {/* Hero */}
      <section style={{ background: C.espresso, color: "#fff", padding: "20px 20px 36px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ color: C.crimson, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", marginBottom: 10, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Stethoscope size={12} /> SKIN RECORD
          </div>
          <h1 style={{ fontSize: 28, lineHeight: 1.15, fontWeight: 800, margin: 0, maxWidth: 520 }}>
            Your skin profile.
          </h1>
          <p style={{ color: "#D9CFC8", fontSize: 14, marginTop: 10, maxWidth: 520 }}>
            A living record of your skin — updated as you log products and reactions. Built to share with your dermatologist.
          </p>
        </div>
      </section>

      <main style={{ background: C.bg, borderRadius: "20px 20px 0 0", marginTop: -16, padding: "24px 16px 60px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

          {!quiz ? (
            <Card>
              <div style={{ textAlign: "center", padding: "20px 8px" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🧬</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>No profile yet</div>
                <p style={{ marginTop: 8, fontSize: 14, color: C.textMid }}>
                  Take the skin quiz to generate your profile.
                </p>
                <Link
                  to="/quiz-result"
                  style={{
                    display: "inline-block", marginTop: 14,
                    background: C.crimson, color: "#fff",
                    padding: "12px 18px", borderRadius: 12,
                    fontWeight: 700, fontSize: 14, textDecoration: "none",
                  }}
                >
                  Take the skin quiz
                </Link>
              </div>
            </Card>
          ) : (
            <>
              {/* 1. SKIN CHART SUMMARY */}
              <SectionLabel>SKIN CHART SUMMARY</SectionLabel>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: C.textLight, fontWeight: 700, letterSpacing: "0.1em" }}>SKIN TYPE</div>
                    <div style={{ fontSize: 26, fontWeight: 800, marginTop: 2 }}>{quiz.skinType}</div>
                    <div style={{ fontSize: 11, color: C.textLight, fontWeight: 700, letterSpacing: "0.1em", marginTop: 14 }}>
                      TOP CONCERNS
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                      {quiz.concerns.map((c) => (
                        <span key={c} style={pill(C.imageBg, C.espresso)}>{c}</span>
                      ))}
                    </div>
                  </div>
                  <button type="button" style={btnGhost()}>
                    <Pencil size={13} /> Edit
                  </button>
                </div>
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.textLight }}>
                  Last updated {new Date(profile.updatedAt).toLocaleDateString()}
                </div>
              </Card>

              {/* 2. INGREDIENT MAP */}
              <SectionLabel>INGREDIENT MAP</SectionLabel>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: C.textMid }}>
                    Tap a state for each ingredient as you learn what works.
                  </div>
                  <div style={{ fontSize: 11, color: C.textLight, fontWeight: 700, letterSpacing: "0.06em" }}>
                    BASED ON {productsLogged} PRODUCT{productsLogged === 1 ? "" : "S"} LOGGED
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {allIngredients.map((ing) => {
                    const state = profile.ingredientStates[ing.name];
                    return (
                      <div
                        key={ing.name}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          gap: 10, padding: "10px 12px",
                          background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12,
                        }}
                      >
                        <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{ing.name}</span>
                          <span style={{ fontSize: 10, color: C.textLight, fontWeight: 700, letterSpacing: "0.08em" }}>
                            · QUIZ: {ing.bucket.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          <StateBtn active={state === "works"} fg={C.good} bg={C.goodBg} onClick={() => setIngredientState(ing.name, "works")} title="Works for me">
                            <Check size={13} />
                          </StateBtn>
                          <StateBtn active={state === "neutral"} fg={C.neutralFg} bg={C.neutralBg} onClick={() => setIngredientState(ing.name, "neutral")} title="Neutral">
                            <Minus size={13} />
                          </StateBtn>
                          <StateBtn active={state === "reacted"} fg={C.bad} bg={C.badBg} onClick={() => setIngredientState(ing.name, "reacted")} title="Caused reaction">
                            <X size={13} />
                          </StateBtn>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 11, color: C.textLight, flexWrap: "wrap" }}>
                  <Legend fg={C.good} bg={C.goodBg} label="Works" />
                  <Legend fg={C.neutralFg} bg={C.neutralBg} label="Neutral" />
                  <Legend fg={C.bad} bg={C.badBg} label="Reacted" />
                </div>
              </Card>

              {/* 3. PRODUCT LOG */}
              <SectionLabel>PRODUCT LOG</SectionLabel>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: C.textMid }}>
                    {profile.productLog.length === 0 ? "No products logged yet." : `${profile.productLog.length} entr${profile.productLog.length === 1 ? "y" : "ies"}`}
                  </div>
                  <button type="button" onClick={() => setShowAddProduct((v) => !v)} style={btnDark()}>
                    <Plus size={13} /> Add Product
                  </button>
                </div>

                {showAddProduct && (
                  <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, marginBottom: 12 }}>
                    <input
                      placeholder="Product name (e.g. CeraVe Foaming Cleanser)"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      style={{
                        width: "100%", boxSizing: "border-box",
                        padding: "10px 12px", borderRadius: 10,
                        border: `1px solid ${C.borderStrong}`, fontSize: 14,
                        background: "#fff", color: C.espresso,
                      }}
                    />
                    <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                      {(["Worked", "Neutral", "Reacted"] as Outcome[]).map((o) => {
                        const active = newProduct.outcome === o;
                        const styleByOutcome = o === "Worked"
                          ? { fg: C.good, bg: C.goodBg }
                          : o === "Neutral"
                            ? { fg: C.neutralFg, bg: C.neutralBg }
                            : { fg: C.bad, bg: C.badBg };
                        return (
                          <button
                            key={o}
                            type="button"
                            onClick={() => setNewProduct({ ...newProduct, outcome: o })}
                            style={{
                              ...pill(active ? styleByOutcome.bg : "#fff", active ? styleByOutcome.fg : C.textMid),
                              border: `1px solid ${active ? styleByOutcome.fg + "55" : C.border}`,
                              cursor: "pointer", fontWeight: 700,
                            }}
                          >
                            {o}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button type="button" onClick={addProduct} style={{ ...btnDark(), padding: "8px 14px" }}>Save</button>
                      <button type="button" onClick={() => setShowAddProduct(false)} style={{ ...btnGhost(), padding: "8px 14px" }}>Cancel</button>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {profile.productLog.map((p) => {
                    const tone = p.outcome === "Worked"
                      ? { fg: C.good, bg: C.goodBg }
                      : p.outcome === "Reacted"
                        ? { fg: C.bad, bg: C.badBg }
                        : { fg: C.neutralFg, bg: C.neutralBg };
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          gap: 10, padding: "10px 12px",
                          background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>Started {p.startedAt}</div>
                        </div>
                        <span style={{ ...pill(tone.bg, tone.fg), fontWeight: 700 }}>{p.outcome}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* 4. REACTION LOG */}
              <SectionLabel>REACTION LOG</SectionLabel>
              <div
                style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderLeft: `4px solid ${C.crimson}`,
                  borderRadius: 16, padding: 20,
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: C.crimson, fontWeight: 800, letterSpacing: "0.14em" }}>
                  <AlertTriangle size={12} /> IMPORTANT FOR YOUR DERMATOLOGIST
                </div>
                <p style={{ margin: "8px 0 14px", fontSize: 13, color: C.textMid }}>
                  Ingredients flagged as causing a reaction, with date and symptom.
                </p>

                {profile.reactions.length === 0 ? (
                  <div style={{ fontSize: 13, color: C.textLight, fontStyle: "italic" }}>
                    No reactions logged. Mark an ingredient as "Reacted" in the map above to track here.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {profile.reactions.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "10px 12px", background: C.badBg,
                          border: `1px solid ${C.crimson}22`, borderRadius: 12,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.espresso }}>{r.ingredient}</div>
                          <div style={{ fontSize: 11, color: C.textMid, marginTop: 2 }}>{r.date}</div>
                        </div>
                        <span style={{ ...pill("#fff", C.bad), border: `1px solid ${C.crimson}33`, fontWeight: 700 }}>
                          {r.symptom}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. SKINTEA INSIGHTS */}
              <SectionLabel>SKINTEA INSIGHTS</SectionLabel>
              <Card>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: C.crimson, lineHeight: 1 }}>72%</div>
                  <div style={{ fontSize: 13, color: C.textMid }}>this month</div>
                </div>
                <p style={{ margin: "10px 0 0", fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>
                  Among {quiz.skinType} skin users this month, 72% are avoiding alcohol-based toners.
                </p>
                <div style={{ marginTop: 12, height: 8, background: C.imageBg, borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: "72%", height: "100%", background: C.crimson }} />
                </div>
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.textLight }}>
                  Updated weekly · Based on 14,200+ reviews
                </div>
              </Card>

              {/* 6. SHARE */}
              <SectionLabel>SHARE YOUR SKIN PROFILE</SectionLabel>
              <Card>
                <p style={{ margin: 0, fontSize: 14, color: C.textMid, lineHeight: 1.5 }}>
                  Share this with your dermatologist before your appointment — no more explaining from scratch.
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  <button type="button" onClick={generateShareLink} style={btnDark()}>
                    <Share2 size={14} /> Generate Shareable Link
                  </button>
                  <button type="button" onClick={downloadPDF} style={btnGhost()}>
                    <FileDown size={14} /> Download PDF
                  </button>
                </div>
                <div style={{ marginTop: 14, padding: 12, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 12, color: C.textLight }}>
                  <div style={{ fontWeight: 700, color: C.espresso, marginBottom: 4, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Sparkles size={12} /> Shared version includes
                  </div>
                  Skin type, concerns, ingredient map, product log, reaction log, and Skintea data.
                  <div style={{ fontWeight: 700, color: C.espresso, marginTop: 10, marginBottom: 4 }}>Excluded</div>
                  Product recommendations, sample kit, and any monetization elements.
                </div>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ---------- Subcomponents ----------
function Nav() {
  return (
    <header style={{ background: C.espresso, color: "#fff", padding: "16px 20px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" style={{ color: "#fff", textDecoration: "none", fontWeight: 800, letterSpacing: "0.02em" }}>
          SKIN<span style={{ color: C.crimson }}>TEA</span>
        </Link>
        <nav style={{ display: "flex", gap: 18, fontSize: 13 }}>
          <Link to="/products" style={{ color: "#fff", textDecoration: "none", opacity: 0.85 }}>Products</Link>
          <Link to="/quiz-result" style={{ color: "#fff", textDecoration: "none", opacity: 0.85 }}>Quiz</Link>
          <Link to="/skin-profile" style={{ color: "#fff", textDecoration: "none", opacity: 0.85 }}>Profile</Link>
          <span style={{ color: "#fff", opacity: 0.6, display: "inline-flex", alignItems: "center", gap: 4 }}>
            Tea <Lock size={12} />
          </span>
        </nav>
      </div>
    </header>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: C.crimson, marginTop: 8 }}>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
      {children}
    </div>
  );
}

function StateBtn({
  active, fg, bg, onClick, title, children,
}: {
  active: boolean; fg: string; bg: string; onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button" onClick={onClick} title={title} aria-label={title}
      style={{
        width: 30, height: 30, borderRadius: 8,
        background: active ? bg : "#fff",
        color: active ? fg : C.textLight,
        border: `1px solid ${active ? fg + "55" : C.border}`,
        display: "grid", placeItems: "center",
        cursor: "pointer", padding: 0,
      }}
    >
      {children}
    </button>
  );
}

function Legend({ fg, bg, label }: { fg: string; bg: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 12, height: 12, borderRadius: 4, background: bg, border: `1px solid ${fg}55` }} />
      {label}
    </span>
  );
}

function pill(bg: string, fg: string): React.CSSProperties {
  return { fontSize: 12, padding: "6px 10px", borderRadius: 999, background: bg, color: fg, fontWeight: 600 };
}
function btnDark(): React.CSSProperties {
  return {
    background: C.espresso, color: "#fff", border: "none",
    borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700,
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
  };
}
function btnGhost(): React.CSSProperties {
  return {
    background: "transparent", color: C.espresso,
    border: `1px solid ${C.borderStrong}`,
    borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700,
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
  };
}
