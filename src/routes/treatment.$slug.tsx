import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Share2,
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
  Smile,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

export const Route = createFileRoute("/treatment/$slug")({
  component: TreatmentDetailPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Skintea` },
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
  change_score: number | null;
};

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const WARM = "#FFFCF8";
const BORDER = "#E8DDD4";
const MUTED = "#999999";
const TINT = "#F5EFEC";
const SANS = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const SERIF = "'Playfair Display', serif";

type SocialTab = "tiktok" | "instagram" | "reddit";

type VideoPost = { handle: string; caption: string; views: string; likes: string };
type RedditPost = {
  subreddit: string;
  title: string;
  preview: string;
  upvotes: string;
  comments: number;
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
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [clinics, setClinics] = useState<any[]>([]);
  const [skinType, setSkinType] = useState("");
  const [socialTab, setSocialTab] = useState<SocialTab>("tiktok");
  const [loading, setLoading] = useState(true);
  const [similar, setSimilar] = useState<Treatment[]>([]);
  const [openAcc, setOpenAcc] = useState<Record<string, boolean>>({});
  const [beforeAfters, setBeforeAfters] = useState<any[]>([]);
  const [treatmentReviews, setTreatmentReviews] = useState<any[]>([]);

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
        .eq("slug", slug)
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
        const { data: ba } = await supabase
          .from("treatment_before_afters")
          .select("*")
          .eq("treatment_id", (t as any).id)
          .eq("is_active", true)
          .limit(6);
        if (!alive) return;
        setBeforeAfters((ba as any[]) ?? []);
        const { data: tr } = await supabase
          .from("treatment_reviews")
          .select("*")
          .eq("treatment_id", (t as any).id);
        if (!alive) return;
        setTreatmentReviews((tr as any[]) ?? []);
        if ((t as any).category) {
          const { data: sim } = await supabase
            .from("treatments")
            .select("*")
            .eq("category", (t as any).category)
            .neq("slug", slug)
            .limit(3);
          if (!alive) return;
          setSimilar((sim ?? []) as unknown as Treatment[]);
        }
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const matchesSkin = useMemo(() => {
    if (!skinType || !treatment?.who_its_for) return false;
    return treatment.who_its_for.toLowerCase().includes(skinType);
  }, [skinType, treatment]);

  const downtimeDisplay = useMemo(() => {
    const d = treatment?.downtime ?? "—";
    if (d.length > 12) {
      const beforeDash = d.split(/[-–—]/)[0]?.trim();
      if (beforeDash && beforeDash.length < d.length) return beforeDash;
    }
    return d;
  }, [treatment?.downtime]);

  const toVideo = (r: any): VideoPost => ({
    handle: r.author_handle ?? "user",
    caption: r.content ?? "",
    views: r.views ? `${r.views}` : "—",
    likes: r.likes ? `${r.likes}` : "—",
  });
  const realTikTok: VideoPost[] = treatmentReviews.filter((r) => r.platform === "tiktok").map(toVideo);
  const realInstagram: VideoPost[] = treatmentReviews.filter((r) => r.platform === "instagram").map(toVideo);
  const realReddit: RedditPost[] = treatmentReviews
    .filter((r) => r.platform === "reddit")
    .map((r) => ({
      subreddit: r.subreddit ?? "Reddit",
      title: (r.content ?? "").split("\n")[0] || r.content || "—",
      preview: r.content ?? "—",
      upvotes: r.upvotes ? `${r.upvotes}` : "—",
      comments: r.comment_count ?? 0,
    }));
  const activeVideos =
    socialTab === "tiktok" ? realTikTok : socialTab === "instagram" ? realInstagram : [];
  const activeReddit = socialTab === "reddit" ? realReddit : [];

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
    <div style={{ minHeight: "100vh", background: WARM, color: ESPRESSO, fontFamily: "'DM Sans', system-ui, sans-serif", paddingBottom: 80 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
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
        </div>
      </div>

      {/* 3. Quick stats */}
      <div style={{ display: "flex", borderBottom: `0.5px solid ${BORDER}` }}>
        {[
          { label: "Downtime", value: downtimeDisplay, truncateOneLine: true },
          { label: "Avg Cost", value: treatment.average_cost ?? "—" },
          { label: "Sessions", value: treatment.sessions_recommended ?? "—" },
          { label: "Best For", value: treatment.best_for_skin ?? "—" },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: "12px 6px", textAlign: "center", borderRight: i < 3 ? `0.5px solid ${BORDER}` : "none" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: ESPRESSO,
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                ...(s.truncateOneLine
                  ? { whiteSpace: "nowrap", maxWidth: "100%" }
                  : { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }),
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: 9, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* S1. What you can get */}
      <Section label="What you can get">
        <WhatYouCanGet text={treatment.who_its_for} />
      </Section>

      {/* S2. At a glance */}
      <Section label="At a glance">
        <AtAGlance treatment={treatment} />
      </Section>

      {/* S6. What people say */}
      <Section label="What people say">
        {treatment.majority_pct == null && treatment.results_pct == null ? (
          <EmptyNote text="No recommendation data collected for this treatment yet." />
        ) : (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
            {treatment.majority_pct != null && <StatBar label="Would recommend" pct={treatment.majority_pct} />}
            {treatment.results_pct != null && <StatBar label="Saw real results" pct={treatment.results_pct} />}
          </div>
        )}
        {treatment.minority_opinion && (
          <div style={{ marginTop: 12, background: TINT, borderRadius: 8, padding: "10px 12px", borderLeft: `2px solid ${BORDER}` }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
              Minority opinion
            </div>
            <div style={{ fontSize: 12, color: ESPRESSO, fontStyle: "italic", lineHeight: 1.5 }}>{treatment.minority_opinion}</div>
          </div>
        )}
      </Section>

      {/* S7. The details (accordion) */}
      <Section label="The details">
        <div style={{ marginTop: 8 }}>
          {[
            { id: "what", title: "What it is", body: treatment.what_it_is, showMatch: false },
            { id: "how", title: "How it works", body: treatment.how_it_works, showMatch: false },
            { id: "who", title: "Who it's for", body: treatment.who_its_for, showMatch: true },
          ].map((row) => {
            const open = !!openAcc[row.id];
            return (
              <div key={row.id} style={{ background: "#FFFFFF", border: `0.5px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", marginTop: 6 }}>
                <button
                  onClick={() => setOpenAcc((p) => ({ ...p, [row.id]: !p[row.id] }))}
                  style={{ width: "100%", background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", color: ESPRESSO, fontSize: 13, fontWeight: 700 }}
                >
                  <span>{row.title}</span>
                  <ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                </button>
                {open && (
                  <div style={{ marginTop: 8, fontSize: 13, color: ESPRESSO, lineHeight: 1.6 }}>
                    {row.body ?? "—"}
                    {row.showMatch && matchesSkin && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 10, background: "#E8F5E9", color: "#2D7A3A", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "4px 12px" }}>
                        Good match for your skin ✓
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* S8. Real talk */}
      <Section label="Real talk">
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

        {(socialTab === "reddit" ? activeReddit.length : activeVideos.length) === 0 ? (
          <EmptyNote text="No posts collected for this treatment yet." />
        ) : socialTab !== "reddit" ? (
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

      {/* S9. Clinics near you */}
      <Section label="Clinics near you">
        <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
          Offering {treatment.name} · your area
        </div>
        {clinics.length === 0 ? (
          <div style={{ textAlign: "center", color: MUTED, fontSize: 12, padding: "20px 0" }}>
            No clinics listed yet — check back soon.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {clinics.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate({ to: "/clinics/$id", params: { id: c.id } })}
                style={{ background: "#FFFFFF", border: `0.5px solid ${BORDER}`, borderRadius: 10, padding: 12, cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: ESPRESSO }}>{c.name}</div>
                  {c.is_open_now && (
                    <span style={{ fontSize: 9, fontWeight: 800, color: "#2D7A3A", background: "#E8F5E9", padding: "2px 6px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Open
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 4, display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <MapPin size={11} />
                  <span>
                    {c.neighborhood ?? ""}
                    {c.distance_miles ? ` · ${c.distance_miles}mi` : ""}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  <div>
                    {c.price_from != null && (
                      <div style={{ fontSize: 13, fontWeight: 800, color: CRIMSON }}>From ${c.price_from}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: CRIMSON }}>Book here →</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div
          onClick={() => navigate({ to: "/clinics" })}
          style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: CRIMSON, cursor: "pointer" }}
        >
          See all clinics →
        </div>
      </Section>

      {/* S10. You might also like */}
      {similar.length > 0 && (
        <Section label="You might also like">
          <div className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 10, paddingBottom: 4 }}>
            {similar.map((s) => (
              <div
                key={s.id}
                onClick={() => navigate({ to: "/treatment/$slug", params: { slug: s.slug } })}
                style={{ background: "#FFFFFF", border: `0.5px solid ${BORDER}`, borderRadius: 10, padding: 10, width: 130, flexShrink: 0, cursor: "pointer" }}
              >
                {s.category && (
                  <div style={{ fontSize: 9, fontWeight: 800, color: CRIMSON, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {s.category}
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 800, color: ESPRESSO, marginTop: 4, lineHeight: 1.25 }}>{s.name}</div>
                {s.subtitle && (
                  <div style={{ fontSize: 10, color: MUTED, marginTop: 4, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {s.subtitle}
                  </div>
                )}
                {s.average_cost && (
                  <div style={{ fontSize: 11, color: CRIMSON, marginTop: 6, fontWeight: 700 }}>{s.average_cost}</div>
                )}
                <div style={{ fontSize: 10, fontWeight: 800, color: CRIMSON, marginTop: 6 }}>See tea →</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Before & After */}
      <Section label="Before & After">
        {beforeAfters.length === 0 ? (
          <EmptyNote text="No before/after photos yet." />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
            {beforeAfters.slice(0, 2).map((ba) => (
              <div key={ba.id} style={{ borderRadius: 10, overflow: "hidden", border: `0.5px solid ${BORDER}`, position: "relative" }}>
                <div style={{ display: "flex" }}>
                  <div style={{ flex: 1, height: 100, background: "#2A1408", overflow: "hidden" }}>
                    {ba.before_url
                      ? <img src={ba.before_url} alt="Before" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 8, fontWeight: 800, color: "rgba(255,252,248,0.5)", textTransform: "uppercase" }}>Before</span></div>
                    }
                  </div>
                  <div style={{ flex: 1, height: 100, background: "#1C3020", overflow: "hidden" }}>
                    {ba.after_url
                      ? <img src={ba.after_url} alt="After" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 8, fontWeight: 800, color: "rgba(255,252,248,0.5)", textTransform: "uppercase" }}>After</span></div>
                    }
                  </div>
                </div>
                <div style={{ padding: 8, background: "#fff" }}>
                  {(ba.skin_type || ba.age) && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: ESPRESSO }}>
                      {[ba.skin_type, ba.age].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  {ba.sessions && <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{ba.sessions}</div>}
                  {ba.outcome && <div style={{ fontSize: 9, color: "#2D7A3A", fontWeight: 700, marginTop: 4 }}>{ba.outcome}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

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

function WhatYouCanGet({ text }: { text: string | null }) {
  const icons = [Sparkles, Smile, Droplet, ArrowUp];
  const parts = useMemo(() => {
    return (text ?? "")
      .split(/[.;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4)
      .map((src) => {
        const words = src.split(/\s+/);
        const title = words.slice(0, 3).join(" ");
        return {
          title: title.charAt(0).toUpperCase() + title.slice(1),
          subtitle: words.slice(3).join(" "),
        };
      });
  }, [text]);

  if (parts.length === 0) return <EmptyNote text="No benefits recorded for this treatment yet." />;

  return (
    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {parts.map((p, i) => {
        const Icon = icons[i];
        return (
          <div key={i} style={{ background: "#FFFFFF", border: `0.5px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px" }}>
            <Icon size={16} color={CRIMSON} />
            <div style={{ fontSize: 12, fontWeight: 800, color: ESPRESSO, marginTop: 6, lineHeight: 1.25 }}>{p.title}</div>
            {p.subtitle && (
              <div style={{ fontSize: 10, color: MUTED, marginTop: 3, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {p.subtitle}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AtAGlance({ treatment }: { treatment: Treatment }) {
  const rows = [
    { label: "Average cost", value: treatment.average_cost },
    { label: "Downtime", value: treatment.downtime },
    { label: "Sessions recommended", value: treatment.sessions_recommended },
  ].filter((r) => r.value != null && `${r.value}`.trim() !== "");

  if (rows.length === 0) return <EmptyNote text="No details recorded for this treatment yet." />;

  return (
    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ background: "#FFFFFF", border: `0.5px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em" }}>{r.label}</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: ESPRESSO, marginTop: 6, lineHeight: 1.3 }}>{r.value}</div>
        </div>
      ))}
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div style={{ marginTop: 10, border: `0.5px dashed ${BORDER}`, borderRadius: 8, padding: "14px 12px", textAlign: "center", fontSize: 12, color: MUTED }}>
      {text}
    </div>
  );
}