CREATE OR REPLACE FUNCTION public.random_active_products(
  p_category text DEFAULT NULL,
  p_subcategory text DEFAULT NULL,
  p_limit integer DEFAULT 60
)
RETURNS SETOF public.products
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT *
  FROM public.products
  WHERE is_active
    AND (p_category IS NULL OR category = p_category)
    AND (p_subcategory IS NULL OR subcategory = p_subcategory)
  ORDER BY random()
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 60), 1), 200)
$$;

GRANT EXECUTE ON FUNCTION public.random_active_products(text, text, integer) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.distinct_product_subcategories()
RETURNS TABLE (category text, subcategory text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT DISTINCT p.category, p.subcategory
  FROM public.products p
  WHERE p.is_active
    AND p.category IS NOT NULL
    AND p.subcategory IS NOT NULL
$$;

GRANT EXECUTE ON FUNCTION public.distinct_product_subcategories() TO anon, authenticated, service_role;