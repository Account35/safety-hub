-- Phase 5: User Profile, Settings & Account Management

-- Extend profiles with Phase 5 fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS primary_township text,
  ADD COLUMN IF NOT EXISTS language_preference text NOT NULL DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Notification preferences
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  new_message_notifications boolean NOT NULL DEFAULT true,
  report_status_notifications boolean NOT NULL DEFAULT true,
  delivery_channel text NOT NULL DEFAULT 'push' CHECK (delivery_channel IN ('push','email','both')),
  quiet_hours_enabled boolean NOT NULL DEFAULT false,
  quiet_hours_start time NOT NULL DEFAULT '22:00',
  quiet_hours_end time NOT NULL DEFAULT '07:00',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

CREATE POLICY "Notification prefs: users manage own"
  ON public.notification_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Privacy settings
CREATE TABLE public.privacy_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  location_sharing_level text NOT NULL DEFAULT 'township' CHECK (location_sharing_level IN ('township','neighborhood','landmark')),
  data_retention_acknowledged boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.privacy_settings TO authenticated;
GRANT ALL ON public.privacy_settings TO service_role;

CREATE POLICY "Privacy settings: users manage own"
  ON public.privacy_settings FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Upsert defaults when a new user is created
CREATE OR REPLACE FUNCTION public.handle_new_user_phase5()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.privacy_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_phase5
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_phase5();
