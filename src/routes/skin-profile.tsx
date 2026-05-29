import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pencil, Plus, Lock, Star, X, Bookmark, Link2, Download, ArrowUp, ArrowDown } from "lucide-react";
import BottomNav from "@/components/BottomNav";

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

function SkinProfilePage() {
  const [tab, setTab] = useState<Tab>("tea");
  const [quizResult, setQuizResult] = useState<any>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("skintea.quizResult");
      if (raw) {
        const parsed = JSON.parse(raw);
        setQuizResult(parsed);
      }
    } catch {}
  }, []);
  const activeSkinType = (quizResult?.skinTypeLabel as SkinType) || USER.skinType;
  const persona = PERSONAS[activeSkinType] || PERSONAS[USER.skinType];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Header persona={persona} tab={tab} setTab={setTab} />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px 80px" }}>
        {tab === "tea" && <TeaTab />}
        {tab === "shelf" && <ShelfTab />}
        {tab === "gift" && <GiftMeTab quizResult={quizResult} />}
        {tab === "saved" && <SavedTab />}
        {tab === "chart" && <ChartTab persona={persona} />}
      </main>
      <BottomNav />
    </div>
  );
}

// ---------- Header ----------
function Header({ persona, tab, setTab }: { persona: typeof PERSONAS[SkinType]; tab: Tab; setTab: (t: Tab) => void }) {
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
function SavedTab() {
  const [active, setActive] = useState("Recently Saved");
  const items = active === "Recently Saved" ? SAVED : SAVED.filter(s => s.category === active);
  return (
    <>
      <PrivateLabel />
      <FilterRow items={SAVED_FILTERS} active={active} onChange={setActive} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 16 }}>
        {items.map((p, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ aspectRatio: "1.3", background: "#F5F0EB", display: "grid", placeItems: "center", fontSize: 44 }}>{p.emoji}</div>
            <div style={{ padding: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>{p.name}</div>
              <div style={{ fontSize: 10, color: C.textLight, marginTop: 2 }}>{p.category}</div>
              <div style={{ marginTop: 6 }}><MatchPill match={p.match} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: "auto" }}>
                <button style={{ width: "100%", background: "#1C0A00", color: "#FFFCF8", border: "none", borderRadius: 6, padding: 6, fontSize: 8, fontWeight: 700, textAlign: "center", cursor: "pointer" }}>Add to My Shelf</button>
                <button style={{ width: "100%", background: "#FFF5F5", color: "#A8001C", border: "0.5px solid #A8001C", borderRadius: 6, padding: 6, fontSize: 8, fontWeight: 700, textAlign: "center", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>🎁 Add to Gift Me</button>
                <button style={{ width: "100%", background: "transparent", color: "#bbb", border: "0.5px solid #E8DDD4", borderRadius: 6, padding: 5, fontSize: 8, fontWeight: 600, textAlign: "center", cursor: "pointer" }}>Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------- Tab 4: Skin Chart ----------
function ChartTab({ persona }: { persona: typeof PERSONAS[SkinType] }) {
  const [openTreat, setOpenTreat] = useState<typeof TREATMENTS[number] | null>(null);
  const [treatFilter, setTreatFilter] = useState("All");
  const treats = treatFilter === "All" ? TREATMENTS : TREATMENTS.filter(t => t.category === treatFilter);

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
        <button style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          <Plus size={12} /> Add
        </button>
      }>Treatment Log</SectionTitle>
      <FilterRow items={TREAT_FILTERS} active={treatFilter} onChange={setTreatFilter} />
      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {treats.map(t => (
          <button key={t.id} onClick={() => setOpenTreat(t)}
            style={{ textAlign: "left", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, cursor: "pointer", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 32 }}>{t.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</div>
                <div style={{ fontSize: 11, color: C.textLight }}>{t.category} · {t.date}</div>
              </div>
              <div style={{ display: "flex", gap: 1 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={12} fill={i < t.rating ? C.gold : "transparent"} color={i < t.rating ? C.gold : C.borderStrong} />
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {t.fixed.map(f => <span key={f} style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: C.goodBg, color: C.good }}>✓ Fixed {f}</span>)}
              {t.working.map(w => <span key={w} style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: C.warnBg, color: C.warn }}>△ {w}</span>)}
            </div>
            <div style={{ fontSize: 11, color: C.textLight, marginTop: 8 }}>Tap for full notes →</div>
          </button>
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

      {openTreat && <TreatmentSheet t={openTreat} onClose={() => setOpenTreat(null)} />}
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
