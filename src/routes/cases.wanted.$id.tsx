import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft, AlertTriangle, MapPin, Calendar, FileText } from "lucide-react";
import { PageShell } from "@/components/saps/page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CrimeBadge, DangerBadge } from "@/components/cases/badges";
import { ShareButton } from "@/components/cases/share-button";
import { getWanted } from "@/lib/cases/cases.functions";
import { formatRelative } from "@/lib/cases/filters";
import type { Crime } from "@/lib/cases/types";

const wantedQuery = (id: string) =>
  queryOptions({
    queryKey: ["wanted", id],
    queryFn: async () => {
      const row = await getWanted({ data: { id } });
      if (!row) throw notFound();
      return row;
    },
  });

export const Route = createFileRoute("/cases/wanted/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(wantedQuery(params.id)),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.full_name ?? "Wanted person"} · Community Safety Tracker` },
      {
        name: "description",
        content: loaderData
          ? `${loaderData.full_name} — wanted for ${loaderData.crime_category ?? "outstanding warrants"}.`
          : "Wanted person profile",
      },
      {
        property: "og:image",
        content: loaderData?.photos?.[0] ?? "",
      },
    ],
  }),
  component: WantedDetail,
  errorComponent: ({ error }) => (
    <PageShell>
      <p role="alert" className="text-sm text-destructive">Error: {error.message}</p>
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <Card className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl font-semibold">Case not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This case may have been closed or removed.
        </p>
        <Button asChild className="mt-4">
          <Link to="/cases/wanted">Back to wanted persons</Link>
        </Button>
      </Card>
    </PageShell>
  ),
});

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

function WantedDetail() {
  const { id } = Route.useParams();
  const { data: p } = useSuspenseQuery(wantedQuery(id));

  const photo = p.photos[0];
  const crimes = (p.crimes as unknown as Crime[]) ?? [];
  const heightDisplay = p.height_cm
    ? `${(p.height_cm / 100).toFixed(2)}m (${Math.round(p.height_cm / 2.54 / 12)}'${Math.round((p.height_cm / 2.54) % 12)}")`
    : null;
  const weightDisplay = p.weight_kg
    ? `${p.weight_kg}kg (${Math.round(p.weight_kg * 2.2)} lbs)`
    : null;

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
          <Link to="/cases/wanted">
            <ChevronLeft className="size-4" /> Back to wanted
          </Link>
        </Button>

        {p.armed && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-md bg-destructive p-4 text-destructive-foreground"
          >
            <AlertTriangle className="size-6 shrink-0" />
            <div>
              <p className="text-base font-bold uppercase tracking-wide">Armed and dangerous</p>
              <p className="text-sm">Do NOT approach. Maintain safe distance and contact SAPS on 10111.</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="overflow-hidden rounded-lg border">
            {photo ? (
              <img
                src={photo}
                alt={`Photograph of wanted person ${p.full_name}`}
                className="aspect-[4/5] w-full object-cover"
              />
            ) : (
              <div className="grid aspect-[4/5] place-items-center bg-muted text-muted-foreground">
                No photo
              </div>
            )}
          </div>

          <div className="space-y-5">
            <header className="space-y-2">
              <h1 className="font-display text-3xl font-bold text-primary">{p.full_name}</h1>
              {p.aliases.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Also known as: {p.aliases.join(", ")}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <DangerBadge level={p.danger_level} armed={p.armed} />
                <CrimeBadge category={p.crime_category} />
                <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-700">
                  Active warrant
                </span>
              </div>
            </header>

            {p.reward_amount != null && (
              <Card className="border-accent/40 bg-accent/15 p-4">
                <p className="text-xs uppercase tracking-wide text-accent-foreground/80">Reward</p>
                <p className="text-2xl font-bold text-accent-foreground">
                  R{Number(p.reward_amount).toLocaleString()}
                </p>
                <p className="text-xs text-accent-foreground/80">
                  For information leading to arrest and conviction.
                </p>
              </Card>
            )}

            <section aria-labelledby="phys" className="space-y-3">
              <h2 id="phys" className="text-lg font-semibold">Physical description</h2>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Row label="Age" value={p.age} />
                <Row label="Gender" value={p.gender} />
                <Row label="Ethnicity" value={p.ethnicity} />
                <Row label="Height" value={heightDisplay} />
                <Row label="Weight" value={weightDisplay} />
                <Row label="Build" value={p.build} />
                <Row label="Hair" value={p.hair_color} />
                <Row label="Eyes" value={p.eye_color} />
                <Row label="Complexion" value={p.complexion} />
              </dl>
              {p.distinguishing_features.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Distinguishing features
                  </p>
                  <ul className="mt-1 list-inside list-disc text-sm">
                    {p.distinguishing_features.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
        </div>

        {crimes.length > 0 && (
          <section aria-labelledby="crimes" className="space-y-3">
            <h2 id="crimes" className="text-lg font-semibold">Crimes &amp; charges</h2>
            <ul className="space-y-2">
              {crimes.map((c, i) => (
                <li key={i} className="flex items-start gap-3 rounded-md border p-3">
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{c.charge}</p>
                    {c.date && (
                      <p className="text-xs text-muted-foreground">{new Date(c.date).toLocaleDateString()}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="warrant" className="space-y-3">
          <h2 id="warrant" className="text-lg font-semibold">Warrant details</h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Row label="Case number" value={p.warrant_number} />
            <Row label="Station" value={p.station} />
            <Row label="Investigating officer" value={p.investigating_officer} />
          </dl>
        </section>

        <section aria-labelledby="last-seen" className="space-y-3">
          <h2 id="last-seen" className="text-lg font-semibold">Last seen</h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Row
              label="Location"
              value={
                p.last_seen_location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" /> {p.last_seen_location}
                  </span>
                )
              }
            />
            <Row
              label="When"
              value={
                p.last_seen_at && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3" /> {formatRelative(p.last_seen_at)}
                  </span>
                )
              }
            />
          </dl>
          {p.last_seen_notes && <p className="text-sm text-muted-foreground">{p.last_seen_notes}</p>}
          {p.known_associates.length > 0 && (
            <Row label="Known associates" value={p.known_associates.join(", ")} />
          )}
          {p.known_hangouts.length > 0 && (
            <Row label="Known hangouts" value={p.known_hangouts.join(", ")} />
          )}
          {p.vehicle && <Row label="Vehicle" value={p.vehicle} />}
        </section>

        <div className="sticky bottom-20 z-10 -mx-4 flex flex-col gap-2 border-t bg-background/95 p-4 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:border-0 sm:bg-transparent sm:p-0 md:bottom-0">
          <Button asChild className="h-12 flex-1 gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link
              to="/report"
              search={{ caseType: "wanted", caseId: p.id }}
              aria-label={`Report sighting of ${p.full_name}`}
            >
              Report sighting
            </Link>
          </Button>
          <ShareButton title={p.full_name} text={`Wanted: ${p.full_name}`} />
        </div>
      </div>
    </PageShell>
  );
}