-- Phase 4: Anonymous Two-Way Chat System

CREATE TYPE public.conversation_status AS ENUM (
  'active', 'awaiting_reporter', 'awaiting_officer', 'closed', 'archived'
);

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id text NOT NULL REFERENCES public.reports(report_id) ON DELETE CASCADE,
  case_id uuid NOT NULL,
  case_type text NOT NULL CHECK (case_type IN ('wanted', 'missing')),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_anon_code text NOT NULL,
  officer_id uuid,  -- visible only in Phase 9 admin
  status public.conversation_status NOT NULL DEFAULT 'active',
  closure_reason text CHECK (closure_reason IN ('investigation_complete','sufficient_information','resolved','timeout')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('reporter', 'officer', 'system')),
  message_content text NOT NULL,
  attachment_reference text,
  is_deleted boolean NOT NULL DEFAULT false,
  sent_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX conversations_reporter_idx ON public.conversations (reporter_id) WHERE reporter_id IS NOT NULL;
CREATE INDEX conversations_report_id_idx ON public.conversations (report_id);
CREATE INDEX messages_conversation_idx ON public.messages (conversation_id, sent_at DESC);

-- RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Reporters see their own conversations
CREATE POLICY "Conversations: reporters view own"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

-- Officers/admins see all (Phase 9 uses service_role or detective role)
CREATE POLICY "Conversations: staff view all"
  ON public.conversations FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('detective', 'analyst', 'moderator', 'admin', 'super_admin')
  ));

-- Messages: reporters see messages in their conversations
CREATE POLICY "Messages: reporters view own"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE reporter_id = auth.uid()
    )
  );

-- Messages: reporters can insert as 'reporter' sender
CREATE POLICY "Messages: reporters insert"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_type = 'reporter'
    AND conversation_id IN (
      SELECT id FROM public.conversations
      WHERE reporter_id = auth.uid() AND status IN ('active', 'awaiting_officer', 'awaiting_reporter')
    )
  );

-- Messages: staff full access
CREATE POLICY "Messages: staff full access"
  ON public.messages FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('detective', 'analyst', 'moderator', 'admin', 'super_admin')
  ));

-- Update last_activity_at on new message
CREATE OR REPLACE FUNCTION public.update_conversation_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.conversations
  SET last_activity_at = NEW.sent_at, updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_update_conversation_activity
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_activity();

CREATE TRIGGER conversations_set_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT ON public.conversations TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.conversations TO service_role;
GRANT ALL ON public.messages TO service_role;
