/** Plain-English reasons for the primary pick and each table row. */

import { residencyLabel, serviceLabels } from "./filters.js";

export function primaryReason(row, ctx, weights, fastest, manual) {
  const parts = [];
  const where = ctx.locations.length > 1 ? "across your user locations (traffic-weighted)" : "from your location";
  const r = row.region;
  const f = fastest.region;
  if (row.latency) {
    parts.push(
      row.latRank === 1
        ? `Lowest latency ${where} (${row.latency.ms} ms)`
        : row.latency.ms === fastest.latency.ms
        ? `${row.latency.ms} ms ${where} (tied fastest with ${f.id})`
        : `${row.latency.ms} ms ${where} (#${row.latRank} fastest, +${row.latency.ms - fastest.latency.ms} ms vs ${f.id})`
    );
  }
  const cfe = ctx.cloud.cfeShort || "carbon-free energy";
  const tradeOff = row.latRank !== 1;
  if (row.cheapest) parts.push(`lowest price among eligible regions (index ${r.price.toFixed(2)})`);
  else if (tradeOff && r.price < f.price) parts.push(`${Math.round((1 - r.price / f.price) * 100)}% cheaper than ${f.id}`);
  else if (weights.cost >= 0.25) parts.push(`price index ${r.price.toFixed(2)}`);
  if (tradeOff && r.cfe > f.cfe) parts.push(`${r.cfe}% ${cfe} vs ${f.cfe}% for ${f.id}`);
  else if (row.greenest || weights.carbon >= 0.25 || r.cfe >= 85) parts.push(`${r.cfe}% ${cfe}`);
  if (ctx.residency && ctx.residency !== "none") parts.push(`data stays in ${residencyLabel(ctx.residency, ctx.cloud)}`);
  if (ctx.services.length) parts.push(`all requested services available (${serviceLabels(ctx.services, ctx.cloud)})`);

  let text = parts.join(", ");
  text = text.charAt(0).toUpperCase() + text.slice(1) + ".";
  return manual ? `Chosen manually. ${text}` : text;
}

export function rowReason(row, result, bestLat) {
  if (row.excluded.length) return `Excluded: ${row.excluded.join("; ")}`;
  if (result.primary && row === result.primary) return "Recommended primary";
  if (result.dr && result.dr.row === row) return "Recommended DR region";
  const bits = [];
  if (row.latency) bits.push(row.latRank === 1 ? "Fastest" : `+${row.latency.ms - bestLat} ms vs fastest`);
  if (row.cheapest) bits.push("cheapest");
  if (row.greenest) bits.push("greenest");
  return bits.join(", ") || "Eligible";
}
