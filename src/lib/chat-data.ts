import { supabase } from "@/integrations/supabase/client";
import type { Conversation, Message, ConversationStatus } from "@/lib/chat-types";

const PAGE_SIZE = 20;

export async function fetchConversations(reporterId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("reporter_id", reporterId)
    .order("last_activity_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Conversation[];
}

export async function fetchMessages(
  conversationId: string,
  before?: string,
): Promise<Message[]> {
  let query = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("is_deleted", false)
    .order("sent_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (before) query = query.lt("sent_at", before);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as Message[]).reverse();
}

export async function sendMessage(
  conversationId: string,
  content: string,
  attachmentRef?: string,
): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_type: "reporter",
      message_content: content,
      attachment_reference: attachmentRef ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Message;
}

export async function markMessagesRead(conversationId: string): Promise<void> {
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("sender_type", "officer")
    .is("read_at", null);
}

export async function closeConversation(conversationId: string): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from("conversations")
    .update({ status: "closed" as ConversationStatus, updated_at: now })
    .eq("id", conversationId);

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_type: "system",
    message_content: "You have closed this conversation. Thank you for contributing to community safety.",
  });
}

export async function fetchConversationById(id: string): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Conversation | null;
}

export function subscribeToMessages(
  conversationId: string,
  onMessage: (msg: Message) => void,
) {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage(payload.new as Message),
    )
    .subscribe();
}

export function subscribeToConversation(
  conversationId: string,
  onChange: (conv: Conversation) => void,
) {
  return supabase
    .channel(`conversation:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "conversations",
        filter: `id=eq.${conversationId}`,
      },
      (payload) => onChange(payload.new as Conversation),
    )
    .subscribe();
}

export function getUnreadCount(messages: Message[]): number {
  return messages.filter((m) => m.sender_type === "officer" && !m.read_at).length;
}
