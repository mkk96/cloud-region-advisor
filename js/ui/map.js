/** Leaflet latency map (Leaflet is loaded as a global `L` from the CDN). */

import { $, esc, cssVar } from "./dom.js";
import { latencyClass, sourceNote } from "./format.js";
import { state, currentCloud, cloudState } from "../state/store.js";

let map, regionLayer, userLayer;

export function initMap() {
  const L = window.L;
  if (!L) {
    $("#map").innerHTML = `<p class="hint" style="padding:16px">Map library failed to load (offline?). Everything else still works.</p>`;
    return;
  }
  map = L.map("map", { worldCopyJump: true, minZoom: 1 }).setView([25, 10], 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 8,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
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

export function renderMap(result) {
  if (!map) return;
  const L = window.L;
  const cloud = currentCloud();
  const shared = cloudState().measuredShared;
  regionLayer.clearLayers();
  userLayer.clearLayers();

  const colors = { good: cssVar("--good"), mid: cssVar("--mid"), bad: cssVar("--bad"), none: cssVar("--none") };
  const primaryId = result.primary && result.primary.region.id;
  const drRow = result.dr && !result.dr.none ? result.dr.row : null;

  if (primaryId && drRow) {
    const a = result.primary.region;
    L.polyline([[a.lat, a.lon], [drRow.region.lat, drRow.region.lon]], { color: cssVar("--dr"), weight: 2, dashArray: "6 6" }).addTo(regionLayer);
  }

  result.rows.forEach((row) => {
    const r = row.region;
    const excluded = row.excluded.length > 0;
    const isPrimary = r.id === primaryId;
    const isDr = drRow && r.id === drRow.region.id;
    const marker = L.circleMarker([r.lat, r.lon], {
      radius: isPrimary || isDr ? 10 : 6,
      color: isPrimary ? cssVar("--accent") : isDr ? cssVar("--dr") : "#fff",
      weight: isPrimary || isDr ? 4 : 1.5,
      fillColor: colors[excluded ? "none" : latencyClass(row.latency && row.latency.ms)],
      fillOpacity: excluded ? 0.35 : 0.95,
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
  });

  state.locations.forEach((l) => {
    L.circleMarker([l.lat, l.lon], { radius: 6, color: "#fff", weight: 2, fillColor: cssVar("--you"), fillOpacity: 1 })
      .bindTooltip(`${esc(l.name)} · ${l.share}% traffic${l.here ? " · you" : ""}`, { direction: "top" })
      .addTo(userLayer);
  });
}
