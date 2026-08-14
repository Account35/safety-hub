import { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "@tanstack/react-router";
import type { MapData } from "@/lib/map/map.functions";

export interface MapFilters {
  wanted: boolean;
  missing: boolean;
  stations: boolean;
  heat: boolean;
  intensity: number;
  dangerOnly: boolean;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  map.setView([lat, lng], map.getZoom(), { animate: false });
  return null;
}

function heatColor(count: number, max: number) {
  const ratio = max > 0 ? count / max : 0;
  if (ratio > 0.66) return "#DC2626";
  if (ratio > 0.4) return "#F97316";
  if (ratio > 0.15) return "#FACC15";
  return "#16A34A";
}

export default function SafetyMap({
  data,
  filters,
  center,
}: {
  data: MapData;
  filters: MapFilters;
  center: { lat: number; lng: number };
}) {
  const maxCount = useMemo(
    () => data.heat.reduce((m, c) => Math.max(m, c.count), 0),
    [data.heat],
  );

  const cases = data.cases.filter((c) => {
    if (c.kind === "wanted" && !filters.wanted) return false;
    if (c.kind === "missing" && !filters.missing) return false;
    if (filters.dangerOnly && !(c.dangerLevel === "extreme" || c.dangerLevel === "high" || c.endangered))
      return false;
    return true;
  });

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={12}
      scrollWheelZoom
      className="h-[60vh] w-full rounded-lg border border-border md:h-[70vh]"
      aria-label="Interactive safety map"
    >
      <Recenter lat={center.lat} lng={center.lng} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      {filters.heat &&
        data.heat
          .filter((c) => c.count >= filters.intensity)
          .map((c) => (
            <Circle
              key={`${c.lat}:${c.lng}`}
              center={[c.lat, c.lng]}
              radius={250}
              pathOptions={{
                color: heatColor(c.count, maxCount),
                fillColor: heatColor(c.count, maxCount),
                fillOpacity: 0.35,
                weight: 1,
              }}
            >
              <Popup>
                <span className="text-xs">
                  {c.count} report{c.count === 1 ? "" : "s"} in this 500 m area
                </span>
              </Popup>
            </Circle>
          ))}

      {cases.map((c) => (
        <CircleMarker
          key={`${c.kind}-${c.id}`}
          center={[c.lat, c.lng]}
          radius={8}
          pathOptions={{
            color: c.kind === "wanted" ? "#DC2626" : "#1D4ED8",
            fillColor: c.kind === "wanted" ? "#DC2626" : "#1D4ED8",
            fillOpacity: 0.85,
            weight: 2,
          }}
        >
          <Popup>
            <div className="space-y-1">
              <p className="text-sm font-semibold">{c.name}</p>
              <p className="text-xs capitalize">
                {c.kind === "wanted" ? "Wanted person" : "Missing person"}
                {c.dangerLevel ? ` · danger: ${c.dangerLevel}` : ""}
                {c.endangered ? " · endangered" : ""}
              </p>
              <p className="text-xs">Last seen: {c.areaLabel}</p>
              <Link
                to={c.kind === "wanted" ? "/cases/wanted/$id" : "/cases/missing/$id"}
                params={{ id: c.id }}
                className="text-xs font-medium underline"
              >
                View details
              </Link>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {filters.stations &&
        data.stations.map((s) => (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lng]}
            radius={6}
            pathOptions={{
              color: "#001F3F",
              fillColor: "#FFD700",
              fillOpacity: 1,
              weight: 2,
            }}
          >
            <Popup>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="text-xs">{s.is24h ? "Open 24 hours" : "Limited hours"}</p>
                {s.phone ? <p className="text-xs">{s.phone}</p> : null}
              </div>
            </Popup>
          </CircleMarker>
        ))}
    </MapContainer>
  );
}