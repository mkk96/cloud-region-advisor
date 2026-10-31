/**
 * App state and the only functions allowed to change it.
 *
 * Views read `state` / `currentCloud()` / `cloudState()` and call `actions`.
 * Every action emits a topic so the renderer knows what to redraw:
 *   "cloud"      cloud switched (rebuild cloud-specific controls)
 *   "locations"  location list changed
 *   "services"   service selection changed
 *   "test"       latency test progress / results
 *   "inputs"     other requirement inputs changed
 *   "view"       presentation only (sort, filters, export tab)
 */

import { CLOUDS, DEFAULT_CLOUD } from "../clouds/index.js";
import { locationKey } from "../core/geo.js";

export const state = {
  cloud: DEFAULT_CLOUD,
  // Shared across clouds
  locations: [], // { name, cc, lat, lon, share, here }
  residency: "none",
  weights: { lat: 7, cost: 2, carbon: 1 },
  downtime: "minutes",
  sort: { key: "rank", dir: 1 },
  showExcluded: true,
  tablePage: 1,
  // "remote": probes near each user location; "device": this browser
  testMode: "remote",
  testing: false,
  testProgress: { done: 0, total: 0 },
  // Per cloud: { measured, remote, measuredShared, testSummary, services, primaryOverride, tab }
  perCloud: {},
};

export const currentCloud = () => CLOUDS[state.cloud];

/** Per-cloud slice for the current (or given) cloud, created on first use. */
export function cloudState(id = state.cloud) {
  if (!state.perCloud[id]) {
    state.perCloud[id] = {
      measured: {}, // this device: regionId -> latency result
      remote: {}, // locationKey -> { probe, results: { regionId -> latency result } }
      measuredShared: false,
      testSummary: "",
      services: [],
      primaryOverride: null,
      tab: CLOUDS[id].exports[0].id,
    };
  }
  return state.perCloud[id];
}

const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(topic) {
  // Anything that can reorder the region table sends it back to page 1.
  // Live test results ("test") and pure view changes ("view") keep the page.
  if (topic !== "test" && topic !== "view") state.tablePage = 1;
  listeners.forEach((fn) => fn(topic));
}

/** Any change to what is recommended drops a manually chosen primary. */
function resetPrimary() {
  cloudState().primaryOverride = null;
}

export const actions = {
  /** Returns true when the residency choice had to be reset. */
  setCloud(id) {
    if (!CLOUDS[id] || id === state.cloud || state.testing) return false;
    state.cloud = id;
    const res = state.residency;
    const reset = res !== "none" && res !== "EU" && !currentCloud().residencyOptions.some((o) => o.cc === res);
    if (reset) state.residency = "none";
    emit("cloud");
    return reset;
  },

  addLocation(loc) {
    const isFirst = state.locations.length === 0;
    if (loc.here) state.locations.forEach((l) => (l.here = false));
    state.locations.push({
      share: isFirst ? 100 : 50,
      here: loc.here ?? (isFirst && !state.locations.some((l) => l.here)),
      ...loc,
    });
    resetPrimary();
    emit("locations");
  },
  removeLocation(index) {
    state.locations.splice(index, 1);
    resetPrimary();
    emit("locations");
  },
  setShare(index, share) {
    state.locations[index].share = Math.max(0, Number(share) || 0);
    emit("inputs");
  },
  setTestMode(mode) {
    if (state.testing) return;
    state.testMode = mode;
    // A device test only counts for the location marked "I'm here".
    if (mode === "device" && state.locations.length && !state.locations.some((l) => l.here)) state.locations[0].here = true;
    emit("locations"); // also shows / hides the "I'm here" boxes
  },

  /** Only one location can be "I'm here". */
  setHere(index, on) {
    state.locations.forEach((l, i) => (l.here = i === index ? on : false));
    emit("locations");
  },

  setResidency(value) {
    state.residency = value;
    resetPrimary();
    emit("inputs");
  },
  setWeight(key, value) {
    state.weights[key] = Number(value);
    resetPrimary();
    emit("inputs");
  },
  setDowntime(value) {
    state.downtime = value;
    emit("inputs");
  },

  toggleService(id, on) {
    const cs = cloudState();
    cs.services = on ? [...new Set([...cs.services, id])] : cs.services.filter((s) => s !== id);
    resetPrimary();
    emit("services");
  },
  clearServices() {
    cloudState().services = [];
    resetPrimary();
    emit("services");
  },

  setPrimary(id) {
    cloudState().primaryOverride = id;
    emit("inputs");
  },

  setSort(key) {
    const highFirst = ["cfe", "zones", "services"].includes(key);
    state.sort = { key, dir: state.sort.key === key ? -state.sort.dir : highFirst ? -1 : 1 };
    state.tablePage = 1;
    emit("view");
  },
  setShowExcluded(on) {
    state.showExcluded = on;
    state.tablePage = 1;
    emit("view");
  },
  setTablePage(page) {
    state.tablePage = page;
    emit("view");
  },
  setExportTab(id) {
    cloudState().tab = id;
    emit("view");
  },

  /** Clears the previous results of the same kind and starts counting. */
  startTest(total) {
    const cs = cloudState();
    state.testing = true;
    state.tablePage = 1;
    state.testProgress = { done: 0, total };
    if (cs.measuredShared) Object.assign(cs, { measured: {}, remote: {} });
    if (state.testMode === "device") cs.measured = {};
    else cs.remote = {};
    Object.assign(cs, { measuredShared: false, testSummary: "" });
    emit("test");
  },
  recordLatency(regionId, result) {
    cloudState().measured[regionId] = result;
    state.testProgress.done++;
    emit("test");
  },
  recordRemoteProbe(loc, probe) {
    cloudState().remote[locationKey(loc)] = { name: loc.name, probe, results: {} };
    emit("test");
  },
  recordRemoteLatency(loc, regionId, result) {
    cloudState().remote[locationKey(loc)].results[regionId] = result;
    state.testProgress.done++;
    emit("test");
  },
  finishTest(summary) {
    state.testing = false;
    cloudState().testSummary = summary;
    emit("test");
  },

  /** Apply a decoded share link (see share.js). */
  hydrate(snap) {
    state.cloud = snap.cloud;
    state.locations = snap.locations;
    if (snap.residency) state.residency = snap.residency;
    if (snap.weights) state.weights = snap.weights;
    if (snap.downtime) state.downtime = snap.downtime;
    Object.assign(cloudState(), {
      measured: snap.measured,
      remote: snap.remote || {},
      measuredShared: Object.keys(snap.measured).length > 0 || Object.keys(snap.remote || {}).length > 0,
      services: snap.services,
      primaryOverride: snap.primaryOverride,
    });
  },
};
