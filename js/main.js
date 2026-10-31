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
import { renderVisitStats } from "./ui/visit-stats.js";
import { initTheme } from "./ui/theme.js";
import { initHero, renderHeroCta } from "./ui/hero.js";
import { renderSteps } from "./ui/steps.js";
import { logVisit, fetchStats } from "./services/analytics.js";

function renderResults() {
  const cs = cloudState();
  const result = recommend({
    cloud: currentCloud(),
    locations: state.locations,
    measured: cs.measured,
    remote: cs.remote,
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
  // Step 2 depends on the test, the measure-from mode and the location list.
  if (cloudChanged || topics.has("test") || topics.has("locations")) {
    renderCloudSwitch();
    renderLatencyTest();
    renderHeroCta(state.testing);
  }
  if (cloudChanged || topics.has("view")) renderExportTabs();
  if (all || topics.has("locations")) renderLocations();
  if (topics.has("services")) renderServiceSelection();
  renderSteps();
  renderResults();
}

const pending = new Set();
let scheduled = false;
// While a latency test streams results, redraw ~2×/s instead of every frame
// so rendering doesn't compete with the measurements.
const TEST_RENDER_INTERVAL_MS = 500;
// Browsers can hold back animation frames (background tab, some headless
// modes); a timer makes sure a scheduled render still happens.
const FRAME_FALLBACK_MS = 150;
function run() {
  if (!scheduled) return; // already drawn by the other trigger
  scheduled = false;
  const topics = new Set(pending);
  pending.clear();
  render(topics);
}
function kick() {
  requestAnimationFrame(run);
  setTimeout(run, FRAME_FALLBACK_MS);
}
function schedule(topic) {
  pending.add(topic);
  if (scheduled) return;
  scheduled = true;
  if (state.testing && topic === "test") setTimeout(kick, TEST_RENDER_INTERVAL_MS);
  else kick();
}

// ---------- boot ----------
const shared = readHash();
if (shared) actions.hydrate(shared);

initTheme(() => schedule("view")); // redraw map tiles/colours for the new theme
initHero();
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

// Count this visit, then show totals that include it. Never blocks the app.
logVisit()
  .then(() => fetchStats())
  .then(renderVisitStats);
