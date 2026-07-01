
REVOKE EXECUTE ON FUNCTION public.bump_conversation_activity() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bump_conversation_activity() FROM anon;
REVOKE EXECUTE ON FUNCTION public.bump_conversation_activity() FROM authenticated;
