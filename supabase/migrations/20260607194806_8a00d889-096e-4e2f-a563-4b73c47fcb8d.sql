CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id text NOT NULL UNIQUE,
  case_id uuid NOT NULL,
  case_type text NOT NULL CHECK (case_type IN ('wanted','missing')),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_anon_code text NOT NULL,
  reporting_methods text[] NOT NULL DEFAULT '{}',
  sighting_date date,
  sighting_time time,
  location_approximate jsonb,
  location_township text,
  location_landmarks text[] NOT NULL DEFAULT '{}',
  location_privacy_level text NOT NULL DEFAULT 'township' CHECK (location_privacy_level IN ('township','neighborhood','landmark')),
  text_description text,
  companion_description text,
  confidence_level integer CHECK (confidence_level BETWEEN 1 AND 5),
  voice_recording_path text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  safety_acknowledgment boolean NOT NULL DEFAULT false,
  accuracy_confirmed boolean NOT NULL DEFAULT false,
  voluntary_confirmed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','investigated','resolved')),
  submission_timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT INSERT ON public.reports TO anon;
GRANT ALL ON public.reports TO service_role;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reports: anyone can submit"
  ON public.reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    safety_acknowledgment = true
    AND accuracy_confirmed = true
    AND voluntary_confirmed = true
    AND (reporter_id IS NULL OR reporter_id = auth.uid())
  );

CREATE POLICY "Reports: users view own"
  ON public.reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

CREATE INDEX reports_case_idx ON public.reports (case_type, case_id);
CREATE INDEX reports_reporter_idx ON public.reports (reporter_id) WHERE reporter_id IS NOT NULL;
CREATE INDEX reports_status_idx ON public.reports (status, submission_timestamp DESC);

CREATE TRIGGER reports_set_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();