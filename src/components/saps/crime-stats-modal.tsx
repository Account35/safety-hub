import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Minus, TrendingDown, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCrimeStats } from "@/lib/dashboard/dashboard.functions";
import { useAuth } from "@/lib/auth-context";

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up") return <TrendingUp className="size-4 text-destructive" aria-hidden="true" />;
  if (trend === "down") return <TrendingDown className="size-4 text-primary" aria-hidden="true" />;
  return <Minus className="size-4 text-muted-foreground" aria-hidden="true" />;
}

function trendLabel(trend: string) {
  if (trend === "up") return "Increasing";
  if (trend === "down") return "Decreasing";
  return "Stable";
}

export function CrimeStatsModal() {
  const { profile } = useAuth();
  const statsFn = useServerFn(getCrimeStats);
  const [open, setOpen] = useState(false);
  const [township, setTownship] = useState<string | null>(profile?.area ?? null);

  const { data, isLoading } = useQuery({
    queryKey: ["crime-stats", township],
    queryFn: () => statsFn({ data: { township } }),
    enabled: open,
  });

  const rows = data?.rows ?? [];
  const selected = rows[0]?.township ?? township ?? "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2 sm:w-auto">
          <BarChart3 className="size-4" aria-hidden="true" /> View crime statistics
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary">
            Crime statistics
          </DialogTitle>
          <DialogDescription>
            Reported incident counts by category for the selected area. Figures are
            area-level only and never linked to individuals.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="crime-stats-township" className="text-sm font-medium">
              Area
            </label>
            <Select
              value={selected || undefined}
              onValueChange={(v) => setTownship(v)}
            >
              <SelectTrigger id="crime-stats-township" className="min-h-11">
                <SelectValue placeholder="Select an area" />
              </SelectTrigger>
              <SelectContent>
                {(data?.townships ?? []).map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading && <div className="h-64 animate-pulse rounded-md bg-muted/50" />}

          {!isLoading && rows.length === 0 && (
            <p className="rounded-md border p-4 text-sm text-muted-foreground">
              No statistics published for this area yet.
            </p>
          )}

          {!isLoading && rows.length > 0 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {rows.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <p className="text-sm font-semibold text-primary">{r.category}</p>
                        <p className="text-2xl font-bold tabular-nums">{r.incident_count}</p>
                        <p className="text-xs text-muted-foreground">{r.period_label}</p>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendIcon trend={r.trend} /> {trendLabel(r.trend)}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="h-64 w-full" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar
                      dataKey="incident_count"
                      name="Incidents"
                      fill="var(--color-primary)"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <p className="text-xs text-muted-foreground">
                Last updated:{" "}
                {data?.lastUpdated
                  ? new Date(data.lastUpdated).toLocaleString("en-ZA")
                  : "unknown"}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}