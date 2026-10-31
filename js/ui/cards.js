/** Primary and DR recommendation cards. */

import { $, esc } from "./dom.js";
import { latencyLabel, sourceNote } from "./format.js";
import { actions, currentCloud, cloudState } from "../state/store.js";

function renderEmpty(result, cloudTag) {
  $("#primaryCard").classList.add("empty");
  $("#drCard").classList.add("empty");
  $("#primaryCard").innerHTML = `<span class="label">Primary region ${cloudTag}</span><p class="why">${esc(result.message || "")}</p>
    <p class="note">Quickest path: click <b>Run latency test</b>.</p>`;
  $("#drCard").innerHTML = `<span class="label">Disaster-recovery region</span><p class="why">Appears once a primary region is chosen.</p>`;
}

function renderPrimary(result, cloud, cloudTag) {
  const p = result.primary;
  const r = p.region;
  const cs = cloudState();
  $("#primaryCard").innerHTML = `
    <span class="label">Primary region ${cloudTag}</span>
    <div><span class="region-id">${r.id}</span> <span class="city">${esc(r.city)}, ${esc(r.country)}</span></div>
    <div class="stats">
      <div class="stat"><b>${latencyLabel(p)}</b><small>${sourceNote(p, cs.measuredShared)}</small></div>
      <div class="stat"><b>${r.price.toFixed(2)}</b><small>price index</small></div>
      <div class="stat"><b>${r.cfe}%</b><small>${cloud.cfeShort || "carbon-free energy"}</small></div>
      <div class="stat"><b>${r.zones.length || "none"}</b><small>availability zones</small></div>
    </div>
    <p class="why">${esc(result.primaryReason)}</p>
    ${r.zones.length ? "" : `<p class="note">This region has no availability zones — zone-redundant deployments aren't possible here.</p>`}
    ${cs.primaryOverride ? `<p class="note"><button class="link" data-reset-primary>Back to the recommended region</button></p>` : ""}`;
}

function renderDR(result, cloud) {
  const dr = result.dr;
  const card = $("#drCard");
  if (!dr || dr.none) {
    card.classList.add("empty");
    card.innerHTML = `<span class="label">Disaster-recovery region</span><p class="why">${esc(dr ? dr.message : "")}</p>`;
    return;
  }
  const d = dr.row.region;
  card.innerHTML = `
    <span class="label">Disaster-recovery region</span>
    <div><span class="region-id">${d.id}</span> <span class="city">${esc(d.city)}, ${esc(d.country)}</span></div>
    <div class="stats">
      <div class="stat"><b>${Math.round(dr.km).toLocaleString()} km</b><small>from primary</small></div>
      <div class="stat"><b>≈${dr.rtt} ms</b><small>primary ↔ DR (est.)</small></div>
      <div class="stat"><b>${latencyLabel(dr.row)}</b><small>to your users</small></div>
      <div class="stat"><b>${d.price.toFixed(2)}</b><small>price index</small></div>
    </div>
    <ul class="rules">${dr.rules.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    <p class="note">${cloud.dr.note}</p>`;
}

export function initCards() {
  $("#primaryCard").addEventListener("click", (e) => {
    if (e.target.closest("[data-reset-primary]")) actions.setPrimary(null);
  });
}

export function renderCards(result) {
  const cloud = currentCloud();
  $("#primaryCard").className = "card rec";
  $("#drCard").className = "card rec dr";
  const cloudTag = `<span class="cloud-tag">${esc(cloud.name)}</span>`;
  if (!result.primary) return renderEmpty(result, cloudTag);
  renderPrimary(result, cloud, cloudTag);
  renderDR(result, cloud);
}
