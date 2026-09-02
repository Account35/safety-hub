import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import { CaseChatPanel } from "@/components/admin/case-chat-panel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getAdminReport,
  listStaff,
  assignReport,
  recordReportOutcome,
} from "@/lib/admin/reports.functions";
import { useStaff } from "@/lib/admin/use-staff";

export const Route = createFileRoute("/admin/report/$reportId")({
  head: () => ({
    meta: [
      { title: "Report review · SAPS Admin" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Review an anonymous citizen report, assign it and record the outcome." },
    ],
  }),
  component: AdminReportDetailPage,
});

const OUTCOMES = [
  "verified",
  "arrest_made",
  "person_located",
  "duplicate",
  "insufficient_detail",
  "false_lead",
  "dismissed",
] as const;

function AdminReportDetailPage() {
  const { reportId } = Route.useParams();
  const { roles } = useStaff();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState<(typeof OUTCOMES)[number]>("verified");

  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "report", reportId],
    queryFn: () => getAdminReport({ data: { id: reportId } }),
  });
  const { data: staff } = useQuery({ queryKey: ["admin", "staff"], queryFn: () => listStaff() });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "report", reportId] });

  if (error) {
    return (
      <AdminShell title="Report review" roles={roles}>
        <p role="alert" className="text-sm text-destructive">
          Could not load this report: {error.message}
        </p>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={data?.report_id ?? "Report review"}
      description="Reporter identity is never shown — only their anonymous code."
      roles={roles}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/reports">Back to queue</Link>
        </Button>
      }
    >
      {isPending ? (
        <p className="text-sm text-muted-foreground">Loading report…</p>
      ) : data ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="space-y-3 p-4 lg:col-span-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{data.status.replace("_", " ")}</Badge>
              <Badge variant="outline" className="capitalize">{data.priority}</Badge>
              {data.quality_tier ? (
                <Badge variant="outline">
                  {data.quality_tier} · {data.quality_score ?? "—"}
                </Badge>
              ) : null}
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Reporter code</dt>
                <dd className="font-mono">{data.reporter_anon_code}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Case</dt>
                <dd>{data.case_name ?? data.case_type}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Area</dt>
                <dd>{data.location_township ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sighting</dt>
                <dd>
                  {data.sighting_date ?? "—"} {data.sighting_time ?? ""}
                </dd>
              </div>
            </dl>
            {data.text_description ? (
              <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">
                {data.text_description}
              </p>
            ) : null}
            {data.photo_urls.length ? (
              <div className="grid grid-cols-3 gap-2">
                {data.photo_urls.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt="Evidence photo submitted with this report"
                    className="h-28 w-full rounded-md object-cover"
                    loading="lazy"
                  />
                ))}
              </div>
            ) : null}
            {data.voice_url ? (
              <audio controls src={data.voice_url} className="w-full">
                <track kind="captions" />
              </audio>
            ) : null}
          </Card>

          <div className="space-y-4">
            <Card className="space-y-3 p-4">
              <h2 className="text-sm font-semibold">Assignment</h2>
              <p className="text-sm text-muted-foreground">
                Currently: {data.assigned_name ?? "Unassigned"}
              </p>
              <select
                aria-label="Assign to staff member"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={data.assigned_to ?? ""}
                onChange={async (e) => {
                  try {
                    await assignReport({
                      data: { id: reportId, assignedTo: e.target.value || null },
                    });
                    toast.success("Assignment updated");
                    await refresh();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not assign");
                  }
                }}
              >
                <option value="">Unassigned</option>
                {(staff ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Card>

            <Card className="space-y-3 p-4">
              <h2 className="text-sm font-semibold">Record outcome</h2>
              <select
                aria-label="Investigation outcome"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as (typeof OUTCOMES)[number])}
              >
                {OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {o.replace("_", " ")}
                  </option>
                ))}
              </select>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes (never shown to the reporter)"
                aria-label="Outcome notes"
                rows={4}
              />
              <Button
                className="w-full"
                onClick={async () => {
                  try {
                    await recordReportOutcome({
                      data: { id: reportId, outcome, notes: notes.trim() || undefined },
                    });
                    toast.success("Outcome recorded");
                    setNotes("");
                    await refresh();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not save outcome");
                  }
                }}
              >
                Save outcome & close
              </Button>
            </Card>
          </div>
        </div>
      ) : null}

      {data && !isPending ? <CaseChatPanel reportId={reportId} /> : null}
    </AdminShell>
  );
}