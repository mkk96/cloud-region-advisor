/** Step 3: searchable, grouped "Services needed" picker. */

import { $, $$, esc } from "./dom.js";
import { actions, currentCloud, cloudState } from "../state/store.js";

function scopeLabel(service, cloud) {
  if (service.note) return service.note;
  if (service.where === "global") return "global";
  const n = cloud.regions.filter((r) => r.services[service.id]).length;
  return n === cloud.regions.length ? "all regions" : `${n} regions`;
}

function applyFilter(query) {
  const q = query.trim().toLowerCase();
  $$("#services .svc-group").forEach((g) => {
    let hits = 0;
    g.querySelectorAll("li").forEach((li) => {
      const show = !q || li.dataset.name.includes(q) || g.dataset.cat.toLowerCase().includes(q);
      li.hidden = !show;
      hits += show;
    });
    g.hidden = !hits;
    g.open = !!q && hits > 0;
  });
}

export function initServicePicker() {
  $("#services").addEventListener("change", (e) => {
    if (e.target.type === "checkbox") actions.toggleService(e.target.value, e.target.checked);
  });
  $("#svcSelected").addEventListener("click", (e) => {
    const b = e.target.closest("[data-unselect]");
    if (b) actions.toggleService(b.dataset.unselect, false);
    else if (e.target.closest("[data-clear]")) actions.clearServices();
  });
  $("#svcFilter").addEventListener("input", (e) => applyFilter(e.target.value));
}

/** Rebuilds the grouped list — on boot and when the cloud changes. */
export function renderServiceList() {
  const cloud = currentCloud();
  $("#svcFilter").value = "";
  $("#svcFilter").placeholder = `Search ${cloud.services.length} ${cloud.name} services…`;
  $("#services").innerHTML = cloud.categories
    .map((cat) => {
      const items = cloud.services.filter((s) => s.cat === cat);
      if (!items.length) return "";
      return `<details class="svc-group" data-cat="${esc(cat)}">
        <summary><span>${esc(cat)}</span><span class="count" data-cat-count></span></summary>
        <ul>${items
          .map(
            (s) => `<li data-name="${esc((s.label + " " + s.id).toLowerCase())}">
              <label title="${esc(s.note || "")}"><input type="checkbox" value="${s.id}"/>
              <span class="svc-name">${esc(s.label)}</span>
              <span class="scope ${s.where === "global" ? "global" : ""}">${esc(scopeLabel(s, cloud))}</span></label>
            </li>`
          )
          .join("")}</ul>
      </details>`;
    })
    .join("");
  renderServiceSelection();
}

/** Syncs checkboxes, chips and counts with the current selection. */
export function renderServiceSelection() {
  const cloud = currentCloud();
  const selected = cloudState().services;
  $$("#services input[type=checkbox]").forEach((i) => (i.checked = selected.includes(i.value)));
  $("#svcCount").textContent = `${selected.length} of ${cloud.services.length} selected`;
  $("#svcSelected").innerHTML = selected.length
    ? selected
        .map((id) => `<button type="button" class="chip-sel" data-unselect="${id}" title="Remove">${esc(cloud.serviceById[id].label)} ×</button>`)
        .join("") + `<button type="button" class="link small-link" data-clear>Clear all</button>`
    : "";
  $$("#services .svc-group").forEach((g) => {
    const n = g.querySelectorAll("input:checked").length;
    g.querySelector("[data-cat-count]").textContent = n ? `${n} selected` : "";
  });
}
