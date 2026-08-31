import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAdminAnalytics } from "@/lib/admin/analytics.functions";
import { getCrimeForecast } from "@/lib/admin/forecast.functions";
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

      <ForecastPanel />
    </AdminShell>

  );
}
const RISK_STYLES: Record<string, string> = {
  severe: "bg-destructive text-destructive-foreground",
  high: "bg-destructive/80 text-destructive-foreground",
  moderate: "bg-accent text-accent-foreground",
  low: "bg-muted text-muted-foreground",
};

function ForecastPanel() {
  const { data, error } = useQuery({
    queryKey: ["admin", "forecast"],
    queryFn: () => getCrimeForecast({ data: { windowDays: 90, horizonDays: 14 } }),
  });

  return (
    <Card className="mt-6 space-y-4 p-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">Predictive hotspots — next {data?.horizonDays ?? 14} days</h2>
        <p className="text-xs text-muted-foreground">
          Forecast from {data?.sampleSize ?? 0} reports over the last {data?.windowDays ?? 90} days,
          combining area density with recent momentum and reported timing.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load the forecast: {(error as Error).message}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Predicted crime hotspots by area</caption>
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2">Area</th>
              <th scope="col" className="px-3 py-2">Risk</th>
              <th scope="col" className="px-3 py-2">Trend</th>
              <th scope="col" className="px-3 py-2">Peak window</th>
              <th scope="col" className="px-3 py-2">Predicted reports</th>
              <th scope="col" className="px-3 py-2">Recommended action</th>
            </tr>
          </thead>
          <tbody>
            {(data?.hotspots ?? []).map((h) => (
              <tr key={h.area} className="border-t border-border align-top">
                <td className="px-3 py-2 font-medium">{h.area}</td>
                <td className="px-3 py-2">
                  <Badge className={`text-xs capitalize ${RISK_STYLES[h.riskLevel]}`}>
                    {h.riskLevel} · {h.riskScore}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    {h.trendPct >= 0 ? (
                      <TrendingUp className="size-3.5 text-destructive" aria-hidden="true" />
                    ) : (
                      <TrendingDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    )}
                    {h.trendPct > 0 ? "+" : ""}
                    {h.trendPct}%
                  </span>
                </td>
                <td className="px-3 py-2">
                  {h.peakDay}, {h.peakHourBand}
                </td>
                <td className="px-3 py-2 tabular-nums">{h.predictedNext}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{h.recommendation}</td>
              </tr>
            ))}
            {data && !data.hotspots.length ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Not enough report history yet to forecast hotspots.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {(data?.temporal ?? []).map((t) => (
          <div key={t.label} className="rounded-md border border-border p-3">
            <p className="text-lg font-semibold tabular-nums">{t.count}</p>
            <p className="text-xs text-muted-foreground">{t.label}</p>
          </div>
        ))}
      </div>

      <p className="flex items-start gap-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {data?.fairnessNote ??
          "Forecasts are advisory for resource planning only and never grounds for individual suspicion."}
      </p>
    </Card>
  );
}
