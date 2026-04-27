CREATE TABLE public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  neighborhood TEXT,
  address TEXT,
  yelp_rating NUMERIC,
  yelp_review_count INT,
  trust_score INT,
  price_tier TEXT,
  price_from INT,
  best_for TEXT[] DEFAULT '{}',
  tea_quote TEXT,
  tea_skin_type TEXT,
  badges TEXT[] DEFAULT '{}',
  image_url TEXT,
  booking_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinics are viewable by everyone"
  ON public.clinics FOR SELECT USING (true);

CREATE POLICY "Admins can insert clinics"
  ON public.clinics FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true));

CREATE POLICY "Admins can update clinics"
  ON public.clinics FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true));

CREATE POLICY "Admins can delete clinics"
  ON public.clinics FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true));

CREATE TRIGGER update_clinics_updated_at
  BEFORE UPDATE ON public.clinics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();