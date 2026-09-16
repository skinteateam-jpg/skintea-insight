CREATE POLICY "Admins can insert retailers" ON public.retailers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true));
CREATE POLICY "Admins can update retailers" ON public.retailers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true));
CREATE POLICY "Admins can delete retailers" ON public.retailers FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true));

CREATE POLICY "Admins can insert brand retailers" ON public.brand_retailers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true));
CREATE POLICY "Admins can delete brand retailers" ON public.brand_retailers FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true));

CREATE POLICY "Admins can insert product retailer links" ON public.product_retailer_links FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true));
CREATE POLICY "Admins can update product retailer links" ON public.product_retailer_links FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true));
CREATE POLICY "Admins can delete product retailer links" ON public.product_retailer_links FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true));

GRANT INSERT, UPDATE, DELETE ON public.retailers TO authenticated;
GRANT INSERT, DELETE ON public.brand_retailers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_retailer_links TO authenticated;