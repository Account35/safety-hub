import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/saps/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report · Community Safety Tracker" },
      { name: "description", content: "Submit a sighting or tip safely." },
    ],
  }),
  component: () => (
    <PageShell>
      <Card className="mx-auto max-w-xl">
        <CardContent className="space-y-3 p-8 text-center">
          <h1 className="text-2xl font-bold">Report</h1>
          <p className="text-muted-foreground">
            Anonymous and authenticated reporting workflows arrive in Phase 3.
          </p>
          <Button asChild variant="outline">
            <Link to="/">Back to home</Link>
          </Button>
        </CardContent>
      </Card>
    </PageShell>
  ),
});