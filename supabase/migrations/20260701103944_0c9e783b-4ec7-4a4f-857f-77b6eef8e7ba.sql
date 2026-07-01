
-- =========================================================
-- conversations
-- =========================================================
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL UNIQUE REFERENCES public.reports(id) ON DELETE CASCADE,
  case_id uuid NOT NULL,
  case_type text NOT NULL CHECK (case_type IN ('wanted', 'missing')),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_anon_code text NOT NULL,
  officer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','awaiting_reporter','awaiting_officer','closed','archived')),
  closure_reason text,
  case_name text,
  case_photo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporters can view their own conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Reporters can close their own conversations"
  ON public.conversations FOR UPDATE TO authenticated
  USING (reporter_id = auth.uid())
  WITH CHECK (reporter_id = auth.uid());

CREATE TRIGGER conversations_set_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX conversations_reporter_idx
  ON public.conversations(reporter_id, last_activity_at DESC);

-- =========================================================
-- messages
-- =========================================================
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('reporter','officer','system')),
  message_content text NOT NULL,
  attachment_reference text,
  is_deleted boolean NOT NULL DEFAULT false,
  sent_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporters can view messages in their conversations"
  ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND c.reporter_id = auth.uid()
    )
  );

CREATE POLICY "Reporters can send messages in their open conversations"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_type = 'reporter'
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND c.reporter_id = auth.uid()
        AND c.status IN ('active','awaiting_reporter','awaiting_officer')
    )
  );

CREATE POLICY "Reporters can mark officer messages as read"
  ON public.messages FOR UPDATE TO authenticated
  USING (
    sender_type = 'officer'
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND c.reporter_id = auth.uid()
    )
  )
  WITH CHECK (
    sender_type = 'officer'
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND c.reporter_id = auth.uid()
    )
  );

CREATE INDEX messages_conversation_sent_idx
  ON public.messages(conversation_id, sent_at DESC);

-- =========================================================
-- Bump conversation activity + status on new messages
-- =========================================================
CREATE OR REPLACE FUNCTION public.bump_conversation_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
     SET last_activity_at = now(),
         status = CASE
           WHEN status IN ('closed','archived') THEN status
           WHEN NEW.sender_type = 'reporter' THEN 'awaiting_officer'
           WHEN NEW.sender_type = 'officer'  THEN 'awaiting_reporter'
           ELSE status
         END,
         updated_at = now()
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_bump_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_activity();

-- =========================================================
-- Realtime
-- =========================================================
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages      REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
