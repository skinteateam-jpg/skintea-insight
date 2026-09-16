import * as React from "react";
import { createFileRoute, useNavigate, Outlet, useMatchRoute } from "@tanstack/react-router";
import BottomNav from "@/components/BottomNav";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
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

/* An author is the signed-in profile behind the post and nothing else. There is
   no persona name or emoji generated from skin type — a post with no signed-in
   author renders with no name, not with an invented one. */

export const SKIN_BG: Record<SkinType, string> = {
  oily: "#fef3c7",
  dry: "#fce7f3",
  combo: "#ede9fe",
  sensitive: "#fee2e2",
  normal: "#e0f2fe",
};

/** Avatar background for a post. Neutral when the author's skin type is unknown. */
export function skinBg(t: SkinType | null | undefined) {
  return t ? SKIN_BG[t] : "#f5f0ea";
}

/** profiles.skin_type is stored capitalised ("Combination"); the feed keys are lowercase. */
export function normalizeSkinType(raw: string | null | undefined): SkinType | null {
  switch ((raw ?? "").trim().toLowerCase()) {
    case "oily": return "oily";
    case "dry": return "dry";
    case "combo":
    case "combination": return "combo";
    case "sensitive": return "sensitive";
    case "normal": return "normal";
    default: return null;
  }
}

export function formatAgo(diffSec: number) {
  const diff = Math.max(1, Math.floor(diffSec));
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

/** "3h ago" from a real epoch-ms timestamp, or null when the post has none. */
export function postAgeLabel(createdAt: number | null | undefined): string | null {
  if (typeof createdAt !== "number" || !Number.isFinite(createdAt) || createdAt <= 0) return null;
  return `${formatAgo((Date.now() - createdAt) / 1000)} ago`;
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
  image?: string;
};

export type Post = {
  id: string;
  /** The author's own skin type, read from their profile. null when unknown — never guessed. */
  skinType: SkinType | null;
  /** The tag the author picked. null when they picked none. */
  tag: TagKey | null;
  postType: PostType;
  hashtags?: string[];
  text: string;
  images: string[];
  products: TaggedProduct[];
  helped: number;
  helpedByMe: boolean;
  saved: boolean;
  comments: number;
  promptContext?: string;
  /** Epoch ms. null when the post carries no real timestamp — then no age renders. */
  createdAt: number | null;
  /** profiles.username of the author. null when there is no signed-in author. */
  authorUsername: string | null;
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

/* Compose-time detail fields are the poster's own words. Nothing is pre-filled:
   usage guidance the poster did not write would ship as their claim. */

/* Skintea's own conversation starters — editorial copy, not user content and not
   a rotating daily feature. One is shown as a prompt, and only alongside a real
   feed. Nothing here is ever injected between posts. */
const PROMPTS = [
  "what's in your 'just in case tonight' bag? 💋",
  "Worst skincare mistake you've ever made?",
  "Drugstore dupe that beat the luxury original?",
  "What's currently sitting on your shelf collecting dust?",
];

/* Tags a poster can pick, mirroring the filter bar so a chosen tag is always
   reachable there. "all" is a filter, not a tag. */
const COMPOSE_TAGS = TAGS.filter((t): t is { key: TagKey; label: string } => t.key !== "all");

/* ---------- Helpers ---------- */

export function skinTypeLabel(t: SkinType) {
  return t === "oily" ? "oily" : t === "dry" ? "dry" : t === "combo" ? "combination" : t === "sensitive" ? "sensitive" : "normal";
}

/* ---------- Posting switch ----------

   Product Talk posts belong in `product_posts`, which only accepts a row whose
   user_id is the signed-in author (enforce_signed_in_author). That write path is
   not built in this route yet, so posting stays closed: the composer opens and
   can be filled in, the submit buttons are visibly disabled, and the feed shows
   an honest empty state instead of a community that does not exist. Drafts held
   on one device are not community posts, so none are read back or shown.

   Flip this to true in the same change that wires the database write — the feed,
   its headings and the prompt return on their own. */
const POSTING_ENABLED: boolean = false;

/* ---------- Posts store (module-level, shared across routes) ---------- */

const _STORAGE_KEY = "skintea.posts.v1";
function _loadInitial(): Post[] {
  if (!POSTING_ENABLED) return [];
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Post[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
let _posts: Post[] = _loadInitial();
const _listeners = new Set<() => void>();
function _persist() {
  if (!POSTING_ENABLED) return;
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

/* ---------- Viewer — the signed-in profile a new post would belong to ---------- */

export type ViewerProfile = {
  userId: string;
  username: string | null;
  skinType: SkinType | null;
};

function useViewerProfile(): ViewerProfile | null {
  const [viewer, setViewer] = React.useState<ViewerProfile | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const load = async (userId: string | null) => {
      if (!userId) {
        if (!cancelled) setViewer(null);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("username, skin_type")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) console.error("viewer profile fetch failed", error);
      const row = data as { username: string | null; skin_type: string | null } | null;
      setViewer({
        userId,
        username: row?.username ?? null,
        skinType: normalizeSkinType(row?.skin_type),
      });
    };

    supabase.auth.getSession().then(({ data }) => { void load(data.session?.user?.id ?? null); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      void load(session?.user?.id ?? null);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  return viewer;
}

/* ---------- Product search — the real catalog, never a hard-coded list ---------- */

type ProductSearchState = { results: TaggedProduct[]; status: "idle" | "searching" | "done" };

function useProductSearch(term: string): ProductSearchState {
  const [results, setResults] = React.useState<TaggedProduct[]>([]);
  const [status, setStatus] = React.useState<ProductSearchState["status"]>("idle");

  React.useEffect(() => {
    // Commas and brackets are PostgREST filter syntax, so they never reach `.or`.
    const query = term.trim().replace(/[,()]/g, " ").trim();
    if (query.length < 2) {
      setResults([]);
      setStatus("idle");
      return;
    }
    setStatus("searching");
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, brand, image_url")
        .eq("is_active", true)
        .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
        .limit(10);
      if (cancelled) return;
      if (error) {
        console.error("Product search failed", error);
        setResults([]);
        setStatus("done");
        return;
      }
      const rows = (data ?? []) as { id: string; name: string; brand: string | null; image_url: string | null }[];
      setResults(rows.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand ?? "",
        image: p.image_url ?? undefined,
      })));
      setStatus("done");
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [term]);

  return { results, status };
}

/* ---------- Page ---------- */

export function TeaProductsContent({ embedded = false }: { embedded?: boolean } = {}) {
  const [activeTag, setActiveTag] = React.useState<TagKey | "all">("all");
  const [posts, setPosts] = usePostsStore();
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [composePrompt, setComposePrompt] = React.useState<string | undefined>();

  // One editorial prompt, shown only alongside a real feed. Not framed as daily:
  // it does not rotate, and nothing here measures a day.
  const featuredPrompt = PROMPTS[0];

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
      createdAt: Date.now(),
    };
    setPosts((prev) => [post, ...prev]);
    setActiveTag("all");
  };

  const openCompose = (prompt?: string) => {
    setComposePrompt(prompt);
    setComposeOpen(true);
  };

  // The feed is posts and nothing else. Prompt cards are never spliced in — an
  // injected card is not something anyone posted.
  const hasFeed = filtered.length > 0;

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
        {/* Tag filter bar.
            Sticks under the /tea header rather than fighting it: the header
            publishes its own height as --tea-header-h and sits at a higher
            z-index, and the fallback of 0px is the standalone route. */}
        <div
          className="sticky border-b"
          style={{
            background: "#faf8f5",
            borderColor: "#f0ede8",
            top: "var(--tea-header-h, 0px)",
            zIndex: 20,
          }}
        >
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
                    borderColor: active ? "#1C0A00" : "#E8DDD4",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>


        {/* Prompt banner — a conversation starter, shown only when there is a
            feed for it to sit above. No daily framing: nothing rotates it. */}
        {hasFeed && (
          <section className="pt-5" style={{ margin: "0 16px 16px" }}>
            <div
              className="flex items-center gap-3 p-3"
              style={{ background: "#1C0A00", color: "#FFFCF8", borderRadius: "14px" }}
            >
              <div className="flex-1">
                <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.8px", color: "#A8001C", fontWeight: 700 }}>
                  Skintea prompt
                </p>
                <p className="mt-1" style={{ fontSize: "13px", color: "#FFFCF8", lineHeight: 1.4 }}>{featuredPrompt}</p>
              </div>
              <button
                onClick={() => openCompose(featuredPrompt)}
                className="flex-shrink-0 transition-transform active:scale-95"
                style={{ background: "#A8001C", color: "#FFFCF8", borderRadius: "20px", fontSize: "12px", padding: "8px 16px", fontWeight: 600 }}
              >
                Spill
              </button>
            </div>
          </section>
        )}

        {/* Feed */}
        <section className="px-4 pt-4 mb-3.5">
          {hasFeed && (
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
          )}
          {!hasFeed && (
            <div className="rounded-2xl bg-white p-8 text-center text-sm text-neutral-500 shadow-sm">
              {POSTING_ENABLED
                ? "No product talk yet — be the first to post."
                : "No product talk yet. Posting opens soon."}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filtered.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onHelped={() => toggleHelped(post.id)}
                onSaved={() => toggleSaved(post.id)}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Floating Spill the tea button.
          BottomNav is md:hidden, so the 72px clearance is a mobile-only offset;
          on desktop the button drops to the bottom edge instead of floating
          above a bar that is not there. */}
      <button
        onClick={() => openCompose()}
        className="fixed bottom-[72px] md:bottom-6"
        style={{
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
  const [activeImg, setActiveImg] = React.useState(0);
  const badge = POST_TYPE_BADGE[post.postType];
  const isSpill = post.postType === "spill";
  const ageLabel = postAgeLabel(post.createdAt);
  const heroProduct = !isSpill && post.products.length > 0 ? post.products[0] : null;
  const steps = post.steps;
  const navigate = useNavigate();

  return (
    <article
      onClick={() => navigate({ to: "/tea-products/$postId", params: { postId: post.id } })}
      style={{
        background: "#fff",
        border: "0.5px solid #E8DDD4",
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

      {/* Author row — the real username or nothing at all */}
      <div className="flex items-center gap-2">
        <div
          className="flex flex-shrink-0 items-center justify-center rounded-full"
          style={{ width: 28, height: 28, background: skinBg(post.skinType), fontSize: 12, lineHeight: 1, color: "#1C0A00", fontWeight: 600 }}
        >
          {post.authorUsername ? post.authorUsername.slice(0, 1).toUpperCase() : ""}
        </div>
        <div className="min-w-0 flex-1">
          {post.authorUsername && (
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-[#1C0A00]" style={{ fontSize: 13 }}>{post.authorUsername}</p>
            </div>
          )}
          {ageLabel && <p style={{ fontSize: 10, color: "#999999" }}>{ageLabel}</p>}
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
                          background: on ? "#1C0A00" : "#E8DDD4",
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
          {heroProduct.image && (
            <img
              src={heroProduct.image}
              alt={heroProduct.name}
              style={{ width: 30, height: 30, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
            />
          )}
          <div className="min-w-0 flex-1">
            <p style={{ color: "#A8001C", fontSize: 9, textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.4 }}>
              Hot Pick
            </p>
            <p style={{ fontSize: 12, color: "#1C0A00", fontWeight: 500 }} className="truncate">
              {heroProduct.name}
            </p>
            {heroProduct.brand && (
              <p style={{ fontSize: 10, color: "#999" }} className="truncate">{heroProduct.brand}</p>
            )}
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

        {/* Commenting is not wired yet, so the control is disabled rather than
            silently inert, and a count of 0 that nothing measured is not shown. */}
        <button
          type="button"
          disabled
          title="Comments open when posting does"
          style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: 0, padding: 0, cursor: "not-allowed", color: "#cccccc" }}
          aria-label="Comments (not available yet)"
        >
          <MessageCircle className="h-4 w-4" />
          {post.comments > 0 && <span style={{ fontSize: 11 }}>{post.comments}</span>}
        </button>

        <div className="flex-1" />

        <button
          onClick={(e) => { e.stopPropagation(); onSaved(); }}
          style={{ background: "none", border: 0, padding: 4, cursor: "pointer", color: post.saved ? "#1C0A00" : "#999999" }}
          aria-label="Save"
        >
          <Bookmark className="h-4 w-4" fill={post.saved ? "currentColor" : "none"} />
        </button>
        {/* Sharing a card from the feed is not built; the post page has a working
            share control. Disabled here rather than looking available. */}
        <button
          type="button"
          disabled
          title="Open the post to share it"
          style={{ background: "none", border: 0, padding: 4, cursor: "not-allowed", color: "#cccccc" }}
          aria-label="Share (not available here)"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </article>
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
          background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 12,
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
  search, setSearch, searchResults, searchStatus, onSelect,
}: {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  searchResults: TaggedProduct[];
  searchStatus: ProductSearchState["status"];
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
      {/* "Nothing found" is only said once a search has actually finished. */}
      {searchStatus === "done" && searchResults.length === 0 && (
        <div style={{ marginTop: 6, fontSize: 11, color: "#999", padding: "0 4px" }}>
          No products match that search.
        </div>
      )}
      {searchResults.length > 0 && (
        <div style={{ marginTop: 6, background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 12, overflow: "hidden" }}>
          {searchResults.map(p => (
            <button key={p.id} onClick={() => onSelect(p)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "none", border: "none", borderBottom: "0.5px solid #f5f0ea", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              {p.image && (
                <img src={p.image} style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#1C0A00" }}>{p.name}</div>
                <div style={{ fontSize: 11, color: "#999" }}>{p.brand}</div>
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
  hotPick, setHotPick, search, setSearch, searchResults, searchStatus, bgColor, borderColor, onSelect,
}: {
  hotPick: TaggedProduct | null;
  setHotPick: React.Dispatch<React.SetStateAction<TaggedProduct | null>>;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  searchResults: TaggedProduct[];
  searchStatus: ProductSearchState["status"];
  bgColor: string;
  borderColor: string;
  onSelect: (p: TaggedProduct) => void;
}) {
  return hotPick ? (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
      {hotPick.image && (
        <img src={hotPick.image} style={{ width: 38, height: 38, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#1C0A00" }}>{hotPick.name}</div>
        <div style={{ fontSize: 11, color: "#999" }}>{hotPick.brand}</div>
      </div>
      <button onClick={() => setHotPick(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
        <X size={15} color="#aaa" />
      </button>
    </div>
  ) : (
    <div style={{ marginBottom: 14 }}>
      <ProductSearch search={search} setSearch={setSearch} searchResults={searchResults} searchStatus={searchStatus} onSelect={onSelect} />
    </div>
  );
}

/* The tag the post is filed under is the one the poster picks here — the feed's
   tag bar files it nowhere else. Picking none is allowed; the post then only
   shows under "All". */
function TagPicker({
  tag, setTag,
}: {
  tag: TagKey | null;
  setTag: React.Dispatch<React.SetStateAction<TagKey | null>>;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 500, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>
        Tag — optional
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {COMPOSE_TAGS.map(t => {
          const on = tag === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTag(on ? null : t.key)}
              style={{
                fontSize: 11, padding: "5px 11px", borderRadius: 20, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                background: on ? "#1C0A00" : "#fff",
                color: on ? "#FFFCF8" : "#888",
                border: `1px solid ${on ? "#1C0A00" : "#E8DDD4"}`,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Shown at the top of the composer while POSTING_ENABLED is false, so nobody
   fills in a form that has nowhere to go. */
function PostingClosedNotice() {
  if (POSTING_ENABLED) return null;
  return (
    <div style={{ background: "#f5f0ea", border: "1px solid #E8DDD4", borderRadius: 10, padding: "9px 12px", marginBottom: 14, fontSize: 12, color: "#6b6258", lineHeight: 1.5 }}>
      Posting isn't open yet. You can look around the composer, but nothing is posted or saved.
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
              <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 9, background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 10, padding: "9px 11px" }}>
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
        <div style={{ background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 12, overflow: "hidden" }}>
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
  const viewer = useViewerProfile();
  const [stage, setStage] = React.useState<ComposeStage>("type");
  const [skinTeaMode, setSkinTeaMode] = React.useState<SkinTeaMode>("single");
  const [tag, setTag] = React.useState<TagKey | null>(null);
  const [text, setText] = React.useState("");
  const [images, setImages] = React.useState<string[]>([]);
  const [hashtags, setHashtags] = React.useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [hotPick, setHotPick] = React.useState<TaggedProduct | null>(null);
  const [steps, setSteps] = React.useState<ComposeStep[]>([]);
  const [showStepPicker, setShowStepPicker] = React.useState(false);
  const [, setShowProductSearch] = React.useState(false);
  // Every detail field starts empty. Pre-filled usage guidance would ship as the
  // poster's own claim about a product.
  const [skinTeaDetails, setSkinTeaDetails] = React.useState({
    when: "" as string,
    whenChoice: "" as string,
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
      setTag(null);
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
        when: "", whenChoice: "",
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

  // Results come from the `products` table, debounced — there is no local catalogue.
  const { results: searchResults, status: searchStatus } = useProductSearch(search);

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
    // No autofill: the detail fields stay empty until the poster writes them.
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

  // The author is whoever is signed in, and nothing about them is invented:
  // an unknown skin type stays null and an unknown username stays null.
  const authorFields = {
    skinType: viewer?.skinType ?? null,
    authorUsername: viewer?.username ?? null,
  };

  const submitSpill = () => {
    if (!POSTING_ENABLED || !text.trim()) return;
    onSubmit({
      ...authorFields, tag, postType: "spill",
      text: text.trim(), images, hashtags,
      // A spill may name one product; when it does, the post links it.
      products: hotPick ? [hotPick] : [],
      steps: [], totalSteps: 0, promptContext,
    });
    onOpenChange(false);
  };

  const submitSkinTea = () => {
    if (!POSTING_ENABLED || !text.trim() || !hotPick) return;
    const routineSteps = steps.map((s, i) => ({
      num: i + 1, label: s.label, product: s.product || s.label, type: s.type,
    }));
    onSubmit({
      ...authorFields, tag, postType: "skin-tea",
      skinTeaMode,
      text: text.trim(), images, hashtags,
      products: [hotPick],
      // A single-product post has no routine, so it carries no steps. Labelling
      // the product a "Serum" would be a step the poster never wrote.
      steps: skinTeaMode === "routine" ? routineSteps : [],
      totalSteps: skinTeaMode === "routine" ? routineSteps.length : 0,
      promptContext,
    });
    onOpenChange(false);
  };

  const submitLookTea = () => {
    if (!POSTING_ENABLED || !text.trim() || !hotPick || images.length === 0) return;
    onSubmit({
      ...authorFields, tag, postType: "look-tea",
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
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "0.5px solid #E8DDD4", flexShrink: 0 }}>
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
  const hotPickPropsBase = { hotPick, setHotPick, search, setSearch, searchResults, searchStatus, onSelect: selectHotPick };
  const stepBuilderPropsBase = { steps, setSteps, showStepPicker, setShowStepPicker };

  // While posting is closed the submit buttons are disabled and say so, rather
  // than looking live and doing nothing.
  const spillReady = POSTING_ENABLED && !!text.trim();
  const skinTeaReady = POSTING_ENABLED && !!text.trim() && !!hotPick;
  const lookTeaReady = POSTING_ENABLED && !!text.trim() && !!hotPick && images.length > 0;

  const TypeStage = (
    <div style={{ display: "flex", flexDirection: "column" as const, height: "100%" }}>
      <SheetHeader title="What are you spilling?" />
      <div style={{ flex: 1, overflowY: "auto" as const, padding: "16px" }}>
        <PostingClosedNotice />
        {promptContext && (
          <div style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.6px", color: "#92500a", marginBottom: 3 }}>replying to</div>
            <div style={{ fontSize: 12, color: "#1C0A00" }}>{promptContext}</div>
          </div>
        )}
        {[
          /* `example` is a made-up illustration of the format, so it is labelled
             as an example and never rendered inside quotation marks — nobody
             said these words. */
          { type: "skin-tea" as ComposeStage, label: "Skin Tea", bg: "#FFF0F0", color: "#A8001C", border: "#f5d0d0", desc: "Skincare — one product, a full routine, skin prep, ingredients. Anything about your skin.", example: "Example: two weeks on this niacinamide and my t-zone is actually calm" },
          { type: "look-tea" as ComposeStage, label: "Look Tea", bg: "#F0EDF8", color: "#5B3FA6", border: "#e0d8f5", desc: "A makeup look — show your face, then break down how you built it. Skin prep + makeup steps.", example: "Example: glazed skin met gala look — here's every product i used" },
          { type: "spill" as ComposeStage, label: "Spill", bg: "#FFF7E6", color: "#B45309", border: "#f5edda", desc: "Raw honest take — warning, hot opinion, experience others need to know. No steps needed.", example: "Example: nobody warned me tretinoin makes you look worse for 3 months" },
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
        <PostingClosedNotice />
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
                <div style={{ background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>

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
                            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, border: "1px solid", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", background: skinTeaDetails.whenChoice === opt ? "#A8001C" : "#fff", color: skinTeaDetails.whenChoice === opt ? "#fff" : "#888", borderColor: skinTeaDetails.whenChoice === opt ? "#A8001C" : "#E8DDD4" }}
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
                      <input value={skinTeaDetails.howMuch} placeholder="how much you used" onChange={e => setSkinTeaDetails(prev => ({ ...prev, howMuch: e.target.value }))} style={{ width: "100%", background: "#f5f0ea", border: "none", borderRadius: 8, padding: "7px 10px", fontSize: 12, color: "#333", outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" as const }} />
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
                      <input value={skinTeaDetails.watchOut} placeholder="anything you'd warn someone about" onChange={e => setSkinTeaDetails(prev => ({ ...prev, watchOut: e.target.value }))} style={{ width: "100%", background: "#f5f0ea", border: "none", borderRadius: 8, padding: "7px 10px", fontSize: 12, color: "#333", outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" as const }} />
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
                            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, border: "1px solid", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", background: skinTeaDetails.timelineChoice === opt ? "#A8001C" : "#fff", color: skinTeaDetails.timelineChoice === opt ? "#fff" : "#888", borderColor: skinTeaDetails.timelineChoice === opt ? "#A8001C" : "#E8DDD4" }}
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
        <TagPicker tag={tag} setTag={setTag} />
      </div>
      <div style={{ padding: "10px 16px 16px", borderTop: "0.5px solid #E8DDD4", background: "#FFFCF8" }}>
        <button
          disabled={!skinTeaReady}
          onClick={submitSkinTea}
          style={{ width: "100%", background: skinTeaReady ? "#A8001C" : "#f0ebe3", color: skinTeaReady ? "#fff" : "#bbb", border: "none", borderRadius: 20, padding: "12px", fontSize: 13, fontWeight: 500, cursor: skinTeaReady ? "pointer" : "default", fontFamily: "'DM Sans', sans-serif" }}
        >
          {POSTING_ENABLED ? "Post Skin Tea" : "Posting opens soon"}
        </button>
      </div>
    </div>
  );

  const LookTeaStage = (
    <div style={{ display: "flex", flexDirection: "column" as const, height: "100%" }}>
      <SheetHeader title="Look Tea" badge="Look Tea" badgeBg="#F0EDF8" badgeColor="#5B3FA6" backTo="type" />
      <div style={{ flex: 1, overflowY: "auto" as const, padding: "16px" }}>
        <PostingClosedNotice />
        <PhotoMandatory images={images} setImages={setImages} lookFileRef={lookFileRef} />
        <TextHashtagBlock {...textBlockProps} placeholder="what's the story behind this look?" />
        <div style={{ fontSize: 10, fontWeight: 500, color: "#aaa", textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 8 }}>Hot Pick — hero product of this look</div>
        <HotPickSelected {...hotPickPropsBase} bgColor="#F0EDF8" borderColor="#e0d8f5" />
        <div style={{ fontSize: 10, fontWeight: 500, color: "#aaa", textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 8 }}>Breakdown steps</div>
        <StepBuilder {...stepBuilderPropsBase} allowMakeup={true} />
        <TagPicker tag={tag} setTag={setTag} />
      </div>
      <div style={{ padding: "10px 16px 16px", borderTop: "0.5px solid #E8DDD4", background: "#FFFCF8" }}>
        <button
          disabled={!lookTeaReady}
          onClick={submitLookTea}
          style={{ width: "100%", background: lookTeaReady ? "#5B3FA6" : "#f0ebe3", color: lookTeaReady ? "#fff" : "#bbb", border: "none", borderRadius: 20, padding: "12px", fontSize: 13, fontWeight: 500, cursor: lookTeaReady ? "pointer" : "default", fontFamily: "'DM Sans', sans-serif" }}
        >
          {!POSTING_ENABLED
            ? "Posting opens soon"
            : images.length === 0 ? "Add a photo to post" : !hotPick ? "Add a hot pick to post" : "Post Look Tea"}
        </button>
      </div>
    </div>
  );

  const SpillStage = (
    <div style={{ display: "flex", flexDirection: "column" as const, height: "100%" }}>
      <SheetHeader title="Spill" badge="Spill" badgeBg="#FFF7E6" badgeColor="#B45309" backTo="type" />
      <div style={{ flex: 1, overflowY: "auto" as const, padding: "16px" }}>
        <PostingClosedNotice />
        <div style={{ background: "#FFF7E6", border: "1px solid #f5edda", borderRadius: 10, padding: "9px 12px", marginBottom: 14, fontSize: 12, color: "#B45309", lineHeight: 1.5 }}>
          raw and honest. no product required. just say what others won't.
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="nobody warned me... / hot take: ... / don't do this..."
          autoFocus
          style={{ width: "100%", minHeight: 120, resize: "none" as const, background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 12, padding: "11px 13px", fontSize: 13, color: "#1C0A00", lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" as const, marginBottom: 8 }}
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

        {/* A spill can name one product. This is what fills the post page's
            "Product mentioned" block — without it that block is unreachable. */}
        <div style={{ fontSize: 10, fontWeight: 500, color: "#aaa", textTransform: "uppercase" as const, letterSpacing: "0.8px", margin: "14px 0 8px" }}>Product mentioned — optional</div>
        <HotPickSelected {...hotPickPropsBase} bgColor="#FFF7E6" borderColor="#f5edda" />

        <TagPicker tag={tag} setTag={setTag} />
      </div>
      <div style={{ padding: "10px 16px 16px", borderTop: "0.5px solid #E8DDD4", background: "#FFFCF8" }}>
        <button
          disabled={!spillReady}
          onClick={submitSpill}
          style={{ width: "100%", background: spillReady ? "#1C0A00" : "#f0ebe3", color: spillReady ? "#FFFCF8" : "#bbb", border: "none", borderRadius: 20, padding: "12px", fontSize: 13, fontWeight: 500, cursor: spillReady ? "pointer" : "default", fontFamily: "'DM Sans', sans-serif" }}
        >
          {POSTING_ENABLED ? "Post Spill" : "Posting opens soon"}
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
