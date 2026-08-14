import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface HotspotForecast {
  area: string;
  recentReports: number;
  priorReports: number;
  trendPct: number;
  riskScore: number;
  riskLevel: "low" | "moderate" | "high" | "severe";
  peakDay: string;
  peakHourBand: string;
  predictedNext: number;
  recommendation: string;
}

export interface CrimeForecast {
  horizonDays: number;
  windowDays: number;
  sampleSize: number;
  hotspots: HotspotForecast[];
  temporal: { label: string; count: number }[];
  fairnessNote: string;
  generatedAt: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOUR_BANDS = [
  { label: "00:00–06:00", from: 0 },
  { label: "06:00–12:00", from: 6 },
  { label: "12:00–18:00", from: 12 },
  { label: "18:00–24:00", from: 18 },
];

function bandFor(hour: number) {
  return HOUR_BANDS.filter((b) => hour >= b.from).pop()?.label ?? HOUR_BANDS[0].label;
}

function riskLevel(score: number): HotspotForecast["riskLevel"] {
  if (score >= 75) return "severe";
  if (score >= 50) return "high";
  if (score >= 25) return "moderate";
  return "low";
}

/**
 * Statistical hotspot forecast from historical report density and timing.
 * Deliberately area-level (township) and volume-based only: no demographic,
 * ethnicity or individual attribute is used as an input, so the output cannot
 * encode bias against any group — only where reports actually came from.
 */
export const getCrimeForecast = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        windowDays: z.number().int().min(14).max(365).default(90),
        horizonDays: z.number().int().min(7).max(30).default(14),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }): Promise<CrimeForecast> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { supabaseAdmin } = await requireStaff();

    const now = Date.now();
    const from = new Date(now - data.windowDays * 86_400_000).toISOString();
    const halfway = now - (data.windowDays / 2) * 86_400_000;

    const { data: rows, error } = await supabaseAdmin
      .from("reports")
      .select("location_township, submission_timestamp, sighting_date, sighting_time")
      .gte("submission_timestamp", from)
      .limit(5000);
    if (error) throw new Error(error.message);

    interface Bucket {
      recent: number;
      prior: number;
      days: Record<string, number>;
      bands: Record<string, number>;
    }
    const byArea = new Map<string, Bucket>();
    const temporal = new Map<string, number>();

    for (const r of rows ?? []) {
      const area = r.location_township?.trim() || "Unspecified area";
      const ts = new Date(r.submission_timestamp).getTime();
      const bucket =
        byArea.get(area) ?? { recent: 0, prior: 0, days: {}, bands: {} };

      if (ts >= halfway) bucket.recent += 1;
      else bucket.prior += 1;

      const when = r.sighting_date ? new Date(`${r.sighting_date}T00:00:00`) : new Date(ts);
      const dayName = DAYS[when.getDay()];
      bucket.days[dayName] = (bucket.days[dayName] ?? 0) + 1;

      const hour = r.sighting_time ? Number(String(r.sighting_time).slice(0, 2)) : when.getHours();
      const band = bandFor(Number.isFinite(hour) ? hour : 12);
      bucket.bands[band] = (bucket.bands[band] ?? 0) + 1;
      temporal.set(band, (temporal.get(band) ?? 0) + 1);

      byArea.set(area, bucket);
    }

    const maxRecent = Math.max(1, ...[...byArea.values()].map((b) => b.recent));
    const halfWindow = Math.max(1, data.windowDays / 2);

    const hotspots: HotspotForecast[] = [...byArea.entries()]
      .map(([area, b]) => {
        const trendPct = b.prior > 0 ? Math.round(((b.recent - b.prior) / b.prior) * 100) : b.recent > 0 ? 100 : 0;
        const density = (b.recent / maxRecent) * 70;
        const momentum = Math.max(-15, Math.min(30, trendPct * 0.3));
        const riskScore = Math.max(0, Math.min(100, Math.round(density + momentum)));
        const dailyRate = b.recent / halfWindow;
        const growth = b.prior > 0 ? Math.min(2, b.recent / b.prior) : 1;
        const predictedNext = Math.round(dailyRate * data.horizonDays * growth);
        const peakDay =
          Object.entries(b.days).sort((x, y) => y[1] - x[1])[0]?.[0] ?? "No clear pattern";
        const peakHourBand =
          Object.entries(b.bands).sort((x, y) => y[1] - x[1])[0]?.[0] ?? "No clear pattern";
        const level = riskLevel(riskScore);
        const recommendation =
          level === "severe" || level === "high"
            ? `Increase visible patrols on ${peakDay} between ${peakHourBand}; consider a targeted awareness campaign.`
            : level === "moderate"
              ? `Maintain routine patrols, with extra attention on ${peakDay} ${peakHourBand}.`
              : "No additional deployment indicated — monitor only.";

        return {
          area,
          recentReports: b.recent,
          priorReports: b.prior,
          trendPct,
          riskScore,
          riskLevel: level,
          peakDay,
          peakHourBand,
          predictedNext,
          recommendation,
        };
      })
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 12);

    return {
      horizonDays: data.horizonDays,
      windowDays: data.windowDays,
      sampleSize: (rows ?? []).length,
      hotspots,
      temporal: HOUR_BANDS.map((b) => ({ label: b.label, count: temporal.get(b.label) ?? 0 })),
      fairnessNote:
        "Forecasts use only report volume, area and timing. No demographic, ethnic or personal attribute is used as an input, and predictions are advisory for resource planning — never grounds for individual suspicion.",
      generatedAt: new Date().toISOString(),
    };
  });