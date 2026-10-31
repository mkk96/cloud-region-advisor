/**
 * Remote latency test: measures from a probe near each user location instead
 * of from this browser, using Globalping (https://globalping.io), a free
 * network of measurement probes run by jsDelivr.
 *
 * For each location the nearest online probe is chosen, pinned with a first
 * measurement, and reused for every region so all numbers come from the same
 * machine. Each region gets one HTTPS request; the TCP handshake time (one
 * round trip) is kept, or time-to-first-byte where a cloud's endpoint sits
 * behind an edge (see `remoteProbe` in js/clouds/*.js).
 *
 * Free use is limited per network to ~250 probe requests an hour, and each
 * region × location costs one.
 */

import { distanceKm } from "./geo.js";

const API = "https://api.globalping.io/v1";
const CONCURRENCY = 8;
const POLL_MS = 500;
const REQUEST_TIMEOUT_MS = 10000;
const MEASUREMENT_DEADLINE_MS = 35000; // a probe gives up on a dead host after ~17 s

export class RemoteError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code; // "rate-limit" | "no-probes" | "network"
    Object.assign(this, extra);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, options = {}, timeout = REQUEST_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    let res;
    try {
      res = await fetch(`${API}${path}`, { ...options, signal: ctrl.signal });
    } catch (e) {
      throw new RemoteError("network", "Globalping could not be reached");
    }
    if (res.status === 429) {
      const reset = Number(res.headers.get("X-RateLimit-Reset")) || 3600;
      throw new RemoteError("rate-limit", "Globalping hourly limit reached", { resetSecs: reset });
    }
    if (res.status === 422) throw new RemoteError("no-probes", "No probe available there");
    if (!res.ok) throw new RemoteError("network", `Globalping error ${res.status}`);
    try {
      return await res.json();
    } catch (e) {
      throw new RemoteError("network", "Globalping response was cut off");
    }
  } finally {
    clearTimeout(timer);
  }
}

let probeList = null;
/** All online probes (cached for the session; ~5,000 entries). */
function onlineProbes() {
  if (!probeList) {
    probeList = api("/probes", {}, 30000).catch((e) => {
      probeList = null;
      throw e;
    });
  }
  return probeList;
}

/** Nearest online probe's location: { city, state, country, lat, lon, km }. */
export async function nearestProbe(loc) {
  let best = null;
  (await onlineProbes()).forEach(({ location: p }) => {
    const km = distanceKm(loc, { lat: p.latitude, lon: p.longitude });
    if (!best || km < best.km) best = { city: p.city, state: p.state, country: p.country, lat: p.latitude, lon: p.longitude, km };
  });
  if (!best) throw new RemoteError("no-probes", "No probes are online");
  return best;
}

/** Probe requests left this hour from this network: { remaining, resetSecs }. */
export async function remainingBudget() {
  const d = await api("/limits");
  const c = d.rateLimit.measurements.create;
  return { remaining: c.remaining, resetSecs: c.reset };
}

async function measure(target, locations) {
  const { id } = await api("/measurements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "http",
      target: target.host,
      locations,
      measurementOptions: { protocol: "HTTPS", request: { path: target.path, method: "HEAD" } },
    }),
  });
  const deadline = Date.now() + MEASUREMENT_DEADLINE_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_MS);
    let d;
    try {
      d = await api(`/measurements/${id}`);
    } catch (e) {
      if (e.code === "rate-limit") throw e;
      continue; // a dropped poll: ask again
    }
    if (d.status !== "in-progress") return { id, probe: d.results[0] && d.results[0].probe, result: toResult(d, target) };
  }
  return { id, probe: null, result: { ok: false, error: "timeout" } };
}

function toResult(d, target) {
  const r = d.results[0] && d.results[0].result;
  const ms = r && r.timings && r.timings[target.metric];
  if (!r || r.status !== "finished" || !(ms > 0)) return { ok: false, error: r && r.status === "timeout" ? "timeout" : "unreachable" };
  return { ok: true, median: Math.round(ms), min: Math.round(ms), jitter: 0, samples: 1, noisy: false, remote: true };
}

function probeLabel(p) {
  return [p.city, p.country === "US" && p.state ? p.state : null, p.country].filter(Boolean).join(", ");
}

/**
 * Measure every region from a probe near `loc`.
 * hooks: onProbe(info), onResult(regionId, result). Resolves to { probe, results }.
 * Throws RemoteError when the test can't start or the hourly limit runs out.
 */
export async function runRemoteTest(loc, regions, { onProbe, onResult } = {}) {
  const near = await nearestProbe(loc);
  const place = { country: near.country, city: near.city, ...(near.state ? { state: near.state } : {}), limit: 1 };
  const results = {};
  const record = (id, result) => {
    results[id] = result;
    if (onResult) onResult(id, result);
  };

  // The first measurement picks the probe; the rest reuse it by measurement id.
  const [first, ...rest] = regions;
  let pin;
  try {
    pin = await measure(first.remoteProbe, [place]);
  } catch (e) {
    if (e.code !== "no-probes") throw e;
    // The nearest probe went offline since the list was fetched: any probe in the country.
    pin = await measure(first.remoteProbe, [{ country: near.country, limit: 1 }]);
  }
  const p = pin.probe || near;
  const probe = {
    label: probeLabel(p),
    network: pin.probe ? pin.probe.network : "",
    km: Math.round(distanceKm(loc, { lat: p.latitude ?? p.lat, lon: p.longitude ?? p.lon })),
  };
  if (onProbe) onProbe(probe);
  record(first.id, pin.result);

  const queue = [...rest];
  let stop = null;
  async function worker() {
    while (queue.length && !stop) {
      const region = queue.shift();
      try {
        record(region.id, (await measure(region.remoteProbe, pin.id)).result);
      } catch (e) {
        if (e.code === "rate-limit") stop = e;
        else record(region.id, { ok: false, error: e.code === "no-probes" ? "probe offline" : "unreachable" });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (stop) throw Object.assign(stop, { partial: { probe, results } });
  return { probe, results };
}
