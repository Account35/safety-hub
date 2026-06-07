import type { CaseSummary } from "@/lib/reports/reports.functions";
import { Badge } from "@/components/ui/badge";

export function CaseContextHeader({ summary }: { summary: CaseSummary | null }) {
  if (!summary) {
    return (
      <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
        Loading case…
      </div>
    );
  }
  const isWanted = summary.caseType === "wanted";
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm">
      <div className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-full border bg-muted">
        {summary.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={summary.photo}
            alt={summary.fullName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
            No photo
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold text-primary">{summary.fullName}</p>
        <Badge
          variant={isWanted ? "destructive" : "default"}
          className="mt-1"
        >
          {isWanted ? "Wanted Person" : "Missing Person"}
        </Badge>
      </div>
    </div>
  );
}