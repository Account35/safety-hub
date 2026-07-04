
-- Explicit deny for authenticated on report_ai_analysis (service_role bypasses RLS)
CREATE POLICY "no authenticated access" ON public.report_ai_analysis
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Trigger function does not need elevated privileges
CREATE OR REPLACE FUNCTION public.validate_campaign()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  t text;
BEGIN
  IF char_length(NEW.title) < 5 OR char_length(NEW.title) > 80 THEN
    RAISE EXCEPTION 'Title must be 5-80 characters';
  END IF;
  IF char_length(NEW.body_content) < 10 OR char_length(NEW.body_content) > 500 THEN
    RAISE EXCEPTION 'Body must be 10-500 characters';
  END IF;
  IF NEW.campaign_type IN ('missing_person_alert','wanted_person_alert') AND NEW.case_id IS NULL THEN
    RAISE EXCEPTION 'Alert campaigns require a case_id';
  END IF;
  IF NEW.status = 'scheduled' AND NEW.scheduled_send_timestamp < now() + interval '15 minutes' THEN
    NEW.scheduled_send_timestamp := now() + interval '15 minutes';
  END IF;
  IF array_length(NEW.target_townships, 1) IS NOT NULL THEN
    FOREACH t IN ARRAY NEW.target_townships LOOP
      IF NOT EXISTS (SELECT 1 FROM public.townships_ref WHERE name = t) THEN
        RAISE EXCEPTION 'Unknown township: %', t;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
