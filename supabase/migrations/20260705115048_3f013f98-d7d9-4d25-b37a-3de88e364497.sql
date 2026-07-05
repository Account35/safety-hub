DROP POLICY IF EXISTS "Anyone can log missing translations" ON public.translation_fallback_log;

REVOKE INSERT ON public.translation_fallback_log FROM anon;

CREATE POLICY "Authenticated users can log missing translations"
  ON public.translation_fallback_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');