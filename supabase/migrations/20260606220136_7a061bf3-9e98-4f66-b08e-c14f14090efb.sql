-- Treatment logs (real DB-backed Treatment Log)
CREATE TABLE public.treatment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  treatment_id uuid REFERENCES public.treatments(id) ON DELETE SET NULL,
  treatment_name text NOT NULL,
  category text,
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL,
  clinic_name text,
  cost text,
  date date,
  rating integer CHECK (rating BETWEEN 0 AND 5),
  notes text,
  fixed text[] NOT NULL DEFAULT '{}',
  working text[] NOT NULL DEFAULT '{}',
  is_public boolean NOT NULL DEFAULT false,
  emoji text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_logs TO authenticated;
GRANT SELECT ON public.treatment_logs TO anon;
GRANT ALL ON public.treatment_logs TO service_role;

ALTER TABLE public.treatment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own treatment logs"
  ON public.treatment_logs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public treatment logs viewable by anyone"
  ON public.treatment_logs FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

CREATE TRIGGER update_treatment_logs_updated_at
  BEFORE UPDATE ON public.treatment_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_treatment_logs_user ON public.treatment_logs(user_id);
CREATE INDEX idx_treatment_logs_public ON public.treatment_logs(is_public) WHERE is_public = true;

-- Saved clinics
CREATE TABLE public.saved_clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, clinic_id)
);

GRANT SELECT, INSERT, DELETE ON public.saved_clinics TO authenticated;
GRANT ALL ON public.saved_clinics TO service_role;

ALTER TABLE public.saved_clinics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own saved clinics"
  ON public.saved_clinics FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_saved_clinics_user ON public.saved_clinics(user_id);

-- Saved posts
CREATE TABLE public.saved_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  post_type text NOT NULL CHECK (post_type IN ('skin_tea','look_tea','spill','treatment')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

GRANT SELECT, INSERT, DELETE ON public.saved_posts TO authenticated;
GRANT ALL ON public.saved_posts TO service_role;

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own saved posts"
  ON public.saved_posts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_saved_posts_user ON public.saved_posts(user_id);

-- Username for public profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);