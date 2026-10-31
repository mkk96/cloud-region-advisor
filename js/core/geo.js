/** Great-circle distance and distance-based latency estimates. */

const EARTH_RADIUS_KM = 6371;
const toRad = (d) => (d * Math.PI) / 180;

/** Haversine distance between two { lat, lon } points, in km. */
export function distanceKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Stable id for a user location (keys its remote measurements). */
export const locationKey = (loc) => `${(+loc.lat).toFixed(2)},${(+loc.lon).toFixed(2)}`;

/**
 * Round trip over fibre: ~200 km/ms, cable routes ~1.4x the great-circle
 * distance, plus a few ms of fixed overhead.
 */
export function estimateRtt(km) {
  return Math.round(4 + (2 * km * 1.4) / 200);
}
