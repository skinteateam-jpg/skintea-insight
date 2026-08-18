CREATE TABLE public.celebrity_mentions (
  id uuid primary key default gen_random_uuid(),
  treatment_id uuid not null references public.treatments(id) on delete cascade,
  celeb_name text not null,
  quote text not null,
  source_name text not null,
  source_url text not null,
  source_year int,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
CREATE INDEX celebrity_mentions_treatment_idx ON public.celebrity_mentions(treatment_id);
GRANT SELECT ON public.celebrity_mentions TO anon;
GRANT SELECT ON public.celebrity_mentions TO authenticated;
GRANT ALL ON public.celebrity_mentions TO service_role;
ALTER TABLE public.celebrity_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Celebrity mentions are publicly readable" ON public.celebrity_mentions FOR SELECT TO anon, authenticated USING (active);

INSERT INTO public.celebrity_mentions (treatment_id, celeb_name, quote, source_name, source_url, source_year)
SELECT id, 'Kylie Jenner',
 'She recently revealed that she is no longer using temporary fillers to enhance her famous pout. In May 2015, she admitted after much speculation that she had enhanced her lips with temporary fillers.',
 'Good Morning America / Vogue Australia',
 'https://www.goodmorningamerica.com/culture/story/kylie-jenner-turned-lip-obsession-billion-dollar-business-57448509',
 2018
FROM public.treatments WHERE name = 'Fillers';