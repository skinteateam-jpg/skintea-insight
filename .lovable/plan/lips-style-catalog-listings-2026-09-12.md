# LIPS-style catalog listings

## Build
- Preserve the shared header, search, and category navigation in both catalog routes.
- Rebuild `/products` with one real Soaring rail followed by progressively loaded category sections containing three ranked products and matching subcategory thumbnails.
- Rebuild `/category/$slug` with plain-text subcategory tabs, a Soaring rail, a 30-item three-column TikTok ranking grid, the existing recommended rail, and popular brands.
- Keep honest empty states, existing save/sign-in behavior, and real RPC-backed product fields only.

## Technical details
- Launch all category TikTok RPC requests together, then update each category as its request settles so slow categories do not block faster ones.
- Use each category's existing 20 ranked rows to select subcategory thumbnails; show a neutral placeholder when none match.
- Format card rank labels through the existing numeric `ProductCard` rank API, with two-digit display added locally in these routes only if supported by the shared card.
- Run the TypeScript typecheck after changing only the two requested route files.
