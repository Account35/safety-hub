import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function DangerBadge({
  level,
  armed,
  className,
}: {
  level: "high" | "medium" | "low";
  armed?: boolean;
  className?: string;
}) {
  const map = {
    high: {
      cls: "bg-destructive text-destructive-foreground",
      label: armed ? "Armed · Do Not Approach" : "High Risk",
      Icon: AlertTriangle,
    },
    medium: {
      cls: "bg-orange-500 text-white",
      label: "Caution",
      Icon: ShieldAlert,
    },
    low: {
      cls: "bg-yellow-400 text-yellow-950",
      label: "Low Risk",
      Icon: ShieldCheck,
    },
  } as const;
  const { cls, label, Icon } = map[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        cls,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3" />
      {label}
    </span>
  );
}

export function CrimeBadge({ category }: { category: string | null }) {
  if (!category) return null;
  const tones: Record<string, string> = {
    "Violent Crimes": "bg-destructive/15 text-destructive border-destructive/30",
    "Property Crimes": "bg-orange-500/15 text-orange-700 border-orange-500/30",
    Fraud: "bg-blue-500/15 text-blue-700 border-blue-500/30",
    "Drug Offenses": "bg-purple-500/15 text-purple-700 border-purple-500/30",
    "Other Crimes": "bg-muted text-muted-foreground border-border",
  };
  const cls = tones[category] ?? tones["Other Crimes"];
  return (
    <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold", cls)}>
      {category}
    </span>
  );
}

export function VulnerabilityBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">
      {label}
    </span>
  );
}