import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import {
  Lock, Bell, Home, User as UserIcon, Compass, X, Heart, MessageCircle, Bookmark, Send,
} from "lucide-react";

export const Route = createFileRoute("/surgery-talk")({
  head: () => ({
    meta: [
      { title: "Surgery Talk — Skintea" },
      { name: "description", content: "Share and read surgery experiences." },
      { property: "og:title", content: "Surgery Talk — Skintea" },
      { property: "og:description", content: "Share and read surgery experiences." },
    ],
  }),
  component: SurgeryTalkPage,
});

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const CREAM = "#FFFCF8";
const WARM_WHITE = "#FFFCF8";
const BORDER = "#E8DDD4";
const MUTED = "#999999";

/* The surgery filter is whatever `surgeries` holds. There is no hard-coded list
   standing in for it: a substituted list offers filters that match nothing and
   hides the fact that the query failed. */

type Surgery = { id: string; name: string };

/* Ranking needs a population to rank. Below this many posts, every ranking
   surface stays hidden — medals, rank numbers, "Top Tea", "Most Controversial"
   and the day's pick — because #1 of three posts is not a ranking. Raise or
   lower it in one place; the whole ranking UI follows. */
const MIN_RANKED_POSTS = 25;

const SKIN_TYPES = [
  { id: "all", label: "All", emoji: "" },
  { id: "Oily", label: "Oily", emoji: "🍩" },
  { id: "Dry", label: "Dry", emoji: "🏜️" },
  { id: "Sensitive", label: "Sensitive", emoji: "🌸" },
  { id: "Combination", label: "Combo", emoji: "✨" },
  { id: "Normal", label: "Normal", emoji: "🌿" },
];

const SKIN_BG: Record<string, string> = {
  Oily: "#FCE7B3", Dry: "#DCE9F5", Sensitive: "#F8DCE8",
  Combination: "#EDE6F8", Normal: "#DDF1DD",
};
const SKIN_EMOJI: Record<string, string> = {
  Oily: "🍩", Dry: "🏜️", Sensitive: "🌸", Combination: "✨", Normal: "🌿",
};

type Photo = { url: string; label: string };
type PostRow = {
  id: string;
  user_id: string;
  surgery_id: string | null;
  clinic_name: string | null;
  country: string | null;
  city: string | null;
  total_cost: string | null;
  recovery_time: string | null;
  pain_level: number | null;
  my_thoughts_vs_reality: string | null;
  struggle: string | null;
  what_happened: string | null;
  surprised_me: string | null;
  works_for: string | null;
  warn_if: string | null;
  outcome: "Would do again" | "Modified" | "Wouldn't" | null;
  hashtags: string[];
  skin_type: string | null;
  photos: Photo[];
  comments_open: boolean;
  likes_count: number;
  created_at: string;
};

type EnrichedPost = PostRow & {
  surgery_name: string;
  /** profiles.name. null when the author has none — then no name renders. */
  user_name: string | null;
  /** Emoji for a known skin type only. "" when the skin type is unknown. */
  user_emoji: string;
  /** e.g. "oily skin". "" when the skin type is unknown. No membership claim. */
  user_skin_line: string;
  user_is_derm: boolean;
};


// ============= Hooks =============
function useSurgeries() {
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("surgeries")
          .select("id, name")
          .eq("active", true)
          .order("sort_order", { ascending: true });
        if (cancelled) return;
        if (error) {
          console.error("surgeries fetch failed", error);
          setFailed(true);
          setSurgeries([]);
        } else {
          // An empty table is an empty filter row, not a reason to invent one.
          setSurgeries((data ?? []) as Surgery[]);
        }
      } catch (err) {
        if (!cancelled) { console.error("surgeries fetch failed", err); setFailed(true); setSurgeries([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return { surgeries, loading, failed };
}

function useSession() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return userId;
}

function usePosts(surgeries: Surgery[]) {
  const [posts, setPosts] = useState<EnrichedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const surgeriesRef = useRef(surgeries);
  useEffect(() => { surgeriesRef.current = surgeries; }, [surgeries]);

  const reload = useCallback(async () => {
    // Only show loading state on first load; subsequent reloads update in place
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const { data, error } = await supabase
        .from("surgery_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error || !data || data.length === 0) {
        // Don't clear real posts we already loaded
        if (!hasLoadedRef.current) setPosts([]);
      } else {
        const surgMap = new Map(surgeriesRef.current.map((s) => [s.id, s.name]));
        const userIds = Array.from(new Set(data.map((p) => p.user_id)));
        let profileMap = new Map<string, { name: string | null; skin_type: string | null; is_derm: boolean }>();
        if (userIds.length > 0) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("user_id, name, skin_type, is_derm")
            .in("user_id", userIds);
          if (profs) profileMap = new Map(profs.map((p) => [p.user_id, p as any]));
        }
        const enriched: EnrichedPost[] = (data as unknown as PostRow[]).map((p) => {
          const prof = profileMap.get(p.user_id);
          const skin = p.skin_type ?? prof?.skin_type ?? "";
          return {
            ...p,
            photos: Array.isArray(p.photos) ? (p.photos as Photo[]) : [],
            surgery_name: p.surgery_id ? (surgMap.get(p.surgery_id) ?? "—") : "—",
            // No stand-in name, no stand-in avatar, and no "member": nothing in
            // the database says any of those.
            user_name: prof?.name ?? null,
            user_emoji: SKIN_EMOJI[skin] ?? "",
            user_skin_line: skin ? `${skin.toLowerCase()} skin` : "",
            user_is_derm: prof?.is_derm ?? false,
          };
        });
        setPosts(enriched);
      }
    } catch {
      if (!hasLoadedRef.current) setPosts([]);
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
    }
  }, []); // stable: surgeries accessed via ref to avoid refetch loops

  useEffect(() => { reload(); }, [reload]);

  // Re-enrich existing posts when surgeries finish loading (no refetch needed)
  useEffect(() => {
    if (surgeries.length === 0) return;
    setPosts((prev) => {
      if (prev.length === 0) return prev;
      const surgMap = new Map(surgeries.map((s) => [s.id, s.name]));
      let changed = false;
      const next = prev.map((p) => {
        if (!p.surgery_id) return p;
        const name = surgMap.get(p.surgery_id);
        if (name && name !== p.surgery_name) {
          changed = true;
          return { ...p, surgery_name: name };
        }
        return p;
      });
      return changed ? next : prev;
    });
  }, [surgeries]);

  // Optimistic local update — used by like/save without refetching
  const updatePost = useCallback((id: string, patch: Partial<EnrichedPost>) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  return { posts, loading, reload, updatePost };
}

// ============= UI primitives =============
function ChipScroll({
  items, active, onChange, renderChip,
}: {
  items: { id: string; label: string; emoji?: string }[];
  active: string;
  onChange: (v: string) => void;
  renderChip?: (item: { id: string; label: string; emoji?: string }, isActive: boolean) => React.ReactNode;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((it) => {
        const isActive = active === it.id;
        if (renderChip) {
          return (
            <button key={it.id} onClick={() => onChange(it.id)} className="shrink-0">
              {renderChip(it, isActive)}
            </button>
          );
        }
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors"
            style={{
              backgroundColor: isActive ? ESPRESSO : "#fff",
              color: isActive ? "#fff" : ESPRESSO,
              border: `1px solid ${isActive ? ESPRESSO : BORDER}`,
              fontFamily: "'DM Sans', sans-serif",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {it.emoji && <span className="mr-1">{it.emoji}</span>}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function ChipSkeleton() {
  return (
    <div className="flex gap-2 overflow-x-hidden px-4 py-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="shrink-0 rounded-full animate-pulse"
          style={{ width: 70 + ((i * 17) % 40), height: 28, background: "#EEE6DC" }} />
      ))}
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: CREAM, minWidth: 0 }}>
      <div className="text-[7px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
        {label}
      </div>
      <div className="mt-1 text-[10px] leading-snug" style={{ color: ESPRESSO, wordBreak: "break-word", overflowWrap: "break-word" }}>
        {value}
      </div>
    </div>
  );
}

/* A neutral name for a position on the 1–10 scale. Nothing here describes what
   the pain felt like: the poster chose a number, not a sentence, and comparisons
   like "easier than a blood draw" were never anyone's words. */
function painScaleLabel(level: number): string {
  if (level <= 2) return "None";
  if (level <= 4) return "Mild";
  if (level <= 6) return "Moderate";
  if (level <= 8) return "Moderate-High";
  return "Severe";
}

function PainBar({ level }: { level: number }) {
  const pct = (level / 10) * 100;
  const label = painScaleLabel(level);
  return (
    <div>
      <div className="text-[7px] font-bold uppercase tracking-wider mb-2" style={{ color: MUTED }}>
        Pain level
      </div>
      <div className="relative" style={{ height: 22 }}>
        <div
          className="absolute left-0 right-0"
          style={{
            top: 7, height: 8, borderRadius: 4,
            background: "linear-gradient(to right, #F0FBF4, #FFF3CD, #FDECEA, #F7C1C1)",
            border: `1px solid ${BORDER}`,
          }}
        />
        {/* The only mark on the scale is the level the poster picked. */}
        <div className="absolute"
          style={{
            left: `${pct}%`, top: 4, transform: "translateX(-50%)",
            width: 14, height: 14, borderRadius: 7, background: CRIMSON,
            border: "2px solid #fff", boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
          }}
        />
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[11px] font-bold" style={{ color: ESPRESSO }}>{level}/10</span>
        <span className="text-[10px]" style={{ color: MUTED }}>{label}</span>
      </div>
      <div className="mt-1 flex justify-between text-[8px]" style={{ color: MUTED }}>
        <span>None</span><span>Mild</span><span>Moderate</span><span>Severe</span>
      </div>
    </div>
  );
}

function NarrativeField({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="py-3" style={{ borderTop: `1px solid ${BORDER}` }}>
      <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
        {label}
      </div>
      <div className="mt-1 text-[12px] leading-relaxed" style={{ color: ESPRESSO }}>
        {value}
      </div>
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: PostRow["outcome"] }) {
  if (!outcome) return null;
  const styles =
    outcome === "Would do again"
      ? { bg: "#F0FBF4", fg: "#1A6636", border: "#B8E8C8" }
      : outcome === "Modified"
      ? { bg: "#FFF8EC", fg: "#8B5E0A", border: "#FAC775" }
      : { bg: "#FBF0F0", fg: "#A32D2D", border: "#F7C1C1" };
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
      style={{ background: styles.bg, color: styles.fg, border: `1px solid ${styles.border}` }}
    >
      {outcome}
    </span>
  );
}

// ============= Comments =============
type CommentRow = { id: string; user_id: string; content: string; created_at: string; user_name?: string | null };

function CommentSection({ postId, userId }: { postId: string; userId: string | null }) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("surgery_comments")
      .select("id, user_id, content, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (!data) return;
    const ids = Array.from(new Set(data.map((c) => c.user_id)));
    const { data: profs } = await supabase.from("profiles").select("user_id, name").in("user_id", ids);
    const map = new Map(profs?.map((p) => [p.user_id, p.name]) ?? []);
    // No stand-in name: an unnamed commenter shows no name.
    setComments(data.map((c) => ({ ...c, user_name: map.get(c.user_id) ?? null })));
  }, [postId]);

  useEffect(() => { load(); }, [load]);

  async function send() {
    if (!text.trim() || !userId) return;
    setLoading(true);
    const { error } = await supabase.from("surgery_comments").insert({ post_id: postId, user_id: userId, content: text.trim() });
    setLoading(false);
    if (!error) { setText(""); load(); }
  }

  return (
    <div className="mt-3 rounded-lg p-3" style={{ background: CREAM }}>
      <div className="space-y-2">
        {comments.length === 0 && (
          <div className="text-[10px] italic" style={{ color: MUTED }}>No comments yet. Be the first.</div>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2">
            <div className="flex shrink-0 items-center justify-center rounded-full"
              style={{ width: 22, height: 22, background: "#fff", border: `1px solid ${BORDER}`, fontSize: 11 }}>
              💭
            </div>
            <div className="flex-1 rounded-lg px-2 py-1.5" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
              {c.user_name && (
                <div className="text-[9px] font-bold" style={{ color: ESPRESSO }}>{c.user_name}</div>
              )}
              <div className="text-[10px]" style={{ color: ESPRESSO }}>{c.content}</div>
              <div className="text-[8px] mt-0.5" style={{ color: MUTED }}>
                {new Date(c.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
      {userId ? (
        <div className="mt-2 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 rounded-full px-3 py-1.5 text-[11px]"
            style={{ background: "#fff", border: `1px solid ${BORDER}`, color: ESPRESSO }}
          />
          <button
            onClick={send}
            disabled={loading || !text.trim()}
            className="flex shrink-0 items-center justify-center rounded-full"
            style={{ width: 30, height: 30, background: CRIMSON, color: "#fff" }}
          >
            <Send size={14} />
          </button>
        </div>
      ) : (
        <div className="mt-2 text-[10px] italic" style={{ color: MUTED }}>Sign in to comment.</div>
      )}
    </div>
  );
}

// ============= Post card =============
function PostCard({ post, locked, userId, onLikeChange }: { post: EnrichedPost; locked: boolean; userId: string | null; onLikeChange: (delta: number) => void }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState<number>(0);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { count } = await supabase.from("surgery_comments")
        .select("*", { count: "exact", head: true }).eq("post_id", post.id);
      if (!cancel) setCommentsCount(count ?? 0);
      if (userId) {
        const { data: l } = await supabase.from("surgery_likes")
          .select("id").eq("post_id", post.id).eq("user_id", userId).maybeSingle();
        const { data: s } = await supabase.from("surgery_saves")
          .select("id").eq("post_id", post.id).eq("user_id", userId).maybeSingle();
        if (!cancel) { setLiked(!!l); setSaved(!!s); }
      }
    })();
    return () => { cancel = true; };
  }, [post.id, userId]);

  async function toggleLike() {
    if (!userId) return;
    if (liked) {
      await supabase.from("surgery_likes").delete().eq("post_id", post.id).eq("user_id", userId);
      setLiked(false); setLikesCount((c) => Math.max(0, c - 1));
      onLikeChange(-1);
    } else {
      const { error } = await supabase.from("surgery_likes").insert({ post_id: post.id, user_id: userId });
      if (!error) { setLiked(true); setLikesCount((c) => c + 1); onLikeChange(1); }
    }
  }
  async function toggleSave() {
    if (!userId) return;
    if (saved) {
      await supabase.from("surgery_saves").delete().eq("post_id", post.id).eq("user_id", userId);
      setSaved(false);
    } else {
      const { error } = await supabase.from("surgery_saves").insert({ post_id: post.id, user_id: userId });
      if (!error) setSaved(true);
    }
  }

  const avatarBg = SKIN_BG[post.skin_type ?? ""] ?? CREAM;

  return (
    <article className="relative rounded-xl overflow-hidden"
      style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
      {/* Always-visible header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex shrink-0 items-center justify-center rounded-full"
              style={{ width: 30, height: 30, background: avatarBg, fontSize: 15 }}>
              {post.user_emoji}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {post.user_name && (
                  <div className="text-[12px] font-bold truncate" style={{ color: ESPRESSO }}>{post.user_name}</div>
                )}
                {post.user_is_derm && (
                  <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold"
                    style={{ background: "#F0EDF8", color: "#4A3580" }}>✓ Derm</span>
                )}
              </div>
              {post.user_skin_line && (
                <div className="text-[10px]" style={{ color: MUTED }}>{post.user_skin_line}</div>
              )}
            </div>
          </div>
          <span className="rounded-full px-2 py-1 text-[9px] font-bold shrink-0"
            style={{ background: CREAM, color: ESPRESSO }}>
            {post.surgery_name}
          </span>
        </div>

        {/* Always-visible meta grid */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <MetaCell label="Clinic" value={post.clinic_name || "—"} />
          <MetaCell label="Country / City" value={[post.country, post.city].filter(Boolean).join(" · ") || "—"} />
          <MetaCell label="Total cost" value={post.total_cost || "—"} />
          <MetaCell label="Recovery time" value={post.recovery_time || "—"} />
        </div>
      </div>

      {/* Gated zone */}
      <div className="relative">
        <div style={{
          filter: locked ? "blur(2.5px)" : "none",
          opacity: locked ? 0.55 : 1,
          pointerEvents: locked ? "none" : "auto",
        }}>
          <div className="px-4 pb-3">
            {post.pain_level != null && (
              <div className="rounded-lg p-3 mb-2" style={{ background: CREAM }}>
                <PainBar level={post.pain_level} />
              </div>
            )}

            {post.photos.length > 0 && (
              <div className="mb-2">
                <div className="text-[7px] font-bold uppercase tracking-wider mb-1.5" style={{ color: MUTED }}>
                  Recovery timeline
                </div>
                <div className="flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {post.photos.map((p, i) => (
                    <div key={i} className="shrink-0">
                      <div style={{
                        width: 58, height: 66, borderRadius: 6, border: `1px solid ${BORDER}`,
                        backgroundImage: `url(${p.url})`, backgroundSize: "cover", backgroundPosition: "center", background: p.url ? `url(${p.url}) center/cover` : CREAM,
                      }} />
                      <div className="mt-1 text-[8px] text-center" style={{ color: MUTED }}>{p.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <NarrativeField label="My thoughts vs Reality" value={post.my_thoughts_vs_reality || ""} />
              <NarrativeField label="Struggle" value={post.struggle || ""} />
              <NarrativeField label="What happened" value={post.what_happened || ""} />
              <NarrativeField label="Surprised me" value={post.surprised_me || ""} />
              <NarrativeField label="Works for" value={post.works_for || ""} />
              <NarrativeField label="Warn if" value={post.warn_if || ""} />
            </div>

            {post.hashtags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1">
                {post.hashtags.map((t, i) => (
                  <span key={i} className="text-[9px] font-medium" style={{ color: CRIMSON }}>{t}</span>
                ))}
              </div>
            )}

            {post.outcome && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[9px]" style={{ color: MUTED }}>Would you do it again?</span>
                <OutcomeBadge outcome={post.outcome} />
              </div>
            )}
          </div>
        </div>

        {/* Gate overlay */}
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="rounded-xl p-4 text-center"
              style={{ background: "#fff", border: `1px solid ${BORDER}`, maxWidth: 210 }}>
              <div className="mx-auto mb-2 flex items-center justify-center rounded-full"
                style={{ width: 32, height: 32, background: CREAM }}>
                <Lock size={14} color={ESPRESSO} />
              </div>
              <div className="text-[12px] font-bold mb-1" style={{ color: ESPRESSO, fontFamily: "'Playfair Display', serif" }}>
                The rest stays between us
              </div>
              <div className="text-[10px] mb-3" style={{ color: MUTED }}>
                Members read the full story — pain, photos, real thoughts vs reality, and the regrets.
              </div>
              <Link to="/signup" className="inline-block rounded-full px-3.5 py-1.5 text-[10px] font-bold"
                style={{ background: CRIMSON, color: "#fff" }}>
                Become a Member
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Action bar — always visible */}
      {!locked && (
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-3">
            <button onClick={toggleLike} className="flex items-center gap-1 text-[11px]"
              style={{ color: liked ? CRIMSON : ESPRESSO }}>
              <Heart size={14} fill={liked ? CRIMSON : "none"} /> {likesCount}
            </button>
            <button
              onClick={() => post.comments_open && setShowComments((v) => !v)}
              disabled={!post.comments_open}
              className="flex items-center gap-1 text-[11px]"
              style={{ color: post.comments_open ? ESPRESSO : MUTED, opacity: post.comments_open ? 1 : 0.5 }}
            >
              <MessageCircle size={14} /> {commentsCount}
            </button>
            <button onClick={toggleSave} className="flex items-center gap-1 text-[11px]"
              style={{ color: saved ? CRIMSON : ESPRESSO }}>
              <Bookmark size={14} fill={saved ? CRIMSON : "none"} /> {saved ? "Saved" : "Save"}
            </button>
          </div>
          <span className="rounded-full px-2 py-1 text-[9px] font-medium"
            style={{
              border: `1px solid ${post.comments_open ? ESPRESSO : BORDER}`,
              color: post.comments_open ? ESPRESSO : MUTED,
            }}>
            {post.comments_open ? "Comments open" : "Comments off"}
          </span>
        </div>
      )}

      {!locked && !post.comments_open && (
        <div className="px-4 pb-3 text-[10px] italic text-center" style={{ color: MUTED }}>
          Comments closed by poster
        </div>
      )}

      {!locked && showComments && post.comments_open && (
        <div className="px-4 pb-4">
          <CommentSection postId={post.id} userId={userId} />
        </div>
      )}
    </article>
  );
}

// ============= Engagement sections =============
function TodaysTea({ post }: { post: EnrichedPost | null }) {
  if (!post) return null;
  // Quoted text is the poster's own writing or there is no quote. A caption the
  // app generated must never appear inside quotation marks.
  const quote = post.my_thoughts_vs_reality || post.surprised_me || post.what_happened || "";
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-end justify-between">
        <h2 className="text-[16px]" style={{ fontFamily: "'Playfair Display', serif", color: ESPRESSO }}>
          ☕ Today's Tea
        </h2>
        {/* What this actually is: the most-liked post of the last 24 hours,
            worked out in the browser each time the page loads. Nothing
            "refreshes daily". */}
        <span className="text-[10px]" style={{ color: MUTED }}>most liked in the last 24 hours</span>
      </div>
      <div className="rounded-xl p-4" style={{ background: ESPRESSO }}>
        <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.7)" }}>
          {post.surgery_name}{post.city ? ` · ${post.city}` : ""}
        </div>
        {quote ? (
          <p className="mt-2 text-[14px] leading-snug" style={{ fontFamily: "'Playfair Display', serif", color: "#fff" }}>
            "{quote.length > 140 ? quote.slice(0, 140) + "…" : quote}"
          </p>
        ) : (
          <p className="mt-2 text-[12px]" style={{ color: "rgba(255,255,255,0.7)" }}>
            This post has no written story yet.
          </p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-full"
              style={{ width: 24, height: 24, background: SKIN_BG[post.skin_type ?? ""] ?? CREAM, fontSize: 12 }}>
              {post.user_emoji}
            </div>
            {post.user_name && <span className="text-[10px]" style={{ color: "#fff" }}>{post.user_name}</span>}
          </div>
          {/* Likes are a stored count. The comment count here was a literal 0
              that nothing counted, so it is gone. */}
          <div className="flex items-center gap-3 text-[10px]" style={{ color: "rgba(255,255,255,0.85)" }}>
            <span className="flex items-center gap-1"><Heart size={11} /> {post.likes_count}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function TopTea({ posts }: { posts: EnrichedPost[] }) {
  if (posts.length === 0) return null;
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-end justify-between">
        <h2 className="text-[16px]" style={{ fontFamily: "'Playfair Display', serif", color: ESPRESSO }}>
          🔥 Top Tea
        </h2>
        <span className="text-[10px]" style={{ color: MUTED }}>this week</span>
      </div>
      <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {posts.slice(0, 5).map((p, i) => (
          <div key={p.id} className="shrink-0 rounded-[10px] overflow-hidden"
            style={{ width: 138, border: `1px solid ${BORDER}`, background: "#fff" }}>
            <div style={{ height: 88, background: `linear-gradient(135deg, ${SKIN_BG[p.skin_type ?? ""] ?? CREAM}, ${CREAM})`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
              {p.user_emoji}
            </div>
            <div className="p-2">
              <div className="text-[8px] uppercase tracking-wider" style={{ color: MUTED }}>
                {p.surgery_name}
              </div>
              {/* The ellipsis belongs to text that was actually cut. An empty
                  post renders no excerpt rather than "—…". */}
              {(() => {
                const excerpt = p.my_thoughts_vs_reality || p.what_happened || "";
                if (!excerpt) return null;
                return (
                  <div className="mt-0.5 text-[11px] font-medium leading-snug" style={{ color: ESPRESSO }}>
                    {excerpt.length > 50 ? `${excerpt.slice(0, 50)}…` : excerpt}
                  </div>
                );
              })()}
              <div className="mt-2 flex items-center justify-between text-[10px]" style={{ color: MUTED }}>
                <span>🔥 {p.likes_count}</span>
                <span style={{ color: CRIMSON, fontWeight: 700 }}>#{i + 1}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MostControversial({ post }: { post: EnrichedPost | null }) {
  if (!post) return null;
  const quote = post.warn_if || post.my_thoughts_vs_reality || post.surprised_me || "";
  return (
    <section className="mb-5">
      <div className="mb-2">
        <h2 className="text-[16px]" style={{ fontFamily: "'Playfair Display', serif", color: ESPRESSO }}>
          ⚡ Most Controversial
        </h2>
      </div>
      <div className="rounded-[10px] p-3 flex gap-3 items-start"
        style={{ border: "1px solid #F7C1C1", background: "#fff" }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2 py-0.5 text-[9px] font-bold"
              style={{ background: "#FBF0F0", color: "#A32D2D" }}>
              Wouldn't · {post.likes_count} likes
            </span>
          </div>
          <div className="mt-1 text-[9px]" style={{ color: MUTED }}>
            {post.surgery_name}{post.city ? ` · ${post.city}` : ""}
          </div>
          {quote && (
            <p className="mt-1 text-[11px]" style={{ color: ESPRESSO }}>
              "{quote.length > 100 ? quote.slice(0, 100) + "…" : quote}"
            </p>
          )}
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center justify-center rounded-full"
            style={{ width: 28, height: 28, background: SKIN_BG[post.skin_type ?? ""] ?? CREAM, fontSize: 13 }}>
            {post.user_emoji}
          </div>
          <span className="text-[10px] font-bold" style={{ color: CRIMSON }}>
            <Heart size={10} className="inline" fill={CRIMSON} /> {post.likes_count}
          </span>
        </div>
      </div>
    </section>
  );
}


// ============= Disclaimer modal =============
function DisclaimerModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(28,10,0,0.5)" }}>
      <div className="rounded-2xl w-full max-w-sm p-5" style={{ background: "#fff" }}>
        <div className="text-[15px] font-bold" style={{ color: ESPRESSO, fontFamily: "'Playfair Display', serif" }}>
          Before you spill
        </div>
        <ul className="mt-3 space-y-2 text-[12px]" style={{ color: ESPRESSO }}>
          <li>• Everything shared here is your personal experience — not medical advice.</li>
          <li>• Skintea doesn't verify procedures, clinics, or outcomes.</li>
          <li>• Your story helps others make informed decisions. Keep it honest.</li>
        </ul>
        <div className="mt-5 flex flex-col gap-2">
          <button onClick={onConfirm} className="rounded-full py-2.5 text-[12px] font-bold"
            style={{ background: CRIMSON, color: "#fff" }}>
            I understand, continue
          </button>
          <button onClick={onCancel} className="rounded-full py-2 text-[12px]"
            style={{ background: "transparent", color: MUTED }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============= Composer (post form) =============
function Composer({ onClose, surgeries, userId, onCreated }: {
  onClose: () => void; surgeries: Surgery[]; userId: string; onCreated: () => void;
}) {
  const [form, setForm] = useState({
    surgery_id: surgeries[0]?.id ?? "",
    clinic_name: "", country: "", city: "", total_cost: "", recovery_time: "",
    pain_level: 5,
    my_thoughts_vs_reality: "", struggle: "", what_happened: "",
    surprised_me: "", works_for: "", warn_if: "",
    outcome: "Would do again" as PostRow["outcome"],
    skin_type: "Combination" as string,
    hashtags: "",
    comments_open: true,
  });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    setSubmitting(true); setError(null);
    const tags = form.hashtags
      .split(",").map((t) => t.trim()).filter(Boolean)
      .map((t) => (t.startsWith("#") ? t : `#${t}`));
    const validPhotos = photos.filter((p) => p.url.trim());
    const payload = {
      user_id: userId,
      surgery_id: form.surgery_id || null,
      clinic_name: form.clinic_name || null,
      country: form.country || null,
      city: form.city || null,
      total_cost: form.total_cost || null,
      recovery_time: form.recovery_time || null,
      pain_level: form.pain_level,
      my_thoughts_vs_reality: form.my_thoughts_vs_reality || null,
      struggle: form.struggle || null,
      what_happened: form.what_happened || null,
      surprised_me: form.surprised_me || null,
      works_for: form.works_for || null,
      warn_if: form.warn_if || null,
      outcome: form.outcome,
      skin_type: form.skin_type as any,
      hashtags: tags,
      photos: validPhotos as any,
      comments_open: form.comments_open,
    };
    const { error } = await supabase.from("surgery_posts").insert(payload);
    setSubmitting(false);
    if (error) { setError(error.message); return; }
    onCreated(); onClose();
  }

  const painLabel = painScaleLabel(form.pain_level);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: "rgba(28,10,0,0.5)" }}>
      <div className="w-full max-w-md rounded-t-2xl md:rounded-2xl max-h-[92vh] overflow-y-auto"
        style={{ background: "#fff" }}>
        <div className="sticky top-0 flex items-center justify-between px-4 py-3"
          style={{ background: "#fff", borderBottom: `1px solid ${BORDER}` }}>
          <div className="text-[15px] font-bold" style={{ fontFamily: "'Playfair Display', serif", color: ESPRESSO }}>
            Spill it
          </div>
          <button onClick={onClose}><X size={18} color={ESPRESSO} /></button>
        </div>
        <div className="p-4 space-y-3 text-[12px]" style={{ color: ESPRESSO }}>
          <Field label="Surgery type">
            <select value={form.surgery_id} onChange={(e) => update("surgery_id", e.target.value)}
              className="w-full rounded-md px-2 py-2" style={{ border: `1px solid ${BORDER}` }}>
              {surgeries.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Clinic name">
            <input value={form.clinic_name} onChange={(e) => update("clinic_name", e.target.value)}
              className="w-full rounded-md px-2 py-2" style={{ border: `1px solid ${BORDER}` }} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Country"><input value={form.country} onChange={(e) => update("country", e.target.value)} className="w-full rounded-md px-2 py-2" style={{ border: `1px solid ${BORDER}` }} /></Field>
            <Field label="City"><input value={form.city} onChange={(e) => update("city", e.target.value)} className="w-full rounded-md px-2 py-2" style={{ border: `1px solid ${BORDER}` }} /></Field>
          </div>
          <Field label="Total cost (e.g. $8,500 incl. travel)">
            <input value={form.total_cost} onChange={(e) => update("total_cost", e.target.value)} className="w-full rounded-md px-2 py-2" style={{ border: `1px solid ${BORDER}` }} />
          </Field>
          <Field label="Recovery time">
            <input value={form.recovery_time} onChange={(e) => update("recovery_time", e.target.value)} className="w-full rounded-md px-2 py-2" style={{ border: `1px solid ${BORDER}` }} />
          </Field>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: MUTED }}>Pain level: {form.pain_level}/10 — {painLabel}</div>
            <PainBar level={form.pain_level} />
            <input type="range" min={1} max={10} value={form.pain_level}
              onChange={(e) => update("pain_level", Number(e.target.value))}
              className="w-full mt-2" />
          </div>

          {(["my_thoughts_vs_reality","struggle","what_happened","surprised_me","works_for","warn_if"] as const).map((k) => (
            <Field key={k} label={k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}>
              <textarea value={form[k] as string} onChange={(e) => update(k, e.target.value as any)}
                rows={2} className="w-full rounded-md px-2 py-2" style={{ border: `1px solid ${BORDER}` }} />
            </Field>
          ))}

          <Field label="Outcome">
            <div className="grid grid-cols-3 gap-2">
              {(["Would do again","Modified","Wouldn't"] as const).map((o) => (
                <button key={o} onClick={() => update("outcome", o)}
                  className="rounded-md py-1.5 text-[10px] font-semibold"
                  style={{
                    background: form.outcome === o ? ESPRESSO : "#fff",
                    color: form.outcome === o ? "#fff" : ESPRESSO,
                    border: `1px solid ${form.outcome === o ? ESPRESSO : BORDER}`,
                  }}>{o}</button>
              ))}
            </div>
          </Field>

          <Field label="Skin type">
            <div className="flex flex-wrap gap-1.5">
              {["Oily","Dry","Combination","Sensitive","Normal"].map((s) => (
                <button key={s} onClick={() => update("skin_type", s)}
                  className="rounded-full px-3 py-1 text-[11px]"
                  style={{
                    background: form.skin_type === s ? ESPRESSO : "#fff",
                    color: form.skin_type === s ? "#fff" : ESPRESSO,
                    border: `1px solid ${form.skin_type === s ? ESPRESSO : BORDER}`,
                  }}>{s}</button>
              ))}
            </div>
          </Field>

          <Field label="Hashtags (comma separated)">
            <input value={form.hashtags} onChange={(e) => update("hashtags", e.target.value)}
              placeholder="rhinoplasty, korea, worthit"
              className="w-full rounded-md px-2 py-2" style={{ border: `1px solid ${BORDER}` }} />
          </Field>

          <Field label="Photos (URL + label, optional, up to 6)">
            <div className="space-y-2">
              {photos.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input value={p.url} placeholder="https://…"
                    onChange={(e) => setPhotos((arr) => arr.map((x, j) => j === i ? { ...x, url: e.target.value } : x))}
                    className="flex-1 rounded-md px-2 py-1.5" style={{ border: `1px solid ${BORDER}` }} />
                  <input value={p.label} placeholder="Label"
                    onChange={(e) => setPhotos((arr) => arr.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                    className="w-24 rounded-md px-2 py-1.5" style={{ border: `1px solid ${BORDER}` }} />
                  <button onClick={() => setPhotos((arr) => arr.filter((_, j) => j !== i))}
                    className="px-2" style={{ color: MUTED }}><X size={14} /></button>
                </div>
              ))}
              {photos.length < 6 && (
                <button onClick={() => setPhotos((arr) => [...arr, { url: "", label: "" }])}
                  className="w-full rounded-md py-1.5 text-[11px]"
                  style={{ border: `1px dashed ${BORDER}`, color: MUTED }}>
                  + Add photo
                </button>
              )}
            </div>
          </Field>

          <label className="flex items-center justify-between rounded-md px-3 py-2"
            style={{ background: CREAM }}>
            <span className="text-[12px]">Let others comment on your post</span>
            <input type="checkbox" checked={form.comments_open}
              onChange={(e) => update("comments_open", e.target.checked)} />
          </label>

          {error && <div className="text-[11px]" style={{ color: CRIMSON }}>{error}</div>}

          <button onClick={submit} disabled={submitting}
            className="w-full rounded-full py-3 text-[13px] font-bold"
            style={{ background: CRIMSON, color: "#fff", opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "Spilling…" : "Spill it ✦"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>
        {label}
      </div>
      {children}
    </label>
  );
}

// ============= Main page =============
export function SurgeryTalkContent({ embedded = false }: { embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const userId = useSession();
  const { surgeries, loading: surgeriesLoading, failed: surgeriesFailed } = useSurgeries();
  const { posts, loading: postsLoading, reload, updatePost } = usePosts(surgeries);
  const [chip, setChip] = useState<string>("All");
  const [skin, setSkin] = useState<string>("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [rankCounts, setRankCounts] = useState<Map<string, number>>(new Map());

  // load 24h ranking
  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("surgery_posts")
        .select("surgery_id")
        .gte("created_at", since);
      if (!data) return;
      const m = new Map<string, number>();
      for (const r of data) {
        if (!r.surgery_id) continue;
        m.set(r.surgery_id, (m.get(r.surgery_id) ?? 0) + 1);
      }
      setRankCounts(m);
    })();
  }, []);

  // Build ranked surgery chips
  const surgeryChips = useMemo(() => {
    const sorted = [...surgeries].sort((a, b) => (rankCounts.get(b.id) ?? 0) - (rankCounts.get(a.id) ?? 0));
    return [{ id: "All", label: "All", count: 0 }, ...sorted.map((s) => ({
      id: s.name, label: s.name, count: rankCounts.get(s.id) ?? 0,
    }))];
  }, [surgeries, rankCounts]);

  const filtered = useMemo(() => {
    return posts
      .filter((p) => chip === "All" ? true : p.surgery_name === chip)
      .filter((p) => skin === "all" ? true : p.skin_type === skin);
  }, [posts, chip, skin]);

  /* Every ranking below is gated on MIN_RANKED_POSTS. Under the floor the
     sections render nothing at all — the components stay, so they come back on
     their own once there are enough posts to rank. */
  const rankingReady = posts.length >= MIN_RANKED_POSTS;

  const todaysTea = useMemo(() => {
    if (!rankingReady) return null;
    const since = Date.now() - 24 * 60 * 60 * 1000;
    // No fallback to "any post": if nothing was posted in the last 24 hours
    // there is no post of the day.
    return [...posts]
      .filter((p) => new Date(p.created_at).getTime() >= since)
      .sort((a, b) => b.likes_count - a.likes_count)[0] ?? null;
  }, [posts, rankingReady]);

  const topTea = useMemo(() => {
    if (!rankingReady) return [];
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return [...posts]
      .filter((p) => new Date(p.created_at).getTime() >= since)
      .sort((a, b) => b.likes_count - a.likes_count)
      .slice(0, 5);
  }, [posts, rankingReady]);

  const controversial = useMemo(() => {
    if (!rankingReady) return null;
    return [...posts].filter((p) => p.outcome === "Wouldn't").sort((a, b) => b.likes_count - a.likes_count)[0] ?? null;
  }, [posts, rankingReady]);


  function handleSpillClick() {
    setDisclaimerOpen(true);
  }
  function handleDisclaimerConfirm() {
    setDisclaimerOpen(false);
    if (!userId) {
      navigate({ to: "/signup" });
    } else {
      setComposerOpen(true);
    }
  }

  /* Medals are a ranking too, so they wait for MIN_RANKED_POSTS with the rest.
     Under the floor the chips are plain filters. */
  function renderSurgeryChip(item: { id: string; label: string }, isActive: boolean) {
    const count = surgeryChips.find((c) => c.id === item.id)?.count ?? 0;
    const idx = surgeryChips.findIndex((c) => c.id === item.id);
    let prefix = "";
    let style: React.CSSProperties = {
      backgroundColor: isActive ? ESPRESSO : "#fff",
      color: isActive ? "#fff" : ESPRESSO,
      border: `1px solid ${isActive ? ESPRESSO : BORDER}`,
    };
    let suffix = "";
    if (rankingReady && item.id !== "All" && count > 0) {
      if (idx === 1) {
        prefix = "🥇 "; suffix = " 🔥";
        if (!isActive) style = { backgroundColor: "#FFFBEE", color: ESPRESSO, border: "1px solid #D4A800" };
      } else if (idx === 2) prefix = "🥈 ";
      else if (idx === 3) prefix = "🥉 ";
    }
    return (
      <span className="rounded-full px-3 py-1.5 text-[11px] font-medium"
        style={{ ...style, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", display: "inline-block" }}>
        {prefix}{item.label}{suffix}
      </span>
    );
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* pb clears the floating button: 72px offset + ~40px button on mobile,
          less on desktop where BottomNav (md:hidden) is not there. */}
      <div className="min-h-screen overflow-x-hidden pb-[132px] md:pb-24"
        style={{ background: CREAM, fontFamily: "'DM Sans', sans-serif", maxWidth: "100vw" }}>

        {/* Header. Sits under the /tea header when embedded there — that header
            publishes its height as --tea-header-h and takes the higher z-index;
            standalone, the fallback of 0px keeps it at the top. */}
        <header className="sticky z-30"
          style={{ background: WARM_WHITE, borderBottom: `1px solid ${BORDER}`, top: "var(--tea-header-h, 0px)" }}>
          {/* Surgery filter. Only called "ranked" while there is enough to rank. */}
          <div className="px-4 pt-2">
            <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
              {rankingReady ? "Surgery · ranked by today's posts" : "Surgery"}
            </div>
          </div>
          {surgeriesLoading ? (
            <ChipSkeleton />
          ) : surgeriesFailed ? (
            <div className="px-4 py-2 text-[10px]" style={{ color: CRIMSON }}>
              Couldn't load the surgery filter. Reload to try again.
            </div>
          ) : surgeries.length > 0 ? (
            <ChipScroll
              items={surgeryChips.map((c) => ({ id: c.id, label: c.label }))}
              active={chip} onChange={setChip}
              renderChip={renderSurgeryChip}
            />
          ) : null}

          {/* Skin filter */}
          <ChipScroll items={SKIN_TYPES} active={skin} onChange={setSkin} />
        </header>

        <main className="mx-auto max-w-2xl px-4 pt-4">
          <TodaysTea post={todaysTea} />
          {topTea.length > 0 && <TopTea posts={topTea} />}
          <MostControversial post={controversial} />

          {/* Heading and count wait for rows: a title over a skeleton, or over
              "no stories yet", describes nothing. The count is the plain number
              of posts on screen. */}
          {!postsLoading && filtered.length > 0 && (
            <div className="mb-3 flex items-end justify-between">
              <h1 className="text-[18px]" style={{ fontFamily: "'Playfair Display', serif", color: ESPRESSO }}>
                All Spills
              </h1>
              <span className="text-[11px]" style={{ color: MUTED }}>
                {filtered.length} {filtered.length === 1 ? "tea" : "teas"}
              </span>
            </div>
          )}

          <div className="space-y-4">
            {postsLoading ? (
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl p-4 animate-pulse"
                    style={{ background: "#fff", border: `1px solid ${BORDER}`, height: 220 }}>
                    <div style={{ width: "40%", height: 12, background: "#EEE6DC", borderRadius: 4 }} />
                    <div className="mt-3" style={{ width: "100%", height: 80, background: "#F5EFE7", borderRadius: 8 }} />
                    <div className="mt-3" style={{ width: "80%", height: 10, background: "#EEE6DC", borderRadius: 4 }} />
                  </div>
                ))}
              </>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl p-6 text-center text-[12px]"
                style={{ background: "#fff", border: `1px solid ${BORDER}`, color: MUTED }}>
                {posts.length === 0
                  ? "No surgery stories yet — be the first to share."
                  : "No stories match these filters."}
              </div>
            ) : (
              /* No paywall: there is no paid tier, and the old rule locked every
                 post after the first for everyone, signed in or not. PostCard
                 keeps its `locked` prop and gate overlay for a membership tier
                 that may exist later; nothing sets it today. */
              filtered.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  locked={false}
                  userId={userId}
                  onLikeChange={(delta) => updatePost(p.id, { likes_count: Math.max(0, p.likes_count + delta) })}
                />
              ))
            )}
          </div>
        </main>

        {!embedded && <BottomNav />}

        {disclaimerOpen && (
          <DisclaimerModal onCancel={() => setDisclaimerOpen(false)} onConfirm={handleDisclaimerConfirm} />
        )}
        {composerOpen && userId && (
          <Composer onClose={() => setComposerOpen(false)} surgeries={surgeries} userId={userId} onCreated={reload} />
        )}

        <button
          onClick={handleSpillClick}
          className="fixed bottom-[72px] md:bottom-6"
          style={{
            left: "50%",
            transform: "translateX(-50%)",
            background: "#A8001C",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 99,
            padding: "12px 28px",
            border: "none",
            zIndex: 40,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Spill the tea ☕
        </button>
      </div>
    </>
  );
}

function SurgeryTalkPage() {
  return <SurgeryTalkContent />;
}
