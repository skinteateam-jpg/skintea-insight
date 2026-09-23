import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Stethoscope } from "lucide-react";
import AppFrame from "@/components/AppFrame";
import BottomNav from "@/components/BottomNav";
import ProductCard from "@/components/ProductCard";
import { getConcernData } from "@/lib/home.functions";

export const Route = createFileRoute("/concerns/$slug")({
  loader: ({ params }) => getConcernData({ data: { slug: params.slug } }),
  component: ConcernPage,
  errorComponent: () => <div className="grid min-h-screen place-items-center bg-background px-6 text-center text-foreground">This concern could not be loaded.</div>,
  notFoundComponent: () => <div className="grid min-h-screen place-items-center bg-background px-6 text-center text-foreground">This concern is not available.</div>,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — Skintea` },
      { name: "description", content: "Products and treatments connected to this concern, based on sourced Skintea data." },
      { property: "og:title", content: `${params.slug.replace(/-/g, " ")} — Skintea` },
      { property: "og:description", content: "Products and treatments connected to this concern, based on sourced Skintea data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ConcernPage() {
  const data = Route.useLoaderData();
  if (!data) return <div className="grid min-h-screen place-items-center bg-background px-6 text-center text-foreground">This concern is not available.</div>;

  return (
    <AppFrame fluid>
      <main className="min-h-screen bg-background pb-24 text-foreground">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
          <Link to="/" className="mb-8 inline-flex items-center gap-1 text-sm font-bold text-brand-crimson no-underline">
            <ChevronLeft size={16} /> Home
          </Link>
          <p className="text-xs font-bold uppercase text-brand-crimson">What are you dealing with</p>
          <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">{data.concern.label}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-muted">Only sourced high- and medium-confidence product matches are shown. Treatment links use the recorded concern mapping.</p>

          <section className="mt-12">
            <div className="mb-5 flex items-end justify-between border-b border-brand-border pb-3">
              <h2 className="text-xl font-extrabold">Products</h2>
              <span className="text-sm text-brand-muted">{data.products.length}</span>
            </div>
            {data.products.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {data.products.map((product: any) => <ProductCard key={product.id} id={product.id} brand={product.brand ?? ""} name={product.name} price={product.price} currency={product.currency} imageUrl={product.image_url} />)}
              </div>
            ) : <p className="border-b border-brand-border py-8 text-sm text-brand-muted">0 products are currently mapped to this concern.</p>}
          </section>

          <section className="mt-12">
            <div className="mb-5 flex items-end justify-between border-b border-brand-border pb-3">
              <h2 className="text-xl font-extrabold">Treatments</h2>
              <span className="text-sm text-brand-muted">{data.treatments.length}</span>
            </div>
            {data.treatments.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {data.treatments.map((treatment: any) => (
                  <Link key={treatment.id} to="/treatments/$slug" params={{ slug: treatment.slug }} className="flex items-start gap-4 rounded-md border border-brand-border bg-card p-5 text-foreground no-underline">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary"><Stethoscope size={18} /></span>
                    <span><strong className="block text-base">{treatment.name}</strong>{treatment.subtitle && <span className="mt-1 block text-sm leading-5 text-brand-muted">{treatment.subtitle}</span>}</span>
                  </Link>
                ))}
              </div>
            ) : <p className="border-b border-brand-border py-8 text-sm text-brand-muted">No treatments are currently mapped to this concern.</p>}
          </section>
        </div>
        <BottomNav />
      </main>
    </AppFrame>
  );
}