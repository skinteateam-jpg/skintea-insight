import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PersonAvatar from "@/components/PersonAvatar";

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const BORDER = "#E8DDD4";
const MUTED = "#999999";

/**
 * "Who has talked about it" — the celebrity / influencer evidence layer.
 *
 * Skintea states only four things per row: who, which treatment, where they
 * said it, and when. No verdict, no sentiment, no skin type, no endorsement.
 *
 * These rows attach to TREATMENT pages only. They are never joined to a clinic
 * and never link to one: Skintea does not know where anyone was treated, and
 * implying it would be a false association with a real business.
 *
 * `quote` is evidence, not display. It is stored so a written claim can be
 * checked against the person's own words, and is deliberately never rendered.
 */
export type VoiceRow = {
  id: string;
  celeb_name: string;
  source_name: string;
  source_url: string;
  embed_url: string | null;
  platform: string | null;
  evidence_type: string;
  said_on: string;
  tier: string;
  instagram_handle: string | null;
  profile_photo_url: string | null;
  follower_count: number | null;
  follower_count_at: string | null;
};

type PersonGroup = {
  name: string;
  tier: string;
  followerCount: number | null;
  followerCountAt: string | null;
  instagramHandle: string | null;
  photoUrl: string | null;
  rows: VoiceRow[];
};

const PLATFORM_LABEL: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  podcast: "Podcast",
  x: "X",
  threads: "Threads",
  other: "Link",
};

const INITIAL_VISIBLE = 6;

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString("en-US");
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

function extractTikTokVideoId(url: string): string | null {
  const m = url.match(/\/video\/(\d+)/);
  return m ? m[1] : null;
}

export default function TreatmentVoices({ treatmentId }: { treatmentId: string }) {
  const [rows, setRows] = useState<VoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [activeTikTok, setActiveTikTok] = useState<string | null>(null);
  const [activeYouTube, setActiveYouTube] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("celebrity_mentions")
        .select(
          "id, celeb_name, source_name, source_url, embed_url, platform, evidence_type, said_on, tier, instagram_handle, profile_photo_url, follower_count, follower_count_at",
        )
        .eq("treatment_id", treatmentId)
        .eq("active", true);
      if (!alive) return;
      setRows(((data as any[]) ?? []) as VoiceRow[]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [treatmentId]);

  // The official TikTok embed script, loaded only once a card is opened.
  useEffect(() => {
    if (!activeTikTok) return;
    if (document.getElementById("tiktok-embed-script")) return;
    const script = document.createElement("script");
    script.id = "tiktok-embed-script";
    script.async = true;
    script.src = "https://www.tiktok.com/embed.js";
    document.body.appendChild(script);
  }, [activeTikTok]);

  /**
   * One card per person, not per source: someone who spoke about the same
   * treatment on separate occasions is one person with several sources.
   * Order is celebrity rows first, then influencer rows by follower count
   * descending, then by said_on descending. Ordering is not a ranking.
   */
  const groups = useMemo<PersonGroup[]>(() => {
    const byName = new Map<string, PersonGroup>();
    for (const r of rows) {
      const g = byName.get(r.celeb_name);
      if (g) {
        g.rows.push(r);
        if (r.follower_count != null && (g.followerCount == null || r.follower_count > g.followerCount)) {
          g.followerCount = r.follower_count;
          g.followerCountAt = r.follower_count_at;
        }
        g.instagramHandle = g.instagramHandle ?? r.instagram_handle;
        g.photoUrl = g.photoUrl ?? r.profile_photo_url;
      } else {
        byName.set(r.celeb_name, {
          name: r.celeb_name,
          tier: r.tier,
          followerCount: r.follower_count,
          followerCountAt: r.follower_count_at,
          instagramHandle: r.instagram_handle,
          photoUrl: r.profile_photo_url,
          rows: [r],
        });
      }
    }
    const out = [...byName.values()];
    for (const g of out) g.rows.sort((a, b) => b.said_on.localeCompare(a.said_on));
    out.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier === "celebrity" ? -1 : 1;
      const af = a.followerCount ?? -1;
      const bf = b.followerCount ?? -1;
      if (af !== bf) return bf - af;
      return (b.rows[0]?.said_on ?? "").localeCompare(a.rows[0]?.said_on ?? "");
    });
    return out;
  }, [rows]);

  if (loading) return null;

  const visible = expanded ? groups : groups.slice(0, INITIAL_VISIBLE);
  const hidden = groups.length - visible.length;

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
        Who has talked about it{groups.length > 0 ? ` · ${groups.length}` : ""}
      </div>

      {groups.length === 0 ? (
        <div className="border border-dashed border-brand-border rounded-[10px] px-[13px] py-3 bg-brand-cream">
          <div className="text-[10px] font-semibold text-brand-muted mb-[5px]">Not enough data yet</div>
          <div className="text-[11.5px] text-brand-muted leading-[1.55]">
            No one on record has talked about this treatment in their own words yet.
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visible.map((g) => (
              <div
                key={g.name}
                style={{
                  background: "#FFFFFF",
                  border: `0.5px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: 12,
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <PersonAvatar name={g.name} instagramHandle={g.instagramHandle} cachedUrl={g.photoUrl} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: ESPRESSO }}>{g.name}</div>
                  {g.tier === "influencer" && g.followerCount != null && g.followerCountAt && (
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                      {formatFollowers(g.followerCount)} followers · read {formatDate(g.followerCountAt)}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 7 }}>
                    {g.rows.map((r) => {
                      const label = PLATFORM_LABEL[r.platform ?? "other"] ?? "Link";
                      const ytId = r.platform === "youtube" ? extractYouTubeId(r.embed_url ?? r.source_url) : null;
                      const ttId = r.platform === "tiktok" ? extractTikTokVideoId(r.source_url) : null;
                      return (
                        <div key={r.id}>
                          <div style={{ fontSize: 11.5, color: ESPRESSO, lineHeight: 1.45 }}>
                            {label} · {formatDate(r.said_on)}
                          </div>
                          <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{r.source_name}</div>
                          {ytId ? (
                            <button
                              type="button"
                              onClick={() => setActiveYouTube(ytId)}
                              style={{
                                marginTop: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                color: CRIMSON,
                                background: "none",
                                border: "none",
                                padding: 0,
                                cursor: "pointer",
                              }}
                            >
                              Watch on YouTube
                            </button>
                          ) : ttId ? (
                            <button
                              type="button"
                              onClick={() => setActiveTikTok(r.source_url)}
                              style={{
                                marginTop: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                color: CRIMSON,
                                background: "none",
                                border: "none",
                                padding: 0,
                                cursor: "pointer",
                              }}
                            >
                              Watch on TikTok
                            </button>
                          ) : (
                            <a
                              href={r.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ marginTop: 4, display: "inline-block", fontSize: 11, fontWeight: 700, color: CRIMSON }}
                            >
                              Open on {label}
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              style={{
                marginTop: 10,
                width: "100%",
                padding: "10px 12px",
                background: "none",
                border: `0.5px solid ${BORDER}`,
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 800,
                color: CRIMSON,
                cursor: "pointer",
              }}
            >
              Show all {groups.length}
            </button>
          )}
        </>
      )}

      {activeYouTube && (
        <div
          onClick={() => setActiveYouTube(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560 }}>
            <button
              type="button"
              onClick={() => setActiveYouTube(null)}
              style={{ background: "none", border: "none", color: "#FFF", fontSize: 13, fontWeight: 700, marginBottom: 8, cursor: "pointer" }}
            >
              Close
            </button>
            <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: "#000", borderRadius: 10, overflow: "hidden" }}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeYouTube}`}
                title="Source video"
                loading="lazy"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
              />
            </div>
          </div>
        </div>
      )}

      {activeTikTok && (
        <div
          onClick={() => setActiveTikTok(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380 }}>
            <button
              type="button"
              onClick={() => setActiveTikTok(null)}
              style={{ background: "none", border: "none", color: "#FFF", fontSize: 13, fontWeight: 700, marginBottom: 8, cursor: "pointer" }}
            >
              Close
            </button>
            <blockquote
              className="tiktok-embed mx-auto"
              cite={activeTikTok}
              data-video-id={extractTikTokVideoId(activeTikTok) ?? undefined}
              style={{ maxWidth: 325, minWidth: 250 }}
            >
              <section>
                <a href={activeTikTok} target="_blank" rel="noopener noreferrer">
                  Watch on TikTok
                </a>
              </section>
            </blockquote>
          </div>
        </div>
      )}
    </section>
  );
}
