import { Clock, Search, Shield, CheckCircle } from "lucide-react";

type Status = "submitted" | "under_review" | "investigated" | "resolved";

const STATUS_MAP: Record<Status, { label: string; icon: React.ElementType; className: string; tip: string }> = {
  submitted: {
    label: "Received",
    icon: Clock,
    className: "bg-blue-100 text-blue-800",
    tip: "Your report has been delivered to SAPS but not yet reviewed by an investigator.",
  },
  under_review: {
    label: "Under Review",
    icon: Search,
    className: "bg-amber-100 text-amber-800",
    tip: "An investigator is currently reviewing your report.",
  },
  investigated: {
    label: "Being Investigated",
    icon: Shield,
    className: "bg-primary/10 text-primary",
    tip: "Your report is part of an active investigation.",
  },
  resolved: {
    label: "Case Resolved",
    icon: CheckCircle,
    className: "bg-accent/20 text-accent-foreground",
    tip: "The case associated with this report has reached a conclusion.",
  },
};

interface Props {
  status: Status;
}

export function ReportStatusBadge({ status }: Props) {
  const { label, icon: Icon, className, tip } = STATUS_MAP[status] ?? STATUS_MAP.submitted;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
      title={tip}
      aria-label={`Status: ${label}. ${tip}`}
    >
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
