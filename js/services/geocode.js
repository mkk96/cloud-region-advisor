/**
 * City search and reverse geocoding via OpenStreetMap Nominatim
 * (usage policy: no autocomplete, ≤ 1 request/second — we only call on submit).
 * Falls back to matching known region cities when Nominatim is unreachable.
 */

import { CLOUD_LIST } from "../clouds/index.js";

const NOMINATIM = "https://nominatim.openstreetmap.org";

/** Parses "12.97, 77.59" into { lat, lon }, or null. */
export function parseCoordinates(text) {
  const m = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  return m ? { lat: +m[1], lon: +m[2] } : null;
}

function searchRegionCities(query) {
  const q = query.toLowerCase();
  const seen = new Set();
  const results = [];
  CLOUD_LIST.flatMap((c) => c.regions).forEach((r) => {
    const name = `${r.city}, ${r.country}`;
    if (!seen.has(name) && name.toLowerCase().includes(q)) {
      seen.add(name);
      results.push({ name, cc: r.cc, lat: r.lat, lon: r.lon });
    }
  });
  return results;
}

/** Resolves to up to 5 { name, cc, lat, lon } matches. */
export async function searchPlaces(query) {
  try {
    const res = await fetch(`${NOMINATIM}/search?format=jsonv2&limit=5&addressdetails=1&accept-language=en&q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(res.status);
    return (await res.json()).map((r) => ({
      name: r.display_name.split(",").slice(0, 3).join(",").trim(),
      cc: ((r.address && r.address.country_code) || "").toUpperCase(),
      lat: +r.lat,
      lon: +r.lon,
    }));
  } catch (e) {
    return searchRegionCities(query);
  }
}

/** Resolves to { city, country, cc } (fields may be empty). */
export async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(`${NOMINATIM}/reverse?format=jsonv2&zoom=10&accept-language=en&lat=${lat}&lon=${lon}`);
    const a = (await res.json()).address || {};
    return {
      city: a.city || a.town || a.village || a.county || a.state || "",
      country: a.country || "",
      cc: (a.country_code || "").toUpperCase(),
    };
  } catch (e) {
    return { city: "", country: "", cc: "" };
  }
}
