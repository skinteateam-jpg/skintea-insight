import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bookmark, ChevronRight, Lock, Sparkles, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/product/$id")({
  component: ProductDetail,
  head: () => ({
    meta: [
      { title: "Product — Skintea" },
      {
        name: "description",
        content:
          "The real tea on this product. Aggregated from Reddit, TikTok and verified reviews.",
      },
    ],
  }),
});

const C = {
  espresso: "#1C0A00",
  crimson: "#A8001C",
  crimsonLight: "#F5DDE1",
  content: "#faf8f5",
  warm: "#F5F0EB",
  warmStrong: "#E8DFD5",
  textDark: "#1C0A00",
  textMid: "#5C4033",
  textLight: "#9E8070",
  border: "#E8DDD4",
  green: "#1D9E75",
  greenTint: "#E6F4EE",
  red: "#A8001C",
  redTint: "#FBE8EB",
  amber: "#C8941F",
  gray: "#9E8070",
};

type Product = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  product_url: string | null;
  description: string | null;
  skintea_score: number | null;
  is_top_pick: boolean | null;
};

function formatPrice(p: Product) {
  if (p.price == null) return "—";
  const cur = p.currency || "USD";
  const sym = cur === "USD" ? "$" : cur === "EUR" ? "€" : cur === "GBP" ? "£" : "";
  return sym ? `${sym}${Number(p.price).toFixed(2)}` : `${Number(p.price).toFixed(2)} ${cur}`;
}

function ProductDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id,name,brand,category,price,currency,image_url,product_url,description,skintea_score,is_top_pick")
          .eq("id", id)
          .maybeSingle();
        if (!alive) return;
        if (error || !data) {
          setNotFound(true);
        } else {
          setProduct(data as Product);
        }
      } catch {
        if (alive) setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (!alive) return;
      setUserId(uid);
      if (!uid) { setIsSaved(false); return; }
      const { data: row } = await (supabase as any)
        .from("saved_products")
        .select("id")
        .eq("user_id", uid)
        .eq("product_id", id)
        .maybeSingle();
      if (!alive) return;
      setIsSaved(!!row);
    })();
    return () => { alive = false; };
  }, [id]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  async function handleSaveToggle() {
    if (!userId) { navigate({ to: "/login" }); return; }
    if (saving) return;
    setSaving(true);
    if (!isSaved) {
      const { error } = await (supabase as any)
        .from("saved_products")
        .insert({ user_id: userId, product_id: id, created_at: new Date().toISOString() });
      if (!error) { setIsSaved(true); showToast("Saved"); }
    } else {
      const { error } = await (supabase as any)
        .from("saved_products")
        .delete()
        .eq("user_id", userId)
        .eq("product_id", id);
      if (!error) { setIsSaved(false); showToast("Removed"); }
    }
    setSaving(false);
  }

  function handleShelfClick() {
    if (!userId) { navigate({ to: "/login" }); return; }
    showToast("Coming soon — add from your profile");
  }
  function handleGiftClick() {
    if (!userId) { navigate({ to: "/login" }); return; }
    showToast("Coming soon — add from your profile");
  }

  if (loading) {
    return (
      <div style={{ background: C.espresso, minHeight: "100vh", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div style={{ background: C.espresso, minHeight: "100vh", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Product not found</div>
        <Link to="/products" style={{ color: C.crimson, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>← Browse products</Link>
      </div>
    );
  }

  const recommend = product.skintea_score ?? null;
  const tags: { label: string; trending?: boolean }[] = [];
  if (product.category) tags.push({ label: product.category });
  if (product.is_top_pick) tags.push({ label: "Top Pick", trending: true });

  return (
    <div style={{ background: C.espresso, minHeight: "100vh", color: C.textDark, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 96 }}>
        {/* Nav */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: C.espresso }}>
          <Link to="/products" style={{ textDecoration: "none" }}>
            <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.04em", lineHeight: 1 }}>
              <span style={{ color: "#FFFFFF" }}>SKIN</span>
              <span style={{ color: C.crimson }}>TEA</span>
            </div>
          </Link>
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <Link to="/products" style={{ color: "#FFFFFF", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", textDecoration: "none" }}>Products</Link>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "inline-flex", alignItems: "center", gap: 4 }}>Tea <Lock size={11} /></span>
          </div>
        </nav>

        {/* Hero */}
        <section style={{ padding: "24px 20px 36px", background: C.espresso }}>
          <div style={{ color: C.crimson, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>Product Intelligence</div>
          <h1 style={{ color: "#FFFFFF", fontSize: 28, fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.02em", margin: "0 0 10px 0" }}>What's the real tea on this product?</h1>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 500 }}>Aggregated from Reddit, TikTok & verified reviews</div>
        </section>

        {/* Content card */}
        <div style={{ background: C.content, borderRadius: "20px 20px 0 0", padding: "24px 20px 40px" }}>
          <SectionLabel>Product Detail</SectionLabel>

          {/* Product header */}
          <div style={{ display: "flex", gap: 14, marginTop: 14, alignItems: "flex-start" }}>
            <div style={{ width: 72, height: 72, borderRadius: 14, background: C.warm, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }} aria-hidden>
              {product.image_url ? (
                <img src={product.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 32 }}>🧴</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {product.brand && (
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: C.textLight, letterSpacing: "0.06em", marginBottom: 2 }}>{product.brand}</div>
              )}
              <div style={{ fontSize: 17, fontWeight: 700, color: C.textDark, lineHeight: 1.25, marginBottom: 10 }}>{product.name}</div>
              {tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {tags.map((t) => (
                    <span key={t.label} style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: t.trending ? C.crimsonLight : C.warm, color: t.trending ? C.crimson : C.textMid }}>{t.label}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Price row */}
          <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.textDark, lineHeight: 1 }}>{formatPrice(product)}</div>
              {product.product_url && (
                <a href={product.product_url} target="_blank" rel="noreferrer" style={{ marginTop: 4, fontSize: 11, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, textDecoration: "none", display: "inline-block" }}>Shop now ↗</a>
              )}
            </div>
            <button
              onClick={handleSaveToggle}
              disabled={saving}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 999, border: isSaved ? "none" : `1.5px solid ${C.textDark}`, background: isSaved ? C.textDark : "transparent", color: isSaved ? "#FFFCF8" : C.textDark, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1, transition: "opacity 150ms ease" }}
            >
              <Bookmark size={13} fill={isSaved ? "#FFFCF8" : "none"} />
              {isSaved ? "Saved" : "Save"}
            </button>
          </div>

          {product.description && (
            <>
              <Divider />
              <SectionLabel>About</SectionLabel>
              <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.55, color: C.textMid }}>{product.description}</p>
            </>
          )}

          <Divider />

          {/* Recommend score */}
          {recommend != null ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <VerdictCard tint={C.greenTint} border={C.green} percent={Math.round(recommend)} label="recommend" color={C.green} />
                <VerdictCard tint={C.redTint} border={C.red} percent={Math.max(0, 100 - Math.round(recommend))} label="don't recommend" color={C.red} />
              </div>
              <div style={{ marginTop: 14, height: 8, borderRadius: 999, background: C.warmStrong, overflow: "hidden" }}>
                <div style={{ width: `${Math.round(recommend)}%`, height: "100%", background: C.crimson, borderRadius: 999 }} />
              </div>
            </>
          ) : (
            <EmptyBlock label="Verdict data coming soon" />
          )}

          <Divider />

          <SectionLabel>Skin Type Fit</SectionLabel>
          <div style={{ marginTop: 14 }}>
            <EmptyBlock label="Skin-type breakdown coming soon" />
          </div>

          <Divider />

          <SectionLabel>Fit Summary</SectionLabel>
          <div style={{ marginTop: 14 }}>
            <EmptyBlock label="Works-for / skip-if insights coming soon" />
          </div>

          <Divider />

          {/* What the tea says */}
          <div style={{ background: C.espresso, borderRadius: 14, padding: "18px 18px 20px" }}>
            <div style={{ color: C.crimson, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>What the tea says</div>
            <div style={{ color: "rgba(250,248,245,0.7)", fontSize: 13, lineHeight: 1.5 }}>
              Real insights from Reddit, TikTok and verified reviews coming soon for this product.
            </div>
          </div>

          <button style={{ marginTop: 20, width: "100%", background: C.crimson, color: "#FFFFFF", border: "none", borderRadius: 12, padding: "16px", fontSize: 14, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            See full tea breakdown <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Bottom action bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#FFFCF8", borderTop: `1px solid ${C.border}`, padding: "12px 20px", display: "flex", gap: 10, justifyContent: "center", zIndex: 50 }}>
        <div style={{ maxWidth: 480, width: "100%", display: "flex", gap: 10 }}>
          <ActionBtn icon={<Sparkles size={18} />} label="Add to Shelf" onClick={handleShelfClick} />
          <ActionBtn icon={<Gift size={18} />} label="Gift Me" onClick={handleGiftClick} />
          <ActionBtn
            icon={<Bookmark size={18} fill={isSaved ? C.espresso : "none"} />}
            label={isSaved ? "Saved" : "Save"}
            onClick={handleSaveToggle}
            active={isSaved}
            disabled={saving}
          />
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 96, left: "50%", transform: "translateX(-50%)", background: C.espresso, color: "#FFFCF8", padding: "10px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600, zIndex: 100, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ icon, label, onClick, active, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "8px 4px",
        background: active ? C.espresso : "transparent",
        color: active ? "#FFFCF8" : C.espresso,
        border: `1px solid ${active ? C.espresso : C.border}`,
        borderRadius: 10,
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: C.crimson, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>{children}</div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: C.warmStrong, margin: "22px 0" }} />;
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div style={{ background: "#FFFFFF", border: `1px dashed ${C.border}`, borderRadius: 12, padding: "20px 14px", textAlign: "center", color: C.textLight, fontSize: 12, fontWeight: 600, letterSpacing: "0.02em" }}>
      {label}
    </div>
  );
}

function VerdictCard({ tint, border, percent, label, color }: { tint: string; border: string; percent: number; label: string; color: string }) {
  return (
    <div style={{ background: tint, border: `1px solid ${border}33`, borderRadius: 12, padding: "14px 14px 16px" }}>
      <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{percent}%</div>
      <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: C.textMid, textTransform: "lowercase" }}>{label}</div>
    </div>
  );
}