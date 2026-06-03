import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, AlertTriangle, Activity, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/en";

const items = [
  { to: "/", label: t.nav.home, icon: Home },
  { to: "/cases", label: t.nav.cases, icon: Search },
  { to: "/report", label: t.nav.report, icon: AlertTriangle },
  { to: "/activity", label: t.nav.activity, icon: Activity },
  { to: "/dashboard", label: t.nav.profile, icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}