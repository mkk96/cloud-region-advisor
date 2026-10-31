/**
 * Share links: the current cloud, inputs and measured latencies are encoded
 * as base64url JSON in the URL hash (#s=...).
 *   v1 — GCP only (older links); v2 — adds the cloud id.
 */

import { CLOUDS } from "../clouds/index.js";
import { state, cloudState } from "./store.js";

function toBase64Url(text) {
  let bin = "";
  new TextEncoder().encode(text).forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64) {
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeState() {
  const cs = cloudState();
  const m = {};
  Object.entries(cs.measured).forEach(([id, r]) => r.ok && (m[id] = r.median));
  return toBase64Url(
    JSON.stringify({
      v: 2,
      c: state.cloud,
      l: state.locations.map((l) => [l.name, l.cc || "", +l.lat.toFixed(3), +l.lon.toFixed(3), l.share, l.here ? 1 : 0]),
      m,
      r: state.residency,
      s: cs.services,
      w: [state.weights.lat, state.weights.cost, state.weights.carbon],
      d: state.downtime,
      p: cs.primaryOverride,
    })
  );
}

/** Returns a snapshot for actions.hydrate(), or null if the hash is invalid. */
export function decodeState(encoded) {
  try {
    const p = JSON.parse(fromBase64Url(encoded));
    if (p.v !== 1 && p.v !== 2) return null;
    const cloud = CLOUDS[p.v === 1 ? "gcp" : p.c];
    if (!cloud) return null;

    const measured = {};
    Object.entries(p.m || {}).forEach(([id, median]) => {
      if (cloud.regionById[id]) measured[id] = { ok: true, median, jitter: 0, noisy: false, shared: true };
    });
    return {
      cloud: cloud.id,
      locations: (p.l || []).map(([name, cc, lat, lon, share, here]) => ({ name, cc, lat, lon, share, here: !!here })),
      measured,
      residency: p.r,
      services: Array.isArray(p.s) ? p.s.filter((s) => cloud.serviceById[s]) : [],
      weights: Array.isArray(p.w) ? { lat: p.w[0], cost: p.w[1], carbon: p.w[2] } : null,
      downtime: p.d,
      primaryOverride: p.p || null,
    };
  } catch (e) {
    return null;
  }
}

export function readHash() {
  const m = location.hash.match(/#s=([\w-]+)/);
  return m ? decodeState(m[1]) : null;
}

export function writeHash() {
  try {
    history.replaceState(null, "", `${location.pathname}${location.search}#s=${encodeState()}`);
  } catch (e) {
    /* replaceState can be blocked in some embedded contexts */
  }
}
