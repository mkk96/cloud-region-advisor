/**
 * Entry point: restores a shared link, initialises every view, and redraws
 * after each store change (batched to one render per animation frame).
 */

import { state, subscribe, actions, currentCloud, cloudState } from "./state/store.js";
import { readHash, writeHash } from "./state/share.js";
import { recommend } from "./core/recommend.js";

import { initCloudSwitch, renderCloudSwitch } from "./ui/cloud-switch.js";
import { initLocations, renderLocations } from "./ui/locations.js";
import { initLatencyTest, renderLatencyTest } from "./ui/latency-test.js";
import { initRequirements, renderResidency } from "./ui/requirements.js";
import { initServicePicker, renderServiceList, renderServiceSelection } from "./ui/service-picker.js";
import { initCards, renderCards } from "./ui/cards.js";
import { renderWarnings } from "./ui/warnings.js";
import { initMap, renderMap } from "./ui/map.js";
import { initRegionTable, renderRegionTable } from "./ui/region-table.js";
import { initExport, renderExportTabs, renderSnippet } from "./ui/export.js";
import { renderFootnote } from "./ui/footnote.js";

function renderResults() {
  const cs = cloudState();
  const result = recommend({
    cloud: currentCloud(),
    locations: state.locations,
    measured: cs.measured,
    residency: state.residency,
    services: cs.services,
    weights: state.weights,
    downtime: state.downtime,
    primaryOverride: cs.primaryOverride,
  });
  renderCards(result);
  renderWarnings(result);
  renderMap(result);
  renderRegionTable(result);
  renderSnippet(result);
  writeHash();
}

function render(topics) {
  const all = topics.has("boot");
  const cloudChanged = all || topics.has("cloud");
  if (cloudChanged) {
    renderResidency();
    renderServiceList();
    renderFootnote();
    document.title = `Cloud Region Advisor — ${currentCloud().name}`;
  }
  if (cloudChanged || topics.has("test")) {
    renderCloudSwitch();
    renderLatencyTest();
  }
  if (cloudChanged || topics.has("view")) renderExportTabs();
  if (all || topics.has("locations")) renderLocations();
  if (topics.has("services")) renderServiceSelection();
  renderResults();
}

const pending = new Set();
let scheduled = false;
function schedule(topic) {
  pending.add(topic);
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    const topics = new Set(pending);
    pending.clear();
    render(topics);
  });
}

// ---------- boot ----------
const shared = readHash();
if (shared) actions.hydrate(shared);

initCloudSwitch();
initLocations();
initLatencyTest();
initRequirements();
initServicePicker();
initCards();
initRegionTable();
initExport();
initMap();

subscribe(schedule);
render(new Set(["boot"]));
