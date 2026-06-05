import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Share2, Lock, Play, Eye, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

export const Route = createFileRoute("/treatment/$id")({
  component: TreatmentDetailPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} — Skintea` },
      { name: "description", content: "Real treatment reviews on Skintea." },
    ],
  }),
});

type Treatment = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  what_it_is: string | null;
  how_it_works: string | null;
  who_its_for: string | null;
  downtime: string | null;
  average_cost: string | null;
  sessions_recommended: string | null;
  majority_pct: number | null;
  results_pct: number | null;
  minority_opinion: string | null;
  celebrity_handles: string[] | null;
};

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const WARM = "#FFFCF8";
const BORDER = "#E8DDD4";
const MUTED = "#999999";
const TINT = "#F5EFEC";

const HANDLE_NAMES: Record<string, string> = {
  kimkardashian: "Kim Kardashian",
  haileybieber: "Hailey Bieber",
  beyonce: "Beyoncé",
  selenagomez: "Selena Gomez",
  kyliejenner: "Kylie Jenner",
  jlo: "Jennifer Lopez",
};

const labelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.14em",
  color: CRIMSON,
  textTransform: "uppercase",
};

type SocialTab = "tiktok" | "instagram" | "reddit";

type Post = { handle: string; caption: string; views: string; likes: string };

const SOCIAL_POSTS: Record<string, Record<SocialTab, Post[]>> = {
  "prf-injection": {
    tiktok: [
      { handle: "skinwithliv", caption: "My PRF results after 3 sessions 🩸", views: "1.2M", likes: "184K" },
      { handle: "dermdoctor", caption: "Why I recommend PRF over PRP", views: "890K", likes: "92K" },
      { handle: "glowby.mei", caption: "PRF before and after oily skin", views: "430K", likes: "61K" },
      { handle: "prfskinjourney", caption: "Week 6 update — the glow is real", views: "210K", likes: "27K" },
    ],
    instagram: [
      { handle: "skinwithliv", caption: "PRF changed my texture completely", views: "892K", likes: "74K" },
      { handle: "aestheticsbyla", caption: "PRF injection process explained", views: "445K", likes: "38K" },
      { handle: "glowstudiola", caption: "Client result after 2 PRF sessions", views: "210K", likes: "19K" },
      { handle: "oilyskin.diaries", caption: "Finally found what works for oily skin", views: "180K", likes: "14K" },
    ],
    reddit: [
      { handle: "u/skincarejunkie", caption: "6 months of PRF — honest review", views: "45K", likes: "2.1K" },
      { handle: "u/oilyskinproblems", caption: "PRF worth it for large pores?", views: "38K", likes: "1.8K" },
      { handle: "u/beautyrealtalks", caption: "PRF vs PRP — what nobody tells you", views: "29K", likes: "990" },
      { handle: "u/skinteareal", caption: "PRF regret post — read before booking", views: "18K", likes: "740" },
    ],
  },
  hydrafacial: {
    tiktok: [
      { handle: "glowgirlmia", caption: "Hydrafacial vs regular facial — huge difference", views: "2.1M", likes: "310K" },
      { handle: "skinprosamantha", caption: "What a Hydrafacial actually does to your pores", views: "1.4M", likes: "192K" },
      { handle: "monthlyglowup", caption: "12 months of Hydrafacials — my honest take", views: "620K", likes: "78K" },
      { handle: "lapores", caption: "Extraction footage is oddly satisfying", views: "350K", likes: "44K" },
    ],
    instagram: [
      { handle: "beautybyclara", caption: "Pre-event glow with a Hydrafacial", views: "510K", likes: "52K" },
      { handle: "dermclinicla", caption: "Behind the scenes of a Hydrafacial session", views: "280K", likes: "23K" },
      { handle: "glowstudiola", caption: "Why we recommend Hydrafacials monthly", views: "190K", likes: "17K" },
      { handle: "skintypecombo", caption: "Best maintenance facial for combo skin", views: "120K", likes: "9.4K" },
    ],
    reddit: [
      { handle: "u/skincareaddiction", caption: "Are Hydrafacials worth the money?", views: "62K", likes: "3.4K" },
      { handle: "u/poresproblems", caption: "Hydrafacial review after 6 sessions", views: "41K", likes: "2.0K" },
      { handle: "u/glowtalk", caption: "What to ask before booking a Hydrafacial", views: "28K", likes: "1.1K" },
      { handle: "u/skintea", caption: "Hydrafacial broke me out — anyone else?", views: "21K", likes: "890" },
    ],
  },
  botox: {
    tiktok: [
      { handle: "botoxbabe", caption: "My first Botox at 27 — what I wish I knew", views: "3.4M", likes: "420K" },
      { handle: "dermtokdaily", caption: "Baby Botox vs full Botox — explained", views: "1.8M", likes: "240K" },
      { handle: "frozenface.no", caption: "How to avoid that frozen look", views: "920K", likes: "118K" },
      { handle: "tox.diaries", caption: "3 month update — natural results", views: "510K", likes: "63K" },
    ],
    instagram: [
      { handle: "injectorjess", caption: "Subtle Botox placement for natural movement", views: "640K", likes: "61K" },
      { handle: "aestheticsbyla", caption: "Preventative Botox — when to start", views: "390K", likes: "32K" },
      { handle: "smoothskindiary", caption: "Forehead before/after — 14 days", views: "240K", likes: "21K" },
      { handle: "glowstudiola", caption: "Crow's feet softened — same expression", views: "150K", likes: "12K" },
    ],
    reddit: [
      { handle: "u/30sbeauty", caption: "Honest Botox cost breakdown by city", views: "88K", likes: "4.2K" },
      { handle: "u/botoxnoobs", caption: "First time Botox — questions to ask", views: "54K", likes: "2.6K" },
      { handle: "u/skincarescience", caption: "Botox science — how it actually works", views: "33K", likes: "1.4K" },
      { handle: "u/realtalkbeauty", caption: "Bad Botox experience — what went wrong", views: "26K", likes: "1.1K" },
    ],
  },
  "laser-resurfacing": {
    tiktok: [
      { handle: "lasergirl", caption: "Day-by-day laser resurfacing recovery", views: "2.8M", likes: "360K" },
      { handle: "dermdr.k", caption: "Fractional vs ablative — what's the difference", views: "1.1M", likes: "140K" },
      { handle: "scarless.story", caption: "Acne scars after 3 laser sessions", views: "780K", likes: "97K" },
      { handle: "glowafterlaser", caption: "Week 4 update — texture transformed", views: "320K", likes: "41K" },
    ],
    instagram: [
      { handle: "laserclinicla", caption: "Treating sun damage with fractional laser", views: "510K", likes: "44K" },
      { handle: "skinrenewmd", caption: "What to expect after CO2 laser", views: "290K", likes: "26K" },
      { handle: "glowstudiola", caption: "Smoother skin in 6 weeks", views: "180K", likes: "15K" },
      { handle: "deeptone.skin", caption: "Laser safety for melanin-rich skin", views: "140K", likes: "11K" },
    ],
    reddit: [
      { handle: "u/scarrevival", caption: "Laser resurfacing for acne scars — 1 year update", views: "71K", likes: "3.1K" },
      { handle: "u/skincaregeek", caption: "How I prepped for fractional laser", views: "44K", likes: "2.0K" },
      { handle: "u/melaninskinrx", caption: "Laser tips for deeper skin tones", views: "31K", likes: "1.3K" },
      { handle: "u/honestbeauty", caption: "Laser regret — wish I'd waited", views: "22K", likes: "920" },
    ],
  },
};

const POST_BGS = ["#1C0A00", "#2A1408", "#1a1020", "#0f2018"];

function TreatmentDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [clinics, setClinics] = useState<any[]>([]);
  const [skinType, setSkinType] = useState("");
  const [socialTab, setSocialTab] = useState<SocialTab>("tiktok");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const st = window.localStorage.getItem("skintea_skin_type");
      if (st) setSkinType(st.toLowerCase());
    }
    let alive = true;
    (async () => {
      const { data: t } = await supabase
        .from("treatments")
        .select("*")
        .eq("slug", id)
        .maybeSingle();
      if (!alive) return;
      setTreatment(t as Treatment | null);
      if (t) {
        const { data: ct } = await supabase
          .from("clinic_treatments")
          .select("*, clinics(*)")
          .eq("treatment_id", (t as any).id);
        if (!alive) return;
        setClinics(
          (ct ?? [])
            .filter((r: any) => r.clinics)
            .map((r: any) => ({ ...r.clinics, price_from: r.price_from })),
        );
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const matchesSkin = useMemo(() => {
    if (!skinType || !treatment?.who_its_for) return false;
    return treatment.who_its_for.toLowerCase().includes(skinType);
  }, [skinType, treatment]);

  const posts = (treatment && SOCIAL_POSTS[treatment.slug]?.[socialTab]) ?? [];

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: WARM, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 24, border: `2px solid ${BORDER}`, borderTopColor: ESPRESSO, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!treatment) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: ESPRESSO, background: WARM, minHeight: "100vh" }}>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Treatment not found.</div>
        <button onClick={() => window.history.back()} style={{ background: "none", border: "none", color: CRIMSON, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: WARM, color: ESPRESSO, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", paddingBottom: 80 }}>
      {/* 1. Sticky top bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: WARM, borderBottom: `0.5px solid ${BORDER}`, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => window.history.back()} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: ESPRESSO, display: "flex", alignItems: "center" }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ fontSize: 15, fontWeight: 700, color: ESPRESSO, flex: 1, textAlign: "center" }}>{treatment.name}</div>
        <button style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: ESPRESSO, display: "flex", alignItems: "center" }}>
          <Share2 size={20} />
        </button>
      </div>

      {/* 2. Hero */}
      <div style={{ padding: "20px 16px", borderBottom: `0.5px solid ${BORDER}` }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: ESPRESSO, marginBottom: 4, lineHeight: 1.15 }}>{treatment.name}</div>
        {treatment.subtitle && (
          <div style={{ fontSize: 13, color: MUTED, fontStyle: "italic", lineHeight: 1.4, marginBottom: 14 }}>{treatment.subtitle}</div>
        )}
        {treatment.celebrity_handles && treatment.celebrity_handles.length > 0 && (
          <>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Known for</div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
              <style>{`div::-webkit-scrollbar{display:none}`}</style>
              {treatment.celebrity_handles.map((h) => (
                <CelebChip key={h} handle={h} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* 3. Quick stats */}
      <div style={{ display: "flex", borderBottom: `0.5px solid ${BORDER}` }}>
        {[
          { label: "Downtime", value: treatment.downtime ?? "—" },
          { label: "Avg Cost", value: treatment.average_cost ?? "—" },
          { label: "Sessions", value: treatment.sessions_recommended ?? "—" },
          { label: "Who It's For", value: (treatment.who_its_for ?? "—").slice(0, 10) },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: "12px 6px", textAlign: "center", borderRight: i < 3 ? `0.5px solid ${BORDER}` : "none" }}>
            <div style={{ fontSize: 9, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: ESPRESSO, lineHeight: 1.2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 4. What It Is */}
      <Section label="What It Is">
        <p style={bodyText}>{treatment.what_it_is}</p>
      </Section>

      {/* 5. How It Works */}
      <Section label="How It Works">
        <p style={bodyText}>{treatment.how_it_works}</p>
      </Section>

      {/* 6. Who It's For */}
      <Section label="Who It's For">
        <p style={bodyText}>{treatment.who_its_for}</p>
        {matchesSkin && (
          <div style={{ display: "inline-block", marginTop: 8, background: "#E8F5E9", color: "#2D7A3A", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "4px 12px" }}>
            Good match for your skin ✓
          </div>
        )}
      </Section>

      {/* 7. What People Say */}
      <Section label="What People Say">
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          <StatBar label="Would recommend" pct={treatment.majority_pct ?? 0} />
          <StatBar label="Saw real results" pct={treatment.results_pct ?? 0} />
        </div>
        {treatment.minority_opinion && (
          <div style={{ marginTop: 12, background: TINT, borderRadius: 8, padding: "10px 12px", borderLeft: `2px solid ${BORDER}` }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
              Minority opinion
            </div>
            <div style={{ fontSize: 12, color: ESPRESSO, fontStyle: "italic", lineHeight: 1.5 }}>{treatment.minority_opinion}</div>
          </div>
        )}
      </Section>

      {/* 8. Real Talk */}
      <Section label="Real Talk">
        <div style={{ display: "flex", borderBottom: `0.5px solid ${BORDER}`, marginTop: 10 }}>
          {(["tiktok", "instagram", "reddit"] as SocialTab[]).map((t) => {
            const active = socialTab === t;
            return (
              <button
                key={t}
                onClick={() => setSocialTab(t)}
                style={{
                  background: "none",
                  border: "none",
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: 700,
                  color: active ? ESPRESSO : MUTED,
                  borderBottom: active ? `2px solid ${CRIMSON}` : "2px solid transparent",
                  cursor: "pointer",
                  textTransform: "capitalize",
                  marginBottom: -0.5,
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {posts.map((p, i) => (
            <div key={i} style={{ height: 140, borderRadius: 10, overflow: "hidden", position: "relative", background: POST_BGS[i % POST_BGS.length] }}>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -60%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(255,252,248,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Play size={16} color={WARM} fill={WARM} />
              </div>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(28,10,0,0.6)", padding: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: WARM }}>@{p.handle}</div>
                <div style={{ fontSize: 10, color: "rgba(255,252,248,0.75)", lineHeight: 1.3, marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {p.caption}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center", color: "rgba(255,252,248,0.6)", fontSize: 10 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <Eye size={10} /> {p.views}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <Heart size={10} /> {p.likes}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 9. Clinics */}
      <Section label="Clinics That Offer This">
        {skinType && (
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>Matched to your {skinType} skin</div>
        )}
        {clinics.length === 0 ? (
          <div style={{ textAlign: "center", color: MUTED, fontSize: 12, padding: "20px 0" }}>No clinics listed yet.</div>
        ) : (
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
            {clinics.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate({ to: "/clinics/$id", params: { id: c.id } })}
                style={{ background: "#fff", border: `0.5px solid ${BORDER}`, borderRadius: 10, padding: 12, width: 190, flexShrink: 0, cursor: "pointer" }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: ESPRESSO, marginBottom: 2 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>
                  {c.neighborhood ?? ""}{c.distance_miles ? ` · ${c.distance_miles}mi` : ""}
                </div>
                {c.price_from != null && (
                  <div style={{ fontSize: 13, fontWeight: 700, color: CRIMSON }}>From ${c.price_from}</div>
                )}
                <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                  {c.skintea_score ?? c.trust_score ?? "—"}% recommend
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: CRIMSON, marginTop: 8 }}>Book here →</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 10. Subscription lock */}
      <div style={{ margin: "16px 16px 16px", background: TINT, borderRadius: 12, padding: 16, textAlign: "center" }}>
        <Lock size={20} color={CRIMSON} style={{ marginBottom: 8 }} />
        <div style={{ fontSize: 14, fontWeight: 800, color: ESPRESSO }}>Real experiences — side effects, costs, regrets</div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 4, lineHeight: 1.5 }}>
          From real users who did this. Filtered to your skin type.
        </div>
        <button style={{ marginTop: 12, width: "100%", background: CRIMSON, color: WARM, border: "none", borderRadius: 8, padding: "13px 0", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
          Unlock Full Tea — $9.99/mo
        </button>
      </div>

      {/* 11. Spacer */}
      <div style={{ height: 80 }} />
      <BottomNav />
    </div>
  );
}

const bodyText: React.CSSProperties = {
  fontSize: 13,
  color: ESPRESSO,
  lineHeight: 1.65,
  marginTop: 8,
  marginBottom: 0,
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "14px 16px", borderBottom: `0.5px solid ${BORDER}` }}>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );
}

function StatBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 12, color: ESPRESSO, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 14, color: CRIMSON, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ marginTop: 4, height: 5, background: "#F0EAE4", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: CRIMSON, borderRadius: 3 }} />
      </div>
    </div>
  );
}

function CelebChip({ handle }: { handle: string }) {
  const [imgError, setImgError] = useState(false);
  const name = HANDLE_NAMES[handle] ?? handle;
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <a
      href={`https://instagram.com/${handle}`}
      target="_blank"
      rel="noreferrer"
      style={{ display: "flex", alignItems: "center", gap: 6, background: TINT, borderRadius: 4, padding: "4px 10px", textDecoration: "none", flexShrink: 0 }}
    >
      {imgError ? (
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#C9A98A", color: WARM, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {initials}
        </div>
      ) : (
        <img
          src={`https://unavatar.io/instagram/${handle}`}
          alt={name}
          onError={() => setImgError(true)}
          style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }}
        />
      )}
      <span style={{ fontSize: 11, fontWeight: 700, color: ESPRESSO, whiteSpace: "nowrap" }}>{name} did this</span>
    </a>
  );
}