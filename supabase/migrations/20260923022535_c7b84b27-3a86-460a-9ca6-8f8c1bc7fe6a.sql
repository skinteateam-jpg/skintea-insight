ALTER TABLE public.quiz_responses
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS quiz_responses_user_created_idx
  ON public.quiz_responses (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

GRANT SELECT, UPDATE ON public.quiz_responses TO authenticated;
GRANT ALL ON public.quiz_responses TO service_role;

DROP POLICY IF EXISTS "Members can read own quiz responses" ON public.quiz_responses;
CREATE POLICY "Members can read own quiz responses"
ON public.quiz_responses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.claim_quiz_response(p_share_slug text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_changed integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_share_slug IS NULL OR length(btrim(p_share_slug)) < 6 THEN
    RETURN false;
  END IF;

  UPDATE public.quiz_responses
  SET user_id = v_uid
  WHERE share_slug = btrim(p_share_slug)
    AND (user_id IS NULL OR user_id = v_uid);
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  RETURN v_changed > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_quiz_response(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_quiz_response(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_quiz_response(text) TO service_role;

ALTER TABLE public.surgery_likes
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS visitor_id text;

ALTER TABLE public.surgery_likes
  DROP CONSTRAINT IF EXISTS surgery_likes_identity_check;
ALTER TABLE public.surgery_likes
  ADD CONSTRAINT surgery_likes_identity_check CHECK (
    (user_id IS NOT NULL AND visitor_id IS NULL)
    OR (user_id IS NULL AND visitor_id IS NOT NULL AND length(visitor_id) BETWEEN 16 AND 80)
  );

CREATE UNIQUE INDEX IF NOT EXISTS surgery_likes_post_visitor_key
  ON public.surgery_likes (post_id, visitor_id)
  WHERE visitor_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.toggle_surgery_like(p_post_id uuid, p_visitor_id text)
RETURNS TABLE(liked boolean, like_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_visitor text := nullif(btrim(p_visitor_id), '');
  v_exists boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.surgery_posts WHERE id = p_post_id) THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  IF v_uid IS NULL AND (v_visitor IS NULL OR length(v_visitor) < 16 OR length(v_visitor) > 80) THEN
    RAISE EXCEPTION 'Invalid visitor';
  END IF;

  IF v_uid IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.surgery_likes WHERE post_id = p_post_id AND user_id = v_uid
    ) INTO v_exists;
    IF v_exists THEN
      DELETE FROM public.surgery_likes WHERE post_id = p_post_id AND user_id = v_uid;
      liked := false;
    ELSE
      INSERT INTO public.surgery_likes (post_id, user_id, visitor_id)
      VALUES (p_post_id, v_uid, NULL);
      liked := true;
    END IF;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.surgery_likes WHERE post_id = p_post_id AND visitor_id = v_visitor
    ) INTO v_exists;
    IF v_exists THEN
      DELETE FROM public.surgery_likes WHERE post_id = p_post_id AND visitor_id = v_visitor;
      liked := false;
    ELSE
      INSERT INTO public.surgery_likes (post_id, user_id, visitor_id)
      VALUES (p_post_id, NULL, v_visitor);
      liked := true;
    END IF;
  END IF;

  SELECT count(*)::integer INTO like_count
  FROM public.surgery_likes
  WHERE post_id = p_post_id;
  RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.toggle_surgery_like(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_surgery_like(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.toggle_surgery_like(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_surgery_like(uuid, text) TO service_role;