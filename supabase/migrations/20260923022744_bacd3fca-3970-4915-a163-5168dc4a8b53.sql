REVOKE ALL ON FUNCTION public.claim_quiz_response(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_quiz_response(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_quiz_response(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_quiz_response(text) TO service_role;

REVOKE ALL ON FUNCTION public.toggle_surgery_like(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_surgery_like(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.toggle_surgery_like(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_surgery_like(uuid, text) TO service_role;