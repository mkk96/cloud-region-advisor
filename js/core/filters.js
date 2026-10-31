/** Hard filters: data residency and required services. */

import { EU_COUNTRIES } from "./config.js";

export function residencyLabel(residency, cloud) {
  if (residency === "EU") return "the EU";
  const opt = cloud.residencyOptions.find((o) => o.cc === residency);
  return opt ? opt.name : residency;
}

export function inResidency(region, residency) {
  if (!residency || residency === "none") return true;
  if (residency === "EU") return EU_COUNTRIES.includes(region.cc);
  return region.cc === residency;
}

/** "GKE, Cloud SQL +2 more" */
export function serviceLabels(ids, cloud, max = 4) {
  const labels = ids.map((s) => cloud.serviceById[s].label);
  return labels.length > max ? `${labels.slice(0, max).join(", ")} +${labels.length - max} more` : labels.join(", ");
}

/** Reasons a region fails the hard rules; empty when it is eligible. */
export function exclusionReasons(region, ctx) {
  const reasons = [];
  if (!inResidency(region, ctx.residency)) reasons.push(`outside ${residencyLabel(ctx.residency, ctx.cloud)}`);
  const missing = ctx.services.filter((s) => !region.services[s]);
  if (missing.length) reasons.push(`no ${serviceLabels(missing, ctx.cloud, 3)}`);
  return reasons;
}
