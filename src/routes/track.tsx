import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, MessageSquare, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { PageShell } from "@/components/saps/page-shell";
import { BackButton } from "@/components/saps/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReportStatusBadge } from "@/components/report-status-badge";
import { trackReportByReference } from "@/lib/profile.functions";
import type { ReportTrackingResult } from "@/lib/profile.functions";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track a Report · Community Safety Tracker" },
      {
        name: "description",
        content:
          "Enter the reference number you received when submitting a tip to see the current status of your report to SAPS.",
      },
      { property: "og:title", content: "Track a Report · Community Safety Tracker" },
      {
        property: "og:description",
        content: "Check the progress of a tip you submitted using your report reference number.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrackReportPage,
});

const STEPS = [
  { key: "submitted", label: "Submitted", hint: "We received your report" },
  { key: "under_review", label: "Under review", hint: "An officer is assessing the information" },
  { key: "investigated", label: "Investigated", hint: "Follow-up action was taken" },
  { key: "resolved", label: "Resolved", hint: "The report has been closed" },
] as const;

function TrackReportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReportTrackingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ref = reference.trim();
    if (ref.length < 4) {
      setError("Enter the full reference, for example RPT-2026-0902-1234.");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await trackReportByReference({ data: { reference: ref } });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not look up that reference.");
    } finally {
      setLoading(false);
    }
  }

  const report = result?.report;
  const currentIndex = report ? STEPS.findIndex((s) => s.key === report.status) : -1;

  return (
    <PageShell>
      <div className="flex items-center gap-3 mb-4">
        <BackButton label="Go back" />
        <div>
          <h1 className="text-xl font-bold text-primary">Track a Report</h1>
          <p className="text-xs text-muted-foreground">
            Use the reference number from your submission confirmation.
          </p>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <form onSubmit={onSubmit} className="space-y-3">
            <Label htmlFor="reference" className="text-sm font-medium">
              Report reference number
            </Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value.toUpperCase())}
              placeholder="RPT-2026-0902-1234"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              aria-describedby="reference-hint"
            />
            <p id="reference-hint" className="text-xs text-muted-foreground">
              You can paste the reference exactly as it appears in your confirmation screen.
            </p>
            <Button
              type="submit"
              className="w-full bg-accent text-accent-foreground"
              disabled={loading || !user}
            >
              <Search className="size-4 mr-2" aria-hidden="true" />
              {loading ? "Checking…" : "Check status"}
            </Button>
            {!user && (
              <p className="text-xs text-muted-foreground text-center">
                <Link to="/auth" className="underline">
                  Sign in
                </Link>{" "}
                to track reports linked to your account.
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <AlertCircle className="size-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {result && !result.found && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">No report found for that reference</p>
          <p>
            Check the reference for typos. Only reports submitted from this account can be tracked
            here — see{" "}
            <Link to="/profile/reports" className="underline">
              My Reports
            </Link>{" "}
            for a full list.
          </p>
        </div>
      )}

      {report && (
        <div aria-live="polite" className="space-y-4">
          <Card>
            <CardContent className="p-4 flex gap-3 items-center">
              {report.case_photo ? (
                <img
                  src={report.case_photo}
                  alt=""
                  className="size-14 rounded-full object-cover shrink-0"
                />
              ) : (
                <div
                  className="size-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0"
                  aria-hidden="true"
                >
                  {report.case_name?.[0] ?? "?"}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold truncate">{report.case_name ?? "Unknown case"}</p>
                <p
                  className={cn(
                    "text-xs font-medium",
                    report.case_type === "wanted" ? "text-destructive" : "text-blue-600",
                  )}
                >
                  {report.case_type === "wanted" ? "Wanted Person" : "Missing Person"}
                </p>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">{report.report_id}</p>
                <div className="mt-1">
                  <ReportStatusBadge status={report.status} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold text-sm mb-3">Progress</h2>
              <ol className="space-y-3">
                {STEPS.map((step, i) => {
                  const done = currentIndex >= i;
                  return (
                    <li key={step.key} className="flex gap-3">
                      {done ? (
                        <CheckCircle2 className="size-5 text-accent shrink-0" aria-hidden="true" />
                      ) : (
                        <Circle className="size-5 text-muted-foreground shrink-0" aria-hidden="true" />
                      )}
                      <div>
                        <p
                          className={cn(
                            "text-sm font-medium",
                            done ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {step.label}
                          {currentIndex === i ? " — current" : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">{step.hint}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <p className="text-xs text-muted-foreground mt-3">
                Submitted{" "}
                {new Date(report.submission_timestamp).toLocaleDateString("en-ZA", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {report.updated_at
                  ? ` · Last updated ${new Date(report.updated_at).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}`
                  : ""}
              </p>
              {report.outcome && (
                <p className="text-xs text-foreground mt-1 capitalize">
                  Outcome: {report.outcome.replace(/_/g, " ")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <h2 className="font-semibold text-sm">What you reported</h2>
              {report.location_township && (
                <p className="text-sm">Area: {report.location_township}</p>
              )}
              {report.sighting_date && (
                <p className="text-sm">
                  Sighting: {report.sighting_date}
                  {report.sighting_time ? ` at ${report.sighting_time}` : ""}
                </p>
              )}
              {report.text_description && (
                <p className="text-sm text-muted-foreground">{report.text_description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Your exact location and identity are never shared with officers.
              </p>
            </CardContent>
          </Card>

          {report.conversation_id ? (
            <Button
              className="w-full bg-primary text-primary-foreground"
              onClick={() =>
                navigate({ to: "/chats/$id", params: { id: report.conversation_id! } })
              }
            >
              <MessageSquare className="size-4 mr-2" aria-hidden="true" />
              Open conversation with the assigned officer
            </Button>
          ) : (
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground text-center">
              If an officer is assigned and has questions, an anonymous conversation will appear
              here.
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
