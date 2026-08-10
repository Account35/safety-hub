-- Extra case statuses for investigation tracking
ALTER TYPE public.case_status ADD VALUE IF NOT EXISTS 'investigating';
ALTER TYPE public.case_status ADD VALUE IF NOT EXISTS 'hot_lead';
ALTER TYPE public.case_status ADD VALUE IF NOT EXISTS 'cold_case';

-- Report assignment / outcome tracking
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS outcome text,
  ADD COLUMN IF NOT EXISTS outcome_notes text;

-- Immutable admin audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_roles text[] NOT NULL DEFAULT '{}',
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read the audit log"
ON public.admin_audit_log FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'moderator')
  OR public.has_role(auth.uid(), 'analyst')
  OR public.has_role(auth.uid(), 'detective')
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_entity_idx ON public.admin_audit_log (entity_type, entity_id);

-- Admin settings (key/value)
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_settings TO service_role;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read admin settings"
ON public.admin_settings FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'moderator')
  OR public.has_role(auth.uid(), 'analyst')
  OR public.has_role(auth.uid(), 'detective')
);

CREATE TRIGGER admin_settings_set_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.admin_settings (key, value) VALUES
  ('case_settings', '{"default_reward_amount": 5000, "auto_archive_days": 365, "require_photo": true}'::jsonb),
  ('feature_flags', '{"campaigns_enabled": true, "rewards_enabled": true, "ai_analysis_enabled": true, "chat_enabled": true}'::jsonb),
  ('notification_templates', '{"report_received": "Your report has been received and is under review.", "case_resolved": "A case you reported on has been resolved. Thank you."}'::jsonb)
ON CONFLICT (key) DO NOTHING;