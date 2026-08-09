import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { getDashboardCases, type CarouselCase } from "@/lib/dashboard/dashboard.functions";

function CaseSlide({
  item,
  kind,
}: {
  item: CarouselCase;
  kind: "wanted" | "missing";
}) {
  const wanted = kind === "wanted";
  return (
    <Card
      className={`h-full overflow-hidden border-l-4 ${
        wanted ? "border-l-destructive" : "border-l-primary"
      }`}
    >
      <Link
        to={wanted ? "/cases/wanted/$id" : "/cases/missing/$id"}
        params={{ id: item.id }}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {item.photos[0] ? (
          <img
            src={item.photos[0]}
            alt={`Photograph of ${wanted ? "wanted" : "missing"} person ${item.full_name}`}
            className="aspect-[4/5] w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid aspect-[4/5] place-items-center bg-muted text-sm text-muted-foreground">
            No photo
          </div>
        )}
        <CardContent className="space-y-1 p-4">
          <h3 className="font-display text-base font-bold leading-tight text-primary">
            {item.full_name}
          </h3>
          <p className="text-xs text-muted-foreground">{item.subtitle}</p>
          {item.meta && (
            <p
              className={`text-xs font-semibold ${
                wanted ? "text-destructive" : "text-primary"
              }`}
            >
              {item.meta}
            </p>
          )}
        </CardContent>
      </Link>
    </Card>
  );
}

function CaseRow({
  heading,
  viewAllTo,
  items,
  kind,
}: {
  heading: string;
  viewAllTo: "/cases/wanted" | "/cases/missing";
  items: CarouselCase[];
  kind: "wanted" | "missing";
}) {
  if (items.length === 0) return null;
  const headingId = `carousel-${kind}-heading`;
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-xl font-semibold">
          {heading}
        </h2>
        <Link
          to={viewAllTo}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View all <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
        <CarouselContent>
          {items.map((item) => (
            <CarouselItem key={item.id} className="basis-1/2 sm:basis-1/3 lg:basis-1/5">
              <CaseSlide item={item} kind={kind} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="min-h-11 min-w-11" aria-label={`Previous ${kind} cases`} />
        <CarouselNext className="min-h-11 min-w-11" aria-label={`Next ${kind} cases`} />
      </Carousel>
    </section>
  );
}

export function CaseCarousels() {
  const casesFn = useServerFn(getDashboardCases);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-cases"],
    queryFn: () => casesFn(),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <div className="h-72 animate-pulse rounded-md bg-muted/50" aria-hidden="true" />;
  }

  return (
    <div className="space-y-6">
      <CaseRow
        heading="Most wanted"
        viewAllTo="/cases/wanted"
        items={data?.wanted ?? []}
        kind="wanted"
      />
      <CaseRow
        heading="Missing persons"
        viewAllTo="/cases/missing"
        items={data?.missing ?? []}
        kind="missing"
      />
    </div>
  );
}