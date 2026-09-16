# Clinic detail Info / Tea tabs

## Changes
- Keep the sticky controls, clinic identity, social links, skin-type line, gated stats, fixed action bar, inquiry sheet, and all tracking behavior shared across both tabs.
- Replace the current photo presentation with an Outside / Interior / Results / Staff gallery. Each category keeps the existing source and permission rules, resets to its first photo when selected, and falls back through the existing marked category image or placeholder.
- Add equal-width Info and Tea tabs with local state, defaulting to Info.
- Reorder the existing Info sections exactly as requested and keep their existing data gates and empty states.
- Reorder the Tea sections exactly as requested. Move the skin-type review filter into The tea, pass filtered reviews to the carousel, and keep the review form under the section that opened it.
- Add permission-gated parking photos inside Parking without adding Parking to the top gallery.
- Remove the named block headings, duplicate What people say UI, Video section, old four photo text sections, video state/component/query, and unused imports/state.

## Validation
- Run the TypeScript check.
- Open a clinic page and verify both tabs, gallery category switching, empty/fallback photo behavior, section order, and preserved fixed controls.
- Confirm only `src/routes/clinics/$id.tsx` changed.
