import { Link } from "@tanstack/react-router";

const CRIMSON = "#A8001C";
const BORDER = "#E8DDD4";
const MUTED = "#999999";
const ESPRESSO = "#1C0A00";
const CREAM_TINT = "#F5EFEC";

/**
 * "Who has done it" — Skintea members who posted about this treatment, never celebrities.
 *
 * Presentational only: it receives the members the page already loaded from public.posts and
 * public.profiles, renders up to MAX_AVATARS of them, and counts nothing. These rows never enter
 * Worth it or any other figure; "Who has talked about it" (celebrity / influencer evidence) is a
 * separate section and a separate query.
 *
 * Only members who chose to post under their name appear here (owner, 2026-09-17). Everyone else is counted
 * in one line and never shown: no avatar, no username, no link, nothing that leads back to a profile.
 * profiles.name (the sign-up name) is never read or shown.
 */

export type TreatmentMember = {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
};

const MAX_AVATARS = 8;

function initials(username: string | null): string {
  const cleaned = (username ?? "").replace(/^@/, "").trim();
  return cleaned ? cleaned.slice(0, 2).toUpperCase() : "·";
}

export default function TreatmentMembers({
  members,
  anonymousCount,
  onOpenTea,
}: {
  members: TreatmentMember[];
  anonymousCount: number;
  onOpenTea: () => void;
}) {
  const shown = members.slice(0, MAX_AVATARS);
  const rest = members.length - shown.length + anonymousCount;

  if (members.length === 0 && anonymousCount === 0) {
    return (
      <div className="border border-dashed border-brand-border rounded-[10px] px-[13px] py-3 bg-brand-cream">
        <div className="text-[10px] font-semibold text-brand-muted mb-[5px]">Not enough data yet</div>
        <div className="text-[11.5px] text-brand-muted leading-[1.55]">
          No Skintea member has posted about this treatment yet.
        </div>
      </div>
    );
  }

  // Nobody posted under their name: the section is the count line alone.
  if (members.length === 0) {
    return (
      <div>
        <button
          type="button"
          onClick={onOpenTea}
          style={{ background: "none", border: "none", padding: 0, fontSize: 12.5, color: CRIMSON, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >
          {anonymousCount} {anonymousCount === 1 ? "member has" : "members have"} posted anonymously — read them in Tea
        </button>
        <div style={{ fontSize: 10, color: MUTED, marginTop: 8, lineHeight: 1.4 }}>
          Posting under your name is the member's own choice. Not counted in Worth it.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {shown.map((m) => {
          const body = (
            <>
              {m.avatarUrl ? (
                <img
                  src={m.avatarUrl}
                  alt=""
                  style={{ width: 44, height: 44, borderRadius: 44, objectFit: "cover", display: "block" }}
                />
              ) : (
                <div
                  style={{
                    width: 44, height: 44, borderRadius: 44, background: CREAM_TINT, color: CRIMSON,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600,
                  }}
                >
                  {initials(m.username)}
                </div>
              )}
              {m.username && (
                <div style={{ fontSize: 10.5, color: ESPRESSO, marginTop: 4, maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  @{m.username}
                </div>
              )}
            </>
          );
          return (
            <div key={m.userId} style={{ textAlign: "center", width: 56 }}>
              {m.username ? (
                <Link to="/profile/$username" params={{ username: m.username }} style={{ textDecoration: "none", color: ESPRESSO }}>
                  {body}
                </Link>
              ) : (
                body
              )}
            </div>
          );
        })}
      </div>
      {rest > 0 && (
        <button
          type="button"
          onClick={onOpenTea}
          style={{ marginTop: 10, background: "none", border: `0.5px solid ${BORDER}`, borderRadius: 10, padding: "8px 12px", fontSize: 11.5, fontWeight: 600, color: CRIMSON, cursor: "pointer", fontFamily: "inherit" }}
        >
          {rest} more in Tea
        </button>
      )}
      <div style={{ fontSize: 10, color: MUTED, marginTop: 8, lineHeight: 1.4 }}>
        Members who chose to post under their name. Anonymous posts are counted here but never named. Not counted in Worth it.
      </div>
    </div>
  );
}
