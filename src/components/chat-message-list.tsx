import { cn } from "@/lib/utils";
import { formatMessageTime, getDayLabel, isSameDay, isSameCluster } from "@/lib/chat-utils";
import { DeliveryIndicator } from "@/components/chat-delivery-indicator";
import type { Message } from "@/lib/chat-types";

interface Props {
  messages: Message[];
}

export function MessageList({ messages }: Props) {
  return (
    <ol className="flex flex-col gap-1 px-4 py-2" aria-label="Conversation messages" aria-live="polite">
      {messages.map((msg, i) => {
        const prev = messages[i - 1];
        const isFirst = !prev;
        const newDay = isFirst || !isSameDay(prev.sent_at, msg.sent_at);
        const clusterStart = isFirst || !isSameCluster(prev, msg);
        const next = messages[i + 1];
        const clusterEnd = !next || !isSameCluster(msg, next);

        const isReporter = msg.sender_type === "reporter";
        const isSystem = msg.sender_type === "system";

        return (
          <li key={msg.id ?? msg.local_id} className="list-none">
            {newDay && (
              <div className="flex items-center gap-2 my-3" role="separator">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{getDayLabel(msg.sent_at)}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}

            {isSystem ? (
              <p className="text-center text-xs text-muted-foreground italic my-2">
                {msg.message_content}
              </p>
            ) : (
              <div className={cn("flex flex-col", isReporter ? "items-end" : "items-start")}>
                {clusterStart && (
                  <span className="text-[11px] text-muted-foreground mb-1 mx-1">
                    {isReporter ? "You" : "SAPS Officer"}
                  </span>
                )}
                <div
                  className={cn(
                    "max-w-[75%] px-3 py-2 text-sm break-words",
                    isReporter
                      ? "bg-accent text-accent-foreground rounded-2xl rounded-br-sm"
                      : "bg-primary text-primary-foreground rounded-2xl rounded-bl-sm",
                  )}
                  aria-label={`${isReporter ? "You" : "SAPS Officer"}: ${msg.message_content}`}
                >
                  {msg.message_content}
                </div>
                {clusterEnd && (
                  <div className={cn("flex items-center gap-1 mt-0.5 mx-1", isReporter && "flex-row-reverse")}>
                    <span className="text-[10px] text-muted-foreground">
                      {formatMessageTime(msg.sent_at)}
                    </span>
                    {isReporter && msg.delivery_status && (
                      <DeliveryIndicator status={msg.delivery_status} />
                    )}
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
