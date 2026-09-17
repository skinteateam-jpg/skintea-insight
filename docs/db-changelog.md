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

## 2026-09-15

### shortly before 07:40 UTC (exact time not recorded) — laser links re-resolved or deleted (pipeline session)
- Who: skintea-pipeline session, `sql/2026-09-15_clinic_treatments_laser_reresolve.sql` (pipeline commit `8d46949`,
  payload md5 `cad5e73f401d5f5c5d4d0fe5ff17b8d8`), run through `query_database` as one guarded DO block.
- What: the 86 `clinic_treatments` rows pointing at the inactive `laser` treatment were cleared. `clinic_treatments`
  504 → 437; laser links 86 → 0.
  - 17 `clinic_website_crawl` rows re-pointed in place, plus 2 new rows where the same page names a second modality:
    `laser-resurfacing` +11, `rf-microneedling` +8, `morpheus8` / `potenza` / `lumecca` +0. Each carries
    `field_provenance.treatment_id` = `clinic_website_crawl` with `url`, `dataset`, `evidence_term`, `original_url`,
    `re_resolved_from: 'laser'` and the old provenance under `previous`.
  - 69 rows deleted: 36 `clinic_website_crawl` (page said only "laser", hair removal, a non-target device, or the named
    modality was already linked), 31 `google_maps_scrape` (Google category only), 2 `manual_web_check` (business
    name only; no modality evidence).
- Why: `laser` is a category, not a treatment; a link is kept only where the clinic's own page names a device or
  modality. Decisions: `data/clinics/laser_reresolve_decisions_2026-09-15.json` in the pipeline repo.
- Deleted session_ids: none (not session rows). Deleted row ids:
  - clinic_website_crawl (36): `04ea73e2-38dc-4cdd-a434-b0c92b7d6e69`, `102d9e7d-d8f0-4ab7-b13e-870d5f9534ac`, `3ae90f9b-1ad9-4c95-abcd-cc6e40b68bfd`, `e6c49b1b-2a9d-4150-90a4-ea1930971ccf`, `1805173b-1917-4171-b33f-a07a875c94c4`, `ac8edc40-b412-495c-945e-87a47dd71354`, `a382f02a-fbba-4a89-bf56-aec79b0c63ca`, `aaa829a9-a4f4-4810-85a9-0eef409bf6c4`, `3dfd2a96-2f5c-4743-b207-1994a1afeb3c`, `9a3e9a9d-93fc-40ed-b8a0-0b2b0ebe6886`, `4f784ae9-397c-4d34-816d-7d4660c87497`, `83820cdf-2d73-447f-846b-7cd0776f82a7`, `93cb6807-ae2f-4aa1-a95d-56df3a69fcd6`, `ac5c742c-cea7-47a7-a787-77b68496200c`, `c58aa5ff-f2cc-47ce-91fd-9db7036b377f`, `284235d0-df74-4971-bf80-216225d19cba`, `f9874143-a913-44b8-a679-939281488a22`, `363739d6-f5f5-4988-9a2e-d6627282ff3d`, `274ae155-849b-4c9b-b372-098025f900d9`, `1c72fbdb-1587-449c-9f4f-8c0be43a8e9c`, `02a58d13-67ff-42dc-9299-08f6768284e1`, `54c0b838-0ba4-41ea-a911-2408c9850be4`, `e71dbd5f-c69e-4f50-b206-3d65048561b6`, `3e277e7c-fedd-420f-8960-f2b54b939d59`, `3a7c2fe2-f272-44a0-8ab1-6a6703d70fef`, `efd17ac6-54ba-4b7a-8606-d7413f84763d`, `5a8efa71-a4e7-43a5-8762-dc509e61baec`, `c956bcfe-2a6b-405c-971a-4cb5d381eb3d`, `4bc084c9-7388-4d3f-83a9-ffbb1338068c`, `ac6ced8b-d926-479d-8043-c1111e3b4c9c`, `df646d63-5e95-49cd-b743-f66c9c23596d`, `606563fc-8753-4495-adab-0c23e54e2951`, `fe0ce5f5-7831-418d-a508-0cddcbb984d7`, `f00eb2fa-7bf6-45cb-810c-ebc6bd033049`, `6c71d90b-f21f-4b28-8544-467239674bac`, `e0a11dc6-75af-46af-80e0-47b442385965`
  - google_maps_scrape (31): `26e61262-7cc9-4897-8fc9-27a02f412a00`, `6acf27ec-8c11-4bb5-9bee-454b023fbd3c`, `a8554793-9a44-4f66-a8c3-01a2cb2e430c`, `68da370f-8ea3-427e-b643-1527baca42b8`, `f0b2d1a8-922f-4e84-8e3a-2b86c2c69d2b`, `50a4f68b-022b-4454-bc43-4330dbc4dcd8`, `84a46b4a-e822-469f-9429-5ae5b0a803dc`, `01bc23b4-1121-40c4-a566-5ae6a4d12052`, `2a89cdb2-b440-462a-9c81-669604d79498`, `e48d71f5-e3a6-4c24-b291-de80b8c3c685`, `79315851-8d43-40f4-a1ed-16c172c2d8a9`, `aa06041a-ae35-4068-a5a1-dc229328abbd`, `8143f100-6814-40a6-8adb-a6d00aad807a`, `781ca531-2ac4-451d-9d9a-db32eb5d3d3e`, `851d4e29-cbf9-4f08-9cc5-88ada58c9231`, `2de7425f-d5c9-427f-863f-4e7546b7af7f`, `9dc245ca-02ac-4f2e-907f-3f6579a53673`, `cdbaadd8-9b0d-498f-8671-38d39f98e1cc`, `6fb2de79-1f5e-4701-9378-cc862d0ff973`, `377a93fa-56af-4037-9f1e-3718020df9e2`, `6ff416e2-8382-4be6-9e6c-7b22f091cb20`, `5da3a956-16b6-4e38-b674-bd2f69883a65`, `cb0568b8-9507-454a-81bb-d81e6937087a`, `19926f94-8222-4c09-9942-18bcdad4f45d`, `823b1850-6b15-41f7-b8ac-14468ae52c7f`, `083090d2-d138-4dbe-bd85-3a793c4e9c04`, `1ef2e1a8-628b-47d6-897b-50566382e155`, `b151e9c6-f886-4f82-a748-7e2feb23da42`, `fafaf8a3-bffb-4431-9a11-f47f849b9945`, `5764d9db-a5cf-4f62-8038-cce2c16e7349`, `0232a2da-78d4-461c-a86c-1b3208dfb8d4`
  - manual_web_check (2): `7a644f2b-2a7c-4878-af31-28882f8abbae`, `a940f2c8-c33b-4bc5-944f-d537c08687d6`

### 07:40–07:50 UTC — contact values from clinic websites (pipeline session, clinic layer)
- Who: skintea-pipeline session, `sql/2026-09-15_contact_replacements_a.sql` and `..._b.sql` (pipeline commit `ce7c183`),
  run through `query_database`, each UPDATE guarded by `google_place_id` AND the current Google value.
- What: `clinics` values replaced where the clinic's own site publishes a different one for this location: `phone` on 8
  rows (Sculpt Med Spa DTLA and Silverlake, California Detox and Recovery Center, The Icelandic Esthetician, DR SKIN
  CLINIC, Body Sculpt LA, Rebecca Fitzgerald MD, Inspired Smiles), `address` on 5 rows (Epineu, From Head To Toe Spa
  Studio, LA Eve Skin, Skin Sanctuary, Beauty Date With Nate). `field_provenance.address` switched to
  `clinic_website_crawl` on 19 rows where the site shows Google's address spelled differently (value unchanged). Every
  change keeps the Google provenance under `previous`. Latitude, longitude and neighborhood were not changed.
- Why: the clinic's own website is authoritative over the Google Maps scrape; every disagreement was read
  (`scripts/clinics/gen_contact_replacements.py` lists the 57 not replaced and why: templates, portals, parent
  organisations, chains, other locations).
- Deleted session_ids: none

### 2026-09-15 07:2x–07:5x UTC — celebrity / influencer evidence layer (pipeline session)
- Who: skintea-pipeline session (Claude Code), `sql/2026-09-15_celebrity_evidence_layer.sql` in skintea-pipeline
  (branch `claude/claude-md-tagging-rules-j058m5`, commit `f9f56d8`), run through `query_database`, each DDL statement
  as its own call and verified afterwards with `pg_catalog`.
- What:
  - `celebrity_mentions` gained `platform`, `embed_url`, `evidence_type`, `said_on`, `verified_at`, `tier`,
    `instagram_handle`, `profile_url`, `profile_photo_url`, `follower_count`, `follower_count_at`.
  - `quote` NOT NULL dropped. NOT NULL added on `platform`, `evidence_type`, `tier`, `said_on`.
  - CHECKs: `evidence_type` in (spoken_video, spoken_audio, own_written_post); `tier` in (celebrity, influencer);
    `platform` in (youtube, instagram, tiktok, podcast, x, threads, other); and a tier/follower rule —
    `influencer` requires `follower_count >= 100000` and `follower_count_at`, `celebrity` requires both NULL.
  - UNIQUE `(treatment_id, source_url)`.
  - `enforce_celebrity_first_person` rewritten to have TWO accepted paths. **Path A is the original rule, unchanged:**
    a non-empty `quote` still needs `field_provenance.quote {source: published_source, url = source_url, recorded_at,
    verbatim: true, speaker = celeb_name}`. **Path B is new:** `quote` may be NULL only when `evidence_type` is
    `spoken_video` or `spoken_audio`, `embed_url` is set, `source_url` matches `^https?://`, `verified_at` is set, and
    `field_provenance.source_url {source: primary_source, url = source_url, recorded_at, speaker = celeb_name}`.
    `own_written_post` is excluded from path B and still requires a quote.
  - 8 rows inserted (7 `own_written_post` TikTok, 1 `spoken_video` YouTube) across 7 of the 16 active treatments:
    Fillers, Hydrafacial x2, IPL Photofacial, Juvelook, Lumecca, PRF Injection, PRP.
- Why: treatment pages needed a "who has talked about having this" layer that cannot repeat the removed Kylie Jenner
  defect. Path B exists because nobody on this pipeline can play video or audio, so a verbatim quote from a spoken
  source could only come from someone else's transcription — the exact route that Kylie row took. For spoken sources
  the guard therefore moves from "the person's exact words" to "the person's own primary source, verified", which is
  harder to fake, not looser. The original written path was not weakened.
- Not changed: RLS on `celebrity_mentions` was already correct (SELECT only, anon + authenticated, `USING (active)`).
  `treatment_influencers` was left completely alone and is still empty — the clinic detail page renders it per
  treatment as "<name> did this" on a clinic page, which is the same false-association class as the removed Kylie row.
  `treatments.celebrity_handles` was deliberately NOT dropped: it is a tracked column of `treatments_enforce_provenance`,
  so dropping it means recreating that trigger while the clinic session is writing mappings. Follow-up: drop it and
  recreate the trigger without it once that session is done.
- Deleted session_ids: none. No rows were deleted by this session.

### 20:08–20:10 UTC — Reddit treatment reviews inserted; treatment page gate (pipeline session)
- Who: skintea-pipeline session. App files `src/lib/treatmentReviews.ts` + `src/routes/treatments.$slug.tsx`
  (Lovable `d533f51`), then `sql/2026-09-15_treatment_reviews_reddit.sql` (pipeline commit `f753dc2`, md5
  `e85807829807e9530cec8f1d7ce7c5a1`) run by the agent (sandbox_exec, INSERT only, one transaction).
- What: 139 rows inserted into `treatment_reviews`: botox 29, fillers 23, hydrafacial 31, morpheus8 24, rejuran 13,
  skin-boosters 19. Verbatim Reddit excerpts, `author_handle` NULL, every row with `source_url` and provenance. No
  deletions, no schema change.
- Why: first sourced opinion data for the treatment pages.
- Deleted session_ids: none

#### Method note — treatment review percentages are HELD (SUPERSEDED the same day by the sensitivity test, 20:45 UTC entry below)
- **Low confidence never counts.** Rows with `tag_confidence = 'low'` are shown as quotes only. They are excluded
  from every percentage, count, median and floor check (`isCountedReview` in `src/lib/treatmentReviews.ts`).
- **Held cells.** Three verdict percentages show "Not enough data yet" whatever the volume: Worth it?, First time vs
  repeat, and Sensitive skin. The switch is `VERDICT_PERCENTAGES_HELD = true`.
- **Why: the sample is biased by construction, not thin.** The batch was collected with five query shapes per
  treatment, and one of them is "<treatment> regret" (plus a "lip filler regret" top-up). Regret-seeking threads
  skew the worth-it / not-worth-it ratio toward negative before anyone tags anything. The 10-review floor guards
  volume, not bias.
  - Share of inserted rows that came from regret queries: botox 8/29, fillers 10/23, hydrafacial 3/31, morpheus8 2/24,
    rejuran 1/13, skin-boosters 0/19.
- **Shown from this batch:** the quotes with source links, top regret reasons as counts (never shares), and price paid
  (median and range, only at 5 or more counted values). Price is the one field immune to query-shape bias.
- **To lift the hold:**
  1. Run a rebalanced batch where regret-seeking shapes are at most 20% of runs. Add neutral shapes such as
     "<treatment> results", "first time", "follow up" and "one year later".
  2. Re-report the per-treatment composition: confidence, verdicts, prices, regrets and rows per query shape.
  3. Get the owner's explicit decision.
  - Only after all three, set `VERDICT_PERCENTAGES_HELD = false`. Do not lift it because a cell passes the review floor.

### 20:10–20:35 UTC — clinic names, Census coordinates, location guard, dead photo links (pipeline session, clinic layer)
- Who: skintea-pipeline session; statements in `sql/2026-09-15_names_geocode_photos_querydb_log.sql`, INSERT files
  `sql/2026-09-15_name_staging.sql` and `sql/2026-09-15_photo_dead_staging.sql` (loaded by the Lovable agent), geocoder
  `scripts/clinics/geocode_census.py` (run in the sandbox).
- What:
  - `clinics.name`: 92 values replaced with the name the clinic's own website states, 143 provenance-only switches where
    the stored name appears on the site; source `clinic_website_crawl`, Google provenance kept under `previous`.
  - `clinics.latitude` / `longitude`: 147 rows set from the US Census Bureau Geocoder (public domain) for every address that
    is not Google-sourced; source `census_geocoder`, Google coordinates kept under `previous`. 7 addresses did not match
    (4 seeded rows without city/ZIP keep NULL coordinates).
  - `clinics_enforce_provenance()`: coordinates may be sourced `census_geocoder` (and only coordinates).
  - New trigger `clinics_enforce_location_consistency`: rejects an address change that leaves the old coordinates, a
    non-Google address with Google coordinates, and latitude/longitude from different sources.
  - `clinics.photos`: 4,744 Google Places photo entries removed from 344 rows — every URL returned HTTP 403 from a US
    GitHub runner and locally (expired signed links); 1 live entry kept.
  - Staging tables `geocode_staging`, `name_staging`, `photo_dead_staging` created (RLS on, sandbox_exec SELECT/INSERT only),
    used and dropped.
- Why: publishable clinic listings need a name, location and contact that do not depend on Google; dead image links render
  as broken photos instead of the category placeholder.
- Deleted session_ids: none (no rows deleted; photo array entries removed, list of URLs in the committed INSERT file)

### 20:45–20:50 UTC — clinic prices from clinic websites; fillers rebalancing batch (pipeline session)
- Who: skintea-pipeline session. App: `src/lib/treatmentReviews.ts`, new `src/lib/clinicPrices.ts`,
  `src/routes/treatments.$slug.tsx`, `src/routes/clinics/$id.tsx` (Lovable `7deda0d`). Database:
  - `sql/2026-09-15_clinic_treatments_prices.sql` (pipeline `fc5c9de`, payload md5 `bed341e8…`), UPDATE through
    `query_database`.
  - `sql/2026-09-15_treatment_reviews_reddit_fillers_neutral.sql` (md5 `dd2d5439…`), INSERT through the agent
    (sandbox_exec).
- What:
  - **Clinic prices:** `price_from` / `price_unit` set on 14 `clinic_treatments` rows (0 before). The units are
    per_unit, per_session, per_area and starting_from.
    - Each row carries `field_provenance.price_from` and `.price_unit` = {source clinic_website_crawl, recorded_at,
      url, dataset, quote (the price string as it appears on the page), detail}. `field_provenance.treatment_id` is
      unchanged.
    - 29 other price mentions were read and left NULL, with reasons in
      `data/clinics/clinic_prices_decisions_2026-09-15.json`: packages, promotions, bundles, column layouts that lost
      the name-to-price pairing, a unit the page does not state, and a device priced on another treatment's page.
    - Jubilee Aesthetics Botox "$12.50 / unit" is not stored because `price_from` is an integer. Rounding was refused.
      A numeric column is a schema change and was not made.
  - **Fillers rebalancing batch:** 23 fillers rows inserted into `treatment_reviews` from five neutral-shape Reddit
    queries: results, "first time", "one year later" (0 items), "follow up", honest experience.
- Why: prices come from the clinic's own website, not Reddit; fillers was the only treatment failing the sensitivity
  test.
- Deleted session_ids: none. No deletions.

#### Method note — the sensitivity test (replaces the held-percentages note above)
- **The rule (in `verdictCell`, `src/lib/treatmentReviews.ts`, computed from the rows at render time).** A verdict
  percentage (Worth it?, first time, had it before, sensitive skin) shows only when its own cell passes both:
  - (a) at least 10 counted rows: tag_confidence high or medium, verdict worth_it or not_worth_it;
  - (b) recomputing Worth it with every regret-seeking row removed moves it by 10 percentage points or less. A row
    is regret-seeking when `field_provenance->'detail'->>'query'` contains "regret". The difference is taken
    unrounded.
- **What is displayed.** The figure comes from ALL counted rows. (b) is a sensitivity check, not a filter: if dropping
  the suspect rows barely moves the number, the number is robust and every real row stays in it.
  - Every percentage renders with its sample size ("64% · based on 22 reviews").
  - A held cell says why: too few rows; the removal moves it by N points; or every row came from a regret query.
- **Why share-based rules were rejected.** Neither "regret shapes ≤ 20% of runs" nor "≤ 20% of counted rows"
  predicts bias. Measured on the 139 rows:
  - botox: 32% regret share, but the figure moves only 4 points (63.6% → 60.0%);
  - fillers: 33% regret share, and it moves 21 points (41.7% → 62.5%).
  - Similar shares, opposite effects: sensitivity, not share, is what matters.
- **Result on 2026-09-15 before the fillers batch.**
  - Worth it? opened for botox, skin-boosters, morpheus8, hydrafacial and rejuran.
  - Had it before opened for botox (60%, n 15, 6.2 pts) and morpheus8 (80%, n 10, 8.9 pts).
  - Fillers was held at a 20.8-point delta.
- **Result after the fillers batch.** Fillers: n 12 → 28, Worth it 46.4% (54.2% without regret rows), delta 7.7 →
  the gate opens.
- **Prices.** Treatment prices come from clinic_website_crawl evidence on `clinic_treatments`; Reddit supplies quotes
  and regret reasons, not prices.
  - A clinic price range shows per unit only with at least 3 listed clinics in that unit, and units are never mixed.
    No treatment reaches that today; the most is 2 clinics in one unit (botox per unit, fillers starting from,
    rejuran per session).
  - What Reddit users said they paid (`cost_paid_usd`, 5-value floor) is a separate, differently labelled figure
    below it.

### 20:38–22:07 UTC — clinic social links table, deep-crawl treatment mappings, crawl status staging (pipeline session, clinic layer)
- Who: skintea-pipeline session; direct statements in `sql/2026-09-15_clinic_page_querydb_log.sql`; INSERT files
  `sql/2026-09-15_crawl_status_staging.sql` and `sql/2026-09-15_clinic_treatments_deep_crawl.sql` (md5 `47efb259…`, loaded by
  the Lovable agent); generator `scripts/clinics/gen_clinic_treatments_deep.py`.
- What:
  - New table `public.clinic_social_links` (clinic_id, platform in instagram/tiktok/facebook/youtube/x/pinterest/linkedin,
    https url, handle, `field_provenance.url.source` required, unique per clinic/platform/url). RLS on; anon/authenticated
    SELECT only; policy "Clinic social links are public". 249 rows copied from `clinic_contacts.social_profiles` (URLs
    normalised, single-post/video links excluded; provenance carried with `copied_from`). Emails stay in the private
    `clinic_contacts`. Verified as anon: links readable, `clinic_contacts` "permission denied", INSERT rejected.
  - `clinic_treatments`: +110 mappings on 17 clinics (15 passed clinics that had none), priceless, source
    `clinic_website_crawl`, each pair read in context. Loaded through a temporary policy
    "sandbox inserts deep crawl treatments (temporary)" (INSERT TO sandbox_exec), created 22:04 and dropped 22:06.
    clinic_treatments 437 → 547.
  - Staging table `crawl_status_staging` (RLS on, sandbox_exec SELECT/INSERT only) created 20:38, used for the coverage
    breakdown, dropped 22:07.
- Why: the clinic page showed empty Treatments for 149 of 240 listed clinics; social profiles belong on the page, emails do not.
- Deleted session_ids: none (no rows deleted).

## 2026-09-16

### 04:20–05:20 UTC — targeted price crawl: 53 clinic prices, dated and linked (pipeline session)
- Who: skintea-pipeline session. Database: `sql/2026-09-16_clinic_treatments_prices.sql` (pipeline `a7b1b7d`, payload md5
  `cc72214ca47e1b15bb3abc5551462403`), UPDATE through `query_database`. App: `src/lib/clinicPrices.ts`,
  `src/routes/treatments.$slug.tsx`, `src/routes/clinics/$id.tsx` (Lovable `636d8f7`, date format `d1d5e79`).
- What:
  - **Prices.** `clinic_treatments.price_from` / `price_unit` set on 53 more links: **14 → 67 priced links, 7 → 25
    clinics** (66 of the 67 are listed clinics). Units: per_session 27, per_unit 13, starting_from 12, per_syringe 8,
    per_area 7. Jubilee Aesthetics Botox $12.50/unit is now stored, the column having become numeric(10,2).
  - **Every priced row carries the crawl date** in `field_provenance.price_from.recorded_at` (2026-09-15 on the first
    14, 2026-09-16 on the 53), with the evidence page URL, the dataset and the price string as quoted.
  - **Display.** A price renders with its date and a link to the page it was read from ("$450 per session · as listed
    on their site, 16 Sep 2026"), on both the treatment page and the clinic page.
  - **Staleness.** `MAX_PRICE_AGE_DAYS = 120` in `src/lib/clinicPrices.ts`: a price recorded more than 120 days ago, or
    with no readable date, is hidden everywhere — the per-clinic line and the range across clinics alike — until it is
    re-verified. Nothing re-crawls automatically. A published price that is wrong damages the clinic relationship.
  - **Ranges** (per unit, minimum 3 listed clinics, units never mixed): botox $8–$15 per unit across 13; fillers
    $450–$900 per syringe across 8, $600–$1,350 per area across 3, starting prices $325–$600 across 3; peels $129–$350
    per session across 6; hydrafacial $200–$350 per session across 4; rejuran $450–$778 per session across 4; potenza
    $750–$800 per session across 3.
  - No schema change, no deletions, no other table touched.
- Why: the earlier crawls looked for treatment names and only reached shallow pages, so dollar amounts appeared on 31
  of 93 sites. Med spas publish prices on a dedicated page.
- Evidence: 128 clinic sites crawled (apify/website-content-crawler, root + 16 pricing paths, depth 2, 1,926 pages,
  $1.24). 160 links had a dollar amount near their treatment; every one was read in context. Decisions and every
  rejection with its reason: `data/clinics/clinic_prices_decisions_2026-09-16.json`. Each accepted quote was checked
  mechanically against the crawled page it cites (`scripts/clinics/verify_price_decisions.py`).
- Deleted session_ids: none.

#### Method note — clinic prices
- **Accepted only when the clinic's own page states that price for that treatment.** Left NULL: call-for-pricing,
  packages and series, promotions and first-visit or loyalty rates, another location's menu, another treatment's price
  (a device with its own page prices only that page), shop and membership and consult fees, column layouts whose
  name-to-price pairing the crawl lost, and units the page does not state. Never average, never divide a package,
  never round, never carry a price across clinics.
- **A site that contradicts itself publishes nothing.** BHRC's own pages give different figures for hydrafacial, peels,
  morpheus8, fillers and sculptra (price-list vs the service pages vs packages), so those ten links stay unpriced.
  Botox and IPL, where every BHRC page agrees, are stored.
- **Chain price pages** (LaserAway, BHRC) are the clinic's own site and are accepted, with `caution` recording that the
  figure is chain-wide rather than location-specific.
- **A second source is allowed: `clinic_supplied`.** When a clinic sends its own price list, the row records
  `field_provenance.price_from = {source: 'clinic_supplied', recorded_at, detail: who sent it and when}` plus the
  price string as received. It is subject to the same 120-day rule and renders the same way, with the date; there is no
  evidence URL, so no link is shown. **No clinic_supplied row exists yet**; none was inserted in this pass.
- **Price menus that are images or PDFs are not read.** This pass does not OCR them; the files it found are listed in
  the 2026-09-16 report and in `work/r9/price_menu_files.json`.

### 05:40 UTC — two prices cleared after a hand check (pipeline session)
- Who: skintea-pipeline session, guarded DO block through `query_database` (no file; the block is quoted in the
  2026-09-16 report and reproduced below in substance).
- What: `price_from` and `price_unit` set to NULL on 3 links, **67 → 64 priced links**. The old
  `field_provenance.price_from` / `.price_unit` entries were removed and replaced by a `price_cleared` record holding
  the date, the reason and the previous price and URL, so the removal is auditable.
  - **LaserAway rejuran, both locations** (Los Feliz, South Park), was $778 per session. The page does name Rejuran,
    but it prices **"Rejuran Healing Essence" applied topically** during LaserAway's SkinPen "Salmon DNA Facial"
    ("Rejuran Healing Essence is then applied", "applied topically post-treatment"). The Rejuran treatment page is the
    **injectable**; `a3/reddit/TREATMENT_TAGGING_RULES.md` already excludes topical PDRN and Rejuran-brand products
    from that treatment. A topical price does not price the injection.
    - Consequence: rejuran per session drops from 4 priced clinics to 2, so **no rejuran range renders**.
    - Open question for the owner, not acted on: the two LaserAway → rejuran *mappings* rest on the same topical
      evidence, so they may not belong on the rejuran page either. The links were left in place.
  - **Viora MedSpa botox**, was $70 starting_from. The injectables page lists "Daxxify $70.00+" with **no unit**
    (not per unit, per area or per session) and states no Botox price at all: the unit-not-stated rule applies.
- Why: a wrong price on a clinic page damages the relationship this layer exists to start.
- Deleted session_ids: none. No rows deleted; two fields cleared on three rows.

### 2026-09-16 06:45–07:30 UTC — person-named listings out of the public list, badge/score provenance guards, products.is_top_pick (pipeline session, clinic layer)
- Who: skintea-pipeline session; statements in `sql/2026-09-16_fake_data_removal_querydb_log.sql`, name list in
  `sql/2026-09-16_person_listings_out_of_passed.sql` (both in the pipeline repo).
- What:
  - `clinics.listing_filter`: 54 person-named listings moved `passed` → `dropped` (rows kept, `field_provenance.listing_filter`
    = `{source: manual_web_check, recorded_at: 2026-09-16, detail: person-named listing…, previous: …}`). A named individual is
    not a clinic. Business names built on a person's first name ("Skin by Carla", "Nancy's Skin Care", "Michael Kim
    Dermatology") stay. Passed clinics 240 → 186.
  - `clinics.listing_filter`: "Vermont Health Care" (7af8dced…) moved `passed` → `dropped` as a duplicate of "Vermont Med spa"
    (same address, same website). Passed 186 → 185.
  - `clinic_treatments`: 2 Hydrafacial mappings deleted (Dr. Hrak Jalian, Helen Fincher (MD)) — the evidence was a different
    practice's website (rebeccafitzgeraldmd.com). 547 → 545.
  - `clinics_enforce_provenance()`: tracked set extended with `is_verified`, `is_featured`, `badges`, `best_for`,
    `distance_miles`, `travel_minutes`; null/false/empty-array/empty-string now count as "nothing shown" and need no source
    (445 rows carry `badges = '{}'`, which would otherwise have blocked every update). Tested: `is_verified = true` and
    `trust_score = 91` rejected without provenance; accepted with it; unrelated updates unaffected.
  - `enforce_field_provenance()` (shared by treatments, clinic_treatments, products, …): same null/false/empty rule.
  - `products.is_top_pick boolean NOT NULL DEFAULT false` added, and `products_enforce_provenance` now covers
    `('skintea_score', 'is_top_pick')`. This is the column the "★ TOP PICK" row on /skin-profile reads; it was querying a
    column that did not exist (HTTP 400) and falling back to the three highest-scoring products, badged as picks. A pick now
    needs `field_provenance.is_top_pick = {source, recorded_at}`. Tested both ways.
- Why: the audit found real people listed as bookable clinics, a duplicate listing, and badge/score columns that would start
  rendering unsourced values the moment anything wrote to them. Rows and columns are kept so each feature returns with real data.
- Deleted session_ids: none. Rows deleted: 2 `clinic_treatments` mappings (listed above). No other deletions.

### 07:00–07:40 UTC — chain prices count once; LaserAway Rejuran removed; clinic-page sections restored (pipeline session)
- Who: skintea-pipeline session. App: `src/lib/clinicPrices.ts`, `src/routes/clinics/$id.tsx` (Lovable `0f19921`,
  re-cut on top of the same-day "Fake data out, features kept" commit after its md5 guard correctly rejected the first
  attempt). Database: one guarded DO block through `query_database`.
- What:
  - **A chain counts once.** LaserAway and BHRC each publish ONE price page for every location, so their locations are
    not independent price sources. Rows whose `field_provenance.price_from.caution` says the price is chain-wide are
    now collapsed to one source per brand (the evidence page's host) for BOTH the 3-source minimum and the displayed
    count; the chain's price still counts in the range. Every row stays in the database and each location keeps its own
    price on its own clinic page. The range line says so: "across 11 listed clinics (a chain's locations count once)".
  - **Two `clinic_treatments` rows deleted** (LaserAway → rejuran, both locations):
    `f4f9a998-ef5f-4f47-9aca-c1c883aa6243` (Los Feliz) and `6cd46736-d0ea-43a4-a8db-052be7a56c63` (South Park).
    Reason: the evidence page sells **Rejuran Healing Essence applied topically** after SkinPen microneedling
    (LaserAway's "Salmon DNA Facial"). `a3/reddit/TREATMENT_TAGGING_RULES.md` excludes topical PDRN and Rejuran-brand
    products from the Rejuran treatment, which is the injectable, so the mapping fails the same test its price failed
    at 05:40. LaserAway no longer appears on the Rejuran page. clinic_treatments 545 → 543.
  - **Range state after both changes** (listed, active, fresh prices; sources after collapsing):
    botox per unit 11 sources $8–$15 · fillers per syringe 6 $450–$900 · fillers per area 3 $600–$1,350 · fillers
    starting from 3 $325–$600 · peels per session 5 $129–$350 · hydrafacial per session 3 $200–$350 — all shown.
    **potenza per session: 3 clinic rows but 2 sources (one chain + one clinic), so it is now HELD.** Do not re-open it
    by counting LaserAway's two locations again. **rejuran: 2 sources, held**, after the deletion above.
  - **Clinic page sections restored, each with the treatment page's honest empty state** (header and frame always
    render; the frame says what the section will hold and that there is not enough yet; never hidden, never filled with
    placeholder): The tea (`clinics.tea_quote`), What it's best for (`clinics.best_for`), Known for
    (`clinics.known_for`), Who goes here (`clinic_who_visited`), Works for your skin? (`clinic_skin_scores`), What
    people say (`clinic_reviews`), Video (`clinic_videos`), Trust & Skintea score (`clinics.trust_score`,
    `clinics.skintea_score`). No column or table was missing; all eight sources exist.
  - **Visitor submission.** The three sections that only a visitor can fill (Who goes here, Works for your skin?, What
    people say) carry one line: "Been here? Tell us what actually happened." It opens a short form that inserts into
    `clinic_reviews` as the signed-in author. **No schema or policy change was needed or made:** the existing policy
    "Users can create reviews" (`auth.uid() = user_id`) plus `enforce_signed_in_author` and `enforce_review_integrity`
    already allow exactly that, `agree_count` keeps its default 0, and an anonymous insert is refused by the database,
    not just by the UI. A signed-out visitor is pointed at `/login`.
- Why: deleting fabricated rows was right; removing the sections was not, and left the clinic page indistinguishable
  from a directory listing.
- Deleted session_ids: none. Rows deleted: the 2 `clinic_treatments` ids listed above.

#### What these sections are waiting for (so nobody re-fills them by hand)
- **`clinics.best_for` is non-null on 445 clinics but every one of them is an empty array** (`{}`), so the section
  renders its empty state today. There is no archived content to restore: `seed_clinic_archive` holds no `best_for`
  value. It needs a real source (the clinic's own site, or `/for-clinics`) before anything renders.
- **`tea_quote`, `known_for`, `trust_score`, `skintea_score` are empty on every clinic** (0 rows each), and
  `clinic_reviews`, `clinic_skin_scores`, `clinic_who_visited`, `clinic_videos` hold 0 rows.
- **"Who goes here" can never show an aggregate under the current policy.** `clinic_who_visited`'s SELECT policy is
  "Users see only their own visits" (`auth.uid() = user_id`), so a visitor can only ever see their own rows. Showing
  who else goes there would need a new policy or an aggregate view — neither was created; reported instead.
- **No lead event fires from the new line.** `lead_events.event_type` allows only stage_change, field_set,
  quiz_completed, clinic_view, consultation_click, booking_link_click and email_submitted. None describes "a visitor
  offered to tell us what happened", and adding one is a schema change, so nothing is recorded for that click.

### 2026-09-16 18:10–18:50 UTC — listing second pass: solo practices back, non-clinics out (pipeline session, clinic layer)
- Who: skintea-pipeline session; statements in `sql/2026-09-16_listings_second_pass_querydb_log.sql` (pipeline repo).
- What (`clinics.listing_filter`, rows kept, reason in `field_provenance.listing_filter`, source `manual_web_check`):
  - `dropped` → `passed` (3): Dennis Bang MD, Dr. Sean Satey, Rebecca Fitzgerald MD Inc. — solo practices with their own
    website and booking. A practice under the practitioner's name is a business. Names kept as listed.
  - `passed` → `dropped` (4): VI Peel (the product brand's corporate shop), "MY Doctor | Dermatologists"
    (medical-marijuana card telehealth site), Luxe Naturals (product shop), Young's Gift & Cosmetic (retail store).
  - The other 51 person-named rows stay `dropped`: hospital/directory provider pages (Kaiser, CHLA, Keck, Adventist,
    Portrait Collective, a jany.io microsite), rows with no website, staff of practices listed separately, and one listing
    at a hospital address whose own practice is in another city.
  - Passed clinics 185 → 184.
- Why: owner's rule — a solo practice with its own site and booking is a business; a physician page inside a hospital
  group or directory is not; a product brand, shop or telehealth service is not a clinic.
- Deleted session_ids: none. No rows deleted.

### 2026-09-16 19:00–19:45 UTC — clinic intent logging table, admin report function (pipeline session, clinic layer)
- Who: skintea-pipeline session; statements in `sql/2026-09-16_clinic_intent_events_querydb_log.sql` (pipeline repo).
- What:
  - New table `public.clinic_intent_events` (clinic_id FK, action call/book/directions/website/social, channel, page
    clinic_page/treatment_page/clinics_index, surface, treatment_id FK, anonymous session_id, user_id, occurred_at).
    NOT NULL + CHECK on action and page; at least one of session_id/user_id; index (clinic_id, occurred_at).
  - Trigger `clinic_intent_events_guard`: occurred_at forced to now(); a user_id other than auth.uid() is rejected;
    page treatment_page requires treatment_id.
  - RLS on. anon/authenticated: column-level INSERT on the eight client columns only, policy "Visitors log clinic intent"
    (user_id null or own). authenticated: SELECT granted, policy "Admins read clinic intent" (profiles.is_admin). anon has
    no SELECT.
  - New function `public.clinic_intent_report(p_from, p_to)`, SECURITY INVOKER; EXECUTE revoked from PUBLIC/anon, granted
    to authenticated (non-admins get 0 rows through RLS).
  - Guard tests (valid insert accepted; missing action, fake clinic, spoofed user, bad action, backdated occurred_at,
    no identity, treatment_page without treatment, anon read all rejected; report: admin rows, non-admin 0, anon denied)
    ran inside rolled-back blocks.
- Why: attribution evidence for the B2B layer before any clinic signs — each outbound tap on a listing is logged, the
  link follows at once.
- Deleted session_ids: `fb06a078-951d-471c-8e2a-23f567724a55`, `6051a502-711c-4467-83c8-ada46ad77acd` — 6 production
  smoke-test rows from this session's "Intent smoke test" workflow runs. Table held 0 rows afterwards.

### 2026-09-16 20:10-20:40 UTC - clinics.best_for filled from the website crawl already on disk (pipeline session)
- Who: skintea-pipeline session. Database only: `sql/2026-09-16_clinics_best_for.sql` (pipeline commit `ed29421`),
  six guarded DO blocks through `query_database`. No app file changed, no new Apify run, $0 spent.
- What: **`clinics.best_for` 0 -> 352 chips on 107 clinics**, all of them `listing_filter = 'passed'`. Of the 184 listed
  clinics, 138 have a `website_url`; 107 of those now carry 1-5 chips (average 3.3) and 31 keep the empty array on
  purpose. The 46 with no website were never in scope. Every row also gained
  `field_provenance.best_for = {source: clinic_website_crawl, recorded_at: 2026-09-16, url, detail}`.
  - **The detail carries the evidence for every chip**: the exact phrase, the page it was read from and the Apify
    dataset id, chip by chip.
  - Chips per clinic: 5 on 9 clinics, 4 on 48, 3 on 25, 2 on 16, 1 on 9.
  - Guards: payload md5, the batch id count, a listed-clinic count, a before-count of 0 clinics already carrying
    `best_for`, a per-row `GET DIAGNOSTICS` check and an after-count. The batch-2 guard fired once on a wrong md5
    constant and wrote nothing, which is the guard doing its job; it was re-run with the file's constant.
  - Verified after the run: 107 rows, 352 chips, all listed, all sourced, and the chip set hashes identically in the
    database and in the local decision file (`c829440601eb0f0055df015210850be9`).
  - Rendered check (Playwright, localhost:8080): Shiny Laser Skin Clinic shows the five chips; Viora MedSpa shows the
    honest empty state, "Nothing recorded for this clinic yet."
- Why: the section existed with nothing to render. It now renders what each clinic says about itself, and nothing else.
- Deleted session_ids: none. No rows deleted, no schema, function, view, policy or grant changed.

#### Method note - what earns a chip, and what does not
- **Source: the clinic's own crawled pages only** (price pass, full crawl, deep crawl, names crawl and the two samples;
  dataset list in `scripts/clinics/best_for_evidence.py`). Nothing is derived from `clinic_treatments`, from a Google
  category, from review or social text, or from the clinic's name.
- **Earns a chip:** what the page says it specialises in, focuses on or is known for; who it serves; the languages it
  speaks; and how it operates (walk-ins, memberships, at-home visits, insurance accepted, payment plans, appointment
  only). Concerns and audiences are preferred over modality names - "acne scars", "melasma", "Korean-speaking staff",
  "teen acne", not "Botox".
- **Rejected, by reason:** marketing superlatives ("#1 best med spa", "premier", "luxury", "award-winning",
  "world-class"); outcome and safety claims ("painless", "guaranteed", "safe for every skin tone"); keyword-stuffed meta
  descriptions; quoted customer reviews and embedded TikTok/Instagram captions; device-manufacturer marketing copy; and
  any page that is not the clinic's own site - parent organisations (keckmedicine.org), portals (koreaportal.com),
  link shorteners (bit.ly), platform pages (Instagram, Square, Mailchimp) and a parked host page (Bluehost).
- **An empty array is a correct answer.** 31 listed clinics with a website have none, each with a recorded reason in
  `data/clinics/best_for_decisions_2026-09-16.json`: 11 state only generic marketing, 9 have a website that is a
  platform/portal/shortener rather than their own site, 4 have no crawled pages, 3 name only bare modalities or a single
  menu item, 2 are parent-organisation sites, 1 site carries unfinished template text from another business, and 1
  belongs to the hair salon the esthetician works inside.
- **Chains carry a caution.** LaserAway (2 locations), BHRC (2), Heyday (2), Skin Laundry and Schweiger publish one
  site for every location, so their chips record that the statement is chain-wide, not specific to that location - the
  same rule already used for chain prices.
- **Nothing is written from memory.** `scripts/clinics/verify_best_for.py` requires each chip's phrase to be an exact
  substring of that clinic's own crawled page, fails the run otherwise, and supplies the evidence URL and dataset id, so
  no URL is ever hand-transcribed.
- **Re-verification.** These chips have no expiry rule today (unlike prices, which die at 120 days). A clinic that
  rewrites its site will drift; re-run the evidence, verification and generator scripts against a fresh crawl to refresh.

### 2026-09-16 21:50 UTC — treatment page copy with sources, provenance trigger extended, save-table uniqueness, test data removed
- Who: "get the site ready to show people" session (pipeline repo `scripts/treatments/gen_treatment_copy.py`).
- What (schema):
  - `treatments` gained `who_its_not_for text` and `results_duration text` (ADD COLUMN IF NOT EXISTS).
  - `shelf_items` UNIQUE `(user_id, product_id)` (`shelf_items_user_id_product_id_key`) and `gift_wishlist` UNIQUE
    `(user_id, product_id)` (`gift_wishlist_user_id_product_id_key`). 0 duplicates existed. Before this the same product
    could be added to a shelf twice (found by a rolled-back RLS simulation).
  - Trigger `treatments_enforce_provenance` replaced: `enforce_field_provenance` now covers `subtitle`, `description`,
    `what_it_is`, `how_it_works`, `who_its_for`, `who_its_not_for`, `downtime`, `results_duration`, `average_cost`,
    `sessions_recommended`, `best_for_skin`, `celebrity_handles`, `majority_pct`, `results_pct`, `minority_opinion`
    (was 8 columns). Tested in a rolled-back block: unsourced value rejected, change without a new provenance entry
    rejected, `published_source` without url rejected, unrelated update accepted. `treatments_celebrity_first_person`
    untouched. **Consequence:** `/admin/treatments` can no longer save a non-empty description or copy field without
    provenance.
  - Temporary `public.treatment_copy_staging` (RLS on, sandbox_exec SELECT/INSERT only) created, loaded by the Lovable
    agent from `sql/2026-09-16_treatment_copy_staging.sql` (md5 `e674a884…`, 144 rows, 124 filled), then dropped.
- What (rows): the 16 active treatments' copy fields were replaced from staging in one guarded UPDATE (16 rows).
  124 fields filled, each with `field_provenance.<field> = {source: published_source, url, recorded_at, sources[{url,
  publisher, title, quote}]}`; sources are FDA labelling / 510(k) / PMA documents, manufacturer clinical documentation,
  peer-reviewed literature and AAD / ASDS / ASPS pages. Empty (NULL, hidden on the page): `average_cost` on all 16 (no
  dated professional-body fee), `results_duration` on hydrafacial, ipl-photofacial, potenza, rejuran. The previous
  unsourced subtitle / what_it_is / how_it_works / who_its_for text on botox, hydrafacial, ipl-photofacial,
  laser-resurfacing and prf-injection was overwritten.
- Why: treatment pages must carry sourced copy only ("sourced or absent"); the trigger stops unsourced copy returning.
- Deleted (this session's own anonymous E2E test data, run tag e2e1, 20:54 UTC): lead `2f5fca5e-3bf4-4d7a-acf1-3809f11b2d67`
  (session_id `269378b8-c21a-429a-924c-bb204ae68d27`, email skintea-e2e+e2e1@example.com) with its 10 lead_events,
  1 lead_treatments and 1 quiz_responses row; clinic_submissions `0060c3b4-8c9d-42eb-b2dc-7c98c5a400ac`
  ("E2E TEST CLINIC e2e1 (delete me)"). Storage object `clinic-submissions/pending/0060c3b4-8c9d-42eb-b2dc-7c98c5a400ac/01-test-photo.png`
  (id `0148cfdd-e7d0-43e1-a616-7ddde379e7ee`) must be removed through the Storage API (direct SQL delete is blocked).
- Deleted session_ids: `269378b8-c21a-429a-924c-bb204ae68d27`

### 2026-09-16 21:00-22:20 UTC - clinic social URLs, menu-based treatment mappings, dead links cleared (pipeline session, clinic layer)
- Who: skintea-pipeline session (Claude Code). Guarded DO blocks through `query_database`; files in the pipeline repo
  (commits `63b48f3`, `e521b6c`, `f228fe4`). No schema, function, view, trigger, policy or grant changed.
- What:
  - `clinics.instagram_url` / `tiktok_url`: set on 104 of 184 listed clinics (101 Instagram, 36 TikTok) from the website
    crawl datasets already on disk. Only a handle the clinic's own page links to; each re-verified against the cited page.
    28 candidates rejected with reasons (platform boilerplate, embedded creators, theme vendor, other locations, a staff
    account, a parent organisation, a broken link to someone else's account). Sculpt Med Spa Instagram left empty: its
    homepage links three handles of equal standing. Provenance `field_provenance.instagram_url` / `.tiktok_url` =
    {source clinic_website_crawl, recorded_at, url (evidence page), detail (href, link text, dataset)}.
    `sql/2026-09-16_clinics_social_urls.sql`; decisions `data/clinics/social_decisions_2026-09-16.json`.
  - Four of those links cleared the same evening because the accounts do not exist (TikTok @socalsurgerycenter,
    @blossommedla, @msclinic5; Instagram massage_laser_moodspa). Old value kept under `field_provenance.*_cleared`.
    Now: Instagram 100, TikTok 33, either 104. `sql/2026-09-16_clinics_social_urls_dead_cleared.sql`.
  - `clinic_treatments`: +52 mappings on 21 listed clinics (543 -> 595), no prices, from the service menus in the same
    crawl. All 112 unmapped (clinic, treatment) pairs named on the clinics' own pages were read; 60 rejected with reasons
    (contraindication lists, FAQ and comparison copy, quoted reviews, template logins, topical Rejuran, devices already
    mapped). `sql/2026-09-16_clinic_treatments_menus.sql`; decisions
    `data/clinics/clinic_treatments_menus_decisions_2026-09-16.json`.
- Why: clinic page content from sources already paid for; no new crawl.
- Not applied: `sql/2026-09-16_clinic_videos_01..28.sql` (1,056 official videos). A parallel session had already
  inserted 1,366 `clinic_videos` rows at 22:06 UTC; applying these would duplicate them.
- Deleted session_ids: none. No rows deleted.

### 2026-09-16 21:50–22:30 UTC — clinic page structure: social links reconciled, official clinic videos, last Google photo cleared
- Who: skintea-pipeline session "clinic detail page: restore the structure, then fill it". No schema, function, view,
  trigger, grant or policy was created or changed. Deletions: only this session's own rows, listed below.
- `clinic_social_links` +47 rows (249 → 296, then −1 below: 295): every `clinics.instagram_url` /
  `clinics.tiktok_url` value with no link for that clinic and platform (38 Instagram, 9 TikTok; the other 90 already
  matched, 0 disagreed). One guarded DO block through `query_database` (expected count 47, source check, before/after
  count). Provenance copied from `clinics.field_provenance.<platform>_url` with `evidence_url`, `copied_from`,
  `copied_at`. `clinic_social_links` is now the one source of truth; no app code reads the two `clinics` columns (checked
  in `skinteateam-jpg/skintea-insight` at 7ae8f94), so they can be dropped by an owner decision. Not dropped.
- `clinic_videos` 0 → 1,366 → **1,087 rows** (854 Instagram videos on 85 clinics, 233 TikTok on 23; one listing per video),
  all `relationship = 'official'`. Source: each listed clinic's own account from `clinic_social_links`, Apify
  `apify/instagram-reel-scraper` run `knJozUzUpE5DHRBfR` (dataset `YvIK8njwhWHUFUuaF`, $2.6391) and
  `clockworks/tiktok-scraper` run `7vQJ77ioi0UnrRI9c` (dataset `9EuB4gAiLSK0LzLmF`, $1.09), 12 per profile. Generator
  `scripts/clinics/gen_clinic_videos_official.py` → `sql/2026-09-16_clinic_videos_official.sql` (md5 `ae86b7fb…`), INSERT
  only, run by the Lovable agent at 22:06 UTC (1,366 rows; distinct-URL md5 Instagram `397bdabb…`, TikTok `5673d7a6…`,
  equal to the local files). Not collected: 179 reels owned by another account (collabs/creators), 51 TikTok slideshows,
  14 profile errors. 15 TikTok rows carry `field_provenance.disclosure.platform_ad` (labelled "Ad"); `disclosed_paid` 0.
- **Deleted, this session's own rows only** (provenance run ids above), adopting the multi-location HELD rule of the
  parallel session (pipeline commit `8bb6ac2`): a video from an account that speaks for several locations cannot be tied to
  this listing. 231 rows for laseraway, heydayskincare, joinbhrc, schweigerderm, schweigerdermofficial, moov.health,
  skinlaundry, skinlaundryusa, metropolisdermatology, formulafig, sculptdtla, drseansatey, blossommedav, lineps_irvine
  (ids md5 in the query_database NOTICE), then 48 rows for drpearlgrimes and sculpt.medspa (one account, two listings).
  No session's rows but this one's were touched. The parallel session's 28 batches (`sql/2026-09-16_clinic_videos_NN.sql`)
  are not applied and must not be: the same videos are now stored.
- `clinic_social_links` −1, this session's own row: `massage_laser_moodspa` (account does not exist; both scrapes). Three
  other dead links (socalsurgerycenter, blossommedla, msclinic5 on TikTok) predate this session and were not touched.
- `clinics.photos` on Blo Blow Dry Bar (`12ef7214…`, listing_filter dropped): its single remaining
  `google_places_scrape` photo was cleared to `[]` (guarded: exactly one such clinic, one row updated). No clinic now holds a
  Google Places photo.
- Read-only findings reported, not changed: `clinic_photos_valid` still accepts `google_places_scrape` and has no
  per-section / results rule; no source value exists for a photo taken from a clinic's own website; `clinic_who_visited`
  rows that are not public cannot be counted below 5 visitors (only `clinic_visitor_profile` counts them); no table or
  column exists for a clinic's reply to a review; `enforce_review_integrity` does not cover `surprised_by` / `wish_known`
  on UPDATE; anon and authenticated hold INSERT/UPDATE/DELETE grants on `clinic_videos` and on the
  `clinic_visitor_profile` view (blocked by RLS / not updatable, but broader than needed).
- Apify spend: account cycle 2026-09-14 at 15.71 of 180 before these two runs (caps 5.00 + 3.00 USD), 22.59 after (other sessions ran in between); these runs 3.73.

### 2026-09-16 23:00 UTC — publish blockers, posting paths, Before & After consent, Derm verification
- Who: "publish-blockers and the dead posting paths" session.
- Schema:
  - `treatment_before_afters` CHECK `treatment_before_afters_consent_required`: a row with a before or after photo URL
    needs `field_provenance.consent.recorded_at` and `field_provenance.consent.granted_by` in (`patient`,
    `clinic_with_patient_consent`). Table had 0 rows. Tested (rolled back): sourced but no consent rejected; consent but no
    photo source rejected by the existing provenance trigger; sourced + consent accepted.
  - `profiles.field_provenance jsonb NOT NULL DEFAULT '{}'`; trigger `profiles_enforce_provenance` =
    `enforce_field_provenance('is_derm')`; `GRANT SELECT (field_provenance) ON profiles TO anon, authenticated` (no
    INSERT/UPDATE grant, so users cannot write it). 0 profiles had `is_derm = true`. Tested (rolled back): `is_derm = true`
    without provenance rejected, with provenance accepted, unrelated update accepted, a user writing their own
    `field_provenance` rejected. Keep verification detail free of personal identifiers (licence numbers etc.): anon reads it.
- No rows written or deleted. Composer checks (posts, saved_posts, surgery_posts + saves/likes/comments, product_posts)
  ran as a signed-in user inside a block that raised at the end, so nothing persisted.
- App changes in other sessions' files, kept minimal (skintea-insight `b48c6ab`, `3565fe6`, `be09c88`):
  `src/components/ClinicImage.tsx` (no category stock image in a clinic photo slot), `src/routes/clinics.index.tsx` (Top Rated
  / Most Reviewed disabled: Google-ordered), `src/routes/clinics/$id.tsx` (no clinic_who_visited query for anonymous
  visitors; the What people say video tabs had already been removed by the clinic-page session), `src/routes/surgery-talk.tsx`
  (Derm badge gate).
- Deleted session_ids: none.

### 2026-09-16 23:15 UTC — clinic_submissions.results_patient_authorization_at (Results photos need patient authorization)
- Who: pipeline session, /for-clinics photo categories (owner-approved).
- Why: /for-clinics now asks for a category per photo (Outside, Interior, Results, Staff, Parking; the category is in the
  stored file name, `pending/<id>/NN-<category>-<name>`, which the existing path regexes already accept). Results photos
  show patients, so the clinic must attest that every patient shown gave written authorization. No existing column fit.
- Schema (via query_database, one statement each; file `sql/2026-09-16_clinic_submissions_results_authorization.sql` in
  skintea-pipeline):
  - `ALTER TABLE public.clinic_submissions ADD COLUMN results_patient_authorization_at timestamptz` (nullable).
  - `GRANT INSERT (results_patient_authorization_at) ON public.clinic_submissions TO anon, authenticated`.
  - `ALTER POLICY "Anyone can submit a clinic intake"`: every existing clause kept verbatim, two added: the value is NULL or
    within 15 minutes of the server clock, and a photo path matching `/NN-results-` requires a non-NULL value.
- Verified in pg_catalog: column timestamptz nullable; INSERT column grant for anon and authenticated; policy expression
  contains the original four clauses plus the two new ones. Tested as `anon` inside a block that raised at the end: results
  photo without attestation rejected (42501); results photo attested now accepted; parking photo without attestation
  accepted; attestation 2 hours old rejected; a path without a category accepted. 0 rows persisted (checked).
- Note: the timestamp is the sender's clock at submission, bounded by the policy to ±15 minutes of the server; `created_at`
  and `permission_granted_at` remain the server times.
- Deleted session_ids: none.

### 2026-09-17 00:10 UTC — sign-up names off the API, author delete cleanup, saved_posts types, profiles DELETE grant
- Who: "last blockers before the owner click-through" session.
- `CREATE FUNCTION public.clinic_public_visitor_names(p_clinic uuid)` (SECURITY DEFINER, search_path public): user_id,
  name, username, avatar_url only for people with `clinic_who_visited.is_public` for that clinic (the "Show my name on
  this clinic's page" opt-in). EXECUTE revoked from PUBLIC and anon, granted to authenticated.
- `CREATE FUNCTION public.saved_posts_cleanup_on_post_delete()` + `AFTER DELETE` trigger on `posts`: removes
  `saved_posts` rows (post_type 'treatment') for the deleted post. `surgery_saves`, `surgery_likes`, `surgery_comments`
  already cascade from `surgery_posts`.
- `saved_posts_post_type_check` replaced: `post_type = 'treatment'` only (was skin_tea, look_tea, spill, treatment; 0 rows).
- `REVOKE DELETE ON public.profiles FROM anon, authenticated` (RLS already blocked it; no policy used it).
- Applied 00:20 UTC, before the app deploy (which is held behind another session's unreleased clinic-page work):
  `REVOKE SELECT (name) ON public.profiles FROM anon, authenticated`. The sign-up name is now readable only by the service
  role, by the user through their own auth record, and through `clinic_public_visitor_names` for the opt-in. The code still
  live selected `name` in four places; each degrades to no name (checked on production: Surgery Talk, a clinic page,
  Treatment Talk, a product page all load with no console error). INSERT/UPDATE (name) for authenticated are unchanged.
- Tested (rolled back): another user deleting an author's treatment / surgery / product post affects 0 rows; the author
  deletes each (1 row); the other user's saved treatment copy, surgery save and comment are gone afterwards; saved_posts
  type 'spill' rejected; deleting a profiles row denied.
- Deleted session_ids: none. No rows written.

### 2026-09-16 23:40 UTC (rows to 2026-09-17 00:05) — `treatment_videos` table (TikTok videos for treatment pages)
- Who: treatment-page video session (owner-approved schema, 2026-09-16).
- What: `CREATE TABLE public.treatment_videos` — videos showing what a treatment looks like, display material only.
  Columns: id, treatment_id (FK treatments), platform (`tiktok` only), platform_video_id (digits, unique per platform),
  source_url (GENERATED from the video id, so no handle can be stored), posted_at (platform's own time, nullable),
  disclosure text[] (allowlist ad, sponsored, gifted, pr_sample, brand_program, brand_owned, states_no_ad, invited,
  discount_code — this table only; social_review_tags unchanged), evidence (not null, rejects `@`, max 500), source
  (`scrape` | `owner_link`; scrape_run_id required for scrape, null for owner_link), display_approved (default false),
  display_slot (1–6), display_approved_at, created_at. Checks: approval, slot and approval time set together; unique
  (treatment_id, display_slot) where approved, so at most 6 displayed per treatment.
- No handle, username, display name, caption, follower, view or profile column. Clinic, injector and provider accounts
  are excluded before insert; their videos stay on clinic pages (`clinic_videos`, untouched).
- RLS enabled. `REVOKE ALL` from anon, authenticated; column SELECT (id, treatment_id, platform, platform_video_id,
  source_url, posted_at, disclosure, display_slot) to anon, authenticated; policy "Public reads approved treatment
  videos" (SELECT, using display_approved). No app-side write path. `sandbox_exec` keeps its default SELECT+INSERT.
- Not read by `treatmentReviews.ts`, `opinionAggregate.ts` or any count; never enters Worth it, floors or medians.
- Verified in pg_catalog (columns, 11 constraints, 3 indexes, policy, relacl, column ACLs). Tested in a block that
  raised at the end: duplicate slot, slot 7, `@` in evidence, scrape without run id, owner_link with run id, unknown
  disclosure and half approval rejected; invited/discount_code accepted; anon saw only the approved test row, was denied
  `evidence` and INSERT. 0 rows persisted (checked).
- Rows: 81 inserted, all display_approved = false (51 from the pilot on botox/morpheus8/hydrafacial, 30 from fillers,
  rejuran, skin-boosters), verified by md5 over every stored field. Video ids are kept out of this public file; the
  classification record is in the private pipeline repo.
- Deleted session_ids: none.

### 2026-09-16 (applied from Claude chat; recorded 2026-09-17) — clinic_intent_events checks for the restructured clinic page, server-stamped Results attestation
- Who: owner (Chi) via Claude chat. Recorded by the creator-videos session. Live and verified in pg_catalog; do NOT re-run.
- `clinic_intent_events_channel_check`: added `'youtube'` (Contact and links YouTube profile).
- `clinic_intent_events_surface_check`: added `'contact_links'` (Contact and links section) and `'clinic_posts'` (Videos
  section and its player).
- `clinic_intent_events_action_check`: added `'video_play'` (a tap that plays a clinic video inside Skintea).
- Function + trigger `clinic_submissions_stamp_results_authorization` (BEFORE INSERT on `clinic_submissions`): when
  `results_patient_authorization_at` is not null it is overwritten with `now()`. The client clock is never trusted.
  Verified: an anon insert with a client time 2 hours off was accepted and stored within 1 second of `now()`; rolled back,
  0 rows left. SQL: `sql/2026-09-16_clinic_submissions_results_authorization.sql` step 4 (pipeline repo).
- Deleted session_ids: none. No rows written.

### 2026-09-17 00:35–00:43 UTC — `clinic_videos` creator rows for Koreatown (70), thumbnails cached
- Who: creator-videos session (Chi's brief: fill "About this clinic" for the 52 listed Koreatown clinics).
- Rows: `clinic_videos` 1,087 → **1,157**: +70 `relationship = 'creator'` (51 Instagram, 19 TikTok; 15 clinics; 5
  `disclosed_paid`). INSERT only, run by the Lovable agent from `sql/2026-09-17_clinic_videos_creator_ktown.sql` (pipeline
  repo, md5 `bdee3433…`, upload ETag equal). Verified by query: key md5 over (clinic_id|source_url) Instagram `ee52600d…`,
  TikTok `f97fa585…` (equal to the local file); every row on a `passed` Koreatown clinic; official rows still 1,087.
- Source: Apify `apify/instagram-scraper` mentions feed of each clinic Instagram handle (run `cnek1tun2mNgvxLyj`, $0.49)
  and `clockworks/tiktok-scraper` video search by clinic name / name + LA / TikTok handle (run `CsDysdpha2jFVQr10`, $5.04);
  one-clinic tests $0.26. 350 candidates with a mechanical tie, every one read and decided
  (`data/clinics/clinic_videos_creator_ktown_decisions_2026-09-17.json`).
- `field_provenance`: views/likes/caption/author_handle `{published_source, url, recorded_at, detail}` (the shape the
  official rows use); `relationship {source: post_attribution, actor, run, dataset, signals[handle_tag|location_tag|caption_name]}`;
  `disclosure {paid_partnership_flag, signal, platform_ad}`; `thumbnail {source: platform_cdn, cdn_url}`.
- New server route `src/routes/api/public/cache-clinic-video-thumbnail.ts` (Lovable `dd528be`, allowlist fix `41a99bc`,
  md5 `34248142…`): pipeline-key only; stores creator-video thumbnails at `social-thumbnails/clinic-videos/<id>.<ext>` and
  UPDATEs `clinic_videos.thumbnail_url` (not a provenance-tracked column) to the public object. Run on the preview host:
  70 of 70 cached. Verified by JOIN against `storage.objects`: 70 objects exist, all non-empty (smallest 22,471 bytes),
  object name = row id.
- Deleted session_ids: none. No rows deleted.

### 2026-09-17 ~01:40 UTC — clinics: missing address / phone / hours / neighborhood / coordinates filled (15 listed clinics)
- Who: contact-fill session (Chi's brief "Fill missing address, phone, hours for listed clinics").
- What: guarded UPDATEs on 15 `passed` clinics, each only where the field was still empty, all-or-nothing, through
  `query_database` (postgres): `sql/2026-09-17_clinics_contact_fill_querydb.sql` (pipeline repo, md5 `0d6a904d…`).
  - 8 clinics had no address, phone, hours, neighborhood or coordinates: Beverly Wilshire Aesthetics, BHRC West Hollywood,
    BHRC West Los Angeles, Dr. Refresh Med Spa, Laureate Aesthetics, Me.LosAngeles Aesthetics, Skin Verse Medical Spa,
    The Skin Agency Beverly Hills. All five fields set; address, phone and neighborhood from each clinic's own page
    (`manual_web_check`, url + verbatim quote), coordinates from the US Census geocoder (`census_geocoder`, all exact
    matches with the same ZIP), hours as below.
  - 7 more got hours (and phone where it was empty): Seoul Clinic, Marina Medspa (+phone), NassifMD Medical Spa, Glow
    Aesthetic Center (+phone), My Botox LA Med Spa (+phone), True Jewel Cosmetic Center (+phone), Your Laser Skin Care (+phone).
  - Hours `[{day, hours}]`: from the clinic's own page; a day the site does not state (BWA Sat, Dr. Refresh Sun, NassifMD
    Sat/Sun) or states twice with different values (Glow Mon) was filled from Google Places, recorded in
    `field_provenance.hours.google_filled_days`. Your Laser Skin Care's site states no hours: all days `google_maps_scrape`
    (development-only).
- Google Places: Apify `compass/crawler-google-places`, 5 runs, $0.18 total (datasets in
  `data/clinics/contact_fill_2026-09-17/raw/`).
- Verified by query: md5 over id, every value written and every new provenance source/detail equals the local file
  (`595fb6de…`). Passed clinics without an address: 0. Without hours: 27 → 12 (no source states them; reasons in
  `data/clinics/contact_fill_2026-09-17/decisions.json`).
- Deleted session_ids: none. No rows deleted.

### 2026-09-17 20:25 UTC — clinic_treatments: 18 prices and 8 mappings read from the clinics' own websites
- Who: menu+price session (Chi's brief "Fill treatment menus and prices from clinic websites").
- What: one all-or-nothing `DO` block through `query_database` (postgres), 26 guarded statements —
  `sql/2026-09-17_clinic_treatments_menu_price.sql` in the pipeline repo, md5 `cc36e480…`, run exactly as committed.
  - 18 prices onto existing mappings (17 `UPDATE ... WHERE price_from IS NULL`) and 1 new mapping inserted with its
    price (R&J Medspa / laser-resurfacing). 7 clinics: Chungdam MS Clinic (botox $10/unit, PRP $400, RF microneedling
    $600, skin booster $300), Irene's Skintopia (laser resurfacing and Rejuran $650/session), Marina Medspa (botox
    $15/unit, HydraFacial $250/session — the non-member prices), NassifMD Medical Spa (PRP $700), R&J Medspa (CO2
    $500/session), Revive & Rejuvenate (botox $15/unit, filler $800/syringe), Skin Verse Medical Spa (botox $150,
    filler $750, IPL $250, CO2 $800 per area; peel $250 and PRP $650 per session).
  - 8 mappings with no price, each because the site names the treatment but publishes no standing price for it:
    BeyondSkin MedSpa, Giffen Health, Marina Medspa (IPL), Misarang Beauty & M Clinic, Polaris Medical Aesthetics,
    The Skin Agency Beverly Hills (chain-wide page, recorded as such), VIP Aesthetics, Vermont Med spa.
  - `field_provenance` per field: `{source: clinic_website_crawl, url, quote, detail, dataset, recorded_at}` — the exact
    page URL, the exact phrase the price came from, and the crawl date, as the price rules require. No price was written
    without an exact phrase on that clinic's own page.
  - Not written, recorded with the reason in `scripts/clinics/gen_menu_price_sql.py` `REJECT`: promotional and
    limited-time prices (Cleopatra, Sienna, Dermaster, Michelle's, Re:Lune, Sculpt), package- and membership-only
    pricing (IVE, Giffen, VIP, Formula Fig), unstated units (R&J botox "From $6"), general cost statements that are not
    the clinic's own price (NassifMD botox average, Skin Verse HydraFacial range, Vermont's Burlington VT quote), a
    booking-widget microsite (Viora), a site that contradicts itself (Irene's Scarlet SRF $750 vs $800), facial menu
    items that merely contain a peel or booster step, and template text.
- Source: Apify `apify/website-content-crawler`, cheerio, clinic sites only, 2026-09-17, dataset `Iuz9QJobeDAQR8Onb`,
  $0.40. No directory, no Google, no booking aggregator price, no other location of a chain.
- Verified by query, not by the tool's self-report: the 26 rows read back and md5-compared per row against the committed
  file (key, source, url, quote, detail, dataset, recorded_at) — all 26 identical; duplicate `(clinic_id, treatment_id)`
  pairs: 0. 9 rows inserted and 17 updated; `clinic_treatments` now 604 rows, 82 of them priced (was 64).
  Passed clinics with at least one price 22 → 29; with at least one mapping 98 → 100.
- Deleted session_ids: none. No rows deleted, no schema change.
