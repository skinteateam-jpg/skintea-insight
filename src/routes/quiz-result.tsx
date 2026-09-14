import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Lock, Check, AlertTriangle, X, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MIN_TAGGED, isOpinionRow, aggregate } from "@/lib/opinionAggregate";
import { getLeadSessionId } from "@/lib/leadSession";

export const Route = createFileRoute("/quiz-result")({
  component: QuizResultPage,
  head: () => ({
    meta: [
      { title: "Your Skin Profile — Skintea" },
      {
        name: "description",
        content:
          "Your skin type, ingredient list, and the products real tagged opinions say fit or do not fit your skin.",
      },
      { property: "og:title", content: "Your Skin Profile — Skintea" },
      {
        property: "og:description",
        content: "Your skin result, computed from tagged opinions — never from invented numbers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

// ---------- Brand tokens ----------
const C = { espresso: "#1C0A00", crimson: "#A8001C", bg: "#FFFCF8", surface: "#FFFFFF", border: "#E8DDD4", borderStrong: "#E8DDD4", textMid: "#1C0A00", textLight: "#999999", imageBg: "#FFFCF8", good: "#2D7A3A", goodBg: "#F0FAF1", warn: "#A87400", warnBg: "#FFFBEB", bad: "#A8001C", badBg: "#FFF5F5" };

type CharacterKey = "glazed-donut" | "desert-girl" | "mood-board" | "unbothered" | "main-character";

const CHARACTER_HASHTAGS: Record<CharacterKey, string[]> = { "glazed-donut": ["#butterface", "#glossynotgreasy", "#oilygirlswin", "#blotterqueen", "#myskinismoisturized"], "desert-girl": ["#perpetuallythirsty", "#dryskingang", "#moisturizeordie", "#creameverything", "#flakingbutmakingit"], "mood-board": ["#skintypecontradiction", "#tzonechaos", "#itsgivingbothsides", "#combogirlproblems", "#skinmoodswings"], "unbothered": ["#lowmaintenance", "#skinjustworks", "#cleangirlaesthetic", "#normalbutmakeittrendy", "#dontfixwhatsnotbroken"], "main-character": ["#sensitivequeeen", "#gentleornothanks", "#myskinhasopinions", "#fragrancefreelife", "#everythingbreaksmeout"] };

const SKIN_TYPES = ["oily", "dry", "combination", "sensitive", "normal"] as const;
type SkinType = (typeof SKIN_TYPES)[number];

type Payload = {
  skinType?: string;
  skinTypeLabel?: string;
  character?: CharacterKey;
  persona?: { name: string; emoji: string; tagline: string };
  concerns?: string[];
  ingredients?: { good: string[]; watch: string[]; avoid: string[] };
  treatmentInterest?: string | null;
  treatmentIds?: string[];
};

type ProductResult = {
  id: string;
  brand: string | null;
  name: string;
  pct: number;
  n: number;
};

type TreatmentRow = {
  id: string;
  name: string;
  subtitle: string | null;
  average_cost: string | null;
  downtime: string | null;
};

function QuizResultPage() {
  const [loadedPayload, setLoadedPayload] = useState(false);
  const [payload, setPayload] = useState<Payload | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("skintea.quizResult");
      if (raw) setPayload(JSON.parse(raw) as Payload);
    } catch (e) {
      console.error("Failed to read quiz result", e);
    }
    setLoadedPayload(true);
  }, []);

  const skinType = useMemo<SkinType | null>(() => {
    const st = String(payload?.skinType ?? "").toLowerCase();
    return (SKIN_TYPES as readonly string[]).includes(st) ? (st as SkinType) : null;
  }, [payload]);

  // Computed on read, every time. Nothing is stored.
  const [fits, setFits] = useState<ProductResult[]>([]);
  const [misses, setMisses] = useState<ProductResult[]>([]);
  const [maxTagged, setMaxTagged] = useState(0);
  const [opinionsLoaded, setOpinionsLoaded] = useState(false);

  useEffect(() => {
    if (!skinType) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("social_review_tags")
          .select("product_id, brand, sentiment, skin_type")
          .not("sentiment", "is", null)
          .eq("skin_type", skinType);
        if (error) throw error;

        const groups = new Map<string, any[]>();
        for (const row of data ?? []) {
          const pid = (row as any).product_id;
          if (!pid) continue;
          if (!isOpinionRow(row)) continue;
          const list = groups.get(pid) ?? [];
          list.push(row);
          groups.set(pid, list);
        }

        let best = 0;
        const qualifying: { id: string; pct: number; n: number }[] = [];
        for (const [pid, rows] of groups) {
          if (rows.length > best) best = rows.length;
          if (rows.length < MIN_TAGGED) continue;
          const agg = aggregate(rows);
          if (agg.recommendPct == null) continue;
          qualifying.push({ id: pid, pct: agg.recommendPct, n: agg.total });
        }
        if (cancelled) return;
        setMaxTagged(best);

        let products: Record<string, { name: string; brand: string | null }> = {};
        if (qualifying.length) {
          const { data: prods, error: prodErr } = await supabase
            .from("products")
            .select("id, name, brand, image_url")
            .in("id", qualifying.map((q) => q.id));
          if (prodErr) throw prodErr;
          for (const p of prods ?? []) {
            products[(p as any).id] = { name: (p as any).name, brand: (p as any).brand };
          }
        }
        if (cancelled) return;

        const resolved: ProductResult[] = qualifying
          .filter((q) => products[q.id])
          .map((q) => ({ id: q.id, name: products[q.id].name, brand: products[q.id].brand, pct: q.pct, n: q.n }));

        const sorter = (a: ProductResult, b: ProductResult) => b.pct - a.pct || b.n - a.n;
        setFits(resolved.filter((r) => r.pct >= 50).sort(sorter).slice(0, 4));
        setMisses(resolved.filter((r) => r.pct < 50).sort(sorter).slice(0, 4));
      } catch (e) {
        console.error("Failed to load tagged opinions", e);
      } finally {
        if (!cancelled) setOpinionsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [skinType]);

  // Treatments the user actually selected.
  const treatmentInterest = payload?.treatmentInterest ?? null;
  const treatmentIds = payload?.treatmentIds ?? [];
  const showTreatments = treatmentInterest === "yes" || treatmentInterest === "not_sure";
  const [treatments, setTreatments] = useState<TreatmentRow[]>([]);

  useEffect(() => {
    if (!showTreatments || !treatmentIds.length) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("treatments")
          .select("id, name, subtitle, average_cost, downtime")
          .in("id", treatmentIds);
        if (error) throw error;
        if (!cancelled) setTreatments((data ?? []) as TreatmentRow[]);
      } catch (e) {
        console.error("Failed to load treatments", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showTreatments, treatmentIds.join(",")]);

  if (!loadedPayload) return <div style={{ background: C.bg, minHeight: "100vh" }} />;

  if (!payload || !skinType) {
    return (
      <div style={{ background: C.bg, color: C.espresso, minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 340 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 24, marginBottom: 10 }}>
            No result yet
          </div>
          <p style={{ fontSize: 13, color: C.textLight, lineHeight: 1.6, marginTop: 0 }}>
            Take the quiz and your result appears here.
          </p>
          <Link
            to="/quiz"
            style={{ display: "inline-block", marginTop: 14, background: C.crimson, color: "#FFFCF8", borderRadius: 99, padding: "12px 22px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}
          >
            Take the quiz
          </Link>
        </div>
      </div>
    );
  }

  const persona = payload.persona ?? null;
  const character = (payload.character ?? "glazed-donut") as CharacterKey;
  const hashtags = CHARACTER_HASHTAGS[character] ?? CHARACTER_HASHTAGS["glazed-donut"];
  const skinTypeLabel = payload.skinTypeLabel ?? skinType.charAt(0).toUpperCase() + skinType.slice(1);
  const concerns = payload.concerns ?? [];
  const ingredients = payload.ingredients ?? null;

  return (
    <div style={{ background: C.bg, color: C.espresso, minHeight: "100vh" }}>
      {/* Top nav */}
      <header style={{ background: C.espresso, color: "#fff", padding: "16px 20px" }}>
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
        {persona && (
          <div style={{ position: "relative", marginBottom: 16 }}>
            <div style={{ position: "absolute", inset: -10, borderRadius: 32, background: "radial-gradient(ellipse at center, rgba(168,0,28,0.2), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ width: 120, height: 120, borderRadius: 28, background: "linear-gradient(145deg, #2a1200, #3d1a00)", border: "1.5px solid rgba(168,0,28,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 62 }}>
              {persona.emoji}
            </div>
          </div>
        )}
        {persona && (
          <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 28, color: "#FFFCF8", textAlign: "center", lineHeight: 1.1, marginBottom: 4 }}>
            {persona.name}
          </div>
        )}
        <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,252,248,0.45)", textAlign: "center", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
          {skinTypeLabel} Skin
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
      {persona && (
        <div style={{ background: "#FFFCF8", borderRadius: "16px 16px 0 0", padding: "18px 18px 0" }}>
          <div style={{ fontSize: 13, color: "#1C0A00", lineHeight: 1.65, fontStyle: "italic", textAlign: "center", paddingBottom: 16, borderBottom: "0.5px solid #E8DDD4" }}>
            "{persona.tagline}"
          </div>
        </div>
      )}

      <main style={{ background: C.bg, padding: "24px 16px 60px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 4 }}>

          {/* TOP CONCERNS */}
          {concerns.length > 0 && (
            <>
              <SectionLabel>TOP CONCERNS</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {concerns.map((c) => (
                  <span
                    key={c}
                    style={{ fontSize: 12, padding: "6px 10px", borderRadius: 999, background: C.imageBg, color: C.espresso, fontWeight: 600, border: `0.5px solid ${C.border}` }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* INGREDIENT LIST */}
          {ingredients && (
            <>
              <SectionLabel>YOUR INGREDIENT LIST</SectionLabel>
              <Card>
                <IngredientGroup title="Good for you" icon={<Check size={14} />} fg={C.good} bg={C.goodBg} items={ingredients.good ?? []} />
                <div style={{ height: 12 }} />
                <IngredientGroup title="Watch out" icon={<AlertTriangle size={14} />} fg={C.warn} bg={C.warnBg} items={ingredients.watch ?? []} />
                <div style={{ height: 12 }} />
                <IngredientGroup title="Avoid" icon={<X size={14} />} fg={C.bad} bg={C.badBg} items={ingredients.avoid ?? []} />
                <p style={{ marginTop: 14, marginBottom: 0, fontSize: 12, color: C.textLight, fontStyle: "italic" }}>
                  From the ingredient list, not from reviews.
                </p>
              </Card>
            </>
          )}

          {/* FITS YOU */}
          <SectionLabel>FITS YOU</SectionLabel>
          <ProductSection
            products={fits}
            loaded={opinionsLoaded}
            skinTypeLabel={skinTypeLabel}
            maxTagged={maxTagged}
          />

          {/* DOES NOT FIT YOU */}
          <SectionLabel>DOES NOT FIT YOU</SectionLabel>
          <ProductSection
            products={misses}
            loaded={opinionsLoaded}
            skinTypeLabel={skinTypeLabel}
            maxTagged={maxTagged}
          />

          {/* TREATMENTS */}
          {showTreatments && treatments.length > 0 && (
            <>
              <SectionLabel>TREATMENTS YOU PICKED</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {treatments.map((t) => (
                  <div key={t.id} style={{ background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.espresso, lineHeight: 1.3 }}>{t.name}</div>
                    {t.subtitle && (
                      <div style={{ fontSize: 12, color: C.textLight, marginTop: 3, lineHeight: 1.5 }}>{t.subtitle}</div>
                    )}
                    {(t.average_cost || t.downtime) && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 10 }}>
                        {t.average_cost && (
                          <div>
                            <div style={{ fontSize: 10, color: C.textLight, fontWeight: 600 }}>Average cost</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.espresso }}>{t.average_cost}</div>
                          </div>
                        )}
                        {t.downtime && (
                          <div>
                            <div style={{ fontSize: 10, color: C.textLight, fontWeight: 600 }}>Downtime</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.espresso }}>{t.downtime}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* EMAIL — after the result, never before it */}
          <SectionLabel>STAY IN THE LOOP</SectionLabel>
          <EmailCapture />

          {/* Retake */}
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <Link
              to="/quiz"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: C.textMid, textDecoration: "underline", textUnderlineOffset: 4 }}
            >
              <RotateCcw size={14} /> Retake quiz
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

// ---------- Product sections ----------
function ProductSection({
  products,
  loaded,
  skinTypeLabel,
  maxTagged,
}: {
  products: ProductResult[];
  loaded: boolean;
  skinTypeLabel: string;
  maxTagged: number;
}) {
  if (!loaded) {
    return (
      <div style={{ border: `0.5px dashed ${C.border}`, borderRadius: 12, padding: 18, fontSize: 13, color: C.textLight }}>
        Loading tagged opinions…
      </div>
    );
  }
  if (!products.length) {
    return (
      <div style={{ border: `1px dashed ${C.border}`, borderRadius: 12, padding: 18, background: C.surface }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.espresso }}>Not enough data yet</div>
        <div style={{ fontSize: 12, color: C.textLight, marginTop: 5, lineHeight: 1.5 }}>
          {maxTagged < MIN_TAGGED
            ? `${maxTagged} of ${MIN_TAGGED} tagged opinions so far for ${skinTypeLabel.toLowerCase()} skin.`
            : `No product falls in this range yet for ${skinTypeLabel.toLowerCase()} skin. Best so far: ${maxTagged} tagged opinions.`}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {products.map((p) => (
        <Link
          key={p.id}
          to="/product-detail/$id"
          params={{ id: p.id }}
          style={{ textDecoration: "none", background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 14, display: "block" }}
        >
          {p.brand && <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600 }}>{p.brand}</div>}
          <div style={{ fontSize: 14, fontWeight: 700, color: C.espresso, lineHeight: 1.3, marginTop: 2 }}>{p.name}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.crimson, lineHeight: 1 }}>{p.pct}%</div>
            <div style={{ fontSize: 12, color: C.textLight }}>{p.n} tagged opinions</div>
          </div>
          <div style={{ marginTop: 8, height: 6, background: C.imageBg, borderRadius: 999, overflow: "hidden", border: `0.5px solid ${C.border}` }}>
            <div style={{ width: `${p.pct}%`, height: "100%", background: C.crimson }} />
          </div>
        </Link>
      ))}
    </div>
  );
}

// ---------- Email capture ----------
function EmailCapture() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setSent(true);
    try {
      const sessionId = getLeadSessionId();
      if (!sessionId) return;
      await supabase.rpc("lead_upsert" as any, {
        p_session_id: sessionId,
        p_email: trimmed,
        p_contact_consent: consent,
      } as any);
      await supabase.rpc("lead_event_add" as any, {
        p_session_id: sessionId,
        p_event_type: "email_submitted",
      } as any);
    } catch (e) {
      console.error("Failed to submit email", e);
    }
  }

  return (
    <Card>
      {sent ? (
        <div style={{ fontSize: 13, color: C.espresso, lineHeight: 1.6 }}>Thanks — we have your email.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            aria-label="Email"
            style={{ width: "100%", boxSizing: "border-box", border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, color: C.espresso, background: C.bg, outline: "none" }}
          />
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: C.textMid, lineHeight: 1.5 }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 2 }} />
            You can contact me about treatments near me
          </label>
          <button
            type="button"
            onClick={() => void submit()}
            style={{ background: C.crimson, color: "#FFFCF8", border: "none", borderRadius: 99, padding: "12px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            Submit
          </button>
        </div>
      )}
    </Card>
  );
}

// ---------- Subcomponents ----------
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", color: "#A8001C", textTransform: "uppercase", marginTop: 18, marginBottom: 10 }}>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#FFFFFF", border: "0.5px solid #E8DDD4", borderRadius: 12, padding: 20 }}>
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
        <span style={{ width: 22, height: 22, borderRadius: 999, background: bg, color: fg, display: "grid", placeItems: "center" }}>
          {icon}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: fg }}>{title}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((i) => (
          <span
            key={i}
            style={{ fontSize: 12, padding: "6px 10px", borderRadius: 999, background: bg, color: fg, fontWeight: 600, border: `1px solid ${fg}22` }}
          >
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}
