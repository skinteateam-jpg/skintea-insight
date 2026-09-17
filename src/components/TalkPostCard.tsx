/* One card for all three Talks (Product, Treatment, Surgery), 2026-09-17.
 *
 * Structure, top to bottom, and it is the same everywhere:
 *   1. Identity row   — 40px avatar, username or Anonymous, skin character name, plain skin type and age, time
 *   2. Context row    — subject pill left, verdict stamp right (one stamp, never the unselected options)
 *   3. Body           — 17px / 500, the hook on the first line
 *   4. Module         — supplied by the caller: product card, routine steps, photo carousel, receipt strip
 *   5. Detail rows    — collapsible, first line as preview with a chevron
 *   6. Action row     — reply, quote, save, share (plus an optional leading action, e.g. Surgery Talk's like)
 *
 * Rules this file enforces so the three routes cannot drift:
 *   - An empty field is omitted. Nothing ever renders an em dash placeholder.
 *   - No author name is invented. `authorName` null renders "Anonymous"; the author sees "Your post".
 *   - No emoji, no gradients, no shadows, no pastel skin-type colours. Icons are inline stroke SVG.
 *   - Body text is never below 13px; the post body is 17px; every tap target is at least 44px.
 */
import * as React from "react";
import { Bookmark, ChevronDown, Heart, MessageCircle, Share2, Trash2, User } from "lucide-react";

/* ---------- Design tokens ---------- */

export const ESPRESSO = "#1C0A00";
export const CRIMSON = "#A8001C";
export const WARM_WHITE = "#FFFCF8";
export const CARD_WHITE = "#FFFFFF";
export const BORDER = "#E8DDD4";
/** Caption text. Replaces every #999999 / #aaa that was being used for text. */
export const CAPTION = "#6E625A";
/** Disabled control text — a caption that reads as unavailable without dropping out of sight. */
export const DISABLED = "#B9AFA6";
/** Neutral avatar and inert fills. There are no skin-type colours. */
export const NEUTRAL_FILL = "#F5F0EA";

export const CARD_BORDER = `0.5px solid ${BORDER}`;
export const SANS = "'DM Sans', system-ui, sans-serif";
export const DISPLAY = "'Playfair Display', Georgia, serif";

/* ---------- Skin type ---------- */

export type SkinKey = "oily" | "dry" | "combination" | "sensitive" | "normal";

/** The character name is the one place Playfair italic bold is used outside the logo. */
export const SKIN_CHARACTER: Record<SkinKey, string> = {
  oily: "The Butter Girl",
  dry: "The Peach",
  combination: "The Everything Bagel",
  sensitive: "The Glass of Milk",
  normal: "The Cracker",
};

export const SKIN_PLAIN: Record<SkinKey, string> = {
  oily: "Oily skin",
  dry: "Dry skin",
  combination: "Combination skin",
  sensitive: "Sensitive skin",
  normal: "Normal skin",
};

/** Skin type is stored three ways across the tables ("combo", "Combination", "combination"). One reader for all. */
export function normalizeSkin(raw: string | null | undefined): SkinKey | null {
  switch ((raw ?? "").trim().toLowerCase()) {
    case "oily": return "oily";
    case "dry": return "dry";
    case "combo":
    case "combination": return "combination";
    case "sensitive": return "sensitive";
    case "normal": return "normal";
    default: return null;
  }
}

/* ---------- Time ---------- */

/** "3d" from an ISO string or epoch ms. null when the row carries no usable timestamp — then nothing renders. */
export function shortAgo(value: string | number | null | undefined): string | null {
  if (value == null) return null;
  const ms = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const diff = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo`;
  return `${Math.floor(diff / 31536000)}y`;
}

/* ---------- Inline stroke icons (no emoji anywhere in the UI) ---------- */

function strokeProps(size: number) {
  return {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.75,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    "aria-hidden": true as const, focusable: "false" as const,
  };
}

export function QuoteIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...strokeProps(size)}>
      <path d="M9 7H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v1a2 2 0 0 1-2 2H4" />
      <path d="M19 7h-4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v1a2 2 0 0 1-2 2h-1" />
    </svg>
  );
}

export function EyeOffIcon({ size = 24 }: { size?: number }) {
  return (
    <svg {...strokeProps(size)}>
      <path d="M10.7 5.1A10.9 10.9 0 0 1 12 5c6 0 10 7 10 7a17.9 17.9 0 0 1-3.2 4.1" />
      <path d="M6.6 6.6A17.8 17.8 0 0 0 2 12s4 7 10 7a10.9 10.9 0 0 0 4.7-1.1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </svg>
  );
}

/* ---------- Pieces the routes share ---------- */

/** A cell of the receipt strip. A cell with no value is never built, so no em dash can reach the screen. */
export type ReceiptCell = { label: string; value: string };

export function receiptCells(pairs: [string, string | null | undefined][]): ReceiptCell[] {
  return pairs
    .map(([label, value]) => ({ label, value: (value ?? "").trim() }))
    .filter((c) => c.value.length > 0);
}

/** Paid / Sessions / Downtime. Renders only the cells that have a value; nothing at all when none do. */
export function TalkReceipt({ cells }: { cells: ReceiptCell[] }) {
  if (cells.length === 0) return null;
  return (
    <div
      style={{
        marginTop: 12,
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(cells.length, 3)}, minmax(0, 1fr))`,
        gap: 8,
      }}
    >
      {cells.map((c) => (
        <div key={c.label} style={{ border: CARD_BORDER, borderRadius: 10, padding: "9px 10px", minWidth: 0 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: CAPTION }}>
            {c.label}
          </div>
          <div style={{ fontSize: 15, color: ESPRESSO, marginTop: 2, wordBreak: "break-word" }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

/** The product a Product Talk post is about. Rendered only when the post names one. */
export function TalkProductModule({
  name, brand, imageUrl, meta, onOpen,
}: {
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  /** e.g. "used 2 weeks" — the poster's own words, never a generated claim. */
  meta?: string | null;
  onOpen?: () => void;
}) {
  const line = [brand, meta].filter((v) => v && String(v).trim()).join(" · ");
  return (
    <div
      onClick={onOpen ? (e) => { e.stopPropagation(); onOpen(); } : undefined}
      style={{
        marginTop: 12, border: CARD_BORDER, borderRadius: 10, padding: 10,
        display: "flex", alignItems: "center", gap: 10, minHeight: 44,
        cursor: onOpen ? "pointer" : "default",
      }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 8, background: NEUTRAL_FILL, flexShrink: 0, overflow: "hidden" }}>
        {imageUrl && <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, color: ESPRESSO, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </div>
        {line && <div style={{ fontSize: 13, color: CAPTION, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{line}</div>}
      </div>
    </div>
  );
}

export type RoutineStep = { num: number; label: string; product: string };

/** A routine the poster wrote out. No step is labelled for them and no step is invented. */
export function TalkRoutineSteps({ steps, total }: { steps: RoutineStep[]; total?: number }) {
  if (steps.length === 0) return null;
  const shown = steps.slice(0, 3);
  const hidden = (total ?? steps.length) - shown.length;
  return (
    <div style={{ marginTop: 12, border: CARD_BORDER, borderRadius: 10, padding: "4px 10px" }}>
      {shown.map((s, i) => (
        <div
          key={`${s.num}-${s.label}`}
          style={{
            display: "flex", alignItems: "center", gap: 10, minHeight: 40,
            borderTop: i === 0 ? "none" : CARD_BORDER,
          }}
        >
          <span
            style={{
              width: 22, height: 22, borderRadius: "50%", border: `1px solid ${ESPRESSO}`, color: ESPRESSO,
              fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            {s.num}
          </span>
          <span style={{ fontSize: 13, color: CAPTION, width: 76, flexShrink: 0 }}>{s.label}</span>
          <span style={{ fontSize: 13, color: ESPRESSO, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {s.product}
          </span>
        </div>
      ))}
      {hidden > 0 && (
        <div style={{ borderTop: CARD_BORDER, fontSize: 13, color: CAPTION, padding: "10px 0" }}>
          {hidden} more {hidden === 1 ? "step" : "steps"}
        </div>
      )}
    </div>
  );
}

export type TalkPhoto = { url: string; label?: string | null };

/**
 * Photos. `gated` holds them behind an espresso block until the reader taps — Surgery Talk shows
 * recovery photos of a real person's face, so nobody meets them by scrolling past.
 */
export function TalkPhotoCarousel({ photos, gated = false }: { photos: TalkPhoto[]; gated?: boolean }) {
  const [revealed, setRevealed] = React.useState(!gated);
  const usable = photos.filter((p) => p.url && p.url.trim());
  if (usable.length === 0) return null;

  if (!revealed) {
    return (
      <div style={{ marginTop: 12, borderRadius: 10, background: ESPRESSO, padding: "22px 16px", textAlign: "center", color: WARM_WHITE }}>
        <EyeOffIcon size={24} />
        <div style={{ fontSize: 13, marginTop: 8 }}>
          {usable.length} {usable.length === 1 ? "photo" : "photos"}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setRevealed(true); }}
          style={{
            marginTop: 10, minHeight: 44, padding: "0 20px", border: `1px solid ${WARM_WHITE}`,
            borderRadius: 999, background: "none", color: WARM_WHITE, fontSize: 13, fontWeight: 500,
            fontFamily: SANS, cursor: "pointer",
          }}
        >
          Tap to view
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div
        className="no-scrollbar"
        style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}
      >
        {usable.map((p, i) => (
          <div key={`${p.url}-${i}`} style={{ flexShrink: 0, width: 96 }}>
            <div style={{ width: 96, height: 112, borderRadius: 8, border: CARD_BORDER, overflow: "hidden", background: NEUTRAL_FILL }}>
              <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            {p.label && p.label.trim() && (
              <div style={{ fontSize: 13, color: CAPTION, marginTop: 4, textAlign: "center" }}>{p.label}</div>
            )}
          </div>
        ))}
      </div>
      {gated && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setRevealed(false); }}
          style={{
            marginTop: 6, minHeight: 44, background: "none", border: "none", padding: 0,
            fontSize: 13, color: CAPTION, fontFamily: SANS, cursor: "pointer",
          }}
        >
          Hide photos
        </button>
      )}
    </div>
  );
}

/* ---------- Collapsible detail row ---------- */

export type TalkDetail = {
  label: string;
  value: string;
  /** Crimson label. Only "Wish I knew before" and other warnings use it. */
  warning?: boolean;
};

function DetailRow({ detail, first }: { detail: TalkDetail; first: boolean }) {
  const [open, setOpen] = React.useState(false);
  const preview = detail.value.split(/\r?\n/).find((l) => l.trim())?.trim() ?? detail.value.trim();
  return (
    <div style={{ borderTop: first ? "none" : CARD_BORDER }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        style={{
          display: "flex", width: "100%", alignItems: "center", gap: 8, minHeight: 44,
          padding: "11px 0", background: "none", border: "none", textAlign: "left",
          fontFamily: SANS, cursor: "pointer",
        }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: "block", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
              color: detail.warning ? CRIMSON : CAPTION,
            }}
          >
            {detail.label}
          </span>
          <span
            style={{
              display: "block", fontSize: 13, color: ESPRESSO, marginTop: 1,
              ...(open
                ? { whiteSpace: "pre-line", lineHeight: 1.5 }
                : { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }),
            }}
          >
            {open ? detail.value : preview}
          </span>
        </span>
        <ChevronDown
          size={18}
          color={CAPTION}
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
        />
      </button>
    </div>
  );
}

/* ---------- Actions ---------- */

export type TalkAction = {
  key: string;
  /** Rendered as a label beside the icon. Omitted on the icon-only actions at the right. */
  label?: string;
  count?: number;
  onClick?: () => void;
  /** Disabled controls say why through `title` rather than looking live and doing nothing. */
  disabled?: boolean;
  title?: string;
  active?: boolean;
};

function ActionButton({ action, icon, iconOnly = false }: { action: TalkAction; icon: React.ReactNode; iconOnly?: boolean }) {
  const color = action.disabled ? DISABLED : action.active ? CRIMSON : ESPRESSO;
  return (
    <button
      type="button"
      disabled={action.disabled}
      title={action.title}
      aria-label={iconOnly ? action.key : undefined}
      onClick={action.onClick ? (e) => { e.stopPropagation(); action.onClick!(); } : undefined}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        minHeight: 44, minWidth: 44, padding: iconOnly ? 0 : "0 10px",
        background: "none", border: "none", color, fontSize: 13, fontFamily: SANS,
        cursor: action.disabled ? "not-allowed" : "pointer",
      }}
    >
      {icon}
      {!iconOnly && action.label && <span>{action.label}</span>}
      {!iconOnly && typeof action.count === "number" && action.count > 0 && <span>{action.count}</span>}
    </button>
  );
}

/* ---------- The card ---------- */

export type TalkPostCardProps = {
  /** The author's public username, or null. Null renders "Anonymous" — never an invented name. */
  authorName?: string | null;
  /** The signed-in reader is the author: the identity line reads "Your post" and Delete appears. */
  isOwn?: boolean;
  skinType?: string | null;
  /** The poster's stated age or age bracket. Omitted when unknown. */
  age?: string | null;
  createdAt?: string | number | null;
  /** The product, treatment or procedure this post is about. */
  subject?: string | null;
  subjectIcon?: React.ReactNode;
  /** Post type, e.g. SKIN TEA. Uppercase espresso; crimson only when the type is itself a warning. */
  typeLabel?: { text: string; warning?: boolean } | null;
  /** One stamp, or none. The unselected options are never drawn. */
  verdict?: { label: string; tone: "positive" | "negative" } | null;
  /** The first line of the body. Rendered heavier, in the same 17px block. */
  hook?: string | null;
  body?: string | null;
  /** Product card, routine steps, photo carousel or receipt strip — whatever this tab shows. */
  module?: React.ReactNode;
  details?: TalkDetail[];
  onOpen?: () => void;
  reply?: TalkAction;
  quote?: TalkAction;
  save?: TalkAction;
  share?: TalkAction;
  /** Optional leading action. Surgery Talk passes its like, which is a stored count. */
  like?: TalkAction;
  onDelete?: () => void;
  /** Rendered under the actions: a failed save or delete says so on the card it happened on. */
  error?: string | null;
  /** Anything that belongs under the actions, e.g. Surgery Talk's comment thread. */
  footer?: React.ReactNode;
};

export default function TalkPostCard({
  authorName = null, isOwn = false, skinType = null, age = null, createdAt = null,
  subject = null, subjectIcon = null, typeLabel = null, verdict = null, hook = null, body = null,
  module = null, details = [], onOpen,
  reply, quote, save, share, like, onDelete, error = null, footer = null,
}: TalkPostCardProps) {
  const skin = normalizeSkin(skinType);
  const time = shortAgo(createdAt);
  const name = isOwn ? "Your post" : authorName && authorName.trim() ? authorName.trim() : "Anonymous";
  const initial = !isOwn && authorName && authorName.trim() ? authorName.trim().charAt(0).toLowerCase() : null;
  const shownDetails = details.filter((d) => d.value && d.value.trim());
  const stampColor = verdict?.tone === "negative" ? CRIMSON : ESPRESSO;
  const plain = [skin ? SKIN_PLAIN[skin] : null, age && age.trim() ? age.trim() : null].filter(Boolean).join(" · ");

  return (
    <article
      onClick={onOpen}
      style={{
        background: CARD_WHITE, border: CARD_BORDER, borderRadius: 12, padding: 14,
        fontFamily: SANS, cursor: onOpen ? "pointer" : "default",
      }}
    >
      {/* 1. Identity */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 40, height: 40, borderRadius: "50%", background: NEUTRAL_FILL, border: CARD_BORDER,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            color: initial ? ESPRESSO : CAPTION, fontSize: 15, fontWeight: 500,
          }}
        >
          {initial ?? <User size={19} aria-hidden="true" />}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: ESPRESSO }}>{name}</span>
            {skin && (
              <span style={{ fontFamily: DISPLAY, fontStyle: "italic", fontWeight: 700, fontSize: 14, color: ESPRESSO }}>
                {SKIN_CHARACTER[skin]}
              </span>
            )}
          </div>
          {plain && <div style={{ fontSize: 13, color: CAPTION, marginTop: 1 }}>{plain}</div>}
        </div>
        {time && <div style={{ fontSize: 13, color: CAPTION, flexShrink: 0 }}>{time}</div>}
      </div>

      {/* 2. Context */}
      {(subject || verdict || typeLabel) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            {typeLabel && (
              <span
                style={{
                  fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase",
                  color: typeLabel.warning ? CRIMSON : ESPRESSO, whiteSpace: "nowrap", flexShrink: 0,
                }}
              >
                {typeLabel.text}
              </span>
            )}
            {subject && (
              <span
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6, border: CARD_BORDER, background: WARM_WHITE,
                  borderRadius: 999, padding: "6px 12px", fontSize: 13, color: ESPRESSO, minWidth: 0,
                }}
              >
                {subjectIcon}
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subject}</span>
              </span>
            )}
          </span>
          {verdict && (
            <span
              style={{
                border: `1px solid ${stampColor}`, color: stampColor, borderRadius: 999, padding: "5px 11px",
                fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase",
                whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              {verdict.label}
            </span>
          )}
        </div>
      )}

      {/* 3. Body */}
      {hook && hook.trim() && (
        <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.45, color: ESPRESSO, margin: "12px 0 0" }}>{hook.trim()}</p>
      )}
      {body && body.trim() && (
        <p
          style={{
            fontSize: 17, fontWeight: 500, lineHeight: 1.45, color: ESPRESSO,
            margin: hook && hook.trim() ? "6px 0 0" : "12px 0 0", whiteSpace: "pre-line",
          }}
        >
          {body.trim()}
        </p>
      )}

      {/* 4. Module */}
      {module}

      {/* 5. Details */}
      {shownDetails.length > 0 && (
        <div style={{ marginTop: 12, borderTop: CARD_BORDER }}>
          {shownDetails.map((d, i) => <DetailRow key={d.label} detail={d} first={i === 0} />)}
        </div>
      )}

      {/* 6. Actions */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 4, marginTop: 6,
          borderTop: CARD_BORDER, paddingTop: 6,
        }}
      >
        {like && <ActionButton action={like} icon={<Heart size={18} fill={like.active ? CRIMSON : "none"} aria-hidden="true" />} />}
        {reply && <ActionButton action={reply} icon={<MessageCircle size={18} aria-hidden="true" />} />}
        {quote && <ActionButton action={quote} icon={<QuoteIcon size={18} />} />}
        <span style={{ flex: 1 }} />
        {onDelete && (
          <ActionButton
            action={{ key: "Delete", onClick: onDelete, title: "Delete your post" }}
            icon={<Trash2 size={18} color={CRIMSON} aria-hidden="true" />}
            iconOnly
          />
        )}
        {save && <ActionButton action={save} icon={<Bookmark size={18} fill={save.active ? CRIMSON : "none"} aria-hidden="true" />} iconOnly />}
        {share && <ActionButton action={share} icon={<Share2 size={18} aria-hidden="true" />} iconOnly />}
      </div>

      {error && <div style={{ fontSize: 13, color: CRIMSON, marginTop: 6 }}>{error}</div>}
      {footer}
    </article>
  );
}
