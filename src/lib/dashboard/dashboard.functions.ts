import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ── Weather ────────────────────────────────────────────────────────────────
export interface WeatherResult {
  areaLabel: string;
  temperatureC: number;
  apparentC: number;
  windKph: number;
  code: number;
  isDay: boolean;
  observedAt: string;
}

export const getAreaWeather = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ area: z.string().max(120).nullable().optional() }).parse(data),
  )
  .handler(async ({ data }): Promise<WeatherResult | null> => {
    const { resolveAreaCoords } = await import("@/lib/geo/townships-geo");
    const spot = resolveAreaCoords(data.area ?? null);
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${spot.lat}&longitude=${spot.lng}` +
        `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day` +
        `&timezone=Africa%2FJohannesburg`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = (await res.json()) as {
        current?: {
          time: string;
          temperature_2m: number;
          apparent_temperature: number;
          weather_code: number;
          wind_speed_10m: number;
          is_day: number;
        };
      };
      const c = json.current;
      if (!c) return null;
      return {
        areaLabel: spot.label,
        temperatureC: Math.round(c.temperature_2m),
        apparentC: Math.round(c.apparent_temperature),
        windKph: Math.round(c.wind_speed_10m),
        code: c.weather_code,
        isDay: c.is_day === 1,
        observedAt: c.time,
      };
    } catch {
      return null;
    }
  });

// ── News ticker + safety tips (from campaigns) ─────────────────────────────
export interface TickerItem {
  id: string;
  title: string;
  campaign_type: string;
  sent_timestamp: string | null;
}

export const getTickerItems = createServerFn({ method: "GET" }).handler(
  async (): Promise<TickerItem[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("campaigns")
      .select("id, title, campaign_type, sent_timestamp")
      .eq("status", "sent")
      .order("sent_timestamp", { ascending: false })
      .limit(12);
    return (data ?? []) as TickerItem[];
  },
);

export interface SafetyTip {
  id: string;
  title: string;
  body_content: string;
  sent_timestamp: string | null;
}

export const getSafetyTips = createServerFn({ method: "GET" }).handler(
  async (): Promise<SafetyTip[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("campaigns")
      .select("id, title, body_content, sent_timestamp")
      .eq("campaign_type", "safety_tip")
      .eq("status", "sent")
      .order("sent_timestamp", { ascending: false })
      .limit(10);
    return (data ?? []) as SafetyTip[];
  },
);

// ── Crime statistics ──────────────────────────────────────────────────────
export interface CrimeStatRow {
  id: string;
  township: string;
  category: string;
  incident_count: number;
  trend: string;
  period_label: string;
  updated_at: string;
}

export const getCrimeStats = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ township: z.string().max(120).nullable().optional() }).parse(data),
  )
  .handler(
    async ({
      data,
    }): Promise<{ townships: string[]; rows: CrimeStatRow[]; lastUpdated: string | null }> => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: all, error } = await supabaseAdmin
        .from("crime_stats")
        .select("id, township, category, incident_count, trend, period_label, updated_at")
        .order("incident_count", { ascending: false });
      if (error) throw new Error(error.message);

      const list = (all ?? []) as CrimeStatRow[];
      const townships = Array.from(new Set(list.map((r) => r.township))).sort();
      const selected = data.township?.trim() || townships[0] || null;
      const rows = selected ? list.filter((r) => r.township === selected) : [];
      const lastUpdated = rows.length
        ? rows.reduce((max, r) => (r.updated_at > max ? r.updated_at : max), rows[0].updated_at)
        : null;
      return { townships, rows, lastUpdated };
    },
  );

// ── Police stations ───────────────────────────────────────────────────────
export interface StationRow {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  township: string;
  province: string | null;
  is_24_hour: boolean;
  lat: number;
  lng: number;
  distanceKm: number;
}

export const listStations = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        area: z.string().max(120).nullable().optional(),
        q: z.string().max(120).optional(),
        limit: z.number().int().min(1).max(60).optional(),
      })
      .parse(data),
  )
  .handler(
    async ({ data }): Promise<{ areaLabel: string; stations: StationRow[] }> => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { resolveAreaCoords, haversineKm } = await import("@/lib/geo/townships-geo");
      const spot = resolveAreaCoords(data.area ?? null);

      let q = supabaseAdmin
        .from("police_stations")
        .select("id, name, address, phone, township, province, is_24_hour, lat, lng");
      if (data.q?.trim()) {
        const needle = `%${data.q.trim()}%`;
        q = q.or(`name.ilike.${needle},township.ilike.${needle},address.ilike.${needle}`);
      }
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);

      const stations = (rows ?? [])
        .map((r) => ({
          ...r,
          lat: Number(r.lat),
          lng: Number(r.lng),
          distanceKm: haversineKm(spot, { lat: Number(r.lat), lng: Number(r.lng) }),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, data.limit ?? 40) as StationRow[];

      return { areaLabel: spot.label, stations };
    },
  );

// ── Dashboard case carousels ──────────────────────────────────────────────
export interface CarouselCase {
  id: string;
  full_name: string;
  photos: string[];
  subtitle: string | null;
  meta: string | null;
}

export const getDashboardCases = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ wanted: CarouselCase[]; missing: CarouselCase[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [w, m] = await Promise.all([
      supabaseAdmin
        .from("wanted_persons")
        .select("id, full_name, photos, crime_category, danger_level, reward_amount")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("missing_persons")
        .select("id, full_name, photos, last_seen_location, last_seen_at, is_endangered")
        .eq("case_status", "active")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const wanted: CarouselCase[] = (w.data ?? []).map((r) => ({
      id: r.id,
      full_name: r.full_name,
      photos: (r.photos ?? []) as string[],
      subtitle: r.crime_category ?? "Wanted person",
      meta: r.reward_amount
        ? `Reward R${Number(r.reward_amount).toLocaleString("en-ZA")}`
        : `${r.danger_level} risk`,
    }));

    const missing: CarouselCase[] = (m.data ?? []).map((r) => ({
      id: r.id,
      full_name: r.full_name,
      photos: (r.photos ?? []) as string[],
      subtitle: r.last_seen_location ?? "Last seen location unknown",
      meta: r.is_endangered ? "Endangered" : (r.last_seen_at ?? null),
    }));

    return { wanted, missing };
  },
);