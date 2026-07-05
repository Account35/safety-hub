-- Phase 8: i18n + accessibility

-- 1. Language preference on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language_preference text NOT NULL DEFAULT 'en-ZA';

-- 2. Accessibility preferences
CREATE TABLE IF NOT EXISTS public.accessibility_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  high_contrast_enabled boolean NOT NULL DEFAULT false,
  text_scale_factor numeric NOT NULL DEFAULT 1.0,
  reduce_motion_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT text_scale_factor_valid CHECK (text_scale_factor IN (1.0, 1.25, 1.5, 2.0))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accessibility_preferences TO authenticated;
GRANT ALL ON public.accessibility_preferences TO service_role;

ALTER TABLE public.accessibility_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own accessibility prefs"
  ON public.accessibility_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER accessibility_preferences_updated_at
  BEFORE UPDATE ON public.accessibility_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Translation fallback monitoring log
CREATE TABLE IF NOT EXISTS public.translation_fallback_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_key text NOT NULL,
  language_code text NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS translation_fallback_log_key_idx
  ON public.translation_fallback_log(translation_key, language_code);

GRANT INSERT ON public.translation_fallback_log TO authenticated, anon;
GRANT SELECT ON public.translation_fallback_log TO authenticated;
GRANT ALL ON public.translation_fallback_log TO service_role;

ALTER TABLE public.translation_fallback_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log missing translations"
  ON public.translation_fallback_log
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Admins can read translation fallback log"
  ON public.translation_fallback_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));