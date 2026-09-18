import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const CRIMSON = "#A8001C";
const BORDER = "#E8DDD4";
const MUTED = "#999999";
const ESPRESSO = "#1C0A00";
const CREAM_TINT = "#F5EFEC";

/**
 * Tea tab on a treatment page: members' own posts about this treatment (public.posts).
 *
 * Nothing here is counted. These posts never enter Worth it, a floor, a median or any figure;
 * treatmentReviews.ts and opinionAggregate.ts do not read this table.
 *
 * Every value comes from a column the member filled in. A column with no value renders nothing —
 * no empty labelled block, no inferred cost, sessions or skin type, and no verdict derived from
 * the text. "First time" / "Had it before" exists in no column, so it is read from `tags` and is
 * written only by the choice the member made in the form below.
 */

export const FIRST_TIME_TAG = "#first-time";
export const REPEAT_TAG = "#had-it-before";

// Named or anonymous is the member's own choice, never inferred, and anonymous is the default (Chi, 2026-09-17).
// It decides whether a real person's name sits next to a post about surgery or injectables, so it is a column the
// database enforces, `posts.is_named` (boolean, not null, default false) — never a string convention in `tags`.
//
// The column exists since 2026-09-18 (Chi's go), with trigger `posts_named_requires_username`: the database rejects
// is_named = true for a member with no username, so the form's rule below is enforced server-side as well.
// Setting HAS_IS_NAMED_COLUMN back to false hides the named option and stops reading the column.
export const HAS_IS_NAMED_COLUMN = true;
export const isNamedPost = (p: { is_named?: boolean | null }) => p.is_named === true;

type Outcome = "would_again" | "modified" | "wouldnt";
const OUTCOMES: { key: Outcome; label: string; bg: string; fg: string; border: string }[] = [
  { key: "would_again", label: "Would do again", bg: "#DDF1DD", fg: "#1F5E2E", border: "#C5E4C5" },
  { key: "modified", label: "Modified", bg: "#FCE7B3", fg: "#7A4E00", border: "#E8C97A" },
  { key: "wouldnt", label: "Wouldn't", bg: "#FBD9DD", fg: "#8B0E20", border: "#F1B8C0" },
];
const SKIN_TYPES = ["oily", "dry", "sensitive", "combo", "normal"];
const SKIN_LABEL: Record<string, string> = {
  oily: "Oily", dry: "Dry", sensitive: "Sensitive", combo: "Combo", normal: "Normal",
};

export type TeaPostRow = {
  id: string;
  user_id: string;
  cost: string | null;
  sessions: string | null;
  what_happened: string | null;
  surprised_me: string | null;
  works_for: string | null;
  warn_if: string | null;
  outcome: Outcome | null;
  tags: string[] | null;
  skin_type: string | null;
  created_at: string;
  is_named?: boolean | null; // read only once HAS_IS_NAMED_COLUMN is true
};

export type TeaAuthor = { username: string | null; avatarUrl: string | null };

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function initials(username: string | null) {
  const cleaned = (username ?? "").replace(/^@/, "").trim();
  return cleaned ? cleaned.slice(0, 2).toUpperCase() : "·";
}

const inputStyle: React.CSSProperties = {
  border: `1px solid ${BORDER}`, background: "#FFFFFF", color: ESPRESSO,
  fontFamily: "inherit", boxSizing: "border-box", width: "100%",
};

function Answer({ label, value }: { label: string; value: string | null }) {
  if (!value || !value.trim()) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 10, color: MUTED, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: ESPRESSO, lineHeight: 1.55, whiteSpace: "pre-line" }}>{value}</div>
    </div>
  );
}

export default function TreatmentTea({
  treatmentId, posts, authors, userId, viewerUsername, onPosted, onLoginNeeded,
}: {
  treatmentId: string;
  posts: TeaPostRow[];
  authors: Record<string, TeaAuthor>;
  userId: string | null;
  // The signed-in member's own username, read from their profile (not from post authors, which misses a first post).
  viewerUsername: string | null;
  onPosted: () => void;
  onLoginNeeded: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "first" | "repeat">("all");
  const [showForm, setShowForm] = useState(false);
  const [more, setMore] = useState(false);
  const [whatHappened, setWhatHappened] = useState("");
  const [surprisedMe, setSurprisedMe] = useState("");
  const [worksFor, setWorksFor] = useState("");
  const [warnIf, setWarnIf] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [cost, setCost] = useState("");
  const [sessions, setSessions] = useState("");
  const [skinType, setSkinType] = useState<string | null>(null);
  const [timesTag, setTimesTag] = useState<string | null>(null);
  // Anonymous is preselected, always. A member with no username cannot choose named.
  const [postNamed, setPostNamed] = useState(false);
  const myUsername = userId && viewerUsername && viewerUsername.trim() ? viewerUsername : null;
  const canPostNamed = HAS_IS_NAMED_COLUMN && !!myUsername;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = posts.filter((p) => {
    if (filter === "all") return true;
    const tags = p.tags ?? [];
    return tags.includes(filter === "first" ? FIRST_TIME_TAG : REPEAT_TAG);
  });

  async function submit() {
    if (!userId) { onLoginNeeded(); return; }
    if (!whatHappened.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    const { error: insertError } = await (supabase as any).from("posts").insert({
      user_id: userId,
      treatment_id: treatmentId,
      what_happened: whatHappened.trim(),
      surprised_me: surprisedMe.trim() || null,
      works_for: worksFor.trim() || null,
      warn_if: warnIf.trim() || null,
      outcome,
      cost: cost.trim() || null,
      sessions: sessions.trim() || null,
      skin_type: skinType,
      tags: timesTag ? [timesTag] : [],
      // Named only when the member chose it and has a username; the trigger rejects anything else.
      is_named: HAS_IS_NAMED_COLUMN && postNamed && !!myUsername,
    });
    setSubmitting(false);
    // On failure the form stays open with everything the member typed.
    if (insertError) { setError(`Couldn't post: ${insertError.message}`); return; }
    setShowForm(false); setMore(false);
    setWhatHappened(""); setSurprisedMe(""); setWorksFor(""); setWarnIf("");
    setOutcome(null); setCost(""); setSessions(""); setSkinType(null); setTimesTag(null); setPostNamed(false);
    onPosted();
  }

  return (
    <div>
      <div style={{ padding: "12px 16px", borderBottom: `0.5px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 12, color: MUTED }}>
          {posts.length} {posts.length === 1 ? "post" : "posts"} about this treatment
        </span>
        <button
          type="button"
          onClick={() => (userId ? setShowForm(true) : onLoginNeeded())}
          style={{ background: ESPRESSO, color: "#FFFCF8", border: "none", borderRadius: 20, padding: "7px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >
          Post tea
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, padding: "10px 16px", borderBottom: `0.5px solid ${BORDER}`, overflowX: "auto" }}>
        {([["all", "All"], ["first", "First time"], ["repeat", "Had it before"]] as const).map(([key, label]) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              style={{
                flex: "none", borderRadius: 20, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                border: `1px solid ${active ? ESPRESSO : BORDER}`, background: active ? ESPRESSO : "transparent",
                color: active ? "#FFFCF8" : ESPRESSO, fontWeight: active ? 600 : 400,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {showForm && (
        <div style={{ padding: 16, borderBottom: `0.5px solid ${BORDER}`, background: CREAM_TINT }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: CRIMSON, marginBottom: 10 }}>
            Post your tea
          </div>
          <textarea
            value={whatHappened}
            onChange={(e) => setWhatHappened(e.target.value)}
            rows={5}
            placeholder="What happened? Your own words."
            style={{ ...inputStyle, borderRadius: 10, padding: "10px 12px", fontSize: 13, resize: "none" }}
          />
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10.5, color: MUTED, marginBottom: 4 }}>Post as</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {([[false, "Anonymous"], [true, myUsername ? `@${myUsername}` : "My username"]] as const).map(([value, label]) => {
                const active = postNamed === value;
                const disabled = value === true && !canPostNamed;
                return (
                  <button
                    key={String(value)}
                    type="button"
                    disabled={disabled}
                    onClick={() => setPostNamed(value)}
                    style={{ borderRadius: 20, padding: "5px 11px", fontSize: 11, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
                      border: `1px solid ${active ? ESPRESSO : BORDER}`, background: active ? ESPRESSO : "#FFFFFF",
                      color: active ? "#FFFCF8" : disabled ? MUTED : ESPRESSO, opacity: disabled ? 0.6 : 1 }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 4, lineHeight: 1.45 }}>
              {!HAS_IS_NAMED_COLUMN
                ? "Posting under your name is not switched on yet, so this post will be anonymous."
                : !myUsername
                ? "Set a username on your profile to post under your name. Without one, this post will be anonymous."
                : "Anonymous posts show no name, no avatar and no link to your profile."}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMore((v) => !v)}
            style={{ marginTop: 10, background: "none", border: "none", padding: 0, color: CRIMSON, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            {more ? "Hide extras" : "Add more (optional)"}
          </button>

          {more && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              {([["What surprised me", surprisedMe, setSurprisedMe], ["Who it works for", worksFor, setWorksFor], ["What I'd warn about", warnIf, setWarnIf]] as const).map(([label, value, set]) => (
                <div key={label}>
                  <div style={{ fontSize: 10.5, color: MUTED, marginBottom: 3 }}>{label}</div>
                  <textarea value={value} onChange={(e) => (set as (v: string) => void)(e.target.value)} rows={2}
                    style={{ ...inputStyle, borderRadius: 10, padding: "9px 12px", fontSize: 12.5, resize: "none" }} />
                </div>
              ))}
              <div>
                <div style={{ fontSize: 10.5, color: MUTED, marginBottom: 3 }}>Outcome</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {OUTCOMES.map((o) => (
                    <button key={o.key} type="button" onClick={() => setOutcome(outcome === o.key ? null : o.key)}
                      style={{ borderRadius: 20, padding: "5px 11px", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                        border: `1px solid ${outcome === o.key ? o.border : BORDER}`, background: outcome === o.key ? o.bg : "#FFFFFF",
                        color: outcome === o.key ? o.fg : ESPRESSO }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10.5, color: MUTED, marginBottom: 3 }}>Cost</div>
                  <input value={cost} onChange={(e) => setCost(e.target.value)} placeholder="what you paid"
                    style={{ ...inputStyle, borderRadius: 10, padding: "9px 12px", fontSize: 12.5 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10.5, color: MUTED, marginBottom: 3 }}>Sessions</div>
                  <input value={sessions} onChange={(e) => setSessions(e.target.value)} placeholder="how many"
                    style={{ ...inputStyle, borderRadius: 10, padding: "9px 12px", fontSize: 12.5 }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: MUTED, marginBottom: 3 }}>Skin type</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {SKIN_TYPES.map((s) => (
                    <button key={s} type="button" onClick={() => setSkinType(skinType === s ? null : s)}
                      style={{ borderRadius: 20, padding: "5px 11px", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                        border: `1px solid ${skinType === s ? ESPRESSO : BORDER}`, background: skinType === s ? ESPRESSO : "#FFFFFF",
                        color: skinType === s ? "#FFFCF8" : ESPRESSO }}>
                      {SKIN_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: MUTED, marginBottom: 3 }}>Was this your first time?</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {([[FIRST_TIME_TAG, "First time"], [REPEAT_TAG, "Had it before"]] as const).map(([tag, label]) => (
                    <button key={tag} type="button" onClick={() => setTimesTag(timesTag === tag ? null : tag)}
                      style={{ borderRadius: 20, padding: "5px 11px", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                        border: `1px solid ${timesTag === tag ? ESPRESSO : BORDER}`, background: timesTag === tag ? ESPRESSO : "#FFFFFF",
                        color: timesTag === tag ? "#FFFCF8" : ESPRESSO }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && <div role="alert" style={{ fontSize: 12, color: CRIMSON, marginTop: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" onClick={() => { setShowForm(false); setError(null); }}
              style={{ flex: 1, padding: 10, background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, color: MUTED, cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
            <button type="button" onClick={() => void submit()} disabled={!whatHappened.trim() || submitting}
              style={{ flex: 2, padding: 10, background: CRIMSON, color: "#FFFCF8", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: !whatHappened.trim() ? 0.5 : 1 }}>
              {submitting ? "Posting…" : "Post tea"}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ padding: "40px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: MUTED }}>
            {posts.length === 0 ? "No one has posted about this treatment yet." : "No posts match this filter."}
          </div>
          {posts.length === 0 && <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Be the first.</div>}
        </div>
      ) : (
        <div>
          {filtered.map((p) => {
            const author = authors[p.user_id] ?? { username: null, avatarUrl: null };
            const tags = p.tags ?? [];
            const meta = [
              p.skin_type ? SKIN_LABEL[p.skin_type] ?? p.skin_type : null,
              p.sessions ? `${p.sessions} sessions` : null,
              p.cost,
              tags.includes(FIRST_TIME_TAG) ? "First time" : tags.includes(REPEAT_TAG) ? "Had it before" : null,
              formatDate(p.created_at),
            ].filter(Boolean) as string[];
            // An anonymous post carries no avatar, no username and no link: nothing that leads back to a profile.
            const named = isNamedPost(p) && !!author.username;
            const outcomeChip = p.outcome ? OUTCOMES.find((o) => o.key === p.outcome) : null;
            const avatar = author.avatarUrl ? (
              <img src={author.avatarUrl} alt="" style={{ width: 38, height: 38, borderRadius: 38, objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ width: 38, height: 38, borderRadius: 38, background: CREAM_TINT, color: CRIMSON, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>
                {initials(author.username)}
              </div>
            );
            return (
              <div key={p.id} style={{ padding: "14px 16px", borderBottom: `0.5px solid ${BORDER}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {named && (
                    <Link to="/profile/$username" params={{ username: author.username! }} style={{ textDecoration: "none" }}>{avatar}</Link>
                  )}
                  <div style={{ minWidth: 0 }}>
                    {named ? (
                      <Link to="/profile/$username" params={{ username: author.username! }} style={{ textDecoration: "none" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: ESPRESSO }}>@{author.username}</div>
                      </Link>
                    ) : (
                      <div style={{ fontSize: 13, fontWeight: 600, color: MUTED }}>Anonymous</div>
                    )}
                    {meta.length > 0 && (
                      <div style={{ fontSize: 10.5, color: MUTED, marginTop: 2 }}>{meta.join(" · ")}</div>
                    )}
                  </div>
                </div>
                {p.what_happened && (
                  <div style={{ fontSize: 12.5, color: ESPRESSO, lineHeight: 1.6, marginTop: 10, whiteSpace: "pre-line" }}>{p.what_happened}</div>
                )}
                <Answer label="What surprised me" value={p.surprised_me} />
                <Answer label="Who it works for" value={p.works_for} />
                <Answer label="What I'd warn about" value={p.warn_if} />
                {outcomeChip && (
                  <div style={{ marginTop: 10 }}>
                    <span style={{ fontSize: 10.5, borderRadius: 20, padding: "3px 9px", background: outcomeChip.bg, color: outcomeChip.fg, border: `1px solid ${outcomeChip.border}` }}>
                      {outcomeChip.label}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
