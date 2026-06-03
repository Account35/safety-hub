import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/saps/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cases")({
  head: () => ({
    meta: [
      { title: "Cases · Community Safety Tracker" },
      { name: "description", content: "Browse wanted and missing person cases." },
    ],
  }),
  component: () => (
    <PageShell>
      <Placeholder
        title="Cases gallery"
        body="Wanted and missing person galleries arrive in Phase 2."
      />
    </PageShell>
  ),
});

function Placeholder({ title, body }: { title: string; body: string }) {
  return (
    <Card className="mx-auto max-w-xl">
      <CardContent className="space-y-3 p-8 text-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{body}</p>
        <Button asChild variant="outline">
          <Link to="/">Back to home</Link>
        </Button>
      </CardContent>
    </Card>
  );
}