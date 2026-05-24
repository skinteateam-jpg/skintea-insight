import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/treatments")({
  head: () => ({ meta: [{ title: "Treatment Types — Skintea Admin" }] }),
  component: AdminTreatmentsPage,
});

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const CREAM = "#FFFCF8";
const WARM_WHITE = "#FFFCF8";
const BORDER = "#E8DDD4";
const MUTED = "#999999";

const CATEGORIES = ["Injection", "Laser", "Booster", "Peel", "Microneedling", "Other"] as const;
type Category = (typeof CATEGORIES)[number];

type Treatment = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  active: boolean;
  sort_order: number;
};

function AdminTreatmentsPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Treatment | null>(null);

  // Auth gate
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) navigate({ to: "/" }); return; }
      const { data: profile } = await supabase
        .from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle();
      if (cancelled) return;
      if (!profile?.is_admin) { navigate({ to: "/" }); return; }
      setAuthChecked(true);
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const loadTreatments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("treatments")
      .select("id, name, category, description, active, sort_order")
      .order("sort_order", { ascending: true });
    setTreatments(data ?? []);
    setLoading(false);
  };

  useEffect(() => { if (authChecked) loadTreatments(); }, [authChecked]);

  const counts = useMemo(() => ({
    total: treatments.length,
    active: treatments.filter((t) => t.active).length,
  }), [treatments]);

  // Toggle active
  const toggleActive = async (t: Treatment) => {
    const next = !t.active;
    setTreatments((prev) => prev.map((x) => x.id === t.id ? { ...x, active: next } : x));
    const { error } = await supabase.from("treatments").update({ active: next }).eq("id", t.id);
    if (error) {
      setTreatments((prev) => prev.map((x) => x.id === t.id ? { ...x, active: !next } : x));
    }
  };

  // Drag reorder
  const dragId = useRef<string | null>(null);
  const onDragStart = (id: string) => () => { dragId.current = id; };
  const onDragOver = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragId.current || dragId.current === id) return;
    setTreatments((prev) => {
      const from = prev.findIndex((x) => x.id === dragId.current);
      const to = prev.findIndex((x) => x.id === id);
      if (from < 0 || to < 0) return prev;
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };
  const onDragEnd = async () => {
    dragId.current = null;
    // Persist new sort_order for all items
    const updates = treatments.map((t, idx) => ({ id: t.id, sort_order: idx }));
    // Update locally first
    setTreatments((prev) => prev.map((t, idx) => ({ ...t, sort_order: idx })));
    await Promise.all(
      updates.map((u) =>
        supabase.from("treatments").update({ sort_order: u.sort_order }).eq("id", u.id)
      )
    );
  };

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (t: Treatment) => { setEditing(t); setModalOpen(true); };

  const handleSaved = async () => {
    setModalOpen(false);
    setEditing(null);
    await loadTreatments();
  };

  if (!authChecked) {
    return <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "DM Sans, sans-serif" }} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "DM Sans, sans-serif", color: ESPRESSO }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 80px" }}>
        <Link to="/admin" style={{ color: MUTED, fontSize: 13, textDecoration: "none" }}>
          ← Admin
        </Link>

        <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Treatment Types</h1>
          <button
            onClick={openAdd}
            style={{
              background: CRIMSON, color: "#fff", border: "none",
              borderRadius: 999, padding: "10px 18px", fontSize: 14,
              fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            + Add Treatment
          </button>
        </div>

        <p style={{ color: MUTED, fontSize: 13, marginTop: 8 }}>
          {counts.total} treatments · {counts.active} active
        </p>

        <div style={{ marginTop: 20, display: "grid", gap: 8 }}>
          {loading && (
            <div style={{ color: MUTED, fontSize: 14, padding: 16 }}>Loading…</div>
          )}
          {!loading && treatments.map((t) => (
            <div
              key={t.id}
              draggable
              onDragStart={onDragStart(t.id)}
              onDragOver={onDragOver(t.id)}
              onDragEnd={onDragEnd}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                background: WARM_WHITE, border: `1px solid ${BORDER}`,
                borderRadius: 12, padding: "12px 14px",
              }}
            >
              <span style={{ cursor: "grab", color: MUTED, fontSize: 18, userSelect: "none" }}>⠿</span>
              <span style={{ flex: 1, fontSize: 14, color: ESPRESSO }}>{t.name}</span>
              {t.category && (
                <span style={{
                  fontSize: 11, color: MUTED, border: `1px solid ${BORDER}`,
                  borderRadius: 999, padding: "3px 10px", background: CREAM,
                }}>
                  {t.category}
                </span>
              )}
              <Toggle on={t.active} onChange={() => toggleActive(t)} />
              <button
                onClick={() => openEdit(t)}
                style={{
                  background: "none", border: "none", color: MUTED,
                  fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  padding: "4px 6px",
                }}
              >
                Edit
              </button>
            </div>
          ))}
          {!loading && treatments.length === 0 && (
            <div style={{ color: MUTED, fontSize: 14, padding: 16 }}>No treatments yet.</div>
          )}
        </div>
      </div>

      {modalOpen && (
        <TreatmentModal
          treatment={editing}
          existingMaxOrder={treatments.reduce((m, t) => Math.max(m, t.sort_order), -1)}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      aria-pressed={on}
      style={{
        width: 38, height: 22, borderRadius: 999, position: "relative",
        background: on ? "#22A06B" : "#C9C2BB", border: "none", cursor: "pointer",
        transition: "background 0.15s",
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: on ? 18 : 2,
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        transition: "left 0.15s",
      }} />
    </button>
  );
}

function TreatmentModal({
  treatment, existingMaxOrder, onClose, onSaved,
}: {
  treatment: Treatment | null;
  existingMaxOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(treatment?.name ?? "");
  const [category, setCategory] = useState<Category>(
    (CATEGORIES as readonly string[]).includes(treatment?.category ?? "")
      ? (treatment!.category as Category)
      : "Other"
  );
  const [description, setDescription] = useState(treatment?.description ?? "");
  const [active, setActive] = useState(treatment?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) { setErr("Name is required"); return; }
    setSaving(true); setErr(null);
    if (treatment) {
      const { error } = await supabase.from("treatments")
        .update({ name: name.trim(), category, description: description.trim() || null, active })
        .eq("id", treatment.id);
      if (error) { setErr(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("treatments").insert({
        name: name.trim(),
        category,
        description: description.trim() || null,
        active,
        sort_order: existingMaxOrder + 1,
      });
      if (error) { setErr(error.message); setSaving(false); return; }
    }
    setSaving(false);
    onSaved();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(28,10,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 50, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: WARM_WHITE, borderRadius: 16, padding: 22,
          width: "100%", maxWidth: 420, fontFamily: "DM Sans, sans-serif",
          color: ESPRESSO,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>
          {treatment ? "Edit Treatment" : "Add Treatment"}
        </h2>

        <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
          <Field label="Treatment name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              placeholder="e.g. Botox"
            />
          </Field>

          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              style={inputStyle}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Description (optional)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </Field>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: ESPRESSO }}>Active</span>
            <Toggle on={active} onChange={() => setActive((v) => !v)} />
          </div>

          {err && <div style={{ color: CRIMSON, fontSize: 13 }}>{err}</div>}
        </div>

        <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center" }}>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", color: MUTED,
              fontSize: 14, cursor: "pointer", fontFamily: "inherit", padding: "8px 12px",
            }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={{
              background: ESPRESSO, color: "#fff", border: "none",
              borderRadius: 999, padding: "10px 18px", fontSize: 14,
              fontWeight: 500, cursor: saving ? "wait" : "pointer",
              fontFamily: "inherit", opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Save Treatment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: MUTED }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  background: CREAM,
  color: ESPRESSO,
  fontFamily: "inherit",
  outline: "none",
};