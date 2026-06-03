import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/saps/page-shell";
import {
  TimeAndGreeting,
  LocationCard,
  ActionGrid,
  StationCard,
} from "@/components/saps/dashboard-widgets";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Community Safety Tracker — Home" },
      {
        name: "description",
        content:
          "Browse wanted and missing person cases and report sightings safely. Help SAPS keep your community safer.",
      },
      { property: "og:title", content: "Community Safety Tracker" },
      {
        property: "og:description",
        content: "Browse cases and report sightings safely.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <PageShell>
      <div className="space-y-6">
        <TimeAndGreeting />
        <LocationCard />
        <ActionGrid />
        <StationCard />
      </div>
    </PageShell>
  );
}
