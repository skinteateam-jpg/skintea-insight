ALTER TABLE public.retailers
  ADD COLUMN IF NOT EXISTS network text,
  ADD COLUMN IF NOT EXISTS notes text;