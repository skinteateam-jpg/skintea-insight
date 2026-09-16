// clinic detail page v2
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { leadEvent, recordConsultationClick } from "@/lib/leads";
import { logClinicIntent, previousTreatmentSlug, websiteChannel } from "@/lib/clinicIntent";
import { classifyWebsite, isBookingPath, websiteLinkLabel } from "@/lib/bookingPath";
import { ClinicImage } from "@/components/ClinicImage";
import { displayImages, useCategoryImages } from "@/lib/clinicPhotos";
import { shownPrice } from "@/lib/clinicPrices";
// The app-wide floor under any displayed percentage. It lives in exactly one place.
import { MIN_TAGGED } from "@/lib/opinionAggregate";
import {
  ArrowLeft, Heart, Share2, MapPin, Sparkles, FileText, Lock,
  Phone, Car, Map as MapIcon, Building2, Plus, Flame, Camera,
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
  id: string; skin_type: string; body: string; agree_count: number;
  treatment_id: string | null;
  treatments: { name: string } | null;
};

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

// One line under the sections that can only be filled by someone who went. No lead event fires: the allowed
// lead_events.event_type values are stage_change, field_set, quiz_completed, clinic_view, consultation_click,
// booking_link_click and email_submitted, and none of them describes this click. Adding one is a schema change.
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
  const [loading, setLoading] = useState(true);

  const [activeThumbIndex, setActiveThumbIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [inquireFor, setInquireFor] = useState<CTreatment | null>(null);
  const [userSkin, setUserSkin] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<string>("all");
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [videos, setVideos] = useState<any[]>([]);
  const [activeVideoTab, setActiveVideoTab] = useState<"tiktok" | "instagram">("tiktok");
  // Review submission. clinic_reviews already accepts a signed-in author's own row (RLS "Users can create reviews":
  // auth.uid() = user_id, plus the signed-in-author and integrity triggers), so no schema or policy change is needed.
  const [userId, setUserId] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
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
      const [c, ss, ct, pr, wv, rv, v, sl] = await Promise.all([
        // Only listings that passed the filter render; 'unsure' and 'dropped' read as not found.
        supabase.from("clinics").select("*").eq("id", id).eq("listing_filter", "passed").maybeSingle(),
        supabase.from("clinic_skin_scores").select("*").eq("clinic_id", id),
        // Inactive treatments (e.g. "Laser", a category) are not listed at all.
        supabase.from("clinic_treatments").select("*, treatments!inner(id, name, slug, active)").eq("clinic_id", id).eq("treatments.active", true),
        supabase.from("clinic_practitioners").select("*").eq("clinic_id", id),
        supabase.from("clinic_who_visited").select("id, user_id, visited_at").eq("clinic_id", id).order("visited_at", { ascending: false }).limit(20),
        supabase.from("clinic_reviews").select("*, treatments(name)").eq("clinic_id", id).order("created_at", { ascending: false }),
        supabase.from("clinic_videos").select("*").eq("clinic_id", id).eq("is_active", true).order("created_at", { ascending: false }),
        // Public social profiles (clinic_social_links); emails stay in the private clinic_contacts table.
        (supabase as any).from("clinic_social_links").select("platform, url, handle").eq("clinic_id", id).in("platform", ["instagram", "tiktok"]).order("platform"),
      ]);
      if (!alive) return;
      setClinic(c.data);
      setSkinScores((ss.data as any) || []);
      const ctData = (ct.data as any) || [];
      setTreatments(ctData);
      setPractitioners((pr.data as any) || []);
      setVisitors((wv.data as any) || []);
      setReviews((rv.data as any) || []);
      setVideos((v.data as any) || []);
      setSocials((sl.data as any) || []);


      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);

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
  // field_provenance stays {} — a signed-in author is the source, recorded by user_id.
  async function submitReview() {
    if (!userId || reviewBody.trim().length < 10) return;
    setReviewState("saving");
    setReviewError(null);
    const { error } = await supabase.from("clinic_reviews").insert({
      clinic_id: id,
      user_id: userId,
      body: reviewBody.trim(),
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
    const { data } = await supabase.from("clinic_reviews").select("*, treatments(name)").eq("clinic_id", id).order("created_at", { ascending: false });
    setReviews((data as any) || []);
    setShowReviewForm(false);
  }

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
          <div style={{ fontSize: 11.5, color: ESPRESSO, marginBottom: 8 }}>What actually happened? Your review is published under your account, not your name.</div>
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
          <textarea
            value={reviewBody}
            onChange={(e) => setReviewBody(e.target.value)}
            rows={4}
            placeholder="What you had done, how it went, anything you wish you had known."
            style={{ width: "100%", padding: "8px", fontSize: 12, border: `0.5px solid ${BORDER}`, borderRadius: 6, resize: "vertical", color: ESPRESSO, fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
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
  // Failed photos are removed from the list itself, so the hero and the strip always show the same set.
  const galleryImages = clinic ? displayImages(clinic as any, categoryImages, 800, failedPhotos) : [];
  const galleryIndex = Math.min(activeThumbIndex, Math.max(galleryImages.length - 1, 0));

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
    action: "call" | "book" | "directions" | "website" | "social",
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
        <div style={{ display: "flex", gap: 14 }}>
          <button onClick={() => setSaved(!saved)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
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

      {/* 2. Photo hero: the clinic's own photos, else a marked category image, else a plain placeholder */}
      <ClinicImage images={galleryImages} height={170} index={galleryIndex} showCount onFailed={markFailed} />

      {/* 3. Photo strip (only when the clinic has more than one photo of its own) */}
      {galleryImages.filter((g) => g.kind === "clinic").length > 1 && (
        <div style={{
          display: "flex", gap: 4, overflowX: "auto", padding: "6px 10px",
          scrollbarWidth: "none", background: WARM_WHITE,
          borderBottom: `0.5px solid ${BORDER}`,
        }}>
          {galleryImages.filter((g) => g.kind === "clinic").slice(0, 8).map((p, i) => (
            <button
              key={p.url}
              onClick={() => setActiveThumbIndex(i)}
              style={{ padding: 0, border: i === galleryIndex ? `1.5px solid ${CRIMSON}` : "1.5px solid transparent", borderRadius: 7, background: "none", cursor: "pointer", flexShrink: 0 }}
            >
              <ClinicImage images={[p]} width={56} height={44} radius={6} compact onFailed={markFailed} />
            </button>
          ))}
        </div>
      )}

      {/* 5. Clinic hero block */}
      <div style={{ padding: "14px 16px", borderBottom: `0.5px solid ${BORDER}` }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: ESPRESSO, marginBottom: 6 }}>{clinic.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: MUTED, marginBottom: 10 }}>
          <MapPin size={12} />
          {/* Distance needs an origin; there is none, so it stays off (see userOrigin). */}
          <span>{clinic.neighborhood ?? ""}{userOrigin && clinic.distance_miles != null ? ` · ${clinic.distance_miles} mi` : ""}</span>
        </div>
        {socials.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {socials.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer"
                onClick={() => logIntent("social", s.platform === "instagram" ? "instagram" : "tiktok", "social_chips")} style={{
                display: "inline-flex", alignItems: "center", gap: 4, background: CREAM_TINT, color: ESPRESSO,
                fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 20, textDecoration: "none",
              }}>
                {s.platform === "instagram" ? "Instagram" : "TikTok"}{s.handle ? ` @${s.handle}` : ""} ↗
              </a>
            ))}
          </div>
        )}
        {/*
          Badges are gated on a recorded decision, not on a bare boolean. Both conditions are
          unreachable today because nothing writes these provenance keys:
          - Verified switches on when clinics.field_provenance.is_verified records who verified
            this listing and when — a signed /for-clinics submission from the clinic, or a
            Skintea visit. Never a Google listing, never an unsourced flag.
          - Featured switches on when clinics.field_provenance.is_featured records the editor
            and the date of the editorial decision. It is never a paid placement.
        */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {clinic.is_verified === true
            && clinic.field_provenance?.is_verified?.source != null
            && clinic.field_provenance?.is_verified?.recorded_at != null && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: CRIMSON_TINT, color: CRIMSON, fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 20 }}>
              <span style={{ width: 5, height: 5, borderRadius: 5, background: CRIMSON }} /> Verified
            </span>
          )}
          {clinic.is_featured === true
            && clinic.field_provenance?.is_featured?.source != null
            && clinic.field_provenance?.is_featured?.recorded_at != null && (
            <span style={{ background: ESPRESSO, color: WARM_WHITE, fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 20 }}>
              Featured
            </span>
          )}
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

      {/*
        6. Stats row — a tile renders only when its value exists AND its basis can be stated
        beside it. Hidden entirely when no tile qualifies.
        - Reviews is Skintea's own count (the clinic_reviews rows fetched above), never
          clinics.review_count / google_review_count, which count someone else's reviews.
        - A percentage or an average needs a sample size and the same floor as the rest of the
          app (MIN_TAGGED, @/lib/opinionAggregate); the sample is Skintea's review count.
        - Price tier renders only with the number of prices it rests on — prices read from the
          clinic's own site, each dated and linked in the Treatments section.
      */}
      {(() => {
        const reviewN = reviews.length;
        const pricedN = treatments.filter((t) => shownPrice(t.price_from, t.price_unit, t.field_provenance)).length;
        const enoughReviews = reviewN >= MIN_TAGGED;
        const stats = [
          clinic.skintea_score != null && enoughReviews
            ? { v: `${clinic.skintea_score}%`, l: "Recommend", sub: `of ${reviewN} reviews` } : null,
          reviewN > 0 ? { v: `${reviewN}`, l: "Reviews", sub: "on Skintea" } : null,
          clinic.avg_score != null && enoughReviews
            ? { v: `${clinic.avg_score}`, l: "Score", sub: `from ${reviewN} reviews` } : null,
          clinic.price_tier != null && pricedN > 0
            ? { v: `${clinic.price_tier}`, l: "Price", sub: `${pricedN} listed price${pricedN === 1 ? "" : "s"}` } : null,
        ].filter(Boolean) as { v: string; l: string; sub: string }[];
        if (stats.length === 0) return null;
        return (
      <div style={{ display: "flex", borderBottom: `0.5px solid ${BORDER}` }}>
        {stats.map((s, i, arr) => (
          <div key={i} style={{
            flex: 1, padding: "14px 0", textAlign: "center",
            borderRight: i < arr.length - 1 ? `0.5px solid ${BORDER}` : "none",
          }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: ESPRESSO }}>{s.v}</div>
            <div style={{ fontSize: 9, textTransform: "uppercase", color: MUTED, letterSpacing: "0.08em", marginTop: 2 }}>{s.l}</div>
            <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>
        );
      })()}

      {/* 6b. The tea — Skintea's own line on this clinic (clinics.tea_quote). */}
      <Section title="The tea">
        {typeof clinic.tea_quote === "string" && clinic.tea_quote.trim() !== "" ? (
          <div style={{ fontSize: 13, lineHeight: 1.6, color: ESPRESSO, fontStyle: "italic" }}>“{clinic.tea_quote}”</div>
        ) : (
          <EmptyState>Skintea's own one-line read on this clinic: who it suits and what it is actually good at. Not written yet.</EmptyState>
        )}
      </Section>

      {/* 6c. What it's best for (clinics.best_for). Every row in the table currently holds an empty array, so this
           renders its empty state until the column carries sourced values. */}
      <Section title="What it's best for">
        {Array.isArray(clinic.best_for) && clinic.best_for.length > 0 ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {clinic.best_for.map((b: string) => (
              <span key={b} style={{ background: CREAM_TINT, color: ESPRESSO, fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 20 }}>{b}</span>
            ))}
          </div>
        ) : (
          <EmptyState>The concerns and treatments this clinic is strongest on. Nothing recorded for this clinic yet.</EmptyState>
        )}
      </Section>

      {/* 6d. Known for (clinics.known_for). */}
      <Section title="Known for">
        {typeof clinic.known_for === "string" && clinic.known_for.trim() !== "" ? (
          <div style={{ fontSize: 12.5, lineHeight: 1.6, color: ESPRESSO }}>{clinic.known_for}</div>
        ) : (
          <EmptyState>What this clinic is known for in its own right — a signature treatment, a technique, a following. Nothing recorded yet.</EmptyState>
        )}
      </Section>

      {/* 7. Treatments (each mapping carries a recorded source; prices only where a source states one) */}
      {treatments.length > 0 && (
      <Section title="Treatments">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {treatments.map((t) => {
            const tName = t.treatments?.name ?? "Treatment";
            return (
              <div key={t.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Top sub-row */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, background: CREAM_TINT, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>💉</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: ESPRESSO }}>{tName}</div>
                    {/*
                      Price, the date it was recorded, and a link to the page it was read from. A price older than
                      120 days (or with no readable date) is hidden until it is checked again; nothing re-crawls itself.
                    */}
                    {(() => {
                      const price = shownPrice(t.price_from, t.price_unit, t.field_provenance);
                      if (!price) return null;
                      return (
                        <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                          <span style={{ fontWeight: 700, color: ESPRESSO }}>{price.text}</span>
                          {" · "}
                          {price.url ? (
                            <a href={price.url} target="_blank" rel="noopener noreferrer" style={{ color: MUTED }}>
                              {price.dateLabel}
                            </a>
                          ) : (
                            price.dateLabel
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <button onClick={() => setInquireFor(t)} style={{
                    background: CRIMSON_TINT, color: CRIMSON, border: "none",
                    fontSize: 10, fontWeight: 800, textTransform: "uppercase",
                    padding: "6px 12px", borderRadius: 20, cursor: "pointer",
                  }}>Inquire</button>
                </div>
                {/* Bottom sub-row */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", paddingLeft: 44 }}>
                  {t.treatments?.slug && t.treatments?.active !== false && (
                    <button onClick={() => { navigate({ to: "/treatments/$slug", params: { slug: t.treatments!.slug! } }).catch(() => {}); }} style={{
                      background: "none", border: "none", color: CRIMSON,
                      fontSize: 10, fontWeight: 700, cursor: "pointer",
                      display: "inline-flex", alignItems: "center", gap: 4, padding: 0,
                    }}>
                      <FileText size={11} /> What is {tName}?
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>
      )}

      {/* 8. Video — the section always renders; with no rows it says what it will hold. */}
      {videos.length === 0 && (
        <Section title="Video">
          <EmptyState>Clips showing this clinic's own work, from its TikTok and Instagram. None recorded for this clinic yet.</EmptyState>
        </Section>
      )}
      {videos.length > 0 && (
      <div style={{ padding: "16px", borderBottom: `0.5px solid ${BORDER}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: CRIMSON }}>Videos</div>
          {/* TikTok / Instagram tab switcher */}
          <div style={{ display: "flex", gap: 0, border: `0.5px solid ${BORDER}`, borderRadius: 6, overflow: "hidden" }}>
            {(["tiktok", "instagram"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setActiveVideoTab(p)}
                style={{
                  background: activeVideoTab === p ? ESPRESSO : "transparent",
                  color: activeVideoTab === p ? WARM_WHITE : MUTED,
                  border: "none",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "capitalize",
                  padding: "5px 12px",
                  cursor: "pointer",
                }}
              >
                {p === "tiktok" ? "TikTok" : "Instagram"}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {(() => {
          const filtered = videos.filter((v) => v.platform === activeVideoTab);
          if (filtered.length === 0) {
            return (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 0", gap: 8 }}>
                <Camera size={22} color={MUTED} />
                <div style={{ fontSize: 12, color: MUTED }}>No videos yet</div>
              </div>
            );
          }
          return (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {filtered.map((v) => (
                <a
                  key={v.id}
                  href={v.source_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "none", display: "block", borderRadius: 10, overflow: "hidden", background: ESPRESSO, position: "relative" }}
                >
                  {/* Thumbnail */}
                  <div style={{ width: "100%", aspectRatio: "9/16", position: "relative", overflow: "hidden" }}>
                    {v.thumbnail_url ? (
                      <img src={v.thumbnail_url} alt={v.caption ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: "#2a1408", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Camera size={20} color={MUTED} />
                      </div>
                    )}
                    {/* Play button overlay */}
                    <div style={{
                      position: "absolute", inset: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(0,0,0,0.18)",
                    }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 34,
                        background: "rgba(255,255,255,0.88)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <div style={{
                          width: 0, height: 0,
                          borderTop: "7px solid transparent",
                          borderBottom: "7px solid transparent",
                          borderLeft: `12px solid ${ESPRESSO}`,
                          marginLeft: 3,
                        }} />
                      </div>
                    </div>
                    {/* Stats overlay top-right — each figure has its own chip, so a video with
                        only likes shows likes instead of an empty box. Thousands are floored. */}
                    {(v.views > 0 || v.likes > 0) && (
                      <div style={{
                        position: "absolute", top: 6, right: 6,
                        display: "flex", gap: 4,
                      }}>
                        {v.views > 0 && (
                          <span style={{ background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 4 }}>
                            {compactCount(v.views)} views
                          </span>
                        )}
                        {v.likes > 0 && (
                          <span style={{ background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 4 }}>
                            {compactCount(v.likes)} likes
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Caption bar */}
                  <div style={{ padding: "7px 8px", background: ESPRESSO }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: WARM_WHITE, marginBottom: 2 }}>@{v.author_handle}</div>
                    {v.caption && (
                      <div style={{
                        fontSize: 9, color: "#c0a89a",
                        overflow: "hidden", display: "-webkit-box",
                        WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      }}>{v.caption}</div>
                    )}
                  </div>
                </a>
              ))}
            </div>
          );
        })()}
      </div>
      )}

      {/* 9. Who goes here (clinic_who_visited). The table's SELECT policy is "Users see only their own visits", so this
           section can only ever show the signed-in visitor their own rows: an aggregate would need a policy change. */}
      <Section title="Who goes here">
        {visitors.length > 0 ? (
          <div style={{ fontSize: 11, color: MUTED }}>
            {`You logged ${visitors.length === 1 ? "a visit" : `${visitors.length} visits`} here — last on ${new Date(visitors[0].visited_at).toLocaleDateString()}. Only you can see this.`}
          </div>
        ) : (
          <EmptyState cta={<ExperienceCta onClick={() => setShowReviewForm(true)} />}>
            Who actually goes to this clinic, and what they went in for, from the people who tell us. Nobody has yet.
            Your own visits stay private to you.
          </EmptyState>
        )}
      </Section>

      {/* 10. Practitioners */}
      {practitioners.length > 0 && (
      <Section title="Practitioners">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {practitioners.map((p) => {
            const initials = p.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 42, background: BORDER, color: ESPRESSO, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: ESPRESSO }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{p.role}</div>
                </div>
                {p.specialty && (
                  <span style={{ background: CRIMSON_TINT, color: CRIMSON, fontSize: 9, fontWeight: 800, padding: "4px 8px", borderRadius: 4, textTransform: "uppercase" }}>{p.specialty}</span>
                )}
              </div>
            );
          })}
        </div>
      </Section>
      )}

      {/*
        11. Works for your skin? — only skin types that actually have a qualifying row render.
        A type with no rows is simply absent; it never shows a dash and an empty bar, which
        reads as a measured zero. Hidden entirely when no type qualifies (the state today).
      */}
      {shownSkinScores.length === 0 && (
        <Section title="Works for your skin?">
          <EmptyState cta={<ExperienceCta onClick={() => setShowReviewForm(true)} />}>
            How people with each skin type rate this clinic, counted from signed-in reviews. A skin type needs at least
            {" "}{MIN_TAGGED} of its own reviews here before a figure is shown; no type qualifies yet.
          </EmptyState>
        </Section>
      )}
      {shownSkinScores.length > 0 && (
      <Section title="Works for your skin?">
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
      </Section>
      )}

      {/* 12. What people say (clinic_reviews). The section always renders: with no rows it says so and offers the
           visitor a way to add the first one. Every review is written by its signed-in author. */}
      {reviews.length === 0 && (
        <Section title="What people say">
          <EmptyState cta={<ExperienceCta onClick={() => setShowReviewForm(true)} />}>
            First-hand accounts from people who went: what they had done, how it went, and their skin type. No reviews
            for this clinic yet.
          </EmptyState>
          {reviewFormBlock}
        </Section>
      )}
      {reviews.length > 0 && (
      <Section title="What people say" right={
        <div style={{ display: "flex", gap: 10, fontSize: 11, fontWeight: 700 }}>
          {userSkin && (
            <button onClick={() => setReviewFilter(userSkin)} style={{
              background: "none", border: "none", cursor: "pointer", padding: "2px 0",
              color: reviewFilter === userSkin ? CRIMSON : MUTED,
              borderBottom: reviewFilter === userSkin ? `2px solid ${CRIMSON}` : "2px solid transparent",
              textTransform: "capitalize",
            }}>{userSkin}</button>
          )}
          <button onClick={() => setReviewFilter("all")} style={{
            background: "none", border: "none", cursor: "pointer", padding: "2px 0",
            color: reviewFilter === "all" ? CRIMSON : MUTED,
            borderBottom: reviewFilter === "all" ? `2px solid ${CRIMSON}` : "2px solid transparent",
          }}>All</button>
        </div>
      }>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(showAllReviews ? filteredReviews : filteredReviews.slice(0, 2)).map((r) => {
            // Every review has a real, signed-in author (enforce_signed_in_author). This page
            // does not join profiles, so it says so rather than calling the author "Anonymous";
            // if a handle is ever joined in, it renders instead.
            const handle = (r as any).profiles?.username ?? (r as any).author_username ?? null;
            const agree = r.agree_count ?? 0;
            return (
            <div key={r.id} style={{ background: "#fff", border: `0.5px solid ${BORDER}`, borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: ESPRESSO }}>
                  {handle ? `@${handle}` : "Signed-in reviewer · name not shown"}
                </div>
                <div style={{ fontSize: 11, color: MUTED, display: "flex", alignItems: "center", gap: 4 }}>
                  <span>{SKIN_EMOJI[r.skin_type] ?? ""}</span><span style={{ textTransform: "capitalize" }}>{r.skin_type}</span>
                </div>
              </div>
              {r.treatments?.name && (
                <span style={{ display: "inline-block", background: CRIMSON_TINT, color: CRIMSON, fontSize: 9, fontWeight: 800, padding: "3px 7px", borderRadius: 4, textTransform: "uppercase", marginBottom: 8 }}>{r.treatments.name}</span>
              )}
              <div style={{ fontSize: 12, color: ESPRESSO, lineHeight: 1.55 }}>{r.body}</div>
              {/* The bare number said nothing; it now says what it counts, and stays off at zero. */}
              {agree > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: 11, color: MUTED }}>
                  <Flame size={12} /> {agree} {agree === 1 ? "person agrees" : "people agree"}
                </div>
              )}
            </div>
            );
          })}
          {filteredReviews.length === 0 && (
            <div style={{ fontSize: 11, color: MUTED, textAlign: "center", padding: 12 }}>No reviews for this filter yet.</div>
          )}
        </div>
        {/*
          The count is the Skintea reviews this page actually holds, not clinics.review_count
          (Google's). There is no all-reviews route, so the button expands the list in place
          instead of pointing nowhere, and is absent when there is nothing more to show.
        */}
        {filteredReviews.length > 2 && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button
              onClick={() => setShowAllReviews((v) => !v)}
              style={{ background: "none", border: "none", color: CRIMSON, fontSize: 11, fontWeight: 700, textTransform: "uppercase", cursor: "pointer" }}
            >
              {showAllReviews ? "Show fewer reviews" : `See all ${filteredReviews.length} reviews →`}
            </button>
          </div>
        )}
        <ExperienceCta onClick={() => setShowReviewForm(true)} />
        {reviewFormBlock}
      </Section>
      )}

      {/* 12b. Trust score and Skintea score. Both are Skintea's own measurements; neither is ever computed from Google
           ratings or review counts, and neither is derived from the other. */}
      <Section title="Trust & Skintea score">
        {clinic.trust_score != null || clinic.skintea_score != null ? (
          <div style={{ display: "flex", gap: 24 }}>
            {clinic.trust_score != null && (
              <div>
                <div style={{ fontSize: 19, fontWeight: 800, color: ESPRESSO }}>{clinic.trust_score}</div>
                <div style={{ fontSize: 9, textTransform: "uppercase", color: MUTED, letterSpacing: "0.08em", marginTop: 2 }}>Trust score</div>
              </div>
            )}
            {clinic.skintea_score != null && (
              <div>
                <div style={{ fontSize: 19, fontWeight: 800, color: ESPRESSO }}>{clinic.skintea_score}%</div>
                <div style={{ fontSize: 9, textTransform: "uppercase", color: MUTED, letterSpacing: "0.08em", marginTop: 2 }}>Skintea score</div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState>
            Skintea's own scores: how much of what this clinic publishes is verified, and how many signed-in visitors
            recommend it. Neither is computed from Google's rating or review count. Not measured for this clinic yet.
          </EmptyState>
        )}
      </Section>

      {/* 13. Hours & Location — hours when recorded, address when recorded, hidden when neither */}
      {(() => {
        const hoursGroups = groupHours(clinic.hours);
        const hasAddress = typeof clinic.address === "string" && clinic.address.trim() !== "";
        const hasParking = !!clinic.parking_notes || clinic.parking_is_free != null;
        if (hoursGroups.length === 0 && !hasAddress) return null;
        const title = hoursGroups.length > 0 && hasAddress ? "Hours & Location" : hasAddress ? "Location" : "Hours";
        return (
      <Section title={title}>
        {hoursGroups.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {hoursGroups.map((h, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: `0.5px solid ${BORDER}`, fontSize: 12 }}>
                <span style={{ color: MUTED }}>{h.label}</span>
                <span style={{ color: ESPRESSO, fontWeight: 600, textAlign: "right" }}>{h.hours}</span>
              </div>
            ))}
          </div>
        )}
        {hasAddress && (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: hoursGroups.length > 0 ? 12 : 0, fontSize: 12, color: ESPRESSO, lineHeight: 1.45 }}>
              <MapPin size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{clinic.address}</span>
            </div>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(clinic.address)}`}
              target="_blank" rel="noreferrer"
              onClick={() => logIntent("directions", "maps", "location_section")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                background: CREAM_TINT, borderRadius: 10, height: 44,
                marginTop: 10, color: ESPRESSO, fontSize: 11, fontWeight: 700, textDecoration: "none",
              }}
            >
              <MapIcon size={14} /> Open in Maps
            </a>
          </>
        )}
        {hasParking && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, borderTop: `0.5px solid ${BORDER}`, marginTop: 12, paddingTop: 12 }}>
            <Car size={16} color={ESPRESSO} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: ESPRESSO }}>Parking</div>
              {clinic.parking_notes && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{clinic.parking_notes}</div>}
            </div>
            {clinic.parking_is_free != null && <span style={{
              background: clinic.parking_is_free ? "#E8F5E9" : CREAM_TINT,
              color: clinic.parking_is_free ? "#2D7A3A" : MUTED,
              fontSize: 10, fontWeight: 800, padding: "4px 8px", borderRadius: 4, textTransform: "uppercase",
            }}>{clinic.parking_is_free ? "Free" : "Paid"}</span>}
          </div>
        )}
      </Section>
        );
      })()}


      {/*
        14. Owner route — /for-clinics is the only way a clinic can supply its own photos,
        hours and details (with written permission). Nothing else on the site links to it.
      */}
      <div style={{ padding: "14px 16px", borderBottom: `0.5px solid ${BORDER}`, textAlign: "center" }}>
        <Link to="/for-clinics" style={{ fontSize: 11, fontWeight: 700, color: MUTED, textDecoration: "none" }}>
          Own this clinic? Send your photos and details →
        </Link>
      </div>

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