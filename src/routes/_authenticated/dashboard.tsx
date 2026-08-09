import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/saps/page-shell";
import {
  TimeAndGreeting,
  LocationCard,
  ActionGrid,
  StationCard,
} from "@/components/saps/dashboard-widgets";
import { WeatherCard } from "@/components/saps/weather-card";
import { NewsTicker } from "@/components/saps/news-ticker";
import { SafetyTipsCarousel } from "@/components/saps/safety-tips-carousel";
import { CaseCarousels } from "@/components/saps/case-carousels";

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
        <NewsTicker />
        <div className="grid gap-4 sm:grid-cols-2">
          <LocationCard />
          <WeatherCard />
        </div>
        <ActionGrid />
        <CaseCarousels />
        <SafetyTipsCarousel />
        <StationCard />
      </div>
    </PageShell>
  );
}