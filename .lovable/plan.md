# Category landing page and slider rails

## Build
- Create `/category/$slug` with the existing Skintea catalog header/search, category navigation, and route-specific metadata.
- Load real subcategories, all three ranking rails, and popular-brand facets from the existing RPCs only.
- Keep the selected subcategory in local page state and refresh every rail and brand list when it changes.
- Render all rails as fixed 128px snap-scrolling cards at every screen size, with loading skeletons and honest empty states.
- Preserve product save behavior by using the shared product card and the same sign-in prompt used on `/products`.

## Update `/products`
- Point category tabs to `/category/$slug`, while keeping All on `/products`.
- Raise each ranking request to 20 products.
- Convert both loaded and skeleton rails to fixed 128px horizontal sliders on all screen sizes.
- Leave the existing subcategory sections unchanged.

## Technical details
- Use TanStack dynamic navigation with `to="/category/$slug"` and `params={{ slug }}`.
- Use only `distinct_product_subcategories`, `ranked_products_tiktok`, `ranked_products_soaring`, `ranked_products_recommended`, and `browse_facets`; no database or RPC changes.
- Keep brand and “See all” links typed through `/browse` search parameters.
- Run the project typecheck after both scoped file changes.
