/* "Post as @username" / "Post anonymously" — the choice on the Treatment and Surgery composers. 2026-09-18.
 *
 * It starts on "Post as @username". The composer always sends the resulting `is_named` explicitly, so the
 * column's default (false: anonymous) only ever applies to a row written by code that asked nobody.
 * A member with no username cannot be named: that option is disabled and the form says so, rather than
 * quietly posting them anonymously. The database enforces the same rule (a named row needs a username).
 */
import * as React from "react";
import { BORDER, CAPTION, ESPRESSO, SANS, WARM_WHITE } from "@/components/TalkPostCard";

export default function TalkVisibilityPicker({
  username, named, loaded, onChange,
}: {
  /** The member's own username, or null when they have not set one. */
  username: string | null;
  /** The value that will be sent. */
  named: boolean;
  /** false while the username is still loading, so the named option is not offered before we know it exists. */
  loaded: boolean;
  onChange: (named: boolean) => void;
}) {
  const canName = loaded && !!username;
  const options: { value: boolean; label: string; disabled: boolean }[] = [
    { value: true, label: username ? `Post as @${username}` : "Post as @username", disabled: !canName },
    { value: false, label: "Post anonymously", disabled: false },
  ];

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: CAPTION, marginBottom: 8 }}>
        Who it shows as
      </div>
      <div role="radiogroup" aria-label="Who this post shows as" style={{ display: "flex", gap: 8 }}>
        {options.map((o) => {
          const on = named === o.value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={o.disabled}
              onClick={() => onChange(o.value)}
              style={{
                flex: 1, minHeight: 44, padding: "0 12px", borderRadius: 999,
                border: `1px solid ${on ? ESPRESSO : BORDER}`,
                background: on ? ESPRESSO : WARM_WHITE,
                color: on ? WARM_WHITE : ESPRESSO,
                fontSize: 13, fontWeight: 500, fontFamily: SANS,
                cursor: o.disabled ? "not-allowed" : "pointer",
                opacity: o.disabled ? 0.5 : 1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 13, color: CAPTION, lineHeight: 1.5, marginTop: 8 }}>
        {!loaded
          ? "Checking your username…"
          : !username
            ? "You haven't set a username, so this post will be anonymous. Set one on your profile to post under your name."
            : named
              ? `Shows as @${username} with your avatar, and links to your profile.`
              : "Shows as Anonymous with your skin type. No name, no avatar, no link to your profile."}
      </div>
    </div>
  );
}
