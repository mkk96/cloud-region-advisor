/**
 * Recommendation pipeline (see PRD "Recommendation logic"): filter, score,
 * pick primary, pick DR, explain. Pure — no DOM, no globals.
 *
 * ctx = { cloud, locations, measured, residency, services, weights,
 *         downtime, primaryOverride }
 */

import { exclusionReasons } from "./filters.js";
import { regionLatency, normalizeWeights, scoreRows } from "./scoring.js";
import { pickDR } from "./dr.js";
import { primaryReason, rowReason } from "./explain.js";

export function recommend(ctx) {
  const weights = normalizeWeights(ctx.weights);
  const rows = ctx.cloud.regions.map((region) => ({
    region,
    latency: regionLatency(region, ctx),
    excluded: exclusionReasons(region, ctx),
  }));

  const eligible = rows.filter((r) => !r.excluded.length);
  const withLatency = eligible.filter((r) => r.latency);
  const result = { rows, eligible, weights, primary: null, dr: null, warnings: [] };

  if (!eligible.length) {
    result.message = "No region meets every requirement. Relax data residency or the required services.";
    return result;
  }
  if (!withLatency.length) {
    result.message = "Add a location or run the latency test to get a recommendation.";
    return result;
  }

  scoreRows(eligible, weights);

  const byLat = [...withLatency].sort((a, b) => a.latency.ms - b.latency.ms);
  const minPrice = Math.min(...eligible.map((r) => r.region.price));
  const maxCfe = Math.max(...eligible.map((r) => r.region.cfe));
  eligible.forEach((r) => {
    r.latRank = r.latency ? byLat.indexOf(r) + 1 : null;
    r.cheapest = r.region.price === minPrice;
    r.greenest = r.region.cfe === maxCfe;
  });

  const override = ctx.primaryOverride && eligible.find((r) => r.region.id === ctx.primaryOverride);
  result.primary = override || eligible[0];
  result.primaryReason = primaryReason(result.primary, ctx, weights, byLat[0], !!override);
  result.dr = pickDR(result.primary, eligible, ctx);

  rows.forEach((r) => (r.reason = rowReason(r, result, byLat[0].latency.ms)));
  if (ctx.locations.length > 1 && ctx.locations.some((l) => !l.here)) {
    result.warnings.push(
      "Latency for locations other than yours is estimated from distance (the browser can only measure from your own network)."
    );
  }
  return result;
}
