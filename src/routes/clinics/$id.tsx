// clinic detail page v2
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { leadEvent, recordConsultationClick } from "@/lib/leads";
import { logClinicIntent, previousTreatmentSlug, websiteChannel } from "@/lib/clinicIntent";
import { classifyWebsite, isBookingPath, websiteLinkLabel } from "@/lib/bookingPath";
import { ClinicImage } from "@/components/ClinicImage";
import { clinicPhotos, displayImages, useCategoryImages, type ClinicPhoto } from "@/lib/clinicPhotos";
import { shownPrice } from "@/lib/clinicPrices";
// The app-wide floor under any displayed percentage. It lives in exactly one place.
import { MIN_TAGGED } from "@/lib/opinionAggregate";
import {
  ArrowLeft, Heart, Share2, MapPin, Sparkles, FileText,
  Phone, Car, Map as MapIcon, ChevronLeft, ChevronRight, Camera, Play, Globe2,
} from "lucide-react";

export const Route = createFileRoute("/clinics/$id")({
  // The clinic's own name replaces this as soon as the row loads (see the document.title
  // effect below); the route params only carry the id, so the static head is the fallback.
  head: () => ({
    meta: [
      { title: "Clinic — Skintea" },
      { name: "description", content: "LA skin clinics, med spas, laser clinics and dermatologists. No sponsored placements." },
    ],
  }),
  component: ClinicDetailPage,
});

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const WARM_WHITE = "#FFFCF8";
const BORDER = "#E8DDD4";
const MUTED = "#999999";
const CRIMSON_TINT = "#FEE8EC";
const CREAM_TINT = "#F5EFEC";
const TRACK = "#F0EAE4";

const SKIN_EMOJI: Record<string, string> = {
  oily: "🧈", dry: "🫙", combination: "🥯", normal: "🥛", sensitive: "🍑",
};

type Clinic = any;
type SkinScore = { skin_type: string; recommend_pct: number | null; field_provenance?: any };
type CTreatment = {
  id: string;
  price_from: number | null;
  price_unit: string | null;
  field_provenance?: any;
  treatment_id: string;
  treatments: { id: string; name: string; slug: string | null; active?: boolean | null } | null;
};
type Practitioner = { id: string; name: string; role: string; specialty: string };
type Review = {
  id: string; skin_type: string | null; body: string; agree_count: number;
  surprised_by: string | null; wish_known: string | null; created_at: string;
  treatment_id: string | null;
  treatments: { name: string } | null;
};

// Only the columns this page renders. clinic_reviews is readable by everyone, so "*" would send every reviewer's
// user_id to every visitor; the page never needs it (it does not show or compare authors). display_name_public is not
// read either: it governs "Who goes here" only (through clinic_who_visited), never a review or a tea card.
const REVIEW_COLUMNS = "id, skin_type, body, surprised_by, wish_known, created_at, agree_count, treatment_id, treatments(name)";

// ---------- Clinic photos by section ----------
// clinics.photos is an ordered array validated by clinic_photos_valid (url, source, and permission_granted_at for
// clinic_supplied). Each entry names the section it belongs to with a `section` key: outside, interior, results, staff,
// or parking. Parking is valid here but renders only inside the Parking section, never in the top gallery. An entry without
// a section appears in no section. Google Places photos never render anywhere (removed for licensing).
const PHOTO_SECTIONS = ["outside", "interior", "results", "staff", "parking"] as const;
type PhotoSection = (typeof PHOTO_SECTIONS)[number];
type SectionPhoto = ClinicPhoto & { section?: string; published_by?: string };

function sectionPhotos(photos: unknown, section: PhotoSection): SectionPhoto[] {
  return (clinicPhotos(photos) as SectionPhoto[]).filter((p) => {
    if (p.section !== section) return false;
    if (p.source === "google_places_scrape") return false;
    if (p.source === "clinic_supplied" && !/^\d{4}-\d{2}-\d{2}/.test(p.permission_granted_at ?? "")) return false;
    if (section === "results") {
      // HARD RULE (CLAUDE.md): a results photo is this clinic's own before and after, published by the clinic or by the
      // patient it belongs to, supplied with permission. Never stock, never another clinic's work, never a creator result
      // with an unnamed provider, never a Skintea shot. Anything short of that stays out and the section stays empty.
      return p.source === "clinic_supplied" && (p.published_by === "clinic" || p.published_by === "patient");
    }
    return p.source === "clinic_supplied" || p.source === "skintea_shot";
  });
}

// ---------- Open now, from the listed hours ----------
// Computed at render time in Los Angeles time from clinics.hours; the stored is_open_now / closes_at columns describe a
// single past moment and are never shown. Only a day entry that parses completely ("10 AM to 7 PM", "Closed",
// "Open 24 hours") produces a line; anything else produces nothing rather than a guess.
function parseClock(h: string, m: string | undefined, ap: string): number {
  let hour = Number(h) % 12;
  if (ap.toUpperCase() === "PM") hour += 12;
  return hour * 60 + (m ? Number(m) : 0);
}

function openNow(hours: any, now: Date = new Date()): { open: boolean; label: string } | null {
  if (!Array.isArray(hours)) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", weekday: "long", hour: "numeric", minute: "numeric", hour12: false,
  }).formatToParts(now);
  const day = parts.find((p) => p.type === "weekday")?.value;
  const hh = Number(parts.find((p) => p.type === "hour")?.value) % 24;
  const mm = Number(parts.find((p) => p.type === "minute")?.value);
  const entry = hours.find((e: any) => e && e.day === day);
  if (!entry || typeof entry.hours !== "string") return null;
  const text = entry.hours.replace(/ | /g, " ").trim();
  if (/^closed$/i.test(text)) return { open: false, label: "Closed today" };
  if (/^open 24 hours$/i.test(text)) return { open: true, label: "Open 24 hours" };
  const m = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*(?:to|–|-)\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!m) return null;
  const start = parseClock(m[1], m[2], m[3]);
  const end = parseClock(m[4], m[5], m[6]);
  if (end <= start) return null;
  const cur = hh * 60 + mm;
  const endLabel = `${m[4]}${m[5] ? `:${m[5]}` : ""} ${m[6].toUpperCase()}`;
  const startLabel = `${m[1]}${m[2] ? `:${m[2]}` : ""} ${m[3].toUpperCase()}`;
  if (cur >= start && cur < end) return { open: true, label: `Open now · closes ${endLabel}` };
  if (cur < start) return { open: false, label: `Closed now · opens ${startLabel}` };
  return { open: false, label: "Closed now" };
}

// A tracked clinics value renders only with its recorded source (clinics_enforce_provenance writes it).
function sourced(clinic: any, field: string): boolean {
  const p = clinic?.field_provenance?.[field];
  return p != null && typeof p.source === "string" && p.source !== "";
}

type HoursEntry = { day: string; hours: string };
const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT: Record<string, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
  Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};

function groupHours(hours: any): { label: string; hours: string }[] {
  if (!Array.isArray(hours)) return [];
  const entries = hours
    .filter((h): h is HoursEntry => h && typeof h.day === "string" && typeof h.hours === "string")
    .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));
  if (entries.length === 0) return [];

  const groups: { days: string[]; hours: string }[] = [];
  let current: { days: string[]; hours: string } | null = null;

  for (const e of entries) {
    if (!current || current.hours !== e.hours) {
      current = { days: [e.day], hours: e.hours };
      groups.push(current);
    } else {
      current.days.push(e.day);
    }
  }

  return groups.map((g) => ({ label: formatDayGroup(g.days), hours: g.hours }));
}

function formatDayGroup(days: string[]): string {
  if (days.length === 1) return DAY_SHORT[days[0]] ?? days[0];
  if (days.length === 7) return "Mon–Sun";

  const sorted = [...days].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  const indices = sorted.map((d) => DAY_ORDER.indexOf(d));
  const isConsecutive = indices.every((idx, i) => i === 0 || idx === indices[i - 1] + 1);
  if (isConsecutive) {
    return `${DAY_SHORT[sorted[0]]}–${DAY_SHORT[sorted[sorted.length - 1]]}`;
  }

  const runs: string[][] = [];
  let run: string[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (DAY_ORDER.indexOf(sorted[i]) === DAY_ORDER.indexOf(sorted[i - 1]) + 1) {
      run.push(sorted[i]);
    } else {
      runs.push(run);
      run = [sorted[i]];
    }
  }
  runs.push(run);

  return runs
    .map((r) => (r.length === 1 ? DAY_SHORT[r[0]] : `${DAY_SHORT[r[0]]}–${DAY_SHORT[r[r.length - 1]]}`))
    .join(", ");
}


// A skin score carries its sample size in field_provenance (enforce_skin_score_measured:
// source = skintea_measured, n >= 10). No n, no percentage — the figure never renders bare.
function skinScoreN(s: SkinScore | undefined | null): number | null {
  const fp = s?.field_provenance;
  const raw = fp?.recommend_pct?.n ?? fp?.n ?? null;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

// Thousands are floored to one decimal: 1,500 reads "1.5k", never "2k".
function compactCount(n: number): string {
  if (n < 1000) return `${n}`;
  return `${Math.floor(n / 100) / 10}k`;
}

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 9, fontWeight: 800, letterSpacing: "0.14em",
  textTransform: "uppercase", color: CRIMSON,
};

// The honest empty state, same shape as the treatment page: the section header and frame always render, and where
// there is no data the frame says what it will hold and that there is not enough yet. A section is never hidden for
// being empty and never filled with placeholder content.
function EmptyState({ children, cta }: { children: React.ReactNode; cta?: React.ReactNode }) {
  return (
    <div style={{ border: `1px dashed ${BORDER}`, borderRadius: 10, padding: "12px 13px", background: CREAM_TINT }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, marginBottom: 5 }}>Not enough data yet</div>
      <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.55 }}>{children}</div>
      {cta}
    </div>
  );
}

// One line under the sections that can only be filled by someone who went. The click fires lead_events
// 'experience_cta_click' {clinic_id, section} before any sign-in step (see openExperience in the page), and
// lead_event_add never promotes the intent stage for it: a past patient is not a purchase-intent lead.
function ExperienceCta({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        marginTop: 8, background: "none", border: "none", padding: 0, cursor: "pointer",
        color: CRIMSON, fontSize: 11.5, fontWeight: 700, textAlign: "left",
      }}
    >
      Been here? Tell us what actually happened.
    </button>
  );
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ padding: "16px", borderBottom: `0.5px solid ${BORDER}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={SECTION_LABEL}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

// ---------- Photo grid for one of the four photo sections ----------
function PhotoGrid({ photos, alt }: { photos: SectionPhoto[]; alt: string }) {
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const shown = photos.filter((p) => !failed.has(p.url));
  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
      {shown.map((p) => (
        <img
          key={p.url}
          src={p.url}
          alt={p.alt || alt}
          loading="lazy"
          onError={() => setFailed((prev) => new Set(prev).add(p.url))}
          style={{ width: 132, height: 100, objectFit: "cover", borderRadius: 8, flexShrink: 0, background: CREAM_TINT }}
        />
      ))}
    </div>
  );
}

// ---------- Map ----------
// Why not an embed or a map library: OpenStreetMap's embed page now draws with WebGL (MapLibre), which renders a blank
// frame wherever WebGL is unavailable (headless browsers, some in-app webviews, low-power modes), and a keyed library adds
// a script, a key and a CSP surface that can each fail silently. This draws plain OpenStreetMap raster tiles (256 px
// <img>s at zoom 16) positioned around the clinic's coordinates, with a marker and the required attribution. No script,
// no key, no WebGL. It renders only with both coordinates; without them the section shows the address and a link out.
// OpenStreetMap's tile policy allows light use with attribution; move to a tile provider before heavy public traffic.
const MAP_ZOOM = 16;
function ClinicMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const n = 256 * 2 ** MAP_ZOOM;
  const px = ((lng + 180) / 360) * n;
  const rad = (lat * Math.PI) / 180;
  const py = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
  const tx0 = Math.floor(px / 256);
  const ty0 = Math.floor(py / 256);
  const tiles: { key: string; src: string; left: number; top: number }[] = [];
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const tx = tx0 + dx;
      const ty = ty0 + dy;
      tiles.push({ key: `${tx}-${ty}`, src: `https://tile.openstreetmap.org/${MAP_ZOOM}/${tx}/${ty}.png`, left: tx * 256 - px, top: ty * 256 - py });
    }
  }
  return (
    <div style={{ marginTop: 10 }}>
      <div role="img" aria-label={`Map showing the location of ${name}`}
        style={{ position: "relative", width: "100%", height: 180, overflow: "hidden", border: `0.5px solid ${BORDER}`, borderRadius: 10, background: CREAM_TINT }}>
        <div style={{ position: "absolute", left: "50%", top: "50%" }}>
          {tiles.map((t) => (
            <img key={t.key} src={t.src} alt="" draggable={false} loading="lazy" referrerPolicy="strict-origin-when-cross-origin"
              style={{ position: "absolute", width: 256, height: 256, left: t.left, top: t.top, maxWidth: "none" }} />
          ))}
          <div style={{ position: "absolute", left: -8, top: -8, width: 16, height: 16, borderRadius: 16, background: CRIMSON, border: "2px solid #fff", boxSizing: "border-box" }} />
        </div>
      </div>
      <div style={{ fontSize: 9.5, color: MUTED, marginTop: 4 }}>
        Map ©{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: MUTED }}>OpenStreetMap contributors</a>
      </div>
    </div>
  );
}

// ---------- "From the clinic" reply slot ----------
// A clinic answers a review here; it never writes the review. Clinics can NEVER author tea (CLAUDE.md): the layer's only
// value is that the business did not write it. There is no clinic login and no column or table for a reply yet, so every
// card passes no reply and the slot only says what it is for.
function ClinicReplySlot({ reply }: { reply?: { body: string; at: string } | null }) {
  return (
    <div style={{ marginTop: 10, borderTop: `0.5px dashed ${BORDER}`, paddingTop: 8 }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED }}>From the clinic</div>
      {reply ? (
        <div style={{ fontSize: 11.5, color: ESPRESSO, lineHeight: 1.5, marginTop: 3 }}>{reply.body}</div>
      ) : (
        <div style={{ fontSize: 10.5, color: MUTED, marginTop: 3 }}>Clinics will be able to reply here once they can sign in. They cannot edit or remove what was written.</div>
      )}
    </div>
  );
}

// ---------- The tea: one slide per review, always anonymous ----------
function TeaCarousel({ reviews }: { reviews: Review[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const go = (next: number) => {
    const el = trackRef.current;
    const i = Math.max(0, Math.min(reviews.length - 1, next));
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setIndex(i);
  };
  const field = (label: string, text: string | null) =>
    text && text.trim() !== "" ? (
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: CRIMSON }}>{label}</div>
        <div style={{ fontSize: 12.5, color: ESPRESSO, lineHeight: 1.55, marginTop: 3, whiteSpace: "pre-wrap" }}>{text}</div>
      </div>
    ) : null;
  return (
    <div>
      <div
        ref={trackRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.clientWidth > 0) setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
      >
        {reviews.map((r) => (
          <div key={r.id} style={{ flex: "0 0 100%", scrollSnapAlign: "start", boxSizing: "border-box", paddingRight: 2 }}>
            {/* Anonymous always: no name, handle or avatar, whatever the author chose for "Who goes here". */}
            <div style={{ background: "#fff", border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 10, color: MUTED }}>A signed-in visitor · name never shown</div>
              {field("What actually happened", r.body)}
              {field("What surprised them", r.surprised_by)}
              {field("What they wish they knew before", r.wish_known)}
              <ClinicReplySlot reply={null} />
            </div>
          </div>
        ))}
      </div>
      {reviews.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 10 }}>
          <button type="button" aria-label="Previous" onClick={() => go(index - 1)} disabled={index === 0}
            style={{ background: "none", border: `0.5px solid ${BORDER}`, borderRadius: 20, width: 30, height: 30, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: index === 0 ? "default" : "pointer", opacity: index === 0 ? 0.4 : 1 }}>
            <ChevronLeft size={14} color={ESPRESSO} />
          </button>
          <span style={{ fontSize: 11, color: MUTED }}>{index + 1} / {reviews.length}</span>
          <button type="button" aria-label="Next" onClick={() => go(index + 1)} disabled={index >= reviews.length - 1}
            style={{ background: "none", border: `0.5px solid ${BORDER}`, borderRadius: 20, width: 30, height: 30, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: index >= reviews.length - 1 ? "default" : "pointer", opacity: index >= reviews.length - 1 ? 0.4 : 1 }}>
            <ChevronRight size={14} color={ESPRESSO} />
          </button>
        </div>
      )}
    </div>
  );
}

function extractTikTokVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}

function instagramEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/^\/(?:p|reel|reels)\/([^/]+)/);
    return match ? `https://www.instagram.com/p/${match[1]}/embed/` : null;
  } catch {
    return null;
  }
}

// Every card says whose account posted it and carries the recorded disclosure labels. Thumbnail URLs may expire, so a
// failed image falls back to a plain frame; tapping the card is handled by the page and never navigates away.
function VideoCard({ v, onPlay }: { v: any; onPlay: () => void }) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const relationship =
    v.relationship === "official" ? "Clinic's own account" : v.relationship === "creator" ? "Creator video" : "Account not identified";
  return (
    <button type="button" onClick={onPlay} style={{ textAlign: "left", padding: 0, border: "none", width: "100%", cursor: "pointer", background: "none" }}>
      <div style={{ width: "100%", aspectRatio: "9/16", borderRadius: 8, overflow: "hidden", background: ESPRESSO, position: "relative" }}>
        {v.thumbnail_url && !thumbFailed ? (
          <img src={v.thumbnail_url} alt={v.caption || `Video posted by ${v.author_handle || "this account"}`} loading="lazy" onError={() => setThumbFailed(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: ESPRESSO, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Camera size={20} color={MUTED} />
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ width: 30, height: 30, borderRadius: 30, background: "rgba(255,252,248,0.88)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Play size={13} color={ESPRESSO} fill={ESPRESSO} />
          </span>
        </div>
        <div style={{ position: "absolute", top: 5, left: 5, right: 5, display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
          <span style={{ background: "rgba(255,252,248,0.92)", color: ESPRESSO, fontSize: 7.5, fontWeight: 800, padding: "2px 4px", borderRadius: 3 }}>{relationship}</span>
          {v.disclosed_paid === true && <span style={{ background: CRIMSON, color: WARM_WHITE, fontSize: 7.5, fontWeight: 800, padding: "2px 4px", borderRadius: 3 }}>Paid partnership</span>}
          {v.field_provenance?.disclosure?.platform_ad === true && <span style={{ background: ESPRESSO, color: WARM_WHITE, fontSize: 7.5, fontWeight: 800, padding: "2px 4px", borderRadius: 3 }}>Ad</span>}
        </div>
        {(Number(v.views) > 0 || Number(v.likes) > 0) && (
          <div style={{ position: "absolute", bottom: 5, right: 5, display: "flex", gap: 3 }}>
            {Number(v.views) > 0 && <span style={{ background: "rgba(28,10,0,0.75)", color: WARM_WHITE, fontSize: 7.5, fontWeight: 700, padding: "2px 4px", borderRadius: 3 }}>{compactCount(Number(v.views))} views</span>}
            {Number(v.likes) > 0 && <span style={{ background: "rgba(28,10,0,0.75)", color: WARM_WHITE, fontSize: 7.5, fontWeight: 700, padding: "2px 4px", borderRadius: 3 }}>{compactCount(Number(v.likes))} likes</span>}
          </div>
        )}
      </div>
      {(v.author_handle || v.caption) && (
        <div style={{ paddingTop: 5 }}>
          {v.author_handle && <div style={{ fontSize: 9.5, fontWeight: 700, color: ESPRESSO }}>@{String(v.author_handle).replace(/^@/, "")}</div>}
          {v.caption && <div style={{ fontSize: 8.5, lineHeight: 1.35, color: MUTED, marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{v.caption}</div>}
        </div>
      )}
    </button>
  );
}

function ClinicDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  // Treatment context for intent logging: the treatment page the visitor came from, read once on arrival.
  const [arrivalTreatmentId, setArrivalTreatmentId] = useState<string | null>(null);
  useEffect(() => {
    const slug = previousTreatmentSlug(`/clinics/${id}`);
    if (!slug) { setArrivalTreatmentId(null); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase.from("treatments").select("id").eq("slug", slug).maybeSingle();
      if (alive) setArrivalTreatmentId((data as { id: string } | null)?.id ?? null);
    })();
    return () => { alive = false; };
  }, [id]);

  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [skinScores, setSkinScores] = useState<SkinScore[]>([]);
  const [treatments, setTreatments] = useState<CTreatment[]>([]);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [socials, setSocials] = useState<{ platform: string; url: string; handle: string | null }[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeGallerySection, setActiveGallerySection] = useState<Exclude<PhotoSection, "parking">>("outside");
  const [activeThumbIndex, setActiveThumbIndex] = useState(0);
  const [pageTab, setPageTab] = useState<"info" | "tea">("info");
  // Saved state comes from saved_clinics (RLS: a user reads and writes only their own rows). Signed out it is false.
  const [saved, setSaved] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [inquireFor, setInquireFor] = useState<CTreatment | null>(null);
  const [userSkin, setUserSkin] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<string>("all");
  const [activeVideoTab, setActiveVideoTab] = useState<"about" | "official">("about");
  const [showAllVideos, setShowAllVideos] = useState(false);
  const [activeVideo, setActiveVideo] = useState<any | null>(null);
  const [videoEmbedFailed, setVideoEmbedFailed] = useState(false);
  // Who goes here: opted-in visits (RLS "Public sees opted-in visits": is_public), their profiles, the signed-in
  // visitor's own visits, and the aggregate view (clinic_visitor_profile returns a clinic only at 5+ visitors).
  const [publicVisitors, setPublicVisitors] = useState<{ user_id: string; visited_at: string; name: string | null; username: string | null; avatar_url: string | null }[]>([]);
  const [visitorProfile, setVisitorProfile] = useState<Record<string, number> | null>(null);
  // Review submission. clinic_reviews already accepts a signed-in author's own row (RLS "Users can create reviews":
  // auth.uid() = user_id, plus the signed-in-author and integrity triggers), so no schema or policy change is needed.
  const [userId, setUserId] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewSurprised, setReviewSurprised] = useState("");
  const [reviewWish, setReviewWish] = useState("");
  // "Show my name on this clinic's page." Unticked by default, always. It sets display_name_public, which the
  // clinic_reviews_mark_visit trigger copies to clinic_who_visited.is_public. It never puts a name on a review.
  const [reviewShowName, setReviewShowName] = useState(false);
  // The form opens under the section whose "Been here?" link was tapped.
  const [formSection, setFormSection] = useState<string>("the_tea");
  const [reviewBody, setReviewBody] = useState("");
  const [reviewSkin, setReviewSkin] = useState("");
  const [reviewTreatment, setReviewTreatment] = useState("");
  const [reviewState, setReviewState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [reviewError, setReviewError] = useState<string | null>(null);


  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (alive) setUserId(data.user?.id ?? null);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    setSaved(false);
    setSaveError(null);
    if (!userId) return;
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("saved_clinics")
        .select("id")
        .eq("user_id", userId)
        .eq("clinic_id", id)
        .maybeSingle();
      if (!alive) return;
      if (error) { setSaveError("Could not check whether this clinic is saved."); return; }
      setSaved(!!data);
    })();
    return () => { alive = false; };
  }, [userId, id]);

  // The signed-in visitor's own visits to this clinic (RLS "Users see only their own visits"). Private to them.
  useEffect(() => {
    setVisitors([]);
    if (!userId) return;
    let alive = true;
    (async () => {
      const { data } = await supabase.from("clinic_who_visited").select("id, visited_at, is_public").eq("clinic_id", id).eq("user_id", userId).order("visited_at", { ascending: false });
      if (alive) setVisitors((data as any) || []);
    })();
    return () => { alive = false; };
  }, [userId, id]);

  // The heart only changes after the write succeeds; on failure it stays as it was and says so.
  async function toggleSaved() {
    if (!userId) { navigate({ to: "/login" }).catch(() => {}); return; }
    if (savePending) return;
    setSavePending(true);
    setSaveError(null);
    const { error } = saved
      ? await supabase.from("saved_clinics").delete().eq("user_id", userId).eq("clinic_id", id)
      : await supabase.from("saved_clinics").insert({ user_id: userId, clinic_id: id });
    setSavePending(false);
    if (error) {
      setSaveError(saved ? "Could not remove from saved. Try again." : "Could not save. Try again.");
      return;
    }
    setSaved(!saved);
  }

  useEffect(() => {
    try {
      const s = localStorage.getItem("skintea_skin_type");
      if (s) {
        setUserSkin(s.toLowerCase());
        setReviewFilter(s.toLowerCase());
      }
    } catch {}
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      // Anonymous visitors cannot read clinic_who_visited (no grant; the request returned 401), so the public-visitor
      // query is sent only with a session (2026-09-16).
      const { data: sessionData } = await supabase.auth.getSession();
      const signedIn = !!sessionData.session;
      const [c, ss, ct, pr, pv, rv, cv, sl, vp] = await Promise.all([
        // Only listings that passed the filter render; 'unsure' and 'dropped' read as not found.
        supabase.from("clinics").select("*").eq("id", id).eq("listing_filter", "passed").maybeSingle(),
        supabase.from("clinic_skin_scores").select("*").eq("clinic_id", id),
        // Inactive treatments (e.g. "Laser", a category) are not listed at all.
        supabase.from("clinic_treatments").select("*, treatments!inner(id, name, slug, active)").eq("clinic_id", id).eq("treatments.active", true),
        supabase.from("clinic_practitioners").select("*").eq("clinic_id", id),
        signedIn
          ? supabase.from("clinic_who_visited").select("user_id, visited_at").eq("clinic_id", id).eq("is_public", true).order("visited_at", { ascending: false }).limit(24)
          : Promise.resolve({ data: [] as { user_id: string; visited_at: string }[] }),
        supabase.from("clinic_reviews").select(REVIEW_COLUMNS).eq("clinic_id", id).order("created_at", { ascending: false }),
        supabase.from("clinic_videos").select("*").eq("clinic_id", id).eq("is_active", true).order("posted_at", { ascending: false, nullsFirst: false }),
        // Public social profiles: clinic_social_links is the one source of truth for handles (clinics.instagram_url and
        // clinics.tiktok_url were reconciled into it on 2026-09-16 and are not read anywhere in the app).
        (supabase as any).from("clinic_social_links").select("platform, url, handle").eq("clinic_id", id).in("platform", ["instagram", "tiktok", "youtube"]).order("platform"),
        (supabase as any).from("clinic_visitor_profile").select("*").eq("clinic_id", id).maybeSingle(),
      ]);
      if (!alive) return;
      setClinic(c.data);
      setSkinScores((ss.data as any) || []);
      const ctData = (ct.data as any) || [];
      setTreatments(ctData);
      setPractitioners((pr.data as any) || []);
      setReviews((rv.data as any) || []);
      setVideos((cv.data as any) || []);
      // Handles are unique per platform on the page: a clinic listing the same account twice shows it once.
      const seen = new Set<string>();
      setSocials((((sl.data as any) || []) as { platform: string; url: string; handle: string | null }[]).filter((s) => {
        const key = `${s.platform}:${(s.handle ?? s.url).toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }));
      setVisitorProfile((vp.data as any) ?? null);
      const pvRows = ((pv.data as any) || []) as { user_id: string; visited_at: string }[];
      if (pvRows.length > 0) {
        // profiles.name is not readable through the API (2026-09-16). clinic_public_visitor_names returns name, username and
        // avatar only for people who ticked "Show my name on this clinic's page" for this clinic.
        const { data: profs } = await (supabase as any).rpc("clinic_public_visitor_names", { p_clinic: id });
        if (!alive) return;
        const byUser = new Map(((profs as any[]) || []).map((p) => [p.user_id, p]));
        setPublicVisitors(pvRows.map((r) => ({
          user_id: r.user_id, visited_at: r.visited_at,
          name: byUser.get(r.user_id)?.name ?? null, username: byUser.get(r.user_id)?.username ?? null,
          avatar_url: byUser.get(r.user_id)?.avatar_url ?? null,
        })));
      } else {
        setPublicVisitors([]);
      }

      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    const aboutCount = videos.filter((v) => v.relationship !== "official").length;
    setActiveVideoTab(aboutCount > 0 ? "about" : "official");
    setShowAllVideos(false);
  }, [videos]);

  useEffect(() => {
    setVideoEmbedFailed(false);
    if (!activeVideo || activeVideo.platform !== "tiktok") return;
    const existing = document.getElementById("tiktok-embed-script");
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.id = "tiktok-embed-script";
    script.async = true;
    script.src = "https://www.tiktok.com/embed.js";
    script.onerror = () => setVideoEmbedFailed(true);
    document.body.appendChild(script);
    const timeout = window.setTimeout(() => {
      const rendered = document.querySelector("[data-clinic-video-lightbox] iframe");
      if (!rendered) setVideoEmbedFailed(true);
    }, 8000);
    return () => window.clearTimeout(timeout);
  }, [activeVideo]);

  // clinic_view once per mount per clinic id, only after a listed clinic has loaded (the ref
  // also absorbs StrictMode's double effect run). leads.ts holds a first view in the browser.
  const viewedClinicRef = useRef<string | null>(null);
  useEffect(() => {
    if (!clinic || clinic.id !== id || viewedClinicRef.current === id) return;
    viewedClinicRef.current = id;
    void leadEvent("clinic_view", { clinic_id: id });
  }, [clinic, id]);

  // Title the tab with the clinic once the row is loaded. The route's static head covers the
  // load and the not-found case; params only carry the id, so the name can only come from here.
  useEffect(() => {
    if (typeof document === "undefined" || !clinic?.name) return;
    document.title = `${clinic.name} — Skintea`;
  }, [clinic?.name]);

  // A visitor's own review. agree_count is left at its default 0 (the integrity trigger rejects a seeded count) and
  // field_provenance stays {} — a signed-in author is the source, recorded by user_id. body is required; surprised_by and
  // wish_known are optional. display_name_public comes only from the unticked-by-default checkbox.
  async function submitReview() {
    if (!userId || reviewBody.trim().length < 10) return;
    setReviewState("saving");
    setReviewError(null);
    const { error } = await supabase.from("clinic_reviews").insert({
      clinic_id: id,
      user_id: userId,
      body: reviewBody.trim(),
      surprised_by: reviewSurprised.trim() || null,
      wish_known: reviewWish.trim() || null,
      display_name_public: reviewShowName === true,
      skin_type: reviewSkin || null,
      treatment_id: reviewTreatment || null,
    } as any);
    if (error) {
      setReviewState("error");
      setReviewError(error.message);
      return;
    }
    setReviewState("saved");
    setReviewBody("");
    setReviewSurprised("");
    setReviewWish("");
    setReviewShowName(false);
    const { data } = await supabase.from("clinic_reviews").select(REVIEW_COLUMNS).eq("clinic_id", id).order("created_at", { ascending: false });
    setReviews((data as any) || []);
    setShowReviewForm(false);
  }

  // "Been here?" — the lead event is sent first, before the form opens and before any sign-in step, so the number of
  // people the sign-in wall turns away can be measured. lead_event_add does not promote the stage for this type.
  function openExperience(section: string) {
    void leadEvent("experience_cta_click", { clinic_id: id, section });
    setFormSection(section);
    setShowReviewForm(true);
  }

  const textareaStyle: React.CSSProperties = {
    width: "100%", padding: "8px", fontSize: 12, border: `0.5px solid ${BORDER}`, borderRadius: 6, resize: "vertical",
    color: ESPRESSO, fontFamily: "inherit", boxSizing: "border-box",
  };
  const fieldLabel: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, color: ESPRESSO, margin: "10px 0 4px" };

  // The submission form itself. Shown only when the visitor asks for it, and only usable when signed in: the table's
  // policy requires user_id = auth.uid(), so an anonymous insert is refused by the database, not just by this UI.
  const reviewFormBlock = !showReviewForm ? null : (
    <div style={{ marginTop: 12, border: `0.5px solid ${BORDER}`, borderRadius: 10, padding: 12, background: "#fff" }}>
      {!userId ? (
        <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.55 }}>
          Reviews are signed, so we know each one comes from a real visit.{" "}
          <Link to="/login" style={{ color: CRIMSON, fontWeight: 700 }}>Sign in</Link> to add yours.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11.5, color: ESPRESSO, marginBottom: 8, lineHeight: 1.5 }}>
            Your review is always shown without your name. The clinic cannot write, edit or remove it.
          </div>
          <select
            value={reviewTreatment}
            onChange={(e) => setReviewTreatment(e.target.value)}
            style={{ width: "100%", marginBottom: 8, padding: "7px 8px", fontSize: 12, border: `0.5px solid ${BORDER}`, borderRadius: 6, background: "#fff", color: ESPRESSO }}
          >
            <option value="">Treatment (optional)</option>
            {treatments.map((t) => (
              <option key={t.id} value={t.treatment_id}>{t.treatments?.name ?? "Treatment"}</option>
            ))}
          </select>
          <select
            value={reviewSkin}
            onChange={(e) => setReviewSkin(e.target.value)}
            style={{ width: "100%", marginBottom: 8, padding: "7px 8px", fontSize: 12, border: `0.5px solid ${BORDER}`, borderRadius: 6, background: "#fff", color: ESPRESSO }}
          >
            <option value="">Your skin type (optional)</option>
            {["oily", "combination", "dry", "sensitive", "normal"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <div style={fieldLabel}>What actually happened? <span style={{ color: CRIMSON }}>*</span></div>
          <textarea
            value={reviewBody}
            onChange={(e) => setReviewBody(e.target.value)}
            rows={4}
            placeholder="What you had done and how it went."
            style={textareaStyle}
          />
          <div style={fieldLabel}>What surprised you? <span style={{ color: MUTED, fontWeight: 500 }}>(optional)</span></div>
          <textarea value={reviewSurprised} onChange={(e) => setReviewSurprised(e.target.value)} rows={2} style={textareaStyle} />
          <div style={fieldLabel}>What do you wish you had known before? <span style={{ color: MUTED, fontWeight: 500 }}>(optional)</span></div>
          <textarea value={reviewWish} onChange={(e) => setReviewWish(e.target.value)} rows={2} style={textareaStyle} />
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 10, fontSize: 11.5, color: ESPRESSO, cursor: "pointer" }}>
            <input type="checkbox" checked={reviewShowName} onChange={(e) => setReviewShowName(e.target.checked)} style={{ marginTop: 2 }} />
            <span>
              Show my name on this clinic's page.
              <span style={{ display: "block", color: MUTED, fontSize: 10.5 }}>Only in "Who goes here". Your review stays anonymous either way.</span>
            </span>
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => { void submitReview(); }}
              disabled={reviewState === "saving" || reviewBody.trim().length < 10}
              style={{
                background: reviewBody.trim().length < 10 ? BORDER : CRIMSON, color: "#fff", border: "none",
                fontSize: 11, fontWeight: 800, textTransform: "uppercase", padding: "7px 14px", borderRadius: 20,
                cursor: reviewBody.trim().length < 10 ? "default" : "pointer",
              }}
            >
              {reviewState === "saving" ? "Posting…" : "Post"}
            </button>
            <button type="button" onClick={() => setShowReviewForm(false)} style={{ background: "none", border: "none", color: MUTED, fontSize: 11, cursor: "pointer" }}>Cancel</button>
            {reviewState === "error" && (
              <span style={{ fontSize: 11, color: CRIMSON }}>Could not post: {reviewError}</span>
            )}
          </div>
        </>
      )}
    </div>
  );

  const categoryImages = useCategoryImages();
  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(new Set());
  const markFailed = (url: string) => setFailedPhotos((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));
  // Failed photos are removed from the active category list, so its hero and thumbnails always stay in step. Each
  // category keeps sectionPhotos' source and permission rules. With no usable photos, displayImages supplies the marked
  // category image; with no category image either, ClinicImage supplies its existing plain placeholder.
  const activeSectionPhotos = clinic ? sectionPhotos(clinic.photos, activeGallerySection) : [];
  const galleryImages = clinic
    ? displayImages({ ...(clinic as any), photos: activeSectionPhotos }, categoryImages, 800, failedPhotos)
    : [];
  const galleryClinicImages = galleryImages.filter((image) => image.kind === "clinic");
  const galleryIndex = Math.min(activeThumbIndex, Math.max(galleryImages.length - 1, 0));
  const parkingPhotos = clinic ? sectionPhotos(clinic.photos, "parking") : [];

  // A skin score is displayable only with its own sample size, at or above the same floor as
  // every other percentage in the app (MIN_TAGGED). Rows without an n never render a figure.
  const shownSkinScores = useMemo(
    () =>
      skinScores
        .map((s) => ({ skin_type: s.skin_type, pct: s.recommend_pct, n: skinScoreN(s) }))
        .filter((s): s is { skin_type: string; pct: number; n: number } =>
          s.pct != null && s.n != null && s.n >= MIN_TAGGED
        ),
    [skinScores]
  );

  const userSkinScore = useMemo(
    () => (userSkin ? shownSkinScores.find((s) => s.skin_type === userSkin) ?? null : null),
    [userSkin, shownSkinScores]
  );

  // Distance and travel time need a point to measure from. Skintea never asks for the
  // browser's location and stores no home address, so there is no origin and neither figure
  // can render. Switch this on only when a real origin exists — a location the user granted,
  // or an address they typed — and compute from that, never from a stored column.
  const userOrigin: { lat: number; lng: number } | null = null;

  const filteredReviews = useMemo(() => {
    if (reviewFilter === "all") return reviews;
    return reviews.filter((r) => r.skin_type === reviewFilter);
  }, [reviews, reviewFilter]);

  const handleBook = () => {
    if (clinic?.website_url) window.open(clinic.website_url, "_blank");
    logIntent("book", websiteKind === "booking_platform" ? "booking_platform" : "website", "action_bar");
    // consultation_click event, then the consultation_clicks row (linked to the lead server-side).
    void recordConsultationClick(id);
  };

  // The booking CTA must be able to act. With a website it opens the site; with only a phone it becomes
  // "Call to book" on a tel: link; with neither it does not render at all (it used to record a click and do nothing).
  // A website only counts as a booking path when it is the clinic's own site or a booking platform — an Instagram
  // profile, a directory, a hospital page, a short link or a mail-builder page cannot take a booking (src/lib/bookingPath.ts).
  const websiteKind = classifyWebsite(clinic?.website_url);
  const bookMode: "website" | "call" | null =
    clinic?.website_url && isBookingPath(websiteKind) ? "website" : clinic?.phone ? "call" : null;

  // One intent row per outbound action; fire-and-forget, never awaited, so the link follows at once.
  const logIntent = (
    action: Parameters<typeof logClinicIntent>[0]["action"],
    channel: Parameters<typeof logClinicIntent>[0]["channel"],
    surface: Parameters<typeof logClinicIntent>[0]["surface"],
    treatmentId?: string | null,
  ) => logClinicIntent({ clinicId: id, action, channel, page: "clinic_page", surface, treatmentId: treatmentId ?? arrivalTreatmentId });

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: MUTED, fontSize: 12, background: WARM_WHITE, minHeight: "100vh" }}>Loading…</div>;
  }
  if (!clinic) {
    return <div style={{ padding: 40, textAlign: "center", color: MUTED, fontSize: 12, background: WARM_WHITE, minHeight: "100vh" }}>Clinic not found.</div>;
  }

  const verified = clinic.is_verified === true
    && clinic.field_provenance?.is_verified?.source != null
    && clinic.field_provenance?.is_verified?.recorded_at != null;
  const featured = clinic.is_featured === true
    && clinic.field_provenance?.is_featured?.source != null
    && clinic.field_provenance?.is_featured?.recorded_at != null;
  const badges: string[] = Array.isArray(clinic.badges) && sourced(clinic, "badges") ? clinic.badges : [];
  const hasTake = typeof clinic.tea_quote === "string" && clinic.tea_quote.trim() !== "" && sourced(clinic, "tea_quote");
  const hasBestFor = Array.isArray(clinic.best_for) && clinic.best_for.length > 0;
  const hasKnownFor = typeof clinic.known_for === "string" && clinic.known_for.trim() !== "" && sourced(clinic, "known_for");
  const pricedN = treatments.filter((t) => shownPrice(t.price_from, t.price_unit, t.field_provenance)).length;
  const priceTier = clinic.price_tier != null && sourced(clinic, "price_tier") ? String(clinic.price_tier) : null;
  const priceFrom = clinic.price_from != null && sourced(clinic, "price_from") ? Number(clinic.price_from) : null;
  const hoursGroups = groupHours(clinic.hours);
  const now = openNow(clinic.hours);
  const hasAddress = typeof clinic.address === "string" && clinic.address.trim() !== "";
  const latitude = typeof clinic.latitude === "number" ? clinic.latitude : clinic.latitude != null ? Number(clinic.latitude) : NaN;
  const longitude = typeof clinic.longitude === "number" ? clinic.longitude : clinic.longitude != null ? Number(clinic.longitude) : NaN;
  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude) && !(latitude === 0 && longitude === 0);
  const mapsHref = hasAddress
    ? `https://maps.google.com/?q=${encodeURIComponent(clinic.address)}`
    : typeof clinic.google_maps_url === "string" && /^https:\/\//.test(clinic.google_maps_url) ? clinic.google_maps_url : null;
  const hasParkingText = clinic.parking_available != null || !!clinic.parking_notes || clinic.parking_is_free != null;
  const hasParkingPhotos = parkingPhotos.length > 0;
  const hasYelp = clinic.yelp_rating != null && sourced(clinic, "yelp_rating");
  const aboutVideos = videos.filter((v) => v.relationship !== "official");
  const officialVideos = videos.filter((v) => v.relationship === "official");
  const visibleVideos = activeVideoTab === "about" ? aboutVideos : officialVideos;
  const videoPlatform = activeVideo?.platform === "tiktok" ? "tiktok" : "instagram";
  const videoPlatformLabel = videoPlatform === "tiktok" ? "TikTok" : "Instagram";

  const sectionNodes: { key: string; hasData: boolean; node: React.ReactNode }[] = [
    {
      key: "take", hasData: hasTake, node: (
        <Section title="Skintea's take">
          {hasTake ? <div style={{ fontSize: 13, lineHeight: 1.6, color: ESPRESSO, fontStyle: "italic" }}>“{clinic.tea_quote}”</div>
            : <EmptyState>Skintea's own one-line read on this clinic: who it suits and what it is actually good at. Not written yet.</EmptyState>}
        </Section>
      ),
    },
    {
      key: "best_for", hasData: hasBestFor, node: (
        <Section title="What it's best for">
          {hasBestFor ? <><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{clinic.best_for.map((b: string) => <span key={b} style={{ background: CREAM_TINT, color: ESPRESSO, fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 20 }}>{b}</span>)}</div><div style={{ fontSize: 9.5, color: MUTED, marginTop: 8 }}>As the clinic describes itself on its own website.</div></>
            : <EmptyState>The concerns, audiences and ways of working this clinic states on its own website. Nothing recorded for this clinic yet.</EmptyState>}
        </Section>
      ),
    },
    {
      key: "treatments", hasData: treatments.length > 0, node: (
        <Section title="Treatments">
          {treatments.length === 0 ? <EmptyState>The treatments this clinic offers, each read from the clinic's own website, with a price only where the site states one. None recorded for this clinic yet.</EmptyState> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {treatments.map((t) => {
                const tName = t.treatments?.name ?? "Treatment";
                const price = shownPrice(t.price_from, t.price_unit, t.field_provenance);
                return <div key={t.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, background: CREAM_TINT, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>💉</div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: ESPRESSO }}>{tName}</div>{price && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}><span style={{ fontWeight: 700, color: ESPRESSO }}>{price.text}</span>{" · "}{price.url ? <a href={price.url} target="_blank" rel="noopener noreferrer" style={{ color: MUTED }}>{price.dateLabel}</a> : price.dateLabel}</div>}</div>
                    <button onClick={() => setInquireFor(t)} style={{ background: CRIMSON_TINT, color: CRIMSON, border: "none", fontSize: 10, fontWeight: 800, textTransform: "uppercase", padding: "6px 12px", borderRadius: 20, cursor: "pointer" }}>Inquire</button>
                  </div>
                  {t.treatments?.slug && t.treatments?.active !== false && <div style={{ paddingLeft: 44 }}><button onClick={() => { const slug = t.treatments?.slug; if (slug) navigate({ to: "/treatments/$slug", params: { slug } }).catch(() => {}); }} style={{ background: "none", border: "none", color: CRIMSON, fontSize: 10, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, padding: 0 }}><FileText size={11} /> What is {tName}?</button></div>}
                </div>;
              })}
            </div>
          )}
        </Section>
      ),
    },
    {
      key: "videos", hasData: videos.length > 0, node: (
        <Section title="Videos">
          <div role="tablist" aria-label="Clinic videos" style={{ display: "flex", borderBottom: `0.5px solid ${BORDER}`, marginBottom: 10 }}>
            {(["about", "official"] as const).map((tab) => {
              const count = tab === "about" ? aboutVideos.length : officialVideos.length;
              return <button key={tab} type="button" role="tab" aria-selected={activeVideoTab === tab} onClick={() => { setActiveVideoTab(tab); setShowAllVideos(false); }} style={{ flex: 1, background: "none", border: "none", borderBottom: activeVideoTab === tab ? `2px solid ${CRIMSON}` : "2px solid transparent", color: activeVideoTab === tab ? ESPRESSO : MUTED, fontSize: 10.5, fontWeight: activeVideoTab === tab ? 700 : 600, padding: "8px 3px 6px", cursor: "pointer" }}>{tab === "about" ? "About this clinic" : "From the clinic"}{count > 0 ? ` (${count})` : ""}</button>;
            })}
          </div>
          {visibleVideos.length > 0 ? <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 7 }}>{visibleVideos.slice(0, showAllVideos ? visibleVideos.length : 6).map((v) => <VideoCard key={v.id} v={v} onPlay={() => { setActiveVideo(v); logIntent("video_play", v.platform === "tiktok" ? "tiktok" : "instagram", "clinic_posts"); }} />)}</div>
            {visibleVideos.length > 6 && !showAllVideos && <button type="button" onClick={() => setShowAllVideos(true)} style={{ display: "block", margin: "12px auto 0", background: "none", border: `0.5px solid ${BORDER}`, borderRadius: 6, color: ESPRESSO, fontSize: 10.5, fontWeight: 700, padding: "6px 12px", cursor: "pointer" }}>See all {visibleVideos.length}</button>}
          </> : <EmptyState>{activeVideoTab === "about" ? "Videos about this clinic from people who went and from creators. Each card says who posted it and carries a paid-partnership label where one was disclosed. None collected yet." : "Posts from this clinic's own Instagram and TikTok accounts. None recorded yet."}</EmptyState>}
        </Section>
      ),
    },
    {
      key: "price", hasData: !!priceTier || priceFrom != null, node: (
        <Section title="Price tier">{priceTier || priceFrom != null ? <div style={{ fontSize: 12.5, color: ESPRESSO }}>{priceTier && <span style={{ fontWeight: 800 }}>{priceTier}</span>}{priceTier && priceFrom != null ? " · " : ""}{priceFrom != null && <span>from ${priceFrom}</span>}</div> : <EmptyState>How expensive this clinic is overall, from the prices it publishes. {pricedN > 0 ? `${pricedN} treatment price${pricedN === 1 ? " is" : "s are"} listed below; that is not enough to place the clinic in a tier yet.` : "No tier recorded yet."}</EmptyState>}</Section>
      ),
    },
    {
      key: "practitioners", hasData: practitioners.length > 0, node: (
        <Section title="Practitioners">{practitioners.length === 0 ? <EmptyState>The doctors, nurses and aestheticians who treat patients here, as the clinic lists them. None recorded yet; a clinic can send its team through the link at the bottom of this page.</EmptyState> : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{practitioners.map((p) => { const initials = p.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase(); return <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 42, height: 42, borderRadius: 42, background: BORDER, color: ESPRESSO, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{initials}</div><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: ESPRESSO }}>{p.name}</div><div style={{ fontSize: 11, color: MUTED }}>{p.role}</div></div>{p.specialty && <span style={{ background: CRIMSON_TINT, color: CRIMSON, fontSize: 9, fontWeight: 800, padding: "4px 8px", borderRadius: 4, textTransform: "uppercase" }}>{p.specialty}</span>}</div>; })}</div>}</Section>
      ),
    },
    {
      key: "known_for", hasData: hasKnownFor, node: <Section title="Known for">{hasKnownFor ? <div style={{ fontSize: 12.5, lineHeight: 1.6, color: ESPRESSO }}>{clinic.known_for}</div> : <EmptyState>What this clinic is known for in its own right — a signature treatment, a technique, a following. Nothing recorded yet.</EmptyState>}</Section>,
    },
    {
      key: "badges", hasData: verified || featured || badges.length > 0, node: (
        <Section title="Badges">{verified || featured || badges.length > 0 ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{verified && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: CRIMSON_TINT, color: CRIMSON, fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 20 }}><span style={{ width: 5, height: 5, borderRadius: 5, background: CRIMSON }} /> Verified</span>}{featured && <span style={{ background: ESPRESSO, color: WARM_WHITE, fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 20 }}>Skintea Pick</span>}{badges.map((b) => <span key={b} style={{ background: CREAM_TINT, color: ESPRESSO, fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 20 }}>{b}</span>)}</div> : <EmptyState>Verified, Skintea Pick and other badges. Each is awarded only against a written rule and recorded with who awarded it and when. No rule exists yet, so no clinic holds a badge.</EmptyState>}</Section>
      ),
    },
    {
      key: "yelp", hasData: hasYelp, node: <Section title="Yelp rating">{hasYelp ? <div style={{ fontSize: 12.5, color: ESPRESSO }}><span style={{ fontWeight: 800 }}>{clinic.yelp_rating}</span> on Yelp{clinic.yelp_review_count != null && sourced(clinic, "yelp_review_count") ? ` · ${clinic.yelp_review_count} reviews` : ""}<div style={{ fontSize: 9.5, color: MUTED, marginTop: 4 }}>Source: Yelp</div></div> : <EmptyState>This clinic's Yelp rating and review count, shown with Yelp named as the source. Skintea has no licensed Yelp data yet, so nothing is shown.</EmptyState>}</Section>,
    },
    {
      key: "hours", hasData: hoursGroups.length > 0, node: <Section title="Hours">{hoursGroups.length > 0 ? <>{now && <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 12 }}><span style={{ width: 7, height: 7, borderRadius: 7, background: now.open ? "#2D7A3A" : MUTED }} /><span style={{ color: now.open ? "#2D7A3A" : MUTED, fontWeight: 700 }}>{now.label}</span><span style={{ color: MUTED, fontSize: 10.5 }}>· from the listed hours</span></div>}<div style={{ display: "flex", flexDirection: "column" }}>{hoursGroups.map((h, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: `0.5px solid ${BORDER}`, fontSize: 12 }}><span style={{ color: MUTED }}>{h.label}</span><span style={{ color: ESPRESSO, fontWeight: 600, textAlign: "right" }}>{h.hours}</span></div>)}</div></> : <EmptyState>Opening hours, and whether the clinic is open right now. No hours recorded for this clinic yet; a clinic can send its own through the link at the bottom of this page.</EmptyState>}</Section>,
    },
    {
      key: "location", hasData: hasAddress || hasCoords, node: <Section title="Location">{!hasAddress && !hasCoords ? <EmptyState>The clinic's address and a map. No address recorded for this clinic yet.</EmptyState> : <>{hasAddress && <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12, color: ESPRESSO, lineHeight: 1.45 }}><MapPin size={14} style={{ flexShrink: 0, marginTop: 1 }} /><span>{clinic.address}</span></div>}{hasCoords && <ClinicMap lat={latitude} lng={longitude} name={clinic.name} />}{mapsHref && <a href={mapsHref} target="_blank" rel="noreferrer" onClick={() => logIntent("directions", "maps", "location_section")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: CREAM_TINT, borderRadius: 10, height: 44, marginTop: 10, color: ESPRESSO, fontSize: 11, fontWeight: 700, textDecoration: "none" }}><MapIcon size={14} /> Open in Maps</a>}</>}</Section>,
    },
    {
      key: "parking", hasData: hasParkingText || hasParkingPhotos, node: <Section title="Parking">{hasParkingText || hasParkingPhotos ? <>{hasParkingText && <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Car size={16} color={ESPRESSO} /><div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 700, color: ESPRESSO }}>{clinic.parking_available === true ? "Parking available" : clinic.parking_available === false ? "No parking" : "Parking"}</div>{clinic.parking_notes && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{clinic.parking_notes}</div>}</div>{clinic.parking_is_free != null && <span style={{ background: clinic.parking_is_free ? "#E8F5E9" : CREAM_TINT, color: clinic.parking_is_free ? "#2D7A3A" : MUTED, fontSize: 10, fontWeight: 800, padding: "4px 8px", borderRadius: 4, textTransform: "uppercase" }}>{clinic.parking_is_free ? "Free" : "Paid"}</span>}</div>}{hasParkingPhotos ? <div style={{ marginTop: hasParkingText ? 10 : 0 }}><PhotoGrid photos={parkingPhotos} alt={`Parking at ${clinic.name}`} /></div> : <div style={{ fontSize: 10.5, color: MUTED, marginTop: 8 }}>No parking photos yet.</div>}</> : <EmptyState>Whether there is parking, whether it is free, and photos of where to park and the entrance from the lot. Nothing recorded yet; photos come only from the clinic itself, with permission, or from Skintea.</EmptyState>}</Section>,
    },
  ];
  const sortedSectionNodes = sectionNodes.map((section, index) => ({ ...section, index })).sort((a, b) => Number(b.hasData) - Number(a.hasData) || a.index - b.index);
  const contactSocials = ["instagram", "tiktok", "youtube"].flatMap((platform) => socials.filter((social) => social.platform === platform));
  const hasContactLinks = !!clinic.website_url || contactSocials.length > 0 || !!clinic.phone || hasAddress;

  return (
    <div style={{ background: WARM_WHITE, minHeight: "100vh", color: ESPRESSO, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* 1. Sticky top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: WARM_WHITE, borderBottom: `0.5px solid ${BORDER}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px",
      }}>
        <Link to="/clinics" style={{
          display: "flex", alignItems: "center", gap: 6,
          color: ESPRESSO, fontSize: 13, fontWeight: 700, textDecoration: "none",
        }}>
          <ArrowLeft size={16} /> Clinics
        </Link>
        {saveError && (
          <span role="alert" style={{ flex: 1, textAlign: "right", marginRight: 12, fontSize: 11, color: CRIMSON }}>{saveError}</span>
        )}
        <div style={{ display: "flex", gap: 14 }}>
          <button
            onClick={() => { void toggleSaved(); }}
            disabled={savePending}
            aria-label={saved ? "Remove from saved clinics" : "Save clinic"}
            aria-pressed={saved}
            style={{ background: "none", border: "none", cursor: savePending ? "default" : "pointer", padding: 0, opacity: savePending ? 0.5 : 1 }}
          >
            <Heart size={18} color={saved ? CRIMSON : ESPRESSO} fill={saved ? CRIMSON : "none"} />
          </button>
          <button
            onClick={() => { if (navigator.share) navigator.share({ title: clinic.name, url: window.location.href }).catch(() => {}); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <Share2 size={18} color={ESPRESSO} />
          </button>
        </div>
      </div>

      {/* 2. Category photo gallery: sectionPhotos enforces every source rule; ClinicImage owns fallback rendering. */}
      <ClinicImage images={galleryImages} height={170} index={galleryIndex} showCount onFailed={markFailed} />
      <div role="tablist" aria-label="Clinic photo categories" style={{ display: "flex", borderBottom: `0.5px solid ${BORDER}` }}>
        {(["outside", "interior", "results", "staff"] as const).map((category) => (
          <button
            key={category}
            type="button"
            role="tab"
            aria-selected={activeGallerySection === category}
            onClick={() => { setActiveGallerySection(category); setActiveThumbIndex(0); }}
            style={{
              flex: 1, background: "none", border: "none",
              borderBottom: activeGallerySection === category ? `2px solid ${CRIMSON}` : "2px solid transparent",
              color: activeGallerySection === category ? ESPRESSO : MUTED,
              fontSize: 10.5, fontWeight: activeGallerySection === category ? 700 : 600,
              padding: "9px 4px 7px", cursor: "pointer", textTransform: "capitalize",
            }}
          >
            {category}
          </button>
        ))}
      </div>
      {galleryClinicImages.length > 1 && (
        <div style={{
          display: "flex", gap: 4, overflowX: "auto", padding: "6px 10px",
          scrollbarWidth: "none", background: WARM_WHITE, borderBottom: `0.5px solid ${BORDER}`,
        }}>
          {galleryClinicImages.map((photo, index) => (
            <button
              key={photo.url}
              type="button"
              onClick={() => setActiveThumbIndex(index)}
              aria-label={`Show ${activeGallerySection} photo ${index + 1}`}
              style={{ padding: 0, border: index === galleryIndex ? `1.5px solid ${CRIMSON}` : "1.5px solid transparent", borderRadius: 7, background: "none", cursor: "pointer", flexShrink: 0 }}
            >
              <ClinicImage images={[photo]} width={56} height={44} radius={6} compact onFailed={markFailed} />
            </button>
          ))}
        </div>
      )}

      {/*
        ===== THE CLINIC DETAIL PAGE, IN ORDER (CLAUDE.md "CLINIC DETAIL PAGE — SECTION ORDER") =====
        A section is never removed for being empty: it renders its heading, its frame and an honest empty state saying
        what it will hold. Never placeholder content, never a hidden section. Removing one needs an instruction naming it.
      */}

      {/* 5. Clinic hero block: name, neighbourhood, social profiles */}
      <div style={{ padding: "14px 16px", borderBottom: `0.5px solid ${BORDER}` }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: ESPRESSO, marginBottom: 6 }}>{clinic.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: MUTED, marginBottom: 10 }}>
          <MapPin size={12} />
          {/* Distance needs an origin; there is none, so it stays off (see userOrigin). */}
          <span>{clinic.neighborhood ?? ""}{userOrigin && clinic.distance_miles != null ? ` · ${clinic.distance_miles} mi` : ""}</span>
        </div>
        {/* The figure always carries its sample size and states no verdict of its own. */}
        {userSkin && userSkinScore && (
          <div style={{
            marginTop: 12, background: CRIMSON_TINT, borderRadius: 10,
            padding: "10px 12px", display: "flex", alignItems: "center", gap: 8,
            fontSize: 11, color: ESPRESSO, fontWeight: 600,
          }}>
            <Sparkles size={14} color={CRIMSON} />
            <span>{userSkinScore.pct}% of {userSkinScore.n} reviewers with {userSkin} skin recommend this clinic</span>
          </div>
        )}
      </div>

      {/* Always-visible Skintea summary: no Google or Yelp values enter these cells. */}
      <div style={{ display: "flex", borderBottom: `0.5px solid ${BORDER}` }}>
        {[
          clinic.skintea_score != null && reviews.length >= MIN_TAGGED
            ? { v: `${clinic.skintea_score}%`, l: "Recommend", sub: `of ${reviews.length} reviews`, pending: false }
            : { v: "Not enough yet", l: "Recommend", sub: `needs ${MIN_TAGGED} reviews`, pending: true },
          { v: `${reviews.length}`, l: "Tea", sub: "on Skintea", pending: false },
          clinic.trust_score != null && sourced(clinic, "trust_score")
            ? { v: `${clinic.trust_score}`, l: "Trust", sub: "", pending: false }
            : { v: "Not measured", l: "Trust", sub: "", pending: true },
        ].map((stat, index) => (
          <div key={stat.l} style={{ flex: 1, minWidth: 0, padding: "14px 4px", textAlign: "center", borderRight: index < 2 ? `0.5px solid ${BORDER}` : "none" }}>
            <div style={{ fontSize: stat.pending ? 11 : 19, fontWeight: stat.pending ? 700 : 800, color: stat.pending ? MUTED : ESPRESSO, minHeight: 23, display: "flex", alignItems: "center", justifyContent: "center" }}>{stat.v}</div>
            <div style={{ fontSize: 9, textTransform: "uppercase", color: MUTED, letterSpacing: "0.08em", marginTop: 2 }}>{stat.l}</div>
            {stat.sub && <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{stat.sub}</div>}
          </div>
        ))}
      </div>

      {/* Shared page tabs; local state only. */}
      <div role="tablist" aria-label="Clinic details" style={{ display: "flex", borderBottom: `0.5px solid ${BORDER}` }}>
        {(["info", "tea"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={pageTab === tab}
            onClick={() => setPageTab(tab)}
            style={{
              flex: 1, background: "none", border: "none",
              borderBottom: pageTab === tab ? `2px solid ${CRIMSON}` : "2px solid transparent",
              color: pageTab === tab ? ESPRESSO : MUTED,
              fontSize: 12, fontWeight: pageTab === tab ? 700 : 600, padding: "11px 4px 9px", cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {pageTab === "info" ? (
        <>
          {sortedSectionNodes.map((section) => <div key={section.key}>{section.node}</div>)}

          <Section title="Contact and links">
            {hasContactLinks ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {clinic.website_url && (
                  <a href={clinic.website_url} target="_blank" rel="noopener noreferrer" onClick={() => {
                    void leadEvent("booking_link_click", { clinic_id: id, link: "website_url" });
                    if (websiteKind) logIntent("website", websiteChannel(websiteKind), "contact_links");
                  }} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 0", borderBottom: `0.5px solid ${BORDER}`, color: ESPRESSO, textDecoration: "none", fontSize: 12 }}>
                    <Globe2 size={14} /><span style={{ flex: 1 }}>{websiteKind ? websiteLinkLabel(clinic.website_url, websiteKind).replace(/ →$/, "") : (() => { try { return new URL(clinic.website_url).hostname.replace(/^www\./, ""); } catch { return clinic.website_url; } })()}</span><span style={{ color: MUTED }}>↗</span>
                  </a>
                )}
                {contactSocials.map((social) => (
                  <a key={`${social.platform}:${social.url}`} href={social.url} target="_blank" rel="noopener noreferrer" onClick={() => logIntent("social", social.platform as "instagram" | "tiktok" | "youtube", "contact_links")} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 0", borderBottom: `0.5px solid ${BORDER}`, color: ESPRESSO, textDecoration: "none", fontSize: 12 }}>
                    <span style={{ width: 14, textAlign: "center", fontWeight: 800 }}>{social.platform === "instagram" ? "◎" : social.platform === "tiktok" ? "♪" : "▶"}</span><span style={{ flex: 1 }}>{social.handle ? `@${social.handle.replace(/^@/, "")}` : social.url}</span><span style={{ color: MUTED }}>↗</span>
                  </a>
                ))}
                {clinic.phone && <a href={`tel:${clinic.phone}`} onClick={() => logIntent("call", "tel", "contact_links")} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 0", borderBottom: `0.5px solid ${BORDER}`, color: ESPRESSO, textDecoration: "none", fontSize: 12 }}><Phone size={14} /><span style={{ flex: 1 }}>{clinic.phone}</span><span style={{ color: MUTED }}>↗</span></a>}
                {hasAddress && mapsHref && <a href={mapsHref} target="_blank" rel="noopener noreferrer" onClick={() => logIntent("directions", "maps", "contact_links")} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 0", color: ESPRESSO, textDecoration: "none", fontSize: 12 }}><MapPin size={14} /><span style={{ flex: 1 }}>{clinic.address}</span><span style={{ color: MUTED }}>↗</span></a>}
              </div>
            ) : <EmptyState>The clinic's website, social accounts and phone number. None recorded for this clinic yet.</EmptyState>}
          </Section>

          <div style={{ padding: "14px 16px", borderBottom: `0.5px solid ${BORDER}`, textAlign: "center" }}>
            <Link to="/for-clinics" style={{ fontSize: 11, fontWeight: 700, color: MUTED, textDecoration: "none" }}>Own this clinic? Send your photos and details →</Link>
          </div>
        </>
      ) : (
        <>
      {/*
        27. Works for your skin? — only skin types that actually have a qualifying row render.
        A type with no rows is simply absent; it never shows a dash and an empty bar, which reads as a measured zero.
      */}
      <Section title="Works for your skin?">
        {shownSkinScores.length === 0 ? (
          <EmptyState cta={<ExperienceCta onClick={() => openExperience("works_for_your_skin")} />}>
            How people with each skin type rate this clinic, counted from signed-in reviews. A skin type needs at least
            {" "}{MIN_TAGGED} of its own reviews here before a figure is shown; no type qualifies yet.
          </EmptyState>
        ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {["oily", "combination", "dry", "sensitive", "normal"]
            .map((type) => ({ type, score: shownSkinScores.find((s) => s.skin_type === type) }))
            .filter((r) => r.score != null)
            .map(({ type, score }) => {
            const isYou = userSkin === type;
            return (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 76, fontSize: 12, color: ESPRESSO, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{SKIN_EMOJI[type]}</span>
                  <span style={{ textTransform: "capitalize" }}>{type}</span>
                </div>
                <div style={{ flex: 1, height: 5, background: TRACK, borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ width: `${score!.pct}%`, height: "100%", background: CRIMSON }} />
                </div>
                {/* Every percentage renders with the number of reviews behind it. */}
                <div style={{ fontSize: 11, fontWeight: 700, color: ESPRESSO, textAlign: "right", whiteSpace: "nowrap" }}>
                  {score!.pct}% <span style={{ fontWeight: 600, color: MUTED }}>of {score!.n}</span>
                </div>
                {isYou && (
                  <span style={{ background: CRIMSON_TINT, color: CRIMSON, fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" }}>You</span>
                )}
              </div>
            );
          })}
        </div>
        )}
        {formSection === "works_for_your_skin" && reviewFormBlock}
      </Section>

      {/* 9. Skin type it suits (clinics.tea_skin_type) */}
      <Section title="Skin type it suits">
        {typeof clinic.tea_skin_type === "string" && clinic.tea_skin_type.trim() !== "" && sourced(clinic, "tea_skin_type") ? (
          <div style={{ fontSize: 12.5, color: ESPRESSO, textTransform: "capitalize" }}>
            {SKIN_EMOJI[clinic.tea_skin_type.toLowerCase()] ?? ""} {clinic.tea_skin_type}
          </div>
        ) : (
          <EmptyState>The skin type this clinic works best for, once enough signed-in visitors with that skin type have said so. Not measured yet.</EmptyState>
        )}
      </Section>

      {/* The tea: anonymous first-hand accounts, filtered by the visitor's skin type or shown all. */}
      <Section title="The tea">
        <div style={{ display: "flex", gap: 10, fontSize: 11, fontWeight: 700, marginBottom: 10 }}>
          {userSkin && (
            <button type="button" onClick={() => setReviewFilter(userSkin)} style={{
              background: "none", border: "none", cursor: "pointer", padding: "2px 0",
              color: reviewFilter === userSkin ? CRIMSON : MUTED,
              borderBottom: reviewFilter === userSkin ? `2px solid ${CRIMSON}` : "2px solid transparent",
              textTransform: "capitalize",
            }}>{userSkin}</button>
          )}
          <button type="button" onClick={() => setReviewFilter("all")} style={{
            background: "none", border: "none", cursor: "pointer", padding: "2px 0",
            color: reviewFilter === "all" ? CRIMSON : MUTED,
            borderBottom: reviewFilter === "all" ? `2px solid ${CRIMSON}` : "2px solid transparent",
          }}>All</button>
        </div>
        {filteredReviews.length > 0 ? (
          <TeaCarousel reviews={filteredReviews} />
        ) : reviews.length > 0 ? (
          <div style={{ fontSize: 11, color: MUTED, textAlign: "center", padding: 12 }}>No tea for this skin type yet.</div>
        ) : (
          <EmptyState cta={<ExperienceCta onClick={() => openExperience("the_tea")} />}>
            What actually happened, what surprised people, and what they wish they had known before — from people who went,
            always without their names. Nobody has shared theirs yet.
          </EmptyState>
        )}
        {reviews.length > 0 && <ExperienceCta onClick={() => openExperience("the_tea")} />}
        {formSection === "the_tea" && reviewFormBlock}
      </Section>

      {/*
        25. Who goes here (clinic_who_visited). A visit row is created by the clinic_reviews_mark_visit trigger when a review
        is posted; is_public is true only when the author ticked "Show my name on this clinic's page." Named visitors come
        from opted-in rows joined to profiles. Visitors who did not opt in are never named; they are counted through
        clinic_visitor_profile, which returns a clinic only once it has 5 or more visitors.
      */}
      <Section title="Who goes here">
        {publicVisitors.length === 0 && !visitorProfile ? (
          <EmptyState cta={<ExperienceCta onClick={() => openExperience("who_goes_here")} />}>
            The people who went and chose to show their name, and once 5 or more have been, the skin types of everyone who went.
            Nobody has yet.
          </EmptyState>
        ) : (
          <>
            {publicVisitors.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {publicVisitors.map((p) => {
                  const label = p.name || (p.username ? `@${p.username}` : null);
                  if (!label) return null;
                  return (
                    <div key={p.user_id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" style={{ width: 26, height: 26, borderRadius: 26, objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 26, height: 26, borderRadius: 26, background: BORDER, color: ESPRESSO, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {label.replace("@", "").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <span style={{ fontSize: 11.5, color: ESPRESSO, fontWeight: 600 }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {visitorProfile && typeof visitorProfile.visitors === "number" && (
              <div style={{ marginTop: publicVisitors.length > 0 ? 12 : 0, fontSize: 11.5, color: ESPRESSO, lineHeight: 1.6 }}>
                <div style={{ fontWeight: 700 }}>
                  {visitorProfile.visitors} visitors{publicVisitors.length > 0 ? `, ${publicVisitors.length} shown by name` : ""}
                </div>
                <div style={{ color: MUTED }}>
                  {["oily", "combination", "dry", "sensitive", "normal"]
                    .filter((t) => (visitorProfile[t] ?? 0) > 0)
                    .map((t) => `${SKIN_EMOJI[t]} ${t} ${visitorProfile[t]}`)
                    .join(" · ")}
                  {(visitorProfile.skin_type_unknown ?? 0) > 0 ? ` · skin type not given ${visitorProfile.skin_type_unknown}` : ""}
                </div>
              </div>
            )}
            {!visitorProfile && publicVisitors.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 10.5, color: MUTED }}>Visitors who did not choose to show their name are counted once 5 or more people have been.</div>
            )}
            <ExperienceCta onClick={() => openExperience("who_goes_here")} />
          </>
        )}
        {visitors.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 11, color: MUTED }}>
            {`You logged ${visitors.length === 1 ? "a visit" : `${visitors.length} visits`} here — last on ${new Date(visitors[0].visited_at).toLocaleDateString()}. ${visitors.some((v: any) => v.is_public) ? "Your name is shown above." : "Your name is not shown."}`}
          </div>
        )}
        {formSection === "who_goes_here" && reviewFormBlock}
      </Section>

        </>
      )}

      {activeVideo && (
        <div onClick={() => setActiveVideo(null)} data-clinic-video-lightbox style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(28,10,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(event) => event.stopPropagation()} style={{ width: "100%", maxWidth: 360, maxHeight: "88vh", overflowY: "auto", background: WARM_WHITE, borderRadius: 8, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}><button type="button" aria-label="Close video" onClick={() => setActiveVideo(null)} style={{ border: "none", background: "none", color: ESPRESSO, fontSize: 22, lineHeight: 1, cursor: "pointer", padding: 4 }}>×</button></div>
            {!videoEmbedFailed && videoPlatform === "tiktok" && extractTikTokVideoId(activeVideo.source_url) ? (
              <blockquote className="tiktok-embed" cite={activeVideo.source_url} data-video-id={extractTikTokVideoId(activeVideo.source_url) ?? undefined} style={{ maxWidth: 325, minWidth: 260, margin: "0 auto" }}><section /></blockquote>
            ) : !videoEmbedFailed && videoPlatform === "instagram" && instagramEmbedUrl(activeVideo.source_url) ? (
              <iframe src={instagramEmbedUrl(activeVideo.source_url) ?? undefined} title={`Instagram video from ${activeVideo.author_handle || clinic.name}`} onError={() => setVideoEmbedFailed(true)} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" style={{ display: "block", width: "100%", height: 560, border: 0 }} />
            ) : (
              <div style={{ padding: "22px 12px", textAlign: "center" }}><Camera size={24} color={MUTED} /><div style={{ fontSize: 12, color: ESPRESSO, lineHeight: 1.5, marginTop: 10 }}>{activeVideo.caption || "This video could not be loaded inside Skintea."}</div></div>
            )}
            <a href={activeVideo.source_url} target="_blank" rel="noopener noreferrer" onClick={() => logIntent("social", videoPlatform, "clinic_posts")} style={{ display: "block", padding: "10px 4px 4px", textAlign: "center", color: CRIMSON, fontSize: 11.5, fontWeight: 700, textDecoration: "none" }}>Open on {videoPlatformLabel} ↗</a>
          </div>
        </div>
      )}

      {/* 15. Spacer — only when the fixed bar below renders */}
      {(clinic.phone || (typeof clinic.address === "string" && clinic.address.trim() !== "") || bookMode) && <div style={{ height: 76 }} />}

      {/*
        16. Fixed bottom bar — Call renders only with a phone number and Directions only with
        an address, so neither can open tel:null or an empty Maps search. Flex gaps only appear
        between buttons that render, so the bar stays right with three, two or one.
      */}
      {(clinic.phone || (typeof clinic.address === "string" && clinic.address.trim() !== "") || bookMode) && (
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: WARM_WHITE, borderTop: `0.5px solid ${BORDER}`,
        padding: "12px 16px 20px", display: "flex", gap: 6, zIndex: 20,
      }}>
        {/* When the booking CTA is itself the phone link, a second Call button would duplicate it. */}
        {clinic.phone && bookMode !== "call" && (
        <a href={`tel:${clinic.phone}`} onClick={() => logIntent("call", "tel", "action_bar")} style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "#fff", border: `0.5px solid ${BORDER}`, borderRadius: 10,
          padding: "8px 0", textDecoration: "none", gap: 2,
        }}>
          <Phone size={16} color={ESPRESSO} />
          <span style={{ fontSize: 8, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>Call</span>
        </a>
        )}
        {typeof clinic.address === "string" && clinic.address.trim() !== "" && (
        <a
          href={`https://maps.google.com/dir/?destination=${encodeURIComponent(clinic.address)}`}
          target="_blank" rel="noreferrer"
          onClick={() => logIntent("directions", "maps", "action_bar")}
          style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "#fff", border: `0.5px solid ${BORDER}`, borderRadius: 10,
            padding: "8px 0", textDecoration: "none", gap: 2,
          }}
        >
          <MapPin size={16} color={ESPRESSO} />
          {/* Travel time needs an origin; there is none, so the label stays "Directions". */}
          <span style={{ fontSize: 8, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>{userOrigin && clinic.travel_minutes != null ? `${clinic.travel_minutes} min away` : "Directions"}</span>
        </a>
        )}
        {bookMode === "website" && (
        <button onClick={handleBook} style={{
          flex: 2, background: CRIMSON, color: WARM_WHITE, border: "none",
          borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer",
        }}>Book Consultation</button>
        )}
        {bookMode === "call" && (
        <a
          href={`tel:${clinic.phone}`}
          onClick={() => { logIntent("book", "tel", "action_bar"); void recordConsultationClick(id); }}
          style={{
            flex: 2, background: CRIMSON, color: WARM_WHITE, border: "none",
            borderRadius: 10, fontSize: 13, fontWeight: 800, textDecoration: "none",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <Phone size={14} color={WARM_WHITE} /> Call to book
        </a>
        )}
      </div>
      )}

      {/* Inquire bottom sheet */}
      {inquireFor && (
        <div onClick={() => setInquireFor(null)} style={{
          position: "fixed", inset: 0, background: "rgba(28,10,0,0.4)", zIndex: 30,
          display: "flex", alignItems: "flex-end",
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: WARM_WHITE, width: "100%", borderTopLeftRadius: 16, borderTopRightRadius: 16,
            padding: "20px 16px 28px",
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 4, background: BORDER, margin: "0 auto 16px" }} />
            <div style={{ ...SECTION_LABEL, marginBottom: 8 }}>Inquire about {inquireFor.treatments?.name}</div>
            <div style={{ fontSize: 13, color: ESPRESSO, fontWeight: 700, marginBottom: 14 }}>{clinic.name}</div>
            {/* Each row needs its own recorded value; 61 listed clinics have no website and
                many have no phone, and a link to nothing is worse than no link. */}
            {clinic.phone && (
            <a href={`tel:${clinic.phone}`} onClick={() => logIntent("call", "tel", "inquire_sheet", inquireFor.treatment_id)} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "12px 0",
              borderTop: `0.5px solid ${BORDER}`, color: ESPRESSO,
              fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}>
              <Phone size={14} /> {clinic.phone}
            </a>
            )}
            {clinic.website_url && (
            <a href={clinic.website_url} target="_blank" rel="noreferrer" onClick={() => {
              void leadEvent("booking_link_click", { clinic_id: id, link: "website_url" });
              if (websiteKind) logIntent("website", websiteChannel(websiteKind), "inquire_sheet", inquireFor.treatment_id);
            }} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "12px 0",
              borderTop: `0.5px solid ${BORDER}`, color: CRIMSON,
              fontSize: 13, fontWeight: 700, textDecoration: "none",
            }}>
              {/* Labelled for what the link is: a directory listing or an Instagram profile is not "the website". */}
              {websiteKind ? websiteLinkLabel(clinic.website_url, websiteKind) : "Visit website →"}
            </a>
            )}
            {!clinic.phone && !clinic.website_url && (
              <div style={{
                padding: "12px 0", borderTop: `0.5px solid ${BORDER}`,
                color: MUTED, fontSize: 12,
              }}>
                We have no contact details for this clinic yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}