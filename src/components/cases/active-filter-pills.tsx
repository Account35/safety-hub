import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FilterPill {
  key: string;
  label: string;
  remove: () => void;
}

export function ActiveFilterPills({
  pills,
  onClearAll,
}: {
  pills: FilterPill[];
  onClearAll: () => void;
}) {
  if (!pills.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" role="region" aria-label="Active filters">
      {pills.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={p.remove}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label={`Remove filter ${p.label}`}
        >
          {p.label}
          <X className="size-3" aria-hidden="true" />
        </button>
      ))}
      <Button variant="ghost" size="sm" onClick={onClearAll} className="h-7 px-2 text-xs">
        Clear all
      </Button>
    </div>
  );
}