import { useEffect } from "react";
import { CloudOff, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useOfflineReportQueue } from "@/lib/reports/offline-queue";

/**
 * Global status strip for reports captured without signal. It also drains the
 * queue on reconnect, so a queued report is submitted from any page.
 */
export function OfflineQueueBanner() {
  const { pending, online } = useOfflineReportQueue((refs) => {
    toast.success(
      refs.length === 1
        ? `Queued report sent — reference ${refs[0]}`
        : `${refs.length} queued reports sent`,
    );
  });

  useEffect(() => {
    if (!online && pending > 0) {
      toast.info("You are offline — saved reports will send automatically.");
    }
  }, [online, pending]);

  if (pending === 0) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-accent px-4 py-2 text-xs font-medium text-accent-foreground"
    >
      {online ? (
        <UploadCloud className="size-4 shrink-0" aria-hidden="true" />
      ) : (
        <CloudOff className="size-4 shrink-0" aria-hidden="true" />
      )}
      <span>
        {pending} report{pending === 1 ? "" : "s"} waiting to send
        {online ? " — sending now…" : " — will send when you are back online"}
      </span>
    </div>
  );
}
