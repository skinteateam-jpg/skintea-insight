import { useState } from "react";

const CRIMSON = "#A8001C";
const CREAM_TINT = "#F5EFEC";

/**
 * Avatar for a real, named person.
 *
 * Fallback order (never render a broken image, never substitute someone else's
 * photo or a stock face):
 *   1. cachedUrl  — a Skintea-hosted image, when one exists
 *   2. unavatar.io/instagram/<handle> — only when the handle has been verified
 *      as that person's own account and stored on the row
 *   3. initials in the crimson tint circle
 *
 * A person with no verified public Instagram gets initials. That is a correct
 * outcome, not a gap to fill.
 */
export function initialsFor(name: string): string {
  const cleaned = name.replace(/^@/, "").replace(/[._-]+/g, " ").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0].slice(0, 1) + words[words.length - 1].slice(0, 1)).toUpperCase();
}

export default function PersonAvatar({
  name,
  instagramHandle,
  cachedUrl,
  size = 40,
}: {
  name: string;
  instagramHandle?: string | null;
  cachedUrl?: string | null;
  size?: number;
}) {
  const handleUrl = instagramHandle
    ? `https://unavatar.io/instagram/${instagramHandle.replace(/^@/, "").toLowerCase()}?fallback=false`
    : null;

  // Step through the available sources; land on initials when none load.
  const sources = [cachedUrl, handleUrl].filter(Boolean) as string[];
  const [step, setStep] = useState(0);
  const src = step < sources.length ? sources[step] : null;

  const box: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    objectFit: "cover",
    background: CREAM_TINT,
  };

  if (!src) {
    return (
      <div
        aria-hidden="true"
        style={{
          ...box,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: CRIMSON,
          fontSize: Math.round(size * 0.34),
          fontWeight: 800,
          letterSpacing: "0.02em",
        }}
      >
        {initialsFor(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      referrerPolicy="no-referrer"
      style={box}
      onError={() => setStep((s) => s + 1)}
    />
  );
}
