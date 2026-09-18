/* The quoted post, nested inside the post that quotes it. 2026-09-18.
 *
 * Author line (named: @username and character; anonymous: "Anonymous" and character, nothing that leads to a
 * person), the first two lines of the quoted body, and its vote split only when the split is open (20 votes or
 * more — under that, post_vote_split returned no percentage, so there is none to show). A quoted post that its
 * author has since deleted says so; nothing stands in for it.
 */
import * as React from "react";
import {
  CAPTION, CARD_BORDER, DISPLAY, ESPRESSO, SANS, SKIN_CHARACTER, SKIN_PLAIN, normalizeSkin, shortAgo,
} from "@/components/TalkPostCard";
import type { QuotedPost } from "@/lib/talkQuotes";

const BOX: React.CSSProperties = {
  border: CARD_BORDER, borderRadius: 14, background: "#FFFFFF",
  padding: "12px 14px", marginTop: 12, fontFamily: SANS,
};

export default function TalkQuoteBox({
  quoted, loaded,
}: {
  /** The quoted post, or null when it could not be found. */
  quoted: QuotedPost | null;
  /** false while still loading: nothing renders, so a slow read never shows as "deleted". */
  loaded: boolean;
}) {
  if (!quoted) {
    if (!loaded) return null;
    return (
      <div style={{ ...BOX, fontSize: 13, color: CAPTION }}>
        The post this quotes was deleted by its author.
      </div>
    );
  }

  const skin = normalizeSkin(quoted.skinType);
  const time = shortAgo(quoted.createdAt);
  const handle = quoted.author.isNamed && quoted.author.username ? quoted.author.username : null;
  const meta = [skin ? SKIN_PLAIN[skin].replace(" skin", "") : null, time].filter(Boolean).join(" · ");
  const split = quoted.split;

  return (
    <div style={BOX}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexWrap: "wrap", fontSize: 13 }}>
        <span style={{ fontWeight: 600, color: ESPRESSO }}>{handle ? `@${handle}` : "Anonymous"}</span>
        {skin && (
          <span style={{ fontFamily: DISPLAY, fontStyle: "italic", fontWeight: 700, color: ESPRESSO }}>
            {SKIN_CHARACTER[skin]}
          </span>
        )}
        {meta && <span style={{ color: CAPTION }}>· {meta}</span>}
      </div>
      {quoted.body.trim() && (
        <p
          style={{
            margin: "6px 0 0", fontSize: 14, lineHeight: 1.4, color: ESPRESSO, whiteSpace: "pre-line",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}
        >
          {quoted.body.trim()}
        </p>
      )}
      {split.isOpen && split.samePct != null && split.notPct != null && (
        <div style={{ marginTop: 8, fontSize: 13, color: CAPTION }}>
          Same for me {split.samePct}% · Not for me {split.notPct}%
        </div>
      )}
    </div>
  );
}
