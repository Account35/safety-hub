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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
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
