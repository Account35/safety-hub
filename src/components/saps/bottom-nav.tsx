import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, AlertTriangle, Activity, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/en";
import { useEffect, useState } from "react";
import { getTotalUnread } from "@/lib/chat-utils";

const items = [
  { to: "/", label: t.nav.home, icon: Home },
  { to: "/cases", label: t.nav.cases, icon: Search },
  { to: "/report", label: t.nav.report, icon: AlertTriangle },
  { to: "/activity", label: t.nav.activity, icon: Activity },
  { to: "/profile", label: t.nav.profile, icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    setUnread(getTotalUnread());
    const id = setInterval(() => setUnread(getTotalUnread()), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map((item) => {
          const active = pathname === item.to || (item.to === "/activity" && pathname.startsWith("/chats"));
          const Icon = item.icon;
          const isActivity = item.to === "/activity";
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "relative flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <div className="relative">
                  <Icon className="size-5" aria-hidden="true" />
                  {isActivity && unread > 0 && (
                    <span
                      className="absolute -top-1 -right-1 size-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center"
                      aria-label={`${unread} unread messages`}
                    >
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </div>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}