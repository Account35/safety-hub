import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { PageShell } from "@/components/saps/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const reportSearchSchema = z.object({
  caseType: fallback(z.enum(["wanted", "missing"]).optional(), undefined),
  caseId: fallback(z.string().optional(), undefined),
});

export const Route = createFileRoute("/report")({
  validateSearch: zodValidator(reportSearchSchema),
  head: () => ({
    meta: [
      { title: "Report · Community Safety Tracker" },
      { name: "description", content: "Submit a sighting or tip safely." },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { caseType, caseId } = Route.useSearch();
  return (
    <PageShell>
      <Card className="mx-auto max-w-xl">
        <CardContent className="space-y-3 p-8 text-center">
          <h1 className="text-2xl font-bold">Report</h1>
          <p className="text-muted-foreground">
            Anonymous and authenticated reporting workflows arrive in Phase 3.
          </p>
          {caseType && caseId && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              Ready to report on {caseType} case <code className="font-mono">{caseId.slice(0, 8)}</code> when Phase 3 lands.
            </p>
          )}
          <Button asChild variant="outline">
            <Link to="/">Back to home</Link>
          </Button>
        </CardContent>
      </Card>
    </PageShell>
  );
}