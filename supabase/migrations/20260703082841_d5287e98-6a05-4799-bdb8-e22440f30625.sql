
-- Phase 7: AI analysis + Campaigns
-- ARCHITECTURAL CONSTRAINT: All report_ai_analysis access uses report_id/reporter_id only.
-- Never join to profiles / user_id / identity_confirmation.

-- Enums
CREATE TYPE public.analysis_status AS ENUM ('pending','complete','partial','failed');
CREATE TYPE public.quality_tier AS ENUM ('detailed','standard','limited');
CREATE TYPE public.cluster_confidence AS ENUM ('high','medium');
CREATE TYPE public.cluster_role AS ENUM ('primary','supporting');
CREATE TYPE public.campaign_type AS ENUM ('safety_tip','missing_person_alert','wanted_person_alert','general_announcement');
CREATE TYPE public.campaign_status AS ENUM ('draft','scheduled','sent','cancelled');
CREATE TYPE public.campaign_audience AS ENUM ('all_users','registered_only');

-- Townships reference (seeded from Phase 3 canonical list)
CREATE TABLE public.townships_ref (
  name text PRIMARY KEY
);
GRANT SELECT ON public.townships_ref TO authenticated, anon;
GRANT ALL ON public.townships_ref TO service_role;
ALTER TABLE public.townships_ref ENABLE ROW LEVEL SECURITY;
CREATE POLICY "townships_ref readable" ON public.townships_ref FOR SELECT USING (true);

INSERT INTO public.townships_ref (name) VALUES
('Alexandra, Johannesburg'),('Atteridgeville, Pretoria'),('Belhar, Cape Town'),
('Bloemfontein Central'),('Botshabelo, Free State'),('Bridgetown, Cape Town'),
('Centurion, Pretoria'),('Chatsworth, Durban'),('Daveyton, Ekurhuleni'),
('Diepkloof, Soweto'),('Diepsloot, Johannesburg'),('Dobsonville, Soweto'),
('Durban Central'),('East London Central'),('Eldorado Park, Johannesburg'),
('Embalenhle, Mpumalanga'),('Etwatwa, Ekurhuleni'),('Galeshewe, Kimberley'),
('Gugulethu, Cape Town'),('Hammanskraal, Pretoria'),('Inanda, Durban'),
('KaNyamazane, Mpumalanga'),('Katlehong, Ekurhuleni'),('Kayamandi, Stellenbosch'),
('Khayelitsha, Cape Town'),('Kimberley Central'),('Kraaifontein, Cape Town'),
('Kwa-Thema, Springs'),('KwaMashu, Durban'),('Lamontville, Durban'),
('Langa, Cape Town'),('Mabopane, Pretoria'),('Mamelodi, Pretoria'),
('Mdantsane, East London'),('Mfuleni, Cape Town'),('Mhluzi, Middelburg'),
('Mitchells Plain, Cape Town'),('Mlazi, Durban'),('Mohlakeng, Randfontein'),
('Motherwell, Port Elizabeth'),('Nelspruit Central'),('Nyanga, Cape Town'),
('Orange Farm, Johannesburg'),('Orlando East, Soweto'),('Orlando West, Soweto'),
('Phoenix, Durban'),('Pietermaritzburg Central'),('Pimville, Soweto'),
('Polokwane Central'),('Port Elizabeth Central'),('Pretoria Central'),
('Protea Glen, Soweto'),('Randburg, Johannesburg'),('Roodepoort, Johannesburg'),
('Rustenburg Central'),('Sandton, Johannesburg'),('Sebokeng, Vereeniging'),
('Sharpeville, Vereeniging'),('Soshanguve, Pretoria'),('Tembisa, Ekurhuleni'),
('Thohoyandou, Limpopo'),('Thokoza, Ekurhuleni'),('Tsakane, Brakpan'),
('Umlazi, Durban'),('Vosloorus, Ekurhuleni'),('Welkom Central'),
('Witbank Central'),('Wynberg, Cape Town'),('Zola, Soweto');

-- report_ai_analysis
CREATE TABLE public.report_ai_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL UNIQUE REFERENCES public.reports(id) ON DELETE CASCADE,
  quality_score int NOT NULL DEFAULT 0,
  quality_tier public.quality_tier NOT NULL DEFAULT 'limited',
  quality_factors text[] NOT NULL DEFAULT '{}',
  key_details_extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  suggested_case_matches jsonb NOT NULL DEFAULT '[]'::jsonb,
  cluster_id uuid,
  cluster_confidence public.cluster_confidence,
  cluster_role public.cluster_role,
  cluster_primary boolean NOT NULL DEFAULT false,
  cluster_supporting_count int NOT NULL DEFAULT 0,
  cluster_contradictions jsonb NOT NULL DEFAULT '[]'::jsonb,
  concentrated_sighting boolean NOT NULL DEFAULT false,
  status public.analysis_status NOT NULL DEFAULT 'pending',
  analyst_reviewed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.report_ai_analysis TO service_role;
ALTER TABLE public.report_ai_analysis ENABLE ROW LEVEL SECURITY;
-- No authenticated policies: Phase 9 admin surfaces (with role check) will read via service role.
CREATE INDEX idx_rai_cluster ON public.report_ai_analysis (cluster_id) WHERE cluster_id IS NOT NULL;
CREATE INDEX idx_rai_report ON public.report_ai_analysis (report_id);
CREATE TRIGGER trg_rai_updated_at BEFORE UPDATE ON public.report_ai_analysis
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- campaigns
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_type public.campaign_type NOT NULL,
  title text NOT NULL,
  body_content text NOT NULL,
  target_audience public.campaign_audience NOT NULL DEFAULT 'all_users',
  target_townships text[] NOT NULL DEFAULT '{}',
  case_id uuid,
  case_type text,
  scheduled_send_timestamp timestamptz NOT NULL,
  sent_timestamp timestamptz,
  status public.campaign_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  language_code text NOT NULL DEFAULT 'en-ZA',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can read sent campaigns"
  ON public.campaigns FOR SELECT TO authenticated
  USING (status = 'sent');
CREATE INDEX idx_campaigns_status_sched ON public.campaigns (status, scheduled_send_timestamp);
CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Validation trigger for campaigns
CREATE OR REPLACE FUNCTION public.validate_campaign()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    -- auto-bump when creating scheduled campaigns too eagerly
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
REVOKE EXECUTE ON FUNCTION public.validate_campaign() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_campaigns_validate BEFORE INSERT OR UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.validate_campaign();

-- campaign_delivery
CREATE TABLE public.campaign_delivery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token text,
  delivered_timestamp timestamptz,
  opened_timestamp timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.campaign_delivery TO authenticated;
GRANT ALL ON public.campaign_delivery TO service_role;
ALTER TABLE public.campaign_delivery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipient can read own delivery"
  ON public.campaign_delivery FOR SELECT TO authenticated
  USING (recipient_user_id = auth.uid());
CREATE POLICY "recipient can mark opened"
  ON public.campaign_delivery FOR UPDATE TO authenticated
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());
CREATE INDEX idx_cd_recipient ON public.campaign_delivery (recipient_user_id, campaign_id);
CREATE INDEX idx_cd_campaign ON public.campaign_delivery (campaign_id);
CREATE TRIGGER trg_cd_updated_at BEFORE UPDATE ON public.campaign_delivery
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
