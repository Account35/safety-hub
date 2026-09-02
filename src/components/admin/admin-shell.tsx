import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderOpen,
  FileSearch,
  Gift,
  Megaphone,
  BarChart3,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AdminNavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/reports", label: "Report queue", icon: FileSearch },
  { to: "/admin/cases", label: "Cases", icon: FolderOpen },
  { to: "/admin/rewards", label: "Rewards", icon: Gift },
  { to: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({
  title,
  description,
  roles,
  actions,
  children,
}: {
  title: string;
  description?: string;
  roles?: string[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30 md:flex-row">
      <aside className="border-b border-border bg-primary text-primary-foreground md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-4 py-4">
          <ShieldCheck className="h-5 w-5 text-secondary" aria-hidden="true" />
          <span className="font-semibold tracking-tight">SAPS Admin</span>
        </div>
        <nav aria-label="Admin sections" className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col">
          {ADMIN_NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to as "/admin"}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-secondary text-secondary-foreground font-medium"
                    : "text-primary-foreground/80 hover:bg-primary-foreground/10"
                }`}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>


      <main id="main-content" className="min-w-0 flex-1 px-4 py-6 sm:px-6">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            {description ? (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
            ) : null}
            {roles?.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {roles.map((r) => (
                  <Badge key={r} variant="outline" className="text-xs">
                    {r
                      .split("_")
                      .map((word) => word[0]?.toUpperCase() + word.slice(1))
                      .join(" ")}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </header>
        {children}
      </main>
    </div>
  );
}