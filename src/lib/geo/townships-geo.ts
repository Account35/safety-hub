/**
 * Approximate centroids for the curated township/suburb list.
 * These are area-level (not personal) coordinates — safe to use for weather
 * lookups and nearest-station distance estimates.
 */
export const TOWNSHIP_COORDS: Record<string, { lat: number; lng: number }> = {
  "Alexandra, Johannesburg": { lat: -26.1036, lng: 28.09 },
  "Atteridgeville, Pretoria": { lat: -25.7667, lng: 28.0667 },
  "Belhar, Cape Town": { lat: -33.9556, lng: 18.6303 },
  "Bloemfontein Central": { lat: -29.0852, lng: 26.1596 },
  "Botshabelo, Free State": { lat: -29.2667, lng: 26.7167 },
  "Bridgetown, Cape Town": { lat: -33.9508, lng: 18.5347 },
  "Centurion, Pretoria": { lat: -25.8603, lng: 28.1894 },
  "Chatsworth, Durban": { lat: -29.9167, lng: 30.8833 },
  "Cape Town Central": { lat: -33.9249, lng: 18.4241 },
  "Daveyton, Ekurhuleni": { lat: -26.15, lng: 28.4167 },
  "Diepkloof, Soweto": { lat: -26.245, lng: 27.95 },
  "Diepsloot, Johannesburg": { lat: -25.9333, lng: 27.9667 },
  "Dobsonville, Soweto": { lat: -26.2333, lng: 27.85 },
  "Durban Central": { lat: -29.8587, lng: 31.0218 },
  "East London Central": { lat: -33.0153, lng: 27.9116 },
  "Eldorado Park, Johannesburg": { lat: -26.2833, lng: 27.8833 },
  "Embalenhle, Mpumalanga": { lat: -26.5333, lng: 29.0667 },
  "Etwatwa, Ekurhuleni": { lat: -26.1333, lng: 28.4667 },
  "Galeshewe, Kimberley": { lat: -28.7167, lng: 24.7333 },
  "Gugulethu, Cape Town": { lat: -33.98, lng: 18.57 },
  "Hammanskraal, Pretoria": { lat: -25.4, lng: 28.2833 },
  "Inanda, Durban": { lat: -29.7, lng: 30.95 },
  "Johannesburg Central": { lat: -26.2041, lng: 28.0473 },
  "KaNyamazane, Mpumalanga": { lat: -25.4667, lng: 31.1667 },
  "Katlehong, Ekurhuleni": { lat: -26.3333, lng: 28.15 },
  "Kayamandi, Stellenbosch": { lat: -33.9167, lng: 18.85 },
  "Khayelitsha, Cape Town": { lat: -34.04, lng: 18.68 },
  "Kimberley Central": { lat: -28.7383, lng: 24.7639 },
  "Kraaifontein, Cape Town": { lat: -33.85, lng: 18.7167 },
  "Kwa-Thema, Springs": { lat: -26.3167, lng: 28.3833 },
  "KwaMashu, Durban": { lat: -29.7333, lng: 30.9833 },
  "Lamontville, Durban": { lat: -29.9333, lng: 30.95 },
  "Langa, Cape Town": { lat: -33.945, lng: 18.53 },
  "Mabopane, Pretoria": { lat: -25.5, lng: 28.1 },
  "Mamelodi, Pretoria": { lat: -25.7167, lng: 28.4 },
  "Mdantsane, East London": { lat: -32.95, lng: 27.75 },
  "Mfuleni, Cape Town": { lat: -34.0167, lng: 18.6667 },
  "Mhluzi, Middelburg": { lat: -25.7833, lng: 29.4333 },
  "Mitchells Plain, Cape Town": { lat: -34.035, lng: 18.618 },
  "Mlazi, Durban": { lat: -29.9667, lng: 30.8833 },
  "Orlando, Soweto": { lat: -26.24, lng: 27.92 },
  "Soweto": { lat: -26.2678, lng: 27.8585 },
  "Tembisa, Ekurhuleni": { lat: -26.0, lng: 28.2167 },
};

export const DEFAULT_COORDS = { lat: -26.2041, lng: 28.0473, label: "Johannesburg Central" };

/** Best-effort resolve of a free-text area label to approximate coordinates. */
export function resolveAreaCoords(area?: string | null): {
  lat: number;
  lng: number;
  label: string;
} {
  if (!area?.trim()) return DEFAULT_COORDS;
  const needle = area.trim().toLowerCase();

  const exact = Object.keys(TOWNSHIP_COORDS).find((k) => k.toLowerCase() === needle);
  if (exact) return { ...TOWNSHIP_COORDS[exact], label: exact };

  const partial = Object.keys(TOWNSHIP_COORDS).find(
    (k) => k.toLowerCase().includes(needle) || needle.includes(k.split(",")[0].toLowerCase()),
  );
  if (partial) return { ...TOWNSHIP_COORDS[partial], label: partial };

  return DEFAULT_COORDS;
}

/** Great-circle distance in kilometres. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) * 10) / 10;
}