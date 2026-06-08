export type ConversationStatus =
  | "active"
  | "awaiting_reporter"
  | "awaiting_officer"
  | "closed"
  | "archived";

export type SenderType = "reporter" | "officer" | "system";

export type DeliveryStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export interface Conversation {
  id: string;
  report_id: string;
  case_id: string;
  case_type: "wanted" | "missing";
  reporter_id: string | null;
  reporter_anon_code: string;
  status: ConversationStatus;
  closure_reason: string | null;
  created_at: string;
  last_activity_at: string;
  case_name?: string;
  case_photo?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: SenderType;
  message_content: string;
  attachment_reference: string | null;
  is_deleted: boolean;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  // local-only
  delivery_status?: DeliveryStatus;
  local_id?: string;
}
