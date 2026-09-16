import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/integrations/supabase/client";

// Admin-only: per-clinic outbound intent (calls, bookings, directions, website and social opens) over a chosen
// period, from public.clinic_intent_report(). The function reads through the table's RLS, so a non-admin gets no
// rows even if they reach this page. These are intents Skintea logged, not completed calls or confirmed bookings.
export const Route = createFileRoute("/admin/clinic-intents")({
  head: () => ({ meta: [{ title: "Clinic intent — Skintea Admin" }] }),
  component: AdminClinicIntentsPage,
});

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const CREAM = "#FFFCF8";
const BORDER = "#E8DDD4";
const MUTED = "#999999";

type Row = {
  clinic_id: string;
  clinic_name: string;
  listed: boolean;
  calls: number;
  bookings: number;
  bookings_via_call: number;
  bookings_via_website: number;
  phone_intents: number;
  directions: number;
  website_opens: number;
  social_opens: number;
  total_actions: number;
  sessions: number;
  first_event: string;
  last_event: string;
};

const PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

function AdminClinicIntentsPage() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);
  const [from, setFrom] = useState(() => isoDay(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) navigate({ to: "/" }); return; }
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle();
      if (cancelled) return;
      if (!profile?.is_admin) { navigate({ to: "/" }); return; }
      setAllowed(true);
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      // The reader's "to" date is inclusive: the report's upper bound is the start of the following day.
      const end = new Date(`${to}T00:00:00Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      const { data, error: err } = await (supabase as any).rpc("clinic_intent_report", {
        p_from: `${from}T00:00:00Z`,
        p_to: end.toISOString(),
      });
      if (cancelled) return;
      if (err) { setError(err.message); setRows([]); }
      else setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [allowed, from, to]);

  const totals = useMemo(() => rows.reduce(
    (t, r) => ({
      calls: t.calls + Number(r.calls),
      bookings: t.bookings + Number(r.bookings),
      directions: t.directions + Number(r.directions),
      website: t.website + Number(r.website_opens),
      social: t.social + Number(r.social_opens),
      total: t.total + Number(r.total_actions),
    }),
    { calls: 0, bookings: 0, directions: 0, website: 0, social: 0, total: 0 },
  ), [rows]);

  if (!allowed) return <div style={{ minHeight: "100vh", background: CREAM }} />;

  const th: CSSProperties = { textAlign: "right", padding: "8px 10px", fontSize: 11, color: MUTED, fontWeight: 700, borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap" };
  const td: CSSProperties = { textAlign: "right", padding: "8px 10px", fontSize: 13, borderBottom: `0.5px solid ${BORDER}`, fontVariantNumeric: "tabular-nums" };

  return (
    <div style={{ minHeight: "100vh", background: CREAM, color: ESPRESSO, fontFamily: "DM Sans, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px" }}>
        <Link to="/admin" style={{ color: MUTED, fontSize: 12, textDecoration: "none" }}>← Admin</Link>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 30, margin: "8px 0 4px" }}>Clinic intent</h1>
        <p style={{ color: MUTED, fontSize: 13, margin: "0 0 20px", maxWidth: 720 }}>
          Every tap on a clinic&apos;s Call, Book, Directions, website or social link, logged when it happened. These are
          intents Skintea sent to the clinic, not completed calls or confirmed bookings.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 16 }}>
          {PRESETS.map((p) => (
            <button key={p.days} type="button"
              onClick={() => { setFrom(isoDay(new Date(Date.now() - p.days * 86400000))); setTo(isoDay(new Date())); }}
              style={{ border: `1px solid ${BORDER}`, background: "#fff", borderRadius: 99, padding: "6px 12px", fontSize: 12, cursor: "pointer", color: ESPRESSO }}>
              {p.label}
            </button>
          ))}
          <label style={{ fontSize: 12, color: MUTED }}>From <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
          <label style={{ fontSize: 12, color: MUTED }}>To <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
        </div>

        {error && <div style={{ color: CRIMSON, fontSize: 13, marginBottom: 12 }}>Couldn&apos;t load the report: {error}</div>}
        {loading ? (
          <div style={{ color: MUTED, fontSize: 13 }}>Loading…</div>
        ) : rows.length === 0 ? (
          !error && <div style={{ color: MUTED, fontSize: 13, padding: "24px 0" }}>No clinic actions logged between {from} and {to}.</div>
        ) : (
          <div style={{ overflowX: "auto", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12 }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 820 }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left" }}>Clinic</th>
                  <th style={th}>Calls</th>
                  <th style={th}>Bookings</th>
                  <th style={th} title="Bookings that were Call to book taps">…by call</th>
                  <th style={th} title="Bookings that opened the clinic's site or booking platform">…by site</th>
                  <th style={th}>Directions</th>
                  <th style={th}>Website opens</th>
                  <th style={th}>Social opens</th>
                  <th style={th}>Total</th>
                  <th style={th} title="Distinct anonymous sessions or signed-in users">Visitors</th>
                  <th style={th}>Last</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.clinic_id}>
                    <td style={{ ...td, textAlign: "left" }}>
                      <Link to="/clinics/$id" params={{ id: r.clinic_id }} style={{ color: ESPRESSO, fontWeight: 600, textDecoration: "none" }}>{r.clinic_name}</Link>
                      {!r.listed && <span style={{ marginLeft: 6, fontSize: 10, color: MUTED }}>not listed</span>}
                    </td>
                    <td style={td}>{r.calls}</td>
                    <td style={td}>{r.bookings}</td>
                    <td style={td}>{r.bookings_via_call}</td>
                    <td style={td}>{r.bookings_via_website}</td>
                    <td style={td}>{r.directions}</td>
                    <td style={td}>{r.website_opens}</td>
                    <td style={td}>{r.social_opens}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{r.total_actions}</td>
                    <td style={td}>{r.sessions}</td>
                    <td style={{ ...td, fontSize: 11, color: MUTED }}>{new Date(r.last_event).toISOString().slice(0, 10)}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ ...td, textAlign: "left", fontWeight: 700 }}>All clinics</td>
                  <td style={{ ...td, fontWeight: 700 }}>{totals.calls}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{totals.bookings}</td>
                  <td style={td} />
                  <td style={td} />
                  <td style={{ ...td, fontWeight: 700 }}>{totals.directions}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{totals.website}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{totals.social}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{totals.total}</td>
                  <td style={td} />
                  <td style={td} />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
