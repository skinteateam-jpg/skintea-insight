import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Lock, X, ChevronDown, Bookmark, Trash2 } from "lucide-react";

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

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const CREAM = "#FFFCF8";
const WARM_WHITE = "#FFFCF8";
const BORDER = "#E8DDD4";
const MUTED = "#999999";

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
            height: 24,
            background: "#EEE6DC",
          }}
        />
      ))}
    </div>
  );
}

const SKIN_TYPES = [
  { id: "all", label: "All", emoji: "" },
  { id: "oily", label: "Oily", emoji: "🍩" },
  { id: "dry", label: "Dry", emoji: "🏜️" },
  { id: "sensitive", label: "Sensitive", emoji: "🌸" },
  { id: "combo", label: "Combo", emoji: "✨" },
  { id: "normal", label: "Normal", emoji: "🌿" },
];
const SKIN_LABEL: Record<string, string> = Object.fromEntries(SKIN_TYPES.filter((s) => s.id !== "all").map((s) => [s.id, `${s.emoji} ${s.label}`]));

// Only "Most recent" can order the feed. "Most helpful" needs helpful votes and "Most detailed" a detail measure; neither
// is collected, so both stay visible and disabled.
const SORTS: { label: string; enabled: boolean }[] = [
  { label: "Most recent", enabled: true },
  { label: "Most helpful", enabled: false },
  { label: "Most detailed", enabled: false },
];

const SKIN_BG: Record<string, string> = {
  oily: "#FCE7B3",
  dry: "#DCE9F5",
  sensitive: "#F8DCE8",
  combo: "#EDE6F8",
  normal: "#E4F0E4",
};

type Outcome = "would_again" | "modified" | "wouldnt";
const OUTCOMES: { key: Outcome; label: string; bg: string; fg: string; border: string }[] = [
  { key: "would_again", label: "Would do again", bg: "#DDF1DD", fg: "#1F5E2E", border: "#C5E4C5" },
  { key: "modified", label: "Modified", bg: "#FCE7B3", fg: "#7A4E00", border: "#E8C97A" },
  { key: "wouldnt", label: "Wouldn't", bg: "#FBD9DD", fg: "#8B0E20", border: "#F1B8C0" },
];

type PostRow = {
  id: string;
  user_id: string;
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
            className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: isActive ? ESPRESSO : "#fff",
              color: isActive ? "#fff" : ESPRESSO,
              border: `1px solid ${isActive ? ESPRESSO : BORDER}`,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {it}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="tt-field rounded-lg p-2.5" style={{ background: CREAM }}>
      <div
        className="text-[8px] font-bold uppercase tracking-wider"
        style={{ color: MUTED, fontFamily: "'DM Sans', sans-serif" }}
      >
        {label}
      </div>
      <div
        className="tt-field-value mt-1 text-[12px] leading-snug"
        style={{ color: value ? ESPRESSO : MUTED, fontFamily: "'DM Sans', sans-serif", whiteSpace: "pre-line" }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function OutcomeRow({ outcome }: { outcome: Outcome | null }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {OUTCOMES.map((it) => {
        const selected = it.key === outcome;
        return (
          <div
            key={it.key}
            className="rounded-lg px-2 py-2 text-center text-[11px] font-semibold"
            style={{
              background: selected ? it.bg : "#fff",
              color: selected ? it.fg : MUTED,
              border: `1px solid ${selected ? it.border : BORDER}`,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {it.label}
          </div>
        );
      })}
    </div>
  );
}

function PostCard({
  post,
  treatmentName,
  locked,
  saved,
  onToggleSave,
  isOwn,
  onDelete,
}: {
  post: PostRow;
  treatmentName: string | null;
  locked?: boolean;
  saved: boolean;
  onToggleSave: () => void;
  isOwn: boolean;
  onDelete: () => void;
}) {
  const skin = post.skin_type ?? "";
  const avatarBg = SKIN_BG[skin] ?? CREAM;
  return (
    <div className="tt-post-card relative">
      <article
        className="rounded-2xl p-4"
        style={{
          background: locked ? "#F5F0EB" : "#fff",
          border: `1px solid ${BORDER}`,
          boxShadow: "0 1px 2px rgba(28,10,0,0.04)",
        }}
      >
        <div
          style={{
            filter: locked ? "blur(3px)" : "none",
            opacity: locked ? 0.55 : 1,
            pointerEvents: locked ? "none" : "auto",
          }}
        >
          {/* Header: no author name, only the poster's own skin type and the date */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 38, height: 38, background: avatarBg, fontSize: 18 }}
              >
                {SKIN_LABEL[skin]?.split(" ")[0] ?? "☕"}
              </div>
              <div>
                <div className="text-[13px] font-bold" style={{ color: ESPRESSO, fontFamily: "'DM Sans', sans-serif" }}>
                  {SKIN_LABEL[skin] ? `${SKIN_LABEL[skin].split(" ").slice(1).join(" ")} skin` : "Skin type not given"}
                </div>
                <div className="text-[11px]" style={{ color: MUTED, fontFamily: "'DM Sans', sans-serif" }}>
                  {isOwn ? "Your post · " : ""}{new Date(post.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {treatmentName && (
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                  style={{ background: "rgba(28,10,0,0.08)", color: ESPRESSO, fontFamily: "'DM Sans', sans-serif" }}
                >
                  {treatmentName}
                </span>
              )}
              <button onClick={onToggleSave} aria-label={saved ? "Remove from saved" : "Save"} title={saved ? "Saved" : "Save"}>
                <Bookmark size={16} color={saved ? CRIMSON : MUTED} fill={saved ? CRIMSON : "none"} />
              </button>
              {isOwn && (
                <button onClick={onDelete} aria-label="Delete your post" title="Delete your post">
                  <Trash2 size={16} color={CRIMSON} />
                </button>
              )}
            </div>
          </div>

          <div className="tt-fields mt-3 grid grid-cols-2 gap-2">
            <Field label="Cost" value={post.cost} />
            <Field label="Sessions / Area" value={post.sessions} />
            <Field label="What happened" value={post.what_happened} />
            <Field label="What surprised me" value={post.surprised_me} />
            <Field label="Works for" value={post.works_for} />
            <Field label="Warn if" value={post.warn_if} />
          </div>

          <div className="mt-3">
            <OutcomeRow outcome={post.outcome} />
          </div>

          {post.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {post.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full px-2 py-0.5 text-[10px]"
                  style={{ background: CREAM, border: `1px solid ${BORDER}`, color: MUTED, fontFamily: "'DM Sans', sans-serif" }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>

      {/* Members lock: kept for a paid tier. There is no paid tier, so no caller passes locked (no post is ever locked). */}
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div
            className="w-full max-w-sm rounded-2xl p-5 text-center"
            style={{ background: "#fff", border: `1px solid ${BORDER}`, boxShadow: "0 8px 24px rgba(28,10,0,0.12)" }}
          >
            <div className="mx-auto flex items-center justify-center rounded-full" style={{ width: 44, height: 44, background: CREAM }}>
              <Lock size={20} color={ESPRESSO} />
            </div>
            <h3 className="mt-3 text-lg leading-tight" style={{ color: ESPRESSO, fontFamily: "'Playfair Display', serif" }}>
              Members only
            </h3>
            <p className="mt-1.5 text-[12px]" style={{ color: MUTED, fontFamily: "'DM Sans', sans-serif" }}>
              Memberships aren't open yet.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Composer({
  onClose,
  treatments,
  userId,
  onCreated,
}: {
  onClose: () => void;
  treatments: TreatmentOption[];
  userId: string;
  onCreated: () => void;
}) {
  // Treatment, outcome and skin type are the poster's own claims: nothing is pre-chosen.
  const [treatmentId, setTreatmentId] = useState("");
  const [cost, setCost] = useState("");
  const [sessions, setSessions] = useState("");
  const [text, setText] = useState({ what_happened: "", surprised_me: "", works_for: "", warn_if: "" });
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [skinType, setSkinType] = useState<string | null>(null);
  const [tags, setTags] = useState("");
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

  const inputStyle = { border: `1px solid ${BORDER}`, background: "#fff", color: ESPRESSO, fontFamily: "'DM Sans', sans-serif" };
  const label = "mb-1 block text-[11px] font-bold uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" style={{ background: "rgba(28,10,0,0.5)" }}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl md:rounded-3xl" style={{ background: WARM_WHITE }}>
        <div className="sticky top-0 flex items-center justify-between px-5 py-4" style={{ background: WARM_WHITE, borderBottom: `1px solid ${BORDER}` }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: ESPRESSO }} className="text-xl">
            Spill the needle
          </h2>
          <button onClick={onClose} aria-label="Close"><X size={20} color={ESPRESSO} /></button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <label className={label} style={{ color: MUTED }}>Treatment</label>
            <div className="relative">
              <select value={treatmentId} onChange={(e) => setTreatmentId(e.target.value)} className="w-full appearance-none rounded-lg px-3 py-2.5 text-[13px]" style={inputStyle}>
                <option value="" disabled>Choose a treatment</option>
                {treatments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" color={MUTED} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} style={{ color: MUTED }}>Cost</label>
              <input value={cost} onChange={(e) => setCost(e.target.value)} className="w-full rounded-lg px-3 py-2.5 text-[13px]" style={inputStyle} placeholder="What you paid" />
            </div>
            <div>
              <label className={label} style={{ color: MUTED }}>Sessions / Area</label>
              <input value={sessions} onChange={(e) => setSessions(e.target.value)} className="w-full rounded-lg px-3 py-2.5 text-[13px]" style={inputStyle} placeholder="e.g. 1 · forehead" />
            </div>
          </div>
          {([
            ["what_happened", "What happened", "Walk us through it..."],
            ["surprised_me", "What surprised me", "The thing nobody told you..."],
            ["works_for", "Works for", "Who is this actually good for?"],
            ["warn_if", "Warn if", "Red flags or who should skip..."],
          ] as const).map(([key, lab, ph]) => (
            <div key={key}>
              <label className={label} style={{ color: MUTED }}>{lab}</label>
              <textarea rows={2} value={text[key]} onChange={(e) => setText((t) => ({ ...t, [key]: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-[13px]" style={inputStyle} placeholder={ph} />
            </div>
          ))}
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Timeline photos</label>
            <div className="rounded-lg px-3 py-2.5 text-[12px]" style={{ border: `1px dashed ${BORDER}`, background: CREAM, color: MUTED }}>
              Photo uploads aren't open yet. Your written post can go up now.
            </div>
          </div>
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Outcome</label>
            <div className="grid grid-cols-3 gap-2">
              {OUTCOMES.map((o) => (
                <button key={o.key} type="button" onClick={() => setOutcome(o.key)} className="rounded-lg py-2 text-[11px] font-semibold"
                  style={{ border: `1px solid ${outcome === o.key ? o.border : BORDER}`, background: outcome === o.key ? o.bg : "#fff", color: outcome === o.key ? o.fg : ESPRESSO }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Your skin type</label>
            <div className="flex flex-wrap gap-2">
              {SKIN_TYPES.filter((s) => s.id !== "all").map((s) => (
                <button key={s.id} type="button" onClick={() => setSkinType(s.id)} className="rounded-full px-3 py-1.5 text-[11px] font-medium"
                  style={{ background: skinType === s.id ? ESPRESSO : "#fff", color: skinType === s.id ? "#fff" : ESPRESSO, border: `1px solid ${skinType === s.id ? ESPRESSO : BORDER}` }}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={label} style={{ color: MUTED }}>Tags</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full rounded-lg px-3 py-2.5 text-[13px]" style={inputStyle} placeholder="#firsttimer #forehead" />
          </div>
          {missing.length > 0 && (
            <div className="text-[11px]" style={{ color: MUTED }}>Still to fill in: {missing.join(", ")}.</div>
          )}
          {error && <div className="text-[12px] font-semibold" style={{ color: CRIMSON }}>{error}</div>}
          <button
            onClick={submit}
            disabled={submitting || missing.length > 0}
            className="w-full rounded-full py-3 text-[14px] font-bold"
            style={{ background: CRIMSON, color: "#fff", fontFamily: "'DM Sans', sans-serif", opacity: submitting || missing.length > 0 ? 0.4 : 1, cursor: submitting || missing.length > 0 ? "not-allowed" : "pointer" }}
          >
            {submitting ? "Posting…" : "Spill the needle ✦"}
          </button>
          <div className="text-[10px] leading-snug" style={{ color: MUTED }}>
            Your post is public on Skintea without your name: it shows your skin type, the treatment and the date.
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
      .select("id, user_id, treatment_id, cost, sessions, what_happened, surprised_me, works_for, warn_if, outcome, tags, skin_type, created_at")
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
    const { error, count } = await supabase.from("posts").delete({ count: "exact" }).eq("id", postId).eq("user_id", userId);
    if (error || count === 0) { setSaveError(error ? `Couldn't delete: ${error.message}` : "Couldn't delete this post."); return; }
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setSavedIds((prev) => { const next = new Set(prev); next.delete(postId); return next; });
  }

  function openComposer() {
    if (!userId) { navigate({ to: "/login" }).catch(() => {}); return; }
    setComposerOpen(true);
  }

  const treatmentChips = treatmentsLoading ? (
    <ChipSkeletonRow />
  ) : treatmentsFailed ? (
    <div className="px-4 pt-1.5 pb-3 text-[11px]" style={{ color: MUTED }}>Couldn't load treatments. Reload to try again.</div>
  ) : (
    <ChipScroll items={chipItems} active={chip} onChange={setChip} />
  );

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div className="min-h-screen overflow-x-hidden pb-24 md:pb-8" style={{ background: CREAM, fontFamily: "'DM Sans', sans-serif", maxWidth: "100vw" }}>
        <style>{`
          @media (max-width: 767px) {
            .tt-feed { padding: 0; box-sizing: border-box; max-width: 100vw; }
            .tt-post-card { width: 100%; max-width: 100%; overflow: hidden; box-sizing: border-box; }
            .tt-post-card > article { width: 100%; max-width: 100%; box-sizing: border-box; padding: 11px; }
            .tt-fields { display: grid; grid-template-columns: 1fr 1fr; width: 100%; box-sizing: border-box; }
            .tt-field { min-width: 0; box-sizing: border-box; }
            .tt-field, .tt-field-value { word-break: break-word; overflow-wrap: break-word; }
            .tt-main { padding-left: 12px; padding-right: 12px; }
            .tt-section { min-width: 0; }
          }
        `}</style>
        <header className="sticky top-0 z-30" style={{ background: WARM_WHITE, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ background: WARM_WHITE }}>
            <div className="px-4 pt-2">
              <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Treatment</div>
            </div>
            {treatmentChips}
            <div className="px-4">
              <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Skin type</div>
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
                      padding: "5px 12px",
                      fontSize: 10,
                      backgroundColor: isActive ? ESPRESSO : "#fff",
                      color: isActive ? "#fff" : ESPRESSO,
                      border: `1px solid ${isActive ? ESPRESSO : BORDER}`,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {s.emoji && <span className="mr-1">{s.emoji}</span>}
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
                <div className="rounded-2xl p-4" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Treatment</div>
                  {treatmentsLoading ? (
                    <div className="text-[12px]" style={{ color: MUTED }}>Loading…</div>
                  ) : treatmentsFailed ? (
                    <div className="text-[12px]" style={{ color: MUTED }}>Couldn't load treatments.</div>
                  ) : (
                    <div className="space-y-1">
                      {chipItems.map((t) => {
                        const active = chip === t;
                        return (
                          <button
                            key={t}
                            onClick={() => setChip(t)}
                            className="block w-full rounded-md px-2 py-1.5 text-left text-[12px]"
                            style={{ background: active ? CREAM : "transparent", color: active ? ESPRESSO : MUTED, fontWeight: active ? 700 : 500 }}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl p-4" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Skin type</div>
                  <div className="flex flex-wrap gap-1.5">
                    {SKIN_TYPES.map((s) => {
                      const active = skin === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSkin(s.id)}
                          className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                          style={{ background: active ? ESPRESSO : "#fff", color: active ? "#fff" : ESPRESSO, border: `1px solid ${active ? ESPRESSO : BORDER}` }}
                        >
                          {s.emoji && <span className="mr-1">{s.emoji}</span>}
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl p-4" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Sort by</div>
                  <div className="relative">
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="w-full appearance-none rounded-md px-2.5 py-1.5 text-[12px]"
                      style={{ border: `1px solid ${BORDER}`, background: "#fff", color: ESPRESSO }}
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
                <h1 className="text-2xl md:text-3xl" style={{ fontFamily: "'Playfair Display', serif", color: ESPRESSO }}>
                  Treatment Talk
                </h1>
              </div>

              {saveError && <div className="mb-3 text-[12px] font-semibold" style={{ color: CRIMSON }}>{saveError}</div>}

              <div className="tt-feed space-y-4">
                {postsLoading ? (
                  <div className="rounded-xl p-6 text-center text-[12px]" style={{ background: "#fff", border: `1px solid ${BORDER}`, color: MUTED }}>
                    Loading…
                  </div>
                ) : postsError ? (
                  <div className="rounded-xl p-6 text-center text-[12px]" style={{ background: "#fff", border: `1px solid ${BORDER}`, color: MUTED }}>
                    Couldn't load treatment talk. Reload to try again.
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="rounded-xl p-6 text-center text-[12px]" style={{ background: "#fff", border: `1px solid ${BORDER}`, color: MUTED }}>
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
                      isOwn={!!userId && p.user_id === userId}
                      onDelete={() => void deletePost(p.id)}
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        </main>

        {!embedded && <BottomNav />}

        {composerOpen && userId && (
          <Composer onClose={() => setComposerOpen(false)} treatments={treatments} userId={userId} onCreated={() => void loadPosts()} />
        )}

        <button
          onClick={openComposer}
          style={{
            position: "fixed",
            bottom: 72,
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
          Spill the needle ✦
        </button>
      </div>
    </>
  );
}

function TreatmentTalkPage() {
  return <TreatmentTalkContent />;
}
