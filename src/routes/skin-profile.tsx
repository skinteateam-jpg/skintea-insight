import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
const TOP_PICKS = [
  { emoji: "🧴", name: "Foaming Cleanser", brand: "CeraVe" },
  { emoji: "💧", name: "BHA Liquid", brand: "Paula's Choice" },
  { emoji: "☀️", name: "UV Daily", brand: "Beauty of Joseon" },
];

const POSTS = [
  { id: 1, emoji: "🧴", bg: "#FCE8EC", caption: "Current AM routine, simplified.", date: "Apr 12", likes: 412, comments: 38, products: [
    { emoji: "🧴", name: "Foaming Cleanser", brand: "CeraVe", category: "Cleanser", match: "good" as Match },
    { emoji: "☀️", name: "UV Daily", brand: "Beauty of Joseon", category: "SPF", match: "good" as Match },
  ]},
  { id: 2, emoji: "💧", bg: "#EFE5F7", caption: "BHA week 6 update.", date: "Apr 8", likes: 287, comments: 19, products: [
    { emoji: "💧", name: "BHA Liquid", brand: "Paula's Choice", category: "Serum", match: "good" as Match },
  ]},
  { id: 3, emoji: "🌸", bg: "#FCE4EC", caption: "Tried this mask. Mixed feelings.", date: "Apr 3", likes: 156, comments: 22, products: [
    { emoji: "🌸", name: "Clay Mask", brand: "Innisfree", category: "Face Mask", match: "warn" as Match },
  ]},
  { id: 4, emoji: "🍵", bg: "#E6F4EA", caption: "Green tea toner > everything.", date: "Mar 28", likes: 503, comments: 41, products: [
    { emoji: "🍵", name: "Green Tea Toner", brand: "Innisfree", category: "Toner", match: "good" as Match },
  ]},
  { id: 5, emoji: "🧊", bg: "#E3F2FD", caption: "Ice globes hype check.", date: "Mar 22", likes: 198, comments: 14, products: [
    { emoji: "🧊", name: "Ice Globes", brand: "Skintea Lab", category: "Device", match: "good" as Match },
  ]},
  { id: 6, emoji: "🩹", bg: "#FBF3DC", caption: "Pimple patch saves.", date: "Mar 18", likes: 342, comments: 27, products: [
    { emoji: "🩹", name: "Hydro Patches", brand: "COSRX", category: "Treatment", match: "good" as Match },
  ]},
];

const SHELF: Record<string, Array<{ emoji: string; name: string; brand: string; match: Match; top?: boolean }>> = {
  Cleanser:   [{ emoji: "🧴", name: "Foaming Cleanser", brand: "CeraVe", match: "good", top: true }, { emoji: "🧼", name: "Gel Wash", brand: "La Roche", match: "good" }],
  Toner:      [{ emoji: "🍵", name: "Green Tea Toner", brand: "Innisfree", match: "good" }, { emoji: "🌹", name: "Rose Toner", brand: "Klairs", match: "warn" }],
  Serum:      [{ emoji: "💧", name: "BHA Liquid", brand: "Paula's Choice", match: "good", top: true }, { emoji: "✨", name: "Vitamin C", brand: "Skinceuticals", match: "warn" }],
  Moisturizer:[{ emoji: "🥛", name: "Moisturizing Cream", brand: "CeraVe", match: "good" }],
  "Face Mask":[{ emoji: "🌸", name: "Clay Mask", brand: "Innisfree", match: "warn" }, { emoji: "🍯", name: "Honey Mask", brand: "I'm From", match: "good" }],
  Device:     [{ emoji: "🧊", name: "Ice Globes", brand: "Skintea Lab", match: "good" }],
  SPF:        [{ emoji: "☀️", name: "UV Daily", brand: "Beauty of Joseon", match: "good", top: true }],
};

const SAVED = [
  { emoji: "🌿", name: "Centella Ampoule", brand: "Purito", category: "Serum", match: "good" as Match },
  { emoji: "🧴", name: "Cream Cleanser", brand: "Aveeno", category: "Cleanser", match: "warn" as Match },
  { emoji: "💄", name: "Tinted Balm", brand: "Rhode", category: "Makeup", match: "good" as Match },
  { emoji: "☀️", name: "Mineral SPF", brand: "EltaMD", category: "SPF", match: "good" as Match },
  { emoji: "🧪", name: "Retinol 0.3", brand: "The Ordinary", category: "Serum", match: "bad" as Match },
  { emoji: "🌹", name: "Rose Water", brand: "Heritage", category: "Toner", match: "warn" as Match },
];
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
    setLogs(((data as any[]) ?? []) as TLog[]);
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
        {tab === "tea" && <TeaTab />}
        {tab === "shelf" && <ShelfTab />}
        {tab === "gift" && <GiftMeTab quizResult={quizResult} />}
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

// ---------- Tab 1: The Tea ----------
function TopPicksRow() {
  return (
    <>
      <SectionTitle>★ Top 3 Picks</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {TOP_PICKS.map((p, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", top: 8, left: 8, background: C.gold, color: "#fff", fontSize: 9, fontWeight: 800, padding: "3px 6px", borderRadius: 4, letterSpacing: 0.5 }}>★ TOP PICK</div>
            <div style={{ aspectRatio: "1", background: "#F5F0EB", display: "grid", placeItems: "center", fontSize: 40 }}>{p.emoji}</div>
            <div style={{ padding: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>{p.brand}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function TeaTab() {
  const [openPost, setOpenPost] = useState<typeof POSTS[number] | null>(null);
  return (
    <>
      <TopPicksRow />

      <SectionTitle>Posts</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
        {POSTS.map(p => (
          <button key={p.id} onClick={() => setOpenPost(p)}
            style={{ position: "relative", aspectRatio: "1", background: p.bg, border: "none", cursor: "pointer", display: "grid", placeItems: "center", padding: 0 }}>
            <span style={{ fontSize: 56 }}>{p.emoji}</span>
            <span style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.65)", color: "#fff", fontSize: 10, fontWeight: 600, padding: "3px 6px", borderRadius: 4 }}>🏷 {p.products.length}</span>
          </button>
        ))}
      </div>

      {openPost && <PostSheet post={openPost} onClose={() => setOpenPost(null)} />}
    </>
  );
}

function PostSheet({ post, onClose }: { post: typeof POSTS[number]; onClose: () => void }) {
  const persona = PERSONAS[USER.skinType];
  return (
    <Sheet onClose={onClose}>
      <div style={{ aspectRatio: "1", background: post.bg, display: "grid", placeItems: "center", fontSize: 120, borderRadius: 12, marginBottom: 16 }}>{post.emoji}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontWeight: 700 }}>@{USER.username}</span>
        <span style={{ padding: "2px 8px", borderRadius: 999, background: persona.bg, color: persona.color, fontSize: 10, fontWeight: 700 }}>{persona.name} {persona.emoji}</span>
      </div>
      <div style={{ fontSize: 11, color: C.textLight }}>{post.date}</div>
      <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.5 }}>{post.caption}</p>
      <div style={{ display: "flex", gap: 16, fontSize: 13, color: C.textMid, marginTop: 8 }}>
        <span>♥ {post.likes}</span><span>💬 {post.comments}</span>
      </div>

      <div style={{ marginTop: 20, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Products in this post</div>
      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        {post.products.map((pr, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
            <div style={{ width: 44, height: 44, background: "#F5F0EB", borderRadius: 8, display: "grid", placeItems: "center", fontSize: 22 }}>{pr.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{pr.name}</div>
              <div style={{ fontSize: 11, color: C.textLight }}>{pr.brand} · {pr.category}</div>
              <div style={{ marginTop: 4 }}><MatchPill match={pr.match} /></div>
            </div>
            <button style={{ display: "grid", placeItems: "center", width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer" }}>
              <Bookmark size={16} />
            </button>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

// ---------- Tab 2: My Shelf ----------
function ShelfTab() {
  const cats = ["All", ...Object.keys(SHELF)];
  const [active, setActive] = useState("All");
  const visible = active === "All" ? Object.entries(SHELF) : Object.entries(SHELF).filter(([c]) => c === active);
  return (
    <>
      <TopPicksRow />
      <div style={{ marginTop: 8 }}><FilterRow items={cats} active={active} onChange={setActive} /></div>
      {visible.map(([cat, items]) => (
        <div key={cat} style={{ marginTop: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{cat}</div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", margin: "0 -16px", padding: "0 16px 8px" }}>
            {items.map((p, i) => (
              <div key={i} style={{ flexShrink: 0, width: 120, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", position: "relative" }}>
                {p.top && <div style={{ position: "absolute", top: 6, left: 6, background: C.gold, color: "#fff", fontSize: 8, fontWeight: 800, padding: "2px 5px", borderRadius: 3, letterSpacing: 0.5 }}>TOP PICK</div>}
                <div style={{ aspectRatio: "1", background: "#F5F0EB", display: "grid", placeItems: "center", fontSize: 36 }}>{p.emoji}</div>
                <div style={{ padding: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, minHeight: 26 }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: C.textLight, margin: "2px 0 6px" }}>{p.brand}</div>
                  <MatchPill match={p.match} />
                </div>
              </div>
            ))}
            <button style={{ flexShrink: 0, width: 120, aspectRatio: "0.78", border: `1.5px dashed ${C.borderStrong}`, borderRadius: 10, background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: C.textLight }}>
              <Plus size={22} />
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

// ---------- Tab 3: Saved ----------
function CrimsonLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#A8001C", margin: "20px 0 10px" }}>{children}</div>;
}

function SavedTab({ userId }: { userId: string | null }) {
  const [active, setActive] = useState("Recently Saved");
  const items = active === "Recently Saved" ? SAVED : SAVED.filter(s => s.category === active);
  const navigate = useNavigate();
  const [savedClinics, setSavedClinics] = useState<Array<{ id: string; name: string; neighborhood: string | null; image_url: string | null; best_for: string[] | null; trust_score: number | null; skintea_score: number | null; }>>([]);
  const [savedPosts, setSavedPosts] = useState<Array<{ id: string; post_id: string; post_type: string }>>([]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 16 }}>
        {items.map((p, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ aspectRatio: "1.3", background: "#F5F0EB", display: "grid", placeItems: "center", fontSize: 44 }}>{p.emoji}</div>
            <div style={{ padding: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>{p.name}</div>
              <div style={{ fontSize: 10, color: C.textLight, marginTop: 2 }}>{p.category}</div>
              <div style={{ marginTop: 6 }}><MatchPill match={p.match} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                <button style={{ width: "100%", background: "#1C0A00", color: "#FFFCF8", border: "none", borderRadius: 6, padding: 6, fontSize: 8, fontWeight: 700, cursor: "pointer" }}>Add to My Shelf</button>
                <button style={{ width: "100%", background: "#FFF5F5", color: "#A8001C", border: "0.5px solid #A8001C", borderRadius: 6, padding: 6, fontSize: 8, fontWeight: 700, cursor: "pointer" }}>🎁 Add to Gift Me</button>
                <button style={{ width: "100%", background: "transparent", color: "#bbb", border: "0.5px solid #E8DDD4", borderRadius: 6, padding: 5, fontSize: 8, fontWeight: 600, cursor: "pointer" }}>Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>

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
function GiftMeTab({ quizResult }: { quizResult: any }) {
  const [giftSubTab, setGiftSubTab] = useState<"needs" | "skincare" | "makeup">("needs");
  const [activeRoutineTab, setActiveRoutineTab] = useState("cleanser");
  const [skincareWishlist, setSkincareWishlist] = useState([
    { emoji: "🌿", name: "Centella Unscented Serum", brand: "Purito", category: "Serum", affiliate: "Amazon" },
    { emoji: "☀️", name: "UV Clear SPF 46", brand: "EltaMD", category: "SPF", affiliate: "Amazon" },
    { emoji: "🫙", name: "The Water Cream", brand: "Tatcha", category: "Moisturizer", affiliate: "Sephora" },
    { emoji: "🍉", name: "Watermelon Sleeping Mask", brand: "Glow Recipe", category: "Mask", affiliate: "Sephora" },
  ]);
  const [makeupWishlist, setMakeupWishlist] = useState([
    { emoji: "💄", name: "Peptide Lip Tint", brand: "Rhode", category: "Lip", affiliate: "Sephora" },
    { emoji: "🌟", name: "Glowgasm Face Palette", brand: "Charlotte Tilbury", category: "Highlighter", affiliate: "Sephora" },
    { emoji: "🫦", name: "Lip Cheat Liner", brand: "Charlotte Tilbury", category: "Lip Liner", affiliate: "Sephora" },
    { emoji: "🌸", name: "Orgasm Blush", brand: "NARS", category: "Blush", affiliate: "Sephora" },
  ]);

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

  const placeholderPicks = [
    { rank: 1, emoji: "🧴", brand: "CeraVe", name: "Foaming Cleanser", pct: "94%" },
    { rank: 2, emoji: "💧", brand: "Paula's Choice", name: "BHA Liquid", pct: "91%" },
    { rank: 3, emoji: "☀️", brand: "Beauty of Joseon", name: "Relief Sun", pct: "89%" },
    { rank: 4, emoji: "🥛", brand: "CeraVe", name: "Moisturizing Cream", pct: "87%" },
  ];

  const renderWishlist = (
    list: typeof skincareWishlist,
    setList: (l: typeof skincareWishlist) => void,
    filters: string[],
    badge: { bg: string; color: string; border: string; text: string },
    addText: string,
  ) => {
    const [activeFilter, _setActiveFilter] = [filters[0], (_: string) => {}];
    return (
      <>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", marginBottom: 12 }}>
          {filters.map(f => (
            <button key={f} style={pillStyle(f === activeFilter)}>{f}</button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {list.map((item) => (
            <div key={item.name} style={{ background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ height: 75, background: "#FFFCF8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, borderBottom: "0.5px solid #E8DDD4", position: "relative" }}>
                {item.emoji}
                <span style={{ position: "absolute", top: 5, right: 5, fontSize: 7, fontWeight: 800, padding: "2px 5px", borderRadius: 99, background: badge.bg, color: badge.color, border: `0.5px solid ${badge.border}` }}>{badge.text}</span>
              </div>
              <div style={{ padding: "7px 8px 8px" }}>
                <div style={{ fontSize: 7, color: "#A8001C", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.category}</div>
                <div style={{ fontSize: 8, color: "#999" }}>{item.brand}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#1C0A00", marginBottom: 5 }}>{item.name}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <div style={{ flex: 1, background: "#1C0A00", color: "#FFFCF8", borderRadius: 6, padding: 5, fontSize: 8, fontWeight: 700, textAlign: "center" }}>Buy → {item.affiliate}</div>
                  <div onClick={() => setList(list.filter(x => x.name !== item.name))} style={{ width: 22, background: "#FFFCF8", border: "0.5px solid #E8DDD4", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#bbb", cursor: "pointer" }}>×</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button style={{ width: "100%", border: "1.5px dashed #E8DDD4", borderRadius: 10, background: "transparent", padding: 12, fontSize: 11, fontWeight: 600, color: "#999", marginTop: 8, cursor: "pointer" }}>{addText}</button>
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {placeholderPicks.map(p => (
              <div key={p.rank} style={{ background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ height: 70, background: "#FFFCF8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, borderBottom: "0.5px solid #E8DDD4", position: "relative" }}>
                  <div style={{ position: "absolute", top: 5, left: 5, width: 16, height: 16, background: "#1C0A00", color: "#FFFCF8", borderRadius: 99, fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{p.rank}</div>
                  {p.emoji}
                </div>
                <div style={{ padding: "7px 8px 10px" }}>
                  <div style={{ fontSize: 8, color: "#999" }}>{p.brand}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#1C0A00" }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: "#A8001C", fontWeight: 800 }}>{p.pct}</div>
                  <button style={{ background: "#FFF5F5", color: "#A8001C", border: "0.5px solid #A8001C", borderRadius: 6, padding: "4px 8px", fontSize: 8, fontWeight: 700, width: "100%", marginTop: 4, cursor: "pointer" }}>+ Add to wishlist</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, marginBottom: 10, fontSize: 11, fontWeight: 800, color: "#1C0A00", textTransform: "uppercase", letterSpacing: "0.06em" }}>Skincare Wishlist</div>
          {renderWishlist(
            skincareWishlist,
            setSkincareWishlist,
            ["All", "Serum", "Moisturizer", "SPF", "Mask"],
            { bg: "#F0FAF1", color: "#2D7A3A", border: "#2D7A3A", text: "Skin" },
            "+ Add skincare to wishlist",
          )}

          <div style={{ marginTop: 24, marginBottom: 10, fontSize: 11, fontWeight: 800, color: "#1C0A00", textTransform: "uppercase", letterSpacing: "0.06em" }}>Makeup Wishlist</div>
          {renderWishlist(
            makeupWishlist,
            setMakeupWishlist,
            ["All", "Lip", "Eye", "Base", "Blush"],
            { bg: "#FFF0F5", color: "#C2185B", border: "#C2185B", text: "Makeup" },
            "+ Add makeup to wishlist",
          )}
        </>
      )}

      {giftSubTab === "skincare" && renderWishlist(
        skincareWishlist,
        setSkincareWishlist,
        ["All", "Serum", "Moisturizer", "SPF", "Mask"],
        { bg: "#F0FAF1", color: "#2D7A3A", border: "#2D7A3A", text: "Skin" },
        "+ Add skincare to wishlist",
      )}

      {giftSubTab === "makeup" && renderWishlist(
        makeupWishlist,
        setMakeupWishlist,
        ["All", "Lip", "Eye", "Base", "Blush"],
        { bg: "#FFF0F5", color: "#C2185B", border: "#C2185B", text: "Makeup" },
        "+ Add makeup to wishlist",
      )}
    </div>
  );
}

// ---------- Tab 4: Skin Chart ----------
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
                {t.treatment_slug ? (
                  <Link
                    to="/treatment/$slug"
                    params={{ slug: t.treatment_slug }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: "inline-block", fontSize: 13, fontWeight: 700, color: "#1C0A00", textDecoration: "none" }}
                  >
                    {t.treatment_name}
                  </Link>
                ) : (
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1C0A00" }}>{t.treatment_name}</div>
                )}
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
            {l.treatment_slug ? (
              <Link
                to="/treatment/$slug"
                params={{ slug: l.treatment_slug }}
                style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#1C0A00", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: "none" }}
              >
                {l.treatment_name}
              </Link>
            ) : (
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1C0A00", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.treatment_name}</div>
            )}
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
    const payload = {
      user_id: userId,
      treatment_id: treatmentId,
      treatment_slug: treatmentSlug,
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
