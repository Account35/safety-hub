import { lazy, Suspense, useState } from "react";
import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin } from "lucide-react";
import { PageShell } from "@/components/saps/page-shell";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { getMapData } from "@/lib/map/map.functions";
import { resolveAreaCoords } from "@/lib/geo/townships-geo";
import { useAuth } from "@/lib/auth-context";
import type { MapFilters } from "@/components/map/safety-map";

const SafetyMap = lazy(() => import("@/components/map/safety-map"));

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Safety Map · Community Safety Tracker" },
      {
        name: "description",
        content:
          "Interactive map of wanted persons, missing persons, SAPS stations and area-level report density across South Africa.",
      },
      { property: "og:title", content: "Safety Map · Community Safety Tracker" },
      {
        property: "og:description",
        content:
          "See active cases, police stations and area-level crime density on one privacy-safe map.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MapPage,
});

const DAY_OPTIONS = [7, 30, 90, 365];

function MapPage() {
  const { profile } = useAuth();
  const mapFn = useServerFn(getMapData);
  const [days, setDays] = useState(90);
  const [filters, setFilters] = useState<MapFilters>({
    wanted: true,
    missing: true,
    stations: true,
    heat: true,
    intensity: 1,
    dangerOnly: false,
  });

  const center = resolveAreaCoords(profile?.area ?? null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["map-data", days],
    queryFn: () => mapFn({ data: { days } }),
  });

  const set = <K extends keyof MapFilters>(key: K, value: MapFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="space-y-2">
          <h1 className="font-display text-3xl font-bold tracking-tight text-primary">
            Safety Map
          </h1>
          <p className="text-sm text-muted-foreground">
            Cases are pinned to the approximate area they were last seen, and report density is
            grouped into 500 m squares. Exact locations are never shown.
          </p>
        </header>

        <Card className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Toggle
              id="f-wanted"
              label="Wanted persons"
              checked={filters.wanted}
              onChange={(v) => set("wanted", v)}
            />
            <Toggle
              id="f-missing"
              label="Missing persons"
              checked={filters.missing}
              onChange={(v) => set("missing", v)}
            />
            <Toggle
              id="f-stations"
              label="SAPS stations"
              checked={filters.stations}
              onChange={(v) => set("stations", v)}
            />
            <Toggle
              id="f-heat"
              label="Report density"
              checked={filters.heat}
              onChange={(v) => set("heat", v)}
            />
            <Toggle
              id="f-danger"
              label="High danger / endangered only"
              checked={filters.dangerOnly}
              onChange={(v) => set("dangerOnly", v)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="intensity">
                Density sensitivity — show squares with {filters.intensity}+ reports
              </Label>
              <Slider
                id="intensity"
                min={1}
                max={10}
                step={1}
                value={[filters.intensity]}
                onValueChange={([v]) => set("intensity", v)}
              />
            </div>
            <div className="space-y-2">
              <Label>Time range</Label>
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    aria-pressed={days === d}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      days === d
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {d === 365 ? "1 year" : `${d} days`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            Could not load the map: {(error as Error).message}
          </p>
        ) : null}

        <ClientOnly
          fallback={
            <div className="flex h-[60vh] items-center justify-center rounded-lg border border-border">
              <MapPin className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            </div>
          }
        >
          <Suspense
            fallback={
              <div className="flex h-[60vh] items-center justify-center rounded-lg border border-border">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading map" />
              </div>
            }
          >
            {data ? (
              <SafetyMap data={data} filters={filters} center={center} />
            ) : (
              <div className="flex h-[60vh] items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">
                {isLoading ? "Loading map data…" : "No map data available."}
              </div>
            )}
          </Suspense>
        </ClientOnly>

        <Card className="p-4 text-xs text-muted-foreground">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Legend</h2>
          <ul className="grid gap-1 sm:grid-cols-2">
            <li>Red pin — wanted person last-seen area</li>
            <li>Blue pin — missing person last-seen area</li>
            <li>Gold pin — SAPS station</li>
            <li>Shaded square — report density (green low → red high)</li>
          </ul>
        </Card>
      </div>
    </PageShell>
  );
}

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}