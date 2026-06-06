import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Shield, UserSearch, ArrowRight } from "lucide-react";
import { PageShell } from "@/components/saps/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCaseCounts } from "@/lib/cases/cases.functions";

const countsQuery = queryOptions({
  queryKey: ["case-counts"],
  queryFn: () => getCaseCounts(),
});

export const Route = createFileRoute("/cases/")({
  head: () => ({
    meta: [
      { title: "Cases · Community Safety Tracker" },
      {
        name: "description",
        content: "Browse active wanted person and missing person cases across South Africa.",
      },
      { property: "og:title", content: "Browse cases · Community Safety Tracker" },
      {
        property: "og:description",
        content: "Help SAPS find wanted suspects and missing persons in your community.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(countsQuery),
  component: CasesIndex,
  errorComponent: ({ error }) => (
    <PageShell>
      <p role="alert" className="text-sm text-destructive">
        Could not load cases: {error.message}
      </p>
    </PageShell>
  ),
  notFoundComponent: () => null,
});

function CasesIndex() {
  const { data } = useSuspenseQuery(countsQuery);
  return (
    <PageShell>
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-2 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Browse cases
          </h1>
          <p className="mx-auto max-w-xl text-base text-muted-foreground">
            Help your community by reviewing active wanted and missing person cases.
          </p>
        </header>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          <Link
            to="/cases/wanted"
            className="group focus:outline-none"
            aria-label={`Browse ${data.wanted} wanted persons`}
          >
            <Card className="h-full border-l-4 border-l-destructive p-6 transition-shadow group-hover:shadow-xl group-focus-visible:ring-2 group-focus-visible:ring-accent">
              <div className="flex items-start justify-between">
                <span
                  aria-hidden="true"
                  className="grid size-12 place-items-center rounded-md bg-accent text-accent-foreground"
                >
                  <Shield className="size-6" />
                </span>
                <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">
                  {data.wanted} Active
                </span>
              </div>
              <h2 className="mt-4 font-display text-2xl font-bold text-primary">Wanted persons</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Help apprehend dangerous suspects with active warrants.
              </p>
              <Button className="mt-6 gap-2" variant="default">
                Browse wanted persons <ArrowRight className="size-4" />
              </Button>
            </Card>
          </Link>

          <Link
            to="/cases/missing"
            className="group focus:outline-none"
            aria-label={`Browse ${data.missing} missing persons`}
          >
            <Card className="h-full border-l-4 border-l-primary p-6 transition-shadow group-hover:shadow-xl group-focus-visible:ring-2 group-focus-visible:ring-accent">
              <div className="flex items-start justify-between">
                <span
                  aria-hidden="true"
                  className="grid size-12 place-items-center rounded-md bg-accent text-accent-foreground"
                >
                  <UserSearch className="size-6" />
                </span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  {data.missing} Missing
                </span>
              </div>
              <h2 className="mt-4 font-display text-2xl font-bold text-primary">Missing persons</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Help find missing people and bring them home safely.
              </p>
              <Button className="mt-6 gap-2" variant="default">
                Browse missing persons <ArrowRight className="size-4" />
              </Button>
            </Card>
          </Link>
        </div>
      </div>
    </PageShell>
  );
}