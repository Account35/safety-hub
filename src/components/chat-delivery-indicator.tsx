import { Check, CheckCheck } from "lucide-react";
import type { DeliveryStatus } from "@/lib/chat-types";

interface Props {
  status: DeliveryStatus;
}

export function DeliveryIndicator({ status }: Props) {
  if (status === "sending" || status === "failed") {
    return (
      <Check
        className={`size-3 ${status === "failed" ? "text-amber-500" : "text-muted-foreground"}`}
        aria-label={status === "failed" ? "Send failed" : "Sending"}
      />
    );
  }
  if (status === "sent") {
    return <Check className="size-3 text-muted-foreground" aria-label="Sent" />;
  }
  if (status === "delivered") {
    return <CheckCheck className="size-3 text-muted-foreground" aria-label="Delivered" />;
  }
  if (status === "read") {
    return <CheckCheck className="size-3 text-accent" aria-label="Read by officer" />;
  }
  return null;
}
