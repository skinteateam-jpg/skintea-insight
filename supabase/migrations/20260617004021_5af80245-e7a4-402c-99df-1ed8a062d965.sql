
CREATE TABLE IF NOT EXISTS public.shelf_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  brand text,
  category text NOT NULL DEFAULT 'Other',
  emoji text,
  match text,
  image_url text,
  is_top_pick boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shelf_items TO authenticated;
GRANT SELECT ON public.shelf_items TO anon;
GRANT ALL ON public.shelf_items TO service_role;

ALTER TABLE public.shelf_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own shelf items"
  ON public.shelf_items FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public shelf items are viewable"
  ON public.shelf_items FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

CREATE TRIGGER shelf_items_updated_at
  BEFORE UPDATE ON public.shelf_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_shelf_items_user ON public.shelf_items(user_id);

CREATE TABLE IF NOT EXISTS public.gift_wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  brand text,
  category text,
  emoji text,
  image_url text,
  affiliate_url text,
  affiliate_store text,
  type text NOT NULL CHECK (type IN ('skincare', 'makeup')),
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gift_wishlist TO authenticated;
GRANT SELECT ON public.gift_wishlist TO anon;
GRANT ALL ON public.gift_wishlist TO service_role;

ALTER TABLE public.gift_wishlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own wishlist"
  ON public.gift_wishlist FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public wishlist items are viewable"
  ON public.gift_wishlist FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

CREATE TRIGGER gift_wishlist_updated_at
  BEFORE UPDATE ON public.gift_wishlist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_gift_wishlist_user ON public.gift_wishlist(user_id);
