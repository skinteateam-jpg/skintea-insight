import * as React from "react";
import { createFileRoute, useNavigate, Outlet, useMatchRoute } from "@tanstack/react-router";
import BottomNav from "@/components/BottomNav";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { X, Plus, Search } from "lucide-react";
import TalkPostCard, {
  BORDER, CAPTION, CARD_BORDER, CRIMSON, DISABLED, ESPRESSO, NEUTRAL_FILL, SANS, WARM_WHITE,
  TalkProductModule, TalkRoutineSteps,
} from "@/components/TalkPostCard";
import TalkVoteBlock from "@/components/TalkVoteBlock";
import { profileHref } from "@/lib/talkAuthors";
import TalkQuoteBox from "@/components/TalkQuoteBox";
import { useQuotedPosts } from "@/lib/talkQuotes";
import { emptySplit, usePostVotes } from "@/lib/postVotes";

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

/* Filter and compose tags. The emoji they used to carry are gone: no emoji renders anywhere in the UI. */
const TAGS: { key: TagKey | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "night-out", label: "Night Out" },
  { key: "am-routine", label: "AM Routine" },
  { key: "hot-tea", label: "Hot Tea" },
  { key: "makeup", label: "Makeup" },
  { key: "glazed-skin", label: "Glazed Skin" },
  { key: "warned-you", label: "Warned You" },
];

export const TAG_LABEL: Record<TagKey, string> = {
  "night-out": "Night Out",
  "hot-tea": "Hot Tea",
  review: "Review",
  grwm: "GRWM",
  question: "Question",
  "am-routine": "AM Routine",
  makeup: "Makeup",
  "glazed-skin": "Glazed Skin",
  "warned-you": "Warned You",
};

/* "Warned You" is the one tag that is itself a warning, so it is the one that renders in crimson. */
const WARNING_TAGS = new Set<TagKey>(["warned-you"]);

const POST_TYPE_LABEL: Record<PostType, string> = {
  "skin-tea": "Skin Tea",
  "look-tea": "Look Tea",
  spill: "Spill",
};

/* The same four verdicts the product page's Post tea form offers, so one vocabulary fills
   product_posts.verdict wherever a post is written. "Wouldn't repurchase" is the negative one. */
export const PRODUCT_VERDICTS = ["Repurchased", "Would buy again", "On the fence", "Wouldn't repurchase"] as const;
const NEGATIVE_VERDICTS = new Set<string>(["Wouldn't repurchase"]);

export function verdictStamp(verdict: string | null | undefined): { label: string; tone: "positive" | "negative" } | null {
  const v = (verdict ?? "").trim();
  if (!v) return null;
  return { label: v, tone: NEGATIVE_VERDICTS.has(v) ? "negative" : "positive" };
}

type TaggedProduct = {
  id: string;
  name: string;
  brand: string;
  image?: string;
};

/** One row of public.product_posts, with the product it names joined in. */
export type ProductPost = {
  id: string;
  productId: string | null;
  userId: string;
  /** profiles.username of the author. null when they have not set one — never invented. */
  authorUsername: string | null;
  /** profiles.avatar_url of the author at post time. */
  authorAvatarUrl: string | null;
  /** Quote tea: the Product Talk post this one quotes, or null. */
  quotedPostId: string | null;
  /** The author's own skin type, read from their profile at post time. null when unknown. */
  skinType: string | null;
  headline: string | null;
  body: string;
  verdict: string | null;
  usageDuration: string | null;
  whenToUse: string | null;
  howMuch: string | null;
  watchOut: string | null;
  postType: PostType;
  tag: TagKey | null;
  hashtags: string[];
  steps: { num: number; label: string; product: string }[];
  createdAt: string;
  product: TaggedProduct | null;
};

export const PRODUCT_POST_COLS =
  "id, product_id, user_id, username, avatar_url, skin_type, headline, body, verdict, usage_duration, when_to_use, how_much, watch_out, post_type, tag, hashtags, steps, created_at, quoted_post_id, products(id, name, brand, image_url)";

export function mapProductPost(row: any): ProductPost {
  const p = row?.products ?? null;
  const rawSteps = Array.isArray(row?.steps) ? row.steps : [];
  return {
    id: row.id,
    productId: row.product_id ?? null,
    userId: row.user_id,
    authorUsername: row.username ?? null,
    authorAvatarUrl: row.avatar_url ?? null,
    quotedPostId: row.quoted_post_id ?? null,
    skinType: row.skin_type ?? null,
    headline: row.headline ?? null,
    body: row.body ?? "",
    verdict: row.verdict ?? null,
    usageDuration: row.usage_duration ?? null,
    whenToUse: row.when_to_use ?? null,
    howMuch: row.how_much ?? null,
    watchOut: row.watch_out ?? null,
    postType: (["skin-tea", "look-tea", "spill"] as const).includes(row.post_type) ? row.post_type : "spill",
    tag: row.tag ?? null,
    hashtags: Array.isArray(row.hashtags) ? row.hashtags : [],
    steps: rawSteps
      .filter((s: any) => s && typeof s.label === "string")
      .map((s: any, i: number) => ({ num: Number(s.num) || i + 1, label: String(s.label), product: String(s.product ?? "") })),
    createdAt: row.created_at,
    product: p ? { id: p.id, name: p.name, brand: p.brand ?? "", image: p.image_url ?? undefined } : null,
  };
}

type ComposeStage = "type" | "skin-tea" | "spill";
type SkinTeaMode = "single" | "routine";

type ComposeStep = {
  id: string;
  label: string;
  product: string;
};

const SKIN_STEPS = [
  "Cleanse", "Tone", "Serum", "Moisturize", "SPF",
  "Eye Cream", "Spot Treatment", "Face Oil", "Exfoliate", "Mask",
];

/* Compose-time detail fields are the poster's own words. Nothing is pre-filled:
   usage guidance the poster did not write would ship as their claim. */

/* Skintea's own conversation starters — editorial copy, not user content and not
   a rotating daily feature. One is shown as a prompt, and only alongside a real
   feed. Nothing here is ever injected between posts. */
const PROMPTS = [
  "What's in your 'just in case tonight' bag?",
  "Worst skincare mistake you've ever made?",
  "Drugstore dupe that beat the luxury original?",
  "What's currently sitting on your shelf collecting dust?",
];

/* Tags a poster can pick, mirroring the filter bar so a chosen tag is always
   reachable there. "all" is a filter, not a tag. */
const COMPOSE_TAGS = TAGS.filter((t): t is { key: TagKey; label: string } => t.key !== "all");

/* ---------- Photo uploads ----------

   There is no storage bucket for post photos, and the composer's old picker produced
   blob: URLs, which mean nothing once they are stored and nothing to anyone else. So no
   photo is written. Look Tea's whole point is the face photo, so that type stays closed
   with a notice rather than opening a form that would post a look with no look; Skin Tea
   and Spill say that uploads are not open and post the writing, which is what
   Treatment Talk already does. Remove this block in the same change that adds the bucket. */
const PHOTO_UPLOAD_ENABLED = false;
const PHOTO_NOTICE = "Photo uploads aren't open yet. Your written post can go up now.";

/* ---------- Viewer — the signed-in profile a new post belongs to ---------- */

export type ViewerProfile = {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  /** As stored on the profile ("Combination"). Never normalised into a guess, never invented. */
  skinType: string | null;
};

function useViewerProfile(): { viewer: ViewerProfile | null; loaded: boolean } {
  const [viewer, setViewer] = React.useState<ViewerProfile | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const load = async (userId: string | null) => {
      if (!userId) {
        if (!cancelled) { setViewer(null); setLoaded(true); }
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("username, avatar_url, skin_type")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) console.error("viewer profile fetch failed", error);
      const row = data as { username: string | null; avatar_url: string | null; skin_type: string | null } | null;
      setViewer({
        userId,
        username: row?.username ?? null,
        avatarUrl: row?.avatar_url ?? null,
        skinType: row?.skin_type ?? null,
      });
      setLoaded(true);
    };

    supabase.auth.getSession().then(({ data }) => { void load(data.session?.user?.id ?? null); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      void load(session?.user?.id ?? null);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  return { viewer, loaded };
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

/* ---------- Feed ---------- */

function useProductPosts() {
  const [posts, setPosts] = React.useState<ProductPost[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);

  const load = React.useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("product_posts")
      .select(PRODUCT_POST_COLS)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("product_posts fetch failed", error);
      setFailed(true);
    } else {
      setFailed(false);
      setPosts(((data ?? []) as any[]).map(mapProductPost));
    }
    setLoading(false);
  }, []);

  React.useEffect(() => { void load(); }, [load]);
  return { posts, loading, failed, reload: load, setPosts };
}

/* ---------- Page ---------- */

export function TeaProductsContent({ embedded = false }: { embedded?: boolean } = {}) {
  const [activeTag, setActiveTag] = React.useState<TagKey | "all">("all");
  const { posts, loading, failed, reload, setPosts } = useProductPosts();
  const { viewer } = useViewerProfile();
  const navigate = useNavigate();
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [composePrompt, setComposePrompt] = React.useState<string | undefined>();
  // Quote tea: the post the composer is quoting, or null for an ordinary post.
  const [quoteTarget, setQuoteTarget] = React.useState<string | null>(null);
  const [rowError, setRowError] = React.useState<string | null>(null);

  // One RPC for every post on screen. The 20-vote floor is applied inside post_vote_split, so a
  // closed split arrives with its percentages already absent rather than hidden here.
  const postIds = React.useMemo(() => posts.map((p) => p.id), [posts]);
  const { splits, myVotes, vote, error: voteError } = usePostVotes("product", postIds, viewer?.userId ?? null);
  const quotedIds = React.useMemo(() => posts.map((p) => p.quotedPostId).filter((v): v is string => !!v), [posts]);
  const { quoted, loaded: quotedLoaded } = useQuotedPosts("product", quotedIds, viewer?.userId ?? null);

  // One editorial prompt, shown only alongside a real feed. Not framed as daily:
  // it does not rotate, and nothing here measures a day.
  const featuredPrompt = PROMPTS[0];

  const filtered = activeTag === "all" ? posts : posts.filter((p) => p.tag === activeTag);

  // A signed-out visitor goes to /login rather than being shown a form that cannot write.
  const openCompose = (prompt?: string) => {
    if (!viewer) { void navigate({ to: "/login" }); return; }
    setComposePrompt(prompt);
    setQuoteTarget(null);
    setComposeOpen(true);
  };

  // Quote tea: a new post of your own, carrying the quoted post's id.
  const openQuote = (postId: string) => {
    if (!viewer) { void navigate({ to: "/login" }); return; }
    setComposePrompt(undefined);
    setQuoteTarget(postId);
    setComposeOpen(true);
  };

  async function deletePost(postId: string) {
    if (!viewer) return;
    if (!window.confirm("Delete this post? It is removed for everyone and cannot be undone.")) return;
    setRowError(null);
    const { error, count } = await (supabase as any)
      .from("product_posts").delete({ count: "exact" }).eq("id", postId).eq("user_id", viewer.userId);
    if (error || count === 0) {
      setRowError(error ? `Couldn't delete: ${error.message}` : "Couldn't delete this post.");
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  // The feed is posts and nothing else. Prompt cards are never spliced in — an
  // injected card is not something anyone posted.
  const hasFeed = filtered.length > 0;

  return (
    <div style={{ background: WARM_WHITE, fontFamily: SANS }} className="min-h-screen">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="mx-auto max-w-[480px] pb-32">
        {/* Tag filter bar.
            Sticks under the /tea header rather than fighting it: the header
            publishes its own height as --tea-header-h and sits at a higher
            z-index, and the fallback of 0px is the standalone route. */}
        <div
          className="sticky"
          style={{
            background: WARM_WHITE,
            borderBottom: CARD_BORDER,
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
                  className="whitespace-nowrap rounded-full"
                  style={{
                    minHeight: 44,
                    padding: "0 16px",
                    fontSize: 13,
                    fontWeight: 500,
                    background: active ? ESPRESSO : WARM_WHITE,
                    color: active ? WARM_WHITE : ESPRESSO,
                    border: `1px solid ${active ? ESPRESSO : BORDER}`,
                    fontFamily: SANS,
                    cursor: "pointer",
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
              style={{ background: ESPRESSO, color: WARM_WHITE, borderRadius: 12 }}
            >
              <div className="flex-1">
                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: WARM_WHITE, fontWeight: 500 }}>
                  Skintea prompt
                </p>
                <p className="mt-1" style={{ fontSize: 13, color: WARM_WHITE, lineHeight: 1.4 }}>{featuredPrompt}</p>
              </div>
              <button
                onClick={() => openCompose(featuredPrompt)}
                className="flex-shrink-0"
                style={{
                  background: CRIMSON, color: WARM_WHITE, borderRadius: 999, fontSize: 13,
                  minHeight: 44, padding: "0 18px", fontWeight: 500, border: "none", cursor: "pointer", fontFamily: SANS,
                }}
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
                fontSize: 11, fontWeight: 500, color: CAPTION, textTransform: "uppercase",
                letterSpacing: "0.08em", marginBottom: 10, marginTop: 4,
              }}
            >
              Fresh Tea
            </p>
          )}
          {rowError && <p style={{ fontSize: 13, color: CRIMSON, marginBottom: 10 }}>{rowError}</p>}
          {loading ? (
            <div style={{ background: "#fff", border: CARD_BORDER, borderRadius: 12, padding: 24, textAlign: "center", fontSize: 13, color: CAPTION }}>
              Loading…
            </div>
          ) : failed ? (
            <div style={{ background: "#fff", border: CARD_BORDER, borderRadius: 12, padding: 24, textAlign: "center", fontSize: 13, color: CAPTION }}>
              Couldn't load product talk. Reload to try again.
            </div>
          ) : !hasFeed ? (
            <div style={{ background: "#fff", border: CARD_BORDER, borderRadius: 12, padding: 24, textAlign: "center", fontSize: 13, color: CAPTION }}>
              {posts.length === 0 ? "No product talk yet — be the first to post." : "No posts match this tag."}
            </div>
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((post) => (
              <ProductPostCard
                key={post.id}
                post={post}
                isOwn={!!viewer && viewer.userId === post.userId}
                onOpen={() => navigate({ to: "/tea-products/$postId", params: { postId: post.id } })}
                onDelete={() => void deletePost(post.id)}
                onQuote={() => openQuote(post.id)}
                quotedBox={post.quotedPostId
                  ? <TalkQuoteBox quoted={quoted.get(post.quotedPostId) ?? null} loaded={quotedLoaded} />
                  : null}
                voteBlock={
                  <TalkVoteBlock
                    split={splits.get(post.id) ?? emptySplit(post.id)}
                    myVote={myVotes.get(post.id) ?? null}
                    canVote={!!viewer && viewer.userId !== post.userId}
                    disabledReason={viewer ? "You can't vote on your own post" : "Sign in to vote"}
                    onVote={(v) => void vote(post.id, v)}
                    onSignIn={viewer ? undefined : () => void navigate({ to: "/login" })}
                    error={voteError?.postId === post.id ? voteError.message : null}
                  />
                }
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
          background: CRIMSON,
          color: WARM_WHITE,
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

      {/* Compose sheet */}
      {viewer && (
        <ComposeSheet
          open={composeOpen}
          onOpenChange={setComposeOpen}
          promptContext={composePrompt}
          quotedPostId={quoteTarget}
          viewer={viewer}
          onPosted={() => { setComposeOpen(false); void reload(); setActiveTag("all"); }}
        />
      )}
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

/* ---------- Post card ---------- */

export function ProductPostCard({
  post, isOwn, onOpen, onDelete, voteBlock = null, quotedBox = null, onQuote,
}: {
  post: ProductPost;
  isOwn: boolean;
  onOpen?: () => void;
  onDelete?: () => void;
  voteBlock?: React.ReactNode;
  /** The post this one quotes, already rendered as a TalkQuoteBox. */
  quotedBox?: React.ReactNode;
  /** Opens the composer quoting this post. Without it the action is disabled and says where quoting works. */
  onQuote?: () => void;
}) {
  const tagLabel = post.tag ? TAG_LABEL[post.tag] : null;
  const hasRoutine = post.steps.length > 0;

  return (
    <TalkPostCard
      authorName={post.authorUsername}
      authorAvatarUrl={post.authorAvatarUrl}
      authorHref={post.authorUsername ? profileHref(post.authorUsername) : null}
      isOwn={isOwn}
      skinType={post.skinType}
      createdAt={post.createdAt}
      typeLabel={{
        text: tagLabel ?? POST_TYPE_LABEL[post.postType],
        warning: !!post.tag && WARNING_TAGS.has(post.tag),
      }}
      subject={post.product?.name ?? null}
      verdict={verdictStamp(post.verdict)}
      hook={post.headline}
      body={post.body}
      quoted={quotedBox}
      onOpen={onOpen}
      module={
        <>
          {post.product && (
            <TalkProductModule
              name={post.product.name}
              brand={post.product.brand}
              imageUrl={post.product.image}
              meta={post.usageDuration ? `used ${post.usageDuration}` : null}
            />
          )}
          {hasRoutine && <TalkRoutineSteps steps={post.steps} total={post.steps.length} />}
          {post.hashtags.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 13, color: CAPTION }}>{post.hashtags.join("  ")}</div>
          )}
        </>
      }
      details={[
        { label: "When to use", value: post.whenToUse ?? "" },
        { label: "How much", value: post.howMuch ?? "" },
        { label: "Wish I knew before", value: post.watchOut ?? "", warning: true },
      ]}
      voteBlock={voteBlock}
      reply={{ key: "Reply", label: "Reply", disabled: true, title: "Replies open when commenting does" }}
      quote={onQuote
        ? { key: "Quote", label: "Quote", onClick: onQuote, title: "Quote this post in a post of your own" }
        : { key: "Quote", label: "Quote", disabled: true, title: "Open Product Talk to quote this post" }}
      save={{ key: "Save", disabled: true, title: "Saving product posts isn't built yet" }}
      share={{
        key: "Share",
        title: "Copy a link to this post",
        onClick: () => {
          const url = `${window.location.origin}/tea-products/${post.id}`;
          void navigator.clipboard?.writeText(url).catch(() => {});
        },
      }}
      onDelete={isOwn && onDelete ? onDelete : undefined}
    />
  );
}

/* ---------- Compose sheet ---------- */

/* Top-level helper components for ComposeSheet.
   Extracted out so React doesn't recreate them on every render,
   which would unmount inputs on every keystroke. */

const FIELD_LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 500, color: CAPTION, textTransform: "uppercase",
  letterSpacing: "0.08em", marginBottom: 8,
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%", background: "#fff", border: CARD_BORDER, borderRadius: 10,
  padding: "11px 13px", fontSize: 13, color: ESPRESSO, outline: "none",
  fontFamily: SANS, boxSizing: "border-box", minHeight: 44,
};

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
      setHashtags((prev) => [...prev, `#${tag}`]);
    }
    setHashtagInput("");
  };
  return (
    <>
      <div style={FIELD_LABEL}>Your take</div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        style={{ ...INPUT_STYLE, minHeight: 96, resize: "none", lineHeight: 1.6, marginBottom: 8 }}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
        {hashtags.map((tag) => (
          <div key={tag} style={{ display: "flex", alignItems: "center", gap: 4, background: WARM_WHITE, border: CARD_BORDER, borderRadius: 999, padding: "3px 9px" }}>
            <span style={{ fontSize: 13, color: ESPRESSO }}>{tag}</span>
            <button
              type="button"
              onClick={() => setHashtags((prev) => prev.filter((t) => t !== tag))}
              aria-label={`Remove ${tag}`}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}
            >
              <X size={12} color={CAPTION} />
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <input
          value={hashtagInput}
          onChange={(e) => setHashtagInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); addHashtag(); } }}
          placeholder="add hashtag"
          style={{ ...INPUT_STYLE, flex: 1, borderRadius: 999 }}
        />
        <button
          type="button"
          onClick={addHashtag}
          style={{ background: NEUTRAL_FILL, border: "none", borderRadius: 999, minHeight: 44, padding: "0 16px", fontSize: 13, color: ESPRESSO, cursor: "pointer", fontFamily: SANS }}
        >
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
        <Search size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: CAPTION }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search products"
          style={{ ...INPUT_STYLE, borderRadius: 999, paddingLeft: 36 }}
        />
      </div>
      {/* "Nothing found" is only said once a search has actually finished. */}
      {searchStatus === "done" && searchResults.length === 0 && (
        <div style={{ marginTop: 6, fontSize: 13, color: CAPTION, padding: "0 4px" }}>
          No products match that search.
        </div>
      )}
      {searchResults.length > 0 && (
        <div style={{ marginTop: 6, background: "#fff", border: CARD_BORDER, borderRadius: 12, overflow: "hidden" }}>
          {searchResults.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => onSelect(p)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", minHeight: 44, background: "none", border: "none", borderBottom: CARD_BORDER, cursor: "pointer", fontFamily: SANS }}
            >
              {p.image && <img src={p.image} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />}
              <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: ESPRESSO }}>{p.name}</div>
                <div style={{ fontSize: 13, color: CAPTION }}>{p.brand}</div>
              </div>
              <Plus size={15} color={CAPTION} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HotPickSelected({
  hotPick, setHotPick, search, setSearch, searchResults, searchStatus, onSelect,
}: {
  hotPick: TaggedProduct | null;
  setHotPick: React.Dispatch<React.SetStateAction<TaggedProduct | null>>;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  searchResults: TaggedProduct[];
  searchStatus: ProductSearchState["status"];
  onSelect: (p: TaggedProduct) => void;
}) {
  return hotPick ? (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: CARD_BORDER, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
      {hotPick.image && <img src={hotPick.image} alt="" style={{ width: 38, height: 38, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: ESPRESSO }}>{hotPick.name}</div>
        <div style={{ fontSize: 13, color: CAPTION }}>{hotPick.brand}</div>
      </div>
      <button type="button" onClick={() => setHotPick(null)} aria-label="Remove product" style={{ background: "none", border: "none", cursor: "pointer", minWidth: 44, minHeight: 44 }}>
        <X size={16} color={CAPTION} />
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
      <div style={FIELD_LABEL}>Tag — optional</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {COMPOSE_TAGS.map((t) => {
          const on = tag === t.key;
          return (
            <button
              type="button"
              key={t.key}
              onClick={() => setTag(on ? null : t.key)}
              style={{
                fontSize: 13, minHeight: 44, padding: "0 14px", borderRadius: 999, cursor: "pointer",
                fontFamily: SANS,
                background: on ? ESPRESSO : "#fff",
                color: on ? WARM_WHITE : ESPRESSO,
                border: `1px solid ${on ? ESPRESSO : BORDER}`,
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

function VerdictPicker({
  verdict, setVerdict,
}: {
  verdict: string | null;
  setVerdict: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={FIELD_LABEL}>Your verdict — optional</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {PRODUCT_VERDICTS.map((v) => {
          const on = verdict === v;
          const negative = NEGATIVE_VERDICTS.has(v);
          const tone = negative ? CRIMSON : ESPRESSO;
          return (
            <button
              type="button"
              key={v}
              onClick={() => setVerdict(on ? null : v)}
              style={{
                fontSize: 13, minHeight: 44, padding: "0 14px", borderRadius: 999, cursor: "pointer",
                fontFamily: SANS,
                background: on ? tone : "#fff",
                color: on ? WARM_WHITE : tone,
                border: `1px solid ${on ? tone : BORDER}`,
              }}
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Photo uploads are not open. The slot stays on screen and says so, instead of a picker that drops what it takes. */
function PhotoNotice() {
  if (PHOTO_UPLOAD_ENABLED) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={FIELD_LABEL}>Photo</div>
      <div style={{ border: `1px dashed ${BORDER}`, background: WARM_WHITE, borderRadius: 10, padding: "12px 13px", fontSize: 13, color: CAPTION, lineHeight: 1.5 }}>
        {PHOTO_NOTICE}
      </div>
    </div>
  );
}

function StepBuilder({
  steps, setSteps, showStepPicker, setShowStepPicker,
}: {
  steps: ComposeStep[];
  setSteps: React.Dispatch<React.SetStateAction<ComposeStep[]>>;
  showStepPicker: boolean;
  setShowStepPicker: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const addStep = (label: string) => {
    setSteps((prev) => [...prev, { id: Math.random().toString(36).slice(2), label, product: "" }]);
    setShowStepPicker(false);
  };
  const updateStepProduct = (id: string, value: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, product: value } : s)));
  };
  const removeStep = (id: string) => setSteps((prev) => prev.filter((s) => s.id !== id));
  const available = SKIN_STEPS.filter((s) => !steps.find((st) => st.label === s));

  return (
    <div style={{ marginBottom: 14 }}>
      {steps.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 }}>
          {steps.map((step, i) => (
            <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 9, background: "#fff", border: CARD_BORDER, borderRadius: 10, padding: "9px 11px" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", border: `1px solid ${ESPRESSO}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: ESPRESSO, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: CAPTION, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{step.label}</div>
                <input
                  value={step.product}
                  onChange={(e) => updateStepProduct(step.id, e.target.value)}
                  placeholder="product name"
                  style={{ fontSize: 13, color: ESPRESSO, background: "none", border: "none", width: "100%", outline: "none", fontFamily: SANS }}
                />
              </div>
              <button type="button" onClick={() => removeStep(step.id)} aria-label={`Remove ${step.label}`} style={{ background: "none", border: "none", cursor: "pointer", minWidth: 44, minHeight: 44 }}>
                <X size={14} color={CAPTION} />
              </button>
            </div>
          ))}
        </div>
      )}
      {!showStepPicker ? (
        <button
          type="button"
          onClick={() => setShowStepPicker(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: NEUTRAL_FILL, border: "none", borderRadius: 999, minHeight: 44, padding: "0 16px", fontSize: 13, color: ESPRESSO, cursor: "pointer", fontFamily: SANS }}
        >
          <Plus size={14} color={ESPRESSO} /> Add step
        </button>
      ) : (
        <div style={{ background: "#fff", border: CARD_BORDER, borderRadius: 12, overflow: "hidden" }}>
          {available.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => addStep(s)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "0 12px", minHeight: 44, background: "none", border: "none", borderBottom: CARD_BORDER, cursor: "pointer", fontFamily: SANS }}
            >
              <span style={{ fontSize: 13, color: ESPRESSO }}>{s}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowStepPicker(false)}
            style={{ width: "100%", minHeight: 44, fontSize: 13, color: CAPTION, background: "none", border: "none", cursor: "pointer", fontFamily: SANS }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function ComposeSheet({
  open, onOpenChange, promptContext, quotedPostId = null, viewer, onPosted,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  promptContext?: string;
  /** Quote tea: the post this new post quotes. Written to quoted_post_id; the database checks it exists. */
  quotedPostId?: string | null;
  viewer: ViewerProfile;
  onPosted: () => void;
}) {
  const { quoted: quotedMap, loaded: quotedLoaded } = useQuotedPosts("product", quotedPostId ? [quotedPostId] : [], viewer.userId);
  const quotePreview = quotedPostId ? (
    <div style={{ marginBottom: 14 }}>
      <div style={FIELD_LABEL}>Quoting</div>
      <TalkQuoteBox quoted={quotedMap.get(quotedPostId) ?? null} loaded={quotedLoaded} />
    </div>
  ) : null;
  const [stage, setStage] = React.useState<ComposeStage>("type");
  const [skinTeaMode, setSkinTeaMode] = React.useState<SkinTeaMode>("single");
  const [tag, setTag] = React.useState<TagKey | null>(null);
  const [verdict, setVerdict] = React.useState<string | null>(null);
  const [text, setText] = React.useState("");
  const [hashtags, setHashtags] = React.useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [hotPick, setHotPick] = React.useState<TaggedProduct | null>(null);
  const [steps, setSteps] = React.useState<ComposeStep[]>([]);
  const [showStepPicker, setShowStepPicker] = React.useState(false);
  const [lookClosedOpen, setLookClosedOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  // Every detail field starts empty. Pre-filled usage guidance would ship as the
  // poster's own claim about a product.
  const [details, setDetails] = React.useState({ whenChoice: "", howMuch: "", watchOut: "", timelineChoice: "" });

  // The sheet is reset when it opens, never while it is open: a failed insert must leave
  // everything the poster typed exactly where it is.
  React.useEffect(() => {
    if (!open) return;
    setStage("type");
    setSkinTeaMode("single");
    setTag(null);
    setVerdict(null);
    setText("");
    setHashtags([]);
    setHashtagInput("");
    setSearch("");
    setHotPick(null);
    setSteps([]);
    setShowStepPicker(false);
    setLookClosedOpen(false);
    setSubmitting(false);
    setSubmitError(null);
    setDetails({ whenChoice: "", howMuch: "", watchOut: "", timelineChoice: "" });
  }, [open]);

  // Results come from the `products` table, debounced — there is no local catalogue.
  const { results: searchResults, status: searchStatus } = useProductSearch(search);

  const selectHotPick = (product: TaggedProduct) => {
    setHotPick(product);
    setSearch("");
    // No autofill: the detail fields stay empty until the poster writes them.
  };

  /**
   * The one write. Everything about the author comes from their own profile — an unknown
   * username or skin type stays null rather than being guessed — and the row is inserted as
   * the signed-in user, which is what RLS and enforce_signed_in_author both require.
   */
  async function submit(postType: PostType) {
    if (submitting) return;
    const body = text.trim();
    if (!body) return;
    setSubmitting(true);
    setSubmitError(null);

    const routineSteps = postType === "skin-tea" && skinTeaMode === "routine"
      ? steps.map((s, i) => ({ num: i + 1, label: s.label, product: s.product.trim() || s.label }))
      : [];

    const { error } = await (supabase as any).from("product_posts").insert({
      product_id: hotPick?.id ?? null,
      user_id: viewer.userId,
      username: viewer.username,
      avatar_url: viewer.avatarUrl,
      skin_type: viewer.skinType,
      headline: promptContext ? promptContext.trim() : null,
      body,
      verdict: verdict,
      usage_duration: details.timelineChoice || null,
      when_to_use: details.whenChoice || null,
      how_much: details.howMuch.trim() || null,
      watch_out: details.watchOut.trim() || null,
      post_type: postType,
      tag,
      hashtags,
      steps: routineSteps,
      // No photo is written: there is no bucket, and a blob: URL is meaningless to anyone else.
      photo_urls: [],
      quoted_post_id: quotedPostId ?? null,
    });

    setSubmitting(false);
    // On failure the sheet stays open with everything the poster typed.
    if (error) { setSubmitError(`Couldn't post: ${error.message}`); return; }
    onPosted();
  }

  const BackBtn = ({ to }: { to: ComposeStage }) => (
    <button
      type="button"
      onClick={() => setStage(to)}
      aria-label="Back"
      style={{ background: "none", border: "none", cursor: "pointer", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center" }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ESPRESSO} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );

  const SheetHead = ({ title, backTo }: { title: string; backTo?: ComposeStage }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderBottom: CARD_BORDER, flexShrink: 0 }}>
      {backTo && <BackBtn to={backTo} />}
      <span style={{ fontSize: 16, fontWeight: 500, color: ESPRESSO, flex: 1, fontFamily: SANS }}>{title}</span>
      {!backTo && (
        <button type="button" onClick={() => onOpenChange(false)} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", minWidth: 44, minHeight: 44 }}>
          <X size={18} color={ESPRESSO} />
        </button>
      )}
    </div>
  );

  const textBlockProps = { text, setText, hashtags, setHashtags, hashtagInput, setHashtagInput };
  const hotPickPropsBase = { hotPick, setHotPick, search, setSearch, searchResults, searchStatus, onSelect: selectHotPick };

  const spillReady = !!text.trim() && !submitting;
  const skinTeaReady = !!text.trim() && !!hotPick && !submitting;

  const submitBar = (label: string, ready: boolean, onClick: () => void) => (
    <div style={{ padding: "10px 16px 16px", borderTop: CARD_BORDER, background: WARM_WHITE }}>
      {submitError && <div style={{ fontSize: 13, color: CRIMSON, marginBottom: 8 }}>{submitError}</div>}
      <button
        type="button"
        disabled={!ready}
        onClick={onClick}
        style={{
          width: "100%", background: ready ? CRIMSON : NEUTRAL_FILL, color: ready ? WARM_WHITE : DISABLED,
          border: "none", borderRadius: 999, minHeight: 48, fontSize: 14, fontWeight: 500,
          cursor: ready ? "pointer" : "not-allowed", fontFamily: SANS,
        }}
      >
        {submitting ? "Posting…" : label}
      </button>
      <div style={{ fontSize: 13, color: CAPTION, lineHeight: 1.5, marginTop: 10 }}>
        Your post is public on Skintea{viewer.username ? ` as ${viewer.username}` : " without a name"}.
      </div>
    </div>
  );

  const TYPE_OPTIONS = [
    /* `example` is a made-up illustration of the format, so it is labelled as an example
       and never rendered inside quotation marks — nobody said these words. */
    { type: "skin-tea" as const, label: "Skin Tea", desc: "Skincare — one product, a full routine, skin prep, ingredients. Anything about your skin.", example: "Example: two weeks on this niacinamide and my t-zone is actually calm", open: true },
    { type: "look-tea" as const, label: "Look Tea", desc: "A makeup look — show your face, then break down how you built it.", example: "Photo uploads aren't open yet, and a look with no look isn't a Look Tea.", open: false },
    { type: "spill" as const, label: "Spill", desc: "Raw honest take — warning, hot opinion, experience others need to know. No steps needed.", example: "Example: nobody warned me tretinoin makes you look worse for 3 months", open: true },
  ];

  const TypeStage = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <SheetHead title="What are you spilling?" />
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {quotePreview}
        {promptContext && (
          <div style={{ background: WARM_WHITE, border: CARD_BORDER, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
            <div style={{ ...FIELD_LABEL, marginBottom: 3 }}>Replying to</div>
            <div style={{ fontSize: 13, color: ESPRESSO }}>{promptContext}</div>
          </div>
        )}
        {TYPE_OPTIONS.map((opt) => (
          <button
            type="button"
            key={opt.type}
            onClick={() => (opt.open ? setStage(opt.type as ComposeStage) : setLookClosedOpen(true))}
            style={{
              width: "100%", background: "#fff", border: CARD_BORDER, borderRadius: 12, padding: "14px 16px",
              marginBottom: 10, textAlign: "left", cursor: "pointer", fontFamily: SANS,
              opacity: opt.open ? 1 : 0.65,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: ESPRESSO, marginBottom: 7 }}>
              {opt.label}{!opt.open && " — not open yet"}
            </div>
            <div style={{ fontSize: 13, color: ESPRESSO, lineHeight: 1.5, marginBottom: 5 }}>{opt.desc}</div>
            <div style={{ fontSize: 13, color: CAPTION }}>{opt.example}</div>
          </button>
        ))}
        {lookClosedOpen && (
          <div style={{ background: WARM_WHITE, border: CARD_BORDER, borderRadius: 10, padding: "12px 13px", fontSize: 13, color: ESPRESSO, lineHeight: 1.5 }}>
            Look Tea needs a photo of your look, and photo uploads aren't open yet. Nothing you type here would be lost,
            because there is no form to fill in. Skin Tea and Spill post now.
          </div>
        )}
      </div>
    </div>
  );

  const SkinTeaStage = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <SheetHead title="Skin Tea" backTo="type" />
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {quotePreview}
        <div style={{ display: "flex", background: NEUTRAL_FILL, borderRadius: 10, padding: 3, marginBottom: 16 }}>
          {(["single", "routine"] as SkinTeaMode[]).map((mode) => (
            <button
              type="button"
              key={mode}
              onClick={() => setSkinTeaMode(mode)}
              style={{
                flex: 1, minHeight: 44, borderRadius: 8, border: "none",
                fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: SANS,
                background: skinTeaMode === mode ? "#fff" : "transparent",
                color: skinTeaMode === mode ? ESPRESSO : CAPTION,
              }}
            >
              {mode === "single" ? "Single product" : "Full routine"}
            </button>
          ))}
        </div>

        <PhotoNotice />
        <TextHashtagBlock {...textBlockProps} placeholder="what did this actually do for your skin?" />

        {skinTeaMode === "single" ? (
          <>
            <div style={FIELD_LABEL}>The product</div>
            <HotPickSelected {...hotPickPropsBase} />

            {hotPick && (
              <>
                <div style={FIELD_LABEL}>When to use</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  {["AM", "PM", "AM + PM"].map((opt) => {
                    const on = details.whenChoice === opt;
                    return (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => setDetails((prev) => ({ ...prev, whenChoice: on ? "" : opt }))}
                        style={{ fontSize: 13, minHeight: 44, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontFamily: SANS, background: on ? ESPRESSO : "#fff", color: on ? WARM_WHITE : ESPRESSO, border: `1px solid ${on ? ESPRESSO : BORDER}` }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                <div style={FIELD_LABEL}>How much</div>
                <input
                  value={details.howMuch}
                  placeholder="how much you used"
                  onChange={(e) => setDetails((prev) => ({ ...prev, howMuch: e.target.value }))}
                  style={{ ...INPUT_STYLE, marginBottom: 14 }}
                />

                <div style={{ ...FIELD_LABEL, color: CRIMSON }}>Wish I knew before</div>
                <input
                  value={details.watchOut}
                  placeholder="anything you'd warn someone about"
                  onChange={(e) => setDetails((prev) => ({ ...prev, watchOut: e.target.value }))}
                  style={{ ...INPUT_STYLE, marginBottom: 14 }}
                />

                <div style={FIELD_LABEL}>How long you used it</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  {["1 week", "2 weeks", "1 month", "3 months", "ongoing"].map((opt) => {
                    const on = details.timelineChoice === opt;
                    return (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => setDetails((prev) => ({ ...prev, timelineChoice: on ? "" : opt }))}
                        style={{ fontSize: 13, minHeight: 44, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontFamily: SANS, background: on ? ESPRESSO : "#fff", color: on ? WARM_WHITE : ESPRESSO, border: `1px solid ${on ? ESPRESSO : BORDER}` }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div style={FIELD_LABEL}>Routine steps</div>
            <StepBuilder steps={steps} setSteps={setSteps} showStepPicker={showStepPicker} setShowStepPicker={setShowStepPicker} />
            <div style={FIELD_LABEL}>Standout product of this routine</div>
            <HotPickSelected {...hotPickPropsBase} />
          </>
        )}
        <VerdictPicker verdict={verdict} setVerdict={setVerdict} />
        <TagPicker tag={tag} setTag={setTag} />
      </div>
      {submitBar(hotPick ? "Post Skin Tea" : "Add a product to post", skinTeaReady, () => void submit("skin-tea"))}
    </div>
  );

  const SpillStage = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <SheetHead title="Spill" backTo="type" />
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {quotePreview}
        <div style={{ background: WARM_WHITE, border: CARD_BORDER, borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 13, color: ESPRESSO, lineHeight: 1.5 }}>
          Raw and honest. No product required. Just say what others won't.
        </div>
        <TextHashtagBlock {...textBlockProps} placeholder="nobody warned me… / hot take: … / don't do this…" />
        <PhotoNotice />
        <div style={FIELD_LABEL}>Product mentioned — optional</div>
        <HotPickSelected {...hotPickPropsBase} />
        <VerdictPicker verdict={verdict} setVerdict={setVerdict} />
        <TagPicker tag={tag} setTag={setTag} />
      </div>
      {submitBar("Post Spill", spillReady, () => void submit("spill"))}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto h-[90vh] max-w-[480px] overflow-hidden rounded-t-3xl border-0 p-0"
        style={{ background: WARM_WHITE }}
      >
        {stage === "type" && TypeStage}
        {stage === "skin-tea" && SkinTeaStage}
        {stage === "spill" && SpillStage}
      </SheetContent>
    </Sheet>
  );
}
