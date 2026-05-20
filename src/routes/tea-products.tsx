import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
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

type SkinType = "oily" | "dry" | "combo" | "sensitive" | "normal";
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

const CHARACTERS: Record<SkinType, { emoji: string; name: string }> = {
  oily: { emoji: "🍩", name: "Glazed Donut" },
  dry: { emoji: "🏜️", name: "Desert Girl" },
  combo: { emoji: "🎭", name: "Mood Board" },
  sensitive: { emoji: "🌸", name: "Main Character" },
  normal: { emoji: "😮‍💨", name: "Unbothered" },
};

const SKIN_BG: Record<SkinType, string> = {
  oily: "#fef3c7",
  dry: "#fce7f3",
  combo: "#ede9fe",
  sensitive: "#fee2e2",
  normal: "#e0f2fe",
};

function formatAgo(diffSec: number) {
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

const TAG_LABEL: Record<TagKey, string> = {
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

type Post = {
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

const INITIAL_POSTS: Post[] = [
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
    products: [],
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

function approvalColor(pct: number) {
  if (pct >= 60) return { dot: "bg-green-500", text: "text-green-700" };
  if (pct >= 40) return { dot: "bg-amber-500", text: "text-amber-700" };
  return { dot: "bg-red-500", text: "text-red-700" };
}

function skinTypeLabel(t: SkinType) {
  return t === "oily" ? "oily" : t === "dry" ? "dry" : t === "combo" ? "combination" : t === "sensitive" ? "sensitive" : "normal";
}

/* ---------- Page ---------- */

export function TeaProductsContent({ embedded = false }: { embedded?: boolean } = {}) {
  const [activeTag, setActiveTag] = React.useState<TagKey | "all">("all");
  const [posts, setPosts] = React.useState<Post[]>(INITIAL_POSTS);
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

  return (
    <article
      style={{
        background: "#fff",
        border: "0.5px solid #E8E0D8",
        borderRadius: "14px",
        overflow: "hidden",
        padding: "10px",
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
              <img
                src={post.images[activeImg] ?? post.images[0]}
                alt=""
                style={{ width: "100%", height: 160, borderRadius: 12, objectFit: "cover", display: "block" }}
              />
              {post.images.length > 1 && (
                <div className="mt-2 flex items-center justify-center gap-1">
                  {post.images.map((_, i) => {
                    const on = i === activeImg;
                    return (
                      <button
                        key={i}
                        onClick={() => setActiveImg(i)}
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
              className="mt-1"
              style={{
                fontSize: 10,
                color: "#888",
                border: "0.5px solid #ddd",
                borderRadius: 8,
                padding: "4px 9px",
                background: "#faf8f5",
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
          onClick={onHelped}
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
          style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: 0, padding: 0, cursor: "pointer", color: "#8A7E76" }}
          aria-label="Comments"
        >
          <MessageCircle className="h-4 w-4" />
          <span style={{ fontSize: 11 }}>{post.comments}</span>
        </button>

        <div className="flex-1" />

        <button
          onClick={onSaved}
          style={{ background: "none", border: 0, padding: 4, cursor: "pointer", color: post.saved ? "#1C0A00" : "#8A7E76" }}
          aria-label="Save"
        >
          <Bookmark className="h-4 w-4" fill={post.saved ? "currentColor" : "none"} />
        </button>
        <button
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

function ComposeSheet({
  open, onOpenChange, promptContext, onSubmit,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  promptContext?: string;
  onSubmit: (p: Omit<Post, "id" | "helped" | "helpedByMe" | "saved" | "comments" | "createdAt">) => void;
}) {
  const [text, setText] = React.useState("");
  const [tag, setTag] = React.useState<TagKey>("hot-tea");
  const [images, setImages] = React.useState<string[]>([]);
  const [tagged, setTagged] = React.useState<TaggedProduct[]>([]);
  const [search, setSearch] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setText(""); setTag("hot-tea"); setImages([]); setTagged([]); setSearch("");
    }
  }, [open]);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const urls = Array.from(files).map((f) => URL.createObjectURL(f));
    setImages((p) => [...p, ...urls]);
  };

  const searchResults = search.trim()
    ? PRODUCT_CATALOG.filter(
        (p) =>
          !tagged.find((t) => t.id === p.id) &&
          (p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.brand.toLowerCase().includes(search.toLowerCase()))
      ).slice(0, 4)
    : [];

  const submit = () => {
    if (!text.trim()) return;
    onSubmit({
      skinType: "oily", // "shows as 🍩 — not your name"
      tag, postType: "spill", text: text.trim(), images, products: tagged, promptContext,
    });
  };

  const COMPOSE_TAGS: TagKey[] = ["night-out", "hot-tea", "review", "grwm", "question"];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto h-[88vh] max-w-[480px] overflow-hidden rounded-t-3xl border-0 p-0"
        style={{ background: "#faf8f5" }}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-black/5 px-5 py-3.5">
            <h2 className="font-display text-lg font-semibold text-[#1a1a1a]">Spill the tea</h2>
            <button onClick={() => onOpenChange(false)} className="rounded-full p-1.5 hover:bg-black/5">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {promptContext && (
              <div
                className="mb-3 rounded-xl border p-3"
                style={{ background: "rgba(251,191,36,0.12)", borderColor: "rgba(251,191,36,0.3)" }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#92500a" }}>
                  replying to
                </p>
                <p className="mt-0.5 text-xs font-medium text-[#1a1a1a]">{promptContext}</p>
              </div>
            )}

            {/* Tag selector */}
            <div className="no-scrollbar -mx-5 mb-3 flex gap-2 overflow-x-auto px-5">
              {COMPOSE_TAGS.map((t) => {
                const active = tag === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTag(t)}
                    className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold"
                    style={{
                      background: active ? "#1a1a1a" : "rgba(0,0,0,0.05)",
                      color: active ? "#faf8f5" : "#1a1a1a",
                    }}
                  >
                    {TAG_LABEL[t]}
                  </button>
                );
              })}
            </div>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="honest take, question, tea, routine... anything goes"
              className="min-h-[120px] resize-none rounded-2xl border-black/10 bg-white text-[15px]"
            />

            {/* Image previews */}
            {images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {images.map((src, i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <button
                      onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-black/15 text-neutral-500"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Product search */}
            <div className="mt-4">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Tag products
              </p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="search products..."
                  className="rounded-full border-black/10 bg-white pl-9"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="mt-2 space-y-1.5 rounded-xl border border-black/5 bg-white p-1.5">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setTagged((prev) => [...prev, p]); setSearch(""); }}
                      className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left hover:bg-black/5"
                    >
                      <img src={p.image} alt="" className="h-9 w-9 rounded-md object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-[#1a1a1a]">{p.name}</p>
                        <p className="truncate text-[11px] text-neutral-500">{p.brand} · {p.price}</p>
                      </div>
                      <Plus className="h-4 w-4 text-neutral-400" />
                    </button>
                  ))}
                </div>
              )}
              {tagged.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {tagged.map((p) => (
                    <div key={p.id} className="flex items-center gap-2.5 rounded-lg bg-white p-2">
                      <img src={p.image} alt="" className="h-9 w-9 rounded-md object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-[#1a1a1a]">{p.name}</p>
                        <p className="truncate text-[11px] text-neutral-500">{p.brand}</p>
                      </div>
                      <button
                        onClick={() => setTagged((prev) => prev.filter((x) => x.id !== p.id))}
                        className="rounded-full p-1 hover:bg-black/5"
                      >
                        <X className="h-4 w-4 text-neutral-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="mt-4 text-center text-[11px] text-neutral-500">
              shows as 🍩 · not your name
            </p>
          </div>

          {/* Bottom action bar */}
          <div className="flex items-center gap-2 border-t border-black/5 px-4 py-3" style={{ background: "#faf8f5" }}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => onFiles(e.target.files)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1a1a1a] shadow-sm"
              aria-label="Add photo"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <button
              onClick={() => document.getElementById("compose-search")?.focus()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1a1a1a] shadow-sm"
              aria-label="Tag product"
            >
              <Tag className="h-4 w-4" />
            </button>
            <div className="flex-1" />
            <Button
              disabled={!text.trim()}
              onClick={submit}
              className="h-10 rounded-full px-6 font-semibold disabled:opacity-40"
              style={{ background: "#1a1a1a", color: "#faf8f5" }}
            >
              Post
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}