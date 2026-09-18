import { Link } from "@tanstack/react-router";
import type { TeaPostRow } from "@/components/TreatmentTea";
import type { TalkAuthor } from "@/lib/talkAuthors";

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const MUTED = "#999999";
const CREAM_TINT = "#F5EFEC";

/**
 * "Who has talked about it" — the Skintea members who posted Tea about this treatment (Chi, 2026-09-18).
 * The name used to belong to the celebrity layer, which is now one line under the treatment name.
 *
 * Who wrote a post is read only through `talk_post_authors()` (src/lib/talkAuthors.ts), the same call the
 * Tea tab makes. `user_id` is never selected anywhere, so an anonymous post carries nothing to the browser
 * that leads back to a person.
 *
 * Only NAMED posts put a member in the row: an anonymous poster chose not to be shown, and showing them
 * here would undo that choice. The count line under the row is every post about the treatment, named and
 * anonymous alike, so anonymous posters are counted without being identified.
 *
 * This section is counted in no figure: it is not a review, a percentage or a sample size.
 */
const MAX_MEMBERS = 8;

function initials(username: string): string {
  const cleaned = username.replace(/^@/, "").replace(/[._-]+/g, " ").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0].slice(0, 1) + words[words.length - 1].slice(0, 1)).toUpperCase();
}

/** One entry per member, newest post first, named posts only. A member who posted twice appears once. */
export function namedMembers(
  posts: TeaPostRow[],
  authors: Map<string, TalkAuthor>,
): { username: string; avatarUrl: string | null }[] {
  const seen = new Set<string>();
  const out: { username: string; avatarUrl: string | null }[] = [];
  for (const p of posts) {
    if (p.is_named !== true) continue;
    const a = authors.get(p.id);
    if (!a || !a.isNamed) continue;
    const username = (a.username ?? "").trim();
    if (!username || seen.has(username.toLowerCase())) continue;
    seen.add(username.toLowerCase());
    out.push({ username, avatarUrl: a.avatarUrl });
  }
  return out;
}

export default function TreatmentMembers({
  posts,
  authors,
  onOpenTea,
}: {
  posts: TeaPostRow[];
  authors: Map<string, TalkAuthor>;
  onOpenTea: () => void;
}) {
  const members = namedMembers(posts, authors).slice(0, MAX_MEMBERS);

  if (posts.length === 0) {
    return (
      <div className="border border-dashed border-brand-border rounded-[10px] px-[13px] py-3 bg-brand-cream">
        <div className="text-[10px] font-semibold text-brand-muted mb-[5px]">Not enough data yet</div>
        <div className="text-[11.5px] text-brand-muted leading-[1.55]">
          No Skintea member has posted about this treatment yet.
        </div>
      </div>
    );
  }

  return (
    <div>
      {members.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
          {members.map((m) => (
            <Link
              key={m.username}
              to="/profile/$username"
              params={{ username: m.username }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, width: 72, textDecoration: "none" }}
            >
              {m.avatarUrl ? (
                <img src={m.avatarUrl} alt="" style={{ width: 40, height: 40, borderRadius: 40, objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: 40, background: CREAM_TINT, color: CRIMSON, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>
                  {initials(m.username)}
                </div>
              )}
              <div style={{ fontSize: 10, color: ESPRESSO, fontWeight: 600, maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                @{m.username}
              </div>
            </Link>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={onOpenTea}
        style={{ background: "none", border: "none", padding: 0, fontSize: 12.5, fontWeight: 600, color: CRIMSON, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
      >
        {posts.length} {posts.length === 1 ? "post" : "posts"} about this treatment — read them in Tea
      </button>
      {members.length === 0 && (
        <div style={{ fontSize: 11, color: MUTED, marginTop: 6, lineHeight: 1.5 }}>
          Everyone who posted about this treatment chose to post anonymously.
        </div>
      )}
    </div>
  );
}
