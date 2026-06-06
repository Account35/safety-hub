import { Suspense } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { PageShell } from "@/components/saps/page-shell";
import { Button } from "@/components/ui/button";
import { GalleryGrid, GallerySkeleton, EmptyState } from "@/components/cases/gallery-grid";
import { MissingCard } from "@/components/cases/case-card";
import { SearchBar } from "@/components/cases/search-bar";
import { MissingFilterPanel } from "@/components/cases/filter-panel";
import { ActiveFilterPills, type FilterPill } from "@/components/cases/active-filter-pills";
import { CasePagination } from "@/components/cases/pagination";
import { listMissing } from "@/lib/cases/cases.functions";
import { missingSearchSchema, type MissingSearch } from "@/lib/cases/filters";

const missingListQuery = (search: MissingSearch) =>
  queryOptions({
    queryKey: ["missing-list", search],
    queryFn: () => listMissing({ data: search }),
  });

export const Route = createFileRoute("/cases/missing")({
  validateSearch: zodValidator(missingSearchSchema),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(missingListQuery(deps)),
  head: () => ({
    meta: [
      { title: "Missing persons · Community Safety Tracker" },
      {
        name: "description",
        content: "Active missing person cases — help bring vulnerable people home.",
      },
      { property: "og:title", content: "Missing persons · Community Safety Tracker" },
    ],
  }),
  component: MissingGallery,
  errorComponent: ({ error }) => (
    <PageShell>
      <p role="alert" className="text-sm text-destructive">
        Could not load cases: {error.message}
      </p>
    </PageShell>
  ),
  notFoundComponent: () => null,
});

function MissingGallery() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const update = (patch: Partial<MissingSearch>) =>
    navigate({ search: (prev: MissingSearch) => ({ ...prev, ...patch }) });
  const clear = () =>
    navigate({
      search: {
        page: 1,
        q: "",
        time: "all",
        ages: [],
        vulns: [],
        circumstances: [],
        location: "",
        sort: "newest",
      },
    });

  const pills: FilterPill[] = [
    search.time !== "all" && {
      key: "time",
      label: `Missing: ${search.time}`,
      remove: () => update({ time: "all", page: 1 }),
    },
    ...search.ages.map((a: string) => ({
      key: `age-${a}`,
      label: a,
      remove: () => update({ ages: search.ages.filter((x: string) => x !== a), page: 1 }),
    })),
    ...search.vulns.map((v: string) => ({
      key: `vul-${v}`,
      label: v,
      remove: () => update({ vulns: search.vulns.filter((x: string) => x !== v), page: 1 }),
    })),
    ...search.circumstances.map((c: string) => ({
      key: `cir-${c}`,
      label: c.replace("_", " "),
      remove: () =>
        update({ circumstances: search.circumstances.filter((x: string) => x !== c), page: 1 }),
    })),
    search.location && {
      key: "loc",
      label: search.location,
      remove: () => update({ location: "", page: 1 }),
    },
  ].filter(Boolean) as FilterPill[];

  return (
    <PageShell>
      <div className="space-y-5">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
            <Link to="/cases">
              <ChevronLeft className="size-4" /> All cases
            </Link>
          </Button>
        </div>
        <header className="space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight text-primary">
            Missing persons
          </h1>
          <p className="text-sm text-muted-foreground">
            Help find missing people and bring them home safely.
          </p>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchBar
            value={search.q}
            onChange={(v) => update({ q: v, page: 1 })}
            placeholder="Search missing persons by name…"
          />
          <MissingFilterPanel
            search={search}
            onChange={update}
            onClear={clear}
            activeCount={pills.length}
          />
        </div>

        <ActiveFilterPills pills={pills} onClearAll={clear} />

        <Suspense fallback={<GallerySkeleton />}>
          <MissingResults search={search} />
        </Suspense>
      </div>
    </PageShell>
  );
}

function MissingResults({ search }: { search: MissingSearch }) {
  const { data } = useSuspenseQuery(missingListQuery(search));
  return (
    <>
      <p className="sr-only" aria-live="polite">
        Showing {data.items.length} of {data.total} results
      </p>
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{data.total}</span>{" "}
        {data.total === 1 ? "case" : "cases"}
        {search.q && (
          <>
            {" "}for "<span className="font-medium text-foreground">{search.q}</span>"
          </>
        )}
      </p>
      {data.items.length === 0 ? (
        <EmptyState
          title="No cases match your filters"
          description="Try broadening your search criteria or removing some filters."
        />
      ) : (
        <GalleryGrid>
          {data.items.map((item) => (
            <div role="listitem" key={item.id}>
              <MissingCard item={item} />
            </div>
          ))}
        </GalleryGrid>
      )}
      <CasePagination
        page={data.page}
        total={data.total}
        pageSize={data.pageSize}
        renderLink={(p, children, label) => (
          <Link
            to="/cases/missing"
            search={{ ...search, page: p }}
            aria-label={label}
            onClick={() => {
              if (typeof window !== "undefined") window.scrollTo({ top: 0 });
            }}
          >
            {children}
          </Link>
        )}
      />
    </>
  );
}