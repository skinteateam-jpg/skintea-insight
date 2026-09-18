/* The updates timeline on a Treatment or Surgery Talk post page, and the line under each feed card that leads to it
 * (block 7, 2026-09-18). Data and rules: src/lib/postUpdates.ts.
 *
 * One dot per entry. The first dot is the post itself; every later dot is an update the author added, with the
 * label they typed (optional) and the date the database stamped. Wording is neutral: the author is "the author",
 * never "she". Only the author sees "Add update"; everyone who saved the post is told in Skintea, not by email.
 */
import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  BORDER, CAPTION, CARD_BORDER, CRIMSON, DISABLED, ESPRESSO, SANS, WARM_WHITE,
} from "@/components/TalkPostCard";
import {
  UPDATE_BODY_MAX, UPDATE_LABEL_MAX, addPostUpdate, deletePostUpdate, fetchPostUpdates, formatUpdateDate,
  postDetailHref, type PostUpdate, type UpdateKind, type UpdateSummary,
} from "@/lib/postUpdates";

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: CAPTION,
};

/* Under a feed card: the way into the post's own page, with its update count and a "New" mark for a saver who has
   not seen the latest update. */
export function TalkUpdatesLink({ kind, postId, summary }: { kind: UpdateKind; postId: string; summary?: UpdateSummary }) {
  const count = summary?.count ?? 0;
  const text = count === 0
    ? "Open post"
    : `${count} ${count === 1 ? "update" : "updates"} · last ${formatUpdateDate(summary!.lastAt!)}`;
  return (
    <Link
      to={postDetailHref(kind, postId) as any}
      onClick={(e) => e.stopPropagation()}
      style={{
        display: "flex", alignItems: "center", gap: 8, minHeight: 44, marginTop: 8, paddingTop: 8,
        borderTop: CARD_BORDER, fontSize: 13, fontWeight: 500, color: ESPRESSO, textDecoration: "none", fontFamily: SANS,
      }}
    >
      {summary && summary.unseen > 0 && (
        <span
          aria-label={`${summary.unseen} new ${summary.unseen === 1 ? "update" : "updates"} since you saved or last opened this post`}
          style={{ background: CRIMSON, color: WARM_WHITE, fontSize: 11, fontWeight: 600, borderRadius: 999, padding: "2px 8px" }}
        >
          New
        </span>
      )}
      <span>{text}</span>
      <span aria-hidden style={{ marginLeft: "auto", color: CAPTION }}>→</span>
    </Link>
  );
}

function Dot({ filled }: { filled: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        position: "absolute", left: 0, top: 4, width: 11, height: 11, borderRadius: 999,
        background: filled ? ESPRESSO : WARM_WHITE, border: `2px solid ${ESPRESSO}`, boxSizing: "border-box",
      }}
    />
  );
}

export function TalkUpdateTimeline({
  kind, postId, postCreatedAt, isOwn, userId,
}: {
  kind: UpdateKind;
  postId: string;
  postCreatedAt: string;
  /** From talk_post_authors(): true only for the signed-in author. */
  isOwn: boolean;
  userId: string | null;
}) {
  const [updates, setUpdates] = React.useState<PostUpdate[]>([]);
  const [state, setState] = React.useState<"loading" | "ready" | "failed">("loading");
  const [formOpen, setFormOpen] = React.useState(false);
  const [label, setLabel] = React.useState("");
  const [body, setBody] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const r = await fetchPostUpdates(kind, postId);
    if (r.error) { setState("failed"); return; }
    setUpdates(r.updates);
    setState("ready");
  }, [kind, postId]);

  React.useEffect(() => { void load(); }, [load]);

  async function submit() {
    if (!userId || !body.trim() || saving) return;
    setSaving(true);
    setError(null);
    const { error: e } = await addPostUpdate(kind, postId, userId, label, body);
    setSaving(false);
    if (e) { setError(`Couldn't add the update: ${e.message}`); return; }
    setLabel(""); setBody(""); setFormOpen(false);
    await load();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this update? It is removed for everyone and cannot be undone.")) return;
    setError(null);
    const { error: e, count } = await deletePostUpdate(id);
    if (e || count === 0) { setError(e ? `Couldn't delete: ${e.message}` : "Couldn't delete this update."); return; }
    setUpdates((prev) => prev.filter((u) => u.id !== id));
  }

  const last = updates.length ? updates[updates.length - 1].created_at : null;

  return (
    <section
      aria-label="Updates"
      style={{ marginTop: 16, background: "#FFFFFF", border: CARD_BORDER, borderRadius: 12, padding: 16, fontFamily: SANS, color: ESPRESSO }}
    >
      <div style={SECTION_LABEL}>Updates</div>
      <div style={{ marginTop: 4, fontSize: 13, color: CAPTION }}>
        {state === "loading" ? "Loading…"
          : state === "failed" ? "Couldn't load the updates. Reload to try again."
          : updates.length === 0 ? "No updates yet."
          : `${updates.length} ${updates.length === 1 ? "update" : "updates"} · last ${formatUpdateDate(last!)}`}
      </div>

      {state === "ready" && (
        <ol style={{ listStyle: "none", margin: "14px 0 0", padding: 0 }}>
          {[{ id: "__post", label: "Posted", body: null as string | null, created_at: postCreatedAt }, ...updates].map((u, i, all) => (
            <li key={u.id} style={{ position: "relative", paddingLeft: 24, paddingBottom: i === all.length - 1 ? 0 : 16 }}>
              {i < all.length - 1 && (
                <span aria-hidden style={{ position: "absolute", left: 5, top: 15, bottom: 0, width: 1, background: BORDER }} />
              )}
              <Dot filled={i === all.length - 1} />
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                {u.label && <span style={{ fontSize: 14, fontWeight: 600 }}>{u.label}</span>}
                <span style={{ fontSize: 13, color: CAPTION }}>{formatUpdateDate(u.created_at)}</span>
                {isOwn && u.id !== "__post" && (
                  <button
                    type="button"
                    onClick={() => void remove(u.id)}
                    style={{ marginLeft: "auto", minHeight: 32, background: "none", border: "none", color: CAPTION, fontSize: 13, cursor: "pointer", fontFamily: SANS }}
                  >
                    Delete
                  </button>
                )}
              </div>
              {u.body && <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{u.body}</p>}
            </li>
          ))}
        </ol>
      )}

      {error && <div style={{ marginTop: 10, fontSize: 13, fontWeight: 500, color: CRIMSON }}>{error}</div>}

      {isOwn && state === "ready" && (
        formOpen ? (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13, color: CAPTION }}>
              When (optional)
              <input
                value={label}
                maxLength={UPDATE_LABEL_MAX}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Week 2"
                style={{ display: "block", width: "100%", marginTop: 4, minHeight: 44, padding: "0 12px", border: CARD_BORDER, borderRadius: 8, fontSize: 15, fontFamily: SANS, color: ESPRESSO, background: WARM_WHITE, boxSizing: "border-box" }}
              />
            </label>
            <label style={{ fontSize: 13, color: CAPTION }}>
              How it is now
              <textarea
                value={body}
                maxLength={UPDATE_BODY_MAX}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                style={{ display: "block", width: "100%", marginTop: 4, padding: 12, border: CARD_BORDER, borderRadius: 8, fontSize: 15, fontFamily: SANS, color: ESPRESSO, background: WARM_WHITE, boxSizing: "border-box", resize: "vertical" }}
              />
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={!body.trim() || saving}
                style={{ flex: 1, minHeight: 44, borderRadius: 999, border: "none", background: !body.trim() || saving ? DISABLED : ESPRESSO, color: WARM_WHITE, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: SANS }}
              >
                {saving ? "Adding…" : "Add update"}
              </button>
              <button
                type="button"
                onClick={() => { setFormOpen(false); setError(null); }}
                style={{ minHeight: 44, padding: "0 18px", borderRadius: 999, border: CARD_BORDER, background: "#FFFFFF", color: ESPRESSO, fontSize: 14, cursor: "pointer", fontFamily: SANS }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, color: CAPTION }}>Add how it looks now.</div>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              style={{ marginTop: 8, width: "100%", minHeight: 44, borderRadius: 999, border: "none", background: ESPRESSO, color: WARM_WHITE, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: SANS }}
            >
              Add update
            </button>
          </div>
        )
      )}

      <div style={{ marginTop: 12, fontSize: 12, color: CAPTION, lineHeight: 1.5 }}>
        Only the author can add to this. Everyone who saved the post sees it marked New in Skintea when an update lands. No email is sent.
      </div>
    </section>
  );
}
