import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TREATMENT_DATA } from "../data/treatments";

export const Route = createFileRoute("/treatment/$id")({
  component: TreatmentDetailPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} — Skintea` },
      { name: "description", content: "Real treatment reviews on Skintea." },
    ],
  }),
});

function TreatmentDetailPage() {
  const { id } = Route.useParams();
  const [dbTreatment, setDbTreatment] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from("treatments").select("*").eq("slug", id).maybeSingle();
      if (!alive) return;
      setDbTreatment(data);
      setLoaded(true);
    })();
    return () => { alive = false; };
  }, [id]);

  const allTreatments = Object.values(TREATMENT_DATA).flat();
  const fallback = allTreatments.find(
    (t) => t.name.toLowerCase().replace(/\s+/g, "-") === id,
  );
  const treatment = dbTreatment
    ? { ...(fallback ?? allTreatments[0]), name: dbTreatment.name, desc: dbTreatment.description ?? fallback?.desc ?? "" }
    : fallback;

  if (!loaded && !treatment) {
    return <div style={{ padding: 40, textAlign: "center", color: "#999" }}>Loading…</div>;
  }

  if (!treatment) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#1C0A00" }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
          Treatment not found.
        </div>
        <Link to="/quiz-result" style={{ color: "#A8001C" }}>
          Back to your results
        </Link>
      </div>
    );
  }

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.14em",
    color: "#999",
    textTransform: "uppercase",
    margin: "4px 0 8px",
  };
  const costFrom = treatment.cost.split("–")[0];
  const clinics = [
    { name: "Glow Clinic LA", location: "West Hollywood · 0.8mi", emoji: "🏥", price: `From ${costFrom}` },
    { name: "SkinBar Beverly", location: "Beverly Hills · 1.2mi", emoji: "💆", price: `From ${costFrom}` },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#FFFCF8", paddingBottom: 80 }}>
      <div style={{ background: "#1C0A00", padding: "16px 18px 20px" }}>
        <Link
          to="/quiz-result"
          style={{
            textDecoration: "none",
            color: "rgba(255,252,248,0.6)",
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          ← Back to results
        </Link>
        <div style={{ fontSize: 44, marginBottom: 10 }}>{treatment.emoji}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#FFFCF8", lineHeight: 1.1, marginBottom: 4 }}>
          {treatment.name}
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,252,248,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
          {treatment.hook}
        </div>
        <div style={{ display: "inline-block", background: "#A8001C", color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 99 }}>
          {treatment.pct}
        </div>
      </div>
      <div style={{ padding: "16px 14px 24px" }}>
        <div style={{ fontSize: 13, color: "#1C0A00", lineHeight: 1.65, marginBottom: 14 }}>
          {treatment.desc}
        </div>
        <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
          {[
            { label: "Avg cost", value: treatment.cost },
            { label: "Downtime", value: treatment.downtime },
            { label: "Sessions", value: treatment.sessions },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 10, padding: "8px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 8, color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#1C0A00" }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={sectionLabelStyle}>WHO'S DONE IT</div>
        <div style={{ background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 10, padding: "10px 12px", display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 99, background: "#1C0A00", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
            👤
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1C0A00", marginBottom: 2 }}>{treatment.celeb}</div>
            <div style={{ fontSize: 11, color: "#999", lineHeight: 1.4, fontStyle: "italic", marginBottom: 4 }}>{treatment.hook}</div>
            <div style={{ fontSize: 9, color: "#A8001C", fontWeight: 700 }}>Verified</div>
          </div>
        </div>
        <div style={sectionLabelStyle}>SEE HOW IT LOOKS</div>
        {treatment.videos.map((v, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 10, padding: "10px 12px", marginBottom: 6, cursor: "pointer" }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: v.platform === "TK" ? "#000" : "linear-gradient(135deg, #A8001C, #E0407C)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, flexShrink: 0 }}>
              {v.platform}
            </div>
            <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "#1C0A00", lineHeight: 1.35 }}>{v.title}</div>
            <span style={{ fontSize: 12, color: "#bbb" }}>→</span>
          </div>
        ))}
        <div style={{ ...sectionLabelStyle, marginTop: 14 }}>CLINICS NEAR YOU</div>
        {clinics.map((c, i) => (
          <div key={i} style={{ background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 10, padding: "10px 12px", display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, background: "#FFFCF8", border: "0.5px solid #E8DDD4", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              {c.emoji}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1C0A00", marginBottom: 2 }}>{c.name}</div>
              <div style={{ fontSize: 10, color: "#999", marginBottom: 4 }}>{c.location}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#A8001C" }}>{c.price}</div>
            </div>
          </div>
        ))}
        <div style={{ ...sectionLabelStyle, marginTop: 14 }}>REAL REVIEWS</div>
        <div style={{ background: "#1C0A00", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 11, color: "rgba(255,252,248,0.7)", lineHeight: 1.4 }}>
            <strong style={{ color: "#FFFCF8" }}>{treatment.reviewCount}</strong> real reviews from members — costs, results, who it worked for.
          </div>
          <button style={{ background: "#A8001C", color: "#fff", border: "none", borderRadius: 99, padding: "8px 14px", fontSize: 11, fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
}