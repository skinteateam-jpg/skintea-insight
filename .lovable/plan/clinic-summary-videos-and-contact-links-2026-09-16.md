# Clinic summary, videos, and contact links

## Changes
- Extend clinic intent types for video plays, YouTube, contact links, and clinic posts without changing existing logging behavior.
- Update the clinic data load to include YouTube social links and active clinic videos, preserving every existing fetch and gate.
- Replace the conditional stats strip with an always-visible Recommend / Tea / Trust summary, using only Skintea reviews and sourced clinic values.
- Move social links from the clinic name area into a new Contact and links section with tracked website, social, phone, and map rows.
- Restore clinic videos with creator/visitor and official tabs, six-item expansion, disclosure labels, and in-page TikTok/Instagram playback with fallback links.
- Build the first twelve Info sections as a stable data-first list in the requested base order; keep Contact and links second-to-last and the owner link last. Leave the Tea tab and all existing sections intact.

## Technical details
- Reuse the established TikTok embed script pattern and Instagram's official embed URL inside one closeable lightbox; detect failed embeds and show the caption plus tracked source link.
- Preserve all current provenance checks, photo behavior, booking/contact gating, existing intent and lead calls, and fixed controls.
- Modify only `src/routes/clinics/$id.tsx` and `src/lib/clinicIntent.ts`.

## Validation
- Run `bunx tsgo --noEmit`.
- In the preview, check Jubilee Aesthetics and a sparse clinic across Info and Tea, including summary cells, sorted Info sections, both video tabs, playback/fallback, Contact and links, and console errors.
- Confirm the final changed-file set contains only the two requested source files.
