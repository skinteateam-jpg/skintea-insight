/* "Readers who tried it" — the agreement vote on a Talk post, 2026-09-18.
 *
 * Two states and no third:
 *   under 20 votes  — the count, a line saying the split appears at 20, and the two buttons
 *   at 20 or more   — the split bar, the two percentages and a per-skin-type breakdown
 *
 * Every figure comes from post_vote_split(); this file never divides anything. Under the floor the
 * percentages are not merely hidden, they were never calculated (see @/lib/postVotes).
 */
import * as React from "react";
import {
  CAPTION, CARD_BORDER, CRIMSON, ESPRESSO, SANS, WARM_WHITE,
} from "@/components/TalkPostCard";
import { VOTE_MIN_SPLIT, type VoteSplit, type VoteValue } from "@/lib/postVotes";

const TRACK = "#E8DDD4";
/** A flat track for a skin type with too few votes: it carries no fill because there is no figure. */
const TRACK_EMPTY = "#F1E8DF";

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 500, letterSpacing: "0.08em",
  textTransform: "uppercase", color: CAPTION,
};

const SKIN_LABEL: Record<string, string> = {
  oily: "Oily", dry: "Dry", combination: "Combination", sensitive: "Sensitive", normal: "Normal",
};

export type TalkVoteBlockProps = {
  split: VoteSplit;
  myVote?: VoteValue | null;
  /** False for signed-out readers and for the post's own author; `disabledReason` says which. */
  canVote: boolean;
  disabledReason?: string;
  onVote?: (v: VoteValue) => void;
  /** Signed-out readers are sent to sign in rather than shown a button that cannot write. */
  onSignIn?: () => void;
  error?: string | null;
};

export default function TalkVoteBlock({
  split, myVote = null, canVote, disabledReason, onVote, onSignIn, error = null,
}: TalkVoteBlockProps) {
  const shell: React.CSSProperties = {
    border: CARD_BORDER, borderRadius: 14, background: "#FFFFFF",
    padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10,
    fontFamily: SANS, marginTop: 12,
  };

  if (!split.isOpen) {
    return (
      <div style={shell}>
        <div style={SECTION_LABEL}>Readers who tried it</div>
        <div style={{ fontSize: 14, lineHeight: 1.45, color: ESPRESSO }}>
          {split.total === 0
            ? `No votes yet. The split shows once ${VOTE_MIN_SPLIT} people have voted.`
            : `${split.total} ${split.total === 1 ? "vote" : "votes"} so far. The split shows once ${VOTE_MIN_SPLIT} people have voted.`}
        </div>
        <VoteButtons
          myVote={myVote} canVote={canVote} disabledReason={disabledReason}
          onVote={onVote} onSignIn={onSignIn}
        />
        {error && <div style={{ fontSize: 13, color: CRIMSON }}>{error}</div>}
      </div>
    );
  }

  const same = split.samePct ?? 0;
  const rest = split.notPct ?? 0;
  const rows = split.breakdown ?? [];

  return (
    <div style={shell}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span style={SECTION_LABEL}>Readers who tried it</span>
        <span style={{ fontSize: 13, color: CAPTION }}>{split.total} votes</span>
      </div>

      <div style={{ display: "flex", height: 12, borderRadius: 999, overflow: "hidden" }}>
        <span style={{ width: `${same}%`, background: ESPRESSO, display: "block" }} />
        <span style={{ width: `${rest}%`, background: TRACK, display: "block" }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600 }}>
        <span style={{ color: ESPRESSO }}>Same for me {same}%</span>
        <span style={{ color: CAPTION }}>Not for me {rest}%</span>
      </div>

      {rows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: CARD_BORDER, paddingTop: 10 }}>
          {rows.map((r) => {
            const label = SKIN_LABEL[r.skin_type] ?? r.skin_type;
            if (!r.enough || r.same_pct == null) {
              return (
                <div key={r.skin_type} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 92, fontSize: 13, color: CAPTION, flexShrink: 0 }}>{label}</span>
                  <span style={{ flex: 1, height: 8, borderRadius: 999, background: TRACK_EMPTY, display: "block" }} />
                  <span style={{ fontSize: 13, color: CAPTION, flexShrink: 0 }}>too few votes yet</span>
                </div>
              );
            }
            return (
              <div key={r.skin_type} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 92, fontSize: 13, color: CAPTION, flexShrink: 0 }}>{label}</span>
                <span style={{ flex: 1, height: 8, borderRadius: 999, background: TRACK, display: "block", overflow: "hidden" }}>
                  <span style={{ width: `${r.same_pct}%`, height: 8, background: ESPRESSO, display: "block" }} />
                </span>
                <span style={{ width: 42, textAlign: "right", fontSize: 13, fontWeight: 600, color: ESPRESSO, flexShrink: 0 }}>
                  {r.same_pct}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* The one line that keeps this apart from the product page's figure. */}
      <div style={{ fontSize: 13, color: CAPTION, lineHeight: 1.4 }}>
        This is readers voting here, not the Majority and Minority data on product pages.
      </div>

      <VoteButtons
        myVote={myVote} canVote={canVote} disabledReason={disabledReason}
        onVote={onVote} onSignIn={onSignIn}
      />
      {error && <div style={{ fontSize: 13, color: CRIMSON }}>{error}</div>}
    </div>
  );
}

function VoteButtons({
  myVote, canVote, disabledReason, onVote, onSignIn,
}: Pick<TalkVoteBlockProps, "myVote" | "canVote" | "disabledReason" | "onVote" | "onSignIn">) {
  const options: { value: VoteValue; label: string }[] = [
    { value: "same", label: "Same for me" },
    { value: "not", label: "Not for me" },
  ];
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {options.map((o) => {
        const on = myVote === o.value;
        const disabled = !canVote && !onSignIn;
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            title={!canVote ? disabledReason : on ? "Tap again to take your vote back" : undefined}
            onClick={(e) => {
              e.stopPropagation();
              if (!canVote) { onSignIn?.(); return; }
              onVote?.(o.value);
            }}
            style={{
              flex: 1, height: 44, borderRadius: 999,
              border: `1px solid ${ESPRESSO}`,
              background: on ? ESPRESSO : WARM_WHITE,
              color: on ? WARM_WHITE : ESPRESSO,
              fontSize: 14, fontWeight: 600, fontFamily: SANS,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
