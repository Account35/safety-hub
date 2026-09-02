import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { listAdminReports } from "@/lib/admin/reports.functions";
import { useStaff } from "@/lib/admin/use-staff";
import { TOWNSHIPS } from "@/lib/reports/townships";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Report queue · SAPS Admin" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Priority-ordered citizen report queue for SAPS staff." },
    ],
  }),
  component: AdminReportsPage,
});

const STATUSES = ["all", "submitted", "under_review", "actioned", "closed"];

function AdminReportsPage() {
  const { roles } = useStaff();
  const [status, setStatus] = useState("all");
  const [township, setTownship] = useState("all");
  const [q, setQ] = useState("");

  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "reports", status, township, q],
    queryFn: () =>
      listAdminReports({
        data: {
          ...(status !== "all" ? { status } : {}),
          ...(township !== "all" ? { township } : {}),
          ...(q.trim() ? { q: q.trim() } : {}),
        },
      }),
  });

  return (
    <AdminShell
      title="Report queue"
      description="Reports are ordered by priority and AI quality score. Reporters are identified only by anonymous code."
      roles={roles}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            aria-pressed={status === s}
            className={`rounded-full border px-3 py-1 text-xs capitalize ${
              status === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground"
            }`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
        <select
          value={township}
          onChange={(e) => setTownship(e.target.value)}
          aria-label="Filter by area"
          className="ml-auto h-9 rounded-md border border-border bg-background px-2 text-xs"
        >
          <option value="all">All areas</option>
          {TOWNSHIPS.map((tn) => (
            <option key={tn} value={tn}>
              {tn}
            </option>
          ))}
        </select>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search reference"
          aria-label="Search reports"
          className="w-full sm:w-56"
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load reports: {error.message}
        </p>
      ) : null}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Citizen report queue</caption>
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2">Reference</th>
              <th scope="col" className="px-4 py-2">Priority</th>
              <th scope="col" className="px-4 py-2">Area</th>
              <th scope="col" className="px-4 py-2">Quality</th>
              <th scope="col" className="px-4 py-2">Assigned</th>
              <th scope="col" className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">
                  <Link
                    to="/admin/report/$reportId"
                    params={{ reportId: r.id }}
                    className="underline-offset-2 hover:underline"
                  >
                    {r.report_id}
                  </Link>
                </td>
                <td className="px-4 py-2 capitalize">{r.priority}</td>
                <td className="px-4 py-2">{r.location_township ?? "—"}</td>
                <td className="px-4 py-2">{r.quality_score ?? "—"}</td>
                <td className="px-4 py-2">{r.assigned_name ?? "Unassigned"}</td>
                <td className="px-4 py-2">
                  <Badge variant="secondary" className="text-xs">
                    {r.status.replace("_", " ")}
                  </Badge>
                </td>
              </tr>
            ))}
            {!isPending && !(data ?? []).length ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No reports match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </AdminShell>
  );
}