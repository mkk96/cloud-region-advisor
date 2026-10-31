/**
 * Turns a cloud definition (see js/clouds/*.js) into the indexed object the
 * rest of the app uses.
 *
 * Service `where` rules:
 *   "all"             every region
 *   "global"          a global service, usable from any region
 *   [ids]             only these regions
 *   { except: [ids] } every region except these
 *   (region) => bool  computed
 */

export function serviceAvailable(service, region) {
  const w = service.where;
  if (w === "all" || w === "global") return true;
  if (Array.isArray(w)) return w.includes(region.id);
  if (typeof w === "function") return w(region);
  return !w.except.includes(region.id);
}

/**
 * def.regions rows: [id, city, cc, country, continent, lat, lon, zones, price, cfe, extra]
 *   zones: comma-separated zone suffixes ("" for none); def.zoneName(id, z) names them
 *   extra: optional { host, pair, rep } — probe host, official DR pair, rep: false
 *          when a GCP region has no Cloud Storage regional endpoint
 */
export function defineCloud(def) {
  const regions = def.regions.map(([id, city, cc, country, continent, lat, lon, zones, price, cfe, extra = {}]) => {
    const region = {
      id, city, cc, country, continent, lat, lon, price, cfe,
      cloud: def.id,
      zones: zones ? zones.split(",").map((z) => def.zoneName(id, z)) : [],
      pair: extra.pair || null,
    };
    region.probeUrl = def.probe.url(region, extra);
    region.remoteProbe = def.probe.remote(region, extra);
    region.services = Object.fromEntries(def.services.map((s) => [s.id, serviceAvailable(s, region)]));
    region.serviceCount = Object.values(region.services).filter(Boolean).length;
    return region;
  });

  const countries = {};
  regions.forEach((r) => {
    countries[r.cc] = countries[r.cc] || { cc: r.cc, name: r.country, count: 0 };
    countries[r.cc].count++;
  });

  return {
    ...def,
    regions,
    regionById: Object.fromEntries(regions.map((r) => [r.id, r])),
    serviceById: Object.fromEntries(def.services.map((s) => [s.id, s])),
    residencyOptions: Object.values(countries).sort((a, b) => a.name.localeCompare(b.name)),
  };
}
