/**
 * Latency per region and the weighted score:
 *   score = w_lat·latency + w_cost·price + w_carbon·(1 − CFE), lower is better,
 * with each factor min-max normalised to 0–1 across eligible regions.
 */

import { distanceKm, estimateRtt } from "./geo.js";

function normalizedShares(locations) {
  const total = locations.reduce((s, l) => s + (Number(l.share) || 0), 0);
  return locations.map((l) => (total > 0 ? (Number(l.share) || 0) / total : 1 / locations.length));
}

/**
 * Traffic-weighted latency from the user's locations to a region.
 * Returns { ms, source: "measured" | "estimated" | "mixed" } or null.
 */
export function regionLatency(region, { locations, measured }) {
  const m = measured[region.id];
  if (!locations.length) {
    return m && m.ok ? { ms: m.median, source: "measured" } : null;
  }
  // Once a live test has run, a region whose probe failed is unreachable
  // from "here" — don't paper over it with an optimistic distance estimate.
  const tested = Object.values(measured).some((x) => x.ok);
  if (tested && !(m && m.ok) && locations.some((l) => l.here)) return null;

  const shares = normalizedShares(locations);
  let ms = 0;
  let measuredCount = 0;
  locations.forEach((loc, i) => {
    let value;
    if (loc.here && m && m.ok) {
      value = m.median;
      measuredCount++;
    } else {
      value = estimateRtt(distanceKm(loc, region));
    }
    ms += value * shares[i];
  });
  const source = measuredCount === locations.length ? "measured" : measuredCount ? "mixed" : "estimated";
  return { ms: Math.round(ms), source };
}

/** Slider values -> weights summing to 1. */
export function normalizeWeights(w) {
  const total = w.lat + w.cost + w.carbon;
  if (!total) return { lat: 1 / 3, cost: 1 / 3, carbon: 1 / 3 };
  return { lat: w.lat / total, cost: w.cost / total, carbon: w.carbon / total };
}

function normalizer(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return (v) => (max === min ? 0 : (v - min) / (max - min));
}

/**
 * Scores and ranks eligible rows in place (row.score, row.rank) and sorts
 * them best first. Rows need .latency; at least one must have one.
 */
export function scoreRows(eligible, weights) {
  // Latency is compared on a log scale: 5 vs 15 ms matters to users far
  // more than 205 vs 215 ms. Unmeasured regions count as the slowest.
  const maxLat = Math.max(...eligible.filter((r) => r.latency).map((r) => r.latency.ms));
  const latOf = (r) => Math.log((r.latency ? r.latency.ms : maxLat) + 10);
  const carbonOf = (r) => 1 - r.region.cfe / 100;
  const nLat = normalizer(eligible.map(latOf));
  const nPrice = normalizer(eligible.map((r) => r.region.price));
  const nCarbon = normalizer(eligible.map(carbonOf));

  eligible.forEach((r) => {
    r.score = weights.lat * nLat(latOf(r)) + weights.cost * nPrice(r.region.price) + weights.carbon * nCarbon(carbonOf(r));
  });
  eligible.sort((a, b) => a.score - b.score);
  eligible.forEach((r, i) => (r.rank = i + 1));
}
