import * as React from "react";
import { createFileRoute, useNavigate, Outlet, useMatchRoute } from "@tanstack/react-router";
import BottomNav from "@/components/BottomNav";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  MessageCircle, Bookmark, Send, X, ImagePlus, Tag, Plus, Flame, Search,
} from "lucide-react";

export const Route = createFileRoute("/tea-products")({
  head: () => ({
    meta: [
      { title: "Product Talk — Skintea" },
      { name: "description", content: "Spill the tea on the skincare products you actually use. Honest takes from your skin type." },
      { property: "og:title", content: "Product Talk — Skintea" },
      { property: "og:description", content: "Spill the tea on the skincare products you actually use." },
    ],
  }),
  component: TeaProductsPage,
});

/* ---------- Types & constants ---------- */

export type SkinType = "oily" | "dry" | "combo" | "sensitive" | "normal";
type TagKey =
  | "night-out"
  | "hot-tea"
  | "review"
  | "grwm"
  | "question"
  | "am-routine"
  | "makeup"
  | "glazed-skin"
  | "warned-you";
type PostType = "skin-tea" | "look-tea" | "spill";

export const CHARACTERS: Record<SkinType, { emoji: string; name: string }> = {
  oily: { emoji: "🍩", name: "Glazed Donut" },
  dry: { emoji: "🏜️", name: "Desert Girl" },
  combo: { emoji: "🎭", name: "Mood Board" },
  sensitive: { emoji: "🌸", name: "Main Character" },
  normal: { emoji: "😮‍💨", name: "Unbothered" },
};

export const SKIN_BG: Record<SkinType, string> = {
  oily: "#fef3c7",
  dry: "#fce7f3",
  combo: "#ede9fe",
  sensitive: "#fee2e2",
  normal: "#e0f2fe",
};

export function formatAgo(diffSec: number) {
  const diff = Math.max(1, Math.floor(diffSec));
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const TAGS: { key: TagKey | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "night-out", label: "🌙 Night Out" },
  { key: "am-routine", label: "☀️ AM Routine" },
  { key: "hot-tea", label: "🔥 Hot Tea" },
  { key: "makeup", label: "💄 Makeup" },
  { key: "glazed-skin", label: "✨ Glazed Skin" },
  { key: "warned-you", label: "⚠️ Warned You" },
];

export const TAG_LABEL: Record<TagKey, string> = {
  "night-out": "💋 Night Out",
  "hot-tea": "☕ Hot Tea",
  review: "✨ Review",
  grwm: "📸 GRWM",
  question: "❓ Question",
  "am-routine": "☀️ AM Routine",
  makeup: "💄 Makeup",
  "glazed-skin": "✨ Glazed Skin",
  "warned-you": "⚠️ Warned You",
};

type TaggedProduct = {
  id: string;
  name: string;
  brand: string;
  price: string;
  image: string;
  approval: number; // 0-100
  skinType: SkinType;
};

export type Post = {
  id: string;
  skinType: SkinType;
  tag: TagKey;
  postType: PostType;
  hashtags?: string[];
  authorName?: string;
  authorRole?: string;
  isMUA?: boolean;
  text: string;
  images: string[];
  products: TaggedProduct[];
  helped: number;
  helpedByMe: boolean;
  saved: boolean;
  comments: number;
  promptContext?: string;
  createdAt: number;
  steps?: { num: number; label: string; product: string; type: "skin" | "makeup" }[];
  totalSteps?: number;
  skinTeaMode?: "single" | "routine";
};

type ComposeStage = "type" | "skin-tea" | "look-tea" | "spill";
type SkinTeaMode = "single" | "routine";

type ComposeStep = {
  id: string;
  label: string;
  product: string;
  type: "skin" | "makeup";
};

const SKIN_STEPS = [
  "Cleanse", "Tone", "Serum", "Moisturize", "SPF",
  "Eye Cream", "Spot Treatment", "Face Oil", "Exfoliate", "Mask",
];

const MAKEUP_STEPS = [
  "Skin Prep", "Base", "Concealer", "Contour",
  "Blush", "Highlighter", "Eyes", "Lips", "Setting",
];

const SKIN_TEA_AUTOFILL: Record<string, {
  when: string; howMuch: string; watchOut: string; timeline: string;
}> = {
  "p1": { when: "AM + PM", howMuch: "2-3 drops, press gently", watchOut: "avoid direct eye area", timeline: "2-3 weeks" },
  "p2": { when: "AM + PM", howMuch: "3-4 drops, press — don't rub", watchOut: "don't layer with Vitamin C same day", timeline: "2 weeks" },
  "p3": { when: "PM", howMuch: "pea-sized amount, pat gently", watchOut: "patch test first", timeline: "4 weeks" },
  "p4": { when: "AM + PM", howMuch: "1-2 pumps, pat into skin", watchOut: "refrigerate after opening", timeline: "3-4 weeks" },
  "p5": { when: "PM only — start 2x per week", howMuch: "pea-sized for whole face", watchOut: "purge is real weeks 2-6 — don't quit", timeline: "3 months minimum" },
  "default": { when: "follow product instructions", howMuch: "as directed", watchOut: "patch test before first use", timeline: "4-6 weeks" },
};

const PRODUCT_CATALOG: TaggedProduct[] = [
  { id: "p1", name: "Hydra B5 Serum", brand: "La Roche", price: "$32", image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200", approval: 78, skinType: "dry" },
  { id: "p2", name: "Niacinamide 10%", brand: "The Ordinary", price: "$8", image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200", approval: 65, skinType: "oily" },
  { id: "p3", name: "Cica Balm", brand: "Dr. Jart", price: "$28", image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=200", approval: 45, skinType: "sensitive" },
  { id: "p4", name: "Snail Mucin", brand: "COSRX", price: "$25", image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=200", approval: 82, skinType: "combo" },
  { id: "p5", name: "Retinol 0.3%", brand: "Paula's", price: "$56", image: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab12?w=200", approval: 35, skinType: "sensitive" },
];

const PROMPTS = [
  "what's in your 'just in case tonight' bag? 💋",
  "Worst skincare mistake you've ever made?",
  "Drugstore dupe that beat the luxury original?",
  "What's currently sitting on your shelf collecting dust?",
];

export const INITIAL_POSTS: Post[] = [
  {
    id: "6",
    skinType: "combo",
    tag: "night-out",
    postType: "look-tea",
    authorName: "sabrina.mua",
    authorRole: "celebrity makeup artist",
    isMUA: true,
    text: "okay fine. here's the skin prep i did before the met gala look. one product did 80% of the work and it's $12.",
    hashtags: ["#metgala", "#skinsecret", "#makeup", "#nightout"],
    images: [
      "https://images.unsplash.com/photo-1522335789203-aaa57bd14abc?w=600",
      "https://images.unsplash.com/photo-1503236823255-94609f598e71?w=600",
      "https://images.unsplash.com/photo-1571908598047-29e7a98c1c2c?w=600",
    ],
    products: [
      {
        id: "p6",
        name: "Flawless Filter",
        brand: "Charlotte Tilbury",
        price: "$12",
        image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=200",
        approval: 89,
        skinType: "combo",
      },
    ],
    steps: [
      { num: 1, label: "Skin Prep", product: "Flawless Filter — Charlotte Tilbury", type: "skin" },
      { num: 2, label: "Base", product: "Armani Luminous Silk Foundation", type: "makeup" },
      { num: 3, label: "Contour", product: "Hourglass Ambient Lighting", type: "makeup" },
    ],
    totalSteps: 7,
    helped: 1200, helpedByMe: false, saved: false, comments: 387, createdAt: 60,
  },
  {
    id: "1",
    skinType: "oily",
    tag: "review",
    postType: "skin-tea",
    text: "two weeks on this niacinamide and my t-zone is actually calm. shine down 50% in humidity. not exaggerating — this is the one.",
    hashtags: ["#oilyskin", "#niacinamide", "#tzone"],
    images: ["https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600"],
    products: [
      {
        id: "p2",
        name: "Niacinamide 10% + Zinc",
        brand: "The Ordinary",
        price: "$8",
        image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200",
        approval: 65,
        skinType: "oily",
      },
    ],
    steps: [
      { num: 3, label: "Serum", product: "Niacinamide 10% — use after toner", type: "skin" },
    ],
    totalSteps: 1,
    helped: 124, helpedByMe: false, saved: false, comments: 18, createdAt: 120,
  },
  {
    id: "2",
    skinType: "sensitive",
    tag: "hot-tea",
    postType: "spill",
    text: "nobody warned me that tretinoin would make me look worse for 3 full months before it got better. my dermatologist said absolutely nothing. i almost quit at week 8.",
    hashtags: ["#tretinoin", "#nobodywarned", "#realtalk"],
    images: [
      "https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=600",
      "https://images.unsplash.com/photo-1556228841-a3c527ebefe5?w=600",
      "https://images.unsplash.com/photo-1556228852-80b6e5eeff06?w=600",
    ],
    products: [
      {
        id: "p5",
        name: "Tretinoin 0.025%",
        brand: "Rx — ask your dermatologist",
        price: "Rx only",
        image: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab12?w=200",
        approval: 71,
        skinType: "oily",
      },
    ],
    steps: [],
    totalSteps: 0,
    helped: 891, helpedByMe: false, saved: false, comments: 203, createdAt: 540,
  },
  {
    id: "3",
    skinType: "combo",
    tag: "grwm",
    postType: "look-tea",
    text: "hailey bieber glazed skin but make it $40 total. skin prep is everything — makeup is just the finish.",
    hashtags: ["#glazedskin", "#nightout", "#skinfirst"],
    images: [
      "https://images.unsplash.com/photo-1522335789203-aaa57bd14abc?w=600",
      "https://images.unsplash.com/photo-1503236823255-94609f598e71?w=600",
    ],
    products: [
      {
        id: "p4",
        name: "Centella Cica Cream",
        brand: "COSRX",
        price: "$16",
        image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=200",
        approval: 83,
        skinType: "dry",
      },
    ],
    steps: [
      { num: 1, label: "Cleanse", product: "CeraVe Foaming Cleanser", type: "skin" },
      { num: 2, label: "Moisturize", product: "Centella Cica Cream — COSRX", type: "skin" },
      { num: 3, label: "SPF", product: "Purito Comfy Sun · $24", type: "skin" },
    ],
    totalSteps: 6,
    helped: 312, helpedByMe: false, saved: false, comments: 44, createdAt: 1800,
  },
  {
    id: "5",
    skinType: "dry",
    tag: "review",
    postType: "skin-tea",
    text: "B5 serum saved my flaky cheeks after two weeks straight of travel. layered under everything, zero pilling. dry skin — this is your sign.",
    hashtags: ["#dryskin", "#b5serum", "#barrierrepair"],
    images: [
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600",
      "https://images.unsplash.com/photo-1556228841-a3c527ebefe5?w=600",
    ],
    products: [
      {
        id: "p1",
        name: "Hydra B5 Serum",
        brand: "La Roche-Posay",
        price: "$32",
        image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200",
        approval: 78,
        skinType: "dry",
      },
    ],
    steps: [
      { num: 2, label: "Serum", product: "Hydra B5 — apply on damp skin", type: "skin" },
    ],
    totalSteps: 1,
    helped: 156, helpedByMe: false, saved: false, comments: 22, createdAt: 21600,
  },
];

/* ---------- Helpers ---------- */

export function approvalColor(pct: number) {
  if (pct >= 60) return { dot: "bg-green-500", text: "text-green-700" };
  if (pct >= 40) return { dot: "bg-amber-500", text: "text-amber-700" };
  return { dot: "bg-red-500", text: "text-red-700" };
}

export function skinTypeLabel(t: SkinType) {
  return t === "oily" ? "oily" : t === "dry" ? "dry" : t === "combo" ? "combination" : t === "sensitive" ? "sensitive" : "normal";
}

/* ---------- Posts store (module-level, shared across routes) ---------- */

const _STORAGE_KEY = "skintea.posts.v1";
function _loadInitial(): Post[] {
  if (typeof window === "undefined") return INITIAL_POSTS;
  try {
    const raw = window.localStorage.getItem(_STORAGE_KEY);
    if (!raw) return INITIAL_POSTS;
    const parsed = JSON.parse(raw) as Post[];
    return Array.isArray(parsed) && parsed.length ? parsed : INITIAL_POSTS;
  } catch {
    return INITIAL_POSTS;
  }
}
let _posts: Post[] = _loadInitial();
const _listeners = new Set<() => void>();
function _persist() {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(_STORAGE_KEY, JSON.stringify(_posts)); } catch {}
}
function _emit() { _persist(); _listeners.forEach((l) => l()); }

export function setPostsStore(updater: (prev: Post[]) => Post[]) {
  _posts = updater(_posts);
  _emit();
}

export function getPostsStore() { return _posts; }

function _subscribe(cb: () => void) {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}

export function usePostsStore(): [Post[], (u: (prev: Post[]) => Post[]) => void] {
  const snap = React.useSyncExternalStore(_subscribe, getPostsStore, getPostsStore);
  return [snap, setPostsStore];
}

/* ---------- Page ---------- */

export function TeaProductsContent({ embedded = false }: { embedded?: boolean } = {}) {
  const [activeTag, setActiveTag] = React.useState<TagKey | "all">("all");
  const [posts, setPosts] = usePostsStore();
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [composePrompt, setComposePrompt] = React.useState<string | undefined>();

  const todaysPrompt = PROMPTS[0];

  const filtered = activeTag === "all" ? posts : posts.filter((p) => p.tag === activeTag);

  const toggleHelped = (id: string) => {
    setPosts((prev) => prev.map((p) =>
      p.id === id ? { ...p, helpedByMe: !p.helpedByMe, helped: p.helped + (p.helpedByMe ? -1 : 1) } : p
    ));
  };
  const toggleSaved = (id: string) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)));
  };

  const addPost = (newPost: Omit<Post, "id" | "helped" | "helpedByMe" | "saved" | "comments" | "createdAt">) => {
    const post: Post = {
      ...newPost,
      id: Math.random().toString(36).slice(2),
      helped: 0, helpedByMe: false, saved: false, comments: 0,
      createdAt: 1,
    };
    setPosts((prev) => [post, ...prev]);
    setActiveTag("all");
  };

  const openCompose = (prompt?: string) => {
    setComposePrompt(prompt);
    setComposeOpen(true);
  };

  // Inject prompt banner every 3 posts
  const feedItems: Array<{ kind: "post"; post: Post } | { kind: "prompt"; text: string; key: string }> = [];
  filtered.forEach((p, i) => {
    feedItems.push({ kind: "post", post: p });
    if ((i + 1) % 3 === 0 && i < filtered.length - 1) {
      feedItems.push({
        kind: "prompt",
        text: PROMPTS[((i + 1) / 3) % PROMPTS.length],
        key: `prompt-${i}`,
      });
    }
  });

  return (
    <div style={{ background: "#faf8f5", fontFamily: "'DM Sans', system-ui, sans-serif" }} className="min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Fraunces', Georgia, serif; }
        .font-body { font-family: 'DM Sans', system-ui, sans-serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="mx-auto max-w-[480px] pb-32">
        {/* Tag filter bar */}
        <div className="sticky top-0 z-20 border-b" style={{ background: "#faf8f5", borderColor: "#f0ede8" }}>
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
            {TAGS.map((t) => {
              const active = activeTag === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTag(t.key)}
                  className="whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors"
                  style={{
                    background: active ? "#1C0A00" : "#FFFCF8",
                    color: active ? "#FFFCF8" : "#1C0A00",
                    borderColor: active ? "#1C0A00" : "#E8E0D8",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Top Tea horizontal strip */}
        <section className="px-4 pt-4">
          <h2
            className="mb-2 flex items-center gap-1.5"
            style={{ fontWeight: 500, fontSize: "14px", color: "#1C0A00" }}
          >
            🔥 Top Tea
          </h2>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-0">
            {[
              { img: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400", label: "B5 saved my barrier", heat: 412 },
              { img: "https://images.unsplash.com/photo-1522335789203-aaa57bd14abc?w=400", label: "Sabrina's met gala skin secret", heat: 1200 },
              { img: "https://images.unsplash.com/photo-1571908598047-29e7a98c1c2c?w=400", label: "GRWM date night glazed look", heat: 256 },
              { img: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400", label: "tretinoin purge — month 3", heat: 891 },
            ].map((c, i) => (
              <div
                key={i}
                className="relative flex-shrink-0 overflow-hidden shadow-sm"
                style={{
                  width: "120px",
                  height: "150px",
                  borderRadius: "14px",
                  backgroundImage: `url(${c.img})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0))" }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <p className="font-bold leading-tight text-white" style={{ fontSize: "11px" }}>{c.label}</p>
                  <p className="mt-1 flex items-center gap-1 font-semibold" style={{ color: "#FFD4B0", fontSize: "9px" }}>
                    <Flame className="h-2.5 w-2.5" /> {c.heat}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Today's prompt banner */}
        <section className="pt-5" style={{ margin: "0 16px 16px" }}>
          <div
            className="flex items-center gap-3 p-3"
            style={{ background: "#1C0A00", color: "#FFFCF8", borderRadius: "14px" }}
          >
            <div className="flex-1">
              <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.8px", color: "#A8001C", fontWeight: 700 }}>
                Today's Tea
              </p>
              <p className="mt-1" style={{ fontSize: "13px", color: "#FFFCF8", lineHeight: 1.4 }}>{todaysPrompt}</p>
            </div>
            <button
              onClick={() => openCompose(todaysPrompt)}
              className="flex-shrink-0 transition-transform active:scale-95"
              style={{ background: "#A8001C", color: "#FFFCF8", borderRadius: "20px", fontSize: "12px", padding: "8px 16px", fontWeight: 600 }}
            >
              Spill
            </button>
          </div>
        </section>

        {/* Feed */}
        <section className="px-4 pt-4 mb-3.5">
          <p
            style={{
              fontSize: "11px",
              fontWeight: 500,
              color: "#aaa",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              marginBottom: "10px",
              marginTop: "4px",
            }}
          >
            Fresh Tea
          </p>
          {feedItems.length === 0 && (
            <div className="rounded-2xl bg-white p-8 text-center text-sm text-neutral-500 shadow-sm">
              No tea in this category yet. Be the first to spill ☕
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {feedItems.map((item) =>
            item.kind === "post" ? (
              <PostCard
                key={item.post.id}
                post={item.post}
                onHelped={() => toggleHelped(item.post.id)}
                onSaved={() => toggleSaved(item.post.id)}
              />
            ) : (
              <div
                key={item.key}
                className="flex items-center gap-3 rounded-2xl border p-4"
                style={{ background: "#1a1a1a", borderColor: "#A8001C" }}
              >
                <div className="flex-1 text-[#faf8f5]">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#fbbf24" }}>
                    Tea Prompt
                  </p>
                  <p className="mt-0.5 font-display text-sm font-semibold">{item.text}</p>
                </div>
                <button
                  onClick={() => openCompose(item.text)}
                  className="rounded-full px-3.5 py-1.5 text-xs font-semibold"
                  style={{ background: "#A8001C", color: "#FFFFFF" }}
                >
                  Spill
                </button>
              </div>
            )
          )}
          </div>
        </section>
      </div>

      {/* Floating Spill the tea button */}
      <button
        onClick={() => openCompose()}
        style={{
          position: "fixed",
          bottom: 72,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#A8001C",
          color: "#FFFCF8",
          fontSize: 14,
          fontWeight: 700,
          borderRadius: 30,
          padding: "12px 28px",
          border: "none",
          zIndex: 40,
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Spill the tea 🫖
      </button>

      {/* Compose sheet */}
      <ComposeSheet
        open={composeOpen}
        onOpenChange={setComposeOpen}
        promptContext={composePrompt}
        onSubmit={(data) => {
          addPost(data);
          setComposeOpen(false);
        }}
      />
      {!embedded && <BottomNav />}
    </div>
  );
}

function TeaProductsPage() {
  const matchRoute = useMatchRoute();
  const isChild = matchRoute({ to: "/tea-products/$postId" });
  if (isChild) return <Outlet />;
  return <TeaProductsContent />;
}

/* ---------- Post Card ---------- */

const POST_TYPE_BADGE: Record<PostType, { label: string; bg: string; color: string }> = {
  "skin-tea": { label: "Skin Tea", bg: "#FFF0F0", color: "#A8001C" },
  "look-tea": { label: "Look Tea", bg: "#F0EDF8", color: "#5B3FA6" },
  spill: { label: "Spill", bg: "#FFF7E6", color: "#B45309" },
};

const STEP_COLOR = { skin: "#A8001C", makeup: "#C4743A" } as const;

function PostCard({ post, onHelped, onSaved }: { post: Post; onHelped: () => void; onSaved: () => void }) {
  const char = CHARACTERS[post.skinType];
  const [activeImg, setActiveImg] = React.useState(0);
  const badge = POST_TYPE_BADGE[post.postType];
  const isSpill = post.postType === "spill";
  const heroProduct = !isSpill && post.products.length > 0 ? post.products[0] : null;
  const steps = post.steps;
  const navigate = useNavigate();

  return (
    <article
      onClick={() => navigate({ to: "/tea-products/$postId", params: { postId: post.id } })}
      style={{
        background: "#fff",
        border: "0.5px solid #E8E0D8",
        borderRadius: "14px",
        overflow: "hidden",
        padding: "10px",
        cursor: "pointer",
      }}
    >
      {post.promptContext && (
        <div
          className="-mx-2.5 -mt-2.5 mb-2.5 px-2.5 py-2"
          style={{
            background: "rgba(251,191,36,0.12)",
            borderBottom: "1px solid rgba(251,191,36,0.3)",
            borderTopLeftRadius: "13px",
            borderTopRightRadius: "13px",
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#92500a" }}>
            replying to prompt
          </p>
          <p className="mt-0.5 text-xs font-medium text-[#1a1a1a]">{post.promptContext}</p>
        </div>
      )}

      {/* Author row */}
      <div className="flex items-center gap-2">
        {post.isMUA ? (
          <div
            className="flex flex-shrink-0 items-center justify-center rounded-full font-semibold"
            style={{ width: 28, height: 28, background: "#1C0A00", color: "#FFFCF8", fontSize: 12 }}
          >
            {post.authorName?.[0]?.toUpperCase() ?? "S"}
          </div>
        ) : (
          <div
            className="flex flex-shrink-0 items-center justify-center rounded-full"
            style={{ width: 28, height: 28, background: SKIN_BG[post.skinType], fontSize: 13, lineHeight: 1 }}
          >
            {char.emoji}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-[#1C0A00]" style={{ fontSize: 13 }}>
              {post.isMUA ? post.authorName : char.name}
            </p>
            {post.isMUA && (
              <span
                style={{
                  background: "#1C0A00",
                  color: "#FFFCF8",
                  fontSize: 9,
                  padding: "1px 5px",
                  borderRadius: 20,
                  fontWeight: 600,
                  lineHeight: 1.2,
                }}
              >
                MUA
              </span>
            )}
          </div>
          <p style={{ fontSize: 10, color: post.isMUA ? "#bbb" : "#8A7E76" }}>
            {post.isMUA ? post.authorRole : `${formatAgo(post.createdAt)} ago`}
          </p>
        </div>
        <span
          className="flex-shrink-0"
          style={{
            background: badge.bg,
            color: badge.color,
            fontSize: 9,
            padding: "2px 7px",
            borderRadius: 20,
            fontWeight: 500,
          }}
        >
          {badge.label}
        </span>
      </div>

      {/* Text */}
      <div className="pt-2.5">
        <p className="leading-snug text-[#1C0A00]" style={{ fontSize: 13 }}>{post.text}</p>
      </div>

      {/* Hashtags */}
      {post.hashtags && post.hashtags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {post.hashtags.map((h) => (
            <span
              key={h}
              style={{
                background: "#FFF0F0",
                color: "#A8001C",
                fontSize: 10,
                padding: "2px 7px",
                borderRadius: 20,
              }}
            >
              {h}
            </span>
          ))}
        </div>
      )}

      {/* Photos */}
      {post.images.length > 0 && (
        <div className="mt-2.5">
          {isSpill ? (
            <div className="flex gap-1.5">
              {post.images.slice(0, 3).map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  style={{ flex: 1, height: 60, borderRadius: 8, objectFit: "cover", minWidth: 0 }}
                />
              ))}
            </div>
          ) : (
            <>
              <div style={{ width: "100%", aspectRatio: "4/5", borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
                <img
                  src={post.images[activeImg] ?? post.images[0]}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }}
                />
              </div>
              {post.images.length > 1 && (
                <div className="mt-2 flex items-center justify-center gap-1">
                  {post.images.map((_, i) => {
                    const on = i === activeImg;
                    return (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setActiveImg(i); }}
                        aria-label={`Image ${i + 1}`}
                        style={{
                          width: on ? 12 : 4,
                          height: 4,
                          borderRadius: 2,
                          background: on ? "#1C0A00" : "#E8E0D8",
                          border: 0,
                          padding: 0,
                          cursor: "pointer",
                          transition: "width 0.2s",
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Hot Pick card */}
      {heroProduct && (
        <div
          className="mt-2.5"
          style={{
            background: "#FFF0F0",
            border: "1px solid #f5d0d0",
            borderRadius: 10,
            padding: "8px 10px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <img
            src={heroProduct.image}
            alt={heroProduct.name}
            style={{ width: 30, height: 30, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
          />
          <div className="min-w-0 flex-1">
            <p style={{ color: "#A8001C", fontSize: 9, textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.4 }}>
              Hot Pick
            </p>
            <p style={{ fontSize: 12, color: "#1C0A00", fontWeight: 500 }} className="truncate">
              {heroProduct.name}
            </p>
            <p style={{ fontSize: 10, color: "#999" }} className="truncate">
              {heroProduct.approval}% of {skinTypeLabel(heroProduct.skinType)} skin approve
            </p>
          </div>
        </div>
      )}

      {/* Steps preview */}
      {!isSpill && steps && steps.length > 0 && (
        <div className="mt-2 space-y-1">
          {steps.slice(0, 3).map((s) => {
            const color = STEP_COLOR[s.type];
            return (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: color,
                    color: "#FFFCF8",
                    fontSize: 9,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {s.num}
                </div>
                <span style={{ fontSize: 9, color: "#aaa", width: 44, flexShrink: 0 }}>{s.label}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color }} className="truncate">
                  {s.product}
                </span>
              </div>
            );
          })}
          {post.totalSteps && post.totalSteps > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate({ to: "/tea-products/$postId", params: { postId: post.id } });
              }}
              className="mt-1"
              style={{
                fontSize: 10,
                color: "#888",
                border: "0.5px solid #ddd",
                borderRadius: 8,
                padding: "4px 9px",
                background: "#faf8f5",
                cursor: "pointer",
              }}
            >
              + See full breakdown ({post.totalSteps} steps)
            </button>
          )}
        </div>
      )}

      {/* Action bar */}
      <div
        className="mt-2.5"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 10px 8px",
          borderTop: "0.5px solid #f5f0ea",
          marginLeft: -10,
          marginRight: -10,
          marginBottom: -10,
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onHelped(); }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: 0, padding: 0, cursor: "pointer" }}
          aria-label="Agree"
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "#FFF0E8",
              border: "1px solid #FFD4B0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              opacity: post.helpedByMe ? 1 : 0.95,
            }}
          >
            🔥
          </div>
          <span style={{ color: "#D97706", fontSize: 8, fontWeight: 600, lineHeight: 1 }}>{post.helped}</span>
          <span style={{ color: "#D97706", fontSize: 8, lineHeight: 1 }}>agree</span>
        </button>

        <button
          onClick={(e) => e.stopPropagation()}
          style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: 0, padding: 0, cursor: "pointer", color: "#8A7E76" }}
          aria-label="Comments"
        >
          <MessageCircle className="h-4 w-4" />
          <span style={{ fontSize: 11 }}>{post.comments}</span>
        </button>

        <div className="flex-1" />

        <button
          onClick={(e) => { e.stopPropagation(); onSaved(); }}
          style={{ background: "none", border: 0, padding: 4, cursor: "pointer", color: post.saved ? "#1C0A00" : "#8A7E76" }}
          aria-label="Save"
        >
          <Bookmark className="h-4 w-4" fill={post.saved ? "currentColor" : "none"} />
        </button>
        <button
          onClick={(e) => e.stopPropagation()}
          style={{ background: "none", border: 0, padding: 4, cursor: "pointer", color: "#8A7E76" }}
          aria-label="Share"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

function ActionBtn({
  icon, label, active, onClick,
}: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors hover:bg-black/5"
      style={{ color: active ? "#1a1a1a" : "#525252" }}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}

/* ---------- Smart image grid ---------- */

function ImageGrid({ images }: { images: string[] }) {
  const visible = images.slice(0, 3);
  const extra = images.length - 3;

  if (images.length === 1) {
    return (
      <div className="px-4">
        <img src={images[0]} alt="" className="h-64 w-full rounded-xl object-cover" />
      </div>
    );
  }
  if (images.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-1.5 px-4">
        {images.map((src, i) => (
          <img key={i} src={src} alt="" className="h-44 w-full rounded-xl object-cover" />
        ))}
      </div>
    );
  }
  // 3+
  return (
    <div className="grid grid-cols-2 gap-1.5 px-4" style={{ gridTemplateRows: "repeat(2, minmax(0, 1fr))", height: "260px" }}>
      <img src={visible[0]} alt="" className="row-span-2 h-full w-full rounded-xl object-cover" />
      <img src={visible[1]} alt="" className="h-full w-full rounded-xl object-cover" />
      <div className="relative">
        <img src={visible[2]} alt="" className="h-full w-full rounded-xl object-cover" />
        {extra > 0 && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/55 text-xl font-bold text-white">
            +{extra}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Product card ---------- */

function ProductCard({ product }: { product: TaggedProduct }) {
  const c = approvalColor(product.approval);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/5 bg-[#faf8f5] p-2.5">
      <img src={product.image} alt={product.name} className="h-14 w-14 flex-shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-[#1a1a1a]">{product.name}</p>
        <p className="truncate text-[11px] text-neutral-500">{product.brand} · {product.price}</p>
        <p className={`mt-0.5 flex items-center gap-1 text-[10px] font-semibold ${c.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
          {product.approval}% of {skinTypeLabel(product.skinType)} skin approve · Skintea
        </p>
      </div>
      <button className="flex-shrink-0 rounded-full bg-[#1a1a1a] px-3 py-1.5 text-[11px] font-semibold text-white">
        View
      </button>
    </div>
  );
}

/* ---------- Compose sheet ---------- */

/* Top-level helper components for ComposeSheet.
   Extracted out so React doesn't recreate them on every render,
   which would unmount inputs on every keystroke. */

function TextHashtagBlock({
  text, setText, hashtags, setHashtags, hashtagInput, setHashtagInput, placeholder,
}: {
  text: string;
  setText: React.Dispatch<React.SetStateAction<string>>;
  hashtags: string[];
  setHashtags: React.Dispatch<React.SetStateAction<string[]>>;
  hashtagInput: string;
  setHashtagInput: React.Dispatch<React.SetStateAction<string>>;
  placeholder: string;
}) {
  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, "");
    if (tag && !hashtags.includes(`#${tag}`)) {
      setHashtags(prev => [...prev, `#${tag}`]);
    }
    setHashtagInput("");
  };
  return (
    <>
      <div style={{ fontSize: 10, fontWeight: 500, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>Your take</div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", minHeight: 80, resize: "none",
          background: "#fff", border: "0.5px solid #E8E0D8", borderRadius: 12,
          padding: "11px 13px", fontSize: 13, color: "#1C0A00", lineHeight: 1.6,
          fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box",
          marginBottom: 8,
        }}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
        {hashtags.map(tag => (
          <div key={tag} style={{ display: "flex", alignItems: "center", gap: 4, background: "#FFF0F0", border: "1px solid #f5d0d0", borderRadius: 20, padding: "3px 9px" }}>
            <span style={{ fontSize: 11, color: "#A8001C" }}>{tag}</span>
            <button onClick={() => setHashtags(prev => prev.filter(t => t !== tag))} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}>
              <X size={10} color="#A8001C" />
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <input
          value={hashtagInput}
          onChange={e => setHashtagInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); addHashtag(); } }}
          placeholder="add hashtag..."
          style={{ flex: 1, background: "#f5f0ea", border: "none", borderRadius: 20, padding: "7px 13px", fontSize: 12, color: "#333", outline: "none", fontFamily: "'DM Sans', sans-serif" }}
        />
        <button onClick={addHashtag} style={{ background: "#f5f0ea", border: "none", borderRadius: 20, padding: "7px 13px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          Add
        </button>
      </div>
    </>
  );
}

function ProductSearch({
  search, setSearch, searchResults, onSelect,
}: {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  searchResults: TaggedProduct[];
  onSelect: (p: TaggedProduct) => void;
}) {
  return (
    <div>
      <div style={{ position: "relative" }}>
        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#aaa" }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="search products..."
          style={{ width: "100%", background: "#f5f0ea", border: "none", borderRadius: 20, padding: "9px 14px 9px 34px", fontSize: 12, color: "#333", outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" }}
        />
      </div>
      {searchResults.length > 0 && (
        <div style={{ marginTop: 6, background: "#fff", border: "0.5px solid #E8E0D8", borderRadius: 12, overflow: "hidden" }}>
          {searchResults.map(p => (
            <button key={p.id} onClick={() => onSelect(p)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "none", border: "none", borderBottom: "0.5px solid #f5f0ea", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              <img src={p.image} style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#1C0A00" }}>{p.name}</div>
                <div style={{ fontSize: 11, color: "#999" }}>{p.brand} · {p.price}</div>
              </div>
              <Plus size={14} color="#aaa" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HotPickSelected({
  hotPick, setHotPick, search, setSearch, searchResults, bgColor, borderColor, onSelect,
}: {
  hotPick: TaggedProduct | null;
  setHotPick: React.Dispatch<React.SetStateAction<TaggedProduct | null>>;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  searchResults: TaggedProduct[];
  bgColor: string;
  borderColor: string;
  onSelect: (p: TaggedProduct) => void;
}) {
  return hotPick ? (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
      <img src={hotPick.image} style={{ width: 38, height: 38, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#1C0A00" }}>{hotPick.name}</div>
        <div style={{ fontSize: 11, color: "#999" }}>{hotPick.brand} · {hotPick.price}</div>
      </div>
      <button onClick={() => setHotPick(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
        <X size={15} color="#aaa" />
      </button>
    </div>
  ) : (
    <div style={{ marginBottom: 14 }}>
      <ProductSearch search={search} setSearch={setSearch} searchResults={searchResults} onSelect={onSelect} />
    </div>
  );
}

function StepBuilder({
  steps, setSteps, showStepPicker, setShowStepPicker, allowMakeup,
}: {
  steps: ComposeStep[];
  setSteps: React.Dispatch<React.SetStateAction<ComposeStep[]>>;
  showStepPicker: boolean;
  setShowStepPicker: React.Dispatch<React.SetStateAction<boolean>>;
  allowMakeup: boolean;
}) {
  const addStep = (label: string, type: "skin" | "makeup") => {
    setSteps(prev => [...prev, { id: Math.random().toString(36).slice(2), label, product: "", type }]);
    setShowStepPicker(false);
  };
  const updateStepProduct = (id: string, value: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, product: value } : s));
  };
  const removeStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id));
  };
  const availableSkin = SKIN_STEPS.filter(s => !steps.find(st => st.label === s));
  const availableMakeup = allowMakeup ? MAKEUP_STEPS.filter(s => !steps.find(st => st.label === s)) : [];
  return (
    <div style={{ marginBottom: 14 }}>
      {steps.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 }}>
          {steps.map((step, i) => {
            const color = step.type === "skin" ? "#A8001C" : "#C4743A";
            return (
              <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 9, background: "#fff", border: "0.5px solid #E8E0D8", borderRadius: 10, padding: "9px 11px" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 500, color: "#fff", flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>{step.label}</div>
                  <input
                    value={step.product}
                    onChange={e => updateStepProduct(step.id, e.target.value)}
                    placeholder="product name..."
                    style={{ fontSize: 12, color: "#333", background: "none", border: "none", width: "100%", outline: "none", fontFamily: "'DM Sans', sans-serif" }}
                  />
                </div>
                <button onClick={() => removeStep(step.id)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  <X size={13} color="#ccc" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {!showStepPicker ? (
        <button
          onClick={() => setShowStepPicker(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "#f5f0ea", border: "none", borderRadius: 20, padding: "8px 16px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
        >
          <Plus size={13} color="#888" /> Add step
        </button>
      ) : (
        <div style={{ background: "#fff", border: "0.5px solid #E8E0D8", borderRadius: 12, overflow: "hidden" }}>
          {availableSkin.length > 0 && (
            <>
              <div style={{ padding: "7px 12px", fontSize: 10, fontWeight: 500, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.6px", borderBottom: "0.5px solid #f5f0ea" }}>Skin</div>
              {availableSkin.map(s => (
                <button key={s} onClick={() => addStep(s, "skin")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "none", border: "none", borderBottom: "0.5px solid #f5f0ea", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#A8001C", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#333" }}>{s}</span>
                </button>
              ))}
            </>
          )}
          {allowMakeup && availableMakeup.length > 0 && (
            <>
              <div style={{ padding: "7px 12px", fontSize: 10, fontWeight: 500, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.6px", borderBottom: "0.5px solid #f5f0ea" }}>Makeup</div>
              {availableMakeup.map(s => (
                <button key={s} onClick={() => addStep(s, "makeup")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "none", border: "none", borderBottom: "0.5px solid #f5f0ea", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#C4743A", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#333" }}>{s}</span>
                </button>
              ))}
            </>
          )}
          <button onClick={() => setShowStepPicker(false)} style={{ width: "100%", padding: "8px", fontSize: 12, color: "#aaa", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function PhotoOptional({
  images, setImages, fileRef,
}: {
  images: string[];
  setImages: React.Dispatch<React.SetStateAction<string[]>>;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const urls = Array.from(files).map(f => URL.createObjectURL(f));
    setImages(prev => [...prev, ...urls]);
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 500, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>Photo — show your skin or the product</div>
      {images.length > 0 ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          {images.map((src, i) => (
            <div key={i} style={{ position: "relative", width: 72, height: 72, borderRadius: 10, overflow: "hidden" }}>
              <img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={10} color="#fff" />
              </button>
            </div>
          ))}
          <button onClick={() => fileRef.current?.click()} style={{ width: 72, height: 72, borderRadius: 10, border: "1.5px dashed #ddd", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={18} color="#ccc" />
          </button>
        </div>
      ) : (
        <>
          <div
            onClick={() => fileRef.current?.click()}
            style={{ width: "100%", height: 90, borderRadius: 12, border: "1.5px dashed #f5d0d0", background: "#FFF8F8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer", marginBottom: 4 }}
          >
            <ImagePlus size={24} color="#f5d0d0" />
            <span style={{ fontSize: 12, color: "#f5b0b0" }}>before/after · product shot · skin close-up</span>
          </div>
          <span style={{ fontSize: 11, color: "#bbb", display: "block", textAlign: "center", marginBottom: 0, cursor: "pointer" }}>
            skip for now
          </span>
        </>
      )}
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => onFiles(e.target.files)} />
    </div>
  );
}

function PhotoMandatory({
  images, setImages, lookFileRef,
}: {
  images: string[];
  setImages: React.Dispatch<React.SetStateAction<string[]>>;
  lookFileRef: React.RefObject<HTMLInputElement | null>;
}) {
  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const urls = Array.from(files).map(f => URL.createObjectURL(f));
    setImages(prev => [...urls, ...prev]);
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 500, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>
        Your look photo <span style={{ color: "#A8001C" }}>required</span>
      </div>
      {images.length > 0 ? (
        <div style={{ position: "relative", width: "100%", height: 180, borderRadius: 14, overflow: "hidden", marginBottom: 8 }}>
          <img src={images[0]} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <button onClick={() => setImages([])} style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={12} color="#fff" />
          </button>
          <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
            <button onClick={() => lookFileRef.current?.click()} style={{ background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: 20, padding: "5px 12px", fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              + add more
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => lookFileRef.current?.click()}
          style={{ width: "100%", height: 160, borderRadius: 14, background: "#1C0A00", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}
        >
          <ImagePlus size={32} color="rgba(255,255,255,0.4)" />
          <span style={{ fontSize: 13, fontWeight: 500, color: "#FFFCF8" }}>Upload your look photo</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>the face is the whole point — required to post</span>
        </div>
      )}
      <input ref={lookFileRef} type="file" accept="image/*" multiple hidden onChange={e => onFiles(e.target.files)} />
    </div>
  );
}

function ComposeSheet({
  open, onOpenChange, promptContext, onSubmit,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  promptContext?: string;
  onSubmit: (p: Omit<Post, "id" | "helped" | "helpedByMe" | "saved" | "comments" | "createdAt">) => void;
}) {
  const [stage, setStage] = React.useState<ComposeStage>("type");
  const [skinTeaMode, setSkinTeaMode] = React.useState<SkinTeaMode>("single");
  const [text, setText] = React.useState("");
  const [images, setImages] = React.useState<string[]>([]);
  const [hashtags, setHashtags] = React.useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [hotPick, setHotPick] = React.useState<TaggedProduct | null>(null);
  const [steps, setSteps] = React.useState<ComposeStep[]>([]);
  const [showStepPicker, setShowStepPicker] = React.useState(false);
  const [, setShowProductSearch] = React.useState(false);
  const [skinTeaDetails, setSkinTeaDetails] = React.useState({
    when: "" as string,
    whenChoice: "AM + PM" as string,
    howMuch: "",
    watchOut: "",
    timeline: "" as string,
    timelineChoice: "" as string,
    includeWhen: true,
    includeHowMuch: true,
    includeWatchOut: true,
    includeTimeline: true,
  });
  const fileRef = React.useRef<HTMLInputElement>(null);
  const lookFileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setStage("type");
      setSkinTeaMode("single");
      setText("");
      setImages([]);
      setHashtags([]);
      setHashtagInput("");
      setSearch("");
      setHotPick(null);
      setSteps([]);
      setShowStepPicker(false);
      setShowProductSearch(false);
      setSkinTeaDetails({
        when: "", whenChoice: "AM + PM",
        howMuch: "", watchOut: "",
        timeline: "", timelineChoice: "",
        includeWhen: true, includeHowMuch: true,
        includeWatchOut: true, includeTimeline: true,
      });
    }
  }, [open]);

  const onFiles = (files: FileList | null, prepend = false) => {
    if (!files) return;
    const urls = Array.from(files).map(f => URL.createObjectURL(f));
    setImages(prev => prepend ? [...urls, ...prev] : [...prev, ...urls]);
  };

  const searchResults = search.trim()
    ? PRODUCT_CATALOG.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 5)
    : [];

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, "");
    if (tag && !hashtags.includes(`#${tag}`)) {
      setHashtags(prev => [...prev, `#${tag}`]);
    }
    setHashtagInput("");
  };

  const selectHotPick = (product: TaggedProduct) => {
    setHotPick(product);
    setSearch("");
    setShowProductSearch(false);
    const autofill = SKIN_TEA_AUTOFILL[product.id] || SKIN_TEA_AUTOFILL["default"];
    setSkinTeaDetails(prev => ({
      ...prev,
      whenChoice: autofill.when,
      howMuch: autofill.howMuch,
      watchOut: autofill.watchOut,
      timelineChoice: autofill.timeline,
    }));
  };

  const addStep = (label: string, type: "skin" | "makeup") => {
    setSteps(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      label, product: "", type,
    }]);
    setShowStepPicker(false);
  };

  const updateStepProduct = (id: string, value: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, product: value } : s));
  };

  const removeStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id));
  };

  const submitSpill = () => {
    if (!text.trim()) return;
    onSubmit({
      skinType: "oily", tag: "hot-tea", postType: "spill",
      text: text.trim(), images, hashtags,
      products: [], steps: [], totalSteps: 0, promptContext,
    });
    onOpenChange(false);
  };

  const submitSkinTea = () => {
    if (!text.trim() || !hotPick) return;
    onSubmit({
      skinType: "oily", tag: "review", postType: "skin-tea",
      skinTeaMode,
      text: text.trim(), images, hashtags,
      products: [hotPick],
      steps: skinTeaMode === "routine"
        ? steps.map((s, i) => ({ num: i + 1, label: s.label, product: s.product || s.label, type: s.type }))
        : [{ num: 1, label: "Serum", product: hotPick.name, type: "skin" as const }],
      totalSteps: skinTeaMode === "routine" ? steps.length : 1,
      promptContext,
    });
    onOpenChange(false);
  };

  const submitLookTea = () => {
    if (!text.trim() || !hotPick || images.length === 0) return;
    onSubmit({
      skinType: "oily", tag: "night-out", postType: "look-tea",
      text: text.trim(), images, hashtags,
      products: [hotPick],
      steps: steps.map((s, i) => ({ num: i + 1, label: s.label, product: s.product || s.label, type: s.type })),
      totalSteps: steps.length,
      promptContext,
    });
    onOpenChange(false);
  };

  const BackBtn = ({ to }: { to: ComposeStage }) => (
    <button
      onClick={() => setStage(to)}
      style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center" }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C0A00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );

  const SheetHeader = ({ title, badge, badgeBg, badgeColor, backTo }: {
    title: string; badge?: string; badgeBg?: string; badgeColor?: string; backTo?: ComposeStage;
  }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "0.5px solid #E8E0D8", flexShrink: 0 }}>
      {backTo && <BackBtn to={backTo} />}
      <span style={{ fontSize: 16, fontWeight: 500, color: "#1C0A00", flex: 1, fontFamily: "'DM Sans', sans-serif" }}>{title}</span>
      {badge && (
        <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 20, background: badgeBg, color: badgeColor }}>
          {badge}
        </span>
      )}
      {!backTo && (
        <button onClick={() => onOpenChange(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
          <X size={18} color="#1C0A00" />
        </button>
      )}
    </div>
  );

  const textBlockProps = { text, setText, hashtags, setHashtags, hashtagInput, setHashtagInput };
  const hotPickPropsBase = { hotPick, setHotPick, search, setSearch, searchResults, onSelect: selectHotPick };
  const stepBuilderPropsBase = { steps, setSteps, showStepPicker, setShowStepPicker };

  const TypeStage = (
    <div style={{ display: "flex", flexDirection: "column" as const, height: "100%" }}>
      <SheetHeader title="What are you spilling?" />
      <div style={{ flex: 1, overflowY: "auto" as const, padding: "16px" }}>
        {promptContext && (
          <div style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.6px", color: "#92500a", marginBottom: 3 }}>replying to</div>
            <div style={{ fontSize: 12, color: "#1C0A00" }}>{promptContext}</div>
          </div>
        )}
        {[
          { type: "skin-tea" as ComposeStage, label: "Skin Tea", bg: "#FFF0F0", color: "#A8001C", border: "#f5d0d0", desc: "Skincare — one product, a full routine, skin prep, ingredients. Anything about your skin.", example: "\"two weeks on this niacinamide and my t-zone is actually calm\"" },
          { type: "look-tea" as ComposeStage, label: "Look Tea", bg: "#F0EDF8", color: "#5B3FA6", border: "#e0d8f5", desc: "A makeup look — show your face, then break down how you built it. Skin prep + makeup steps.", example: "\"glazed skin met gala look — here's every product i used\"" },
          { type: "spill" as ComposeStage, label: "Spill", bg: "#FFF7E6", color: "#B45309", border: "#f5edda", desc: "Raw honest take — warning, hot opinion, experience others need to know. No steps needed.", example: "\"nobody warned me tretinoin makes you look worse for 3 months\"" },
        ].map(opt => (
          <button
            key={opt.type}
            onClick={() => setStage(opt.type)}
            style={{ width: "100%", background: "#fff", border: `1px solid ${opt.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10, textAlign: "left" as const, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
          >
            <div style={{ fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20, background: opt.bg, color: opt.color, display: "inline-block", marginBottom: 7 }}>{opt.label}</div>
            <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5, marginBottom: 5 }}>{opt.desc}</div>
            <div style={{ fontSize: 11, color: "#aaa", fontStyle: "italic" }}>{opt.example}</div>
          </button>
         ))}
       </div>
     </div>
   );

  const SkinTeaStage = (
    <div style={{ display: "flex", flexDirection: "column" as const, height: "100%" }}>
      <SheetHeader title="Skin Tea" badge="Skin Tea" badgeBg="#FFF0F0" badgeColor="#A8001C" backTo="type" />
      <div style={{ flex: 1, overflowY: "auto" as const, padding: "16px" }}>
        <div style={{ display: "flex", background: "#f5f0ea", borderRadius: 10, padding: 3, marginBottom: 16 }}>
          {(["single", "routine"] as SkinTeaMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setSkinTeaMode(mode)}
              style={{
                flex: 1, padding: "7px 10px", borderRadius: 8, border: "none",
                fontSize: 12, fontWeight: 500, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                background: skinTeaMode === mode ? "#fff" : "none",
                color: skinTeaMode === mode ? "#1C0A00" : "#888",
              }}
            >
              {mode === "single" ? "Single product" : "Full routine"}
            </button>
          ))}
        </div>

        <PhotoOptional images={images} setImages={setImages} fileRef={fileRef} />
        <TextHashtagBlock {...textBlockProps} placeholder="what did this actually do for your skin?" />

        {skinTeaMode === "single" ? (
          <>
            <div style={{ fontSize: 10, fontWeight: 500, color: "#aaa", textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 8 }}>Hot Pick — the product</div>
            <HotPickSelected {...hotPickPropsBase} bgColor="#FFF0F0" borderColor="#f5d0d0" />

            {hotPick && (
              <>
                <div style={{ fontSize: 10, fontWeight: 500, color: "#aaa", textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 8 }}>Details — toggle what applies</div>
                <div style={{ background: "#fff", border: "0.5px solid #E8E0D8", borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>

                  <div style={{ padding: "10px 13px", borderBottom: "0.5px solid #f5f0ea" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: skinTeaDetails.includeWhen ? 6 : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span>⏱</span>
                        <span style={{ fontSize: 10, fontWeight: 500, color: "#A8001C", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>When to use</span>
                      </div>
                      <button
                        onClick={() => setSkinTeaDetails(prev => ({ ...prev, includeWhen: !prev.includeWhen }))}
                        style={{ fontSize: 10, color: skinTeaDetails.includeWhen ? "#A8001C" : "#bbb", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {skinTeaDetails.includeWhen ? "include" : "add"}
                      </button>
                    </div>
                    {skinTeaDetails.includeWhen && (
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" as const }}>
                        {["AM", "PM", "AM + PM"].map(opt => (
                          <button
                            key={opt}
                            onClick={() => setSkinTeaDetails(prev => ({ ...prev, whenChoice: opt }))}
                            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, border: "1px solid", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", background: skinTeaDetails.whenChoice === opt ? "#A8001C" : "#fff", color: skinTeaDetails.whenChoice === opt ? "#fff" : "#888", borderColor: skinTeaDetails.whenChoice === opt ? "#A8001C" : "#E8E0D8" }}
                          >{opt}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: "10px 13px", borderBottom: "0.5px solid #f5f0ea" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: skinTeaDetails.includeHowMuch ? 6 : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span>💧</span>
                        <span style={{ fontSize: 10, fontWeight: 500, color: "#A8001C", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>How much</span>
                      </div>
                      <button onClick={() => setSkinTeaDetails(prev => ({ ...prev, includeHowMuch: !prev.includeHowMuch }))} style={{ fontSize: 10, color: skinTeaDetails.includeHowMuch ? "#A8001C" : "#bbb", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                        {skinTeaDetails.includeHowMuch ? "include" : "add"}
                      </button>
                    </div>
                    {skinTeaDetails.includeHowMuch && (
                      <input value={skinTeaDetails.howMuch} onChange={e => setSkinTeaDetails(prev => ({ ...prev, howMuch: e.target.value }))} style={{ width: "100%", background: "#f5f0ea", border: "none", borderRadius: 8, padding: "7px 10px", fontSize: 12, color: "#333", outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" as const }} />
                    )}
                  </div>

                  <div style={{ padding: "10px 13px", borderBottom: "0.5px solid #f5f0ea" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: skinTeaDetails.includeWatchOut ? 6 : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span>⚠️</span>
                        <span style={{ fontSize: 10, fontWeight: 500, color: "#A8001C", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>Watch out</span>
                      </div>
                      <button onClick={() => setSkinTeaDetails(prev => ({ ...prev, includeWatchOut: !prev.includeWatchOut }))} style={{ fontSize: 10, color: skinTeaDetails.includeWatchOut ? "#A8001C" : "#bbb", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                        {skinTeaDetails.includeWatchOut ? "include" : "add"}
                      </button>
                    </div>
                    {skinTeaDetails.includeWatchOut && (
                      <input value={skinTeaDetails.watchOut} onChange={e => setSkinTeaDetails(prev => ({ ...prev, watchOut: e.target.value }))} style={{ width: "100%", background: "#f5f0ea", border: "none", borderRadius: 8, padding: "7px 10px", fontSize: 12, color: "#333", outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" as const }} />
                    )}
                  </div>

                  <div style={{ padding: "10px 13px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: skinTeaDetails.includeTimeline ? 6 : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span>📅</span>
                        <span style={{ fontSize: 10, fontWeight: 500, color: "#A8001C", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>Timeline</span>
                      </div>
                      <button onClick={() => setSkinTeaDetails(prev => ({ ...prev, includeTimeline: !prev.includeTimeline }))} style={{ fontSize: 10, color: skinTeaDetails.includeTimeline ? "#A8001C" : "#bbb", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                        {skinTeaDetails.includeTimeline ? "include" : "add"}
                      </button>
                    </div>
                    {skinTeaDetails.includeTimeline && (
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" as const }}>
                        {["1 week", "2 weeks", "1 month", "3 months", "ongoing"].map(opt => (
                          <button
                            key={opt}
                            onClick={() => setSkinTeaDetails(prev => ({ ...prev, timelineChoice: opt }))}
                            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, border: "1px solid", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", background: skinTeaDetails.timelineChoice === opt ? "#A8001C" : "#fff", color: skinTeaDetails.timelineChoice === opt ? "#fff" : "#888", borderColor: skinTeaDetails.timelineChoice === opt ? "#A8001C" : "#E8E0D8" }}
                          >{opt}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: 10, fontWeight: 500, color: "#aaa", textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 8 }}>Routine steps — skin only</div>
            <StepBuilder {...stepBuilderPropsBase} allowMakeup={false} />
            <div style={{ fontSize: 10, fontWeight: 500, color: "#aaa", textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 8 }}>Hot Pick — standout product of this routine</div>
            <HotPickSelected {...hotPickPropsBase} bgColor="#FFF0F0" borderColor="#f5d0d0" />
          </>
        )}
      </div>
      <div style={{ padding: "10px 16px 16px", borderTop: "0.5px solid #E8E0D8", background: "#FFFCF8" }}>
        <button
          disabled={!text.trim() || !hotPick}
          onClick={submitSkinTea}
          style={{ width: "100%", background: text.trim() && hotPick ? "#A8001C" : "#f0ebe3", color: text.trim() && hotPick ? "#fff" : "#bbb", border: "none", borderRadius: 20, padding: "12px", fontSize: 13, fontWeight: 500, cursor: text.trim() && hotPick ? "pointer" : "default", fontFamily: "'DM Sans', sans-serif" }}
        >
          Post Skin Tea
        </button>
      </div>
    </div>
  );

  const LookTeaStage = (
    <div style={{ display: "flex", flexDirection: "column" as const, height: "100%" }}>
      <SheetHeader title="Look Tea" badge="Look Tea" badgeBg="#F0EDF8" badgeColor="#5B3FA6" backTo="type" />
      <div style={{ flex: 1, overflowY: "auto" as const, padding: "16px" }}>
        <PhotoMandatory images={images} setImages={setImages} lookFileRef={lookFileRef} />
        <TextHashtagBlock {...textBlockProps} placeholder="what's the story behind this look?" />
        <div style={{ fontSize: 10, fontWeight: 500, color: "#aaa", textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 8 }}>Hot Pick — hero product of this look</div>
        <HotPickSelected {...hotPickPropsBase} bgColor="#F0EDF8" borderColor="#e0d8f5" />
        <div style={{ fontSize: 10, fontWeight: 500, color: "#aaa", textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 8 }}>Breakdown steps</div>
        <StepBuilder {...stepBuilderPropsBase} allowMakeup={true} />
      </div>
      <div style={{ padding: "10px 16px 16px", borderTop: "0.5px solid #E8E0D8", background: "#FFFCF8" }}>
        <button
          disabled={!text.trim() || !hotPick || images.length === 0}
          onClick={submitLookTea}
          style={{ width: "100%", background: text.trim() && hotPick && images.length > 0 ? "#5B3FA6" : "#f0ebe3", color: text.trim() && hotPick && images.length > 0 ? "#fff" : "#bbb", border: "none", borderRadius: 20, padding: "12px", fontSize: 13, fontWeight: 500, cursor: text.trim() && hotPick && images.length > 0 ? "pointer" : "default", fontFamily: "'DM Sans', sans-serif" }}
        >
          {images.length === 0 ? "Add a photo to post" : !hotPick ? "Add a hot pick to post" : "Post Look Tea"}
        </button>
      </div>
    </div>
  );

  const SpillStage = (
    <div style={{ display: "flex", flexDirection: "column" as const, height: "100%" }}>
      <SheetHeader title="Spill" badge="Spill" badgeBg="#FFF7E6" badgeColor="#B45309" backTo="type" />
      <div style={{ flex: 1, overflowY: "auto" as const, padding: "16px" }}>
        <div style={{ background: "#FFF7E6", border: "1px solid #f5edda", borderRadius: 10, padding: "9px 12px", marginBottom: 14, fontSize: 12, color: "#B45309", lineHeight: 1.5 }}>
          raw and honest. no product required. just say what others won't.
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="nobody warned me... / hot take: ... / don't do this..."
          autoFocus
          style={{ width: "100%", minHeight: 120, resize: "none" as const, background: "#fff", border: "0.5px solid #E8E0D8", borderRadius: 12, padding: "11px 13px", fontSize: 13, color: "#1C0A00", lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" as const, marginBottom: 8 }}
        />
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 6 }}>
          {hashtags.map(tag => (
            <div key={tag} style={{ display: "flex", alignItems: "center", gap: 4, background: "#FFF0F0", border: "1px solid #f5d0d0", borderRadius: 20, padding: "3px 9px" }}>
              <span style={{ fontSize: 11, color: "#A8001C" }}>{tag}</span>
              <button onClick={() => setHashtags(prev => prev.filter(t => t !== tag))} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}>
                <X size={10} color="#A8001C" />
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <input value={hashtagInput} onChange={e => setHashtagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); addHashtag(); } }} placeholder="add hashtag..." style={{ flex: 1, background: "#f5f0ea", border: "none", borderRadius: 20, padding: "7px 13px", fontSize: 12, color: "#333", outline: "none", fontFamily: "'DM Sans', sans-serif" }} />
          <button onClick={addHashtag} style={{ background: "#f5f0ea", border: "none", borderRadius: 20, padding: "7px 13px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Add</button>
        </div>
        <div style={{ fontSize: 10, fontWeight: 500, color: "#aaa", textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 8 }}>Photos — optional</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
          {images.map((src, i) => (
            <div key={i} style={{ position: "relative", width: 64, height: 64, borderRadius: 10, overflow: "hidden" }}>
              <img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" as const }} />
              <button onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} style={{ position: "absolute", top: 3, right: 3, width: 16, height: 16, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={9} color="#fff" />
              </button>
            </div>
          ))}
          <button onClick={() => fileRef.current?.click()} style={{ width: 64, height: 64, borderRadius: 10, border: "1.5px dashed #ddd", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={16} color="#ccc" />
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => onFiles(e.target.files)} />
      </div>
      <div style={{ padding: "10px 16px 16px", borderTop: "0.5px solid #E8E0D8", background: "#FFFCF8" }}>
        <button
          disabled={!text.trim()}
          onClick={submitSpill}
          style={{ width: "100%", background: text.trim() ? "#1C0A00" : "#f0ebe3", color: text.trim() ? "#FFFCF8" : "#bbb", border: "none", borderRadius: 20, padding: "12px", fontSize: 13, fontWeight: 500, cursor: text.trim() ? "pointer" : "default", fontFamily: "'DM Sans', sans-serif" }}
        >
          Post Spill
        </button>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto h-[90vh] max-w-[480px] overflow-hidden rounded-t-3xl border-0 p-0"
        style={{ background: "#FFFCF8" }}
      >
        {stage === "type" && TypeStage}
        {stage === "skin-tea" && SkinTeaStage}
        {stage === "look-tea" && LookTeaStage}
        {stage === "spill" && SpillStage}
      </SheetContent>
    </Sheet>
  );
}
