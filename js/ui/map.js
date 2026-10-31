/**
 * Leaflet latency map (Leaflet is loaded as a global `L` from the CDN).
 * OpenStreetMap tiles (no API key); the light / dark look is a CSS filter
 * on the tile pane. Exposes highlightRegion / focusRegion so the table can
 * drive the map.
 */

import { $, esc, cssVar } from "./dom.js";
import { latencyClass, sourceNote } from "./format.js";
import { isDark } from "./theme.js";
import { state, currentCloud, cloudState } from "../state/store.js";

const TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

let map, regionLayer, userLayer;
let markers = new Map(); // regionId -> { marker, base }
let viewKey = "";

export function initMap() {
  const L = window.L;
  if (!L) {
    $("#map").innerHTML = `<p class="hint" style="padding:16px">Map library failed to load (offline?). Everything else still works.</p>`;
    return;
  }
  map = L.map("map", { worldCopyJump: true, minZoom: 1 }).setView([25, 10], 2);
  L.tileLayer(TILES, { maxZoom: 9, attribution: ATTRIBUTION }).addTo(map);
  regionLayer = L.layerGroup().addTo(map);
  userLayer = L.layerGroup().addTo(map);
  window.addEventListener("resize", () => map.invalidateSize());
}

function popupHtml(row, cloud, shared) {
  const r = row.region;
  const lat = row.latency ? `${row.latency.ms} ms (${sourceNote(row, shared)})` : "not measured";
  return (
    `<b>${r.id}</b> · ${esc(cloud.name)}<br>${esc(r.city)}, ${esc(r.country)}<br>Latency: ${lat}` +
    `<br>Price index ${r.price.toFixed(2)} · CFE ${r.cfe}%<br>Services: ${r.serviceCount} of ${cloud.services.length}` +
    (r.pair ? `<br>Official pair: ${esc(r.pair)}` : "") +
    (row.excluded.length ? `<br><i>Excluded: ${esc(row.excluded.join("; "))}</i>` : "")
  );
}

/** Zoom to the recommendation (primary, DR and user locations) when it changes. */
function frameResult(primary, drRow) {
  if (state.testing) return; // the leader changes constantly mid-test; frame once it's done
  const key = `${state.cloud}|${primary ? primary.region.id : ""}|${drRow ? drRow.region.id : ""}|${state.locations.length}`;
  if (key === viewKey) return;
  viewKey = key;
  const pts = state.locations.map((l) => [l.lat, l.lon]);
  if (primary) pts.push([primary.region.lat, primary.region.lon]);
  if (drRow) pts.push([drRow.region.lat, drRow.region.lon]);
  if (pts.length >= 2) map.flyToBounds(pts, { padding: [60, 60], maxZoom: 5, duration: 0.8 });
  else if (pts.length === 1) map.flyTo(pts[0], 4, { duration: 0.8 });
}

export function renderMap(result) {
  if (!map) return;
  const L = window.L;
  const cloud = currentCloud();
  const shared = cloudState().measuredShared;
  regionLayer.clearLayers();
  userLayer.clearLayers();
  markers = new Map();

  const colors = { good: cssVar("--good"), mid: cssVar("--mid"), bad: cssVar("--bad"), none: cssVar("--none") };
  const ring = isDark() ? "#0f1626" : "#ffffff";
  const primaryId = result.primary && result.primary.region.id;
  const drRow = result.dr && !result.dr.none ? result.dr.row : null;

  if (primaryId && drRow) {
    const a = result.primary.region;
    L.polyline([[a.lat, a.lon], [drRow.region.lat, drRow.region.lon]], {
      color: cssVar("--dr"), weight: 2.5, dashArray: "6 8", opacity: 0.9,
    }).addTo(regionLayer);
  }

  result.rows.forEach((row) => {
    const r = row.region;
    const excluded = row.excluded.length > 0;
    const isPrimary = r.id === primaryId;
    const isDr = drRow && r.id === drRow.region.id;
    const base = {
      radius: isPrimary || isDr ? 10 : 6.5,
      color: isPrimary ? cssVar("--accent") : isDr ? cssVar("--dr") : ring,
      weight: isPrimary || isDr ? 4 : 2,
      fillColor: colors[excluded ? "none" : latencyClass(row.latency && row.latency.ms)],
      fillOpacity: excluded ? 0.35 : 0.95,
    };
    const marker = L.circleMarker([r.lat, r.lon], {
      ...base,
      className: isPrimary ? "pulse-primary" : isDr ? "pulse-dr" : "",
    }).addTo(regionLayer);
    marker.bindPopup(popupHtml(row, cloud, shared));
    if (isPrimary || isDr) {
      // Primary label above, DR label below, so nearby pairs don't overlap.
      marker.bindTooltip(isPrimary ? "Primary" : "DR", {
        permanent: true,
        direction: isPrimary ? "top" : "bottom",
        className: "map-tag",
        offset: isPrimary ? [0, -8] : [0, 8],
      });
    } else {
      marker.bindTooltip(`${r.id} · ${row.latency ? row.latency.ms + " ms" : "—"}`, { direction: "top" });
    }
    markers.set(r.id, { marker, base });
  });

  state.locations.forEach((l) => {
    L.circleMarker([l.lat, l.lon], { radius: 7, color: ring, weight: 2.5, fillColor: cssVar("--you"), fillOpacity: 1 })
      .bindTooltip(`${esc(l.name)} · ${l.share}% traffic${l.here ? " · you" : ""}`, { direction: "top" })
      .addTo(userLayer);
  });

  frameResult(result.primary, drRow);
}

/** Emphasise a region's marker (table row hover); pass null to clear. */
let hot = null;
export function highlightRegion(id) {
  if (hot && markers.has(hot)) {
    const { marker, base } = markers.get(hot);
    marker.setStyle(base);
    if (!marker.getTooltip() || !marker.getTooltip().options.permanent) marker.closeTooltip();
  }
  hot = id;
  if (!id || !markers.has(id)) return;
  const { marker, base } = markers.get(id);
  marker.setStyle({ radius: base.radius + 5, weight: base.weight + 2, color: cssVar("--accent") });
  marker.bringToFront();
  marker.openTooltip();
}

/** Scroll to the map, fly to a region and open its details. */
export function focusRegion(id) {
  if (!map || !markers.has(id)) return;
  const { marker } = markers.get(id);
  $("#map").closest(".card").scrollIntoView({ behavior: "smooth", block: "center" });
  map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 4), { duration: 0.8 });
  map.once("moveend", () => marker.openPopup());
}
