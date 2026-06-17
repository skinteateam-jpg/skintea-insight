import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { Pencil, Plus, Lock, Star, X, Bookmark, Link2, Download, ArrowUp, ArrowDown, Heart, ArrowRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/skin-profile")({
  component: SkinProfilePage,
  head: () => ({
    meta: [
      { title: "Skin Profile — Skintea" },
      { name: "description", content: "Public shelf, private skin chart. Track products, treatments, and skin score over time." },
      { property: "og:title", content: "Skin Profile — Skintea" },
      { property: "og:description", content: "Track products, treatments, and your skin score over time." },
    ],
  }),
});

// ---------- Theme ----------
const C = {
  bg: "#FAFAF8",
  surface: "#FFFFFF",
  border: "#F0EEE8",
  borderStrong: "#E2DED6",
  ink: "#1C0A00",
  textMid: "#5C4033",
  textLight: "#9A8978",
  good: "#0F7A4A",
  goodBg: "#E8F5EE",
  warn: "#B8860B",
  warnBg: "#FBF3DC",
  bad: "#A8001C",
  badBg: "#FCE8EC",
  gold: "#C9A227",
};

type SkinType = "Oily" | "Dry" | "Combination" | "Sensitive" | "Normal";
const PERSONAS: Record<SkinType, { name: string; emoji: string; color: string; bg: string }> = {
  Oily:        { name: "The Butter Girl",        emoji: "🧈", color: "#A8001C", bg: "#FFF5F5" },
  Dry:         { name: "The Cracker",            emoji: "🫙", color: "#B5651D", bg: "#FBEDDC" },
  Combination: { name: "The Everything Bagel",   emoji: "🥯", color: "#6B3FA0", bg: "#EFE5F7" },
  Sensitive:   { name: "The Peach",              emoji: "🍑", color: "#C2185B", bg: "#FCE4EC" },
  Normal:      { name: "The Glass of Milk",      emoji: "🥛", color: "#2E7D32", bg: "#E6F4EA" },
};

// ---------- Mock user ----------
const USER = {
  username: "miarose",
  skinType: "Oily" as SkinType,
  concerns: ["Acne", "Large pores"],
  posts: 24,
  following: 182,
  followers: 1430,
};

type Match = "good" | "warn" | "bad";
const matchStyle = (m: Match) =>
  m === "good"
    ? { bg: C.goodBg, color: C.good, label: "✓ Fits you" }
    : m === "warn"
    ? { bg: C.warnBg, color: C.warn, label: "△ Check" }
    : { bg: C.badBg, color: C.bad, label: "✕ Avoid" };

// ---------- Mock data ----------
// ---------- Live data types ----------
export type TopPick = { id: string; name: string; brand: string | null; image_url: string | null; emoji: string | null };
export type Post = {
  id: string;
  emoji: string | null;
  bg_color: string | null;
  caption: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
};
export type ShelfItem = {
  id: string;
  product_id: string | null;
  category: string;
  product_name: string;
  brand: string | null;
  emoji: string | null;
  match: Match | null;
  is_top_pick: boolean;
  image_url: string | null;
};
export type SavedProductRow = {
  id: string;
  product_id: string;
  products: {
    id: string;
    name: string;
    brand: string | null;
    category: string | null;
    image_url: string | null;
    emoji: string | null;
    match: Match | null;
  } | null;
};
export type GiftItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  brand: string | null;
  category: string | null;
  emoji: string | null;
  affiliate_url: string | null;
  affiliate_store: string | null;
  type: "skincare" | "makeup";
  image_url: string | null;
};
const SAVED_FILTERS = ["Recently Saved", "Cleanser", "Toner", "Serum", "Moisturizer", "SPF", "Makeup"];

const SCORE_TREND = [62, 65, 64, 68, 72, 75, 78];
const TREND_MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];

const PROBLEMS = [
  { name: "Hormonal acne", status: "improving" as const, pct: 65 },
  { name: "Large pores",   status: "monitoring" as const, pct: 30 },
  { name: "Dark spots",    status: "improving" as const, pct: 50 },
  { name: "Texture",       status: "fixed" as const, pct: 100 },
];

const TREATMENTS = [
  { id: 1, emoji: "💉", name: "Skin Botox", category: "Injection", date: "Mar 2026", rating: 5,
    notes: "Microdose botox along the T-zone. Pores noticeably tighter at week 3. No movement loss.",
    fixed: ["Large pores"], working: ["Oil control"] },
  { id: 2, emoji: "🔦", name: "IPL Photofacial", category: "Light Therapy", date: "Feb 2026", rating: 4,
    notes: "Three sessions, 4 weeks apart. Significant fade on cheek hyperpigmentation.",
    fixed: ["Dark spots"], working: [] },
  { id: 3, emoji: "🧖", name: "Hydrafacial", category: "Facial", date: "Jan 2026", rating: 4,
    notes: "Good extraction. Skin felt smooth for ~2 weeks.",
    fixed: [], working: ["Texture", "Congestion"] },
];
const TREAT_FILTERS = ["All", "Injection", "Light Therapy", "Facial", "Surgery", "Laser"];

const NEXT_STEPS = [
  { name: "Add azelaic acid 10%", type: "Skincare", text: "Targets your remaining acne and post-inflammatory marks without irritating oily skin." },
  { name: "Book a 4th IPL session", type: "Treatment", text: "Trend shows hyperpigmentation responds well — one more session likely closes it out." },
  { name: "Pillowcase swap weekly", type: "Habit", text: "Cuts down bacterial load. Quick win for chronic cheek breakouts." },
];

// ---------- Page ----------
type Tab = "tea" | "shelf" | "gift" | "saved" | "chart";

export type TLog = {
  id: string;
  treatment_id: string | null;
  treatment_slug: string | null;
  treatment_name: string;
  category: string | null;
  clinic_id: string | null;
  clinic_name: string | null;
  cost: string | null;
  date: string | null;
  rating: number | null;
  notes: string | null;
  fixed: string[];
  working: string[];
  is_public: boolean;
  emoji: string | null;
};

function SkinProfilePage() {
  const [tab, setTab] = useState<Tab>("tea");
  const [quizResult, setQuizResult] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [logs, setLogs] = useState<TLog[]>([]);
  const [editLog, setEditLog] = useState<TLog | "new" | null>(null);
  const [debugMsg, setDebugMsg] = useState<string>("init");

  // Live data
  const [topPicks, setTopPicks] = useState<TopPick[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [shelfItems, setShelfItems] = useState<ShelfItem[]>([]);
  const [loadingTopPicks, setLoadingTopPicks] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingShelf, setLoadingShelf] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("skintea.quizResult");
      if (raw) setQuizResult(JSON.parse(raw));
    } catch {}
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    })();
  }, []);

  // Top picks (global) — load once
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let { data, error } = await supabase
          .from("products" as any)
          .select("id,name,brand,image_url,emoji")
          .eq("is_top_pick", true)
          .limit(3);
        if (error) {
          const fb = await supabase
            .from("products" as any)
            .select("id,name,brand,image_url,emoji")
            .order("skintea_score", { ascending: false })
            .limit(3);
          data = fb.data;
        }
        if (alive) setTopPicks(((data as any[]) ?? []) as TopPick[]);
      } catch {
        if (alive) setTopPicks([]);
      } finally {
        if (alive) setLoadingTopPicks(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // User-scoped: posts + shelf
  useEffect(() => {
    if (!userId) {
      setPosts([]); setShelfItems([]);
      setLoadingPosts(false); setLoadingShelf(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("tea_posts" as any)
          .select("id,emoji,bg_color,caption,created_at,likes_count,comments_count")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(18);
        if (alive) setPosts(((data as any[]) ?? []) as Post[]);
      } catch { if (alive) setPosts([]); }
      finally { if (alive) setLoadingPosts(false); }
    })();
    (async () => {
      try {
        const { data } = await supabase
          .from("shelf_items" as any)
          .select("id,product_id,category,product_name,brand,emoji,match,is_top_pick,image_url")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (alive) setShelfItems(((data as any[]) ?? []) as ShelfItem[]);
      } catch { if (alive) setShelfItems([]); }
      finally { if (alive) setLoadingShelf(false); }
    })();
    return () => { alive = false; };
  }, [userId]);

  const reloadLogs = async () => {
    if (!userId) { setDebugMsg("no user"); return; }
    const { data, error } = await supabase
      .from("treatment_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    console.log("[skin-profile] treatment_logs query", { userId, data, error });
    if (error) setDebugMsg(`error: ${error.message}`);
    else setDebugMsg(`user ${userId.slice(0,8)} · ${data?.length ?? 0} log(s)`);
    const rows = ((data as any[]) ?? []) as TLog[];
    setLogs(rows);
    // Backfill missing treatment_slug — by treatment_id when present, otherwise by name
    const slugless = rows.filter(l => !l.treatment_slug);
    if (slugless.length > 0) {
      const idMap: Record<string, { id: string; slug: string }> = {};
      const nameMap: Record<string, { id: string; slug: string }> = {};
      const ids = Array.from(new Set(slugless.map(l => l.treatment_id).filter(Boolean) as string[]));
      const names = Array.from(new Set(slugless.filter(l => !l.treatment_id && l.treatment_name).map(l => l.treatment_name)));
      if (ids.length > 0) {
        const { data } = await supabase.from("treatments").select("id,name,slug").in("id", ids);
        (data as any[] | null)?.forEach(t => { if (t.slug) idMap[t.id] = { id: t.id, slug: t.slug }; });
      }
      if (names.length > 0) {
        const { data } = await supabase.from("treatments").select("id,name,slug").in("name", names);
        (data as any[] | null)?.forEach(t => { if (t.slug) nameMap[t.name.toLowerCase()] = { id: t.id, slug: t.slug }; });
      }
      const resolve = (l: TLog) => {
        if (l.treatment_id && idMap[l.treatment_id]) return idMap[l.treatment_id];
        if (!l.treatment_id && l.treatment_name && nameMap[l.treatment_name.toLowerCase()]) return nameMap[l.treatment_name.toLowerCase()];
        return null;
      };
      for (const l of slugless) {
        const r = resolve(l);
        if (r) {
          supabase.from("treatment_logs")
            .update({ treatment_slug: r.slug, treatment_id: r.id })
            .eq("id", l.id)
            .then(() => {});
        }
      }
      setLogs(prev => prev.map(l => {
        const r = resolve(l);
        return r ? { ...l, treatment_slug: r.slug, treatment_id: r.id } : l;
      }));
    }
  };
  useEffect(() => { reloadLogs(); }, [userId]);

  const togglePublic = async (id: string, next: boolean) => {
    setLogs(ls => ls.map(l => l.id === id ? { ...l, is_public: next } : l));
    await supabase.from("treatment_logs").update({ is_public: next }).eq("id", id);
  };

  const openAddLog = () => setEditLog("new");
  const openChartTab = () => setTab("chart");

  const activeSkinType = (quizResult?.skinTypeLabel as SkinType) || USER.skinType;
  const persona = PERSONAS[activeSkinType] || PERSONAS[USER.skinType];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <Header
        persona={persona}
        tab={tab}
        setTab={setTab}
        logs={logs}
        onTogglePublic={togglePublic}
        onAddLog={openAddLog}
        debugMsg={debugMsg}
      />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px 80px" }}>
        {tab === "tea" && <TeaTab posts={posts} topPicks={topPicks} loadingPosts={loadingPosts} loadingTopPicks={loadingTopPicks} />}
        {tab === "shelf" && <ShelfTab shelfItems={shelfItems} topPicks={topPicks} loadingShelf={loadingShelf} loadingTopPicks={loadingTopPicks} userId={userId} onShelfAdded={(it) => setShelfItems(prev => [it, ...prev])} />}
        {tab === "gift" && <GiftMeTab quizResult={quizResult} userId={userId} />}
        {tab === "saved" && <SavedTab userId={userId} />}
        {tab === "chart" && <ChartTab persona={persona} logs={logs} onAdd={openAddLog} onEdit={(l) => setEditLog(l)} />}
      </main>
      {editLog && (
        userId ? (
          <TreatmentLogSheet
            userId={userId}
            initial={editLog === "new" ? null : editLog}
            onClose={() => setEditLog(null)}
            onSaved={() => { setEditLog(null); reloadLogs(); }}
          />
        ) : (
          <Sheet onClose={() => setEditLog(null)}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1C0A00", marginBottom: 8 }}>Sign in to log a treatment</div>
            <div style={{ fontSize: 13, color: "#5C4033", lineHeight: 1.5 }}>You need an account to track treatments privately.</div>
            <a href="/login" style={{ display: "block", marginTop: 16, textAlign: "center", background: "#A8001C", color: "#FFFCF8", borderRadius: 8, padding: 13, fontSize: 14, fontWeight: 800, textDecoration: "none" }}>Sign in</a>
          </Sheet>
        )
      )}
      <BottomNav />
    </div>
  );
}

// ---------- Header ----------
function Header({ persona, tab, setTab, logs, onTogglePublic, onAddLog, debugMsg }: {
  persona: typeof PERSONAS[SkinType];
  tab: Tab;
  setTab: (t: Tab) => void;
  logs: TLog[];
  onTogglePublic: (id: string, next: boolean) => void;
  onAddLog: () => void;
  debugMsg?: string;
}) {
  const tabs: Array<{ id: Tab; icon: string; label: string; private?: boolean }> = [
    { id: "tea", icon: "☕", label: "The Tea" },
    { id: "shelf", icon: "🧴", label: "My Shelf" },
    { id: "gift", icon: "🎁", label: "Gift Me" },
    { id: "saved", icon: "🔖", label: "Saved", private: true },
    { id: "chart", icon: "📋", label: "Skin Chart", private: true },
  ];
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 30, background: C.surface, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: persona.bg, display: "grid", placeItems: "center", fontSize: 30, flexShrink: 0 }}>{persona.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>@{USER.username}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 999, background: persona.bg, color: persona.color, fontWeight: 700, fontSize: 12 }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700 }}>{persona.name}</span> {persona.emoji}
              </span>
            </div>
            <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>{USER.concerns.join(" · ")}</div>
            <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 13 }}>
              <span><b>{USER.posts}</b> <span style={{ color: C.textLight }}>posts</span></span>
              <span><b>{USER.following}</b> <span style={{ color: C.textLight }}>following</span></span>
              <span><b>{USER.followers.toLocaleString()}</b> <span style={{ color: C.textLight }}>followers</span></span>
            </div>
            <div style={{ background: "#1C0A00", borderRadius: 8, padding: "7px 11px", display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <div>
                <div style={{ fontSize: 9, color: "rgba(255,252,248,0.55)" }}>Your public profile</div>
                <div style={{ color: "#FFFCF8", fontWeight: 700, fontSize: 10 }}>skintea.com/u/{USER.username}</div>
              </div>
              <span style={{ fontSize: 9, fontWeight: 800, color: "#A8001C", background: "rgba(168,0,28,0.12)", border: "0.5px solid rgba(168,0,28,0.3)", borderRadius: 99, padding: "3px 9px" }}>Copy link</span>
            </div>
          </div>
          <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, background: C.ink, color: "#fff", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", flexShrink: 0 }}>
            <Pencil size={12} /> Edit
          </button>
        </div>

        {/* WHAT I'VE DONE strip */}
        <WhatIveDoneStrip logs={logs} onTogglePublic={onTogglePublic} onAdd={onAddLog} debugMsg={debugMsg} />

        <div style={{ overflowX: "auto", scrollbarWidth: "none", margin: "16px -16px 0", padding: "0 16px" }}>
          <div style={{ display: "flex", width: "max-content" }}>
            {tabs.map(t => {
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", padding: "8px 14px 10px",
                    borderBottom: active ? "2px solid #1C0A00" : "2px solid transparent",
                    color: active ? "#1C0A00" : "#999", whiteSpace: "nowrap", textAlign: "center" }}>
                  <div style={{ fontSize: 16, lineHeight: 1, marginBottom: 2 }}>{t.icon}</div>
                  <div style={{ fontSize: 10, marginTop: 2, fontWeight: active ? 700 : 500 }}>{t.label}</div>
                  {t.private && <div style={{ fontSize: 7, marginTop: 1, color: "#bbb", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>PRIVATE</div>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}

// ---------- Reusable bits ----------
function PrivateLabel() {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: C.textLight, fontWeight: 700, letterSpacing: 0.5, marginBottom: 16 }}>
      <Lock size={12} /> PRIVATE — Only you can see this
    </div>
  );
}

function MatchPill({ match }: { match: Match }) {
  const s = matchStyle(match);
  return <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 6, background: s.bg, color: s.color, fontSize: 10, fontWeight: 700 }}>{s.label}</span>;
}

function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "28px 0 12px" }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: C.ink, margin: 0 }}>{children}</h2>
      {action}
    </div>
  );
}

function FilterRow({ items, active, onChange }: { items: string[]; active: string; onChange: (s: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, margin: "0 -16px", padding: "0 16px 4px" }}>
      {items.map(i => {
        const on = i === active;
        return (
          <button key={i} onClick={() => onChange(i)}
            style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${on ? C.ink : C.border}`, background: on ? C.ink : C.surface, color: on ? "#fff" : C.textMid }}>
            {i}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Skeleton helpers ----------
function Skel({ h = 14, w = "100%", r = 6, style }: { h?: number; w?: number | string; r?: number; style?: CSSProperties }) {
  return <div style={{ height: h, width: w, background: "#EFEAE3", borderRadius: r, ...style }} />;
}

// ---------- Tab 1: The Tea ----------
function TopPicksRow({ picks, loading }: { picks: Array<{ id?: string; name: string; brand: string | null; image_url?: string | null; emoji: string | null }>; loading?: boolean }) {
  return (
    <>
      <SectionTitle>★ Top 3 Picks</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {loading && picks.length === 0 && [0, 1, 2].map(i => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            <Skel h={110} r={0} />
            <div style={{ padding: 10 }}><Skel h={10} w="80%" /><div style={{ height: 6 }} /><Skel h={9} w="60%" /></div>
          </div>
        ))}
        {!loading && picks.length === 0 && (
          <div style={{ gridColumn: "1 / -1", fontSize: 12, color: C.textLight, padding: "12px 0" }}>No top picks yet.</div>
        )}
        {picks.map((p, i) => (
          <div key={p.id ?? i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", top: 8, left: 8, background: C.gold, color: "#fff", fontSize: 9, fontWeight: 800, padding: "3px 6px", borderRadius: 4, letterSpacing: 0.5, zIndex: 1 }}>★ TOP PICK</div>
            {p.image_url ? (
              <div style={{ aspectRatio: "1", background: `#F5F0EB url(${p.image_url}) center/cover no-repeat` }} />
            ) : (
              <div style={{ aspectRatio: "1", background: "#F5F0EB", display: "grid", placeItems: "center", fontSize: 40 }}>{p.emoji ?? "🧴"}</div>
            )}
            <div style={{ padding: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>{p.name}</div>
              {p.brand && <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>{p.brand}</div>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function TeaTab({ posts, topPicks, loadingPosts, loadingTopPicks }: { posts: Post[]; topPicks: TopPick[]; loadingPosts: boolean; loadingTopPicks: boolean }) {
  const [openPost, setOpenPost] = useState<Post | null>(null);
  return (
    <>
      <TopPicksRow picks={topPicks} loading={loadingTopPicks} />

      <SectionTitle>Posts {posts.length > 0 && <span style={{ fontWeight: 500, color: C.textLight, textTransform: "none", letterSpacing: 0 }}>({posts.length})</span>}</SectionTitle>
      {loadingPosts ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
          {[0,1,2,3,4,5].map(i => <Skel key={i} h={120} r={0} />)}
        </div>
      ) : posts.length === 0 ? (
        <div style={{ fontSize: 12, color: C.textLight, textAlign: "center", padding: "20px 10px", border: `0.5px dashed ${C.border}`, borderRadius: 10 }}>
          No posts yet.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
          {posts.map(p => (
            <button key={p.id} onClick={() => setOpenPost(p)}
              style={{ position: "relative", aspectRatio: "1", background: p.bg_color ?? "#F5F0EB", border: "none", cursor: "pointer", display: "grid", placeItems: "center", padding: 0 }}>
              <span style={{ fontSize: 56 }}>{p.emoji ?? "🌸"}</span>
            </button>
          ))}
        </div>
      )}

      {openPost && <PostSheet post={openPost} onClose={() => setOpenPost(null)} />}
    </>
  );
}

function PostSheet({ post, onClose }: { post: Post; onClose: () => void }) {
  const persona = PERSONAS[USER.skinType];
  const dateStr = post.created_at ? new Date(post.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
  return (
    <Sheet onClose={onClose}>
      <div style={{ aspectRatio: "1", background: post.bg_color ?? "#F5F0EB", display: "grid", placeItems: "center", fontSize: 120, borderRadius: 12, marginBottom: 16 }}>{post.emoji ?? "🌸"}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontWeight: 700 }}>@{USER.username}</span>
        <span style={{ padding: "2px 8px", borderRadius: 999, background: persona.bg, color: persona.color, fontSize: 10, fontWeight: 700 }}>{persona.name} {persona.emoji}</span>
      </div>
      {dateStr && <div style={{ fontSize: 11, color: C.textLight }}>{dateStr}</div>}
      {post.caption && <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.5 }}>{post.caption}</p>}
      <div style={{ display: "flex", gap: 16, fontSize: 13, color: C.textMid, marginTop: 8 }}>
        <span>♥ {post.likes_count ?? 0}</span><span>💬 {post.comments_count ?? 0}</span>
      </div>
    </Sheet>
  );
}

// ---------- Tab 2: My Shelf ----------
function ShelfTab({ shelfItems, topPicks, loadingShelf, loadingTopPicks, userId, onShelfAdded }: { shelfItems: ShelfItem[]; topPicks: TopPick[]; loadingShelf: boolean; loadingTopPicks: boolean; userId: string | null; onShelfAdded: (it: ShelfItem) => void }) {
  const grouped = useMemo(() => {
    const map = new Map<string, ShelfItem[]>();
    for (const it of shelfItems) {
      const list = map.get(it.category) ?? [];
      list.push(it);
      map.set(it.category, list);
    }
    return Array.from(map.entries());
  }, [shelfItems]);

  const shelfTopPicks = useMemo(() => {
    const fromShelf = shelfItems.filter(i => i.is_top_pick).slice(0, 3).map(i => ({
      id: i.id, name: i.product_name, brand: i.brand, emoji: i.emoji, image_url: i.image_url,
    }));
    return fromShelf.length > 0 ? fromShelf : topPicks;
  }, [shelfItems, topPicks]);

  const cats = ["All", ...grouped.map(([c]) => c)];
  const [active, setActive] = useState("All");
  const visible = active === "All" ? grouped : grouped.filter(([c]) => c === active);
  const [addOpen, setAddOpen] = useState<{ category?: string } | null>(null);

  return (
    <>
      <TopPicksRow picks={shelfTopPicks} loading={loadingTopPicks && shelfItems.length === 0} />
      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setAddOpen({})}
          style={{ padding: "7px 12px", borderRadius: 999, border: `1px solid ${C.ink}`, background: C.ink, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          + Add to Shelf
        </button>
      </div>
      <div style={{ marginTop: 8 }}><FilterRow items={cats} active={active} onChange={setActive} /></div>
      {loadingShelf && shelfItems.length === 0 && (
        <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
          {[0,1,2].map(i => <Skel key={i} h={170} w={120} r={10} />)}
        </div>
      )}
      {!loadingShelf && shelfItems.length === 0 && (
        <div style={{ marginTop: 24, fontSize: 12, color: C.textLight, textAlign: "center", padding: "20px 10px", border: `0.5px dashed ${C.border}`, borderRadius: 10 }}>
          Your shelf is empty. Save products to start.
        </div>
      )}
      {visible.map(([cat, items]) => (
        <div key={cat} style={{ marginTop: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{cat}</div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", margin: "0 -16px", padding: "0 16px 8px" }}>
            {items.map((p) => {
              const cardStyle: CSSProperties = { flexShrink: 0, width: 120, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", position: "relative", display: "block" };
              return p.product_id ? (
                <Link
                  key={p.id}
                  to="/products/$id"
                  params={{ id: p.product_id }}
                  style={{ ...cardStyle, textDecoration: "none", color: "inherit" }}
                >
                  {p.is_top_pick && <div style={{ position: "absolute", top: 6, left: 6, background: C.gold, color: "#fff", fontSize: 8, fontWeight: 800, padding: "2px 5px", borderRadius: 3, letterSpacing: 0.5 }}>TOP PICK</div>}
                  {p.image_url ? (
                    <div style={{ aspectRatio: "1", background: `#F5F0EB url(${p.image_url}) center/cover no-repeat` }} />
                  ) : (
                    <div style={{ aspectRatio: "1", background: "#F5F0EB", display: "grid", placeItems: "center", fontSize: 36 }}>{p.emoji ?? "🧴"}</div>
                  )}
                  <div style={{ padding: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, minHeight: 26 }}>{p.product_name}</div>
                    {p.brand && <div style={{ fontSize: 10, color: C.textLight, margin: "2px 0 6px" }}>{p.brand}</div>}
                    <MatchPill match={(p.match ?? "good") as Match} />
                  </div>
                </Link>
              ) : (
                <div key={p.id} style={{ ...cardStyle, cursor: "default", textDecoration: "none", color: "inherit" }}>
                  {p.is_top_pick && <div style={{ position: "absolute", top: 6, left: 6, background: C.gold, color: "#fff", fontSize: 8, fontWeight: 800, padding: "2px 5px", borderRadius: 3, letterSpacing: 0.5 }}>TOP PICK</div>}
                  {p.image_url ? (
                    <div style={{ aspectRatio: "1", background: `#F5F0EB url(${p.image_url}) center/cover no-repeat` }} />
                  ) : (
                    <div style={{ aspectRatio: "1", background: "#F5F0EB", display: "grid", placeItems: "center", fontSize: 36 }}>{p.emoji ?? "🧴"}</div>
                  )}
                  <div style={{ padding: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, minHeight: 26 }}>{p.product_name}</div>
                    {p.brand && <div style={{ fontSize: 10, color: C.textLight, margin: "2px 0 6px" }}>{p.brand}</div>}
                    <MatchPill match={(p.match ?? "good") as Match} />
                  </div>
                </div>
              );
            })}
            <button onClick={() => setAddOpen({ category: cat })}
              style={{ flexShrink: 0, width: 120, aspectRatio: "0.78", border: `1.5px dashed ${C.borderStrong}`, borderRadius: 10, background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: C.textLight }}>
              <Plus size={22} />
            </button>
          </div>
        </div>
      ))}
      {addOpen && userId && (
        <AddShelfSheet
          userId={userId}
          defaultCategory={addOpen.category}
          onClose={() => setAddOpen(null)}
          onSaved={(it) => { onShelfAdded(it); setAddOpen(null); }}
        />
      )}
      {addOpen && !userId && (
        <Sheet onClose={() => setAddOpen(null)}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>Sign in to add to your shelf</div>
        </Sheet>
      )}
    </>
  );
}

const SHELF_CATEGORIES = ["Cleanser", "Toner", "Serum", "Moisturizer", "SPF", "Face Mask", "Eye Cream", "Sunscreen", "Device", "Treatment", "Other"];

type ProductSearchRow = { id: string; name: string; brand: string; category: string | null; image_url: string | null; price: number | null };

function useProductSearch(query: string) {
  const [results, setResults] = useState<ProductSearchRow[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); setLoading(false); return; }
    setLoading(true);
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from("products")
          .select("id,name,brand,category,image_url,price")
          .eq("is_active", true)
          .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
          .limit(10);
        if (alive) setResults(((data as any[]) ?? []) as ProductSearchRow[]);
      } catch { if (alive) setResults([]); }
      finally { if (alive) setLoading(false); }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [query]);
  return { results, loading };
}

function ProductSearchList({ query, onPick }: { query: string; onPick: (p: ProductSearchRow) => void }) {
  const { results, loading } = useProductSearch(query);
  if (!query.trim()) return null;
  if (loading) return <div style={{ fontSize: 12, color: C.textLight, padding: "8px 4px" }}>Searching…</div>;
  if (results.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", background: C.surface }}>
      {results.map((p, i) => (
        <button key={p.id} type="button" onClick={() => onPick(p)}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, background: "transparent", border: "none", borderTop: i === 0 ? "none" : `1px solid ${C.border}`, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
          <div style={{ width: 40, height: 40, borderRadius: 6, background: p.image_url ? `#F5F0EB url(${p.image_url}) center/cover no-repeat` : "#F5F0EB", flexShrink: 0, display: "grid", placeItems: "center", fontSize: 18 }}>
            {!p.image_url && "🧴"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
            <div style={{ fontSize: 10, color: C.textLight, marginTop: 2 }}>
              {p.brand}{p.category ? ` · ${p.category}` : ""}
            </div>
          </div>
          {p.price != null && <div style={{ fontSize: 11, fontWeight: 700, color: C.ink }}>${Number(p.price).toFixed(2)}</div>}
        </button>
      ))}
    </div>
  );
}

function AddShelfSheet({ userId, defaultCategory, onClose, onSaved }: { userId: string; defaultCategory?: string; onClose: () => void; onSaved: (it: ShelfItem) => void }) {
  const [query, setQuery] = useState("");
  const [manual, setManual] = useState(false);
  const [picked, setPicked] = useState<ProductSearchRow | null>(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [category, setCategory] = useState(defaultCategory && SHELF_CATEGORIES.includes(defaultCategory) ? defaultCategory : (defaultCategory ?? "Cleanser"));
  const [emoji, setEmoji] = useState("🧴");
  const [match, setMatch] = useState<Match>("good");
  const [isTopPick, setIsTopPick] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const allCats = Array.from(new Set([...SHELF_CATEGORIES, ...(defaultCategory ? [defaultCategory] : [])]));

  const onPick = (p: ProductSearchRow) => {
    setPicked(p);
    setName(p.name);
    setBrand(p.brand);
    setImageUrl(p.image_url);
    setProductId(p.id);
    if (p.category && allCats.includes(p.category)) setCategory(p.category);
    setQuery("");
    setManual(true);
  };

  const reset = () => {
    setPicked(null); setName(""); setBrand(""); setImageUrl(null); setProductId(null); setManual(false);
  };

  const save = async () => {
    setErr(null);
    if (!name.trim()) { setErr("Product name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        user_id: userId,
        product_id: productId,
        product_name: name.trim(),
        brand: brand.trim() || null,
        category,
        emoji: emoji.trim() || "🧴",
        match,
        image_url: imageUrl,
        is_top_pick: isTopPick,
        is_public: true,
      };
      const { data, error } = await supabase.from("shelf_items" as any).insert(payload).select().single();
      if (error) throw error;
      const row = (data as any) ?? { id: crypto.randomUUID(), ...payload };
      onSaved({
        id: row.id,
        product_id: row.product_id ?? null,
        category: row.category,
        product_name: row.product_name,
        brand: row.brand,
        emoji: row.emoji,
        match: row.match,
        is_top_pick: row.is_top_pick,
        image_url: row.image_url ?? null,
      } as ShelfItem);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const pillStyle = (m: Match) => {
    const s = matchStyle(m);
    const on = match === m;
    return {
      padding: "8px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
      border: `1px solid ${on ? s.color : C.border}`,
      background: on ? s.bg : C.surface,
      color: on ? s.color : C.textMid,
      flex: 1,
    } as CSSProperties;
  };

  const inputStyle: CSSProperties = { width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, background: C.surface, color: C.ink, boxSizing: "border-box" };
  const labelStyle: CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: C.textMid, marginBottom: 6, display: "block" };

  return (
    <Sheet onClose={onClose}>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 16 }}>Add to Shelf</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {!manual && (
          <>
            <div>
              <label style={labelStyle}>Search products</label>
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products..." style={inputStyle} />
            </div>
            <ProductSearchList query={query} onPick={onPick} />
            <button type="button" onClick={() => setManual(true)}
              style={{ background: "transparent", border: "none", color: C.textMid, fontSize: 12, fontWeight: 600, textDecoration: "underline", cursor: "pointer", alignSelf: "flex-start", padding: 0 }}>
              Not finding it? Add manually
            </button>
          </>
        )}
        {manual && (
          <>
            {picked && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, border: `1px solid ${C.border}`, borderRadius: 8, background: C.surface }}>
                <div style={{ width: 44, height: 44, borderRadius: 6, background: imageUrl ? `#F5F0EB url(${imageUrl}) center/cover no-repeat` : "#F5F0EB", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{name}</div>
                  <div style={{ fontSize: 10, color: C.textLight }}>{brand}</div>
                </div>
                <button type="button" onClick={reset} style={{ background: "transparent", border: "none", color: C.textLight, cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>Change</button>
              </div>
            )}
            {!picked && (
              <>
                <div>
                  <label style={labelStyle}>Product name</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. CeraVe Foaming Cleanser" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Brand</label>
                  <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. CeraVe" style={inputStyle} />
                </div>
                <button type="button" onClick={() => setManual(false)}
                  style={{ background: "transparent", border: "none", color: C.textMid, fontSize: 12, fontWeight: 600, textDecoration: "underline", cursor: "pointer", alignSelf: "flex-start", padding: 0 }}>
                  ← Back to search
                </button>
              </>
            )}
          </>
        )}
        <div>
          <label style={labelStyle}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
            {allCats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Match</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setMatch("good")} style={pillStyle("good")}>✓ Fits you</button>
            <button type="button" onClick={() => setMatch("warn")} style={pillStyle("warn")}>△ Check</button>
            <button type="button" onClick={() => setMatch("bad")} style={pillStyle("bad")}>✕ Avoid</button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>Mark as Top Pick ★</span>
          <button type="button" onClick={() => setIsTopPick(v => !v)}
            style={{ width: 28, height: 16, borderRadius: 8, background: isTopPick ? "#A8001C" : "#ddd", position: "relative", border: "none", cursor: "pointer", padding: 0 }}>
            <span style={{ position: "absolute", top: 2, left: isTopPick ? 14 : 2, width: 12, height: 12, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
          </button>
        </div>
        {err && <div style={{ fontSize: 12, color: "#A8001C" }}>{err}</div>}
        <button onClick={save} disabled={saving}
          style={{ marginTop: 4, padding: "12px 16px", borderRadius: 10, border: "none", background: C.ink, color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving…" : "Save to shelf"}
        </button>
      </div>
    </Sheet>
  );
}

// ---------- Tab 3: Saved ----------
function CrimsonLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#A8001C", margin: "20px 0 10px" }}>{children}</div>;
}

function SavedTab({ userId }: { userId: string | null }) {
  const [active, setActive] = useState("Recently Saved");
  const navigate = useNavigate();
  const [savedProducts, setSavedProducts] = useState<SavedProductRow[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [savedClinics, setSavedClinics] = useState<Array<{ id: string; name: string; neighborhood: string | null; image_url: string | null; best_for: string[] | null; trust_score: number | null; skintea_score: number | null; }>>([]);
  const [savedPosts, setSavedPosts] = useState<Array<{ id: string; post_id: string; post_type: string }>>([]);

  useEffect(() => {
    if (!userId) { setLoadingProducts(false); return; }
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("saved_products" as any)
          .select("id, product_id, products(id,name,brand,category,image_url,emoji,match)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (alive) setSavedProducts(((data as any[]) ?? []) as SavedProductRow[]);
      } catch { if (alive) setSavedProducts([]); }
      finally { if (alive) setLoadingProducts(false); }
    })();
    (async () => {
      const { data: scs } = await supabase
        .from("saved_clinics")
        .select("clinic_id, clinics(id,name,neighborhood,image_url,best_for,trust_score,skintea_score)")
        .eq("user_id", userId);
      if (alive) setSavedClinics(((scs as any[]) ?? []).map(r => r.clinics).filter(Boolean));
      const { data: sps } = await supabase
        .from("saved_posts")
        .select("id, post_id, post_type")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (alive) setSavedPosts((sps as any[]) ?? []);
    })();
    return () => { alive = false; };
  }, [userId]);

  const flatSaved = savedProducts
    .map(r => r.products ? { rowId: r.id, ...r.products } : null)
    .filter(Boolean) as Array<{ rowId: string; id: string; name: string; brand: string | null; category: string | null; image_url: string | null; emoji: string | null; match: Match | null }>;
  const items = active === "Recently Saved" ? flatSaved : flatSaved.filter(s => s.category === active);

  const removeSaved = async (rowId: string) => {
    setSavedProducts(rows => rows.filter(r => r.id !== rowId));
    try { await supabase.from("saved_products" as any).delete().eq("id", rowId); } catch {}
  };

  const addToShelf = async (p: { id: string; name: string; brand: string | null; category: string | null; emoji: string | null; match: Match | null; image_url?: string | null }) => {
    if (!userId) return;
    try {
      await supabase.from("shelf_items" as any).insert({
        user_id: userId,
        product_id: p.id,
        category: p.category ?? "Other",
        product_name: p.name,
        brand: p.brand,
        emoji: p.emoji,
        match: p.match ?? "good",
        image_url: p.image_url ?? null,
        is_top_pick: false,
        is_public: true,
      });
    } catch {}
  };

  const unsaveClinic = async (id: string) => {
    setSavedClinics(cs => cs.filter(c => c.id !== id));
    if (userId) await supabase.from("saved_clinics").delete().eq("user_id", userId).eq("clinic_id", id);
  };

  const postTypeStyle = (t: string) => {
    switch (t) {
      case "skin_tea": return { bg: "#A8001C", label: "SKIN TEA" };
      case "look_tea": return { bg: "#5B3FA6", label: "LOOK TEA" };
      case "spill": return { bg: "#B45309", label: "SPILL" };
      case "treatment": return { bg: "#1C0A00", label: "TREATMENT" };
      default: return { bg: "#999", label: t.toUpperCase() };
    }
  };

  return (
    <>
      <PrivateLabel />

      {/* Section 1 — Products saved */}
      <FilterRow items={SAVED_FILTERS} active={active} onChange={setActive} />
      {loadingProducts ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 16 }}>
          {[0,1,2,3].map(i => <Skel key={i} h={170} r={12} />)}
        </div>
      ) : items.length === 0 ? (
        <div style={{ marginTop: 16, fontSize: 12, color: C.textLight, textAlign: "center", padding: "20px 10px", border: `0.5px dashed ${C.border}`, borderRadius: 10 }}>
          No saved products yet.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 16 }}>
          {items.map((p) => (
            <div key={p.rowId} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
              <Link to="/products/$id" params={{ id: p.id }} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
                {p.image_url ? (
                  <div style={{ aspectRatio: "1.3", background: `#F5F0EB url(${p.image_url}) center/cover no-repeat` }} />
                ) : (
                  <div style={{ aspectRatio: "1.3", background: "#F5F0EB", display: "grid", placeItems: "center", fontSize: 44 }}>{p.emoji ?? "🧴"}</div>
                )}
                <div style={{ padding: "10px 10px 0" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>{p.name}</div>
                  {p.category && <div style={{ fontSize: 10, color: C.textLight, marginTop: 2 }}>{p.category}</div>}
                  <div style={{ marginTop: 6 }}><MatchPill match={(p.match ?? "good") as Match} /></div>
                </div>
              </Link>
              <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                <button onClick={() => addToShelf(p)} style={{ width: "100%", background: "#1C0A00", color: "#FFFCF8", border: "none", borderRadius: 6, padding: 6, fontSize: 8, fontWeight: 700, cursor: "pointer" }}>Add to My Shelf</button>
                <button style={{ width: "100%", background: "#FFF5F5", color: "#A8001C", border: "0.5px solid #A8001C", borderRadius: 6, padding: 6, fontSize: 8, fontWeight: 700, cursor: "pointer" }}>🎁 Add to Gift Me</button>
                <button onClick={() => removeSaved(p.rowId)} style={{ width: "100%", background: "transparent", color: "#bbb", border: "0.5px solid #E8DDD4", borderRadius: 6, padding: 5, fontSize: 8, fontWeight: 600, cursor: "pointer" }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Section 2 — Saved Clinics */}
      <CrimsonLabel>Saved Clinics</CrimsonLabel>
      {savedClinics.length === 0 ? (
        <div style={{ fontSize: 12, color: C.textLight, textAlign: "center", padding: "16px 8px", border: `0.5px solid #E8DDD4`, borderRadius: 10, background: "#FFFFFF" }}>
          No saved clinics yet. Tap ♥ on any clinic to save it.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {savedClinics.map(cl => {
            const tags = (cl.best_for ?? []).slice(0, 3);
            const photoBgs = ["#C9A98A", "#E8DDD4", "#F5EFEC"];
            return (
              <div key={cl.id}
                onClick={() => navigate({ to: "/clinics/$id", params: { id: cl.id } })}
                style={{ background: "#FFFFFF", border: `0.5px solid #E8DDD4`, borderRadius: 12, overflow: "hidden", cursor: "pointer" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1 }}>
                  {photoBgs.map((bg, i) => (
                    <div key={i} style={{ height: 48, background: i === 0 && cl.image_url ? `url(${cl.image_url}) center/cover no-repeat` : bg }} />
                  ))}
                </div>
                <div style={{ padding: 10, position: "relative" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1C0A00" }}>{cl.name}</div>
                  {cl.neighborhood && <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>{cl.neighborhood}</div>}
                  {tags.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                      {tags.map((t, i) => (
                        <span key={i} style={{ background: "#F0E8E0", color: "#1C0A00", fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 3 }}>{t}</span>
                      ))}
                    </div>
                  )}
                  {cl.skintea_score != null && (
                    <div style={{ position: "absolute", top: 10, right: 10, fontSize: 14, fontWeight: 800, color: "#A8001C" }}>{cl.skintea_score}</div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); unsaveClinic(cl.id); }}
                    style={{ position: "absolute", bottom: 8, right: 10, background: "transparent", border: "none", padding: 4, cursor: "pointer" }}>
                    <Heart size={16} color="#A8001C" fill="#A8001C" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Section 3 — Saved Posts */}
      <CrimsonLabel>Saved Posts</CrimsonLabel>
      {savedPosts.length === 0 ? (
        <div style={{ fontSize: 12, color: C.textLight, textAlign: "center", padding: "16px 8px", border: `0.5px solid #E8DDD4`, borderRadius: 10, background: "#FFFFFF" }}>
          No saved posts yet.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
          {savedPosts.map(sp => {
            const s = postTypeStyle(sp.post_type);
            return (
              <div key={sp.id} style={{ position: "relative", aspectRatio: "1", background: "#F5F0EB" }}>
                <span style={{ position: "absolute", top: 6, left: 6, background: s.bg, color: "#FFFCF8", fontSize: 8, fontWeight: 800, padding: "3px 6px", borderRadius: 3, letterSpacing: "0.08em" }}>{s.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ---------- Tab: Gift Me ----------
function GiftMeTab({ quizResult, userId }: { quizResult: any; userId: string | null }) {
  const [giftSubTab, setGiftSubTab] = useState<"needs" | "skincare" | "makeup">("needs");
  const [activeRoutineTab, setActiveRoutineTab] = useState("cleanser");
  const [skincareWishlist, setSkincareWishlist] = useState<GiftItem[]>([]);
  const [makeupWishlist, setMakeupWishlist] = useState<GiftItem[]>([]);
  const [addWish, setAddWish] = useState<{ type: "skincare" | "makeup" } | null>(null);

  useEffect(() => {
    if (!userId) { setSkincareWishlist([]); setMakeupWishlist([]); return; }
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("gift_wishlist" as any)
          .select("id,product_id,product_name,brand,category,emoji,affiliate_url,affiliate_store,type,image_url")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (!alive) return;
        const all = ((data as any[]) ?? []) as GiftItem[];
        setSkincareWishlist(all.filter(i => i.type === "skincare"));
        setMakeupWishlist(all.filter(i => i.type === "makeup"));
      } catch {
        if (alive) { setSkincareWishlist([]); setMakeupWishlist([]); }
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  const removeItem = async (item: GiftItem) => {
    if (item.type === "skincare") setSkincareWishlist(l => l.filter(x => x.id !== item.id));
    else setMakeupWishlist(l => l.filter(x => x.id !== item.id));
    try { await supabase.from("gift_wishlist" as any).delete().eq("id", item.id); } catch {}
  };

  const ROUTINE_TABS = [
    { num: 1, key: "cleanser", label: "Cleanser" },
    { num: 2, key: "toner", label: "Toner" },
    { num: 3, key: "serum", label: "Serum" },
    { num: 4, key: "moisturizer", label: "Moisturizer" },
    { num: 5, key: "spf", label: "SPF" },
    { num: 6, key: "mask", label: "Mask" },
  ];

  const characterName = quizResult?.persona?.name || "The Butter Girl";

  const subTabs: Array<{ id: "needs" | "skincare" | "makeup"; label: string }> = [
    { id: "needs", label: "My Needs" },
    { id: "skincare", label: "Skincare Wishlist" },
    { id: "makeup", label: "Makeup Wishlist" },
  ];

  const pillStyle = (on: boolean) => ({
    background: on ? "#1C0A00" : "#fff",
    color: on ? "#FFFCF8" : "#999",
    border: on ? "none" : "0.5px solid #E8DDD4",
    borderRadius: 99,
    padding: "6px 14px",
    fontSize: 10,
    fontWeight: 700,
    whiteSpace: "nowrap" as const,
    cursor: "pointer",
  });

  const renderWishlist = (
    list: GiftItem[],
    filters: string[],
    badge: { bg: string; color: string; border: string; text: string },
    addText: string,
    wishType: "skincare" | "makeup",
  ) => {
    const [activeFilter, _setActiveFilter] = [filters[0], (_: string) => {}];
    return (
      <>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", marginBottom: 12 }}>
          {filters.map(f => (
            <button key={f} style={pillStyle(f === activeFilter)}>{f}</button>
          ))}
        </div>
        {list.length === 0 ? (
          <div style={{ fontSize: 12, color: "#999", textAlign: "center", padding: "20px 10px", border: "0.5px dashed #E8DDD4", borderRadius: 10 }}>
            Nothing on your wishlist yet.
          </div>
        ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {list.map((item) => (
            <div key={item.id} style={{ background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 10, overflow: "hidden" }}>
              {item.product_id ? (
                <Link to="/products/$id" params={{ id: item.product_id }} style={{ display: "block", textDecoration: "none" }}>
                  <div style={{ height: 75, background: item.image_url ? `#FFFCF8 url(${item.image_url}) center/cover no-repeat` : "#FFFCF8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, borderBottom: "0.5px solid #E8DDD4", position: "relative" }}>
                    {!item.image_url && (item.emoji ?? "🎁")}
                    <span style={{ position: "absolute", top: 5, right: 5, fontSize: 7, fontWeight: 800, padding: "2px 5px", borderRadius: 99, background: badge.bg, color: badge.color, border: `0.5px solid ${badge.border}` }}>{badge.text}</span>
                  </div>
                </Link>
              ) : (
                <div style={{ height: 75, background: item.image_url ? `#FFFCF8 url(${item.image_url}) center/cover no-repeat` : "#FFFCF8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, borderBottom: "0.5px solid #E8DDD4", position: "relative" }}>
                  {!item.image_url && (item.emoji ?? "🎁")}
                  <span style={{ position: "absolute", top: 5, right: 5, fontSize: 7, fontWeight: 800, padding: "2px 5px", borderRadius: 99, background: badge.bg, color: badge.color, border: `0.5px solid ${badge.border}` }}>{badge.text}</span>
                </div>
              )}
              <div style={{ padding: "7px 8px 8px" }}>
                {item.category && <div style={{ fontSize: 7, color: "#A8001C", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.category}</div>}
                {item.brand && <div style={{ fontSize: 8, color: "#999" }}>{item.brand}</div>}
                <div style={{ fontSize: 10, fontWeight: 700, color: "#1C0A00", marginBottom: 5 }}>{item.product_name}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {item.affiliate_url ? (
                    <a href={item.affiliate_url} target="_blank" rel="noreferrer" style={{ flex: 1, background: "#1C0A00", color: "#FFFCF8", borderRadius: 6, padding: 5, fontSize: 8, fontWeight: 700, textAlign: "center", textDecoration: "none" }}>Buy{item.affiliate_store ? ` → ${item.affiliate_store}` : ""}</a>
                  ) : (
                    <div style={{ flex: 1, background: "#1C0A00", color: "#FFFCF8", borderRadius: 6, padding: 5, fontSize: 8, fontWeight: 700, textAlign: "center" }}>Buy{item.affiliate_store ? ` → ${item.affiliate_store}` : ""}</div>
                  )}
                  <div onClick={() => removeItem(item)} style={{ width: 22, background: "#FFFCF8", border: "0.5px solid #E8DDD4", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#bbb", cursor: "pointer" }}>×</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
        <button onClick={() => setAddWish({ type: wishType })} style={{ width: "100%", border: "1.5px dashed #E8DDD4", borderRadius: 10, background: "transparent", padding: 12, fontSize: 11, fontWeight: 600, color: "#999", marginTop: 8, cursor: "pointer" }}>{addText}</button>
      </>
    );
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ background: "#1C0A00", borderRadius: 12, padding: "12px 14px", margin: "14px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#FFFCF8", marginBottom: 3 }}>🎁 Share your list</div>
          <div style={{ fontSize: 10, color: "rgba(255,252,248,0.55)", lineHeight: 1.4 }}>Friends and family can see your needs and buy the perfect gift.</div>
        </div>
        <button style={{ background: "#A8001C", color: "#FFFCF8", border: "none", borderRadius: 99, padding: "8px 14px", fontSize: 10, fontWeight: 800, whiteSpace: "nowrap", cursor: "pointer" }}>Share link</button>
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", marginBottom: 14, paddingBottom: 2 }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setGiftSubTab(t.id)} style={pillStyle(giftSubTab === t.id)}>{t.label}</button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={() => setAddWish({ type: giftSubTab === "makeup" ? "makeup" : "skincare" })}
          style={{ padding: "7px 12px", borderRadius: 999, border: "1px solid #1C0A00", background: "#1C0A00", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          + Add to Wishlist
        </button>
      </div>

      {giftSubTab === "needs" && (
        <>
          <div style={{ background: "#F0FAF1", border: "0.5px solid #2D7A3A", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
            <div style={{ width: 7, height: 7, background: "#2D7A3A", borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ fontSize: 10, color: "#2D7A3A", fontWeight: 600, lineHeight: 1.35 }}>
              Routine built for <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700 }}>{characterName}</span> skin — from your quiz.
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", marginBottom: 12 }}>
            {ROUTINE_TABS.map(t => {
              const on = activeRoutineTab === t.key;
              return (
                <button key={t.key} onClick={() => setActiveRoutineTab(t.key)} style={{ background: on ? "#1C0A00" : "#fff", color: on ? "#FFFCF8" : "#999", borderRadius: 99, border: on ? "none" : "0.5px solid #E8DDD4", padding: "6px 12px", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", cursor: "pointer" }}>
                  <span style={{ fontSize: 8, fontWeight: 800 }}>{t.num}</span> {t.label}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 24, marginBottom: 10, fontSize: 11, fontWeight: 800, color: "#1C0A00", textTransform: "uppercase", letterSpacing: "0.06em" }}>Skincare Wishlist</div>
          {renderWishlist(
            skincareWishlist,
            ["All", "Serum", "Moisturizer", "SPF", "Mask"],
            { bg: "#F0FAF1", color: "#2D7A3A", border: "#2D7A3A", text: "Skin" },
            "+ Add skincare to wishlist",
            "skincare",
          )}

          <div style={{ marginTop: 24, marginBottom: 10, fontSize: 11, fontWeight: 800, color: "#1C0A00", textTransform: "uppercase", letterSpacing: "0.06em" }}>Makeup Wishlist</div>
          {renderWishlist(
            makeupWishlist,
            ["All", "Lip", "Eye", "Base", "Blush"],
            { bg: "#FFF0F5", color: "#C2185B", border: "#C2185B", text: "Makeup" },
            "+ Add makeup to wishlist",
            "makeup",
          )}
        </>
      )}

      {giftSubTab === "skincare" && renderWishlist(
        skincareWishlist,
        ["All", "Serum", "Moisturizer", "SPF", "Mask"],
        { bg: "#F0FAF1", color: "#2D7A3A", border: "#2D7A3A", text: "Skin" },
        "+ Add skincare to wishlist",
        "skincare",
      )}

      {giftSubTab === "makeup" && renderWishlist(
        makeupWishlist,
        ["All", "Lip", "Eye", "Base", "Blush"],
        { bg: "#FFF0F5", color: "#C2185B", border: "#C2185B", text: "Makeup" },
        "+ Add makeup to wishlist",
        "makeup",
      )}
      {addWish && userId && (
        <AddWishlistSheet
          userId={userId}
          type={addWish.type}
          onClose={() => setAddWish(null)}
          onSaved={(it: GiftItem) => {
            if (it.type === "skincare") setSkincareWishlist(prev => [it, ...prev]);
            else setMakeupWishlist(prev => [it, ...prev]);
            setAddWish(null);
          }}
        />
      )}
      {addWish && !userId && (
        <Sheet onClose={() => setAddWish(null)}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1C0A00" }}>Sign in to add to your wishlist</div>
        </Sheet>
      )}
    </div>
  );
}

// ---------- Tab 4: Skin Chart ----------
function AddWishlistSheet({ userId, type, onClose, onSaved }: { userId: string; type: "skincare" | "makeup"; onClose: () => void; onSaved: (it: GiftItem) => void }) {
  const [query, setQuery] = useState("");
  const [manual, setManual] = useState(false);
  const [picked, setPicked] = useState<ProductSearchRow | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [emoji, setEmoji] = useState("🎁");
  const [url, setUrl] = useState("");
  const [store, setStore] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onPick = (p: ProductSearchRow) => {
    setPicked(p);
    setName(p.name);
    setBrand(p.brand);
    setCategory(p.category ?? "");
    setImageUrl(p.image_url);
    setProductId(p.id);
    setQuery("");
    setManual(true);
  };

  const reset = () => {
    setPicked(null); setName(""); setBrand(""); setCategory(""); setImageUrl(null); setProductId(null); setManual(false);
  };

  const save = async () => {
    setErr(null);
    if (!name.trim()) { setErr("Product name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        user_id: userId,
        product_id: productId,
        product_name: name.trim(),
        brand: brand.trim() || null,
        category: category.trim() || null,
        emoji: emoji.trim() || "🎁",
        image_url: imageUrl,
        affiliate_url: url.trim() || null,
        affiliate_store: store.trim() || null,
        type,
        is_public: true,
      };
      const { data, error } = await supabase.from("gift_wishlist" as any).insert(payload).select().single();
      if (error) throw error;
      const row = (data as any) ?? { id: crypto.randomUUID(), ...payload };
      onSaved({
        id: row.id,
        product_id: row.product_id ?? null,
        product_name: row.product_name,
        brand: row.brand,
        category: row.category,
        emoji: row.emoji,
        affiliate_url: row.affiliate_url,
        affiliate_store: row.affiliate_store,
        type: row.type,
        image_url: row.image_url ?? null,
      });
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #E8DDD4", borderRadius: 8, fontSize: 14, background: "#fff", color: "#1C0A00", boxSizing: "border-box" };
  const labelStyle: CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "#666", marginBottom: 6, display: "block" };
  const badge = type === "skincare"
    ? { bg: "#F0FAF1", color: "#2D7A3A", border: "#2D7A3A", text: "Skin" }
    : { bg: "#FFF0F5", color: "#C2185B", border: "#C2185B", text: "Makeup" };

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#1C0A00" }}>Add to Wishlist</div>
        <span style={{ fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 99, background: badge.bg, color: badge.color, border: `0.5px solid ${badge.border}`, textTransform: "uppercase", letterSpacing: 0.4 }}>{badge.text}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {!manual && (
          <>
            <div><label style={labelStyle}>Search products</label><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products..." style={inputStyle} /></div>
            <ProductSearchList query={query} onPick={onPick} />
            <button type="button" onClick={() => setManual(true)}
              style={{ background: "transparent", border: "none", color: "#5C4033", fontSize: 12, fontWeight: 600, textDecoration: "underline", cursor: "pointer", alignSelf: "flex-start", padding: 0 }}>
              Not finding it? Add manually
            </button>
          </>
        )}
        {manual && picked && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, border: "1px solid #E8DDD4", borderRadius: 8, background: "#fff" }}>
            <div style={{ width: 44, height: 44, borderRadius: 6, background: imageUrl ? `#F5F0EB url(${imageUrl}) center/cover no-repeat` : "#F5F0EB", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1C0A00" }}>{name}</div>
              <div style={{ fontSize: 10, color: "#999" }}>{brand}</div>
            </div>
            <button type="button" onClick={reset} style={{ background: "transparent", border: "none", color: "#999", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>Change</button>
          </div>
        )}
        {manual && !picked && (
          <>
            <div><label style={labelStyle}>Product name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rhode Peptide Lip Tint" style={inputStyle} /></div>
            <div><label style={labelStyle}>Brand</label><input value={brand} onChange={e => setBrand(e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Category</label><input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Lip, Serum, SPF" style={inputStyle} /></div>
            <button type="button" onClick={() => setManual(false)}
              style={{ background: "transparent", border: "none", color: "#5C4033", fontSize: 12, fontWeight: 600, textDecoration: "underline", cursor: "pointer", alignSelf: "flex-start", padding: 0 }}>
              ← Back to search
            </button>
          </>
        )}
        <div><label style={labelStyle}>Emoji</label><input value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={4} style={{ ...inputStyle, width: 80, textAlign: "center", fontSize: 22 }} /></div>
        <div><label style={labelStyle}>Affiliate link</label><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." style={inputStyle} /></div>
        <div><label style={labelStyle}>Store name</label><input value={store} onChange={e => setStore(e.target.value)} placeholder="e.g. Sephora, Amazon" style={inputStyle} /></div>
        {err && <div style={{ fontSize: 12, color: "#A8001C" }}>{err}</div>}
        <button onClick={save} disabled={saving}
          style={{ marginTop: 4, padding: "12px 16px", borderRadius: 10, border: "none", background: "#1C0A00", color: "#FFFCF8", fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving…" : "Save to wishlist"}
        </button>
      </div>
    </Sheet>
  );
}

function ChartTab({ persona, logs, onAdd, onEdit }: { persona: typeof PERSONAS[SkinType]; logs: TLog[]; onAdd: () => void; onEdit: (l: TLog) => void }) {
  const navigate = useNavigate();
  const [treatFilter, setTreatFilter] = useState("All");
  const treats = treatFilter === "All" ? logs : logs.filter(t => (t.category ?? "") === treatFilter);

  return (
    <>
      <PrivateLabel />

      {/* Score cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600 }}>Skin Score</div>
          <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1, marginTop: 4 }}>78</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: C.good, fontWeight: 700, marginTop: 4 }}>
            <ArrowUp size={12} /> +6 <span style={{ color: C.textLight, fontWeight: 500 }}>vs last month</span>
          </div>
          <div style={{ height: 6, background: C.border, borderRadius: 999, marginTop: 10, overflow: "hidden" }}>
            <div style={{ width: "78%", height: "100%", background: persona.color }} />
          </div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600 }}>Skin Age</div>
          <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1, marginTop: 4 }}>23</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: C.good, fontWeight: 700, marginTop: 4 }}>
            <ArrowDown size={12} /> 2 yrs <span style={{ color: C.textLight, fontWeight: 500 }}>actual: 25</span>
          </div>
          <div style={{ fontSize: 11, color: C.good, marginTop: 10, fontWeight: 600 }}>Looking younger 🎉</div>
        </div>
      </div>

      {/* Trend graph */}
      <SectionTitle>Score Trend</SectionTitle>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
        <TrendChart values={SCORE_TREND} months={TREND_MONTHS} color={persona.color} />
      </div>

      {/* Problem tracker */}
      <SectionTitle>Problem Tracker</SectionTitle>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        {PROBLEMS.map((p, i) => {
          const badge = p.status === "fixed" ? { bg: C.goodBg, color: C.good, text: "✓ Fixed" }
            : p.status === "improving" ? { bg: C.badBg, color: C.bad, text: "↑ Improving" }
            : { bg: "#EFEFEC", color: C.textMid, text: "Monitoring" };
          return (
            <div key={p.name} style={{ padding: 14, borderBottom: i < PROBLEMS.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: badge.bg, color: badge.color }}>{badge.text}</span>
              </div>
              <div style={{ height: 5, background: C.border, borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${p.pct}%`, height: "100%", background: badge.color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Treatment log */}
      <SectionTitle action={
        <button onClick={onAdd} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          <Plus size={12} /> Add
        </button>
      }>Treatment Log</SectionTitle>
      <FilterRow items={TREAT_FILTERS} active={treatFilter} onChange={setTreatFilter} />
      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {treats.length === 0 && (
          <div style={{ fontSize: 12, color: C.textLight, textAlign: "center", padding: "20px 10px", border: `0.5px dashed ${C.border}`, borderRadius: 10 }}>
            No treatments logged yet. Tap Add to log your first.
          </div>
        )}
        {treats.map(t => (
          <div key={t.id} onClick={() => onEdit(t)} role="button"
            style={{ textAlign: "left", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, cursor: "pointer", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 32 }}>{t.emoji ?? "💉"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <TreatmentNameLink name={t.treatment_name} slug={t.treatment_slug} />
                <div style={{ fontSize: 11, color: C.textLight }}>{t.category ?? "—"} · {t.date ?? ""}</div>
                {t.clinic_id && t.clinic_name && (
                  <div
                    onClick={(e) => { e.stopPropagation(); navigate({ to: "/clinics/$id", params: { id: t.clinic_id! } }); }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, color: "#A8001C", textDecoration: "underline", marginTop: 4, cursor: "pointer" }}>
                    {t.clinic_name} <ArrowRight size={10} />
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 1 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={12} fill={i < (t.rating ?? 0) ? C.gold : "transparent"} color={i < (t.rating ?? 0) ? C.gold : C.borderStrong} />
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {(t.fixed ?? []).map(f => <span key={f} style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: C.goodBg, color: C.good }}>✓ Fixed {f}</span>)}
              {(t.working ?? []).map(w => <span key={w} style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: C.warnBg, color: C.warn }}>△ {w}</span>)}
            </div>
            <div style={{ fontSize: 11, color: C.textLight, marginTop: 8 }}>Tap to edit →</div>
          </div>
        ))}
      </div>

      {/* Next steps */}
      <SectionTitle>Best Next Steps</SectionTitle>
      <div style={{ fontSize: 12, color: C.textLight, marginTop: -8, marginBottom: 12 }}>Based on your skin data + treatment history</div>
      <div style={{ display: "grid", gap: 12 }}>
        {NEXT_STEPS.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: "50%", background: C.ink, color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{s.name}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: "#EFEFEC", color: C.textMid, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.type}</span>
              </div>
              <div style={{ fontSize: 12, color: C.textMid, marginTop: 4, lineHeight: 1.5 }}>{s.text}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Share */}
      <div style={{ background: C.ink, color: "#fff", borderRadius: 14, padding: 20, marginTop: 28 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>📋 Share with your Dermatologist</div>
        <div style={{ fontSize: 13, opacity: 0.75, marginTop: 6, lineHeight: 1.5 }}>No more explaining from scratch. Send this before your appointment.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
          <button style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", borderRadius: 8, background: "#fff", color: C.ink, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            <Link2 size={14} /> Get Link
          </button>
          <button style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", borderRadius: 8, background: "#3A2418", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

    </>
  );
}

function TreatmentSheet({ t, onClose }: { t: typeof TREATMENTS[number]; onClose: () => void }) {
  const allFixed = t.working.length === 0 && t.fixed.length > 0;
  return (
    <Sheet onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 40 }}>{t.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{t.name}</div>
          <div style={{ fontSize: 12, color: C.textLight }}>{t.category} · {t.date}</div>
        </div>
        <div style={{ display: "flex", gap: 1 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={14} fill={i < t.rating ? C.gold : "transparent"} color={i < t.rating ? C.gold : C.borderStrong} />
          ))}
        </div>
      </div>
      <p style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6, marginTop: 14 }}>{t.notes}</p>

      {t.fixed.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: C.textMid, marginBottom: 8 }}>Fixed</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {t.fixed.map(f => <span key={f} style={{ fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 999, background: C.goodBg, color: C.good }}>✓ {f}</span>)}
          </div>
        </div>
      )}
      {t.working.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: C.textMid, marginBottom: 8 }}>Still working on</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {t.working.map(w => <span key={w} style={{ fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 999, background: C.warnBg, color: C.warn }}>△ {w}</span>)}
          </div>
        </div>
      )}
      {allFixed && <div style={{ marginTop: 16, fontSize: 13, fontWeight: 700, color: C.good }}>✓ All concerns resolved</div>}
    </Sheet>
  );
}

// ---------- Trend chart ----------
function TrendChart({ values, months, color }: { values: number[]; months: string[]; color: string }) {
  const W = 320, H = 140, P = 16;
  const max = 100, min = 0;
  const pts = values.map((v, i) => {
    const x = P + (i * (W - P * 2)) / (values.length - 1);
    const y = P + ((max - v) * (H - P * 2)) / (max - min);
    return { x, y };
  });
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${path} L${pts[pts.length - 1].x},${H - P} L${pts[0].x},${H - P} Z`;
  const id = useMemo(() => `g-${Math.random().toString(36).slice(2, 7)}`, []);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${id})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.2" fill="#fff" stroke={color} strokeWidth="2" />
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: C.textLight }}>
        {months.map(m => <span key={m}>{m}</span>)}
      </div>
    </div>
  );
}

// ---------- Bottom sheet ----------
function Sheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", background: C.bg, borderRadius: "16px 16px 0 0", padding: "20px 18px 32px", position: "relative" }}>
        <div style={{ width: 40, height: 4, background: C.borderStrong, borderRadius: 999, margin: "0 auto 14px" }} />
        <button onClick={onClose}
          style={{ position: "absolute", top: 14, right: 14, width: 30, height: 30, borderRadius: "50%", background: C.surface, border: `1px solid ${C.border}`, display: "grid", placeItems: "center", cursor: "pointer" }}>
          <X size={14} />
        </button>
        {children}
      </div>
    </div>
  );
}

// ---------- What I've Done strip ----------
function WhatIveDoneStrip({ logs, onTogglePublic, onAdd, debugMsg }: { logs: TLog[]; onTogglePublic: (id: string, next: boolean) => void; onAdd: () => void; debugMsg?: string }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#A8001C" }}>What I've Done</div>
        {debugMsg && <div style={{ fontSize: 9, color: "#999", fontWeight: 600 }}>{debugMsg}</div>}
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none", margin: "0 -16px", padding: "0 16px 4px" }}>
        {logs.map(l => (
          <div key={l.id} style={{ flexShrink: 0, width: 130, background: "#FFFFFF", border: "0.5px solid #E8DDD4", borderRadius: 10, padding: 10 }}>
            <TreatmentNameLink name={l.treatment_name} slug={l.treatment_slug} />
            {l.clinic_name && (
              <div style={{ fontSize: 11, color: "#A8001C", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.clinic_name}</div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ fontSize: 10, color: "#999" }}>{l.cost ?? ""}</span>
              <button
                type="button"
                aria-label="Toggle public"
                onClick={() => onTogglePublic(l.id, !l.is_public)}
                style={{ width: 28, height: 16, borderRadius: 8, background: l.is_public ? "#A8001C" : "#ddd", position: "relative", border: "none", cursor: "pointer", padding: 0 }}>
                <span style={{ position: "absolute", top: 2, left: l.is_public ? 14 : 2, width: 12, height: 12, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
              </button>
            </div>
          </div>
        ))}
        <button onClick={onAdd}
          style={{ flexShrink: 0, width: 80, minHeight: 90, border: "0.5px dashed #E8DDD4", borderRadius: 10, background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: "#999", fontFamily: "inherit" }}>
          <Plus size={18} />
          <span style={{ fontSize: 10 }}>log treatment</span>
        </button>
      </div>
      <div style={{ fontSize: 10, color: "#ccc", marginTop: 6 }}>Toggle on = visible to subscribers · off = private</div>
    </div>
  );
}

// ---------- Treatment Log add/edit sheet ----------
function TreatmentNameLink({ name, slug, style }: { name: string; slug: string | null; style?: CSSProperties }) {
  const navigate = useNavigate();
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(slug);
  useEffect(() => { setResolvedSlug(slug); }, [slug]);

  const handleClick = async (e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let s = resolvedSlug;
    console.log("[TreatmentNameLink] click", { name, initialSlug: slug, resolvedSlug });
    if (!s && name) {
      const { data, error } = await supabase
        .from("treatments")
        .select("slug")
        .ilike("name", name)
        .maybeSingle();
      console.log("[TreatmentNameLink] lookup by name", { name, data, error });
      s = (data as any)?.slug ?? null;
      if (s) setResolvedSlug(s);
    }
    if (!s && name) {
      // Last-resort: slugify the name and let /treatment/$slug handle not-found gracefully
      s = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      console.log("[TreatmentNameLink] fallback slugified", { name, s });
    }
    console.log("[TreatmentNameLink] navigating to", s);
    if (s) navigate({ to: "/treatment/$slug", params: { slug: s } });
  };

  const baseStyle: CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: "#1C0A00",
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textDecoration: "none",
    cursor: "pointer",
    background: "none",
    border: "none",
    padding: 0,
    fontFamily: "inherit",
    display: "block",
    width: "100%",
    textAlign: "left",
    ...style,
  };

  return (
    <button type="button" style={baseStyle} onClick={handleClick}>{name}</button>
  );
}

function TreatmentLogSheet({ userId, initial, onClose, onSaved }: {
  userId: string;
  initial: TLog | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [treatmentName, setTreatmentName] = useState(initial?.treatment_name ?? "");
  const [treatmentId, setTreatmentId] = useState<string | null>(initial?.treatment_id ?? null);
  const [treatmentSlug, setTreatmentSlug] = useState<string | null>(initial?.treatment_slug ?? null);
  const [treatmentSuggestions, setTreatmentSuggestions] = useState<Array<{ id: string; name: string; slug: string | null; category: string | null }>>([]);
  const [category, setCategory] = useState(initial?.category ?? "");
  const [clinicQuery, setClinicQuery] = useState(initial?.clinic_name ?? "");
  const [clinicId, setClinicId] = useState<string | null>(initial?.clinic_id ?? null);
  const [cost, setCost] = useState(initial?.cost ?? "");
  const initialMonth = initial?.date ? String(initial.date).slice(0, 7) : "";
  const [month, setMonth] = useState(initialMonth);
  const [rating, setRating] = useState(initial?.rating ?? 5);
  const [fixedText, setFixedText] = useState((initial?.fixed ?? []).join(", "));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "💉");
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!clinicQuery || clinicQuery === initial?.clinic_name) { setSuggestions([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("clinics")
        .select("id,name")
        .ilike("name", `%${clinicQuery}%`)
        .limit(5);
      if (alive) setSuggestions((data as any[]) ?? []);
    }, 200);
    return () => { alive = false; clearTimeout(t); };
  }, [clinicQuery, initial?.clinic_name]);

  useEffect(() => {
    if (!treatmentName || treatmentId) { setTreatmentSuggestions([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("treatments")
        .select("id,name,slug,category")
        .ilike("name", `%${treatmentName}%`)
        .eq("active", true)
        .limit(6);
      if (alive) setTreatmentSuggestions((data as any[]) ?? []);
    }, 200);
    return () => { alive = false; clearTimeout(t); };
  }, [treatmentName, treatmentId]);

  const save = async () => {
    if (!treatmentName.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    let finalId = treatmentId;
    let finalSlug = treatmentSlug;
    if (finalId && !finalSlug) {
      const { data: t } = await supabase
        .from("treatments")
        .select("slug")
        .eq("id", finalId)
        .maybeSingle();
      finalSlug = (t as any)?.slug ?? null;
    }
    if (!finalId) {
      const { data: t } = await supabase
        .from("treatments")
        .select("id,slug")
        .ilike("name", treatmentName.trim())
        .maybeSingle();
      if (t) {
        finalId = (t as any).id ?? null;
        finalSlug = (t as any).slug ?? finalSlug;
      }
    }
    const payload = {
      user_id: userId,
      treatment_id: finalId,
      treatment_slug: finalSlug,
      treatment_name: treatmentName.trim(),
      category: category || null,
      clinic_id: clinicId,
      clinic_name: clinicQuery || null,
      cost: cost || null,
      date: month ? `${month}-01` : null,
      rating,
      fixed: fixedText.split(",").map(s => s.trim()).filter(Boolean),
      notes: notes || null,
      emoji,
      is_public: initial?.is_public ?? false,
    };
    const { error } = initial
      ? await supabase.from("treatment_logs").update(payload).eq("id", initial.id)
      : await supabase.from("treatment_logs").insert(payload);
    setSaving(false);
    if (error) {
      setErrorMsg(error.message || "Could not save. Please try again.");
      return;
    }
    onSaved();
  };

  const remove = async () => {
    if (!initial) return;
    await supabase.from("treatment_logs").delete().eq("id", initial.id);
    onSaved();
  };

  const input = { width: "100%", border: "0.5px solid #E8DDD4", background: "#fff", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "#1C0A00", fontFamily: "inherit" } as const;
  const label = { fontSize: 11, fontWeight: 700, color: "#1C0A00", marginBottom: 4, display: "block" } as const;

  return (
    <Sheet onClose={onClose}>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#1C0A00", marginBottom: 14 }}>{initial ? "Edit treatment" : "Log a treatment"}</div>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ position: "relative" }}>
          <label style={label}>Treatment name</label>
          <input
            style={input}
            value={treatmentName}
            onChange={e => { setTreatmentName(e.target.value); setTreatmentId(null); setTreatmentSlug(null); }}
            placeholder="Search treatments…"
          />
          {treatmentSuggestions.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 8, marginTop: 4, zIndex: 6, maxHeight: 200, overflowY: "auto" }}>
              {treatmentSuggestions.map(s => (
                <button key={s.id} type="button"
                  onClick={() => {
                    setTreatmentId(s.id);
                    setTreatmentSlug(s.slug);
                    setTreatmentName(s.name);
                    if (s.category && !category) setCategory(s.category);
                    setTreatmentSuggestions([]);
                  }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 13, background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", color: "#1C0A00" }}>
                  {s.name}{s.category ? <span style={{ color: "#999", fontSize: 11 }}> · {s.category}</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={label}>Category</label>
            <select style={input} value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Select…</option>
              <option value="Injection">Injection</option>
              <option value="Light Therapy">Light Therapy</option>
              <option value="Facial">Facial</option>
              <option value="Surgery">Surgery</option>
            </select>
          </div>
          <div>
            <label style={label}>Emoji</label>
            <input style={input} value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={2} />
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <label style={label}>Clinic</label>
          <input style={input} value={clinicQuery} onChange={e => { setClinicQuery(e.target.value); setClinicId(null); }} placeholder="Search clinics…" />
          {suggestions.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 8, marginTop: 4, zIndex: 5, maxHeight: 180, overflowY: "auto" }}>
              {suggestions.map(s => (
                <button key={s.id} type="button"
                  onClick={() => { setClinicId(s.id); setClinicQuery(s.name); setSuggestions([]); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 13, background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", color: "#1C0A00" }}>{s.name}</button>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={label}>Cost</label>
            <input style={input} value={cost} onChange={e => setCost(e.target.value)} placeholder="$250" />
          </div>
          <div>
            <label style={label}>Month</label>
            <input style={input} type="month" value={month} onChange={e => setMonth(e.target.value)} />
          </div>
        </div>
        <div>
          <label style={label}>Rating</label>
          <div style={{ display: "flex", gap: 4 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} type="button" onClick={() => setRating(n)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2 }}>
                <Star size={20} fill={n <= rating ? C.gold : "transparent"} color={n <= rating ? C.gold : C.borderStrong} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={label}>What it fixed</label>
          <input style={input} value={fixedText} onChange={e => setFixedText(e.target.value)} placeholder="e.g. texture, dullness" />
        </div>
        <div>
          <label style={label}>Notes</label>
          <textarea style={{ ...input, minHeight: 80, resize: "vertical" }} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      {errorMsg && (
        <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(168,0,28,0.08)", border: "0.5px solid rgba(168,0,28,0.3)", borderRadius: 8, color: "#A8001C", fontSize: 12, fontWeight: 600 }}>{errorMsg}</div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <button onClick={save} disabled={saving || !treatmentName.trim()}
          style={{ flex: 1, background: "#A8001C", color: "#FFFCF8", border: "none", borderRadius: 8, padding: 13, fontSize: 14, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {saving ? "Saving…" : (initial ? "Save changes" : "Log treatment")}
        </button>
        {initial && (
          <button onClick={remove} style={{ background: "transparent", color: "#999", border: "0.5px solid #E8DDD4", borderRadius: 8, padding: "13px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
        )}
      </div>
    </Sheet>
  );
}
