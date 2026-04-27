-- ============ SURGERIES ============
CREATE TABLE public.surgeries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.surgeries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Surgeries are viewable by everyone"
  ON public.surgeries FOR SELECT USING (true);
CREATE POLICY "Admins can insert surgeries"
  ON public.surgeries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true));
CREATE POLICY "Admins can update surgeries"
  ON public.surgeries FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true));
CREATE POLICY "Admins can delete surgeries"
  ON public.surgeries FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true));

CREATE TRIGGER update_surgeries_updated_at
  BEFORE UPDATE ON public.surgeries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ENUMS ============
CREATE TYPE public.surgery_outcome AS ENUM ('Would do again', 'Modified', 'Wouldn''t');
CREATE TYPE public.surgery_skin_type AS ENUM ('Oily', 'Dry', 'Combination', 'Sensitive', 'Normal');

-- ============ SURGERY POSTS ============
CREATE TABLE public.surgery_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  surgery_id uuid REFERENCES public.surgeries(id) ON DELETE SET NULL,
  clinic_name text,
  country text,
  city text,
  total_cost text,
  recovery_time text,
  pain_level integer CHECK (pain_level >= 1 AND pain_level <= 10),
  my_thoughts_vs_reality text,
  struggle text,
  what_happened text,
  surprised_me text,
  works_for text,
  warn_if text,
  outcome public.surgery_outcome,
  hashtags text[] NOT NULL DEFAULT '{}',
  skin_type public.surgery_skin_type,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  comments_open boolean NOT NULL DEFAULT true,
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.surgery_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Surgery posts viewable by everyone"
  ON public.surgery_posts FOR SELECT USING (true);
CREATE POLICY "Users can create their own surgery posts"
  ON public.surgery_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own surgery posts"
  ON public.surgery_posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own surgery posts"
  ON public.surgery_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_surgery_posts_surgery_id ON public.surgery_posts(surgery_id);
CREATE INDEX idx_surgery_posts_created_at ON public.surgery_posts(created_at DESC);
CREATE INDEX idx_surgery_posts_user_id ON public.surgery_posts(user_id);

CREATE TRIGGER update_surgery_posts_updated_at
  BEFORE UPDATE ON public.surgery_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SURGERY COMMENTS ============
CREATE TABLE public.surgery_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.surgery_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.surgery_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Surgery comments viewable by everyone"
  ON public.surgery_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments when comments are open"
  ON public.surgery_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.surgery_posts p WHERE p.id = post_id AND p.comments_open = true)
  );
CREATE POLICY "Users can update their own comments"
  ON public.surgery_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments"
  ON public.surgery_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_surgery_comments_post_id ON public.surgery_comments(post_id);

-- ============ SURGERY LIKES ============
CREATE TABLE public.surgery_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.surgery_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
ALTER TABLE public.surgery_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Surgery likes viewable by everyone"
  ON public.surgery_likes FOR SELECT USING (true);
CREATE POLICY "Users can like posts"
  ON public.surgery_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike their own likes"
  ON public.surgery_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_surgery_likes_post_id ON public.surgery_likes(post_id);

-- Trigger to keep likes_count in sync
CREATE OR REPLACE FUNCTION public.surgery_likes_count_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.surgery_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.surgery_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER surgery_likes_count_ins
  AFTER INSERT ON public.surgery_likes
  FOR EACH ROW EXECUTE FUNCTION public.surgery_likes_count_trigger();
CREATE TRIGGER surgery_likes_count_del
  AFTER DELETE ON public.surgery_likes
  FOR EACH ROW EXECUTE FUNCTION public.surgery_likes_count_trigger();

-- ============ SURGERY SAVES ============
CREATE TABLE public.surgery_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.surgery_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
ALTER TABLE public.surgery_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saves"
  ON public.surgery_saves FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can save posts"
  ON public.surgery_saves FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave their own saves"
  ON public.surgery_saves FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_surgery_saves_post_id ON public.surgery_saves(post_id);

-- ============ SEED SURGERIES ============
INSERT INTO public.surgeries (name, category, sort_order) VALUES
  ('Rhinoplasty (Nose Job)', 'Face', 10),
  ('Upper Blepharoplasty', 'Face', 20),
  ('Lower Blepharoplasty', 'Face', 30),
  ('Double Eyelid Surgery', 'Face', 40),
  ('Facelift', 'Face', 50),
  ('Mini Facelift', 'Face', 60),
  ('Fat Grafting', 'Face', 70),
  ('Buccal Fat Removal', 'Face', 80),
  ('Chin Implant', 'Face', 90),
  ('Jaw Reduction', 'Face', 100),
  ('Forehead Reduction', 'Face', 110),
  ('Hairline Lowering', 'Face', 120),
  ('Ear Pinning', 'Face', 130),
  ('BBL', 'Body', 200),
  ('Liposuction', 'Body', 210),
  ('Abdominoplasty', 'Body', 220),
  ('Breast Augmentation', 'Body', 230),
  ('Breast Lift', 'Body', 240);