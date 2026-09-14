import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppFrame from "@/components/AppFrame";
import BottomNav from "@/components/BottomNav";

export const Route = createFileRoute("/treatments/$slug")({
  component: TreatmentPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Skintea treatments` },
      { name: "description", content: "What this treatment is, how it works, and which LA clinics offer it." },
    ],
  }),
});

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const WARM_WHITE = "#FFFCF8";
const BORDER = "#E8DDD4";
const MUTED = "#999999";
const CREAM_TINT = "#F5EFEC";

type Treatment = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  category: string | null;
  what_it_is: string | null;
  how_it_works: string | null;
  who_its_for: string | null;
  downtime: string | null;
  average_cost: string | null;
  sessions_recommended: string | null;
};

type ClinicLink = {
  id: string;
  price_from: number | null;
  price_unit: string | null;
  clinics: {
    id: string;
    name: string;
    neighborhood: string | null;
  } | null;
};

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 9, fontWeight: 800, letterSpacing: "0.14em",
  textTransform: "uppercase", color: CRIMSON,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ padding: "16px", borderBottom: `0.5px solid ${BORDER}` }}>
      <div style={{ ...SECTION_LABEL, marginBottom: 10 }}>{title}</div>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ padding: "10px 0", borderBottom: `0.5px solid ${BORDER}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 3 }}>{label}</div>
      {value ? (
        <div style={{ fontSize: 13, lineHeight: 1.55, color: ESPRESSO, whiteSpace: "pre-line" }}>{value}</div>
      ) : (
        <div style={{ fontSize: 12, color: MUTED, fontStyle: "italic" }}>Not added yet.</div>
      )}
    </div>
  );
}

function TreatmentPage() {
  const { slug } = Route.useParams();
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [links, setLinks] = useState<ClinicLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: t } = await supabase
        .from("treatments")
        .select("id, slug, name, subtitle, category, what_it_is, how_it_works, who_its_for, downtime, average_cost, sessions_recommended")
        .eq("slug", slug)
        .maybeSingle();
      if (!alive) return;
      setTreatment((t as Treatment | null) ?? null);
      if (t) {
        const { data: ct } = await supabase
          .from("clinic_treatments")
          .select("id, price_from, price_unit, clinics(id, name, neighborhood)")
          .eq("treatment_id", (t as any).id);
        if (!alive) return;
        const rows = ((ct as any[]) ?? []).filter((r) => r.clinics) as ClinicLink[];
        rows.sort((a, b) => a.clinics!.name.localeCompare(b.clinics!.name));
        setLinks(rows);
      } else {
        setLinks([]);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [slug]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: MUTED, fontSize: 12, background: WARM_WHITE, minHeight: "100vh" }}>Loading…</div>;
  }
  if (!treatment) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: MUTED, fontSize: 12, background: WARM_WHITE, minHeight: "100vh" }}>
        Treatment not found. <Link to="/treatments" style={{ color: CRIMSON, fontWeight: 700 }}>All treatments →</Link>
      </div>
    );
  }

  return (
    <AppFrame>
      <div style={{ background: WARM_WHITE, minHeight: "100vh", color: ESPRESSO, fontFamily: "system-ui, -apple-system, sans-serif", paddingBottom: 80 }}>
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: WARM_WHITE, borderBottom: `0.5px solid ${BORDER}`, padding: "12px 16px" }}>
          <Link to="/treatments" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: ESPRESSO, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            <ArrowLeft size={16} /> Treatments
          </Link>
        </div>

        <div style={{ padding: "16px", borderBottom: `0.5px solid ${BORDER}` }}>
          {treatment.category && <div style={SECTION_LABEL}>{treatment.category}</div>}
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "4px 0 0" }}>{treatment.name}</h1>
          {treatment.subtitle && <div style={{ fontSize: 13, color: MUTED, marginTop: 4, lineHeight: 1.45 }}>{treatment.subtitle}</div>}
        </div>

        <Section title="About this treatment">
          <Field label="What it is" value={treatment.what_it_is} />
          <Field label="How it works" value={treatment.how_it_works} />
          <Field label="Who it's for" value={treatment.who_its_for} />
          <Field label="Downtime" value={treatment.downtime} />
          <Field label="Average cost" value={treatment.average_cost} />
          <Field label="Sessions recommended" value={treatment.sessions_recommended} />
        </Section>

        {/*
          Opinion figures. treatments.majority_pct / results_pct / minority_opinion were
          nulled on all rows on 2026-09-14 (the values had no reviews behind them) and are
          not read. Wire this to a counted review source before showing any number.
          Never hide this section.
        */}
        <Section title="What people say">
          <div style={{ background: CREAM_TINT, borderRadius: 10, padding: "14px 12px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: ESPRESSO }}>Not enough data yet</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 4, lineHeight: 1.5 }}>
              Recommend and results figures appear here once enough real reviews of {treatment.name} are in. No estimates, no placeholders dressed up as numbers.
            </div>
          </div>
        </Section>

        <Section title={`Clinics offering ${treatment.name}`}>
          {links.length === 0 ? (
            <div style={{ textAlign: "center", color: MUTED, fontSize: 12, padding: "16px 0" }}>No clinics linked to this treatment yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/*
                Cards link only to the Skintea clinic page. No outbound website or booking
                links here: the visitor would leave before intent is captured, and most
                website_url values come from the Google Maps scrape that is on hold.
                clinic_view is recorded by the clinic page itself, once per mount.
              */}
              {links.map((l) => {
                const c = l.clinics!;
                return (
                  <Link
                    key={l.id}
                    to="/clinics/$id"
                    params={{ id: c.id }}
                    style={{ background: "#FFFFFF", border: `0.5px solid ${BORDER}`, borderRadius: 10, padding: 12, display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: ESPRESSO }}>{c.name}</div>
                      {c.neighborhood && (
                        <div style={{ fontSize: 11, color: MUTED, marginTop: 3, display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <MapPin size={11} /> {c.neighborhood}
                        </div>
                      )}
                      {l.price_from != null && (
                        <div style={{ fontSize: 12, fontWeight: 800, color: CRIMSON, marginTop: 4 }}>
                          From ${l.price_from}{l.price_unit ? ` / ${l.price_unit}` : ""}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={16} color={MUTED} />
                  </Link>
                );
              })}
            </div>
          )}
        </Section>

        <BottomNav />
      </div>
    </AppFrame>
  );
}
