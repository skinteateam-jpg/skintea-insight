import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CRIMSON = "#A8001C";
const BORDER = "#E8DDD4";

/**
 * "Patient videos" — what a treatment looks like, from people who had it (patients and creators).
 *
 * Display material only. These rows never enter Worth it, a count, a floor or a median: nothing in
 * treatmentReviews.ts or opinionAggregate.ts reads public.treatment_videos, and this component reads
 * nothing else. It is separate from "Who has talked about it" (TreatmentMembers, the Skintea members who posted
 * Tea about the treatment) and from the "Talked about by" line (TreatmentCelebrityLine): no shared query, no shared rows.
 *
 * Rows are chosen by the owner (display_approved, display_slot 1–6). Anonymous visitors can read only
 * approved rows, and only the columns selected below. Clinic, injector and provider accounts are never
 * stored here; their videos stay on clinic pages.
 *
 * No byline, caption, view count or date is shown. The TikTok oEmbed response carries the author's name;
 * only its thumbnail_url is read, and the author is never rendered.
 */

// One-line switch for the empty state: false shows the "Not enough data yet" card (owner decision, 2026-09-17).
const HIDE_WHEN_EMPTY = false;

const MAX_TILES = 6;

// Labels for this component only. They are not the product page's DISCLOSURE_LABELS: here "ad" covers both a
// caption #ad and TikTok's own ad flag, so it reads "Ad".
const DISCLOSURE_LABELS: Record<string, string> = {
  ad: "Ad",
  sponsored: "Sponsored",
  gifted: "Gifted",
  invited: "Invited",
  discount_code: "Discount code",
  states_no_ad: "States no ad",
};

type VideoRow = {
  id: string;
  platform_video_id: string;
  disclosure: string[] | null;
  display_slot: number | null;
};

// Built here from the video id. source_url (tiktok.com/video/<id>) opens a TikTok 404 page in a browser, so it is
// never used as a link; this form redirects to the video.
function watchUrl(videoId: string) {
  return `https://www.tiktok.com/@/video/${videoId}`;
}

function SectionShell({ children }: { children: React.ReactNode }) {
  return (
    <section style={{ padding: "16px", borderBottom: `0.5px solid ${BORDER}` }}>
      <div
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: CRIMSON,
          marginBottom: 10,
        }}
      >
        Patient videos
      </div>
      {children}
    </section>
  );
}

export default function TreatmentVideos({ treatmentId }: { treatmentId: string }) {
  const [rows, setRows] = useState<VideoRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [active, setActive] = useState<string | null>(null);
  const [embedFailed, setEmbedFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoaded(false);
      // Named columns only. RLS returns approved rows only; display_approved itself is not readable by visitors.
      const { data } = await (supabase as any)
        .from("treatment_videos")
        .select("id, platform_video_id, disclosure, display_slot")
        .eq("treatment_id", treatmentId)
        .not("display_slot", "is", null)
        .order("display_slot", { ascending: true })
        .limit(MAX_TILES);
      if (!alive) return;
      setRows(((data as any[]) ?? []) as VideoRow[]);
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [treatmentId]);

  // Live thumbnail per tile from TikTok oEmbed. Only thumbnail_url is kept; a failure leaves the plain dark tile.
  useEffect(() => {
    const toFetch = rows.map((r) => r.platform_video_id).filter((id) => !(id in thumbs));
    if (toFetch.length === 0) return;
    let alive = true;
    toFetch.forEach(async (id) => {
      try {
        const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(`https://www.tiktok.com/video/${id}`)}`);
        if (!res.ok) return;
        const body = await res.json();
        const thumb = typeof body?.thumbnail_url === "string" ? body.thumbnail_url : null;
        if (alive && thumb) setThumbs((prev) => ({ ...prev, [id]: thumb }));
      } catch {
        // plain tile
      }
    });
    return () => {
      alive = false;
    };
  }, [rows]);

  // The official embed script, re-added on every open (as the product page does): embed.js only processes the
  // blockquotes present when it loads. If no player appears, a plain "Watch on TikTok" link is shown instead.
  useEffect(() => {
    if (!active) return;
    setEmbedFailed(false);
    document.getElementById("tiktok-embed-script")?.remove();
    const script = document.createElement("script");
    script.id = "tiktok-embed-script";
    script.async = true;
    script.src = "https://www.tiktok.com/embed.js";
    script.onerror = () => setEmbedFailed(true);
    document.body.appendChild(script);
    const timer = window.setTimeout(() => {
      const box = document.getElementById("treatment-video-embed");
      if (!box || !box.querySelector("iframe")) setEmbedFailed(true);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (!loaded) return <SectionShell>{null}</SectionShell>;
  if (rows.length === 0 && HIDE_WHEN_EMPTY) return null;

  return (
    <SectionShell>
      {rows.length === 0 ? (
        <div className="border border-dashed border-brand-border rounded-[10px] px-[13px] py-3 bg-brand-cream">
          <div className="text-[10px] font-semibold text-brand-muted mb-[5px]">Not enough data yet</div>
          <div className="text-[11.5px] text-brand-muted leading-[1.55]">
            No videos have been approved for this treatment yet.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {rows.map((r) => {
            const thumb = thumbs[r.platform_video_id];
            const chips = (Array.isArray(r.disclosure) ? r.disclosure : []).filter((d) => Boolean(DISCLOSURE_LABELS[d]));
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setActive(r.platform_video_id)}
                aria-label="Play video"
                className="block w-full p-0 border-none bg-transparent cursor-pointer"
              >
                <div
                  className="rounded-xl overflow-hidden aspect-[9/16] relative"
                  style={{ background: thumb ? `#1a2620 url(${thumb}) center/cover no-repeat` : "#1a2620" }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                    <Play width={14} height={14} color="#fff" fill="#fff" />
                  </div>
                  {chips.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1.5 bg-gradient-to-t from-black/70 to-transparent flex flex-wrap gap-[3px]">
                      {chips.map((d) => (
                        <span key={d} className="text-[8px] font-medium text-white bg-white/20 rounded-[3px] px-[5px] py-0.5 whitespace-nowrap">
                          {DISCLOSURE_LABELS[d]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
      <div className="text-[10px] text-brand-muted mt-2 leading-[1.4]">
        What the treatment looks like. May include sponsored or gifted posts. Not counted in Worth it.
      </div>

      {active && (
        <div
          onClick={() => setActive(null)}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[340px] max-h-[85vh] overflow-y-auto rounded-xl bg-card">
            <div className="flex justify-end pt-2 px-2">
              <button
                type="button"
                onClick={() => setActive(null)}
                className="bg-transparent border-none text-xl text-brand-espresso cursor-pointer p-1 leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div id="treatment-video-embed">
              <blockquote
                key={active}
                className="tiktok-embed mx-auto"
                cite={watchUrl(active)}
                data-video-id={active}
                style={{ maxWidth: 325, minWidth: 260 }}
              >
                <section></section>
              </blockquote>
            </div>
            {embedFailed && (
              <div className="text-center pb-3">
                <a
                  href={watchUrl(active)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-brand-crimson"
                >
                  Watch on TikTok
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </SectionShell>
  );
}
