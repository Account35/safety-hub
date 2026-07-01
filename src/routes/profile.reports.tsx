import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, FileSearch, MessageSquare } from "lucide-react";
import { PageShell } from "@/components/saps/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportStatusBadge } from "@/components/report-status-badge";
import { getMyReports } from "@/lib/profile.functions";
import type { ReportHistoryItem } from "@/lib/profile.functions";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile/reports")({
  head: () => ({ meta: [{ title: "My Reports · Community Safety Tracker" }] }),
  component: ReportsHistoryPage,
});

type Filter = "all" | "wanted" | "missing";

function ReportsHistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ReportHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReportHistoryItem | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getMyReports({ data: { page, caseType: filter } })
      .then(({ items: newItems, total: t }) => {
        setItems(p => page === 1 ? newItems : [...p, ...newItems]);
        setTotal(t);
      })
      .finally(() => setLoading(false));
  }, [user, filter, page]);

  function changeFilter(f: Filter) {
    setFilter(f);
    setPage(1);
    setItems([]);
  }

  if (selected) return <ReportDetail report={selected} onBack={() => setSelected(null)} />;

  return (
    <PageShell>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/profile" })} aria-label="Back to profile" tabIndex={0}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-primary">My Reports</h1>
          <p className="text-xs text-muted-foreground">{total} report{total !== 1 ? "s" : ""} submitted</p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-4" role="group" aria-label="Filter reports">
        {(["all", "wanted", "missing"] as const).map((f) => (
          <button
            key={f}
            onClick={() => changeFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              filter === f ? "bg-accent text-accent-foreground" : "bg-muted text-foreground",
            )}
            style={{ minHeight: 44 }}
            aria-pressed={filter === f}
          >
            {f === "all" ? "All" : f === "wanted" ? "Wanted Person Reports" : "Missing Person Reports"}
          </button>
        ))}
      </div>

      {loading && page === 1 && (
        <div className="space-y-3">{[1, 2, 3].map(n => <Skeleton key={n} className="h-24 rounded-xl" />)}</div>
      )}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <FileSearch className="size-14 text-accent" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-primary">No Reports Yet</h2>
          <p className="text-sm text-muted-foreground max-w-xs">When you report information about a wanted or missing person, it will appear here.</p>
          <Button asChild className="bg-accent text-accent-foreground"><Link to="/cases/">Browse Cases</Link></Button>
        </div>
      )}

      <div className="space-y-3">
        {items.map((r) => (
          <button
            key={r.id}
            className="w-full text-left"
            onClick={() => setSelected(r)}
            aria-label={`Report ${r.report_id} for ${r.case_name ?? r.case_type} case. Status: ${r.status}.`}
          >
            <Card className="hover:bg-muted/40 transition-colors">
              <CardContent className="p-4 flex gap-3">
                <div className="shrink-0">
                  {r.case_photo
                    ? <img src={r.case_photo} alt="" className="size-[50px] rounded-full object-cover" aria-hidden="true" />
                    : <div className="size-[50px] rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold" aria-hidden="true">{r.case_name?.[0] ?? "?"}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm truncate">{r.case_name ?? "Unknown"}</p>
                      <p className={`text-xs font-medium ${r.case_type === "wanted" ? "text-destructive" : "text-blue-600"}`}>
                        {r.case_type === "wanted" ? "Wanted Person" : "Missing Person"}
                      </p>
                    </div>
                    <ReportStatusBadge status={r.status} />
                  </div>
                  <p className="text-xs font-mono text-muted-foreground mt-1">{r.report_id}</p>
                  <p className="text-xs text-muted-foreground">{formatSubmitted(r.submission_timestamp)}</p>
                  {r.conversation_id && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                      <MessageSquare className="size-3" aria-hidden="true" />
                      <span>Officer has responded</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {items.length < total && (
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground mb-2">Showing {items.length} of {total} reports</p>
          <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={loading}>
            {loading ? "Loading…" : "Load More"}
          </Button>
        </div>
      )}
    </PageShell>
  );
}

function ReportDetail({ report, onBack }: { report: ReportHistoryItem; onBack: () => void }) {
  const navigate = useNavigate();
  return (
    <PageShell>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to reports" tabIndex={0}>
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-lg font-bold text-primary">Report Detail</h1>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 flex gap-3 items-center">
          {report.case_photo
            ? <img src={report.case_photo} alt="" className="size-14 rounded-full object-cover shrink-0" />
            : <div className="size-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">{report.case_name?.[0] ?? "?"}</div>}
          <div>
            <p className="font-semibold">{report.case_name ?? "Unknown"}</p>
            <p className={`text-xs font-medium ${report.case_type === "wanted" ? "text-destructive" : "text-blue-600"}`}>
              {report.case_type === "wanted" ? "Wanted Person" : "Missing Person"}
            </p>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">{report.report_id}</p>
            <div className="mt-1"><ReportStatusBadge status={report.status} /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold text-sm">When and Where</h2>
          {report.sighting_date && <p className="text-sm">Date: {report.sighting_date}{report.sighting_time ? ` at ${report.sighting_time}` : ""}</p>}
          {report.location_township && <p className="text-sm">Location: {report.location_township}</p>}
          <p className="text-xs text-muted-foreground">Exact location is never stored to protect your privacy.</p>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="p-4 space-y-2">
          <h2 className="font-semibold text-sm">What Was Reported</h2>
          <div className="flex gap-2 flex-wrap">
            {report.reporting_methods.map(m => (
              <span key={m} className="text-xs bg-muted rounded px-2 py-1 capitalize">{m}</span>
            ))}
          </div>
          {report.text_description && (
            <p className="text-sm mt-2 text-foreground">{report.text_description}</p>
          )}
          {report.photos?.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {report.photos.map((p, i) => (
                <img key={i} src={p.path} alt={p.caption || `Photo ${i + 1}`} className="size-16 rounded object-cover" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {report.conversation_id ? (
        <Button className="w-full bg-primary text-primary-foreground" onClick={() => navigate({ to: "/chats/$id", params: { id: report.conversation_id! } })}>
          View Conversation
        </Button>
      ) : (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground text-center">
          If a SAPS officer has questions about this report, a conversation will appear here.
        </div>
      )}
    </PageShell>
  );
}

function formatSubmitted(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 7) return `Submitted ${days === 0 ? "today" : `${days} day${days > 1 ? "s" : ""} ago`}`;
  return `Submitted ${new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}`;
}
