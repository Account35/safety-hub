import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/saps/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity · Community Safety Tracker" },
      { name: "description", content: "Your reports, rewards, and community activity." },
    ],
  }),
  component: () => (
    <PageShell>
      <Card className="mx-auto max-w-xl">
        <CardContent className="space-y-3 p-8 text-center">
          <h1 className="text-2xl font-bold">Activity</h1>
          <p className="text-muted-foreground">
            My reports, rewards, and community leaderboards arrive in Phases 3–6.
          </p>
          <Button asChild variant="outline">
            <Link to="/">Back to home</Link>
          </Button>
        </CardContent>
      </Card>
    </PageShell>
  ),
});