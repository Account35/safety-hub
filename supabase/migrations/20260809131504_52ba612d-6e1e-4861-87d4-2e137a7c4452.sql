-- ═══════════════════════════════════════════════════════════
-- 1. CRIME STATISTICS
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.crime_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  township text NOT NULL,
  category text NOT NULL,
  incident_count integer NOT NULL DEFAULT 0,
  trend text NOT NULL DEFAULT 'stable',
  period_label text NOT NULL DEFAULT 'Last 30 days',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (township, category, period_label)
);

GRANT SELECT ON public.crime_stats TO anon;
GRANT SELECT ON public.crime_stats TO authenticated;
GRANT ALL ON public.crime_stats TO service_role;

ALTER TABLE public.crime_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Crime stats are public" ON public.crime_stats
  FOR SELECT USING (true);
CREATE POLICY "Admins manage crime stats" ON public.crime_stats
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER crime_stats_set_updated_at
  BEFORE UPDATE ON public.crime_stats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════
-- 2. POLICE STATIONS
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.police_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  phone text,
  township text NOT NULL,
  province text,
  is_24_hour boolean NOT NULL DEFAULT true,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.police_stations TO anon;
GRANT SELECT ON public.police_stations TO authenticated;
GRANT ALL ON public.police_stations TO service_role;

ALTER TABLE public.police_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stations are public" ON public.police_stations
  FOR SELECT USING (true);
CREATE POLICY "Admins manage stations" ON public.police_stations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER police_stations_set_updated_at
  BEFORE UPDATE ON public.police_stations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════
-- 3. REWARDS (eligibility + claims)
-- ═══════════════════════════════════════════════════════════
DO $$ BEGIN
  CREATE TYPE public.eligibility_status AS ENUM ('eligible', 'claimed', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.claim_status AS ENUM ('submitted', 'verifying', 'approved', 'paid', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method_type AS ENUM ('bank_transfer', 'mobile_money', 'cash_pickup');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.reward_eligibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_anon_code text NOT NULL,
  case_id uuid NOT NULL,
  case_type text NOT NULL,
  reward_amount numeric NOT NULL DEFAULT 0,
  eligibility_status public.eligibility_status NOT NULL DEFAULT 'eligible',
  claim_deadline timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id)
);

GRANT SELECT, UPDATE ON public.reward_eligibility TO authenticated;
GRANT ALL ON public.reward_eligibility TO service_role;

ALTER TABLE public.reward_eligibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporters read own eligibility" ON public.reward_eligibility
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage eligibility" ON public.reward_eligibility
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER reward_eligibility_set_updated_at
  BEFORE UPDATE ON public.reward_eligibility
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id text NOT NULL UNIQUE,
  eligibility_id uuid NOT NULL REFERENCES public.reward_eligibility(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_anon_code text NOT NULL,
  reward_amount numeric NOT NULL DEFAULT 0,
  identity_confirmation jsonb NOT NULL DEFAULT '{}'::jsonb,
  payment_method public.payment_method_type NOT NULL,
  payment_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  claim_status public.claim_status NOT NULL DEFAULT 'submitted',
  rejection_reason text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.reward_claims TO authenticated;
GRANT ALL ON public.reward_claims TO service_role;

ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Claimants read own claims" ON public.reward_claims
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Claimants create own claims" ON public.reward_claims
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage claims" ON public.reward_claims
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER reward_claims_set_updated_at
  BEFORE UPDATE ON public.reward_claims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════
-- 4. ADMIN CASE MANAGEMENT WRITE POLICIES
-- ═══════════════════════════════════════════════════════════
CREATE POLICY "Admins manage wanted persons" ON public.wanted_persons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage missing persons" ON public.missing_persons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════
-- 5. ADMIN REPORT TRIAGE
-- ═══════════════════════════════════════════════════════════
CREATE POLICY "Investigators read all reports" ON public.reports
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'detective')
    OR public.has_role(auth.uid(), 'analyst')
  );

GRANT UPDATE ON public.reports TO authenticated;

CREATE POLICY "Investigators update report status" ON public.reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'detective'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'detective'));

CREATE POLICY "Investigators read report analysis" ON public.report_ai_analysis
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'detective')
    OR public.has_role(auth.uid(), 'analyst')
  );

-- ═══════════════════════════════════════════════════════════
-- 6. REALTIME
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.reports REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════
-- 7. SEED DATA
-- ═══════════════════════════════════════════════════════════
INSERT INTO public.police_stations (name, address, phone, township, province, is_24_hour, lat, lng) VALUES
  ('Johannesburg Central SAPS', '1 Commissioner Street, Johannesburg', '011 497 7000', 'Johannesburg Central', 'Gauteng', true, -26.2041, 28.0473),
  ('Alexandra SAPS', '1st Avenue, Alexandra', '011 321 7600', 'Alexandra, Johannesburg', 'Gauteng', true, -26.1036, 28.0900),
  ('Diepsloot SAPS', 'Ingonyama Street, Diepsloot', '011 801 8000', 'Diepsloot, Johannesburg', 'Gauteng', true, -25.9333, 27.9667),
  ('Eldorado Park SAPS', 'Link Road, Eldorado Park', '011 945 4300', 'Eldorado Park, Johannesburg', 'Gauteng', true, -26.2833, 27.8833),
  ('Orlando SAPS', 'Mooki Street, Orlando East, Soweto', '011 936 5000', 'Orlando, Soweto', 'Gauteng', true, -26.2400, 27.9200),
  ('Diepkloof SAPS', 'Immink Drive, Diepkloof, Soweto', '011 936 8000', 'Diepkloof, Soweto', 'Gauteng', true, -26.2450, 27.9500),
  ('Dobsonville SAPS', 'Elias Motsoaledi Road, Dobsonville', '011 690 5000', 'Dobsonville, Soweto', 'Gauteng', true, -26.2333, 27.8500),
  ('Katlehong SAPS', 'Khumalo Street, Katlehong', '011 861 5000', 'Katlehong, Ekurhuleni', 'Gauteng', true, -26.3333, 28.1500),
  ('Daveyton SAPS', 'Eiselen Street, Daveyton', '011 573 5000', 'Daveyton, Ekurhuleni', 'Gauteng', true, -26.1500, 28.4167),
  ('Tembisa SAPS', 'Andrew Mapheto Drive, Tembisa', '011 928 6000', 'Tembisa, Ekurhuleni', 'Gauteng', true, -26.0000, 28.2167),
  ('Mamelodi East SAPS', 'Tsamaya Road, Mamelodi', '012 841 7000', 'Mamelodi, Pretoria', 'Gauteng', true, -25.7167, 28.4000),
  ('Atteridgeville SAPS', 'Komane Street, Atteridgeville', '012 375 0000', 'Atteridgeville, Pretoria', 'Gauteng', true, -25.7667, 28.0667),
  ('Mabopane SAPS', 'Block A, Mabopane', '012 799 0000', 'Mabopane, Pretoria', 'Gauteng', true, -25.5000, 28.1000),
  ('Khayelitsha SAPS', 'Steve Biko Road, Khayelitsha', '021 360 1600', 'Khayelitsha, Cape Town', 'Western Cape', true, -34.0400, 18.6800),
  ('Gugulethu SAPS', 'NY1, Gugulethu', '021 661 8000', 'Gugulethu, Cape Town', 'Western Cape', true, -33.9800, 18.5700),
  ('Mitchells Plain SAPS', 'AZ Berman Drive, Mitchells Plain', '021 370 1600', 'Mitchells Plain, Cape Town', 'Western Cape', true, -34.0350, 18.6180),
  ('Langa SAPS', 'Washington Street, Langa', '021 694 7100', 'Langa, Cape Town', 'Western Cape', true, -33.9450, 18.5300),
  ('Cape Town Central SAPS', 'Buitenkant Street, Cape Town', '021 467 8000', 'Cape Town Central', 'Western Cape', true, -33.9249, 18.4241),
  ('Umlazi SAPS', 'Mangosuthu Highway, Umlazi', '031 907 4000', 'Mlazi, Durban', 'KwaZulu-Natal', true, -29.9667, 30.8833),
  ('KwaMashu SAPS', 'Bhejane Road, KwaMashu', '031 503 4000', 'KwaMashu, Durban', 'KwaZulu-Natal', true, -29.7333, 30.9833),
  ('Inanda SAPS', 'Inanda Road, Inanda', '031 519 3000', 'Inanda, Durban', 'KwaZulu-Natal', true, -29.7000, 30.9500),
  ('Durban Central SAPS', 'Stalwart Simelane Street, Durban', '031 325 4000', 'Durban Central', 'KwaZulu-Natal', true, -29.8587, 31.0218),
  ('Mdantsane SAPS', 'Billie Road, Mdantsane', '043 761 1000', 'Mdantsane, East London', 'Eastern Cape', true, -32.9500, 27.7500),
  ('Galeshewe SAPS', 'Phakamile Mabija Road, Galeshewe', '053 830 5000', 'Galeshewe, Kimberley', 'Northern Cape', true, -28.7167, 24.7333);

INSERT INTO public.crime_stats (township, category, incident_count, trend, period_label) VALUES
  ('Alexandra, Johannesburg', 'Assault', 184, 'up', 'Last 30 days'),
  ('Alexandra, Johannesburg', 'Robbery', 142, 'down', 'Last 30 days'),
  ('Alexandra, Johannesburg', 'Burglary', 97, 'stable', 'Last 30 days'),
  ('Alexandra, Johannesburg', 'Vehicle theft', 61, 'down', 'Last 30 days'),
  ('Alexandra, Johannesburg', 'Missing persons', 12, 'stable', 'Last 30 days'),
  ('Khayelitsha, Cape Town', 'Assault', 246, 'up', 'Last 30 days'),
  ('Khayelitsha, Cape Town', 'Robbery', 198, 'up', 'Last 30 days'),
  ('Khayelitsha, Cape Town', 'Burglary', 133, 'down', 'Last 30 days'),
  ('Khayelitsha, Cape Town', 'Vehicle theft', 54, 'stable', 'Last 30 days'),
  ('Khayelitsha, Cape Town', 'Missing persons', 21, 'up', 'Last 30 days'),
  ('Mlazi, Durban', 'Assault', 201, 'stable', 'Last 30 days'),
  ('Mlazi, Durban', 'Robbery', 165, 'down', 'Last 30 days'),
  ('Mlazi, Durban', 'Burglary', 118, 'down', 'Last 30 days'),
  ('Mlazi, Durban', 'Vehicle theft', 47, 'stable', 'Last 30 days'),
  ('Mlazi, Durban', 'Missing persons', 15, 'stable', 'Last 30 days'),
  ('Mamelodi, Pretoria', 'Assault', 173, 'down', 'Last 30 days'),
  ('Mamelodi, Pretoria', 'Robbery', 128, 'stable', 'Last 30 days'),
  ('Mamelodi, Pretoria', 'Burglary', 104, 'up', 'Last 30 days'),
  ('Mamelodi, Pretoria', 'Vehicle theft', 52, 'down', 'Last 30 days'),
  ('Mamelodi, Pretoria', 'Missing persons', 9, 'stable', 'Last 30 days'),
  ('Soweto', 'Assault', 312, 'up', 'Last 30 days'),
  ('Soweto', 'Robbery', 267, 'stable', 'Last 30 days'),
  ('Soweto', 'Burglary', 189, 'down', 'Last 30 days'),
  ('Soweto', 'Vehicle theft', 96, 'up', 'Last 30 days'),
  ('Soweto', 'Missing persons', 27, 'stable', 'Last 30 days'),
  ('Gugulethu, Cape Town', 'Assault', 158, 'stable', 'Last 30 days'),
  ('Gugulethu, Cape Town', 'Robbery', 121, 'up', 'Last 30 days'),
  ('Gugulethu, Cape Town', 'Burglary', 88, 'stable', 'Last 30 days'),
  ('Gugulethu, Cape Town', 'Vehicle theft', 39, 'down', 'Last 30 days'),
  ('Gugulethu, Cape Town', 'Missing persons', 11, 'stable', 'Last 30 days'),
  ('Katlehong, Ekurhuleni', 'Assault', 167, 'down', 'Last 30 days'),
  ('Katlehong, Ekurhuleni', 'Robbery', 139, 'stable', 'Last 30 days'),
  ('Katlehong, Ekurhuleni', 'Burglary', 92, 'up', 'Last 30 days'),
  ('Katlehong, Ekurhuleni', 'Vehicle theft', 58, 'stable', 'Last 30 days'),
  ('Katlehong, Ekurhuleni', 'Missing persons', 8, 'down', 'Last 30 days'),
  ('Mdantsane, East London', 'Assault', 121, 'stable', 'Last 30 days'),
  ('Mdantsane, East London', 'Robbery', 84, 'down', 'Last 30 days'),
  ('Mdantsane, East London', 'Burglary', 73, 'stable', 'Last 30 days'),
  ('Mdantsane, East London', 'Vehicle theft', 26, 'down', 'Last 30 days'),
  ('Mdantsane, East London', 'Missing persons', 6, 'stable', 'Last 30 days');