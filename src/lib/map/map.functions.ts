import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface MapCaseMarker {
  id: string;
  kind: "wanted" | "missing";
  name: string;
  lat: number;
  lng: number;
  areaLabel: string;
  dangerLevel: string | null;
  endangered: boolean;
  lastSeenAt: string | null;
}

export interface MapStationMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  phone: string | null;
  is24h: boolean;
}

/** Density cell — a ~500m grid square, count only, never a coordinate pair. */
export interface MapHeatCell {
  lat: number;
  lng: number;
  count: number;
}

export interface MapData {
  cases: MapCaseMarker[];
  stations: MapStationMarker[];
  heat: MapHeatCell[];
  generatedAt: string;
}

const GRID = 0.0045; // ≈500 m at South African latitudes

function snap(v: number) {
  return Math.round(v / GRID) * GRID;
}

/**
 * Public, area-level map payload. Case pins use the approximate centroid of the
 * last-seen area (never a street address) and report density is snapped to a
 * 500 m grid so no individual report location can be recovered.
 */
export const getMapData = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ days: z.number().int().min(1).max(365).default(90) }).parse(d ?? {}),
  )
  .handler(async ({ data }): Promise<MapData> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolveAreaCoords } = await import("@/lib/geo/townships-geo");
    const from = new Date(Date.now() - data.days * 86_400_000).toISOString();

    const [wanted, missing, stations, reports] = await Promise.all([
      supabaseAdmin
        .from("wanted_persons")
        .select("id, full_name, last_seen_location, last_seen_at, danger_level")
        .eq("is_active", true)
        .limit(400),
      supabaseAdmin
        .from("missing_persons")
        .select("id, full_name, last_seen_location, last_seen_at, is_endangered, case_status")
        .neq("case_status", "found")
        .limit(400),
      supabaseAdmin
        .from("police_stations")
        .select("id, name, lat, lng, phone, is_24_hour")
        .limit(400),
      supabaseAdmin
        .from("reports")
        .select("location_approximate, location_township")
        .gte("submission_timestamp", from)
        .limit(4000),
    ]);

    const cases: MapCaseMarker[] = [];

    for (const w of wanted.data ?? []) {
      const spot = resolveAreaCoords(w.last_seen_location);
      cases.push({
        id: w.id,
        kind: "wanted",
        name: w.full_name,
        lat: spot.lat,
        lng: spot.lng,
        areaLabel: w.last_seen_location ?? spot.label,
        dangerLevel: (w.danger_level as string | null) ?? null,
        endangered: false,
        lastSeenAt: w.last_seen_at ?? null,
      });
    }

    for (const m of missing.data ?? []) {
      const spot = resolveAreaCoords(m.last_seen_location);
      cases.push({
        id: m.id,
        kind: "missing",
        name: m.full_name,
        lat: spot.lat,
        lng: spot.lng,
        areaLabel: m.last_seen_location ?? spot.label,
        dangerLevel: null,
        endangered: Boolean(m.is_endangered),
        lastSeenAt: m.last_seen_at ?? null,
      });
    }

    const cells = new Map<string, MapHeatCell>();
    for (const r of reports.data ?? []) {
      const loc = r.location_approximate as { lat?: number; lng?: number } | null;
      let lat = typeof loc?.lat === "number" ? loc.lat : undefined;
      let lng = typeof loc?.lng === "number" ? loc.lng : undefined;
      if (lat === undefined || lng === undefined) {
        if (!r.location_township) continue;
        const spot = resolveAreaCoords(r.location_township);
        lat = spot.lat;
        lng = spot.lng;
      }
      const key = `${snap(lat)}:${snap(lng)}`;
      const prev = cells.get(key);
      if (prev) prev.count += 1;
      else cells.set(key, { lat: snap(lat), lng: snap(lng), count: 1 });
    }

    return {
      cases,
      stations: (stations.data ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        lat: Number(s.lat),
        lng: Number(s.lng),
        phone: s.phone ?? null,
        is24h: Boolean(s.is_24_hour),
      })),
      heat: [...cells.values()],
      generatedAt: new Date().toISOString(),
    };
  });