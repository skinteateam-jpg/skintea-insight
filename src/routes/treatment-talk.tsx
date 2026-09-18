import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Lock, X, ChevronDown } from "lucide-react";
import TalkPostCard, {
  BORDER, CAPTION, CARD_BORDER, CRIMSON, DISPLAY, ESPRESSO, SANS, WARM_WHITE,
  TalkReceipt, receiptCells,
} from "@/components/TalkPostCard";
import TalkVoteBlock from "@/components/TalkVoteBlock";
import { emptySplit, usePostVotes, type VoteSplit, type VoteValue } from "@/lib/postVotes";
import TalkVisibilityPicker from "@/components/TalkVisibilityPicker";
import { ANONYMOUS_AUTHOR, profileHref, useMyUsername, useTalkAuthors, type TalkAuthor } from "@/lib/talkAuthors";
import TalkQuoteBox from "@/components/TalkQuoteBox";
import { useQuotedPosts } from "@/lib/talkQuotes";

export const Route = createFileRoute("/treatment-talk")({
  head: () => ({
    meta: [
      { title: "Treatment Talk — Skintea" },
      {
        name: "description",
        content: "Share and read treatment experiences.",
      },
      { property: "og:title", content: "Treatment Talk — Skintea" },
      {
        property: "og:description",
        content: "Share and read treatment experiences.",
      },
    ],
  }),
  component: TreatmentTalkPage,
});

/* Colour, type and spacing come from the shared card (src/components/TalkPostCard.tsx) so the three
   Talks cannot drift apart. CREAM and MUTED are kept as local names for the page chrome. */
const CREAM = WARM_WHITE;
const MUTED = CAPTION;

// Posts are written to and read from public.posts (2026-09-16). The table's own guards apply: RLS lets a signed-in user
// insert only their own row (auth.uid() = user_id), and enforce_signed_in_author rejects any row not written by its
// signed-in author, so posts cannot be seeded. No author name is shown on a post (profiles.name is the full sign-up name).

type TreatmentOption = { id: string; name: string };

// Active treatments from the table only. There is no hard-coded fallback list: while loading the chips show a skeleton,
// and a failed load says so (a stale list once included the inactive "Laser").
function useTreatments() {
  const [treatments, setTreatments] = useState<TreatmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("treatments")
        .select("id, name")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      if (error) setFailed(true);
      else setTreatments(((data ?? []) as TreatmentOption[]).filter((t) => t.id && t.name));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return { treatments, loading, failed };
}

function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUserId(session?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  return userId;
}

function ChipSkeletonRow() {
  return (
    <div className="flex gap-2 overflow-x-hidden px-4 pt-1.5 pb-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="shrink-0 rounded-full animate-pulse"
          style={{
            width: 56 + ((i * 13) % 40),
            height: 44,
            background: "#EEE6DC",
          }}
        />
      ))}
    </div>
  );
}

/* Skin types are words, not emoji: no emoji renders anywhere in the UI. */
const SKIN_TYPES = [
  { id: "all", label: "All" },
  { id: "oily", label: "Oily" },
  { id: "dry", label: "Dry" },
  { id: "sensitive", label: "Sensitive" },
  { id: "combo", label: "Combo" },
  { id: "normal", label: "Normal" },
];

// Only "Most recent" can order the feed. "Most helpful" needs helpful votes and "Most detailed" a detail measure; neither
// is collected, so both stay visible and disabled.
const SORTS: { label: string; enabled: boolean }[] = [
  { label: "Most recent", enabled: true },
  { label: "Most helpful", enabled: false },
  { label: "Most detailed", enabled: false },
];

type Outcome = "would_again" | "modified" | "wouldnt";
const OUTCOMES: { key: Outcome; label: string }[] = [
  { key: "would_again", label: "Would do again" },
  { key: "modified", label: "Modified" },
  { key: "wouldnt", label: "Wouldn't" },
];
const OUTCOME_LABEL: Record<Outcome, string> = Object.fromEntries(OUTCOMES.map((o) => [o.key, o.label])) as Record<Outcome, string>;
/* "Wouldn't" is the only negative outcome, so it is the only one that stamps in crimson.
   "Modified" is not a warning and does not. */
const NEGATIVE_OUTCOMES = new Set<Outcome>(["wouldnt"]);

type PostRow = {
  id: string;
  // No user_id: who wrote a post comes from talk_post_authors(), which returns an author only for a named post.
  is_named: boolean;
  /** Quote tea: the Treatment Talk post this one quotes, or null. */
  quoted_post_id: string | null;
  treatment_id: string | null;
  cost: string | null;
  sessions: string | null;
  what_happened: string | null;
  surprised_me: string | null;
  works_for: string | null;
  warn_if: string | null;
  outcome: Outcome | null;
  tags: string[];
  skin_type: string | null;
  created_at: string;
};

function ChipScroll({
  items,
  active,
  onChange,
}: {
  items: string[];
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((it) => {
        const isActive = active === it;
        return (
          <button
            key={it}
            onClick={() => onChange(it)}
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
            }}
          >
            {it}
          </button>
        );
      })}
    </div>
  );
}

/* The card is the shared TalkPostCard. The six-cell Field grid and the three-across OutcomeRow are
   gone (2026-09-17): the grid printed an em dash for every field the poster left blank, and the row
   drew all three outcomes with the two they did not pick greyed out, which reads as three verdicts
   rather than one. Now the outcome is a single stamp and an empty field is simply not drawn. */
function PostCard({
  post,
  treatmentName,
  saved,
  onToggleSave,
  isOwn,
  onDelete,
  split,
  myVote,
  canVote,
  onVote,
  onSignIn,
  voteError,
  author,
  quotedBox,
  onQuote,
}: {
  post: PostRow;
  treatmentName: string | null;
  saved: boolean;
  onToggleSave: () => void;
  isOwn: boolean;
  onDelete: () => void;
  split: VoteSplit;
  myVote: VoteValue | null;
  canVote: boolean;
  onVote: (v: VoteValue) => void;
  onSignIn?: () => void;
  voteError: string | null;
  author: TalkAuthor;
  quotedBox?: React.ReactNode;
  onQuote?: () => void;
}) {
  const cells = receiptCells([
    ["Paid", post.cost],
    ["Sessions", post.sessions],
    // `posts` has no downtime column, so that cell is never built rather than drawn empty.
  ]);

  return (
    <TalkPostCard
      /* Named only when the author chose to be (posts.is_named). The author comes from talk_post_authors(),
         which returns nothing for an anonymous post. */
      authorName={author.username}
      authorAvatarUrl={author.avatarUrl}
      authorHref={author.username ? profileHref(author.username) : null}
      isOwn={isOwn}
      skinType={post.skin_type}
      createdAt={post.created_at}
      subject={treatmentName}
      verdict={
        post.outcome
          ? { label: OUTCOME_LABEL[post.outcome], tone: NEGATIVE_OUTCOMES.has(post.outcome) ? "negative" : "positive" }
          : null
      }
      body={post.what_happened ?? ""}
      quoted={quotedBox}
      module={
        <>
          <TalkReceipt cells={cells} />
          {post.tags.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 13, color: CAPTION }}>{post.tags.join("  ")}</div>
          )}
        </>
      }
      details={[
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
      reply={{ key: "Reply", label: "Reply", disabled: true, title: "Replies open when commenting does" }}
      quote={onQuote
        ? { key: "Quote", label: "Quote", onClick: onQuote, title: "Quote this post in a post of your own" }
        : { key: "Quote", label: "Quote", disabled: true, title: "Quoting is not available here" }}
      save={{ key: "Save", active: saved, onClick: onToggleSave, title: saved ? "Saved" : "Save" }}
      share={{ key: "Share", disabled: true, title: "Treatment Talk posts are nameless and have no shareable page" }}
      onDelete={isOwn ? onDelete : undefined}
    />
  );
}

/* Members lock: kept for a paid tier. There is no paid tier, so nothing renders it today. */
export function MembersLock() {
  return (
    <div
      className="w-full max-w-sm rounded-2xl p-5 text-center"
      style={{ background: "#fff", border: CARD_BORDER }}
    >
      <div className="mx-auto flex items-center justify-center rounded-full" style={{ width: 44, height: 44, background: CREAM }}>
        <Lock size={20} color={ESPRESSO} />
      </div>
      <h3 className="mt-3 text-lg leading-tight" style={{ color: ESPRESSO, fontFamily: DISPLAY }}>
        Members only
      </h3>
      <p className="mt-1.5" style={{ fontSize: 13, color: MUTED, fontFamily: SANS }}>
        Memberships aren't open yet.
      </p>
    </div>
  );
}

function Composer({
  onClose,
  treatments,
  userId,
  onCreated,
  quotedPostId = null,
}: {
  onClose: () => void;
  treatments: TreatmentOption[];
  userId: string;
  onCreated: () => void;
  /** Quote tea: the post this new post quotes. Written to quoted_post_id; the database checks it exists. */
  quotedPostId?: string | null;
}) {
  const { quoted: quotedMap, loaded: quotedLoaded } = useQuotedPosts("treatment", quotedPostId ? [quotedPostId] : [], userId);
  // Treatment, outcome and skin type are the poster's own claims: nothing is pre-chosen.
  const [treatmentId, setTreatmentId] = useState("");
  const [cost, setCost] = useState("");
  const [sessions, setSessions] = useState("");
  const [text, setText] = useState({ what_happened: "", surprised_me: "", works_for: "", warn_if: "" });
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [skinType, setSkinType] = useState<string | null>(null);
  const [tags, setTags] = useState("");
  // Starts on "Post as @username"; null means the author has not touched it. Without a username the post
  // cannot be named, and is_named is sent as false — explicitly, never left to the column default.
  const { username, loaded: usernameLoaded } = useMyUsername(userId);
  const [namedChoice, setNamedChoice] = useState<boolean | null>(null);
  const named = !!username && (namedChoice ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missing = [
    treatmentId === "" ? "treatment" : null,
    outcome == null ? "outcome" : null,
    skinType == null ? "skin type" : null,
    Object.values(text).every((v) => !v.trim()) ? "at least one of the four written answers" : null,
  ].filter((m): m is string => m !== null);

  async function submit() {
    if (missing.length > 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    const tagList = tags
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith("#") ? t : `#${t}`));
    const { error: insertError } = await supabase.from("posts").insert({
      user_id: userId,
      treatment_id: treatmentId,
      cost: cost.trim() || null,
      sessions: sessions.trim() || null,
      what_happened: text.what_happened.trim() || null,
      surprised_me: text.surprised_me.trim() || null,
      works_for: text.works_for.trim() || null,
      warn_if: text.warn_if.trim() || null,
      outcome,
      skin_type: skinType,
      tags: tagList,
      is_named: named,
      quoted_post_id: quotedPostId ?? null,
    } as any);
    setSubmitting(false);
    // On failure the form stays open with everything the poster typed.
    if (insertError) {
      setError(`Couldn't post: ${insertError.message}`);
      return;
    }
    onCreated();
    onClose();
  }

  const inputStyle = {
    border: CARD_BORDER, background: "#fff", color: ESPRESSO, fontFamily: SANS,
    minHeight: 44, fontSize: 13,
  };
  const label = "mb-1 block text-[11px] font-medium uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" style={{ background: "rgba(28,10,0,0.5)" }}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl md:rounded-3xl" style={{ background: WARM_WHITE }}>
        <div className="sticky top-0 flex items-center justify-between px-5 py-3" style={{ background: WARM_WHITE, borderBottom: CARD_BORDER }}>
          <h2 style={{ fontFamily: DISPLAY, color: ESPRESSO }} className="text-xl">
            Spill the needle
          </h2>
          <button onClick={onClose} aria-label="Close" style={{ minWidth: 44, minHeight: 44 }}><X size={20} color={ESPRESSO} /></button>
        </div>
        <div className="space-y-4 px-5 py-4">
          {quotedPostId && (
            <div>
              <label className={label} style={{ color: MUTED }}>Quoting</label>
              <TalkQuoteBox quoted={quotedMap.get(quotedPostId) ?? null} loaded={quotedLoaded} />
            </div>
          )}
          <div>
            <label className={label} style={{ color: MUTED }}>Treatment</label>
            <div className="relative">
              <select value={treatmentId} onChange={(e) => setTreatmentId(e.target.value)} className="w-full appearance-none rounded-lg px-3" style={inputStyle}>
                <option value="" disabled>Choose a treatment</option>
                {treatments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" color={MUTED} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} style={{ color: MUTED }}>Paid</label>
              <input value={cost} onChange={(e) => setCost(e.target.value)} className="w-full rounded-lg px-3" style={inputStyle} placeholder="What you paid" />
            </div>
            <div>
              <label className={label} style={{ color: MUTED }}>Sessions / Area</label>
              <input value={sessions} onChange={(e) => setSessions(e.target.value)} className="w-full rounded-lg px-3" style={inputStyle} placeholder="e.g. 1 · forehead" />
            </div>
          </div>
          {([
            ["what_happened", "What happened", "Walk us through it..."],
            ["surprised_me", "What surprised me", "The thing nobody told you..."],
            ["warn_if", "Wish I knew before", "Red flags or who should skip..."],
            ["works_for", "Who it's for", "Who is this actually good for?"],
          ] as const).map(([key, lab, ph]) => (
            <div key={key}>
              <label className={label} style={{ color: key === "warn_if" ? CRIMSON : MUTED }}>{lab}</label>
              <textarea rows={2} value={text[key]} onChange={(e) => setText((t) => ({ ...t, [key]: e.target.value }))} className="w-full rounded-lg px-3 py-2" style={{ ...inputStyle, minHeight: 60 }} placeholder={ph} />
            </div>
          ))}
          <div>
            <label className={label} style={{ color: MUTED }}>Timeline photos</label>
            <div className="rounded-lg px-3 py-2.5" style={{ border: `1px dashed ${BORDER}`, background: CREAM, color: MUTED, fontSize: 13 }}>
              Photo uploads aren't open yet. Your written post can go up now.
            </div>
          </div>
          <div>
            <label className={label} style={{ color: MUTED }}>Outcome</label>
            <div className="grid grid-cols-3 gap-2">
              {OUTCOMES.map((o) => {
                const on = outcome === o.key;
                const tone = NEGATIVE_OUTCOMES.has(o.key) ? CRIMSON : ESPRESSO;
                return (
                  <button key={o.key} type="button" onClick={() => setOutcome(o.key)} className="rounded-lg"
                    style={{ minHeight: 44, fontSize: 13, fontWeight: 500, border: `1px solid ${on ? tone : BORDER}`, background: on ? tone : "#fff", color: on ? "#fff" : tone, fontFamily: SANS }}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className={label} style={{ color: MUTED }}>Your skin type</label>
            <div className="flex flex-wrap gap-2">
              {SKIN_TYPES.filter((s) => s.id !== "all").map((s) => (
                <button key={s.id} type="button" onClick={() => setSkinType(s.id)} className="rounded-full px-4"
                  style={{ minHeight: 44, fontSize: 13, fontWeight: 500, background: skinType === s.id ? ESPRESSO : "#fff", color: skinType === s.id ? "#fff" : ESPRESSO, border: `1px solid ${skinType === s.id ? ESPRESSO : BORDER}`, fontFamily: SANS }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={label} style={{ color: MUTED }}>Tags</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full rounded-lg px-3" style={inputStyle} placeholder="#firsttimer #forehead" />
          </div>
          <TalkVisibilityPicker username={username} named={named} loaded={usernameLoaded} onChange={setNamedChoice} />
          {missing.length > 0 && (
            <div style={{ fontSize: 13, color: MUTED }}>Still to fill in: {missing.join(", ")}.</div>
          )}
          {error && <div style={{ fontSize: 13, fontWeight: 500, color: CRIMSON }}>{error}</div>}
          <button
            onClick={submit}
            disabled={submitting || missing.length > 0}
            className="w-full rounded-full"
            style={{ minHeight: 48, fontSize: 14, fontWeight: 500, background: CRIMSON, color: "#fff", fontFamily: SANS, opacity: submitting || missing.length > 0 ? 0.4 : 1, cursor: submitting || missing.length > 0 ? "not-allowed" : "pointer" }}
          >
            {submitting ? "Posting…" : "Spill the needle"}
          </button>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: MUTED }}>
            {named
              ? `Your post is public on Skintea as @${username}, with your skin type, the treatment and the date.`
              : "Your post is public on Skintea without your name: it shows your skin type, the treatment and the date."}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TreatmentTalkContent({ embedded = false }: { embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const [chip, setChip] = useState("All");
  const [skin, setSkin] = useState("all");
  const [sort, setSort] = useState(SORTS[0].label);
  const [composerOpen, setComposerOpen] = useState(false);
  // Quote tea: the post the composer is quoting, or null for an ordinary post.
  const [quoteTarget, setQuoteTarget] = useState<string | null>(null);
  const { treatments, loading: treatmentsLoading, failed: treatmentsFailed } = useTreatments();
  const userId = useUserId();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    const { data, error } = await supabase
      .from("posts")
      // user_id is never selected: an anonymous post must not carry its author to the browser.
      .select("id, is_named, quoted_post_id, treatment_id, cost, sessions, what_happened, surprised_me, works_for, warn_if, outcome, tags, skin_type, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setPostsError(!!error);
    setPosts(((data ?? []) as unknown as PostRow[]).map((p) => ({ ...p, tags: p.tags ?? [] })));
    setPostsLoading(false);
  }, []);
  useEffect(() => { void loadPosts(); }, [loadPosts]);

  // Saved treatment posts live in saved_posts (post_type 'treatment'; RLS: each user reads and writes only their own).
  useEffect(() => {
    if (!userId) { setSavedIds(new Set()); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase.from("saved_posts").select("post_id").eq("user_id", userId).eq("post_type", "treatment");
      if (alive) setSavedIds(new Set(((data ?? []) as { post_id: string }[]).map((r) => r.post_id)));
    })();
    return () => { alive = false; };
  }, [userId]);

  async function toggleSave(postId: string) {
    if (!userId) { navigate({ to: "/login" }).catch(() => {}); return; }
    setSaveError(null);
    const isSaved = savedIds.has(postId);
    const { error } = isSaved
      ? await supabase.from("saved_posts").delete().eq("user_id", userId).eq("post_id", postId)
      : await supabase.from("saved_posts").insert({ user_id: userId, post_id: postId, post_type: "treatment" });
    if (error) { setSaveError(isSaved ? "Couldn't remove from saved. Try again." : "Couldn't save. Try again."); return; }
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(postId); else next.add(postId);
      return next;
    });
  }

  // One RPC for every post on screen; the floors are applied inside post_vote_split.
  const postIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const { splits, myVotes, vote, error: voteError } = usePostVotes("treatment", postIds, userId);
  const { authors } = useTalkAuthors("treatment", postIds, userId);
  const quotedIds = useMemo(() => posts.map((p) => p.quoted_post_id).filter((v): v is string => !!v), [posts]);
  const { quoted, loaded: quotedLoaded } = useQuotedPosts("treatment", quotedIds, userId);

  const nameById = useMemo(() => new Map(treatments.map((t) => [t.id, t.name])), [treatments]);
  const chipItems = useMemo(() => ["All", ...treatments.map((t) => t.name)], [treatments]);

  const filtered = useMemo(() => {
    return posts
      .filter((p) => (chip === "All" ? true : (p.treatment_id && nameById.get(p.treatment_id)) === chip))
      .filter((p) => (skin === "all" ? true : p.skin_type === skin));
  }, [posts, chip, skin, nameById]);

  // Only the author can delete (RLS "Users can delete their own posts": auth.uid() = user_id). Saved copies are removed
  // by the database (trigger saved_posts_cleanup_on_post_delete), so the post disappears from everyone's Saved Posts.
  async function deletePost(postId: string) {
    if (!userId) return;
    if (!window.confirm("Delete this post? It is removed for everyone and cannot be undone.")) return;
    setSaveError(null);
    // By id alone: the RLS policy (auth.uid() = user_id) is what restricts this to the author's own row.
    const { error, count } = await supabase.from("posts").delete({ count: "exact" }).eq("id", postId);
    if (error || count === 0) { setSaveError(error ? `Couldn't delete: ${error.message}` : "Couldn't delete this post."); return; }
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setSavedIds((prev) => { const next = new Set(prev); next.delete(postId); return next; });
  }

  function openComposer() {
    if (!userId) { navigate({ to: "/login" }).catch(() => {}); return; }
    setQuoteTarget(null);
    setComposerOpen(true);
  }

  // Quote tea: a new post of your own, carrying the quoted post's id.
  function openQuote(postId: string) {
    if (!userId) { navigate({ to: "/login" }).catch(() => {}); return; }
    setQuoteTarget(postId);
    setComposerOpen(true);
  }

  const treatmentChips = treatmentsLoading ? (
    <ChipSkeletonRow />
  ) : treatmentsFailed ? (
    <div className="px-4 pt-1.5 pb-3" style={{ fontSize: 13, color: MUTED }}>Couldn't load treatments. Reload to try again.</div>
  ) : (
    <ChipScroll items={chipItems} active={chip} onChange={setChip} />
  );

  const sectionLabel = { fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: MUTED };

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,700&family=DM+Sans:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      <div className="min-h-screen overflow-x-hidden pb-24 md:pb-8" style={{ background: CREAM, fontFamily: SANS, maxWidth: "100vw" }}>
        <style>{`
          @media (max-width: 767px) {
            .tt-feed { padding: 0; box-sizing: border-box; max-width: 100vw; }
            .tt-main { padding-left: 12px; padding-right: 12px; }
            .tt-section { min-width: 0; }
          }
        `}</style>
        <header className="sticky top-0 z-30" style={{ background: WARM_WHITE, borderBottom: CARD_BORDER }}>
          <div style={{ background: WARM_WHITE }}>
            <div className="px-4 pt-2">
              <div style={sectionLabel}>Treatment</div>
            </div>
            {treatmentChips}
            <div className="px-4">
              <div style={sectionLabel}>Skin type</div>
            </div>
            <div className="flex gap-2 overflow-x-auto px-4 pt-1.5 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {SKIN_TYPES.map((s) => {
                const isActive = skin === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSkin(s.id)}
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
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <main className="tt-main mx-auto max-w-7xl overflow-x-hidden px-4 pt-4">
          <div className="grid gap-6 md:grid-cols-[220px_1fr] lg:grid-cols-[220px_1fr_220px]">
            <aside className="hidden md:block">
              <div className="sticky top-[140px] space-y-4">
                <div className="rounded-2xl p-4" style={{ background: "#fff", border: CARD_BORDER }}>
                  <div className="mb-2" style={sectionLabel}>Treatment</div>
                  {treatmentsLoading ? (
                    <div style={{ fontSize: 13, color: MUTED }}>Loading…</div>
                  ) : treatmentsFailed ? (
                    <div style={{ fontSize: 13, color: MUTED }}>Couldn't load treatments.</div>
                  ) : (
                    <div className="space-y-1">
                      {chipItems.map((t) => {
                        const active = chip === t;
                        return (
                          <button
                            key={t}
                            onClick={() => setChip(t)}
                            className="block w-full rounded-md px-2 text-left"
                            style={{ minHeight: 44, fontSize: 13, background: active ? CREAM : "transparent", color: active ? ESPRESSO : MUTED, fontWeight: active ? 600 : 500 }}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl p-4" style={{ background: "#fff", border: CARD_BORDER }}>
                  <div className="mb-2" style={sectionLabel}>Skin type</div>
                  <div className="flex flex-wrap gap-1.5">
                    {SKIN_TYPES.map((s) => {
                      const active = skin === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSkin(s.id)}
                          className="rounded-full px-3"
                          style={{ minHeight: 44, fontSize: 13, fontWeight: 500, background: active ? ESPRESSO : "#fff", color: active ? "#fff" : ESPRESSO, border: `1px solid ${active ? ESPRESSO : BORDER}` }}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl p-4" style={{ background: "#fff", border: CARD_BORDER }}>
                  <div className="mb-2" style={sectionLabel}>Sort by</div>
                  <div className="relative">
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="w-full appearance-none rounded-md px-2.5"
                      style={{ border: CARD_BORDER, background: "#fff", color: ESPRESSO, minHeight: 44, fontSize: 13 }}
                    >
                      {SORTS.map((s) => (
                        <option key={s.label} value={s.label} disabled={!s.enabled}>
                          {s.enabled ? s.label : `${s.label} (not collected yet)`}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" color={MUTED} />
                  </div>
                </div>
              </div>
            </aside>

            <section className="tt-section min-w-0">
              <div className="mb-4">
                <h1 className="text-2xl md:text-3xl" style={{ fontFamily: DISPLAY, color: ESPRESSO }}>
                  Treatment Talk
                </h1>
              </div>

              {saveError && <div className="mb-3" style={{ fontSize: 13, fontWeight: 500, color: CRIMSON }}>{saveError}</div>}

              <div className="tt-feed space-y-4">
                {postsLoading ? (
                  <div className="rounded-xl p-6 text-center" style={{ background: "#fff", border: CARD_BORDER, color: MUTED, fontSize: 13 }}>
                    Loading…
                  </div>
                ) : postsError ? (
                  <div className="rounded-xl p-6 text-center" style={{ background: "#fff", border: CARD_BORDER, color: MUTED, fontSize: 13 }}>
                    Couldn't load treatment talk. Reload to try again.
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="rounded-xl p-6 text-center" style={{ background: "#fff", border: CARD_BORDER, color: MUTED, fontSize: 13 }}>
                    {posts.length === 0 ? "No treatment talk yet — be the first to share." : "No posts match these filters."}
                  </div>
                ) : (
                  filtered.map((p) => (
                    <PostCard
                      key={p.id}
                      post={p}
                      treatmentName={p.treatment_id ? nameById.get(p.treatment_id) ?? null : null}
                      saved={savedIds.has(p.id)}
                      onToggleSave={() => void toggleSave(p.id)}
                      isOwn={(authors.get(p.id) ?? ANONYMOUS_AUTHOR).isOwn}
                      author={authors.get(p.id) ?? ANONYMOUS_AUTHOR}
                      onDelete={() => void deletePost(p.id)}
                      split={splits.get(p.id) ?? emptySplit(p.id)}
                      myVote={myVotes.get(p.id) ?? null}
                      canVote={!!userId && !(authors.get(p.id) ?? ANONYMOUS_AUTHOR).isOwn}
                      onVote={(v) => void vote(p.id, v)}
                      onSignIn={userId ? undefined : () => { navigate({ to: "/login" }).catch(() => {}); }}
                      voteError={voteError?.postId === p.id ? voteError.message : null}
                      onQuote={() => openQuote(p.id)}
                      quotedBox={p.quoted_post_id
                        ? <TalkQuoteBox quoted={quoted.get(p.quoted_post_id) ?? null} loaded={quotedLoaded} />
                        : null}
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        </main>

        {!embedded && <BottomNav />}

        {composerOpen && userId && (
          <Composer onClose={() => setComposerOpen(false)} treatments={treatments} userId={userId} onCreated={() => void loadPosts()} quotedPostId={quoteTarget} />
        )}

        <button
          onClick={openComposer}
          style={{
            position: "fixed",
            bottom: 72,
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
          Spill the needle
        </button>
      </div>
    </>
  );
}

function TreatmentTalkPage() {
  return <TreatmentTalkContent />;
}
