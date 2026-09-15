// clinic detail page v2
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { leadEvent, recordConsultationClick } from "@/lib/leads";
import { ClinicImage } from "@/components/ClinicImage";
import { displayImages, useCategoryImages } from "@/lib/clinicPhotos";
import {
  ArrowLeft, Heart, Share2, MapPin, Sparkles, FileText, Lock,
  Phone, Car, Map as MapIcon, Building2, Plus, Flame, Camera,
} from "lucide-react";

export const Route = createFileRoute("/clinics/$id")({
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
type SkinScore = { skin_type: string; recommend_pct: number };
type CTreatment = {
  id: string;
  price_from: number | null;
  price_unit: string | null;
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


const SECTION_LABEL: React.CSSProperties = {
  fontSize: 9, fontWeight: 800, letterSpacing: "0.14em",
  textTransform: "uppercase", color: CRIMSON,
};

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

  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [skinScores, setSkinScores] = useState<SkinScore[]>([]);
  const [treatments, setTreatments] = useState<CTreatment[]>([]);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [activePhotoTab, setActivePhotoTab] = useState<"interior" | "results" | "staff" | "outside">("interior");
  const [activeThumbIndex, setActiveThumbIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [inquireFor, setInquireFor] = useState<CTreatment | null>(null);
  const [userSkin, setUserSkin] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<string>("all");
  const [videos, setVideos] = useState<any[]>([]);
  const [activeVideoTab, setActiveVideoTab] = useState<"tiktok" | "instagram">("tiktok");


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
      const [c, ss, ct, pr, wv, rv, v] = await Promise.all([
        // Only listings that passed the filter render; 'unsure' and 'dropped' read as not found.
        supabase.from("clinics").select("*").eq("id", id).eq("listing_filter", "passed").maybeSingle(),
        supabase.from("clinic_skin_scores").select("*").eq("clinic_id", id),
        // Inactive treatments (e.g. "Laser", a category) are not listed at all.
        supabase.from("clinic_treatments").select("*, treatments!inner(id, name, slug, active)").eq("clinic_id", id).eq("treatments.active", true),
        supabase.from("clinic_practitioners").select("*").eq("clinic_id", id),
        supabase.from("clinic_who_visited").select("id, user_id, visited_at").eq("clinic_id", id).order("visited_at", { ascending: false }).limit(20),
        supabase.from("clinic_reviews").select("*, treatments(name)").eq("clinic_id", id).order("created_at", { ascending: false }),
        supabase.from("clinic_videos").select("*").eq("clinic_id", id).eq("is_active", true).order("created_at", { ascending: false }),
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

  const categoryImages = useCategoryImages();
  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(new Set());
  const markFailed = (url: string) => setFailedPhotos((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));
  // Failed photos are removed from the list itself, so the hero and the strip always show the same set.
  const galleryImages = clinic ? displayImages(clinic as any, categoryImages, 800, failedPhotos) : [];
  const galleryIndex = Math.min(activeThumbIndex, Math.max(galleryImages.length - 1, 0));

  const userSkinScore = useMemo(
    () => userSkin ? skinScores.find((s) => s.skin_type === userSkin)?.recommend_pct : null,
    [userSkin, skinScores]
  );

  const filteredReviews = useMemo(() => {
    if (reviewFilter === "all") return reviews;
    return reviews.filter((r) => r.skin_type === reviewFilter);
  }, [reviews, reviewFilter]);

  const handleBook = () => {
    if (clinic?.website_url) window.open(clinic.website_url, "_blank");
    // consultation_click event, then the consultation_clicks row (linked to the lead server-side).
    void recordConsultationClick(id);
  };

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
          <span>{clinic.neighborhood ?? ""}{clinic.distance_miles != null ? ` · ${clinic.distance_miles} mi` : ""}</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {clinic.is_verified && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: CRIMSON_TINT, color: CRIMSON, fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 20 }}>
              <span style={{ width: 5, height: 5, borderRadius: 5, background: CRIMSON }} /> Verified
            </span>
          )}
          {clinic.is_featured && (
            <span style={{ background: ESPRESSO, color: WARM_WHITE, fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 20 }}>
              Featured
            </span>
          )}
        </div>
        {userSkin && userSkinScore != null && (
          <div style={{
            marginTop: 12, background: CRIMSON_TINT, borderRadius: 10,
            padding: "10px 12px", display: "flex", alignItems: "center", gap: 8,
            fontSize: 11, color: ESPRESSO, fontWeight: 600,
          }}>
            <Sparkles size={14} color={CRIMSON} />
            <span>Strong match for {userSkin} skin — {userSkinScore}% of {userSkin} users recommend</span>
          </div>
        )}
      </div>

      {/* 6. Stats row — only recorded values; hidden entirely when none are recorded */}
      {(() => {
        const stats = [
          clinic.skintea_score != null ? { v: `${clinic.skintea_score}%`, l: "Recommend" } : null,
          clinic.review_count != null ? { v: `${clinic.review_count}`, l: "Reviews" } : null,
          clinic.avg_score != null ? { v: `${clinic.avg_score}`, l: "Score" } : null,
          clinic.price_tier != null ? { v: `${clinic.price_tier}`, l: "Price" } : null,
        ].filter(Boolean) as { v: string; l: string }[];
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
          </div>
        ))}
      </div>
        );
      })()}

      {/* 7. Treatments (each mapping carries a recorded source; prices only where a source states one) */}
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
                    {t.price_from != null && (
                      <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                        From ${t.price_from}{t.price_unit && t.price_unit !== "session" ? `/${t.price_unit}` : ""}
                      </div>
                    )}
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

      {/* 8. Videos (filmstrip) */}
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
                    {/* Stats overlay top-right */}
                    {(v.views > 0 || v.likes > 0) && (
                      <div style={{
                        position: "absolute", top: 6, right: 6,
                        display: "flex", gap: 6,
                      }}>
                        {v.views > 0 && (
                          <span style={{ background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 4 }}>
                            {v.views >= 1000 ? `${(v.views / 1000).toFixed(0)}k` : v.views}
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

      {/* 9. Your visits (clinic_who_visited is private: a signed-in user only sees their own rows) */}
      <Section title="Your visits">
        <div style={{ fontSize: 11, color: MUTED }}>
          {visitors.length > 0
            ? `You logged ${visitors.length === 1 ? "a visit" : `${visitors.length} visits`} here — last on ${new Date(visitors[0].visited_at).toLocaleDateString()}. Only you can see this.`
            : "Visits you log here are private to you."}
        </div>
      </Section>

      {/* 10. Practitioners */}
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

      {/* 11. Works for your skin? — hidden until clinic_skin_scores holds sourced rows for this clinic */}
      {skinScores.length > 0 && (
      <Section title="Works for your skin?">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {["oily", "combination", "dry", "sensitive", "normal"].map((type) => {
            const score = skinScores.find((s) => s.skin_type === type);
            const pct = score?.recommend_pct ?? null;
            const isYou = userSkin === type;
            return (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 76, fontSize: 12, color: ESPRESSO, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{SKIN_EMOJI[type]}</span>
                  <span style={{ textTransform: "capitalize" }}>{type}</span>
                </div>
                <div style={{ flex: 1, height: 5, background: TRACK, borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ width: `${pct ?? 0}%`, height: "100%", background: CRIMSON }} />
                </div>
                <div style={{ width: 32, fontSize: 11, fontWeight: 700, color: ESPRESSO, textAlign: "right" }}>{pct != null ? `${pct}%` : "—"}</div>
                {isYou && (
                  <span style={{ background: CRIMSON_TINT, color: CRIMSON, fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" }}>You</span>
                )}
              </div>
            );
          })}
        </div>
      </Section>
      )}

      {/* 12. Reviews */}
      <Section title="Reviews" right={
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
          {filteredReviews.slice(0, 2).map((r) => (
            <div key={r.id} style={{ background: "#fff", border: `0.5px solid ${BORDER}`, borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: ESPRESSO }}>Anonymous</div>
                <div style={{ fontSize: 11, color: MUTED, display: "flex", alignItems: "center", gap: 4 }}>
                  <span>{SKIN_EMOJI[r.skin_type] ?? ""}</span><span style={{ textTransform: "capitalize" }}>{r.skin_type}</span>
                </div>
              </div>
              {r.treatments?.name && (
                <span style={{ display: "inline-block", background: CRIMSON_TINT, color: CRIMSON, fontSize: 9, fontWeight: 800, padding: "3px 7px", borderRadius: 4, textTransform: "uppercase", marginBottom: 8 }}>{r.treatments.name}</span>
              )}
              <div style={{ fontSize: 12, color: ESPRESSO, lineHeight: 1.55 }}>{r.body}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: 11, color: MUTED }}>
                <Flame size={12} /> {r.agree_count}
              </div>
            </div>
          ))}
          {filteredReviews.length === 0 && (
            <div style={{ fontSize: 11, color: MUTED, textAlign: "center", padding: 12 }}>No reviews for this filter yet.</div>
          )}
        </div>
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <button style={{ background: "none", border: "none", color: CRIMSON, fontSize: 11, fontWeight: 700, textTransform: "uppercase", cursor: "pointer" }}>
            See all {clinic.review_count} reviews →
          </button>
        </div>
      </Section>

      {/* 13. Hours & Location */}
      <Section title="Hours & Location">
        <div style={{ display: "flex", flexDirection: "column" }}>
          {groupHours(clinic.hours).map((h, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `0.5px solid ${BORDER}`, fontSize: 12 }}>
              <span style={{ color: MUTED }}>{h.label}</span>
              <span style={{ color: ESPRESSO, fontWeight: 600 }}>{h.hours}</span>
            </div>
          ))}
          {groupHours(clinic.hours).length === 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 12, color: MUTED }}>
              <span>Hours</span>
              <span>—</span>
            </div>
          )}
        </div>
        {clinic.is_open_now && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 12 }}>
            <span style={{ width: 7, height: 7, borderRadius: 7, background: "#2D7A3A" }} />
            <span style={{ color: "#2D7A3A", fontWeight: 700 }}>Open now</span>
            <span style={{ color: MUTED }}>· Closes at {clinic.closes_at}</span>
          </div>
        )}
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(clinic.address ?? "")}`}
          target="_blank" rel="noreferrer"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: CREAM_TINT, borderRadius: 10, height: 76,
            marginTop: 12, color: MUTED, fontSize: 11, textDecoration: "none",
          }}
        >
          <MapIcon size={14} /> Open in Maps
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 10, borderTop: `0.5px solid ${BORDER}`, marginTop: 12, paddingTop: 12 }}>
          <Car size={16} color={ESPRESSO} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: ESPRESSO }}>Parking</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{clinic.parking_notes ?? "—"}</div>
          </div>
          {clinic.parking_is_free != null && <span style={{
            background: clinic.parking_is_free ? "#E8F5E9" : CREAM_TINT,
            color: clinic.parking_is_free ? "#2D7A3A" : MUTED,
            fontSize: 10, fontWeight: 800, padding: "4px 8px", borderRadius: 4, textTransform: "uppercase",
          }}>{clinic.parking_is_free ? "Free" : "Paid"}</span>}
        </div>
      </Section>


      {/* 14. Spacer */}
      <div style={{ height: 76 }} />

      {/* 15. Fixed bottom bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: WARM_WHITE, borderTop: `0.5px solid ${BORDER}`,
        padding: "12px 16px 20px", display: "flex", gap: 6, zIndex: 20,
      }}>
        <a href={`tel:${clinic.phone}`} style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "#fff", border: `0.5px solid ${BORDER}`, borderRadius: 10,
          padding: "8px 0", textDecoration: "none", gap: 2,
        }}>
          <Phone size={16} color={ESPRESSO} />
          <span style={{ fontSize: 8, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>Call</span>
        </a>
        <a
          href={`https://maps.google.com/dir/?destination=${encodeURIComponent(clinic.address ?? "")}`}
          target="_blank" rel="noreferrer"
          style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "#fff", border: `0.5px solid ${BORDER}`, borderRadius: 10,
            padding: "8px 0", textDecoration: "none", gap: 2,
          }}
        >
          <MapPin size={16} color={ESPRESSO} />
          <span style={{ fontSize: 8, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>{clinic.travel_minutes != null ? `${clinic.travel_minutes} min away` : "Directions"}</span>
        </a>
        <button onClick={handleBook} style={{
          flex: 2, background: CRIMSON, color: WARM_WHITE, border: "none",
          borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer",
        }}>Book Consultation</button>
      </div>

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
            <a href={`tel:${clinic.phone}`} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "12px 0",
              borderTop: `0.5px solid ${BORDER}`, color: ESPRESSO,
              fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}>
              <Phone size={14} /> {clinic.phone}
            </a>
            <a href={clinic.website_url} target="_blank" rel="noreferrer" onClick={() => { void leadEvent("booking_link_click", { clinic_id: id, link: "website_url" }); }} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "12px 0",
              borderTop: `0.5px solid ${BORDER}`, color: CRIMSON,
              fontSize: 13, fontWeight: 700, textDecoration: "none",
            }}>
              Visit website →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}