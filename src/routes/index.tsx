import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, LockKeyhole, MapPin, Sparkles } from "lucide-react";
import AppFrame from "@/components/AppFrame";
import BottomNav from "@/components/BottomNav";
import { ClinicImage } from "@/components/ClinicImage";
import { displayImages } from "@/lib/clinicPhotos";
import { CATEGORY_LABEL_TO_SLUG } from "@/lib/categorySlugs";
import ProductCard, { formatCompact } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getHomeData } from "@/lib/home.functions";
import { MIN_TAGGED } from "@/lib/opinionAggregate";
import { getLeadSessionId } from "@/lib/leadSession";
import { claimQuizResult, getHomeAccountData } from "@/lib/account.functions";

export const Route = createFileRoute("/")({
  loader: () => getHomeData(),
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Skintea — What actually happened to skin like yours" },
      { name: "description", content: "Real opinions from TikTok, Reddit and Instagram, sorted by skin type. Negatives left in." },
      { property: "og:title", content: "Skintea — What actually happened to skin like yours" },
      { property: "og:description", content: "Real opinions from TikTok, Reddit and Instagram, sorted by skin type. Negatives left in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const PEOPLE = [
  { skin: "oily", name: "The Butter Girl", type: "Oily" },
  { skin: "dry", name: "The Peach", type: "Dry" },
  { skin: "combination", name: "The Everything Bagel", type: "Combination" },
  { skin: "sensitive", name: "The Glass of Milk", type: "Sensitive" },
  { skin: "normal", name: "The Cracker", type: "Normal" },
] as const;
type Skin = (typeof PEOPLE)[number]["skin"];

// Restored from the pre-2026-09-23 Home (Chi, 2026-10-01: keep the new Home, restore the removed sections).
// Every pill is a real destination.
const CATEGORY_LINKS = [
  { label: "All", to: "/" },
  { label: "Products", to: "/products" },
  { label: "Treatments", to: "/treatments" },
  { label: "Surgery", to: "/surgery-talk" },
  { label: "Clinics", to: "/clinics" },
] as const;

// Only labels that resolve to a real product_categories slug appear.
const CATEGORY_CHIPS = ["Skincare", "Suncare", "Base Makeup", "Eye Makeup", "Lip", "Cheek & Contour", "Body", "Device", "Fragrance", "Goods"]
  .map((label) => ({ label, slug: CATEGORY_LABEL_TO_SLUG[label.toLowerCase()] as string | undefined }))
  .filter((chip): chip is { label: string; slug: string } => Boolean(chip.slug));
type AccountData = Awaited<ReturnType<typeof getHomeAccountData>>;

function readSkin(): Skin {
  try {
    const stored = localStorage.getItem("skintea.homeSkin");
    if (PEOPLE.some((person) => person.skin === stored)) return stored as Skin;
  } catch { /* storage can be unavailable */ }
  return "combination";
}

function HomePage() {
  const home = Route.useLoaderData();
  const [selectedSkin, setSelectedSkin] = useState<Skin>("combination");
  const [account, setAccount] = useState<AccountData | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const claimQuiz = useServerFn(claimQuizResult);

  useEffect(() => setSelectedSkin(readSkin()), []);
  useEffect(() => {
    const profileSkin = account?.profile?.skin_type;
    if (profileSkin && PEOPLE.some((person) => person.skin === profileSkin)) setSelectedSkin(profileSkin as Skin);
  }, [account?.profile?.skin_type]);
  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        try {
          const stored = localStorage.getItem("skintea.quizResult");
          if (stored) {
            const parsed = JSON.parse(stored) as { shareSlug?: string };
            // The claim needs the quiz-taking browser session, not only the public share slug.
            const sessionId = getLeadSessionId();
            if (parsed.shareSlug && sessionId) await claimQuiz({ data: { shareSlug: parsed.shareSlug, sessionId } });
          }
          const result = await getHomeAccountData();
          if (!cancelled) setAccount(result);
        } catch (error) {
          console.error("Home account data failed", error);
        }
      }
      if (!cancelled) setSessionChecked(true);
    });
    return () => { cancelled = true; };
  }, []);

  const chooseSkin = (skin: Skin) => {
    setSelectedSkin(skin);
    try { localStorage.setItem("skintea.homeSkin", skin); } catch { /* keep the in-memory selection */ }
  };

  const userSkin = (account?.profile?.skin_type && PEOPLE.some((person) => person.skin === account.profile?.skin_type))
    ? account.profile.skin_type as Skin
    : selectedSkin;
  const activePerson = PEOPLE.find((person) => person.skin === userSkin) ?? PEOPLE[2];
  const selectedStats = home.productStats.filter((product) => product.skin[selectedSkin]).sort((a, b) => b.skin[selectedSkin].pct - a.skin[selectedSkin].pct || b.skin[selectedSkin].n - a.skin[selectedSkin].n);
  const headlineProduct = [...home.productStats].sort((a, b) => Object.keys(b.skin).length - Object.keys(a.skin).length || Math.max(...Object.values(b.skin).map((v) => v.n)) - Math.max(...Object.values(a.skin).map((v) => v.n)))[0];

  return (
    <AppFrame fluid>
      <div className="min-h-screen bg-background pb-24 text-foreground">
        <header className="border-b border-brand-border bg-background px-4 py-4 md:px-8">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <Link to="/" className="font-display text-2xl font-bold italic text-brand-espresso no-underline">Skin<span className="text-brand-crimson">tea</span></Link>
            <Link to={account ? "/skin-profile" : "/login"} className="text-xs font-bold text-brand-crimson no-underline">{account ? "Profile" : "Sign in"}</Link>
          </div>
        </header>

        <nav aria-label="Sections" className="no-scrollbar overflow-x-auto px-4 py-3 md:px-8">
          <div className="mx-auto flex max-w-6xl gap-2">
            {CATEGORY_LINKS.map((item, i) => <Link key={item.label} to={item.to} className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold no-underline ${i === 0 ? "bg-brand-espresso text-primary-foreground" : "border border-brand-border bg-card text-foreground"}`}>{item.label}</Link>)}
          </div>
        </nav>

        <main>
          {sessionChecked && account ? (
            <LoggedInTop account={account} home={home} person={activePerson} selectedSkin={selectedSkin} chooseSkin={chooseSkin} selectedStats={selectedStats} />
          ) : (
            <LoggedOutTop home={home} selectedSkin={selectedSkin} chooseSkin={chooseSkin} headlineProduct={headlineProduct} selectedStats={selectedStats} />
          )}

          <div className="mx-auto max-w-6xl">
            <NewOnSkintea products={home.newProducts} />
            <BrowseByCategory />
            <Concerns concerns={home.concerns} />
            <TreatmentSpotlight />
            <TreatmentBridge bridge={home.bridge} />
            <Brands brands={home.brands} total={home.activeProductCount} />
            <LatestTea items={home.latestTea} />
            <TeaLayer signedIn={Boolean(account)} weeklyCount={home.weeklyStoryCount} />
            <Clinics clinics={home.clinics} />
            <ClinicsOnSkintea clinics={home.listedClinics} />
            <SampleKit />
            {!account && <FitSummary />}
          </div>
        </main>
        <BottomNav />
      </div>
    </AppFrame>
  );
}

function LoggedOutTop({ home, selectedSkin, chooseSkin, headlineProduct, selectedStats }: any) {
  return <>
    <section className="mx-auto max-w-6xl px-4 pb-8 pt-10 md:px-8 md:pt-16">
      <p className="text-xs font-extrabold uppercase text-brand-crimson">Skintea, without the spin</p>
      <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[1.08] md:text-6xl">Find out what actually happened to skin like yours.</h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-brand-muted">Real opinions pulled from TikTok, Reddit and Instagram, sorted by skin type. Negatives left in.</p>
    </section>
    <section className="border-y border-brand-border bg-card py-6">
      <SkinSelector selectedSkin={selectedSkin} chooseSkin={chooseSkin} />
    </section>
    {home.trust && home.trust.taggedCount > 0
      ? <div className="border-b border-brand-border"><div className="mx-auto grid max-w-6xl grid-cols-3 px-4 md:px-8"><TrustCell value={formatCompact(home.trust.taggedCount)} label="Tagged opinions" /><TrustCell value={String(home.trust.platformCount)} label="Platforms" /><TrustCell value="No" label="Paid ranking" /></div></div>
      : <div className="border-b border-brand-border"><p className="mx-auto max-w-6xl px-4 py-5 text-xs text-brand-muted md:px-8">Tagged opinions: not counted yet.</p></div>}
    <Numbers product={headlineProduct} />
    <SkinRail skin={selectedSkin} products={selectedStats} />
  </>;
}

function LoggedInTop({ account, home, person, selectedSkin, chooseSkin, selectedStats }: { account: AccountData; home: any; person: (typeof PEOPLE)[number]; selectedSkin: Skin; chooseSkin: (skin: Skin) => void; selectedStats: any[] }) {
  const firstName = account.profile?.name?.trim().split(/\s+/)[0] || "there";
  const skin = person.skin;
  const fits = home.productStats.filter((product: any) => (product.skin[skin]?.pct ?? -1) >= 50);
  const avoids = home.productStats.filter((product: any) => (product.skin[skin]?.pct ?? 101) < 50);
  const [changes, setChanges] = useState<Array<{ product: any; count: number }>>([]);

  useEffect(() => {
    const key = `skintea.homeLastVisit.${account.userId}`;
    const previous = localStorage.getItem(key);
    if (previous) {
      const counts = new Map<string, number>();
      for (const row of home.datedReviews) if (row.at > previous) counts.set(row.productId, (counts.get(row.productId) ?? 0) + 1);
      setChanges([...counts].map(([id, count]) => ({ product: home.productStats.find((p: any) => p.id === id), count })).filter((row) => row.product).sort((a, b) => b.count - a.count).slice(0, 3));
    }
    localStorage.setItem(key, new Date().toISOString());
  }, [account.userId]);

  return <>
    <section className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
      <p className="text-sm font-bold text-brand-crimson">Welcome back, {firstName}</p>
      <h1 className="mt-2 font-display text-4xl font-bold italic">{person.name}</h1>
      <p className="mt-1 text-xs font-extrabold uppercase text-brand-muted">{person.type} skin</p>
      {account.quiz ? <div className="mt-8 max-w-2xl rounded-md border border-brand-border bg-card p-5">
        <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Your fit summary</h2><Sparkles size={18} className="text-brand-crimson" /></div>
        <div className="mt-5 grid grid-cols-2 divide-x divide-brand-border border-y border-brand-border py-4"><div><strong className="text-3xl">{fits.length}</strong><span className="block text-xs text-brand-muted">recommended for {person.type.toLowerCase()} skin</span></div><div className="pl-5"><strong className="text-3xl">{avoids.length}</strong><span className="block text-xs text-brand-muted">not recommended for {person.type.toLowerCase()} skin</span></div></div>
        <p className="mt-3 text-xs text-brand-muted">Based on your skin type and every tagged opinion we have today.</p>
        <div className="mt-4 flex items-center justify-between gap-3 text-xs"><span className="text-brand-muted">Skin type from your quiz on {new Date(account.quiz.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span><Link to="/quiz-result" className="font-bold text-brand-crimson no-underline">Open your full summary</Link></div>
      </div> : <div className="mt-8 max-w-2xl rounded-md border border-brand-border bg-card p-5"><h2 className="text-lg font-extrabold">Your fit summary starts with the skin quiz.</h2><Button asChild className="mt-4 rounded-full"><Link to="/quiz">Take the quiz</Link></Button></div>}
    </section>
    <section className="border-y border-brand-border bg-card py-6"><SkinSelector selectedSkin={selectedSkin} chooseSkin={chooseSkin} /></section>
    <SkinRail skin={selectedSkin} products={selectedStats} />
    {changes.length > 0 && <section className="mx-auto max-w-6xl px-4 pb-10 md:px-8"><SectionTitle>New since you were here</SectionTitle><div className="divide-y divide-brand-border border-y border-brand-border">{changes.map(({ product, count }) => <Link key={product.id} to="/product-detail/$id" params={{ id: product.id }} className="flex items-center gap-3 py-3 text-foreground no-underline">{product.image_url ? <img src={product.image_url} alt="" className="h-12 w-12 rounded-md object-contain" /> : <span className="grid h-12 w-12 place-items-center rounded-md bg-secondary">{product.brand?.charAt(0)}</span>}<span className="min-w-0"><strong className="block truncate text-sm">{product.name}</strong><span className="text-xs text-brand-muted">{count} new tagged {count === 1 ? "opinion" : "opinions"}</span></span></Link>)}</div></section>}
    {account.savedProducts.length > 0 && <ProductRail title="Saved" products={account.savedProducts} footer={`${account.savedProducts.length} saved`} />}
  </>;
}

function SkinSelector({ selectedSkin, chooseSkin }: { selectedSkin: Skin; chooseSkin: (skin: Skin) => void }) { return <div className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 md:px-8">{PEOPLE.map((person) => { const active = person.skin === selectedSkin; return <Button key={person.skin} variant="outline" onClick={() => chooseSkin(person.skin)} className={`h-auto min-w-36 shrink-0 justify-start rounded-md px-4 py-3 ${active ? "border-brand-crimson bg-brand-crimson text-primary-foreground hover:bg-brand-crimson hover:text-primary-foreground" : "bg-card"}`}><span className="text-left"><span className="block font-display text-sm font-bold italic">{person.name}</span><span className="mt-1 block text-[9px] font-extrabold uppercase">{person.type}</span></span></Button>; })}</div>; }

function TrustCell({ value, label }: { value: string; label: string }) { return <div className="border-r border-brand-border px-3 py-5 text-center last:border-0"><strong className="block text-xl">{value}</strong><span className="mt-1 block text-[10px] font-bold uppercase text-brand-muted">{label}</span></div>; }
function SectionTitle({ children, eyebrow }: { children: React.ReactNode; eyebrow?: string }) { return <div className="mb-5">{eyebrow && <p className="mb-1 text-[10px] font-extrabold uppercase text-brand-crimson">{eyebrow}</p>}<h2 className="text-xl font-extrabold md:text-2xl">{children}</h2></div>; }

function EmptyNote({ children }: { children: React.ReactNode }) { return <p className="rounded-md border border-dashed border-brand-border bg-card p-5 text-sm text-brand-muted">{children}</p>; }

function SkinRail({ skin, products }: { skin: Skin; products: any[] }) {
  const type = PEOPLE.find((person) => person.skin === skin)?.type ?? skin;
  if (products.length > 0) return <ProductRail title={`More for ${type} skin`} products={products} skin={skin} />;
  return <section className="mx-auto max-w-6xl px-4 py-10 md:px-8"><SectionTitle>{`More for ${type} skin`}</SectionTitle><EmptyNote>No product has {MIN_TAGGED} tagged opinions from {type.toLowerCase()} skin yet.</EmptyNote></section>;
}

function Numbers({ product }: { product: any }) {
  // The product is the one with the widest skin-type coverage; the heading says that, not a disagreement it never measured.
  if (!product) return <section className="mx-auto max-w-6xl px-4 py-10 md:px-8"><SectionTitle eyebrow="The numbers">How each skin type rated it</SectionTitle><EmptyNote>No product has enough tagged opinions per skin type yet.</EmptyNote></section>;
  const total = Object.values(product.skin).reduce((sum: number, value: any) => sum + value.n, 0);
  return <section className="mx-auto max-w-6xl px-4 py-10 md:px-8"><SectionTitle eyebrow="The numbers">How each skin type rated it</SectionTitle><div className="max-w-2xl rounded-md border border-brand-border bg-card p-5"><p className="text-[10px] font-bold uppercase text-brand-muted">{product.brand}</p><h3 className="mt-1 text-lg font-extrabold">{product.name}</h3><p className="mt-1 text-xs text-brand-muted">{total} tagged opinions across qualifying skin types</p><div className="mt-5 space-y-3">{PEOPLE.map((person) => product.skin[person.skin] ? <div key={person.skin} className="grid grid-cols-[86px_1fr_42px] items-center gap-3 text-xs"><span>{person.type}</span><span className="h-2 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-brand-crimson" style={{ width: `${product.skin[person.skin].pct}%` }} /></span><strong>{product.skin[person.skin].pct}%</strong></div> : null)}</div><Link to="/product-detail/$id" params={{ id: product.id }} className="mt-6 flex items-center justify-between border-t border-brand-border pt-4 text-sm font-bold text-brand-crimson no-underline"><span>Read the minority report</span><ArrowRight size={16} /></Link></div></section>;
}

function ProductRail({ title, products, skin, footer }: { title: string; products: any[]; skin?: string; footer?: string }) { return <section className="mx-auto max-w-6xl px-4 py-10 md:px-8"><div className="flex items-end justify-between"><SectionTitle>{title}</SectionTitle>{footer && <Link to="/skin-profile" className="mb-5 text-xs font-bold text-brand-crimson no-underline">{footer}</Link>}</div><div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">{products.slice(0, 12).map((product) => <div key={product.id} className="w-40 shrink-0 md:w-48"><ProductCard id={product.id} brand={product.brand ?? ""} name={product.name} price={null} imageUrl={product.image_url} metricLabel={skin && product.skin?.[skin] ? `${product.skin[skin].n} tagged opinions` : undefined} recommendPct={skin ? product.skin?.[skin]?.pct : null} decisiveTags={skin ? product.skin?.[skin]?.n : null} /></div>)}</div></section>; }

function Concerns({ concerns }: { concerns: any[] }) { return <section className="px-4 py-10 md:px-8"><SectionTitle>What are you dealing with</SectionTitle><div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">{concerns.map((concern) => <Link key={concern.id} to="/concerns/$slug" params={{ slug: concern.slug }} className="min-h-32 rounded-md border border-brand-border bg-card p-4 text-foreground no-underline transition-colors hover:border-brand-crimson"><h3 className="font-extrabold leading-5">{concern.label}</h3><div className="mt-5 space-y-1 text-xs text-brand-muted"><p>{concern.productCount} {concern.productCount === 1 ? "product" : "products"}</p><p>{concern.treatmentCount} {concern.treatmentCount === 1 ? "treatment" : "treatments"}</p></div></Link>)}</div></section>; }

function TreatmentBridge({ bridge }: { bridge: any }) {
  if (!bridge || bridge.treatments.length === 0) return <section className="mx-4 mb-10 rounded-md bg-brand-espresso p-6 text-primary-foreground md:mx-8"><h2 className="max-w-xl text-2xl font-extrabold">Skincare gets you only so far. Here's what people did next.</h2><p className="mt-3 text-sm opacity-80">No concern is linked to a treatment yet.</p></section>;
  const first = bridge.treatments[0]; return <section className="mx-4 mb-10 rounded-md bg-brand-espresso p-6 text-primary-foreground md:mx-8"><p className="text-[10px] font-extrabold uppercase text-brand-crimson">{bridge.concern.label}</p><h2 className="mt-2 max-w-xl text-2xl font-extrabold">Skincare gets you only so far. Here's what people did next.</h2><div className="mt-5 divide-y divide-primary-foreground/20 border-y border-primary-foreground/20">{bridge.treatments.map((treatment: any) => <Link key={treatment.id} to="/treatments/$slug" params={{ slug: treatment.slug }} className="flex items-center justify-between py-4 text-primary-foreground no-underline"><strong>{treatment.name}</strong>{treatment.reviewCount > 0 && <span className="text-xs opacity-70">{treatment.reviewCount} reviews</span>}</Link>)}</div><Link to="/treatments/$slug" params={{ slug: first.slug }} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary-foreground underline underline-offset-4">See what actually happened, including the regrets <ArrowRight size={15} /></Link></section>; }

function Brands({ brands, total }: { brands: any[]; total: number }) { if (!brands.length) return <section className="px-4 py-10 md:px-8"><SectionTitle>Or by brand</SectionTitle><EmptyNote>Brands are not listed yet.</EmptyNote></section>; return <section className="px-4 py-10 md:px-8"><div className="flex items-end justify-between"><SectionTitle>Or by brand</SectionTitle><Link to="/products" className="mb-5 text-xs font-bold text-brand-crimson no-underline">All {formatCompact(total)} products</Link></div><div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">{brands.map((brand) => <Link key={brand.name} to="/products" search={{ q: brand.name } as any} className="shrink-0 rounded-full border border-brand-border bg-card px-4 py-2 text-sm font-bold text-foreground no-underline">{brand.name}</Link>)}</div></section>; }

function LatestTea({ items }: { items: any[] }) { if (!items.length) return <section className="px-4 py-10 md:px-8"><SectionTitle>Latest tea</SectionTitle><EmptyNote>No tagged opinions yet.</EmptyNote></section>; return <section className="px-4 py-10 md:px-8"><SectionTitle>Latest tea</SectionTitle><div className="grid gap-3 md:grid-cols-2">{items.map((item) => <article key={item.id} className="rounded-md border border-brand-border bg-card p-5"><div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase"><span>{item.source}</span><span className="text-brand-crimson">{item.sentiment}</span></div><blockquote className="my-5 text-sm leading-6">“{item.quote}”</blockquote>{item.product && <Link to="/product-detail/$id" params={{ id: item.product.id }} className="block text-sm font-extrabold text-foreground no-underline">{item.product.name}</Link>}<a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs font-bold text-brand-crimson">View source</a></article>)}</div></section>; }

function TeaLayer({ signedIn, weeklyCount }: { signedIn: boolean; weeklyCount: number }) { return <section className="mx-4 my-10 rounded-md bg-brand-espresso p-7 text-primary-foreground md:mx-8"><LockKeyhole size={22} className="text-brand-crimson" /><p className="mt-4 text-[10px] font-extrabold uppercase text-brand-crimson">The tea layer</p><h2 className="mt-2 text-2xl font-extrabold">{signedIn ? (weeklyCount > 0 ? `${weeklyCount} new treatment ${weeklyCount === 1 ? "story" : "stories"} this week.` : "No new treatment stories this week.") : "Treatments and surgery, told the same way."}</h2>{signedIn && weeklyCount === 0 && <Link to="/treatment-talk" className="mt-2 inline-block text-sm font-bold text-primary-foreground underline underline-offset-4">Be the first to post one.</Link>}<div className="mt-6 grid gap-3 border-y border-primary-foreground/20 py-5 text-sm md:grid-cols-3"><span>What actually happened</span><span>What surprised them</span><span>What they wish they knew before</span></div><Button asChild className="mt-6 rounded-full bg-brand-crimson text-primary-foreground hover:bg-brand-crimson/90"><Link to="/tea">See what's inside</Link></Button></section>; }

function Clinics({ clinics }: { clinics: any[] }) { return <section className="px-4 py-10 md:px-8"><div className="flex items-center gap-2"><MapPin size={19} className="text-brand-crimson" /><h2 className="text-xl font-extrabold">In Koreatown</h2></div><p className="mt-2 text-xs text-brand-muted">Ordered by Skintea reviews once a clinic has {MIN_TAGGED}; until then by the number of treatments it lists. Clinics can't pay for position.</p>{clinics.length === 0 && <div className="mt-5"><EmptyNote>No Koreatown clinic is listed yet.</EmptyNote></div>}<div className="mt-5 grid gap-3 md:grid-cols-3">{clinics.map((clinic) => <Link key={clinic.id} to="/clinics/$id" params={{ id: clinic.id }} className="rounded-md border border-brand-border bg-card p-5 text-foreground no-underline"><h3 className="font-extrabold">{clinic.name}</h3><p className="mt-4 min-h-10 text-xs leading-5 text-brand-muted">{clinic.treatments.join(" · ") || "No treatments listed"}</p><div className="mt-4 border-t border-brand-border pt-4"><div className="flex min-h-5 items-center justify-between gap-3 text-xs"><span className="font-bold">% recommend</span><strong className={clinic.recommendPct == null ? "font-medium text-brand-muted" : "text-brand-crimson"}>{clinic.recommendPct == null ? "Not enough reviews yet" : `${clinic.recommendPct}% · ${clinic.recommendN} reviews`}</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"><span className={`block h-full rounded-full ${clinic.recommendPct == null ? "bg-brand-muted/30" : "bg-brand-crimson"}`} style={{ width: `${clinic.recommendPct ?? 0}%` }} /></div></div></Link>)}</div><Link to="/clinics" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-crimson no-underline">See all clinics in Koreatown <ArrowRight size={15} /></Link></section>; }

function NewOnSkintea({ products }: { products: any[] }) {
  return <section className="px-4 py-10 md:px-8"><div className="flex items-end justify-between"><SectionTitle>New on Skintea</SectionTitle><Link to="/products" className="mb-5 text-xs font-bold text-brand-crimson no-underline">See all</Link></div>
    {products.length === 0 ? <EmptyNote>No products added yet.</EmptyNote> : <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">{products.map((product) => <Link key={product.id} to="/product-detail/$id" params={{ id: product.id }} className="w-40 shrink-0 rounded-md border border-brand-border bg-card p-3 text-foreground no-underline"><div className="grid h-24 place-items-center overflow-hidden rounded bg-secondary">{product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-contain" /> : <span className="text-xs text-brand-muted">{product.brand?.charAt(0)}</span>}</div>{product.brand && <p className="mt-2 text-[10px] font-bold uppercase text-brand-muted">{product.brand}</p>}<p className="mt-1 text-sm font-bold leading-tight">{product.name}</p></Link>)}</div>}
  </section>;
}

function BrowseByCategory() {
  return <section className="px-4 pb-10 md:px-8"><div className="flex items-end justify-between"><SectionTitle>Browse by category</SectionTitle><Link to="/products" className="mb-5 text-xs font-bold text-brand-crimson no-underline">See all</Link></div>
    {CATEGORY_CHIPS.length === 0 ? <EmptyNote>Categories are not set up yet.</EmptyNote> : <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">{CATEGORY_CHIPS.map((chip) => <Link key={chip.slug} to="/category/$slug" params={{ slug: chip.slug }} className="shrink-0 rounded-full border border-brand-border bg-card px-4 py-2 text-xs font-semibold text-foreground no-underline">{chip.label}</Link>)}</div>}
  </section>;
}

// Links into the treatments the site has. No per-treatment figure is claimed here; the numbers live on the treatment pages.
function TreatmentSpotlight() {
  return <section className="px-4 pb-10 md:px-8"><SectionTitle>Treatment Spotlight</SectionTitle><Link to="/treatments" className="flex items-center justify-between rounded-md border border-brand-border bg-card p-5 text-sm font-bold text-brand-crimson no-underline">See all treatments <ArrowRight size={16} /></Link></section>;
}

function ClinicsOnSkintea({ clinics }: { clinics: any[] }) {
  return <section className="px-4 py-10 md:px-8"><div className="flex items-end justify-between"><SectionTitle>Clinics on Skintea</SectionTitle><Link to="/clinics" className="mb-5 text-xs font-bold text-brand-crimson no-underline">See all</Link></div>
    <p className="-mt-3 mb-4 text-xs text-brand-muted">Listed clinics, A to Z. Not sorted by distance.</p>
    {clinics.length === 0 ? <EmptyNote>No clinics listed yet.</EmptyNote> : <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">{clinics.map((clinic) => <Link key={clinic.id} to="/clinics/$id" params={{ id: clinic.id }} className="w-52 shrink-0 rounded-md border border-brand-border bg-card p-3 text-foreground no-underline"><ClinicImage images={displayImages(clinic, {}, 400)} height={80} radius={8} compact /><p className="mt-2 text-sm font-bold">{clinic.name}</p>{clinic.neighborhood && <p className="text-xs text-brand-muted">{clinic.neighborhood}</p>}<div className="mt-2 flex flex-wrap gap-1">{(clinic.best_for ?? []).slice(0, 3).map((tag: string) => <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">{tag}</span>)}</div></Link>)}</div>}
  </section>;
}

// Dormant: the Skin-Type Kit does not exist. No price, no date, no waitlist promise until it does.
function SampleKit() {
  return <section className="px-4 py-10 md:px-8"><SectionTitle>Sample Kit</SectionTitle><div className="rounded-md border border-brand-border bg-card p-5"><h3 className="text-base font-extrabold">Your Skin-Type Kit</h3><p className="mt-1 text-xs text-brand-muted">Cleanser · Toner · Serum · Moisturizer matched to your skin</p><p className="mt-4 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-brand-muted"><LockKeyhole size={13} /> Not available yet</p></div></section>;
}

function FitSummary() { return <section className="mx-4 my-10 rounded-md bg-secondary p-7 md:mx-8"><p className="text-[10px] font-extrabold uppercase text-brand-crimson">Get your Fit Summary</p><h2 className="mt-2 max-w-xl text-2xl font-extrabold">A short quiz. You get what fits, what to skip, and why.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-brand-muted">Saves to your profile so it updates as new data comes in.</p><Button asChild className="mt-6 rounded-full"><Link to="/quiz">Take the quiz</Link></Button></section>; }