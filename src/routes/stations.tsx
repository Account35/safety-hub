import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock, MapPin, Navigation, Phone, Search, Shield } from "lucide-react";
import { PageShell } from "@/components/saps/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listStations } from "@/lib/dashboard/dashboard.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/stations")({
  head: () => ({
    meta: [
      { title: "Find a SAPS Station · Community Safety Tracker" },
      {
        name: "description",
        content:
          "Find your nearest South African Police Service station with address, phone number and 24-hour availability.",
      },
      { property: "og:title", content: "Find a SAPS Station" },
      {
        property: "og:description",
        content: "Nearest SAPS stations by approximate area — address, phone and service hours.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StationsPage,
});

function StationsPage() {
  const { profile } = useAuth();
  const stationsFn = useServerFn(listStations);
  const [q, setQ] = useState("");
  const area = profile?.area ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["stations", area, q],
    queryFn: () => stationsFn({ data: { area, q, limit: 60 } }),
  });

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="space-y-2">
          <h1 className="font-display text-3xl font-bold tracking-tight text-primary">
            SAPS Station Finder
          </h1>
          <p className="text-sm text-muted-foreground">
            Stations are ordered by approximate distance from{" "}
            <span className="font-medium">{data?.areaLabel ?? "your area"}</span>. Only your
            general area is used — never your exact location.
          </p>
        </header>

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by station, township or street"
            className="h-11 pl-9"
            aria-label="Search stations"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <Card key={n} className="h-28 animate-pulse bg-muted/50" />
            ))}
          </div>
        ) : (data?.stations.length ?? 0) === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No stations matched your search.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {data?.stations.map((s) => (
              <li key={s.id}>
                <Card className="border-l-4 border-l-primary">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <h2 className="flex items-center gap-2 font-semibold text-primary">
                        <Shield className="size-4" aria-hidden="true" /> {s.name}
                      </h2>
                      <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                        {s.address}
                      </p>
                      <p className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Navigation className="size-3" aria-hidden="true" /> approx.{" "}
                          {s.distanceKm} km
                        </span>
                        {s.is_24_hour && (
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" aria-hidden="true" /> 24-hour service
                          </span>
                        )}
                        <span>{s.township}</span>
                      </p>
                    </div>
                    {s.phone && (
                      <Button asChild variant="outline" className="shrink-0 gap-2">
                        <a
                          href={`tel:${s.phone.replace(/\s+/g, "")}`}
                          aria-label={`Call ${s.name}`}
                        >
                          <Phone className="size-4" /> {s.phone}
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}