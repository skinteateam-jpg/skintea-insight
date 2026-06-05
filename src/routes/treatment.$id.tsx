import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Share2,
  Lock,
  Play,
  Eye,
  Heart,
  MapPin,
  ArrowUp,
  MessageCircle,
  Droplet,
  Syringe,
  Zap,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

export const Route = createFileRoute("/treatment/$id")({
  component: TreatmentDetailPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} — Skintea` },
      { name: "description", content: "Real treatment reviews on Skintea." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap",
      },
    ],
  }),
});

type Treatment = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  category: string | null;
  what_it_is: string | null;
  how_it_works: string | null;
  who_its_for: string | null;
  downtime: string | null;
  average_cost: string | null;
  sessions_recommended: string | null;
  best_for_skin: string | null;
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
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const SERIF = "'Playfair Display', Georgia, serif";

const CELEB_NAMES: Record<string, string> = {
  kimkardashian: "Kim Kardashian",
  haileybieber: "Hailey Bieber",
  beyonce: "Beyoncé",
  selenagomez: "Selena Gomez",
  kyliejenner: "Kylie Jenner",
  jlo: "Jennifer Lopez",
};

type SocialTab = "tiktok" | "instagram" | "reddit";

type VideoPost = { handle: string; caption: string; views: string; likes: string };
type RedditPost = {
  subreddit: string;
  title: string;
  preview: string;
  upvotes: string;
  comments: number;
};

const SOCIAL_POSTS: Record<
  string,
  { tiktok: VideoPost[]; instagram: VideoPost[]; reddit: RedditPost[] }
> = {
  "prf-injection": {
    tiktok: [
      { handle: "skinwithliv", caption: "My PRF results after 3 sessions 🩸", views: "1.2M", likes: "184K" },
      { handle: "dermdoctor", caption: "Why I recommend PRF over PRP", views: "890K", likes: "92K" },
      { handle: "glowby.mei", caption: "PRF before and after — oily skin", views: "430K", likes: "61K" },
      { handle: "prfskinjourney", caption: "Week 6 update — the glow is real", views: "210K", likes: "27K" },
    ],
    instagram: [
      { handle: "skinwithliv", caption: "PRF changed my texture completely", views: "892K", likes: "74K" },
      { handle: "aestheticsbyla", caption: "PRF injection process explained", views: "445K", likes: "38K" },
      { handle: "glowstudiola", caption: "Client result after 2 PRF sessions", views: "210K", likes: "19K" },
      { handle: "oilyskin.diaries", caption: "Finally found what works for oily skin", views: "180K", likes: "14K" },
    ],
    reddit: [
      {
        subreddit: "r/SkincareAddiction",
        title: "6 months of PRF — honest review with before/after photos",
        preview: "I was skeptical but my derm convinced me. Here's what actually happened to my oily skin...",
        upvotes: "2.1K",
        comments: 184,
      },
      {
        subreddit: "r/30PlusSkinCare",
        title: "PRF worth it for large pores? My experience after 2 sessions",
        preview: "Has anyone tried PRF specifically for enlarged pores? I have oily skin and my derm recommended it...",
        upvotes: "1.8K",
        comments: 97,
      },
      {
        subreddit: "r/Skintea",
        title: "PRF regret post — please read before booking",
        preview: "I want to share my experience because I wish someone had warned me. Not saying don't do it, but...",
        upvotes: "740",
        comments: 203,
      },
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
      {
        subreddit: "r/SkincareAddiction",
        title: "Are Hydrafacials worth the money? 6-session review",
        preview: "After doing one every month for half a year, here's everything I noticed about my pores and texture...",
        upvotes: "3.4K",
        comments: 221,
      },
      {
        subreddit: "r/30PlusSkinCare",
        title: "Hydrafacial broke me out — anyone else?",
        preview: "Got my first Hydrafacial last week and woke up with small bumps along my jaw. Is this normal purging or...",
        upvotes: "1.1K",
        comments: 156,
      },
      {
        subreddit: "r/Skintea",
        title: "What to ask before booking a Hydrafacial",
        preview: "Quick checklist I wish I had before my first appointment — serums, pressure, add-ons...",
        upvotes: "890",
        comments: 64,
      },
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
      {
        subreddit: "r/30PlusSkinCare",
        title: "Honest Botox cost breakdown by city",
        preview: "Compiled prices from 12 cities so you know what fair pricing looks like before walking in...",
        upvotes: "4.2K",
        comments: 312,
      },
      {
        subreddit: "r/SkincareAddiction",
        title: "First time Botox — questions to ask your injector",
        preview: "List of everything I asked before letting anyone near my face with a needle. Saved me from a bad result...",
        upvotes: "2.6K",
        comments: 188,
      },
      {
        subreddit: "r/Skintea",
        title: "Bad Botox experience — what went wrong",
        preview: "Drooping eyebrow for 8 weeks. Sharing photos and what I learned so you don't make the same mistake...",
        upvotes: "1.1K",
        comments: 247,
      },
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
      {
        subreddit: "r/SkincareAddiction",
        title: "Laser resurfacing for acne scars — 1 year update",
        preview: "Three sessions later, here are the photos and the exact protocol my derm used. Real results, real cost...",
        upvotes: "3.1K",
        comments: 214,
      },
      {
        subreddit: "r/30PlusSkinCare",
        title: "How I prepped for fractional laser (and what I'd skip)",
        preview: "Two weeks of pre-treatment routine, products that helped, and the one thing my derm told me to stop using...",
        upvotes: "2.0K",
        comments: 132,
      },
      {
        subreddit: "r/Skintea",
        title: "Laser tips for deeper skin tones — read before booking",
        preview: "Hyperpigmentation risk is real. Here's what to look for in a provider and the questions that matter most...",
        upvotes: "1.3K",
        comments: 178,
      },
    ],
  },
};

const POST_BGS = ["#1C0A00", "#2A1408", "#1a1020", "#0f2018"];

const labelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.14em",
  color: CRIMSON,
  textTransform: "uppercase",
};

function pickHeroIcon(slug: string) {
  if (slug === "botox") return Syringe;
  if (slug === "laser-resurfacing") return Zap;
  if (slug === "hydrafacial") return Droplet;
  if (slug === "prf-injection") return Droplet;
  return Sparkles;
}

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
      const qr = window.localStorage.getItem("skintea.quizResult");
      if (st) setSkinType(st.toLowerCase());
      else if (qr) {
        try {
          setSkinType(JSON.parse(qr)?.skinTypeLabel?.toLowerCase() || "");
        } catch {}
      }
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

  const posts = (treatment && SOCIAL_POSTS[treatment.slug]) ?? SOCIAL_POSTS["prf-injection"];
  const activeVideos =
    socialTab === "tiktok" ? posts.tiktok : socialTab === "instagram" ? posts.instagram : [];
  const activeReddit = socialTab === "reddit" ? posts.reddit : [];

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
      <div style={{ padding: 40, textAlign: "center", color: ESPRESSO, background: WARM, minHeight: "100vh", fontFamily: SANS }}>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Treatment not found.</div>
        <button onClick={() => window.history.back()} style={{ background: "none", border: "none", color: CRIMSON, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          ← Back
        </button>
      </div>
    );
  }

  const HeroIcon = pickHeroIcon(treatment.slug);

  return (
    <div style={{ minHeight: "100vh", background: WARM, color: ESPRESSO, fontFamily: SANS, paddingBottom: 80 }}>
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}`}</style>

      {/* 1. Sticky top bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: WARM, borderBottom: `0.5px solid ${BORDER}`, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => window.history.back()} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: ESPRESSO, display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700 }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ fontSize: 15, fontWeight: 700, color: ESPRESSO, flex: 1, textAlign: "center" }}>{treatment.name}</div>
        <button style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: ESPRESSO, display: "flex", alignItems: "center" }}>
          <Share2 size={20} />
        </button>
      </div>

      {/* 2. Hero */}
      <div style={{ height: 220, position: "relative", overflow: "hidden", background: ESPRESSO, display: "flex", alignItems: "flex-end" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,252,248,0.06)" }}>
          <HeroIcon size={160} strokeWidth={1} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 30%, rgba(28,10,0,0.88) 100%)" }} />
        <div style={{ position: "relative", zIndex: 2, padding: 16, width: "100%" }}>
          {treatment.category && (
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: CRIMSON, background: "#FEE8EC", padding: "3px 8px", borderRadius: 3, display: "inline-block", marginBottom: 8 }}>
              {treatment.category}
            </div>
          )}
          <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: WARM, lineHeight: 1.2, marginBottom: 4 }}>{treatment.name}</div>
          {treatment.subtitle && (
            <div style={{ fontSize: 12, color: "rgba(255,252,248,0.75)", fontStyle: "italic", lineHeight: 1.4, marginBottom: 12 }}>{treatment.subtitle}</div>
          )}
          {treatment.celebrity_handles && treatment.celebrity_handles.length > 0 && (
            <div className="no-scrollbar" style={{ display: "flex", gap: 6, overflowX: "auto", flexWrap: "nowrap" }}>
              {treatment.celebrity_handles.map((h) => (
                <CelebPill key={h} handle={h} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Quick stats */}
      <div style={{ display: "flex", borderBottom: `0.5px solid ${BORDER}` }}>
        {[
          { label: "Downtime", value: treatment.downtime ?? "—" },
          { label: "Avg Cost", value: treatment.average_cost ?? "—" },
          { label: "Sessions", value: treatment.sessions_recommended ?? "—" },
          { label: "Best For", value: treatment.best_for_skin ?? "—" },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: "12px 6px", textAlign: "center", borderRight: i < 3 ? `0.5px solid ${BORDER}` : "none" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: ESPRESSO, lineHeight: 1.3, wordBreak: "break-word" }}>{s.value}</div>
            <div style={{ fontSize: 9, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 3 }}>{s.label}</div>
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
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 10, background: "#E8F5E9", color: "#2D7A3A", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "4px 12px" }}>
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
            const labelMap = { tiktok: "TikTok", instagram: "Instagram", reddit: "Reddit" } as const;
            return (
              <button
                key={t}
                onClick={() => setSocialTab(t)}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  padding: 10,
                  textAlign: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: active ? ESPRESSO : MUTED,
                  borderBottom: active ? `2px solid ${CRIMSON}` : "2px solid transparent",
                  cursor: "pointer",
                  marginBottom: -0.5,
                }}
              >
                {labelMap[t]}
              </button>
            );
          })}
        </div>

        {socialTab !== "reddit" ? (
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {activeVideos.map((p, i) => (
              <div key={i} style={{ height: 140, borderRadius: 10, overflow: "hidden", position: "relative", background: POST_BGS[i % POST_BGS.length], cursor: "pointer" }}>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(255,252,248,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Play size={14} color={WARM} fill={WARM} />
                </div>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(28,10,0,0.7)", padding: 8 }}>
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
        ) : (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column" }}>
            {activeReddit.map((r, i) => (
              <div key={i} style={{ background: "#FFFFFF", border: `0.5px solid ${BORDER}`, borderRadius: 10, padding: 12, marginBottom: 8, cursor: "pointer" }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: CRIMSON, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                  {r.subreddit}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: ESPRESSO, lineHeight: 1.4, marginBottom: 6 }}>{r.title}</div>
                <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {r.preview}
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: ESPRESSO }}>
                    <ArrowUp size={12} color={CRIMSON} /> {r.upvotes}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: MUTED }}>
                    <MessageCircle size={12} /> {r.comments} comments
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 9. Clinics */}
      <Section label="Clinics That Offer This">
        {skinType && (
          <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Matched to your {skinType} skin</div>
        )}
        {clinics.length === 0 ? (
          <div style={{ textAlign: "center", color: MUTED, fontSize: 12, padding: "20px 0" }}>No clinics listed yet for this treatment.</div>
        ) : (
          <div className="no-scrollbar" style={{ display: "flex", gap: 10, overflowX: "auto", marginTop: 10, paddingBottom: 4 }}>
            {clinics.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate({ to: "/clinics/$id", params: { id: c.id } })}
                style={{ background: "#FFFFFF", border: `0.5px solid ${BORDER}`, borderRadius: 10, padding: 12, width: 190, flexShrink: 0, cursor: "pointer" }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: ESPRESSO, marginBottom: 2 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 6, display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <MapPin size={11} />
                  <span>
                    {c.neighborhood ?? ""}
                    {c.distance_miles ? ` · ${c.distance_miles}mi` : ""}
                  </span>
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
      <div style={{ margin: "16px 16px 16px", background: TINT, borderRadius: 12, padding: "20px 16px", textAlign: "center" }}>
        <Lock size={20} color={CRIMSON} style={{ marginBottom: 8 }} />
        <div style={{ fontSize: 14, fontWeight: 800, color: ESPRESSO }}>Real experiences — side effects, costs, regrets</div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 4, lineHeight: 1.5, maxWidth: 260, marginLeft: "auto", marginRight: "auto" }}>
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
        <span style={{ fontSize: 14, color: CRIMSON, fontWeight: 800 }}>{pct}%</span>
      </div>
      <div style={{ marginTop: 4, height: 5, background: "#F0EAE4", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: CRIMSON, borderRadius: 3 }} />
      </div>
    </div>
  );
}

function CelebPill({ handle }: { handle: string }) {
  const [imgError, setImgError] = useState(false);
  const name = CELEB_NAMES[handle] ?? handle;
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <button
      onClick={() => window.open(`https://instagram.com/${handle}`, "_blank")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: "rgba(255,252,248,0.15)",
        border: "0.5px solid rgba(255,252,248,0.25)",
        borderRadius: 4,
        padding: "4px 8px",
        flexShrink: 0,
        cursor: "pointer",
      }}
    >
      {imgError ? (
        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#C9A98A", color: WARM, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {initials}
        </div>
      ) : (
        <img
          src={`https://unavatar.io/instagram/${handle}`}
          alt={name}
          onError={() => setImgError(true)}
          style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover" }}
        />
      )}
      <span style={{ fontSize: 11, fontWeight: 700, color: WARM, whiteSpace: "nowrap" }}>{name}</span>
      <span style={{ fontSize: 10, color: "rgba(255,252,248,0.7)", whiteSpace: "nowrap" }}>did this</span>
    </button>
  );
}