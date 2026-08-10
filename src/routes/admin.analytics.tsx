import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { getAdminAnalytics } from "@/lib/admin/analytics.functions";
import { useStaff } from "@/lib/admin/use-staff";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics · SAPS Admin" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Aggregated reporting, case and engagement metrics." },
    ],
  }),
  component: AdminAnalyticsPage,
});

function AdminAnalyticsPage() {
  const { roles } = useStaff();
  const { data, error } = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: () => getAdminAnalytics({ data: { days: 30 } }),
  });

  return (
    <AdminShell title="Analytics" description="Last 30 days. Area-level aggregates only." roles={roles}>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load analytics: {error.message}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-2xl font-semibold tabular-nums">{data?.cases.activeWanted ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Active wanted cases</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-semibold tabular-nums">{data?.cases.activeMissing ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Active missing cases</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-semibold tabular-nums">{data?.engagement.conversations ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Conversations</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-semibold tabular-nums">{data?.rewards.claimsPaid ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Claims paid</p>
        </Card>
      </div>

      <Card className="mt-6 p-4">
        <h2 className="mb-3 text-sm font-semibold">Reports by area</h2>
        <ul className="space-y-1 text-sm">
          {(data?.reports.byTownship ?? []).map((t) => (
            <li key={t.label} className="flex justify-between border-b border-border/50 py-1">
              <span>{t.label}</span>
              <span className="tabular-nums text-muted-foreground">{t.count}</span>
            </li>
          ))}
        </ul>
      </Card>
    </AdminShell>
  );
}