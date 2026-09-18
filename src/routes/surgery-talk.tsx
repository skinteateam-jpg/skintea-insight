import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Lock, X, Send } from "lucide-react";
import TalkPostCard, {
  BORDER, CAPTION, CARD_BORDER, CRIMSON, DISPLAY, ESPRESSO, NEUTRAL_FILL, SANS, WARM_WHITE,
  TalkPhotoCarousel, TalkReceipt, receiptCells,
} from "@/components/TalkPostCard";
import TalkVoteBlock from "@/components/TalkVoteBlock";
import { emptySplit, usePostVotes, type VoteSplit, type VoteValue } from "@/lib/postVotes";

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

/* Colour, type and spacing come from the shared card so the three Talks cannot drift apart. */
const CREAM = WARM_WHITE;
const MUTED = CAPTION;

const SECTION_LABEL = {
  fontSize: 11, fontWeight: 500, letterSpacing: "0.08em",
  textTransform: "uppercase" as const, color: MUTED,
};

/* The surgery filter is whatever `surgeries` holds. There is no hard-coded list
   standing in for it: a substituted list offers filters that match nothing and
   hides the fact that the query failed. */

type Surgery = { id: string; name: string };

/* Ranking needs a population to rank. Below this many posts, every ranking
   surface stays hidden — rank numbers, "Top Tea", "Most Controversial"
   and the day's pick — because #1 of three posts is not a ranking. Raise or
   lower it in one place; the whole ranking UI follows. */
const MIN_RANKED_POSTS = 25;

/* Skin types are words, not emoji: no emoji renders anywhere in the UI. */
const SKIN_TYPES = [
  { id: "all", label: "All" },
  { id: "Oily", label: "Oily" },
  { id: "Dry", label: "Dry" },
  { id: "Sensitive", label: "Sensitive" },
  { id: "Combination", label: "Combo" },
  { id: "Normal", label: "Normal" },
];

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

/* "Wouldn't" is the only negative outcome, so it is the only one that stamps in crimson. */
const NEGATIVE_OUTCOMES = new Set<string>(["Wouldn't"]);

type EnrichedPost = PostRow & {
  surgery_name: string;
  /** Always null: Surgery Talk is anonymous (2026-09-16). No author name is fetched or shown. */
  user_name: string | null;
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
        // Anonymous: the author's name is never read. Only the skin type and a recorded Derm verification are.
        let profileMap = new Map<string, { skin_type: string | null; is_derm: boolean; field_provenance: any }>();
        if (userIds.length > 0) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("user_id, skin_type, is_derm, field_provenance")
            .in("user_id", userIds);
          if (profs) profileMap = new Map(profs.map((p) => [p.user_id, p as any]));
        }
        const enriched: EnrichedPost[] = (data as unknown as PostRow[]).map((p) => {
          const prof = profileMap.get(p.user_id);
          return {
            ...p,
            photos: Array.isArray(p.photos) ? (p.photos as Photo[]) : [],
            surgery_name: p.surgery_id ? (surgMap.get(p.surgery_id) ?? "") : "",
            skin_type: p.skin_type ?? prof?.skin_type ?? null,
            // No stand-in name and no "member": nothing in the database says either.
            user_name: null,
            // The Derm badge needs a recorded verification: profiles.field_provenance.is_derm {source, recorded_at}, which the
            // profiles_enforce_provenance trigger requires before is_derm can be true (2026-09-16). No verification, no badge.
            user_is_derm: prof?.is_derm === true && !!prof?.field_provenance?.is_derm?.source && !!prof?.field_provenance?.is_derm?.recorded_at,
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
  const removePost = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { posts, loading, reload, updatePost, removePost };
}

// ============= UI primitives =============
function ChipScroll({
  items, active, onChange, renderChip,
}: {
  items: { id: string; label: string }[];
  active: string;
  onChange: (v: string) => void;
  renderChip?: (item: { id: string; label: string }, isActive: boolean) => React.ReactNode;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((it) => {
        const isActive = active === it.id;
        if (renderChip) {
          return (
            <button key={it.id} onClick={() => onChange(it.id)} className="shrink-0" style={{ minHeight: 44 }}>
              {renderChip(it, isActive)}
            </button>
          );
        }
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className="shrink-0 rounded-full"
            style={{
              minHeight: 44,
              padding: "0 16px",
              fontSize: 13,
              fontWeight: 500,
              backgroundColor: isActive ? ESPRESSO : "#fff",
              color: isActive ? "#fff" : ESPRESSO,
              border: `1px solid ${isActive ? ESPRESSO : BORDER}`,
              fontFamily: SANS,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
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
          style={{ width: 70 + ((i * 17) % 40), height: 44, background: "#EEE6DC" }} />
      ))}
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

/* A flat track with one mark on it — the level the poster picked. The old bar was a
   four-stop gradient, and gradients are out of the design system. */
function PainBar({ level }: { level: number }) {
  const pct = (level / 10) * 100;
  return (
    <div style={{ marginTop: 12, border: CARD_BORDER, borderRadius: 10, padding: "9px 10px" }}>
      <div style={SECTION_LABEL}>Pain level</div>
      <div className="relative" style={{ height: 20, marginTop: 6 }}>
        <div
          className="absolute left-0 right-0"
          style={{ top: 7, height: 6, borderRadius: 3, background: NEUTRAL_FILL, border: CARD_BORDER }}
        />
        <div
          className="absolute"
          style={{
            left: `${pct}%`, top: 3, transform: "translateX(-50%)",
            width: 14, height: 14, borderRadius: 7, background: ESPRESSO, border: "2px solid #fff",
          }}
        />
      </div>
      <div style={{ marginTop: 4, fontSize: 13, color: ESPRESSO }}>
        {level}/10 <span style={{ color: MUTED }}>{painScaleLabel(level)}</span>
      </div>
    </div>
  );
}

// ============= Comments =============
type CommentRow = { id: string; user_id: string; content: string; created_at: string };

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
    // Comments are anonymous like the posts: no name is read or shown. The signed-in visitor's own comments say "You".
    setComments(data as CommentRow[]);
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
    <div className="mt-3 rounded-lg p-3" style={{ background: CREAM, border: CARD_BORDER }}>
      <div className="space-y-2">
        {comments.length === 0 && (
          <div style={{ fontSize: 13, color: MUTED }}>No comments yet. Be the first.</div>
        )}
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg px-3 py-2" style={{ background: "#fff", border: CARD_BORDER }}>
            {userId && c.user_id === userId && (
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: ESPRESSO }}>You</div>
            )}
            <div style={{ fontSize: 13, color: ESPRESSO, lineHeight: 1.5 }}>{c.content}</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>
              {new Date(c.created_at).toLocaleString()}
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
            className="flex-1 rounded-full px-3"
            style={{ background: "#fff", border: CARD_BORDER, color: ESPRESSO, minHeight: 44, fontSize: 13, fontFamily: SANS }}
          />
          <button
            onClick={send}
            disabled={loading || !text.trim()}
            className="flex shrink-0 items-center justify-center rounded-full"
            aria-label="Send comment"
            style={{ width: 44, height: 44, background: CRIMSON, color: "#fff", border: "none", opacity: loading || !text.trim() ? 0.5 : 1 }}
          >
            <Send size={16} />
          </button>
        </div>
      ) : (
        <div className="mt-2" style={{ fontSize: 13, color: MUTED }}>Sign in to comment.</div>
      )}
    </div>
  );
}

// ============= Post card =============
function PostCard({ post, userId, onLikeChange, onDeleted, split, myVote, canVote, onVote, onSignIn, voteError }: {
  post: EnrichedPost; userId: string | null; onLikeChange: (delta: number) => void; onDeleted: () => void;
  split: VoteSplit; myVote: VoteValue | null; canVote: boolean;
  onVote: (v: VoteValue) => void; onSignIn?: () => void; voteError: string | null;
}) {
  const isOwn = !!userId && post.user_id === userId;
  const [deleting, setDeleting] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState<number>(0);

  // Only the author can delete (RLS "Users can delete their own surgery posts": auth.uid() = user_id). Likes, saves and
  // comments on the post are removed with it (ON DELETE CASCADE), so it disappears from everyone's saved posts.
  async function deletePost() {
    if (!isOwn || deleting) return;
    if (!window.confirm("Delete this post? It is removed for everyone, with its comments, and cannot be undone.")) return;
    setDeleting(true);
    setRowError(null);
    const { error, count } = await supabase.from("surgery_posts").delete({ count: "exact" }).eq("id", post.id).eq("user_id", userId!);
    setDeleting(false);
    if (error || count === 0) { setRowError(error ? `Couldn't delete: ${error.message}` : "Couldn't delete this post."); return; }
    onDeleted();
  }

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

  const cells = receiptCells([
    ["Paid", post.total_cost],
    ["Downtime", post.recovery_time],
    ["Clinic", post.clinic_name],
    // `surgery_posts` has no sessions column, so that cell is never built rather than drawn empty.
  ]);
  const place = [post.country, post.city].filter(Boolean).join(" · ");

  return (
    <TalkPostCard
      /* Surgery Talk is anonymous: the author is never named, not even to themselves beyond "Your post". */
      authorName={null}
      isOwn={isOwn}
      skinType={post.skin_type}
      createdAt={post.created_at}
      subject={post.surgery_name || null}
      typeLabel={post.user_is_derm ? { text: "Verified derm" } : null}
      verdict={post.outcome ? { label: post.outcome, tone: NEGATIVE_OUTCOMES.has(post.outcome) ? "negative" : "positive" } : null}
      body={post.what_happened || post.my_thoughts_vs_reality || ""}
      module={
        <>
          <TalkReceipt cells={cells.slice(0, 3)} />
          {place && <div style={{ marginTop: 8, fontSize: 13, color: CAPTION }}>{place}</div>}
          {post.pain_level != null && <PainBar level={post.pain_level} />}
          {/* Recovery photos are of a real person's face. Nobody meets them by scrolling past. */}
          <TalkPhotoCarousel photos={post.photos} gated />
          {post.hashtags.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 13, color: CAPTION }}>{post.hashtags.join("  ")}</div>
          )}
        </>
      }
      details={[
        /* The body is what_happened, falling back to my_thoughts_vs_reality. When the fallback was used the
           text is already the body, so it is not repeated here. */
        { label: "My thoughts vs reality", value: post.what_happened ? post.my_thoughts_vs_reality ?? "" : "" },
        { label: "The struggle", value: post.struggle ?? "" },
        { label: "What surprised me", value: post.surprised_me ?? "" },
        { label: "Wish I knew before", value: post.warn_if ?? "", warning: true },
        { label: "Who it's for", value: post.works_for ?? "" },
      ]}
      voteBlock={
        <TalkVoteBlock
          split={split}
          myVote={myVote}
          canVote={canVote}
          disabledReason={onSignIn ? "Sign in to vote" : "You can't vote on your own post"}
          onVote={onVote}
          onSignIn={onSignIn}
          error={voteError}
        />
      }
      like={{ key: "Like", count: likesCount, active: liked, onClick: () => void toggleLike(), disabled: !userId, title: userId ? undefined : "Sign in to like" }}
      reply={{
        key: "Reply",
        label: "Reply",
        count: commentsCount,
        onClick: () => setShowComments((v) => !v),
        disabled: !post.comments_open,
        title: post.comments_open ? undefined : "Comments closed by the poster",
      }}
      quote={{ key: "Quote", label: "Quote", disabled: true, title: "Quoting is not built yet" }}
      save={{ key: "Save", active: saved, onClick: () => void toggleSave(), disabled: !userId, title: userId ? (saved ? "Saved" : "Save") : "Sign in to save" }}
      share={{ key: "Share", disabled: true, title: "Surgery Talk posts are anonymous and have no shareable page" }}
      onDelete={isOwn ? () => void deletePost() : undefined}
      error={rowError}
      footer={showComments && post.comments_open ? <CommentSection postId={post.id} userId={userId} /> : null}
    />
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
        <h2 className="text-[16px]" style={{ fontFamily: DISPLAY, color: ESPRESSO }}>
          Today's Tea
        </h2>
        {/* What this actually is: the most-liked post of the last 24 hours,
            worked out in the browser each time the page loads. Nothing
            "refreshes daily". */}
        <span style={{ fontSize: 13, color: MUTED }}>most liked in the last 24 hours</span>
      </div>
      <div className="rounded-xl p-4" style={{ background: ESPRESSO }}>
        <div style={{ ...SECTION_LABEL, color: "rgba(255,252,248,0.75)" }}>
          {post.surgery_name}{post.city ? ` · ${post.city}` : ""}
        </div>
        {quote ? (
          <p className="mt-2" style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.45, color: "#fff" }}>
            {quote.length > 140 ? quote.slice(0, 140) + "…" : quote}
          </p>
        ) : (
          <p className="mt-2" style={{ fontSize: 13, color: "rgba(255,252,248,0.75)" }}>
            This post has no written story yet.
          </p>
        )}
        {/* Likes are a stored count. The comment count here was a literal 0 that nothing counted, so it is gone. */}
        <div className="mt-3" style={{ fontSize: 13, color: "rgba(255,252,248,0.85)" }}>
          {post.likes_count} {post.likes_count === 1 ? "like" : "likes"}
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
        <h2 className="text-[16px]" style={{ fontFamily: DISPLAY, color: ESPRESSO }}>
          Top Tea
        </h2>
        <span style={{ fontSize: 13, color: MUTED }}>this week</span>
      </div>
      <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {posts.slice(0, 5).map((p, i) => (
          <div key={p.id} className="shrink-0 rounded-[10px] overflow-hidden"
            style={{ width: 160, border: CARD_BORDER, background: "#fff" }}>
            <div className="p-3">
              <div style={SECTION_LABEL}>{p.surgery_name}</div>
              {/* The ellipsis belongs to text that was actually cut. An empty post renders no excerpt rather than "—…". */}
              {(() => {
                const excerpt = p.my_thoughts_vs_reality || p.what_happened || "";
                if (!excerpt) return null;
                return (
                  <div className="mt-1" style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4, color: ESPRESSO }}>
                    {excerpt.length > 60 ? `${excerpt.slice(0, 60)}…` : excerpt}
                  </div>
                );
              })()}
              <div className="mt-2 flex items-center justify-between" style={{ fontSize: 13, color: MUTED }}>
                <span>{p.likes_count} {p.likes_count === 1 ? "like" : "likes"}</span>
                <span style={{ color: ESPRESSO, fontWeight: 500 }}>{i + 1}</span>
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
        <h2 className="text-[16px]" style={{ fontFamily: DISPLAY, color: ESPRESSO }}>
          Most Controversial
        </h2>
      </div>
      <div className="rounded-[10px] p-3" style={{ border: CARD_BORDER, background: "#fff" }}>
        <div className="flex items-center justify-between gap-2">
          <span style={{ ...SECTION_LABEL, color: CRIMSON }}>Wouldn't</span>
          <span style={{ fontSize: 13, color: MUTED }}>{post.likes_count} {post.likes_count === 1 ? "like" : "likes"}</span>
        </div>
        <div className="mt-1" style={{ fontSize: 13, color: MUTED }}>
          {post.surgery_name}{post.city ? ` · ${post.city}` : ""}
        </div>
        {quote && (
          <p className="mt-1" style={{ fontSize: 13, color: ESPRESSO, lineHeight: 1.5 }}>
            {quote.length > 100 ? quote.slice(0, 100) + "…" : quote}
          </p>
        )}
      </div>
    </section>
  );
}


// ============= Disclaimer modal =============
function DisclaimerModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(28,10,0,0.5)" }}>
      <div className="rounded-2xl w-full max-w-sm p-5" style={{ background: "#fff" }}>
        <div style={{ fontSize: 17, fontWeight: 500, color: ESPRESSO, fontFamily: DISPLAY }}>
          Before you spill
        </div>
        <ul className="mt-3 space-y-2" style={{ fontSize: 13, color: ESPRESSO, lineHeight: 1.5 }}>
          <li>Everything shared here is your personal experience — not medical advice.</li>
          <li>Skintea doesn't verify procedures, clinics, or outcomes.</li>
          <li>Your story helps others make informed decisions. Keep it honest.</li>
        </ul>
        <div className="mt-5 flex flex-col gap-2">
          <button onClick={onConfirm} className="rounded-full"
            style={{ minHeight: 48, fontSize: 14, fontWeight: 500, background: CRIMSON, color: "#fff", border: "none", fontFamily: SANS }}>
            I understand, continue
          </button>
          <button onClick={onCancel} className="rounded-full"
            style={{ minHeight: 44, fontSize: 13, background: "transparent", color: MUTED, border: "none", fontFamily: SANS }}>
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
    // The surgery is the poster's own claim too: nothing pre-chosen.
    surgery_id: "",
    clinic_name: "", country: "", city: "", total_cost: "", recovery_time: "",
    // Pain, outcome and skin type start unset: they are the poster's own claims, so nothing is pre-chosen for them.
    pain_level: null as number | null,
    my_thoughts_vs_reality: "", struggle: "", what_happened: "",
    surprised_me: "", works_for: "", warn_if: "",
    outcome: null as PostRow["outcome"],
    skin_type: null as string | null,
    hashtags: "",
    comments_open: true,
  });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const missing = [
    form.surgery_id === "" ? "surgery" : null,
    form.pain_level == null ? "pain level" : null,
    form.outcome == null ? "outcome" : null,
    form.skin_type == null ? "skin type" : null,
  ].filter((m): m is string => m !== null);

  async function submit() {
    if (missing.length > 0) return;
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
    // On failure the form stays open with everything the poster typed.
    if (error) { setError(error.message); return; }
    onCreated(); onClose();
  }

  const painLabel = form.pain_level != null ? painScaleLabel(form.pain_level) : null;
  const inputStyle = { border: CARD_BORDER, minHeight: 44, fontSize: 13, color: ESPRESSO, fontFamily: SANS, background: "#fff" };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: "rgba(28,10,0,0.5)" }}>
      <div className="w-full max-w-md rounded-t-2xl md:rounded-2xl max-h-[92vh] overflow-y-auto"
        style={{ background: "#fff" }}>
        <div className="sticky top-0 flex items-center justify-between px-4 py-3"
          style={{ background: "#fff", borderBottom: CARD_BORDER }}>
          <div style={{ fontSize: 17, fontWeight: 500, fontFamily: DISPLAY, color: ESPRESSO }}>
            Spill it
          </div>
          <button onClick={onClose} aria-label="Close" style={{ minWidth: 44, minHeight: 44 }}><X size={18} color={ESPRESSO} /></button>
        </div>
        <div className="p-4 space-y-3" style={{ color: ESPRESSO, fontSize: 13 }}>
          <Field label="Surgery type">
            <select value={form.surgery_id} onChange={(e) => update("surgery_id", e.target.value)}
              className="w-full rounded-md px-2" style={inputStyle}>
              <option value="" disabled>Choose a surgery</option>
              {surgeries.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Clinic name">
            <input value={form.clinic_name} onChange={(e) => update("clinic_name", e.target.value)}
              className="w-full rounded-md px-2" style={inputStyle} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Country"><input value={form.country} onChange={(e) => update("country", e.target.value)} className="w-full rounded-md px-2" style={inputStyle} /></Field>
            <Field label="City"><input value={form.city} onChange={(e) => update("city", e.target.value)} className="w-full rounded-md px-2" style={inputStyle} /></Field>
          </div>
          <Field label="Paid (e.g. $8,500 incl. travel)">
            <input value={form.total_cost} onChange={(e) => update("total_cost", e.target.value)} className="w-full rounded-md px-2" style={inputStyle} />
          </Field>
          <Field label="Downtime">
            <input value={form.recovery_time} onChange={(e) => update("recovery_time", e.target.value)} className="w-full rounded-md px-2" style={inputStyle} />
          </Field>

          <div>
            <div className="mb-2" style={SECTION_LABEL}>
              {form.pain_level != null ? `Pain level: ${form.pain_level}/10 — ${painLabel}` : "Pain level: choose 1–10"}
            </div>
            {form.pain_level != null && <PainBar level={form.pain_level} />}
            <div className="grid grid-cols-5 gap-1 mt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button key={n} type="button" onClick={() => update("pain_level", n)}
                  aria-pressed={form.pain_level === n}
                  className="rounded-md"
                  style={{
                    minHeight: 44, fontSize: 13, fontWeight: 500,
                    background: form.pain_level === n ? ESPRESSO : "#fff",
                    color: form.pain_level === n ? "#fff" : ESPRESSO,
                    border: `1px solid ${form.pain_level === n ? ESPRESSO : BORDER}`,
                  }}>{n}</button>
              ))}
            </div>
          </div>

          {([
            ["my_thoughts_vs_reality", "My thoughts vs reality"],
            ["struggle", "The struggle"],
            ["what_happened", "What happened"],
            ["surprised_me", "What surprised me"],
            ["warn_if", "Wish I knew before"],
            ["works_for", "Who it's for"],
          ] as const).map(([k, lab]) => (
            <Field key={k} label={lab} warning={k === "warn_if"}>
              <textarea value={form[k] as string} onChange={(e) => update(k, e.target.value as any)}
                rows={2} className="w-full rounded-md px-2 py-2" style={{ ...inputStyle, minHeight: 60 }} />
            </Field>
          ))}

          <Field label="Outcome">
            <div className="grid grid-cols-3 gap-2">
              {(["Would do again", "Modified", "Wouldn't"] as const).map((o) => {
                const on = form.outcome === o;
                const tone = NEGATIVE_OUTCOMES.has(o) ? CRIMSON : ESPRESSO;
                return (
                  <button key={o} onClick={() => update("outcome", o)}
                    className="rounded-md"
                    style={{
                      minHeight: 44, fontSize: 13, fontWeight: 500,
                      background: on ? tone : "#fff",
                      color: on ? "#fff" : tone,
                      border: `1px solid ${on ? tone : BORDER}`,
                    }}>{o}</button>
                );
              })}
            </div>
          </Field>

          <Field label="Skin type">
            <div className="flex flex-wrap gap-1.5">
              {["Oily", "Dry", "Combination", "Sensitive", "Normal"].map((s) => (
                <button key={s} onClick={() => update("skin_type", s)}
                  className="rounded-full px-4"
                  style={{
                    minHeight: 44, fontSize: 13, fontWeight: 500,
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
              className="w-full rounded-md px-2" style={inputStyle} />
          </Field>

          <Field label="Photos (URL + label, optional, up to 6)">
            <div className="space-y-2">
              {photos.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input value={p.url} placeholder="https://…"
                    onChange={(e) => setPhotos((arr) => arr.map((x, j) => j === i ? { ...x, url: e.target.value } : x))}
                    className="flex-1 rounded-md px-2" style={inputStyle} />
                  <input value={p.label} placeholder="Label"
                    onChange={(e) => setPhotos((arr) => arr.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                    className="w-24 rounded-md px-2" style={inputStyle} />
                  <button onClick={() => setPhotos((arr) => arr.filter((_, j) => j !== i))}
                    aria-label="Remove photo"
                    style={{ minWidth: 44, minHeight: 44, color: MUTED }}><X size={16} /></button>
                </div>
              ))}
              {photos.length < 6 && (
                <button onClick={() => setPhotos((arr) => [...arr, { url: "", label: "" }])}
                  className="w-full rounded-md"
                  style={{ minHeight: 44, fontSize: 13, border: `1px dashed ${BORDER}`, color: MUTED, background: "#fff" }}>
                  Add photo
                </button>
              )}
            </div>
          </Field>

          <label className="flex items-center justify-between rounded-md px-3"
            style={{ background: CREAM, border: CARD_BORDER, minHeight: 44 }}>
            <span style={{ fontSize: 13 }}>Let others comment on your post</span>
            <input type="checkbox" checked={form.comments_open}
              onChange={(e) => update("comments_open", e.target.checked)} />
          </label>

          {error && <div style={{ fontSize: 13, color: CRIMSON }}>{error}</div>}

          {missing.length > 0 && (
            <div style={{ fontSize: 13, color: MUTED }}>Still to choose: {missing.join(", ")}</div>
          )}

          <button onClick={submit} disabled={submitting || missing.length > 0}
            className="w-full rounded-full"
            style={{ minHeight: 48, fontSize: 14, fontWeight: 500, background: CRIMSON, color: "#fff", border: "none", fontFamily: SANS, opacity: submitting || missing.length > 0 ? 0.5 : 1 }}>
            {submitting ? "Spilling…" : "Spill it"}
          </button>
          <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
            Your post is public on Skintea without your name.
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, warning }: { label: string; children: React.ReactNode; warning?: boolean }) {
  return (
    <label className="block">
      <div className="mb-1" style={{ ...SECTION_LABEL, color: warning ? CRIMSON : MUTED }}>
        {label}
      </div>
      {children}
    </label>
  );
}

/* Members lock: kept for a paid tier. There is no paid tier, so nothing renders it today. */
export function MembersLock() {
  return (
    <div className="rounded-xl p-4 text-center" style={{ background: "#fff", border: CARD_BORDER, maxWidth: 210 }}>
      <div className="mx-auto mb-2 flex items-center justify-center rounded-full"
        style={{ width: 32, height: 32, background: CREAM }}>
        <Lock size={14} color={ESPRESSO} />
      </div>
      <div className="mb-1" style={{ fontSize: 13, fontWeight: 500, color: ESPRESSO, fontFamily: DISPLAY }}>
        The rest stays between us
      </div>
      <div className="mb-3" style={{ fontSize: 13, color: MUTED }}>
        Memberships aren't open yet.
      </div>
      <Link to="/signup" className="inline-block rounded-full px-4"
        style={{ minHeight: 44, lineHeight: "44px", fontSize: 13, fontWeight: 500, background: CRIMSON, color: "#fff" }}>
        Become a Member
      </Link>
    </div>
  );
}

// ============= Main page =============
export function SurgeryTalkContent({ embedded = false }: { embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const userId = useSession();
  const { surgeries, loading: surgeriesLoading, failed: surgeriesFailed } = useSurgeries();
  const { posts, loading: postsLoading, reload, updatePost, removePost } = usePosts(surgeries);
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
    // Ordering chips by today's post counts is a ranking, so it waits for MIN_RANKED_POSTS like the rank numbers; under
    // the floor the chips keep the table's own sort order.
    const sorted = posts.length >= MIN_RANKED_POSTS
      ? [...surgeries].sort((a, b) => (rankCounts.get(b.id) ?? 0) - (rankCounts.get(a.id) ?? 0))
      : [...surgeries];
    return [{ id: "All", label: "All", count: 0 }, ...sorted.map((s) => ({
      id: s.name, label: s.name, count: rankCounts.get(s.id) ?? 0,
    }))];
  }, [surgeries, rankCounts, posts.length]);

  // One RPC for every post on screen; the floors are applied inside post_vote_split.
  const postIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const { splits, myVotes, vote, error: voteError } = usePostVotes("surgery", postIds, userId);

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
      navigate({ to: "/login" });
    } else {
      setComposerOpen(true);
    }
  }

  /* Rank numbers are a ranking too, so they wait for MIN_RANKED_POSTS with the rest.
     Under the floor the chips are plain filters. The medal emoji are gone. */
  function renderSurgeryChip(item: { id: string; label: string }, isActive: boolean) {
    const count = surgeryChips.find((c) => c.id === item.id)?.count ?? 0;
    const idx = surgeryChips.findIndex((c) => c.id === item.id);
    const ranked = rankingReady && item.id !== "All" && count > 0 && idx >= 1 && idx <= 3;
    return (
      <span className="rounded-full px-4"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44,
          backgroundColor: isActive ? ESPRESSO : "#fff",
          color: isActive ? "#fff" : ESPRESSO,
          border: `1px solid ${isActive ? ESPRESSO : BORDER}`,
          fontSize: 13, fontWeight: 500, fontFamily: SANS, whiteSpace: "nowrap",
        }}>
        {ranked && <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.7 }}>{idx}</span>}
        {item.label}
      </span>
    );
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* pb clears the floating button: 72px offset + ~44px button on mobile,
          less on desktop where BottomNav (md:hidden) is not there. */}
      <div className="min-h-screen overflow-x-hidden pb-[132px] md:pb-24"
        style={{ background: CREAM, fontFamily: SANS, maxWidth: "100vw" }}>

        {/* Header. Sits under the /tea header when embedded there — that header
            publishes its height as --tea-header-h and takes the higher z-index;
            standalone, the fallback of 0px keeps it at the top. */}
        <header className="sticky z-30"
          style={{ background: WARM_WHITE, borderBottom: CARD_BORDER, top: "var(--tea-header-h, 0px)" }}>
          {/* Surgery filter. Only called "ranked" while there is enough to rank. */}
          <div className="px-4 pt-2">
            <div style={SECTION_LABEL}>
              {rankingReady ? "Surgery · ranked by today's posts" : "Surgery"}
            </div>
          </div>
          {surgeriesLoading ? (
            <ChipSkeleton />
          ) : surgeriesFailed ? (
            <div className="px-4 py-2" style={{ fontSize: 13, color: CRIMSON }}>
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
              <h1 className="text-[18px]" style={{ fontFamily: DISPLAY, color: ESPRESSO }}>
                All Spills
              </h1>
              <span style={{ fontSize: 13, color: MUTED }}>
                {filtered.length} {filtered.length === 1 ? "tea" : "teas"}
              </span>
            </div>
          )}

          <div className="space-y-4">
            {postsLoading ? (
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl p-4 animate-pulse"
                    style={{ background: "#fff", border: CARD_BORDER, height: 220 }}>
                    <div style={{ width: "40%", height: 12, background: "#EEE6DC", borderRadius: 4 }} />
                    <div className="mt-3" style={{ width: "100%", height: 80, background: "#F5EFE7", borderRadius: 8 }} />
                    <div className="mt-3" style={{ width: "80%", height: 10, background: "#EEE6DC", borderRadius: 4 }} />
                  </div>
                ))}
              </>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl p-6 text-center"
                style={{ background: "#fff", border: CARD_BORDER, color: MUTED, fontSize: 13 }}>
                {posts.length === 0
                  ? "No surgery stories yet — be the first to share."
                  : "No stories match these filters."}
              </div>
            ) : (
              /* No paywall: there is no paid tier, and the old rule locked every post after the first for
                 everyone, signed in or not. MembersLock is kept for a membership tier that may exist later. */
              filtered.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  userId={userId}
                  onLikeChange={(delta) => updatePost(p.id, { likes_count: Math.max(0, p.likes_count + delta) })}
                  onDeleted={() => removePost(p.id)}
                  split={splits.get(p.id) ?? emptySplit(p.id)}
                  myVote={myVotes.get(p.id) ?? null}
                  canVote={!!userId && p.user_id !== userId}
                  onVote={(v) => void vote(p.id, v)}
                  onSignIn={userId ? undefined : () => navigate({ to: "/login" })}
                  voteError={voteError?.postId === p.id ? voteError.message : null}
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
            background: CRIMSON,
            color: "#fff",
            fontSize: 14,
            fontWeight: 500,
            borderRadius: 999,
            minHeight: 44,
            padding: "0 28px",
            border: "none",
            zIndex: 40,
            cursor: "pointer",
            fontFamily: SANS,
          }}
        >
          Spill the tea
        </button>
      </div>
    </>
  );
}

function SurgeryTalkPage() {
  return <SurgeryTalkContent />;
}
