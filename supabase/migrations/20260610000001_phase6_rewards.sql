-- Phase 6: Rewards System
-- ARCHITECTURE NOTE: reward_claims stores user_id + identity_confirmation (real identity).
-- REPORTS/CONVERSATIONS store only reporter_id (anonymous). No FK or join path exists between
-- reporter_id and user_id/identity_confirmation. Phase 9 officer tools must NEVER query
-- reward_claims from report/conversation context.

CREATE TYPE public.eligibility_status AS ENUM ('eligible','claimed','paid','expired');
CREATE TYPE public.claim_status AS ENUM ('submitted','verification_pending','approved','paid','rejected');
CREATE TYPE public.payment_method_type AS ENUM ('bank_transfer','mobile_money','cash_pickup');

CREATE TABLE public.reward_eligibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id text NOT NULL REFERENCES public.reports(report_id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  case_id uuid NOT NULL,
  case_type text NOT NULL CHECK (case_type IN ('wanted','missing')),
  reward_amount numeric NOT NULL CHECK (reward_amount > 0),
  eligibility_status public.eligibility_status NOT NULL DEFAULT 'eligible',
  eligibility_date timestamptz NOT NULL DEFAULT now(),
  claim_deadline timestamptz NOT NULL DEFAULT (now() + INTERVAL '90 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reward_eligibility_reporter_idx ON public.reward_eligibility (reporter_id);
CREATE INDEX reward_eligibility_report_idx ON public.reward_eligibility (report_id);

ALTER TABLE public.reward_eligibility ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.reward_eligibility TO authenticated;
GRANT ALL ON public.reward_eligibility TO service_role;

-- Reporters see only their own eligibility records
CREATE POLICY "Reward eligibility: reporters view own"
  ON public.reward_eligibility FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

-- Staff see all
CREATE POLICY "Reward eligibility: staff manage all"
  ON public.reward_eligibility FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('detective','analyst','moderator','admin','super_admin')
  ));

CREATE TABLE public.reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id text NOT NULL UNIQUE,
  report_id text NOT NULL REFERENCES public.reports(report_id) ON DELETE RESTRICT,
  -- user_id is the registered identity - NEVER exposed to officer-facing queries
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  identity_confirmation jsonb NOT NULL, -- {full_name, id_number} encrypted at app layer
  payment_method_type public.payment_method_type NOT NULL,
  payment_details jsonb NOT NULL DEFAULT '{}'::jsonb, -- encrypted at app layer
  claim_status public.claim_status NOT NULL DEFAULT 'submitted',
  rejection_reason text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reward_claims_user_idx ON public.reward_claims (user_id);
CREATE INDEX reward_claims_report_idx ON public.reward_claims (report_id);

ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.reward_claims TO authenticated;
GRANT ALL ON public.reward_claims TO service_role;

-- Users see only their own claims
CREATE POLICY "Reward claims: users view own"
  ON public.reward_claims FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Reward claims: users insert own"
  ON public.reward_claims FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Staff see all claims for processing
CREATE POLICY "Reward claims: staff manage all"
  ON public.reward_claims FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('detective','analyst','moderator','admin','super_admin')
  ));

CREATE TRIGGER reward_eligibility_updated_at
  BEFORE UPDATE ON public.reward_eligibility
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER reward_claims_updated_at
  BEFORE UPDATE ON public.reward_claims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
