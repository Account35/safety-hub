import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft, Phone, MapPin, Clock, Heart, AlertCircle } from "lucide-react";
import { PageShell } from "@/components/saps/page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VulnerabilityBadge } from "@/components/cases/badges";
import { ShareButton } from "@/components/cases/share-button";
import { getMissing } from "@/lib/cases/cases.functions";
import { timeMissingLabel } from "@/lib/cases/filters";

const missingQuery = (id: string) =>
  queryOptions({
    queryKey: ["missing", id],
    queryFn: async () => {
      const row = await getMissing({ data: { id } });
      if (!row) throw notFound();
      return row;
    },
  });

export const Route = createFileRoute("/cases/missing/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(missingQuery(params.id)),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.full_name ?? "Missing person"} · Community Safety Tracker` },
      {
        name: "description",
        content: loaderData
          ? `Help find ${loaderData.full_name}, missing from ${loaderData.last_seen_location ?? "South Africa"}.`
          : "Missing person profile",
      },
      { property: "og:image", content: loaderData?.photos?.[0] ?? "" },
    ],
  }),
  component: MissingDetail,
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
          This person may have been found or the case closed.
        </p>
        <Button asChild className="mt-4">
          <Link to="/cases/missing">Back to missing persons</Link>
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

const CIRCUMSTANCE_LABELS: Record<string, string> = {
  voluntary: "Voluntary missing",
  family_conflict: "Family conflict",
  endangered: "Endangered / suspected abduction",
  medical: "Medical emergency",
  unknown: "Unknown circumstance",
};

function MissingDetail() {
  const { id } = Route.useParams();
  const { data: p } = useSuspenseQuery(missingQuery(id));
  const meta = timeMissingLabel(p.last_seen_at);
  const photo = p.photos[0];

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
          <Link to="/cases/missing">
            <ChevronLeft className="size-4" /> Back to missing
          </Link>
        </Button>

        {meta.critical && (
          <div
            role="alert"
            className="rounded-md bg-destructive p-4 text-destructive-foreground"
          >
            <p className="text-base font-bold uppercase tracking-wide">Last 48 hours · Urgent</p>
            <p className="text-sm">Any information could be critical. Contact SAPS or the family immediately.</p>
          </div>
        )}

        {p.is_endangered && !meta.critical && (
          <div className="flex items-start gap-2 rounded-md bg-orange-500/15 p-3 text-orange-900">
            <AlertCircle className="mt-0.5 size-5 shrink-0" />
            <p className="text-sm font-medium">Endangered — vulnerable person, please prioritize safety.</p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="overflow-hidden rounded-lg border">
            {photo ? (
              <img
                src={photo}
                alt={`Photograph of missing person ${p.full_name}`}
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
              <p className="inline-flex items-center gap-1 text-sm">
                <Clock className="size-4" />
                <span className={meta.urgent ? "font-bold text-orange-700" : "font-medium text-blue-700"}>
                  {meta.text}
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {p.vulnerability_indicators.map((v) => (
                  <VulnerabilityBadge key={v} label={v} />
                ))}
              </div>
            </header>

            <section aria-labelledby="phys" className="space-y-3">
              <h2 id="phys" className="text-lg font-semibold">Physical description</h2>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Row label="Age at disappearance" value={p.age_at_disappearance} />
                <Row label="Gender" value={p.gender} />
                <Row label="Ethnicity" value={p.ethnicity} />
                <Row label="Height" value={p.height_cm ? `${(p.height_cm / 100).toFixed(2)}m` : null} />
                <Row label="Weight" value={p.weight_kg ? `${p.weight_kg}kg` : null} />
                <Row label="Build" value={p.build} />
                <Row label="Hair" value={p.hair_color} />
                <Row label="Eyes" value={p.eye_color} />
                <Row label="Complexion" value={p.complexion} />
              </dl>
              {p.distinguishing_features.length > 0 && (
                <Row label="Distinguishing features" value={p.distinguishing_features.join(", ")} />
              )}
            </section>
          </div>
        </div>

        {(p.medical_conditions.length > 0 || p.special_needs.length > 0 || p.cognitive_impairment) && (
          <section aria-labelledby="vuln" className="space-y-3">
            <h2 id="vuln" className="text-lg font-semibold">Vulnerability &amp; medical</h2>
            <div className="space-y-2 rounded-md border-l-4 border-l-destructive bg-destructive/5 p-4">
              {p.medical_conditions.length > 0 && (
                <Row label="Medical conditions" value={p.medical_conditions.join(", ")} />
              )}
              {p.cognitive_impairment && (
                <Row label="Cognitive impairment" value="Yes — may be confused or unable to ask for help" />
              )}
              {p.special_needs.length > 0 && (
                <Row label="Special needs" value={p.special_needs.join(", ")} />
              )}
            </div>
          </section>
        )}

        <section aria-labelledby="circ" className="space-y-3">
          <h2 id="circ" className="text-lg font-semibold">Disappearance circumstances</h2>
          <Row label="Type" value={CIRCUMSTANCE_LABELS[p.circumstances]} />
          {p.circumstances_narrative && (
            <p className="text-sm leading-relaxed text-muted-foreground">{p.circumstances_narrative}</p>
          )}
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
              value={p.last_seen_at ? new Date(p.last_seen_at).toLocaleString() : null}
            />
            <Row label="Wearing" value={p.last_seen_clothing} />
            {p.possessions.length > 0 && (
              <Row label="Carrying" value={p.possessions.join(", ")} />
            )}
          </dl>
        </section>

        {(p.family_contact_name || p.family_contact_phone) && (
          <section aria-labelledby="contact" className="space-y-3">
            <h2 id="contact" className="text-lg font-semibold">Family contact</h2>
            <Card className="border-primary/30 bg-primary/5 p-5">
              <p className="flex items-center gap-2 text-sm font-medium text-primary">
                <Heart className="size-4" /> If you have any information, please contact:
              </p>
              {p.family_contact_name && (
                <p className="mt-2 font-semibold">{p.family_contact_name}</p>
              )}
              {p.family_contact_phone && (
                <a
                  href={`tel:${p.family_contact_phone}`}
                  className="mt-1 inline-flex items-center gap-2 text-lg font-bold text-primary hover:underline"
                >
                  <Phone className="size-4" /> {p.family_contact_phone}
                </a>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                You can also contact SAPS on{" "}
                <a href="tel:10111" className="font-medium underline">10111</a>.
                Any information, no matter how small, could help bring {p.full_name.split(" ")[0]} home.
              </p>
            </Card>
          </section>
        )}

        <div className="sticky bottom-20 z-10 -mx-4 flex flex-col gap-2 border-t bg-background/95 p-4 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:border-0 sm:bg-transparent sm:p-0 md:bottom-0">
          <Button asChild className="h-12 flex-1 gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link
              to="/report"
              search={{ caseType: "missing", caseId: p.id }}
              aria-label={`Report sighting of ${p.full_name}`}
            >
              Report sighting
            </Link>
          </Button>
          <ShareButton title={p.full_name} text={`Missing: ${p.full_name}`} />
        </div>
      </div>
    </PageShell>
  );
}