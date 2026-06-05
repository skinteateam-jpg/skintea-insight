ALTER TABLE public.treatments
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS what_it_is text,
  ADD COLUMN IF NOT EXISTS how_it_works text,
  ADD COLUMN IF NOT EXISTS who_its_for text,
  ADD COLUMN IF NOT EXISTS downtime text,
  ADD COLUMN IF NOT EXISTS average_cost text,
  ADD COLUMN IF NOT EXISTS sessions_recommended text,
  ADD COLUMN IF NOT EXISTS majority_pct integer,
  ADD COLUMN IF NOT EXISTS results_pct integer,
  ADD COLUMN IF NOT EXISTS minority_opinion text,
  ADD COLUMN IF NOT EXISTS celebrity_handles text[];