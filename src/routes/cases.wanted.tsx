import { Suspense } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { PageShell } from "@/components/saps/page-shell";
import { Button } from "@/components/ui/button";
import { GalleryGrid, GallerySkeleton, EmptyState } from "@/components/cases/gallery-grid";
import { WantedCard } from "@/components/cases/case-card";
import { SearchBar } from "@/components/cases/search-bar";
import { WantedFilterPanel } from "@/components/cases/filter-panel";
import { ActiveFilterPills, type FilterPill } from "@/components/cases/active-filter-pills";
import { CasePagination } from "@/components/cases/pagination";
import { listWanted } from "@/lib/cases/cases.functions";
import { wantedSearchSchema, type WantedSearch } from "@/lib/cases/filters";

const wantedListQuery = (search: WantedSearch) =>
  queryOptions({
    queryKey: ["wanted-list", search],
    queryFn: () => listWanted({ data: search }),
  });

export const Route = createFileRoute("/cases/wanted")({
  validateSearch: zodValidator(wantedSearchSchema),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(wantedListQuery(deps)),
  head: () => ({
    meta: [
      { title: "Wanted persons · Community Safety Tracker" },
      {
        name: "description",
        content: "Active wanted persons with warrants — help SAPS apprehend dangerous suspects.",
      },
      { property: "og:title", content: "Wanted persons · Community Safety Tracker" },
    ],
  }),
  component: WantedGallery,
  errorComponent: ({ error }) => (
    <PageShell>
      <p role="alert" className="text-sm text-destructive">
        Could not load cases: {error.message}
      </p>
    </PageShell>
  ),
  notFoundComponent: () => null,
});

function WantedGallery() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const update = (patch: Partial<WantedSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) });
  const clear = () =>
    navigate({
      search: {
        page: 1,
        q: "",
        danger: "all",
        categories: [],
        location: "",
        time: "all",
        reward: "any",
        sort: "newest",
      },
    });

  const pills: FilterPill[] = [
    search.danger !== "all" && {
      key: "danger",
      label: search.danger === "high" ? "High risk" : "Medium & high",
      remove: () => update({ danger: "all", page: 1 }),
    },
    ...search.categories.map((c) => ({
      key: `cat-${c}`,
      label: c,
      remove: () =>
        update({ categories: search.categories.filter((x) => x !== c), page: 1 }),
    })),
    search.location && {
      key: "loc",
      label: search.location,
      remove: () => update({ location: "", page: 1 }),
    },
    search.time !== "all" && {
      key: "time",
      label: `Added: ${search.time}`,
      remove: () => update({ time: "all", page: 1 }),
    },
    search.reward !== "any" && {
      key: "reward",
      label: search.reward === "rewardOnly" ? "Reward only" : "No reward",
      remove: () => update({ reward: "any", page: 1 }),
    },
  ].filter(Boolean) as FilterPill[];

  return (
    <PageShell>
      <div className="space-y-5">
        <div>
          <Button variant="ghost" size="sm" asChild className="gap-1 -ml-2">
            <Link to="/cases">
              <ChevronLeft className="size-4" /> All cases
            </Link>
          </Button>
        </div>
        <header className="space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight text-primary">
            Wanted persons
          </h1>
          <p className="text-sm text-muted-foreground">
            Help apprehend dangerous suspects with active warrants.
          </p>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchBar
            value={search.q}
            onChange={(v) => update({ q: v, page: 1 })}
            placeholder="Search wanted persons by name…"
          />
          <WantedFilterPanel
            search={search}
            onChange={update}
            onClear={clear}
            activeCount={pills.length}
          />
        </div>

        <ActiveFilterPills pills={pills} onClearAll={clear} />

        <Suspense fallback={<GallerySkeleton />}>
          <WantedResults search={search} navigate={navigate} />
        </Suspense>
      </div>
    </PageShell>
  );
}

function WantedResults({
  search,
  navigate,
}: {
  search: WantedSearch;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { data } = useSuspenseQuery(wantedListQuery(search));

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
              <WantedCard item={item} />
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
            to="/cases/wanted"
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