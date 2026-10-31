/**
 * Disaster-recovery region selection.
 *
 * Hard rules: passes the same filters as the primary, ≥ MIN_DR_DISTANCE_KM
 * away. Preference: official pair (clouds that publish them), then same
 * country > same continent > elsewhere, within the downtime latency limit,
 * cheaper, then closer.
 */

import { CONTINENTS, DOWNTIME_OPTIONS, MIN_DR_DISTANCE_KM } from "./config.js";
import { distanceKm, estimateRtt } from "./geo.js";
import { residencyLabel, serviceLabels } from "./filters.js";

const TIER_COUNTRY = 0;
const TIER_CONTINENT = 1;

function rankCandidates(primary, eligible, downtime) {
  return eligible
    .filter((row) => row.region.id !== primary.region.id)
    .map((row) => {
      const km = distanceKm(primary.region, row.region);
      const rtt = estimateRtt(km);
      const tier =
        row.region.cc === primary.region.cc ? TIER_COUNTRY
        : row.region.continent === primary.region.continent ? TIER_CONTINENT
        : 2;
      return { row, km, rtt, tier, within: rtt <= downtime.maxRtt };
    })
    .filter((c) => c.km >= MIN_DR_DISTANCE_KM)
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (a.within !== b.within) return a.within ? -1 : 1;
      if (a.within) return a.row.region.price - b.row.region.price || a.rtt - b.rtt;
      return a.rtt - b.rtt;
    });
}

/** Prefer the official pair when the cloud has them; returns [pick, isPair, note]. */
function applyOfficialPair(primary, candidates, cloud) {
  if (!cloud.dr || !cloud.dr.pairs) return [candidates[0], false, null];
  const pairId = primary.region.pair;
  if (!pairId) return [candidates[0], false, `${primary.region.id} has no official pair — chosen by this tool's rules`];
  const pairCand = candidates.find((c) => c.row.region.id === pairId);
  if (pairCand) return [pairCand, true, `Official ${cloud.name} region pair of ${primary.region.id}`];
  return [
    candidates[0],
    false,
    cloud.regionById[pairId]
      ? `Official pair (${pairId}) doesn't meet your requirements — chosen by this tool's rules instead`
      : `Official pair (${pairId}) is a restricted-access region — chosen by this tool's rules instead`,
  ];
}

function locationRule(pick, primary, isPair, ctx) {
  const residencyOn = ctx.residency && ctx.residency !== "none";
  const kept = residencyOn ? " — data residency kept" : "";
  const cont = CONTINENTS[primary.region.continent];
  if (isPair) {
    if (pick.tier === TIER_COUNTRY) return `Same country (${primary.region.country})${kept}`;
    if (pick.tier === TIER_CONTINENT) return `Same continent (${cont})`;
    return `Different continent (${CONTINENTS[pick.row.region.continent]})`;
  }
  if (pick.tier === TIER_COUNTRY) return `Same country as primary (${primary.region.country})${kept}`;
  if (residencyOn) return `Inside ${residencyLabel(ctx.residency, ctx.cloud)} — no suitable second region in ${primary.region.country}`;
  if (pick.tier === TIER_CONTINENT) return `Same continent (${cont}) — no suitable second region in ${primary.region.country}`;
  return `Different continent — no suitable region in ${cont}`;
}

/**
 * Returns { row, km, rtt, within, rules, warnings, downtime }, or
 * { none: true, message } when no region qualifies.
 */
export function pickDR(primary, eligible, ctx) {
  const { cloud } = ctx;
  const downtime = DOWNTIME_OPTIONS.find((d) => d.id === ctx.downtime) || DOWNTIME_OPTIONS[1];
  const residencyOn = ctx.residency && ctx.residency !== "none";

  const candidates = rankCandidates(primary, eligible, downtime);
  if (!candidates.length) {
    const why = residencyOn
      ? `No other region in ${residencyLabel(ctx.residency, cloud)} has the requested services in a different metro area.`
      : "No other region has the requested services in a different metro area.";
    return {
      none: true,
      message: `${why} Run ${primary.region.id} across multiple zones and keep backups in redundant storage, or relax a requirement.`,
    };
  }

  const [pick, isPair, pairNote] = applyOfficialPair(primary, candidates, cloud);
  const region = pick.row.region;
  const limit = Number.isFinite(downtime.maxRtt) ? `${downtime.maxRtt} ms` : "no limit";

  const rules = [];
  if (pairNote) rules.push(pairNote);
  rules.push(locationRule(pick, primary, isPair, ctx));
  rules.push(`Different metro area — ${Math.round(pick.km).toLocaleString()} km from ${primary.region.city}`);
  rules.push(
    ctx.services.length
      ? `${ctx.services.length > 1 ? `All ${ctx.services.length} requested services` : "Requested service"} available (${serviceLabels(ctx.services, cloud)})`
      : `No services required — offers ${region.serviceCount} of ${cloud.services.length} catalogued services`
  );
  rules.push(`≈${pick.rtt} ms from primary (est.) — ${pick.within ? "within" : "OVER"} the ${limit} limit for ${downtime.mode}`);

  const peers = candidates.filter((c) => c.tier === pick.tier && c.within === pick.within);
  if (pick.within && peers.length > 1 && !isPair) {
    const cheapest = Math.min(...peers.map((c) => c.row.region.price));
    rules.push(
      region.price <= cheapest
        ? `Lowest price among ${peers.length} qualifying regions (index ${region.price.toFixed(2)})`
        : `Price index ${region.price.toFixed(2)}`
    );
  }

  const warnings = [];
  if (!pick.within) {
    warnings.push(
      isPair
        ? `The official pair ${region.id} is ≈${pick.rtt} ms from ${primary.region.id}, beyond the ${limit} limit for ${downtime.mode} replication. Consider a looser downtime target.`
        : `No eligible region is within ${limit} of ${primary.region.id}, so ${downtime.mode} replication is unlikely to work. Showing the closest option; consider a looser downtime target.`
    );
  }
  return { row: pick.row, km: pick.km, rtt: pick.rtt, within: pick.within, isPair, rules, warnings, downtime };
}
