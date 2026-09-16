CREATE TABLE public.retailers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  logo_url text,
  search_url_template text,
  affiliate_id text,
  affiliate_param_template text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.retailers TO anon, authenticated;
GRANT ALL ON public.retailers TO service_role;
ALTER TABLE public.retailers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Retailers are publicly readable" ON public.retailers FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.brand_retailers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand text NOT NULL,
  retailer_id uuid NOT NULL REFERENCES public.retailers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand, retailer_id)
);
GRANT SELECT ON public.brand_retailers TO anon, authenticated;
GRANT ALL ON public.brand_retailers TO service_role;
ALTER TABLE public.brand_retailers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brand retailers are publicly readable" ON public.brand_retailers FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.product_retailer_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  retailer_id uuid NOT NULL REFERENCES public.retailers(id) ON DELETE CASCADE,
  product_url text,
  affiliate_url text,
  price numeric,
  in_stock boolean NOT NULL DEFAULT true,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, retailer_id)
);
GRANT SELECT ON public.product_retailer_links TO anon, authenticated;
GRANT ALL ON public.product_retailer_links TO service_role;
ALTER TABLE public.product_retailer_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product retailer links are publicly readable" ON public.product_retailer_links FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.outbound_clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  retailer_id uuid REFERENCES public.retailers(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  link_type text NOT NULL CHECK (link_type IN ('affiliate', 'direct', 'search')),
  source_page text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.outbound_clicks TO anon, authenticated;
GRANT ALL ON public.outbound_clicks TO service_role;
ALTER TABLE public.outbound_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can record an outbound click" ON public.outbound_clicks FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE INDEX idx_product_retailer_links_product ON public.product_retailer_links(product_id);
CREATE INDEX idx_brand_retailers_brand ON public.brand_retailers(brand);
CREATE INDEX idx_outbound_clicks_created_at ON public.outbound_clicks(created_at DESC);

CREATE TRIGGER update_retailers_updated_at BEFORE UPDATE ON public.retailers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_product_retailer_links_updated_at BEFORE UPDATE ON public.product_retailer_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();