import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/chat-utils";
import type { Conversation, Message } from "@/lib/chat-types";

interface Props {
  conversation: Conversation;
  lastMessage?: Message;
  unreadCount: number;
}

export function ConversationCard({ conversation, lastMessage, unreadCount }: Props) {
  const navigate = useNavigate();
  const isClosed = conversation.status === "closed" || conversation.status === "archived";

  return (
    <button
      className="w-full text-left flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors focus-visible:outline-2"
      onClick={() => navigate({ to: "/chats/$id", params: { id: conversation.id } })}
      aria-label={`Conversation about ${conversation.case_name ?? conversation.case_type} case. ${unreadCount > 0 ? `${unreadCount} unread messages.` : ""}`}
    >
      <div className="shrink-0 relative">
        {conversation.case_photo ? (
          <img
            src={conversation.case_photo}
            alt=""
            className="size-[60px] rounded-full object-cover"
            aria-hidden="true"
          />
        ) : (
          <div
            className="size-[60px] rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold"
            aria-hidden="true"
          >
            {conversation.case_name?.[0] ?? "?"}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="font-semibold text-sm text-foreground truncate">
            {conversation.case_name ?? "Case"}
          </span>
          <span className="text-[11px] text-muted-foreground shrink-0">
            {lastMessage ? formatRelativeTime(lastMessage.sent_at) : formatRelativeTime(conversation.created_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <span className="text-xs text-muted-foreground truncate">
            {lastMessage?.is_deleted
              ? "Message deleted"
              : lastMessage?.message_content ?? "Conversation started"}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {isClosed && (
              <span className="text-[10px] text-muted-foreground border border-border rounded px-1">
                Closed
              </span>
            )}
            {unreadCount > 0 && !isClosed && (
              <span
                className="size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center"
                aria-label={`${unreadCount} unread`}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            {unreadCount === 0 && !isClosed && (
              <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
            )}
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground capitalize">
          {conversation.case_type === "wanted" ? "Wanted Person" : "Missing Person"}
        </span>
      </div>
    </button>
  );
}
