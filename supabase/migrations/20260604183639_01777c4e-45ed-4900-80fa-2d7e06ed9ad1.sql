
-- Add missing columns to clinics
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS distance_miles numeric,
  ADD COLUMN IF NOT EXISTS travel_minutes integer,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS skintea_score numeric,
  ADD COLUMN IF NOT EXISTS review_count integer,
  ADD COLUMN IF NOT EXISTS avg_score numeric,
  ADD COLUMN IF NOT EXISTS parking_available boolean,
  ADD COLUMN IF NOT EXISTS parking_notes text,
  ADD COLUMN IF NOT EXISTS parking_is_free boolean,
  ADD COLUMN IF NOT EXISTS hours jsonb,
  ADD COLUMN IF NOT EXISTS is_open_now boolean,
  ADD COLUMN IF NOT EXISTS closes_at text,
  ADD COLUMN IF NOT EXISTS photos jsonb;

-- clinic_skin_scores
CREATE TABLE IF NOT EXISTS public.clinic_skin_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  skin_type text,
  recommend_pct integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clinic_skin_scores TO anon, authenticated;
GRANT ALL ON public.clinic_skin_scores TO service_role;
ALTER TABLE public.clinic_skin_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Skin scores viewable by everyone" ON public.clinic_skin_scores FOR SELECT USING (true);

-- clinic_treatments
CREATE TABLE IF NOT EXISTS public.clinic_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  treatment_id uuid REFERENCES public.treatments(id) ON DELETE CASCADE,
  price_from integer,
  price_unit text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clinic_treatments TO anon, authenticated;
GRANT ALL ON public.clinic_treatments TO service_role;
ALTER TABLE public.clinic_treatments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic treatments viewable by everyone" ON public.clinic_treatments FOR SELECT USING (true);

-- treatment_influencers
CREATE TABLE IF NOT EXISTS public.treatment_influencers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id uuid REFERENCES public.treatments(id) ON DELETE CASCADE,
  handle text,
  display_name text,
  platform text,
  follower_count integer,
  profile_photo_url text,
  profile_url text,
  post_url text,
  sentiment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.treatment_influencers TO anon, authenticated;
GRANT ALL ON public.treatment_influencers TO service_role;
ALTER TABLE public.treatment_influencers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Influencers viewable by everyone" ON public.treatment_influencers FOR SELECT USING (true);

-- clinic_practitioners
CREATE TABLE IF NOT EXISTS public.clinic_practitioners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text,
  role text,
  specialty text,
  years_experience integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clinic_practitioners TO anon, authenticated;
GRANT ALL ON public.clinic_practitioners TO service_role;
ALTER TABLE public.clinic_practitioners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Practitioners viewable by everyone" ON public.clinic_practitioners FOR SELECT USING (true);

-- clinic_who_visited
CREATE TABLE IF NOT EXISTS public.clinic_who_visited (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  visited_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clinic_who_visited TO anon, authenticated;
GRANT INSERT ON public.clinic_who_visited TO authenticated;
GRANT ALL ON public.clinic_who_visited TO service_role;
ALTER TABLE public.clinic_who_visited ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visits viewable by everyone" ON public.clinic_who_visited FOR SELECT USING (true);
CREATE POLICY "Users can log their own visits" ON public.clinic_who_visited FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- clinic_reviews
CREATE TABLE IF NOT EXISTS public.clinic_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  treatment_id uuid REFERENCES public.treatments(id) ON DELETE SET NULL,
  skin_type text,
  body text,
  agree_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clinic_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.clinic_reviews TO authenticated;
GRANT ALL ON public.clinic_reviews TO service_role;
ALTER TABLE public.clinic_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews viewable by everyone" ON public.clinic_reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON public.clinic_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.clinic_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON public.clinic_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- consultation_clicks
CREATE TABLE IF NOT EXISTS public.consultation_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  clicked_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.consultation_clicks TO anon, authenticated;
GRANT SELECT ON public.consultation_clicks TO authenticated;
GRANT ALL ON public.consultation_clicks TO service_role;
ALTER TABLE public.consultation_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log consultation click" ON public.consultation_clicks FOR INSERT WITH CHECK (true);
