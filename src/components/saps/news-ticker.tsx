import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
import { getTickerItems } from "@/lib/dashboard/dashboard.functions";
import { useAccessibility } from "@/lib/accessibility/accessibility-context";

export function NewsTicker() {
  const tickerFn = useServerFn(getTickerItems);
  const { reduce_motion_enabled } = useAccessibility();

  const { data } = useQuery({
    queryKey: ["dashboard-ticker"],
    queryFn: () => tickerFn(),
    staleTime: 5 * 60 * 1000,
  });

  const items = data ?? [];
  if (items.length === 0) return null;

  const labels = items.map((i) => i.title);

  return (
    <section
      aria-label="Latest SAPS announcements"
      className="flex items-stretch overflow-hidden rounded-md border border-primary/20 bg-primary text-primary-foreground"
    >
      <p className="flex shrink-0 items-center gap-2 bg-accent px-3 py-2 text-xs font-bold uppercase tracking-wide text-accent-foreground">
        <Megaphone className="size-3.5" aria-hidden="true" /> SAPS News
      </p>

      {reduce_motion_enabled ? (
        <ul className="flex-1 divide-y divide-primary-foreground/15 text-sm">
          {items.slice(0, 3).map((item) => (
            <li key={item.id} className="px-3 py-1.5">
              <Link to="/campaigns/$id" params={{ id: item.id }} className="hover:underline">
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="group relative flex-1 overflow-hidden py-2">
          <div className="flex w-max animate-[saps-ticker_45s_linear_infinite] gap-8 whitespace-nowrap px-3 text-sm group-hover:[animation-play-state:paused]">
            {[...labels, ...labels].map((label, index) => (
              <span key={`${label}-${index}`} className="flex items-center gap-2">
                <span aria-hidden="true" className="text-accent">
                  •
                </span>
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}