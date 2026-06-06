import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CasePagination({
  page,
  total,
  pageSize,
  buildLink,
}: {
  page: number;
  total: number;
  pageSize: number;
  buildLink: (page: number) => { to: string; search: Record<string, unknown> };
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{start}–{end}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" disabled={page === 1}>
          <Link
            to={buildLink(prev).to}
            search={buildLink(prev).search}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" /> Prev
          </Link>
        </Button>
        <span className="text-sm tabular-nums" aria-live="polite">
          Page {page} / {totalPages}
        </span>
        <Button asChild variant="outline" size="sm" disabled={page === totalPages}>
          <Link
            to={buildLink(next).to}
            search={buildLink(next).search}
            aria-label="Next page"
          >
            Next <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>
    </nav>
  );
}