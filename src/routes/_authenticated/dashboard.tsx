import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/saps/page-shell";
import {
  TimeAndGreeting,
  LocationCard,
  ActionGrid,
  StationCard,
} from "@/components/saps/dashboard-widgets";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Community Safety Tracker" },
      { name: "description", content: "Your personal Community Safety Tracker dashboard." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
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