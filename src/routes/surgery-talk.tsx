import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Lock, Bell, Home, User as UserIcon, Compass, X, Heart, MessageCircle, Bookmark, Send,
} from "lucide-react";

export const Route = createFileRoute("/surgery-talk")({
  head: () => ({
    meta: [
      { title: "Surgery Talk — Skintea" },
      { name: "description", content: "Real surgery stories from real people. Pain, recovery, cost, and what they wish they knew." },
      { property: "og:title", content: "Surgery Talk — Skintea" },
      { property: "og:description", content: "Real surgery stories from real people. Pain, recovery, cost, and what they wish they knew." },
    ],
  }),
  component: SurgeryTalkPage,
});

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const CREAM = "#FAF7F2";
const WARM_WHITE = "#FFFCF8";
const BORDER = "#E8E0D8";
const MUTED = "#8A7E76";

const FALLBACK_SURGERIES = [
  "Rhinoplasty (Nose Job)", "Upper Blepharoplasty", "Lower Blepharoplasty", "Double Eyelid Surgery",
  "Facelift", "Mini Facelift", "Fat Grafting", "Buccal Fat Removal", "Chin Implant", "Jaw Reduction",
  "Forehead Reduction", "Hairline Lowering", "Ear Pinning", "BBL", "Liposuction", "Abdominoplasty",
  "Breast Augmentation", "Breast Lift",
];

type Surgery = { id: string; name: string };

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
  user_name: string;
  user_emoji: string;
  user_member_line: string;
  user_is_derm: boolean;
};

// ---------------- Demo / fallback posts ----------------
const DEMO_POSTS: EnrichedPost[] = [
  {
    id: "demo-1",
    user_id: "demo",
    surgery_id: null,
    surgery_name: "Rhinoplasty (Nose Job)",
    clinic_name: "Banobagi",
    country: "South Korea",
    city: "Seoul",
    total_cost: "$8,500 incl. travel",
    recovery_time: "3 weeks visible, 6 mo final",
    pain_level: 6,
    my_thoughts_vs_reality:
      "I expected to look like a swollen pumpkin for a week. Reality: I looked like a pumpkin for THREE weeks and the tip was numb for two months.",
    struggle: "Sleeping upright. The cast itching. Eating without smelling food.",
    what_happened: "Closed rhinoplasty, dorsal hump shaved, tip refined. Cast off day 7. Bruising mostly gone by day 10.",
    surprised_me: "How much my voice sounded different for 2 weeks. Nobody warned me about that.",
    works_for: "People with a small dorsal hump and a slightly bulbous tip who want a refined-natural result, not a dramatic change.",
    warn_if: "You have a busy social life. Hide for 3 weeks minimum. Don't book a wedding for 6 months out.",
    outcome: "Would do again",
    hashtags: ["#rhinoplasty", "#korea", "#worthit", "#closedrhino"],
    skin_type: "Combination",
    photos: [],
    comments_open: true,
    likes_count: 412,
    created_at: new Date().toISOString(),
    user_name: "Glazed Donut",
    user_emoji: "🍩",
    user_member_line: "combo skin · member",
    user_is_derm: false,
  },
  {
    id: "demo-2",
    user_id: "demo",
    surgery_id: null,
    surgery_name: "Buccal Fat Removal",
    clinic_name: "Dr. M's clinic",
    country: "USA",
    city: "Los Angeles",
    total_cost: "$4,200",
    recovery_time: "2 weeks swelling",
    pain_level: 3,
    my_thoughts_vs_reality:
      "I thought I'd snatched. Reality at year 3: face looks gaunt and older. Photos lie.",
    struggle: "The 6-month plateau where you can't tell if it worked.",
    what_happened: "20 min in-office. Local anesthesia. Two small incisions inside the mouth.",
    surprised_me: "How much volume you keep losing as you age. This is permanent.",
    works_for: "People under 25 with very chubby cheeks and good underlying bone structure.",
    warn_if: "You're over 30. You will regret it by 40.",
    outcome: "Wouldn't",
    hashtags: ["#buccalfat", "#regret", "#thinkbeforeyoucut"],
    skin_type: "Oily",
    photos: [],
    comments_open: false,
    likes_count: 287,
    created_at: new Date().toISOString(),
    user_name: "Hindsight",
    user_emoji: "🪞",
    user_member_line: "oily skin · member",
    user_is_derm: false,
  },
  {
    id: "demo-3",
    user_id: "demo",
    surgery_id: null,
    surgery_name: "Upper Blepharoplasty",
    clinic_name: "Dr. Park",
    country: "South Korea",
    city: "Seoul",
    total_cost: "$2,100",
    recovery_time: "10 days",
    pain_level: 2,
    my_thoughts_vs_reality: "Thought it'd be obvious. Reality: people just say I look rested.",
    struggle: "Stitches itching. Watery eyes for a week.",
    what_happened: "Upper lid skin removal. Local anesthesia. 30 min.",
    surprised_me: "How quick the recovery was. I was back at work in 10 days with concealer.",
    works_for: "Hooded eyelids that block your lash line.",
    warn_if: "You have very dry eyes already.",
    outcome: "Would do again",
    hashtags: ["#blepharoplasty", "#eyelid", "#subtle"],
    skin_type: "Dry",
    photos: [],
    comments_open: true,
    likes_count: 198,
    created_at: new Date().toISOString(),
    user_name: "Bright Eyes",
    user_emoji: "🏜️",
    user_member_line: "dry skin · member",
    user_is_derm: false,
  },
];

// ============= Hooks =============
function useSurgeries() {
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [loading, setLoading] = useState(true);
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
        if (error || !data || data.length === 0) {
          setSurgeries(FALLBACK_SURGERIES.map((n) => ({ id: n, name: n })));
        } else {
          setSurgeries(data as Surgery[]);
        }
      } catch {
        if (!cancelled) setSurgeries(FALLBACK_SURGERIES.map((n) => ({ id: n, name: n })));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return { surgeries, loading };
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
  const [usingDemo, setUsingDemo] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("surgery_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error || !data || data.length === 0) {
        setPosts(DEMO_POSTS);
        setUsingDemo(true);
      } else {
        const surgMap = new Map(surgeries.map((s) => [s.id, s.name]));
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
            user_name: prof?.name || "Anonymous",
            user_emoji: SKIN_EMOJI[skin] || "🫧",
            user_member_line: `${skin ? skin.toLowerCase() + " skin · " : ""}member`,
            user_is_derm: prof?.is_derm ?? false,
          };
        });
        setPosts(enriched);
        setUsingDemo(false);
      }
    } catch {
      setPosts(DEMO_POSTS);
      setUsingDemo(true);
    } finally {
      setLoading(false);
    }
  }, [surgeries]);

  useEffect(() => { reload(); }, [reload]);
  return { posts, loading, usingDemo, reload };
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

function painDescriptor(level: number): { label: string; descriptor: string } {
  if (level <= 2) return { label: "None", descriptor: "barely felt anything" };
  if (level <= 4) return { label: "Mild", descriptor: "easier than a blood draw" };
  if (level <= 6) return { label: "Moderate", descriptor: "worse than a blood draw, manageable with meds" };
  if (level <= 8) return { label: "Moderate-High", descriptor: "needed prescription painkillers" };
  return { label: "Severe", descriptor: "the worst pain I've felt" };
}

function PainBar({ level }: { level: number }) {
  const pct = (level / 10) * 100;
  const { label, descriptor } = painDescriptor(level);
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
        {/* reference marker at 40% (blood draw) */}
        <div className="absolute" style={{ left: "40%", top: 0, transform: "translateX(-50%)" }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: "#999", margin: "0 auto" }} />
          <div style={{ width: 1, height: 12, background: "#999", margin: "0 auto" }} />
        </div>
        {/* user dot */}
        <div className="absolute"
          style={{
            left: `${pct}%`, top: 4, transform: "translateX(-50%)",
            width: 14, height: 14, borderRadius: 7, background: CRIMSON,
            border: "2px solid #fff", boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
          }}
        />
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[11px] font-bold" style={{ color: ESPRESSO }}>{label}</span>
        <span className="text-[10px]" style={{ color: MUTED }}>— {descriptor}</span>
      </div>
      <div className="mt-1 flex justify-between text-[8px]" style={{ color: MUTED }}>
        <span>None</span><span>Mild</span><span>Moderate</span><span>Severe</span>
      </div>
      <div className="mt-1 text-[8px]" style={{ color: MUTED, textAlign: "center" }}>
        ◆ standard reference: blood draw
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
type CommentRow = { id: string; user_id: string; content: string; created_at: string; user_name?: string };

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
    setComments(data.map((c) => ({ ...c, user_name: map.get(c.user_id) || "Anon" })));
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
              <div className="text-[9px] font-bold" style={{ color: ESPRESSO }}>{c.user_name}</div>
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
function PostCard({ post, locked, userId, onChange }: { post: EnrichedPost; locked: boolean; userId: string | null; onChange: () => void }) {
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
    if (!userId || post.user_id === "demo") return;
    if (liked) {
      await supabase.from("surgery_likes").delete().eq("post_id", post.id).eq("user_id", userId);
      setLiked(false); setLikesCount((c) => Math.max(0, c - 1));
    } else {
      const { error } = await supabase.from("surgery_likes").insert({ post_id: post.id, user_id: userId });
      if (!error) { setLiked(true); setLikesCount((c) => c + 1); }
    }
    onChange();
  }
  async function toggleSave() {
    if (!userId || post.user_id === "demo") return;
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
                <div className="text-[12px] font-bold truncate" style={{ color: ESPRESSO }}>{post.user_name}</div>
                {post.user_is_derm && (
                  <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold"
                    style={{ background: "#F0EDF8", color: "#4A3580" }}>✓ Derm</span>
                )}
              </div>
              <div className="text-[10px]" style={{ color: MUTED }}>{post.user_member_line}</div>
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
  const quote = post.my_thoughts_vs_reality || post.surprised_me || post.what_happened || "Read the full spill →";
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-end justify-between">
        <h2 className="text-[16px]" style={{ fontFamily: "'Playfair Display', serif", color: ESPRESSO }}>
          ☕ Today's Tea
        </h2>
        <span className="text-[10px]" style={{ color: MUTED }}>refreshes daily</span>
      </div>
      <div className="rounded-xl p-4" style={{ background: ESPRESSO }}>
        <span className="inline-block rounded-full px-2 py-0.5 text-[9px] font-bold"
          style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}>
          🔥 Featured spill
        </span>
        <div className="mt-2 text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.7)" }}>
          {post.surgery_name} · {post.city || "—"}
        </div>
        <p className="mt-2 text-[14px] leading-snug" style={{ fontFamily: "'Playfair Display', serif", color: "#fff" }}>
          "{quote.length > 140 ? quote.slice(0, 140) + "…" : quote}"
        </p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-full"
              style={{ width: 24, height: 24, background: SKIN_BG[post.skin_type ?? ""] ?? CREAM, fontSize: 12 }}>
              {post.user_emoji}
            </div>
            <span className="text-[10px]" style={{ color: "#fff" }}>{post.user_name}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px]" style={{ color: "rgba(255,255,255,0.85)" }}>
            <span className="flex items-center gap-1"><Heart size={11} /> {post.likes_count}</span>
            <span className="flex items-center gap-1"><MessageCircle size={11} /> 0</span>
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
              <div className="mt-0.5 text-[11px] font-medium leading-snug" style={{ color: ESPRESSO }}>
                {(p.my_thoughts_vs_reality || p.what_happened || "—").slice(0, 50)}…
              </div>
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
  const quote = post.warn_if || post.my_thoughts_vs_reality || post.surprised_me || "—";
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
            {post.surgery_name} · {post.city || "—"}
          </div>
          <p className="mt-1 text-[11px]" style={{ color: ESPRESSO }}>
            "{quote.length > 100 ? quote.slice(0, 100) + "…" : quote}"
          </p>
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

function TrendingPill({ name, multiplier }: { name: string; multiplier: number }) {
  return (
    <div className="mb-5">
      <span className="inline-block rounded-full text-[10px] font-medium"
        style={{ background: "#FFF3CD", border: "1px solid #FAC775", color: ESPRESSO, padding: "6px 12px" }}>
        📈 Trending this week: {name} — {multiplier}× more posts than usual
      </span>
    </div>
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

  const painInfo = painDescriptor(form.pain_level);

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
            <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: MUTED }}>Pain level: {form.pain_level}/10 — {painInfo.label}</div>
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
function SurgeryTalkPage() {
  const navigate = useNavigate();
  const userId = useSession();
  const { surgeries, loading: surgeriesLoading } = useSurgeries();
  const { posts, reload } = usePosts(surgeries);
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

  const todaysTea = useMemo(() => {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    return [...posts]
      .filter((p) => new Date(p.created_at).getTime() >= since)
      .sort((a, b) => b.likes_count - a.likes_count)[0]
      ?? posts[0] ?? null;
  }, [posts]);

  const topTea = useMemo(() => {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return [...posts]
      .filter((p) => new Date(p.created_at).getTime() >= since)
      .sort((a, b) => b.likes_count - a.likes_count)
      .slice(0, 5);
  }, [posts]);

  const controversial = useMemo(() => {
    return [...posts].filter((p) => p.outcome === "Wouldn't").sort((a, b) => b.likes_count - a.likes_count)[0] ?? null;
  }, [posts]);

  const trendingName = useMemo(() => {
    if (rankCounts.size === 0) return null;
    let best: { id: string; n: number } | null = null;
    for (const [id, n] of rankCounts) {
      if (!best || n > best.n) best = { id, n };
    }
    if (!best) return null;
    const surg = surgeries.find((s) => s.id === best!.id);
    return surg ? { name: surg.name, multiplier: 3 } : null;
  }, [rankCounts, surgeries]);

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
    if (item.id !== "All" && count > 0) {
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

      <div className="min-h-screen overflow-x-hidden pb-24"
        style={{ background: CREAM, fontFamily: "'DM Sans', sans-serif", maxWidth: "100vw" }}>

        {/* Header */}
        <header className="sticky top-0 z-30"
          style={{ background: WARM_WHITE, borderBottom: `1px solid ${BORDER}` }}>
          <div className="mx-auto max-w-2xl px-4 pt-3 pb-2">
            <div className="text-[22px] leading-none"
              style={{ fontFamily: "'Playfair Display', serif", color: ESPRESSO }}>
              skintea
            </div>
            <div className="mt-0.5 text-[11px] italic" style={{ color: MUTED }}>
              Got the skintea? Spill it.
            </div>
            <div className="mt-2 flex w-full items-stretch">
              {[
                { to: "/tea-products", l: "Product Talk", active: false },
                { to: "/treatment-talk2", l: "Treatment Talk", active: false },
                { to: "/surgery-talk", l: "Surgery Talk", active: true },
              ].map((t) => (
                <Link key={t.to} to={t.to} className="pb-1.5 pt-1"
                  style={{
                    flex: 1, textAlign: "center", fontSize: 11, whiteSpace: "nowrap",
                    color: t.active ? ESPRESSO : MUTED,
                    fontWeight: t.active ? 500 : 400,
                    borderBottom: `2px solid ${t.active ? CRIMSON : "transparent"}`,
                  }}>
                  {t.l}
                </Link>
              ))}
            </div>
          </div>

          {/* Surgery filter */}
          <div className="px-4 pt-2">
            <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
              Surgery · ranked by today's posts
            </div>
          </div>
          {surgeriesLoading ? (
            <ChipSkeleton />
          ) : (
            <ChipScroll
              items={surgeryChips.map((c) => ({ id: c.id, label: c.label }))}
              active={chip} onChange={setChip}
              renderChip={renderSurgeryChip}
            />
          )}
          <div className="px-4 pb-1 text-[9px]" style={{ color: MUTED }}>
            ↻ Updates daily at midnight
          </div>

          {/* Skin filter */}
          <ChipScroll items={SKIN_TYPES} active={skin} onChange={setSkin} />
        </header>

        <main className="mx-auto max-w-2xl px-4 pt-4">
          <TodaysTea post={todaysTea} />
          {topTea.length > 0 && <TopTea posts={topTea} />}
          <MostControversial post={controversial} />
          {trendingName && <TrendingPill name={trendingName.name} multiplier={trendingName.multiplier} />}

          <div className="mb-3 flex items-end justify-between">
            <h1 className="text-[18px]" style={{ fontFamily: "'Playfair Display', serif", color: ESPRESSO }}>
              All Spills
            </h1>
            <span className="text-[11px]" style={{ color: MUTED }}>
              {filtered.length.toLocaleString()} teas
            </span>
          </div>

          <div className="space-y-4">
            {filtered.length === 0 && (
              <div className="rounded-xl p-6 text-center text-[12px]"
                style={{ background: "#fff", border: `1px solid ${BORDER}`, color: MUTED }}>
                No spills match those filters yet.
              </div>
            )}
            {filtered.map((p, i) => (
              <PostCard key={p.id} post={p} locked={i >= 1} userId={userId} onChange={reload} />
            ))}
          </div>
        </main>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-40"
          style={{ background: WARM_WHITE, borderTop: `1px solid ${BORDER}` }}>
          <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2">
            <Link to="/" className="flex flex-col items-center" style={{ color: MUTED }}>
              <Home size={20} /><span className="text-[9px] mt-0.5">Home</span>
            </Link>
            <button className="flex flex-col items-center" style={{ color: MUTED }}>
              <Compass size={20} /><span className="text-[9px] mt-0.5">Explore</span>
            </button>
            <button onClick={handleSpillClick}
              className="rounded-full px-4 py-2.5 text-[12px] font-bold shadow-lg"
              style={{ background: CRIMSON, color: "#fff", marginTop: -16 }}>
              Spill it all ✦
            </button>
            <button className="flex flex-col items-center" style={{ color: MUTED }}>
              <Bell size={20} /><span className="text-[9px] mt-0.5">Alerts</span>
            </button>
            <button className="flex flex-col items-center" style={{ color: MUTED }}>
              <UserIcon size={20} /><span className="text-[9px] mt-0.5">Profile</span>
            </button>
          </div>
        </nav>

        {disclaimerOpen && (
          <DisclaimerModal onCancel={() => setDisclaimerOpen(false)} onConfirm={handleDisclaimerConfirm} />
        )}
        {composerOpen && userId && (
          <Composer onClose={() => setComposerOpen(false)} surgeries={surgeries} userId={userId} onCreated={reload} />
        )}
      </div>
    </>
  );
}
