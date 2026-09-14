import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppFrame from "@/components/AppFrame";
import BottomNav from "@/components/BottomNav";

export const Route = createFileRoute("/treatments/")({
  component: TreatmentsIndexPage,
  head: () => ({
    meta: [
      { title: "Treatments — Skintea" },
      { name: "description", content: "What each treatment is, how it works, and which LA clinics offer it." },
      { property: "og:title", content: "Treatments — Skintea" },
      { property: "og:description", content: "What each treatment is, how it works, and which LA clinics offer it." },
    ],
  }),
});

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const WARM_WHITE = "#FFFCF8";
const BORDER = "#E8DDD4";
const MUTED = "#999999";

// Categories in this order; any category not listed follows alphabetically.
const CATEGORY_ORDER = ["Facial & Skin", "Injectables & Medical", "Laser & Energy"];

type TreatmentRow = {
  id: string;
  slug: string | null;
  name: string;
  subtitle: string | null;
  category: string | null;
  sort_order: number;
};

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 9, fontWeight: 800, letterSpacing: "0.14em",
  textTransform: "uppercase", color: CRIMSON,
};

function TreatmentsIndexPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<TreatmentRow[]>([]);
  const [clinicCounts, setClinicCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [t, ct] = await Promise.all([
        supabase
          .from("treatments")
          .select("id, slug, name, subtitle, category, sort_order")
          .eq("active", true)
          .order("sort_order", { ascending: true }),
        supabase.from("clinic_treatments").select("treatment_id, clinic_id"),
      ]);
      if (!alive) return;
      setRows(((t.data as any[]) ?? []).filter((r) => r.slug) as TreatmentRow[]);
      const counts: Record<string, Set<string>> = {};
      for (const r of (ct.data as any[]) ?? []) {
        if (!r.treatment_id || !r.clinic_id) continue;
        (counts[r.treatment_id] ??= new Set()).add(r.clinic_id);
      }
      setClinicCounts(Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v.size])));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const groups = useMemo(() => {
    const byCat = new Map<string, TreatmentRow[]>();
    for (const r of rows) {
      const cat = r.category ?? "Other";
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat)!.push(r);
    }
    const rank = (c: string) => {
      const i = CATEGORY_ORDER.indexOf(c);
      return i === -1 ? CATEGORY_ORDER.length : i;
    };
    return [...byCat.entries()].sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]));
  }, [rows]);

  return (
    <AppFrame>
      <div style={{ background: WARM_WHITE, minHeight: "100vh", color: ESPRESSO, fontFamily: "system-ui, -apple-system, sans-serif", paddingBottom: 80 }}>
        <header style={{ background: WARM_WHITE, borderBottom: `0.5px solid ${BORDER}`, padding: "14px 16px 12px", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={SECTION_LABEL}>Treatments</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: "4px 0 0" }}>What it is, who it's for, where to get it</h1>
        </header>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: MUTED, fontSize: 12 }}>Loading…</div>
        ) : groups.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: MUTED, fontSize: 12 }}>No treatments listed yet.</div>
        ) : (
          groups.map(([category, items]) => (
            <section key={category} style={{ padding: "16px", borderBottom: `0.5px solid ${BORDER}` }}>
              <div style={{ ...SECTION_LABEL, marginBottom: 10 }}>{category}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((t) => {
                  const n = clinicCounts[t.id] ?? 0;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => navigate({ to: "/treatments/$slug", params: { slug: t.slug! } }).catch(() => {})}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                        background: "#FFFFFF", border: `0.5px solid ${BORDER}`, borderRadius: 10,
                        padding: "11px 12px", cursor: "pointer", fontFamily: "inherit", color: ESPRESSO,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800 }}>{t.name}</div>
                        {t.subtitle && (
                          <div style={{ fontSize: 11, color: MUTED, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subtitle}</div>
                        )}
                        <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>
                          {n === 0 ? "No clinics linked yet" : `${n} ${n === 1 ? "clinic" : "clinics"}`}
                        </div>
                      </div>
                      <ChevronRight size={16} color={MUTED} />
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        )}

        <BottomNav />
      </div>
    </AppFrame>
  );
}
