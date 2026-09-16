import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/retailers")({
  head: () => ({
    meta: [
      { title: "Retailers & shop links — Skintea Admin" },
      { name: "description", content: "Manage retailers, affiliate ids, brand coverage and product shop links." },
    ],
  }),
  component: AdminRetailers,
});

const ESPRESSO = "#1C0A00";
const CREAM = "#FFFCF8";
const BORDER = "#E8DDD4";
const CRIMSON = "#A8001C";
const MUTED = "#999999";

type Retailer = {
  id: string;
  slug: string;
  name: string;
  search_url_template: string | null;
  affiliate_id: string | null;
  affiliate_param_template: string | null;
  network: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
};

const card: React.CSSProperties = {
  background: CREAM,
  border: `0.5px solid ${BORDER}`,
  borderRadius: 12,
  padding: 16,
};

const input: React.CSSProperties = {
  background: CREAM,
  border: `0.5px solid ${BORDER}`,
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13,
  color: ESPRESSO,
  fontFamily: "inherit",
  outline: "none",
};

const button: React.CSSProperties = {
  background: ESPRESSO,
  color: CREAM,
  border: "none",
  borderRadius: 8,
  padding: "9px 14px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function AdminRetailers() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [pairs, setPairs] = useState<{ brand: string; retailer_id: string }[]>([]);
  const [brandQuery, setBrandQuery] = useState("");
  const [csv, setCsv] = useState("");
  const [importing, setImporting] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) navigate({ to: "/" }); return; }
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle();
      if (cancelled) return;
      if (!profile?.is_admin) { navigate({ to: "/" }); return; }
      await reload();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  async function reload() {
    const [{ data: rs }, { data: ps }, { data: prods }] = await Promise.all([
      (supabase as any).from("retailers").select("id,slug,name,search_url_template,affiliate_id,affiliate_param_template,is_active,sort_order").order("sort_order", { ascending: true }),
      (supabase as any).from("brand_retailers").select("brand,retailer_id"),
      (supabase as any).from("products").select("brand").not("brand", "is", null).limit(5000),
    ]);
    setRetailers((rs ?? []) as Retailer[]);
    setPairs((ps ?? []) as { brand: string; retailer_id: string }[]);
    const set = new Set<string>();
    for (const p of prods ?? []) if (p.brand) set.add(p.brand as string);
    setBrands([...set].sort((a, b) => a.localeCompare(b)));
  }

  const pairKey = (brand: string, rid: string) => `${brand.toLowerCase()}::${rid}`;
  const pairSet = useMemo(() => new Set(pairs.map((p) => pairKey(p.brand, p.retailer_id))), [pairs]);

  const shownBrands = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    const list = q ? brands.filter((b) => b.toLowerCase().includes(q)) : brands;
    return list.slice(0, 60);
  }, [brands, brandQuery]);

  async function saveRetailer(r: Retailer, patch: Partial<Retailer>) {
    const next = { ...r, ...patch };
    setRetailers((prev) => prev.map((x) => (x.id === r.id ? next : x)));
    const { error } = await (supabase as any)
      .from("retailers")
      .update({ affiliate_id: next.affiliate_id, is_active: next.is_active })
      .eq("id", r.id);
    setMsg(error ? `Couldn't save ${r.name}: ${error.message}` : `Saved ${r.name}`);
  }

  async function toggleBrand(brand: string, r: Retailer) {
    const on = pairSet.has(pairKey(brand, r.id));
    if (on) {
      const { error } = await (supabase as any).from("brand_retailers").delete().ilike("brand", brand).eq("retailer_id", r.id);
      if (error) { setMsg(`Couldn't remove: ${error.message}`); return; }
      setPairs((prev) => prev.filter((p) => pairKey(p.brand, p.retailer_id) !== pairKey(brand, r.id)));
    } else {
      const { error } = await (supabase as any).from("brand_retailers").insert({ brand, retailer_id: r.id });
      if (error) { setMsg(`Couldn't add: ${error.message}`); return; }
      setPairs((prev) => [...prev, { brand, retailer_id: r.id }]);
    }
  }

  // CSV: product_slug,retailer_slug,product_url,price
  // product_slug accepts a product id (uuid) or the exact product name — products have no slug column.
  async function runImport() {
    setImporting(true);
    const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const out: string[] = [];
    let ok = 0;
    const bySlug = new Map(retailers.map((r) => [r.slug.toLowerCase(), r]));
    for (const [i, line] of lines.entries()) {
      const cols = splitCsvLine(line);
      if (i === 0 && cols[0]?.toLowerCase() === "product_slug") continue;
      const [key, retailerSlug, productUrl, priceRaw] = cols;
      if (!key || !retailerSlug) { out.push(`Line ${i + 1}: skipped, needs product and retailer`); continue; }
      const retailer = bySlug.get(retailerSlug.toLowerCase());
      if (!retailer) { out.push(`Line ${i + 1}: unknown retailer "${retailerSlug}"`); continue; }
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
      const q = (supabase as any).from("products").select("id").limit(2);
      const { data: found } = isUuid ? await q.eq("id", key) : await q.ilike("name", key);
      if (!found || found.length === 0) { out.push(`Line ${i + 1}: no product matched "${key}"`); continue; }
      if (found.length > 1) { out.push(`Line ${i + 1}: "${key}" matched more than one product, skipped`); continue; }
      const price = priceRaw ? Number(priceRaw.replace(/[^0-9.]/g, "")) : null;
      const { error } = await (supabase as any).from("product_retailer_links").upsert(
        {
          product_id: found[0].id,
          retailer_id: retailer.id,
          product_url: productUrl || null,
          price: price !== null && Number.isFinite(price) ? price : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "product_id,retailer_id" },
      );
      if (error) out.push(`Line ${i + 1}: ${error.message}`);
      else { ok++; }
    }
    out.unshift(`${ok} of ${lines.length} row(s) written.`);
    setLog(out);
    setImporting(false);
  }

  if (loading) return <div style={{ minHeight: "100vh", background: CREAM }} />;

  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "DM Sans, sans-serif", color: ESPRESSO }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>
        <Link to="/admin" style={{ color: CRIMSON, fontSize: 12, textDecoration: "none", fontWeight: 600 }}>← Admin</Link>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 32, fontWeight: 600, margin: "12px 0 4px" }}>
          Retailers &amp; shop links
        </h1>
        <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>
          Affiliate ids are optional. While one is empty, buttons link to the retailer's normal product page.
        </p>
        {msg && <p style={{ fontSize: 12, color: CRIMSON, marginTop: 12 }}>{msg}</p>}

        {/* Retailers */}
        <div style={{ ...card, marginTop: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: CRIMSON }}>
            Retailers
          </div>
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {retailers.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", borderTop: `0.5px solid ${BORDER}`, paddingTop: 10 }}>
                <div style={{ width: 150, fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                <input
                  style={{ ...input, width: 200 }}
                  placeholder="affiliate id (none yet)"
                  defaultValue={r.affiliate_id ?? ""}
                  onBlur={(e) => {
                    const v = e.target.value.trim() || null;
                    if (v !== (r.affiliate_id ?? null)) saveRetailer(r, { affiliate_id: v });
                  }}
                />
                <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" checked={r.is_active} onChange={(e) => saveRetailer(r, { is_active: e.target.checked })} />
                  Active
                </label>
                <div style={{ fontSize: 11, color: MUTED, flex: 1, minWidth: 160, wordBreak: "break-all" }}>
                  {r.affiliate_param_template ? `param: ${r.affiliate_param_template} · ` : ""}
                  {r.search_url_template ?? "no search page"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Brand coverage */}
        <div style={{ ...card, marginTop: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: CRIMSON }}>
            Which retailers carry a brand
          </div>
          <p style={{ fontSize: 12, color: MUTED, margin: "6px 0 12px" }}>
            A retailer only shows a search link for brands ticked here. Product links always show.
          </p>
          <input style={{ ...input, width: "100%", maxWidth: 320 }} placeholder="Search brands" value={brandQuery} onChange={(e) => setBrandQuery(e.target.value)} />
          <div style={{ marginTop: 12, overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 12, minWidth: 620 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Brand</th>
                  {retailers.map((r) => (
                    <th key={r.id} style={{ padding: "6px 10px", fontWeight: 600 }}>{r.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shownBrands.map((b) => (
                  <tr key={b} style={{ borderTop: `0.5px solid ${BORDER}` }}>
                    <td style={{ padding: "6px 10px" }}>{b}</td>
                    {retailers.map((r) => (
                      <td key={r.id} style={{ padding: "6px 10px", textAlign: "center" }}>
                        <input type="checkbox" checked={pairSet.has(pairKey(b, r.id))} onChange={() => toggleBrand(b, r)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {shownBrands.length === 0 && <p style={{ fontSize: 12, color: MUTED }}>No brand matches that search.</p>}
            {brands.length > shownBrands.length && (
              <p style={{ fontSize: 11, color: MUTED, marginTop: 8 }}>Showing {shownBrands.length} of {brands.length} brands — search to narrow.</p>
            )}
          </div>
        </div>

        {/* CSV import */}
        <div style={{ ...card, marginTop: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: CRIMSON }}>
            Import product shop links
          </div>
          <p style={{ fontSize: 12, color: MUTED, margin: "6px 0 10px" }}>
            One row per line: <code>product_slug,retailer_slug,product_url,price</code>. A header row is ignored.
            product_slug accepts a product id or the exact product name. An existing row for the same product and
            retailer is replaced.
          </p>
          <textarea
            style={{ ...input, width: "100%", minHeight: 140, fontFamily: "ui-monospace, monospace" }}
            placeholder={"product_slug,retailer_slug,product_url,price\nBeauty of Joseon Relief Sun,amazon,https://www.amazon.com/dp/XXXX,18.00"}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
          <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
            <button style={{ ...button, opacity: importing || !csv.trim() ? 0.5 : 1 }} disabled={importing || !csv.trim()} onClick={runImport}>
              {importing ? "Importing…" : "Import"}
            </button>
            <label style={{ fontSize: 12, color: MUTED }}>
              or pick a .csv{" "}
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setCsv(await f.text());
                }}
              />
            </label>
          </div>
          {log.length > 0 && (
            <pre style={{ marginTop: 12, fontSize: 11, whiteSpace: "pre-wrap", color: ESPRESSO }}>{log.join("\n")}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
