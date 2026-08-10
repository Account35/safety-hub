import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSearch, MessageSquare, Shield, UserSearch, Clock } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAdminOverview } from "@/lib/admin/admin.functions";
import { useStaff } from "@/lib/admin/use-staff";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin overview · SAPS Community Safety Tracker" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content: "Live report queue, case counts and staff activity for SAPS staff.",
      },
    ],
  }),
  component: AdminOverviewPage,
});

function AdminOverviewPage() {
  const { roles } = useStaff();
  const queryClient = useQueryClient();
  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => getAdminOverview(),
  });

  // Live report feed: refresh the overview whenever a report row changes.
  useEffect(() => {
    const channel = supabase
      .channel("admin-reports-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
        void queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const stats = [
    { label: "Reports today", value: data?.totals.reportsToday, icon: FileSearch },
    { label: "Awaiting review", value: data?.totals.reportsPending, icon: Clock },
    { label: "Open conversations", value: data?.totals.openConversations, icon: MessageSquare },
    { label: "Active wanted", value: data?.totals.activeWanted, icon: Shield },
    { label: "Active missing", value: data?.totals.activeMissing, icon: UserSearch },
  ];

  return (
    <AdminShell
      title="Overview"
      description="Live snapshot of the reporting queue and active cases. Reporter identities stay anonymous — only anonymous codes are shown."
      roles={roles}
      actions={
        <>
          <Button asChild size="sm">
            <Link to="/admin/reports">Open report queue</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/cases/new">New case</Link>
          </Button>
        </>
      }
    >
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load the overview: {error.message}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <s.icon className="mb-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <p className="text-2xl font-semibold tabular-nums">
              {isPending ? "—" : (s.value ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Latest reports (live)</h2>
          <Badge variant="outline" className="text-xs">
            realtime
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Most recent citizen reports</caption>
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2">Reference</th>
                <th scope="col" className="px-4 py-2">Reporter</th>
                <th scope="col" className="px-4 py-2">Area</th>
                <th scope="col" className="px-4 py-2">Quality</th>
                <th scope="col" className="px-4 py-2">Status</th>
                <th scope="col" className="px-4 py-2">Received</th>
              </tr>
            </thead>
            <tbody>
              {(data?.latest ?? []).map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">
                    <Link
                      to="/admin/reports/$reportId"
                      params={{ reportId: r.id }}
                      className="underline-offset-2 hover:underline"
                    >
                      {r.report_id}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{r.reporter_anon_code}</td>
                  <td className="px-4 py-2">{r.location_township ?? "—"}</td>
                  <td className="px-4 py-2">
                    {r.quality_tier ? `${r.quality_tier} (${r.quality_score ?? "—"})` : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="secondary" className="text-xs">
                      {r.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(r.submission_timestamp).toLocaleString("en-ZA")}
                  </td>
                </tr>
              ))}
              {!isPending && !(data?.latest ?? []).length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    No reports yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  );
}