import { createFileRoute, Link } from "@tanstack/react-router";
import AppFrame from "@/components/AppFrame";

export const Route = createFileRoute("/disclosure")({
  component: DisclosurePage,
  head: () => ({
    meta: [
      { title: "Affiliate disclosure — Skintea" },
      {
        name: "description",
        content:
          "How Skintea earns money from shop links, and why a commission never changes a product's score, ranking or review.",
      },
      { property: "og:title", content: "Affiliate disclosure — Skintea" },
      {
        property: "og:description",
        content:
          "How Skintea earns money from shop links, and why a commission never changes a product's score, ranking or review.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function DisclosurePage() {
  return (
    <AppFrame fluid>
      <main className="min-h-screen bg-brand-cream text-brand-espresso">
        <div className="p-4 border-b border-brand-border">
          <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-brand-crimson">Disclosure</div>
          <h1 className="text-[20px] font-semibold mt-1">Affiliate disclosure</h1>
        </div>

        <div className="p-4 space-y-3 text-[12.5px] leading-[1.65]">
          <p>
            Skintea may earn a commission when you buy a product after using one of our shop buttons. That commission
            comes from the retailer, never from you: the price you pay is the same either way.
          </p>
          <p>
            A commission never affects our ratings. Scores, rankings and the opinions we show come from real reviews and
            posts, and no retailer or brand can pay to change them, to be placed higher, or to appear at all.
          </p>
          <p>
            Shop buttons are sorted by price, cheapest first — never by how much we would earn. We only show a retailer
            that actually carries the brand, and we show its price when we know it.
          </p>
          <p>
            Prices and stock change often. Always check the retailer's own page before you buy.
          </p>
          <p className="pt-2">
            <Link to="/" className="text-brand-crimson no-underline font-semibold">
              Back to Skintea
            </Link>
          </p>
        </div>
      </main>
    </AppFrame>
  );
}
