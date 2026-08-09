import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Cloudy,
  Moon,
  Sun,
  Wind,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAreaWeather } from "@/lib/dashboard/dashboard.functions";
import { useAuth } from "@/lib/auth-context";

function describe(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 2) return "Mostly sunny";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}

function iconFor(code: number, isDay: boolean) {
  if (code === 0 || code <= 2) return isDay ? Sun : Moon;
  if (code === 3) return Cloudy;
  if (code <= 48) return CloudFog;
  if (code <= 57) return CloudDrizzle;
  if (code <= 67 || (code >= 80 && code <= 82)) return CloudRain;
  if (code <= 86) return CloudSnow;
  return CloudLightning;
}

export function WeatherCard() {
  const { profile } = useAuth();
  const weatherFn = useServerFn(getAreaWeather);
  const area = profile?.primary_township ?? profile?.area ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["area-weather", area],
    queryFn: () => weatherFn({ data: { area } }),
    staleTime: 15 * 60 * 1000,
  });

  if (isLoading) {
    return <Card className="h-24 animate-pulse bg-muted/50" aria-hidden="true" />;
  }
  if (!data) return null;

  const Icon = iconFor(data.code, data.isDay);

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-11 place-items-center rounded-md bg-accent/25 text-accent-foreground"
          >
            <Icon className="size-6" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Weather · {data.areaLabel}
            </p>
            <p className="font-semibold">
              {data.temperatureC}°C · {describe(data.code)}
            </p>
            <p className="text-sm text-muted-foreground">Feels like {data.apparentC}°C</p>
          </div>
        </div>
        <p className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
          <Wind className="size-4" aria-hidden="true" /> {data.windKph} km/h
        </p>
      </CardContent>
    </Card>
  );
}