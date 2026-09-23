# Rebuild the Home tab

## Goal
Replace the current Home tab with a mobile-first, data-honest experience that adapts to signed-out visitors and signed-in members while preserving Skintea’s established visual system.

## Home experience

### Shared shell
- Keep the Skintea logo treatment, warm-white canvas, Espresso/Crimson palette, hairline borders, DM Sans body, and italic Playfair character names.
- Update the tab labels and order to: Home, Products, Tea, Clinics, Profile on mobile and desktop.
- Keep all browsing public. Save, post, and profile actions require sign-in; liking remains available without an account.

### Signed-out state
Build the requested sections in order:
1. Editorial headline and subline.
2. Five real skin-character cards. Save the selected skin type locally and update relevant product sections immediately.
3. Trust strip using the live tagged-sentiment count and distinct platform count; hide it if the count is unavailable or zero.
4. “The numbers” using only products meeting the existing 10-tag minimum for every displayed skin-type percentage; hide when none qualify.
5. “More for {skin type}” using qualifying products for the selected skin type; show a clear empty state when the selection has no matches.
6. Concern grid from `concerns`, with product counts limited to high/medium confidence and treatment counts shown independently, including honest zeroes.
7. Treatment bridge based on the concern with the most mapped treatments, showing up to two real treatments and real review counts only when present.
8. Brand rail from live catalog brands and a full-catalog link with the real active-product count.
9. Up to two latest sourced review cards with verbatim quotes, real sentiment/source/product attribution, and source links.
10. Espresso Tea Layer block with the supplied three-part structure and CTA.
11. Koreatown clinic rail with treatments, distance when present, and recommendation data only above the existing minimum; otherwise “Not enough data yet.”
12. Fit Summary quiz CTA at the bottom.

### Signed-in state
- Replace the signed-out top with the member’s real first name, profile skin type, and matching character.
- Show the latest persisted quiz result as “Your fit summary,” recomputing fit/avoid counts with the same 10-tag rule and showing its real completion date. If none exists, show the quiz prompt.
- Derive “New since you were here” only from dated tagged-review changes since that member’s prior Home visit, including floor crossings and actual percentage/minority changes. Hide when no qualifying change exists.
- Show saved products from `saved_products`, including the real total; hide when empty.
- Continue with the shared concern-through-clinic sections. Replace Tea Layer marketing copy with the real count of treatment/surgery stories created during the current week; omit the count if zero.
- Do not show the Fit Summary CTA to members who already have a persisted quiz result.

## Concern pages
- Add a public `/concern/:slug` page for each active concern.
- List mapped active products and treatments in separate, clearly counted groups.
- Apply high/medium confidence to product mappings and preserve zero-result groups instead of substituting unrelated items.
- Add route-specific title, description, Open Graph, and Twitter metadata, plus honest loading/error/not-found states.

## Data and account rules
- Do not recreate `concerns`, `product_concerns`, or `treatment_concerns`.
- Add read-only Home/concern data functions that return compact, pre-aggregated data rather than downloading raw review tables into the page.
- Associate a completed quiz with the member after account creation using the existing lead/quiz records, then expose only that member’s latest result through an authenticated function. Existing local quiz results remain usable during the signup handoff.
- Gate account creation behind quiz completion: direct signup attempts return to the quiz, while existing members can still sign in normally.
- Record each signed-in member’s prior Home visit locally by user ID. Historical comparison uses dated review rows, so “New since you were here” remains factual without inventing an activity log.
- Extend surgery likes to support an anonymous browser voter identity through a narrowly scoped database function while retaining authenticated likes and accurate counts. No anonymous user/profile data is created.
- Audit existing save, post, and profile entry points so signed-out users are sent to sign-in, without restricting public reading.

## Technical details
- Use a public server function for shared Home and concern reads, and authenticated server functions for saved items and persisted quiz data.
- Reuse `MIN_TAGGED`, `aggregate`, and `opinionShares`; no client-side alternate percentage formula.
- Add the minimum database migration needed for quiz-result claiming and anonymous surgery likes, with explicit grants, RLS-safe functions, and no changes to the three concern tables.
- Keep product, clinic, and treatment detail route files untouched.
- Add accessible scroll rails, stable card dimensions, keyboard-visible controls, reduced-motion-safe transitions, and mobile-safe text wrapping.

## Validation
- Verify signed-out Home at 390px and desktop width, including skin selection persistence and every honest empty/hidden state.
- Verify signed-in Home with a real session, persisted quiz result, saved products, and prior-visit comparison.
- Verify concern pages with both populated and zero-sided mappings.
- Verify anonymous liking, signed-out save/post/profile gates, and quiz-before-signup flow end to end.
- Check console, failed network requests, route metadata, TypeScript, and the production build.

## Assumptions
- “Latest tea” uses `quote` when present, otherwise `content`, preserving the stored text; clipping occurs only at sentence boundaries and adds an ellipsis.
- The clinic minimum is 5 review rows for an aggregate calculated from `clinic_reviews`; an existing `clinic_skin_scores` percentage may be shown when it already represents a measured aggregate.
- “This week” means the current UTC calendar week.
- Because no durable last-visit/change-history table exists, the signed-in “New since you were here” baseline is stored per user in that browser and compared against timestamped source rows. It is hidden on the first visit.
