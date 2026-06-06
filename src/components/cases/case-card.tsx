import { Link } from "@tanstack/react-router";
import { MapPin, Clock, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CrimeBadge, DangerBadge, VulnerabilityBadge } from "./badges";
import type { MissingListItem, WantedListItem } from "@/lib/cases/types";
import { formatRelative, timeMissingLabel } from "@/lib/cases/filters";
import { cn } from "@/lib/utils";

function PhotoFrame({ src, alt }: { src: string | undefined; alt: string }) {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      ) : (
        <div className="grid size-full place-items-center text-muted-foreground">
          No photo
        </div>
      )}
    </div>
  );
}

export function WantedCard({ item }: { item: WantedListItem }) {
  const desc = [
    item.age != null ? `Age ${item.age}` : null,
    item.height_cm ? `${(item.height_cm / 100).toFixed(2)}m` : null,
    item.build,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link
      to="/cases/wanted/$id"
      params={{ id: item.id }}
      aria-label={`Wanted person ${item.full_name}, ${item.crime_category ?? "case details"}`}
      className="group block focus:outline-none"
    >
      <Card className="h-full overflow-hidden border-l-4 border-l-destructive transition-shadow group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-accent">
        <PhotoFrame src={item.photos[0]} alt={`Photograph of wanted person ${item.full_name}`} />
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-bold leading-tight text-primary">
              {item.full_name}
            </h3>
            {item.armed && (
              <AlertCircle className="size-4 shrink-0 text-destructive" aria-label="Armed" />
            )}
          </div>
          {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
          <div className="flex flex-wrap gap-1.5">
            <CrimeBadge category={item.crime_category} />
            <DangerBadge level={item.danger_level} armed={item.armed} />
          </div>
          {item.last_seen_location && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin aria-hidden="true" className="size-3" />
              <span className="truncate">
                {item.last_seen_location} · {formatRelative(item.last_seen_at)}
              </span>
            </p>
          )}
          {item.reward_amount != null && (
            <p className="text-xs font-semibold text-accent-foreground">
              Reward: R{Number(item.reward_amount).toLocaleString()}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}

export function MissingCard({ item }: { item: MissingListItem }) {
  const meta = timeMissingLabel(item.last_seen_at);
  return (
    <Link
      to="/cases/missing/$id"
      params={{ id: item.id }}
      aria-label={`Missing person ${item.full_name}, ${meta.text}`}
      className="group block focus:outline-none"
    >
      <Card className="relative h-full overflow-hidden border-l-4 border-l-primary transition-shadow group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-accent">
        {meta.critical && (
          <div className="absolute left-0 right-0 top-0 z-10 bg-destructive px-2 py-1 text-center text-xs font-bold uppercase tracking-wide text-destructive-foreground">
            Last 48 hours · Urgent
          </div>
        )}
        <PhotoFrame src={item.photos[0]} alt={`Photograph of missing person ${item.full_name}`} />
        <div className="space-y-2 p-4">
          <h3 className="font-display text-lg font-bold leading-tight text-primary">
            {item.full_name}
          </h3>
          <div className="flex items-center gap-2 text-sm">
            {item.age_at_disappearance != null && (
              <span className="text-muted-foreground">Age {item.age_at_disappearance}</span>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                meta.urgent
                  ? "bg-orange-500/15 text-orange-700"
                  : "bg-blue-500/15 text-blue-700",
              )}
            >
              <Clock aria-hidden="true" className="size-3" />
              {meta.text}
            </span>
          </div>
          {item.last_seen_location && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin aria-hidden="true" className="size-3" />
              <span className="truncate">{item.last_seen_location}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-1">
            {item.vulnerability_indicators.slice(0, 2).map((v) => (
              <VulnerabilityBadge key={v} label={v} />
            ))}
          </div>
        </div>
      </Card>
    </Link>
  );
}