/** Fuzz GPS by up to ~500m, round to 2 decimals (~1.1km grid). */
export function fuzzCoords(lat: number, lng: number): { lat: number; lng: number } {
  const rand = () => (Math.random() * 2 - 1); // -1..1
  const metersLat = rand() * 500;
  const metersLng = rand() * 500;
  const latOff = metersLat / 111_320;
  const lngOff = metersLng / (111_320 * Math.cos((lat * Math.PI) / 180));
  return {
    lat: Math.round((lat + latOff) * 100) / 100,
    lng: Math.round((lng + lngOff) * 100) / 100,
  };
}