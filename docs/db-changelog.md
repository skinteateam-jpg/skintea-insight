# Database changelog

Every session that changes the database appends an entry here: schema, SQL functions,
views, constraints, grants, or row deletions. Newest entries at the bottom of each day.

Each entry records **what changed**, **why**, **who** (which session or person), and, for row
deletions, **the exact session_ids (or row ids) deleted**. If you did not create a row, do not
delete it: write it down here and ask.

## Standing rules

1. Never delete rows belonging to a session you did not create.
2. Never change a `lead_*` SQL function or the `lead_funnel_daily` view from the app side.
   Report the needed change instead.

Why these exist: on 2026-09-14 two sessions independently "fixed" each other's correct
behaviour, and one session wiped rows another session was investigating.

## Entry template

```
### YYYY-MM-DD HH:MM UTC — short title
- Who: <person / session description>
- What: <schema / function / view / constraint / rows>
- Why: <reason>
- Deleted session_ids: <list, or "none">
```

---

## 2026-09-14

Backfilled at the end of the day from the task lists and DATABASE STATE notes the owner wrote,
plus what the app session observed with SELECT queries. Where a time was not recorded it says so.
Nothing below was reconstructed from memory without a source.

### (time not recorded) — lead capture tables and RPCs created
- Who: owner
- What: tables `leads`, `lead_events`, `lead_treatments` (RLS on, zero policies, all table grants
  revoked from anon and authenticated); RPCs `lead_upsert` and `lead_event_add` as the only write
  path; `consultation_clicks.lead_id` (nullable, FK to `leads`, ON DELETE SET NULL); view
  `lead_funnel_daily`; `treatments.slug` and `category` filled on all 17 rows.
- Why: lead-capture instrumentation.
- Deleted session_ids: none

### (time not recorded) — quiz_response_save
- Who: owner
- What: RPC `quiz_response_save` (calls `lead_upsert`, inserts `quiz_responses`, fires `quiz_completed`).
- Why: quiz rewrite (7-question flow).
- Deleted session_ids: none

### (time not recorded, between 07:45 and 18:26 UTC) — lead rules, constraints, fabricated data removed, test rows deleted
- Who: owner
- What:
  - `treatments.majority_pct`, `results_pct`, `minority_opinion` set to NULL on all 17 rows.
  - `lead_event_add`: `clinic_view` promotes to stage 1 only when the lead has viewed 2+ distinct
    clinics or already has a `field_set` event.
  - `leads.intent_stage_version` default changed to 2.
  - CHECK constraints on `leads`: `session_id` 16–64 chars, `zip` `^[0-9]{5}$`, `skin_type` in
    (oily, dry, combination, sensitive, normal), `email` format and length ≤ 254.
  - The older `lead_upsert` overload (without `p_treatment_ids`) no longer exists.
  - Rows deleted: all test `leads`, `lead_events`, `quiz_responses`, `consultation_clicks`.
- Why: the five non-NULL treatment percentages had 0 reviews behind them; single clinic page loads
  (crawlers) were inflating stage 1; invalid values were being stored silently.
- Deleted session_ids: not recorded by the owner. Sessions known (by SELECT) to exist shortly before:
  `1188eebf-827b-4a42-ae7a-4839b70c4f6b`, `278c9dfe-7ca0-45aa-abd5-1d1405bbe9db`,
  `dcf0cee1-6b8a-41d5-908d-de50cbd68eba`.

### 18:58 UTC — storage object deleted
- Who: another app session (Lovable agent, on request)
- What: `clinic-submissions/pending/e21416bf-b9ca-4a32-b364-3d58de0b7d6f/01-test-pixel.png` (70 bytes)
  removed through the Storage API; bucket left with 0 objects.
- Why: leftover automated test file whose database row was already deleted.
- Deleted session_ids: none (storage object only)

### shortly after 19:31 UTC (exact time not recorded) — lead-instrumentation walkthrough test rows deleted
- Who: app session (lead instrumentation pass 2)
- What: guarded delete (count-checked, clicks first) of 4 leads, 29 lead_events, 2 quiz_responses,
  2 lead_treatments, 1 consultation_click.
- Why: rows created by that session's own UI walkthrough.
- Deleted session_ids: `4acff35d-b523-46f1-87eb-ef26194693e8`, `b9427a01-ab8a-42ad-9b2f-ff1a626ca9ef`,
  `2e44cec7-307f-49eb-8024-475057282e75`, `393407ac-1567-4769-b61d-3c00399e683d`

### (time not recorded, after 19:31 and before 20:17 UTC) — 22 stage-0 leads removed
- Who: not recorded
- What: 22 stage-0 leads, each a single `clinic_view`, created 18:58–19:26 UTC by a repeated fresh-context
  page load (very likely an image-verification loop). They were present at 19:31 UTC and gone by the
  next check. This entry exists because the deletion was not logged.
- Why: not recorded
- Deleted session_ids (as observed at 19:31 UTC): `0fa7304b-ea65-4d18-bd68-646b904b698f`,
  `022907fc-6f3e-47c1-843b-ed8c3d136250`, `41325a70-9203-44f6-a637-849b1aa5a241`,
  `02647fac-ed14-4eb3-963b-ad047638f5d7`, `c5787269-8f38-4c52-8c40-ddd55b6ef9ff`,
  `7a99c86c-16b5-4701-adf5-40ddb0df809b`, `a6b50f24-e79c-4bfa-b72c-b759383352b0`,
  `64300cf1-6c76-4f2e-8b2e-f15367e8c5e3`, `e467e1d6-9e13-4534-b55a-e9bc2bb3464a`,
  `f3efbe39-46da-4a3a-8aa1-9adf633781c4`, `2325e2ab-7f34-472d-bcb5-0a6b003738ae`,
  `a0e8f3ff-6dfe-4d28-90e4-fae1fd70782b`, `d7179ab1-d6e6-48a6-a733-eea0f3bd7cc4`,
  `9b9b63c7-279f-4e1a-b1fd-41170c20581f`, `9e27e2a3-959a-45b2-8ae8-98d9c495cf27`,
  `d4e922b8-7601-4503-8900-ad10d7d97ce5`, `ae14ca34-7d71-4b9b-99ad-aebc48de257a`,
  `5e753b93-6de1-4704-a141-6621f731e6f1`, `6abf29e9-97a0-44f4-a14f-b9c06c62c49b`,
  `c3a28278-704a-4f3f-b77c-1a4221e86d95`, `621fcc6b-a7c3-4484-bd40-ee2035ceb3e2`,
  `159ebbb3-9130-402d-aec4-249b76d950d2`

### (time not recorded, before 20:17 UTC) — listing filter, treatment reviews schema, funnel view, stage rule
- Who: owner
- What:
  - `treatments`: "Laser" (slug `laser`) set `active = false` (16 active, 1 inactive).
  - `clinics.listing_filter`: 'passed' 240, 'unsure' 86, 'dropped' 135.
  - `treatment_reviews` (0 rows) gained columns `verdict` (worth_it | not_worth_it | mixed),
    `is_first_time`, `sensitive_skin`, `regret_reason` (downtime | pain | cost | sessions_needed |
    no_result | side_effect | wrong_provider | none), `age_bracket`, `cost_paid_usd`,
    `tag_confidence` (high | medium | low), `tagged_at`.
  - `lead_event_add`: a `field_set` with `field = 'user_id'` no longer qualifies a lead for stage 1.
  - `lead_funnel_daily`: added `qualified_leads` and `drive_by_sessions`. `leads_created` is a raw
    session count and is not the tracked metric.
- Why: "Laser" is a category, not a treatment; 221 of 461 clinic rows are not aesthetic clinics
  (vets, dentists, pharmacies, rehab centres, one law firm); treatments need a breakdown axis
  reviewers actually state; signed-in visitors need a real action to qualify; raw session counts
  include crawler traffic.
- Deleted session_ids: none recorded
- Baseline left in place: 4 stage-0 leads created 20:17–20:25 UTC by single clinic page loads
  (crawler traffic): `e3c6bee0-323c-4c82-aaab-b664244e22eb`, `184e935f-37f9-4370-b67a-113ff3b22b20`,
  `b5d2805a-ee88-4be6-8e2b-b7c51927933a`, `c55b8397-469c-4d56-b8fb-8303bfb237ed`.

### after 21:47 UTC (exact time not recorded) — final-pass walkthrough test rows deleted
- Who: app session (final pass: privacy wording, email/consent split, held clinic views, treatment breakdown)
- What: guarded delete (count-checked, consultation_clicks first) of 5 leads, 24 lead_events,
  2 quiz_responses, 2 lead_treatments, 0 consultation_clicks. No schema, function or view changes.
- Why: rows created by that session's own UI walkthrough (Runs A2, C/D, E and two failed quiz-script
  attempts). Runs A (first attempt) and B created no rows, by design.
- Deleted session_ids: `e97a7b8c-7c32-4582-867d-e017cfc55986`, `d614e1ba-dd0f-42eb-8383-a4891f389470`,
  `528ad80e-9896-4fbe-92e4-a30e0bc31bee`, `604d029a-3a65-49a6-8f00-3aaaedeebd13`,
  `48016c4b-dad7-4a5a-b40a-6eb7c75cbc6b`
- Left in place: the 4 baseline rows (`e3c6bee0…`, `184e935f…`, `b5d2805a…`, `c55b8397…`).

### 07:44 UTC — seeded clinics cleaned (pipeline session)
- Who: skintea-pipeline session (Claude Code), `sql/2026-09-14_seeded_clinics_cleanup.sql` in skintea-pipeline
- What: created `seed_clinic_archive` (RLS on, no anon/authenticated access); archived then deleted the placeholder
  clinic Glow Studio LA and every seeded child row of the 17 pre-August clinics: `clinic_treatments` 71,
  `clinic_skin_scores` 85, `clinic_reviews` 28, `clinic_practitioners` 24, `clinic_who_visited` 3; unsourced fields on the
  16 real businesses set NULL.
- Why: invented prices, percentages, reviews and practitioners about real businesses.
- Deleted session_ids: none (row ids are in `seed_clinic_archive`, reason "seeded child row; cleanup 2026-09-14")

### 18:25–18:33 UTC — Google Places import (pipeline session)
- Who: skintea-pipeline session, `sql/2026-09-14_google_import_*.sql`
- What: staging table `google_import_staging`; `clinics` columns `google_categories`, `listing_filter`, `business_status`;
  `clinic_photos_valid` accepts `google_places_scrape`; 282 existing rows filled where NULL, 161 rows inserted, every field
  with `field_provenance` (`google_maps_scrape`).
- Why: development use of the scrape (CLAUDE.md "Google-derived data is development-only").
- Deleted session_ids: none

### 18:32 UTC — fabricated content archived and removed (pipeline session)
- Who: skintea-pipeline session, `sql/2026-09-14_fabrication_cleanup.sql`
- What: archived then deleted 6 `surgery_posts` and 6 `treatment_logs` authored by the two admin accounts, 2
  `clinic_practitioners` and 10 `clinic_treatments` on IVE MEDICAL SPA / Shiny Laser; cleared unsourced `treatments`
  cost/downtime/sessions/skin-fit/celebrity handles (5 rows); `trending_treatments` set `is_active = false` (6); Skintea
  Pick / Verified / known_for / price tier cleared on 2 clinics.
- Why: unsourced or invented claims naming real businesses and people.
- Deleted session_ids: none (row ids in `seed_clinic_archive`, reason "... audit 2026-09-14")

### 18:33–18:38 UTC — provenance guards, private visits, replacement list (pipeline session)
- Who: skintea-pipeline session, `sql/2026-09-14_provenance_guards.sql`, `..._clinic_who_visited_private.sql`,
  `..._publish_replacement_list.sql`
- What: `field_provenance` column + `enforce_field_provenance(<cols>)` triggers on treatments, clinic_treatments,
  clinic_practitioners, clinic_skin_scores, trending_treatments, treatment_reviews, treatment_before_afters,
  treatment_influencers, celebrity_mentions, clinic_videos, products; `enforce_signed_in_author` on clinic_reviews,
  product_posts, posts, surgery_posts, surgery_comments, treatment_logs; `clinic_who_visited` SELECT limited to the
  visitor, anon revoked; view `publish_replacement_list` (not readable by anon/authenticated).
- Why: no user-facing number, review or claim without a recorded source.
- Deleted session_ids: none

### 20:09–20:15 UTC — clinic_treatments rebuilt from sources; review and skin-score guards (pipeline session)
- Who: skintea-pipeline session, `sql/2026-09-14_clinic_treatments_rebuild.sql`, `..._clinic_guards_and_rebuild_policy.sql`
- What: 85 `clinic_treatments` rows inserted (no prices; website crawl sample 50, Google category 31, business name 4),
  through a temporary sandbox_exec INSERT policy that was dropped after the load; `clinic_reviews.field_provenance` +
  trigger `enforce_review_integrity`; `clinic_skin_scores` trigger `enforce_skin_score_measured`
  (`skintea_measured`, n ≥ 10).
- Why: the treatment pages were empty after the seeded rows were removed; rebuild only from recorded sources.
- Deleted session_ids: none

### 21:25 UTC — celebrity mention removed; first-person guard (pipeline session)
- Who: skintea-pipeline session, `sql/2026-09-14_celebrity_first_person.sql`
- What: archived then deleted `celebrity_mentions` row `a56204ef-cd84-4309-ac77-2ba33d3c1b45` (Kylie Jenner, Fillers);
  trigger `enforce_celebrity_first_person` on `celebrity_mentions` (a named person needs a verbatim quote with
  `speaker = celeb_name`, `verbatim: true`, `url = source_url`) and on `treatments` (`celebrity_handles` needs a
  verifiable first-person statement).
- Why: the row was a journalist's paraphrase displayed in quote marks as "On the record".
- Deleted session_ids: none (row archived in `seed_clinic_archive`)

### 22:07–22:11 UTC — full clinic-website crawl loaded (pipeline session)
- Who: skintea-pipeline session, `sql/2026-09-14_clinic_treatments_full_crawl.sql`, `..._crawl_field_staging.sql`, `..._full_crawl_provenance.sql`
- What: 419 `clinic_treatments` rows inserted (source `clinic_website_crawl`, no prices), through a temporary
  sandbox_exec INSERT policy dropped after the load; staging table `crawl_field_staging` created, loaded (267 rows) and
  dropped; `clinics.field_provenance.phone` switched to `clinic_website_crawl` on 141 rows and `.address` on 119 rows
  where the clinic's own site shows the same value (previous provenance kept under `previous`). No clinic values changed.
- Why: the clinic's own website is a legitimate source and replaces Google provenance where it agrees.
- Deleted session_ids: none
