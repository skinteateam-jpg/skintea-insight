REVOKE ALL ON FUNCTION public.toggle_surgery_like(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_surgery_like(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.toggle_surgery_like(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_surgery_like(uuid, text) TO service_role;