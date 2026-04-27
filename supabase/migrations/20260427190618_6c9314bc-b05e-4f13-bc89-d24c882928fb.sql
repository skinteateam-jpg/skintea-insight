
CREATE POLICY "Admins can insert treatments"
ON public.treatments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true)
);

CREATE POLICY "Admins can update treatments"
ON public.treatments
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true)
);

CREATE POLICY "Admins can delete treatments"
ON public.treatments
FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true)
);
